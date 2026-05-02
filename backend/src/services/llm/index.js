const pool = require('../../db/pool');
const { getProvider } = require('./provider');
const { buildSystemPrompt, buildClassifierPrompt } = require('./prompts');
const { v4: uuidv4 } = require('uuid');

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

  // 2. Load conversation history for this node
  const [history] = await pool.query(
    'SELECT role, content FROM messages WHERE node_id = ? ORDER BY created_at ASC',
    [nodeId]
  );

  // 3. Load neighbour context (one hop)
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

  // 4. Build system prompt for current phase
  const systemPrompt = buildSystemPrompt(
    node.phase,
    node.title,
    node.summary,
    neighbours
  );

  // 5. Run classifier on user message in parallel with saving it
  const [classifierResult] = await Promise.all([
    classifyMessage(userMessage),
    pool.query(
      'INSERT INTO messages (id, node_id, user_id, role, content, phase) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), nodeId, userId, 'user', userMessage, node.phase]
    ),
  ]);

  // 6. Maybe advance phase based on classifier
  const newPhase = await maybeAdvancePhase(
    nodeId,
    userId,
    node.phase,
    classifierResult
  );

  // 7. If phase advanced, rebuild system prompt with new phase
  const finalSystemPrompt =
    newPhase !== node.phase
      ? buildSystemPrompt(newPhase, node.title, node.summary, neighbours)
      : systemPrompt;

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

  // 11. Update node visit metadata
  await pool.query(
    'UPDATE nodes SET visit_count = visit_count + 1, last_visited = NOW() WHERE id = ?',
    [nodeId]
  );

  return {
    message: assistantMessage,
    phase: newPhase,
    phase_advanced: newPhase !== node.phase,
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
