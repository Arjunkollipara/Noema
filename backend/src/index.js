const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const redis = require('redis');
const graphRoutes = require('./routes/graph');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/graph', graphRoutes);

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

  // Seed temp user for development (Sprint 8 will replace with real auth)
  try {
    const seedPool = require('./db/pool');
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');
    const [existing] = await seedPool.query(
      'SELECT id FROM users WHERE id = ?',
      ['temp-user-001']
    );
    if (existing.length === 0) {
      const hash = await bcrypt.hash('dev-password', 10);
      await seedPool.query(
        'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
        ['temp-user-001', 'dev@noema.local', hash]
      );
      status.seeded_user = true;
    } else {
      status.seeded_user = false;
    }
  } catch (e) {
    status.seed_error = e.message;
  }

  res.status(status.status === 'ok' ? 200 : 207).json(status);
});

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

  app.listen(PORT, () => {
    console.log(`[noema-api] listening on port ${PORT}`);
  });
}

startServer();
