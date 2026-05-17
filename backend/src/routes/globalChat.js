const express = require('express');
const { globalChat, getGlobalHistory } = require('../services/llm/global');

const router = express.Router();

router.get('/history', async (req, res) => {
  try {
    const messages = await getGlobalHistory(req.userId);
    res.json({ messages });
  } catch (err) {
    console.error('[global] GET history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (message.trim().length > 4000) {
      return res.status(400).json({ error: 'message too long' });
    }
    const result = await globalChat({
      userId: req.userId,
      userMessage: message.trim(),
    });
    res.json(result);
  } catch (err) {
    console.error('[global] POST chat error:', err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

module.exports = router;
