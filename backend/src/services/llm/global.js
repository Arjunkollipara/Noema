const pool = require('../../db/pool');
const { getProvider } = require('./provider');
const { findSimilarNodes } = require('../memory');
const { detectImplicitConcepts, createInferredNodes } = require('./detector');
const { v4: uuidv4 } = require('uuid');

function isExplicitConfusion(message) {
  const confusionSignals = [
    'i don\'t know', 'i dont know', 'i have no idea',
    'i don\'t understand', 'i dont understand',
    'please explain', 'can you explain', 'just tell me',
    'explain it to me', 'i give up', 'i\'m lost', 'im lost',
    'i\'m confused', 'im confused',
    'help me understand',
  ];

  const lower = (message || '').toLowerCase();
  return confusionSignals.some(s => lower.includes(s));
}

function enforceStatementEnding(message) {
  const trimmed = (message || '').trim();
  const withoutQuestions = trimmed.replace(/\?/g, '.').trim();
  if (withoutQuestions.length === 0) {
    return 'Take a moment with that.';
  }

  return withoutQuestions.endsWith('.')
    ? withoutQuestions
    : `${withoutQuestions}.`;
}

async function getRecentNodes(userId, limit = 3) {
  const [rows] = await pool.query(
    `SELECT * FROM nodes
     WHERE user_id = ? AND is_anchored = 1
     ORDER BY last_visited DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
}

async function buildGlobalContext(userId, userMessage) {
  const recentNodes = await getRecentNodes(userId, 3);
  const similarNodes = await findSimilarNodes({
    userId,
    text: userMessage,
    excludeNodeId: null,
    limit: 3,
  });

  const contextNodes = [...recentNodes];
  const existingIds = new Set(recentNodes.map(n => n.id));

  for (const s of similarNodes) {
    if (!existingIds.has(s.node_id) && contextNodes.length < 5) {
      const [rows] = await pool.query(
        'SELECT * FROM nodes WHERE id = ? AND user_id = ?',
        [s.node_id, userId]
      );
      if (rows.length > 0) {
        contextNodes.push(rows[0]);
        existingIds.add(s.node_id);
      }
    }
  }

  return contextNodes;
}

function buildGlobalSystemPrompt(contextNodes, userMessage) {
  let prompt = `You are Noema, a personal knowledge companion.
You are having an ongoing conversation with a user who is building
their personal knowledge graph over time.

Your role:
- Engage naturally with whatever the user is exploring
- Ask questions that deepen understanding when appropriate
- Never just give answers - guide the user to build understanding themselves
- Be conversational, warm, and intellectually engaging
- Keep responses concise - 2 to 4 sentences unless more depth is needed

`;

  if (contextNodes.length > 0) {
    prompt += `KNOWLEDGE CONTEXT (what this user already understands):\n`;
    for (const node of contextNodes) {
      prompt += `\n"${node.title}"`;
      if (node.mvi_state?.current_summary) {
        prompt += `: ${node.mvi_state.current_summary.slice(0, 300)}`;
      } else if (node.summary) {
        prompt += `: ${node.summary}`;
      }
      if (node.mvi_state?.personal_lexicon?.length > 0) {
        prompt += ` [User's terms: ${node.mvi_state.personal_lexicon.slice(0, 3).join(', ')}]`;
      }
    }
    prompt += `\n\nUse this context to make connections and build on what the user already knows.
Reference their own analogies and terminology when relevant.\n`;
  }

  prompt += `\nIMPORTANT: The graph updates silently in the background.
Never mention nodes, the graph, or the system architecture to the user.
Just have a natural conversation. The system handles everything else.`;

  const confusionSignals = [
    'i don\'t know', 'i dont know', 'i have no idea',
    'i don\'t understand', 'i dont understand',
    'please explain', 'can you explain', 'just tell me',
    'explain it to me', 'i give up', 'i\'m lost', 'im lost',
    'help me understand',
  ];

  const lastMessageLower = (userMessage || '').toLowerCase();
  const userIsLost = confusionSignals.some(s => lastMessageLower.includes(s));

  if (userIsLost) {
    prompt += `\n\nCRITICAL OVERRIDE - USER HAS EXPRESSED THEY DO NOT KNOW:
The user has explicitly said they do not know or cannot answer.
DO NOT ask any question in this response.
Instead:
1. Give ONE clear direct explanation in 2-3 sentences using an everyday analogy
2. End with a statement not a question - let them absorb it first
3. The next turn can resume Socratic questioning once they have something to work with
Example format: "X works like Y. This means Z. Take a moment with that."
NEVER end this response with a question mark.`;
  }

  return prompt;
}

async function globalChat({ userId, userMessage }) {
  const { client, model, provider } = getProvider();
  console.log(`[global] using provider: ${provider}, model: ${model}`);

  const [history] = await pool.query(
    `SELECT role, content FROM global_messages
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );
  const orderedHistory = history.reverse();

  const contextNodes = await buildGlobalContext(userId, userMessage);

  const [allNodes] = await pool.query(
    'SELECT id, title FROM nodes WHERE user_id = ?',
    [userId]
  );
  const existingNodeTitles = allNodes.map(n => n.title);

  const systemPrompt = buildGlobalSystemPrompt(contextNodes, userMessage);

  const userMsgId = uuidv4();
  await pool.query(
    'INSERT INTO global_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)',
    [userMsgId, userId, 'user', userMessage]
  );

  const [detectedConcepts] = await Promise.all([
    detectImplicitConcepts({
      userMessage,
      nodeTitle: 'global conversation',
      conversationHistory: orderedHistory,
      userId,
      sourceNodeId: null,
    }),
  ]);

  const inferredNodes = await createInferredNodes({
    detected: detectedConcepts,
    userId,
    sourceNodeId: null,
    existingNodeTitles,
  });

  for (const node of contextNodes.slice(0, 2)) {
    await pool.query(
      `UPDATE nodes SET
        visit_count = visit_count + 1,
        last_visited = NOW(),
        needs_synthesis = 1
       WHERE id = ?`,
      [node.id]
    );
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...orderedHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    max_tokens: 1000,
    messages,
  });

  let assistantMessage = response.choices[0].message.content;
  if (isExplicitConfusion(userMessage)) {
    assistantMessage = enforceStatementEnding(assistantMessage);
  }

  const assistantMsgId = uuidv4();
  await pool.query(
    `INSERT INTO global_messages
     (id, user_id, role, content, nodes_updated, nodes_created)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      assistantMsgId,
      userId,
      'assistant',
      assistantMessage,
      JSON.stringify(contextNodes.map(n => n.id)),
      JSON.stringify(inferredNodes.map(n => n.id)),
    ]
  );

  return {
    message: assistantMessage,
    provider,
    inferred_nodes: inferredNodes,
    context_nodes: contextNodes.map(n => ({ id: n.id, title: n.title })),
  };
}

async function getGlobalHistory(userId, limit = 50) {
  const [messages] = await pool.query(
    `SELECT id, role, content, created_at
     FROM global_messages
     WHERE user_id = ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [userId, limit]
  );
  return messages;
}

module.exports = { globalChat, getGlobalHistory };
