const pool = require('../../db/pool');
const { v4: uuidv4 } = require('uuid');

function parseJsonValue(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function updateLearnerProfile(userId) {
  const [signals] = await pool.query(
    `SELECT emotional_tone, moment_type, activated_concepts, created_at
     FROM association_signals
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );

  if (signals.length < 5) return;

  const toneCounts = {};
  const momentCounts = {};
  const conceptCounts = {};
  let clickingCount = 0;
  let confusionCount = 0;

  for (const signal of signals) {
    toneCounts[signal.emotional_tone] = (toneCounts[signal.emotional_tone] || 0) + 1;
    momentCounts[signal.moment_type] = (momentCounts[signal.moment_type] || 0) + 1;

    if (signal.moment_type === 'clicking') clickingCount++;
    if (signal.moment_type === 'confusion') confusionCount++;

    const concepts = parseJsonValue(signal.activated_concepts, []);
    for (const concept of concepts) {
      conceptCounts[concept] = (conceptCounts[concept] || 0) + 1;
    }
  }

  const dominantTone = Object.entries(toneCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tone, count]) => ({
      tone,
      count,
      pct: Math.round((count / signals.length) * 100),
    }));

  const dominantMoment = Object.entries(momentCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([moment, count]) => ({
      moment,
      count,
      pct: Math.round((count / signals.length) * 100),
    }));

  const topConcepts = Object.entries(conceptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([concept, count]) => ({ concept, count }));

  const [nodes] = await pool.query(
    `SELECT mvi_state FROM nodes
     WHERE user_id = ? AND mvi_state IS NOT NULL`,
    [userId]
  );

  const allLexiconWords = [];
  for (const node of nodes) {
    const state = parseJsonValue(node.mvi_state, null);
    if (state?.personal_lexicon && Array.isArray(state.personal_lexicon)) {
      allLexiconWords.push(...state.personal_lexicon);
    }
  }

  const spatialWords = ['like', 'imagine', 'picture', 'visual', 'flow', 'path', 'direction', 'space'];
  const sequentialWords = ['first', 'then', 'next', 'step', 'order', 'before', 'after'];
  const contrastWords = ['opposite', 'different', 'unlike', 'versus', 'instead', 'rather'];
  const analogyWords = ['similar', 'like a', 'reminds', 'same as', 'kind of like'];

  const lexiconText = allLexiconWords.join(' ').toLowerCase();
  const thinkingStyle = {
    spatial: spatialWords.filter(w => lexiconText.includes(w)).length,
    sequential: sequentialWords.filter(w => lexiconText.includes(w)).length,
    contrast: contrastWords.filter(w => lexiconText.includes(w)).length,
    analogy: analogyWords.filter(w => lexiconText.includes(w)).length,
  };

  const dominantStyle = Object.entries(thinkingStyle)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'sequential';

  const confusionRate = Math.round((confusionCount / signals.length) * 100);
  const clickRate = Math.round((clickingCount / signals.length) * 100);

  const profile = {
    dominant_tone: dominantTone,
    dominant_moment_pattern: dominantMoment,
    thinking_style: {
      dominant: dominantStyle,
      scores: thinkingStyle,
      top_concepts_activated: topConcepts,
    },
    confusion_signals: {
      confusion_rate_pct: confusionRate,
      click_rate_pct: clickRate,
      ratio: confusionRate > 0 ? (clickRate / confusionRate).toFixed(2) : 'N/A',
    },
    click_patterns: {
      total_clicking_moments: clickingCount,
      total_signals_analyzed: signals.length,
    },
    total_messages_analyzed: signals.length,
    last_analyzed_at: new Date().toISOString(),
  };

  const [existing] = await pool.query(
    'SELECT id FROM learner_profile WHERE user_id = ?',
    [userId]
  );

  if (existing.length > 0) {
    await pool.query(
      `UPDATE learner_profile SET
        dominant_tone = ?,
        dominant_moment_pattern = ?,
        thinking_style = ?,
        confusion_signals = ?,
        click_patterns = ?,
        total_messages_analyzed = ?,
        last_analyzed_at = NOW()
       WHERE user_id = ?`,
      [
        JSON.stringify(profile.dominant_tone),
        JSON.stringify(profile.dominant_moment_pattern),
        JSON.stringify(profile.thinking_style),
        JSON.stringify(profile.confusion_signals),
        JSON.stringify(profile.click_patterns),
        profile.total_messages_analyzed,
        userId,
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO learner_profile
       (id, user_id, dominant_tone, dominant_moment_pattern, thinking_style,
        confusion_signals, click_patterns, total_messages_analyzed, last_analyzed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uuidv4(),
        userId,
        JSON.stringify(profile.dominant_tone),
        JSON.stringify(profile.dominant_moment_pattern),
        JSON.stringify(profile.thinking_style),
        JSON.stringify(profile.confusion_signals),
        JSON.stringify(profile.click_patterns),
        profile.total_messages_analyzed,
      ]
    );
  }

  console.log(`[profile] updated learner profile for user ${userId} - style:${dominantStyle} confusion:${confusionRate}%`);
  return profile;
}

async function getLearnerProfile(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM learner_profile WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    dominant_tone: parseJsonValue(row.dominant_tone, null),
    dominant_moment_pattern: parseJsonValue(row.dominant_moment_pattern, null),
    thinking_style: parseJsonValue(row.thinking_style, null),
    confusion_signals: parseJsonValue(row.confusion_signals, null),
    click_patterns: parseJsonValue(row.click_patterns, null),
    total_messages_analyzed: row.total_messages_analyzed,
    last_analyzed_at: row.last_analyzed_at,
  };
}

module.exports = { updateLearnerProfile, getLearnerProfile };
