const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { getLearnerProfile } = require('../services/llm/learnerProfile');

const router = express.Router();

// GET /api/graph/nodes - get all nodes for the user
router.get('/nodes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM nodes WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ nodes: rows });
  } catch (err) {
    console.error('[graph] GET /nodes error:', err);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

// GET /api/graph/nodes/:id - get a single node with its neighbours
router.get('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [nodes] = await pool.query(
      'SELECT * FROM nodes WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (nodes.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Fetch direct neighbours (one hop)
    const [edges] = await pool.query(
      'SELECT * FROM edges WHERE (source_id = ? OR target_id = ?) AND user_id = ?',
      [id, id, req.userId]
    );

    const neighbourIds = edges.map(e =>
      e.source_id === id ? e.target_id : e.source_id
    );

    let neighbours = [];
    if (neighbourIds.length > 0) {
      const placeholders = neighbourIds.map(() => '?').join(',');
      const [nRows] = await pool.query(
        `SELECT id, title, summary, phase, decay_score FROM nodes WHERE id IN (${placeholders})`,
        neighbourIds
      );
      neighbours = nRows;
    }

    res.json({ node: nodes[0], edges, neighbours });
  } catch (err) {
    console.error('[graph] GET /nodes/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch node' });
  }
});

// POST /api/graph/nodes - create a new node
router.post('/nodes', async (req, res) => {
  try {
    const { title, summary, parent_id, edge_type } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (title.trim().length > 255) {
      return res.status(400).json({ error: 'title must be 255 characters or less' });
    }

    const id = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO nodes (id, user_id, title, summary, phase, decay_score, visit_count, last_visited, created_at)
       VALUES (?, ?, ?, ?, 'explore', 1.0, 0, ?, ?)`,
      [id, req.userId, title.trim(), summary || null, now, now]
    );

    // If spawned from a parent node, create the edge
    if (parent_id) {
      const edgeId = uuidv4();
      const type = edge_type || 'discovered_from';
      await pool.query(
        `INSERT INTO edges (id, user_id, source_id, target_id, edge_type)
         VALUES (?, ?, ?, ?, ?)`,
        [edgeId, req.userId, parent_id, id, type]
      );
    }

    const [rows] = await pool.query('SELECT * FROM nodes WHERE id = ?', [id]);
    res.status(201).json({ node: rows[0] });
  } catch (err) {
    console.error('[graph] POST /nodes error:', err);
    res.status(500).json({ error: 'Failed to create node' });
  }
});

// PATCH /api/graph/nodes/:id - update a node's title, summary, or phase
router.patch('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, phase } = req.body;

    const validPhases = ['explore', 'construct', 'confirm'];
    if (phase && !validPhases.includes(phase)) {
      return res.status(400).json({ error: 'phase must be explore, construct, or confirm' });
    }

    if (title && title.trim().length > 255) {
      return res.status(400).json({ error: 'title must be 255 characters or less' });
    }

    const [existing] = await pool.query(
      'SELECT * FROM nodes WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (summary !== undefined) updates.summary = summary;
    if (phase !== undefined) updates.phase = phase;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id, req.userId];

    await pool.query(
      `UPDATE nodes SET ${fields} WHERE id = ? AND user_id = ?`,
      values
    );

    const [rows] = await pool.query('SELECT * FROM nodes WHERE id = ?', [id]);
    res.json({ node: rows[0] });
  } catch (err) {
    console.error('[graph] PATCH /nodes/:id error:', err);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

router.post('/nodes/:id/anchor', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query(
      'SELECT * FROM nodes WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    await pool.query(
      'UPDATE nodes SET is_anchored = 1 WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    res.json({ anchored: true, id });
  } catch (err) {
    console.error('[graph] anchor error:', err);
    res.status(500).json({ error: 'Failed to anchor node' });
  }
});

// DELETE /api/graph/nodes/:id - delete a node and its edges
router.delete('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM nodes WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Check if this is an inferred node being rejected
    const [nodeToDelete] = await pool.query(
      'SELECT node_origin, is_anchored FROM nodes WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (nodeToDelete.length > 0 && nodeToDelete[0].is_anchored === 0) {
      const { recordRejection } = require('../services/llm/detector');
      await recordRejection(id, req.userId);
    }

    await pool.query('DELETE FROM nodes WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Node deleted' });
  } catch (err) {
    console.error('[graph] DELETE /nodes/:id error:', err);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

// GET /api/graph/edges - get all edges for the user
router.get('/edges', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM edges WHERE user_id = ?',
      [req.userId]
    );
    res.json({ edges: rows });
  } catch (err) {
    console.error('[graph] GET /edges error:', err);
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

// POST /api/graph/edges - create a new edge between two existing nodes
router.post('/edges', async (req, res) => {
  try {
    const { source_id, target_id, edge_type } = req.body;

    if (!source_id || !target_id) {
      return res.status(400).json({ error: 'source_id and target_id are required' });
    }

    const validTypes = ['discovered_from', 'contradicts', 'supports', 'prerequisite_of', 'analogous_to'];
    if (edge_type && !validTypes.includes(edge_type)) {
      return res.status(400).json({ error: 'invalid edge_type' });
    }

    // Verify both nodes exist and belong to this user
    const [sourceRows] = await pool.query(
      'SELECT id FROM nodes WHERE id = ? AND user_id = ?',
      [source_id, req.userId]
    );
    const [targetRows] = await pool.query(
      'SELECT id FROM nodes WHERE id = ? AND user_id = ?',
      [target_id, req.userId]
    );

    if (sourceRows.length === 0 || targetRows.length === 0) {
      return res.status(404).json({ error: 'One or both nodes not found' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO edges (id, user_id, source_id, target_id, edge_type)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.userId, source_id, target_id, edge_type || 'discovered_from']
    );

    const [rows] = await pool.query('SELECT * FROM edges WHERE id = ?', [id]);
    res.status(201).json({ edge: rows[0] });
  } catch (err) {
    console.error('[graph] POST /edges error:', err);
    res.status(500).json({ error: 'Failed to create edge' });
  }
});

// DELETE /api/graph/edges/:id - delete an edge
router.delete('/edges/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM edges WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    await pool.query('DELETE FROM edges WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Edge deleted' });
  } catch (err) {
    console.error('[graph] DELETE /edges/:id error:', err);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const profile = await getLearnerProfile(req.userId);
    if (!profile) {
      return res.json({
        message: 'Not enough data yet. Keep exploring.',
        total_messages_analyzed: 0,
      });
    }
    res.json(profile);
  } catch (err) {
    console.error('[profile] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
