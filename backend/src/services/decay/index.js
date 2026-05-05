const cron = require('node-cron');
const pool = require('../../db/pool');

function calculateDecayScore(lastVisited) {
  if (!lastVisited) return 0.1;
  const now = new Date();
  const days = (now - new Date(lastVisited)) / (1000 * 60 * 60 * 24);
  return Math.round(Math.exp(-0.05 * days) * 10000) / 10000;
}

async function runDecayUpdate() {
  console.log('[decay] running decay update...');
  try {
    const [nodes] = await pool.query(
      'SELECT id, last_visited FROM nodes'
    );

    let updated = 0;
    for (const node of nodes) {
      const score = calculateDecayScore(node.last_visited);
      await pool.query(
        'UPDATE nodes SET decay_score = ? WHERE id = ?',
        [score, node.id]
      );
      updated++;
    }

    console.log(`[decay] updated ${updated} nodes`);
    return { updated, timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('[decay] error:', err.message);
    throw err;
  }
}

function startDecayScheduler() {
  // Runs every 24 hours at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[decay] scheduled run triggered');
    await runDecayUpdate();
  });
  console.log('[decay] scheduler started');
}

module.exports = { startDecayScheduler, runDecayUpdate, calculateDecayScore };