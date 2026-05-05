const express = require('express');
const { runDecayUpdate, calculateDecayScore } = require('../services/decay');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/decay/run — manually trigger decay update (dev tool)
router.post('/run', async (req, res) => {
  try {
    const result = await runDecayUpdate();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Decay update failed' });
  }
});

// GET /api/decay/preview — preview decay scores without writing
router.get('/preview', async (req, res) => {
  try {
    const [nodes] = await pool.query(
      'SELECT id, title, last_visited, decay_score FROM nodes'
    );
    const preview = nodes.map(n => ({
      id: n.id,
      title: n.title,
      last_visited: n.last_visited,
      current_score: n.decay_score,
      calculated_score: calculateDecayScore(n.last_visited),
      days_since_visit: n.last_visited
        ? Math.floor((Date.now() - new Date(n.last_visited)) / (1000 * 60 * 60 * 24))
        : null,
    }));
    res.json({ nodes: preview });
  } catch (err) {
    res.status(500).json({ error: 'Preview failed' });
  }
});

module.exports = router;