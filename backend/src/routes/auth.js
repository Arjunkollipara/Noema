const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'email already registered' });
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [id, email.toLowerCase().trim(), hash]
    );
    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('noema_token', token, COOKIE_OPTIONS);
    res.status(201).json({ id, email: email.toLowerCase().trim() });
  } catch (err) {
    console.error('[auth] register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid email or password' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('noema_token', token, COOKIE_OPTIONS);
    res.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('noema_token');
  res.json({ message: 'Logged out' });
});

router.get('/me', async (req, res) => {
  const token = req.cookies?.noema_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = ?', [payload.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
