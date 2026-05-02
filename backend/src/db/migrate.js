const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function getConnection() {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    multipleStatements: true,
  });
}

async function migrate() {
  const conn = await getConnection();
  console.log('[migrate] connected to MySQL');

  // Create migrations tracking table if it does not exist
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already-run migrations
  const [ran] = await conn.query('SELECT filename FROM schema_migrations');
  const ranFiles = ran.map(r => r.filename);

  // Read migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (ranFiles.includes(file)) {
      console.log(`[migrate] skipping ${file} (already ran)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] running ${file}`);
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    console.log(`[migrate] done ${file}`);
  }

  await conn.end();
  console.log('[migrate] all migrations complete');
}

migrate().catch(err => {
  console.error('[migrate] error:', err);
  process.exit(1);
});
