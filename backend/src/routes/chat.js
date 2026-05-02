const express = require('express');
const { chat, getHistory } = require('../services/llm');

const router = express.Router();

// TEMPORARY - replaced by real auth in Sprint 8
const TEMP_USER_ID = 'temp-user-001';

// GET /api/chat/:nodeId/history
router.get('/:nodeId/history', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const messages = await getHistory(nodeId, TEMP_USER_ID);
    res.json({ messages });
  } catch (err) {
    console.error('[chat] GET history error:', err);
    if (err.message === 'Node not found') {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/chat/:nodeId
router.post('/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (message.trim().length > 4000) {
      return res.status(400).json({ error: 'message too long (max 4000 characters)' });
    }

    const result = await chat({
      nodeId,
      userId: TEMP_USER_ID,
      userMessage: message.trim(),
    });

    res.json(result);
  } catch (err) {
    console.error('[chat] POST error:', err);
    if (err.message === 'Node not found') {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// GET /api/chat/provider - tells the frontend which provider is active
router.get('/provider', async (req, res) => {
  const { getProvider } = require('../services/llm/provider');
  const { provider, model } = getProvider();
  res.json({ provider, model });
});

module.exports = router;
