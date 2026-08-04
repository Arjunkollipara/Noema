const pool = require('../../db/pool');
const { v4: uuidv4 } = require('uuid');

const CLASSIFIER_MODEL = 'llama-3.1-8b-instant';

function stripJsonFences(text) {
  return (text || '').replace(/```json|```/g, '').trim();
}

async function readAssociations({
  client,
  userMessage,
  conversationHistory,
  existingNodeTitles,
  userId,
  nodeId,
  messageId,
}) {
  const historyText = conversationHistory
    .slice(-4)
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const nodeList = existingNodeTitles.slice(0, 20).join(', ');

  const prompt = `You are a learning signal classifier. Analyze this message and output ONLY a JSON object.

Recent conversation:
${historyText}

Latest message: "${userMessage}"

User's existing knowledge nodes: ${nodeList || 'none yet'}

Classify exactly three things:

1. EMOTIONAL TONE - what emotional state does this message suggest?
   Options: curious / frustrated / excited / lost / confident / neutral
   - curious: asking questions, wanting to know more
   - frustrated: repeated confusion, giving up signals, ALL CAPS, multiple question marks
   - excited: making connections, things clicking, enthusiastic language
   - lost: no foundation, cannot answer, explicit "I don't know"
   - confident: stating things clearly, building on previous understanding
   - neutral: factual, calm, no strong emotional signal

2. MOMENT TYPE - what type of learning moment is this?
   Options: confusion / building / clicking / consolidating
   - confusion: user is stuck, unclear, asking for help
   - building: user is forming an explanation, making progress
   - clicking: something just became clear, connection made
   - consolidating: user is summarizing or confirming understanding

3. ACTIVATED CONCEPTS - which of the user's existing nodes are implicitly
   referenced in this message even if not named directly?
   Return as array of strings matching node titles from the list above.
   Maximum 3. Empty array if none.

Output ONLY this JSON. No markdown. No preamble:
{
  "emotional_tone": "one of the six options",
  "moment_type": "one of the four options",
  "activated_concepts": ["concept1", "concept2"]
}`;

  try {
    const response = await client.chat.completions.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0].message.content.trim();
    const clean = stripJsonFences(text);
    const result = JSON.parse(clean);

    const validTones = ['curious', 'frustrated', 'excited', 'lost', 'confident', 'neutral'];
    const validMoments = ['confusion', 'building', 'clicking', 'consolidating'];

    const tone = validTones.includes(result.emotional_tone)
      ? result.emotional_tone
      : 'neutral';
    const moment = validMoments.includes(result.moment_type)
      ? result.moment_type
      : 'building';
    const concepts = Array.isArray(result.activated_concepts)
      ? result.activated_concepts.slice(0, 3)
      : [];

    await pool.query(
      `INSERT INTO association_signals
       (id, user_id, node_id, message_id, emotional_tone, moment_type, activated_concepts, raw_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        nodeId || null,
        messageId || null,
        tone,
        moment,
        JSON.stringify(concepts),
        userMessage.slice(0, 1000),
      ]
    );

    console.log(`[association] tone:${tone} moment:${moment} concepts:${concepts.join(',') || 'none'}`);

    return {
      emotional_tone: tone,
      moment_type: moment,
      activated_concepts: concepts,
    };
  } catch (err) {
    console.error('[association] error:', err.message);
    return {
      emotional_tone: 'neutral',
      moment_type: 'building',
      activated_concepts: [],
    };
  }
}

module.exports = { readAssociations };
