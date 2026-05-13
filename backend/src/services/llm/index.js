const pool = require('../../db/pool');
const { getProvider } = require('./provider');
const { buildSystemPrompt, buildClassifierPrompt, buildStageAwareSystemPrompt } = require('./prompts');
const { evaluateMessage, maybeAdvanceStage } = require('./evaluator');
const { v4: uuidv4 } = require('uuid');
const { storeTrace, findSimilarNodes } = require('../memory');

// SPRINT 1: Helper to inject MVI State into the system prompt
function injectMviContext(systemPrompt, mviState) {
  if (!mviState) return systemPrompt;

  const { current_summary, frontier, personal_lexicon } = mviState;
  
  // Truncate summary to preserve token budget
  const truncatedSummary = (current_summary || "None yet.").slice(0, 1000);
  
  const mviBlock = `
---
CONTINUITY CONTEXT:
Current understanding:
${truncatedSummary}

Open conceptual leads:
${(frontier && frontier.length > 0) ? frontier.map(f => `- ${f}`).join('\n') : "None identified yet."}

Preferred terminology:
${(personal_lexicon && personal_lexicon.length > 0) ? personal_lexicon.map(l => `- ${l}`).join('\n') : "No specific terminology established."}
---
`;

  // Injecting into the system message after the persona and node context
  return `${systemPrompt}\n${mviBlock}`;
}

// CLASSIFIER

async function classifyMessage(content) {
  try {
    const { client, model } = getProvider();
    const response = await client.chat.completions.create({
      model,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: buildClassifierPrompt(content),
        },
      ],
    });

    const text = response.choices[0].message.content.trim();

    // Strip markdown code fences if model wraps JSON in them
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return parsed;
  } catch (err) {
    console.error('[llm] classifier error:', err.message);
    return { is_explanation: false, strength: null };
  }
}

// PHASE ADVANCEMENT

async function maybeAdvancePhase(nodeId, userId, currentPhase, classifierResult) {
  if (!classifierResult.is_explanation) return currentPhase;

  let newPhase = currentPhase;

  if (currentPhase === 'explore' && classifierResult.strength !== null) {
    newPhase = 'construct';
  } else if (currentPhase === 'construct' && classifierResult.strength === 'strong') {
    newPhase = 'confirm';
  }

  if (newPhase !== currentPhase) {
    await pool.query(
      'UPDATE nodes SET phase = ? WHERE id = ? AND user_id = ?',
      [newPhase, nodeId, userId]
    );
    console.log(`[llm] node ${nodeId} advanced: ${currentPhase} -> ${newPhase}`);
  }

  return newPhase;
}

// MAIN CHAT FUNCTION

