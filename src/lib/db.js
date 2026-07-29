import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // 连接池设置（针对 Railway 免费数据库限制）
  max: 3,               // 最多 3 个连接，避免超过 Railway 限制
  min: 0,               // 空闲时释放所有连接
  idleTimeoutMillis: 10000,   // 空闲连接 10 秒后释放
  connectionTimeoutMillis: 5000,
  // 开启 TCP keepalive，防止数据库端关闭空闲连接
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
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