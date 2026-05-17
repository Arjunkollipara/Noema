const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const redis = require('redis');
const cookieParser = require('cookie-parser');
const graphRoutes = require('./routes/graph');
const chatRoutes = require('./routes/chat');
const globalChatRoutes = require('./routes/globalChat');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const { startDecayScheduler } = require('./services/decay');
const decayRoutes = require('./routes/decay');
const { ensureCollection } = require('./services/memory');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Noema API!' });
});

app.get('/health', async (req, res) => {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok',
      mysql: 'pending',
      redis: 'pending',
    }
  };

  try {
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
    });
    await conn.query('SELECT 1');
    await conn.end();
    status.services.mysql = 'ok';
  } catch (e) {
    status.services.mysql = 'error: ' + e.message;
    status.status = 'degraded';
  }

  try {
    const client = redis.createClient({ url: process.env.REDIS_URL });
    await client.connect();
    await client.ping();
    await client.disconnect();
    status.services.redis = 'ok';
  } catch (e) {
    status.services.redis = 'error: ' + e.message;
    status.status = 'degraded';
  }

  res.status(status.status === 'ok' ? 200 : 207).json(status);
});

app.use('/auth', authRoutes);
app.use('/graph', authMiddleware, graphRoutes);
app.use('/chat', authMiddleware, chatRoutes);
app.use('/global', authMiddleware, globalChatRoutes);
app.use('/decay', authMiddleware, decayRoutes);

async function startServer() {
  // Run migrations before accepting requests
  const { execSync } = require('child_process');
  try {
    console.log('[noema-api] running migrations...');
    execSync('node src/db/migrate.js', { stdio: 'inherit' });
    console.log('[noema-api] migrations complete');
  } catch (err) {
    console.error('[noema-api] migration failed:', err.message);
    process.exit(1);
  }

  // 2. Start Schedulers
  // SPRINT 1 note: startDecayScheduler() now initializes both the 
  // daily decay job and the minute-by-minute Concept Synthesizer job.
  startDecayScheduler();

  try {
    await ensureCollection();
  } catch (err) {
    console.error('[memory] qdrant init error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[noema-api] listening on port ${PORT}`);
  });
}

startServer();