async function chat({ nodeId, userId, userMessage }) {
  const { client, model, provider } = getProvider();
  console.log(`[llm] using provider: ${provider}, model: ${model}`);

  // 1. Load node
  const [nodes] = await pool.query(
    'SELECT * FROM nodes WHERE id = ? AND user_id = ?',
    [nodeId, userId]
  );
  if (nodes.length === 0) throw new Error('Node not found');
  const node = nodes[0];
  const currentStage = node.cognitive_stage || 1;

  // 2. Load conversation history for this node
  const [history] = await pool.query(
    'SELECT role, content FROM messages WHERE node_id = ? ORDER BY created_at ASC',
    [nodeId]
  );

  // 3. Load neighbour context (one hop) + similar nodes from memory
  const [edges] = await pool.query(
    'SELECT source_id, target_id FROM edges WHERE (source_id = ? OR target_id = ?) AND user_id = ?',
    [nodeId, nodeId, userId]
  );
  const neighbourIds = edges.map(e =>
    e.source_id === nodeId ? e.target_id : e.source_id
  );
  let neighbours = [];
  if (neighbourIds.length > 0) {
    const placeholders = neighbourIds.map(() => '?').join(',');
    const [nRows] = await pool.query(
      `SELECT title, summary FROM nodes WHERE id IN (${placeholders})`,
      neighbourIds
    );
    neighbours = nRows;
  }

  const similarNodes = await findSimilarNodes({
    userId,
    text: userMessage,
    excludeNodeId: nodeId,
    limit: 2,
  });

  const allTitles = new Set(neighbours.map(n => n.title));
  for (const s of similarNodes) {
    if (!allTitles.has(s.node_title)) {
      neighbours.push({ title: s.node_title, summary: s.content });
      allTitles.add(s.node_title);
    }
  }

  // 4. Build system prompt for current phase
  const baseSystemPrompt = buildSystemPrompt(
    node.phase,
    node.title,
    node.summary,
    neighbours
  );

  // SPRINT 1: Inject MVI Continuity State into the system prompt
  const systemPrompt = injectMviContext(baseSystemPrompt, node.mvi_state);


  // 5. Run classifier and evaluator in parallel with saving message
  const [classifierResult, evaluatorResult] = await Promise.all([
    classifyMessage(userMessage),
    evaluateMessage({
      userMessage,
      nodeTitle: node.title,
      conversationHistory: history,
      currentStage,
    }),
    pool.query(
      'INSERT INTO messages (id, node_id, user_id, role, content, phase, cognitive_stage) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), nodeId, userId, 'user', userMessage, node.phase, currentStage]
    ),
  ]);


  // 6. Maybe advance phase based on classifier
  const newPhase = await maybeAdvancePhase(
    nodeId,
    userId,
    node.phase,
    classifierResult
  );

  // Advance cognitive stage if needed
  const newStage = await maybeAdvanceStage(nodeId, userId, currentStage, evaluatorResult);


  // 7. Build stage-aware system prompt
  const finalSystemPrompt = buildStageAwareSystemPrompt(
    newPhase,
    node.title,
    node.summary,
    neighbours,
    node.mvi_state,
    newStage,
    evaluatorResult
  );

  // 8. Build messages array
  const messages = [
    { role: 'system', content: finalSystemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  // 9. Call LLM
  const response = await client.chat.completions.create({
    model,
    max_tokens: 1000,
    messages,
  });

  const assistantMessage = response.choices[0].message.content;

  // 10. Save assistant message
  await pool.query(
    'INSERT INTO messages (id, node_id, user_id, role, content, phase) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), nodeId, userId, 'assistant', assistantMessage, newPhase]
  );

  // Store understanding trace if user message looks like an explanation
  if (classifierResult.is_explanation) {
    await storeTrace({
      nodeId,
      userId,
      content: userMessage,
      phase: newPhase,
    }).catch(err => console.error('[memory] storeTrace error:', err.message));
  }

  // 11. Update node visit metadata
  const [msgCount] = await pool.query(
    'SELECT COUNT(*) as count FROM messages WHERE node_id = ? AND role = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
    [nodeId, 'user']
  );
  const sessionMessages = msgCount[0].count;
  if (sessionMessages >= 3) {
    // SPRINT 1: Added needs_synthesis = 1
    await pool.query(
      'UPDATE nodes SET visit_count = visit_count + 1, last_visited = NOW(), decay_score = 1.0, needs_synthesis = 1 WHERE id = ?',
      [nodeId]
    );
    console.log(`[decay] node ${nodeId} decay reset to 1.0 and marked for synthesis`);
  } else {
    // SPRINT 1: Added needs_synthesis = 1
    await pool.query(
      'UPDATE nodes SET visit_count = visit_count + 1, last_visited = NOW(), needs_synthesis = 1 WHERE id = ?',
      [nodeId]
    );
    console.log(`[synthesizer] node ${nodeId} marked for synthesis`);
  }

  return {
    message: assistantMessage,
    phase: newPhase,
    phase_advanced: newPhase !== node.phase,
    cognitive_stage: newStage,
    stage_advanced: newStage !== currentStage,
    misconception_detected: evaluatorResult.misconception_detected,
    classifier: classifierResult,
    provider,
  };
}

// GET CONVERSATION HISTORY

async function getHistory(nodeId, userId) {
  const [nodes] = await pool.query(
    'SELECT id FROM nodes WHERE id = ? AND user_id = ?',
    [nodeId, userId]
  );
  if (nodes.length === 0) throw new Error('Node not found');

  const [messages] = await pool.query(
    `SELECT id, role, content, phase, created_at
     FROM messages
     WHERE node_id = ?
     ORDER BY created_at ASC`,
    [nodeId]
  );

  return messages;
}

module.exports = { chat, getHistory };
