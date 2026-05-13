const { getProvider } = require('./provider');

async function evaluateMessage({ userMessage, nodeTitle, conversationHistory, currentStage }) {
  const { client, model } = getProvider();

  const historyText = conversationHistory
    .slice(-6)
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are a cognitive state evaluator for a learning system.
Analyze this message and conversation and output ONLY a JSON object.

Node concept: "${nodeTitle}"
Current stage: ${currentStage}
Recent conversation:
${historyText}

Latest user message: "${userMessage}"

Evaluate and output exactly this JSON:
{
  "detected_stage": <1-5>,
  "stage_confidence": <0.0-1.0>,
  "misconception_detected": <true/false>,
  "misconception_detail": "<null or brief description of two collapsed concepts>",
  "question_depth": <"surface"|"variable"|"causal"|"predictive"|"boundary">,
  "self_correction": <true/false>,
  "suggested_question_type": <"ignite_curiosity"|"name_the_gap"|"stress_test"|"change_variable"|"find_boundary"|"peer_challenge">
}

Stage detection rules:
- Stage 1: broad what/how questions, no variables introduced, vague shape
- Stage 2: user explicitly names confusion or a distinction, uses "I think I'm mixing" type language
- Stage 3: explanation using personal analogy, causal dependency stated, own language not textbook
- Stage 4: predicts unseen cases, introduces new variables unprompted, asks what-if questions
- Stage 5: challenges the question itself, operates at concept edge, connects to outside concepts

Misconception rule: detected when two distinct things are treated as one invariant concept.

Output ONLY the JSON. No preamble. No markdown. No explanation.`;

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[evaluator] error:', err.message);
    return {
      detected_stage: currentStage,
      stage_confidence: 0.5,
      misconception_detected: false,
      misconception_detail: null,
      question_depth: 'surface',
      self_correction: false,
      suggested_question_type: 'ignite_curiosity',
    };
  }
}

async function maybeAdvanceStage(nodeId, userId, currentStage, evaluation) {
  const pool = require('../../db/pool');

  if (evaluation.stage_confidence < 0.7) return currentStage;
  if (evaluation.detected_stage <= currentStage) return currentStage;

  const newStage = Math.min(evaluation.detected_stage, currentStage + 1);

  await pool.query(
    'UPDATE nodes SET cognitive_stage = ?, stage_updated_at = NOW() WHERE id = ? AND user_id = ?',
    [newStage, nodeId, userId]
  );

  console.log(`[evaluator] node ${nodeId} stage advanced: ${currentStage} -> ${newStage}`);
  return newStage;
}

module.exports = { evaluateMessage, maybeAdvanceStage };