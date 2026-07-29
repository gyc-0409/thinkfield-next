import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // 保留错误日志（这是运行时错误，不是调试日志）
  console.error('[DB] 连接池错误:', err.message);
});

export default pool;

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter TEXT NOT NULL,
      reported_user TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_preview TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      report_count INT DEFAULT 1,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      handled_by TEXT DEFAULT NULL,
      handled_at TIMESTAMPTZ DEFAULT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      recipient TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      related_id TEXT,
      related_type TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
ensureTables().catch(err => console.error('[DB] 建表失败:', err.message));