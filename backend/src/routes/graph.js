const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();

// TEMPORARY - will be replaced by real auth in Sprint 8
const TEMP_USER_ID = 'temp-user-001';

// GET /api/graph/nodes - get all nodes for the user
router.get('/nodes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM nodes WHERE user_id = ? ORDER BY created_at DESC',
      [TEMP_USER_ID]
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
      [id, TEMP_USER_ID]
    );

    if (nodes.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Fetch direct neighbours (one hop)
    const [edges] = await pool.query(
      'SELECT * FROM edges WHERE (source_id = ? OR target_id = ?) AND user_id = ?',
      [id, id, TEMP_USER_ID]
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
      [id, TEMP_USER_ID, title.trim(), summary || null, now, now]
    );

    // If spawned from a parent node, create the edge
    if (parent_id) {
      const edgeId = uuidv4();
      const type = edge_type || 'discovered_from';
      await pool.query(
        `INSERT INTO edges (id, user_id, source_id, target_id, edge_type)
         VALUES (?, ?, ?, ?, ?)`,
        [edgeId, TEMP_USER_ID, parent_id, id, type]
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
      [id, TEMP_USER_ID]
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
    const values = [...Object.values(updates), id, TEMP_USER_ID];

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

// DELETE /api/graph/nodes/:id - delete a node and its edges
router.delete('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM nodes WHERE id = ? AND user_id = ?',
      [id, TEMP_USER_ID]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    await pool.query('DELETE FROM nodes WHERE id = ? AND user_id = ?', [id, TEMP_USER_ID]);
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
      [TEMP_USER_ID]
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
      [source_id, TEMP_USER_ID]
    );
    const [targetRows] = await pool.query(
      'SELECT id FROM nodes WHERE id = ? AND user_id = ?',
      [target_id, TEMP_USER_ID]
    );

    if (sourceRows.length === 0 || targetRows.length === 0) {
      return res.status(404).json({ error: 'One or both nodes not found' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO edges (id, user_id, source_id, target_id, edge_type)
       VALUES (?, ?, ?, ?, ?)`,
      [id, TEMP_USER_ID, source_id, target_id, edge_type || 'discovered_from']
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
      [id, TEMP_USER_ID]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    await pool.query('DELETE FROM edges WHERE id = ? AND user_id = ?', [id, TEMP_USER_ID]);
    res.json({ message: 'Edge deleted' });
  } catch (err) {
    console.error('[graph] DELETE /edges/:id error:', err);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

module.exports = router;
