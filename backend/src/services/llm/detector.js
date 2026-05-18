const { getProvider } = require('./provider');
const pool = require('../../db/pool');
const { v4: uuidv4 } = require('uuid');

async function detectImplicitConcepts({
  userMessage,
  nodeTitle,
  conversationHistory,
  userId,
  sourceNodeId,
}) {
  const { client, model } = getProvider();

  const historyText = conversationHistory
    .slice(-4)
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are a concept detector for a knowledge graph system.
Analyze this message and identify any concepts that are being referenced
implicitly - described without being named, gestured toward as a gap,
or blocking the user's understanding.

Current topic: "${nodeTitle}"
Recent conversation:
${historyText}

Latest message: "${userMessage}"

Detect concepts in three categories:

1. IMPLICIT: User describes how something works without naming it.
   Signal: functional description that matches a known concept.
   Example: "it moves in the direction that reduces error" = gradient descent

2. EXPECTED: User knows a concept exists but cannot name or grasp it.
   Signal: "I think there is something", "there must be a reason",
   "something makes this work", "I can taste it but can't name it"

3. BLOCKING: A specific sub-concept is blocking progress on the main topic.
   Signal: "I get lost when it gets to", "I understand until the point where",
   "I can follow except for the part about"

For each detected concept output:
- concept_name: the actual name of the concept
- trigger_type: implicit / expected / blocking
- confidence: 0.0 to 1.0
- evidence: the exact phrase that triggered detection
- why_relevant: one sentence on why this concept matters here

Only include concepts with confidence >= 0.92.
Be very conservative. Only detect concepts you are highly certain about.
It is better to miss a concept than to create noise.
If nothing is detected return empty array.

Output ONLY this JSON. No markdown. No preamble:
{
  "detected": [
    {
      "concept_name": "...",
      "trigger_type": "implicit|expected|blocking",
      "confidence": 0.0,
      "evidence": "...",
      "why_relevant": "..."
    }
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return result.detected || [];
  } catch (err) {
    console.error('[detector] error:', err.message);
    return [];
  }
}

async function createInferredNodes({
  detected,
  userId,
  sourceNodeId,
  existingNodeTitles,
}) {
  const created = [];
  const createdTitlesThisBatch = new Set();

  for (const concept of detected) {
    if (concept.confidence < 0.92) continue;

    const titleLower = concept.concept_name.toLowerCase().trim();
    const alreadyExists = existingNodeTitles
      .some(t => t.toLowerCase().trim() === titleLower);
    const createdInThisBatch = createdTitlesThisBatch.has(titleLower);

    if (alreadyExists || createdInThisBatch) {
      console.log(`[detector] skipping "${concept.concept_name}" - already exists`);
      continue;
    }

    const id = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO nodes (
        id, user_id, title, summary, phase, decay_score, visit_count,
        last_visited, created_at, node_origin, is_anchored,
        anchor_confidence, inferred_from_node_id
      ) VALUES (?, ?, ?, ?, 'explore', 1.0, 0, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        userId,
        concept.concept_name,
        concept.why_relevant,
        now,
        now,
        concept.trigger_type,
        concept.confidence,
        sourceNodeId,
      ]
    );

    // Create edge from source node to inferred node
    if (sourceNodeId) {
      const [sourceRows] = await pool.query(
        'SELECT title FROM nodes WHERE id = ? AND user_id = ?',
        [sourceNodeId, userId]
      );
      const sourceTitle = sourceRows[0]?.title || sourceNodeId;
      const edgeId = uuidv4();
      await pool.query(
        `INSERT INTO edges (id, user_id, source_id, target_id, edge_type)
         VALUES (?, ?, ?, ?, 'discovered_from')`,
        [edgeId, userId, sourceNodeId, id]
      );
      console.log(`[detector] created edge: "${sourceTitle}" -> "${concept.concept_name}"`);
    }

    createdTitlesThisBatch.add(titleLower);
    console.log(
      `[detector] created inferred node "${concept.concept_name}" ` +
      `(${concept.trigger_type}, confidence: ${concept.confidence})`
    );

    created.push({
      id,
      title: concept.concept_name,
      trigger_type: concept.trigger_type,
      confidence: concept.confidence,
      evidence: concept.evidence,
    });
  }

  return created;
}

async function recordRejection(nodeId, userId) {
  await pool.query(
    'UPDATE nodes SET rejected = 1, is_anchored = 0 WHERE id = ? AND user_id = ?',
    [nodeId, userId]
  );
  console.log(`[detector] node ${nodeId} rejected by user - recorded as negative signal`);
}

module.exports = { detectImplicitConcepts, createInferredNodes, recordRejection };
