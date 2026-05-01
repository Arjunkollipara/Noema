const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const redis = require('redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`[noema-api] listening on port ${PORT}`);
});
