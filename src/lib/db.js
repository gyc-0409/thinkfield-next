import { Pool } from 'pg';

console.log('[DB] 正在连接数据库...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // 添加超时和错误处理
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB] 数据库连接池错误:', err.message);
});

pool.on('connect', () => {
  console.log('[DB] 数据库连接成功');
});

// 测试连接
pool.query('SELECT NOW()')
  .then(res => console.log('[DB] 数据库时间:', res.rows[0].now))
  .catch(err => console.error('[DB] 数据库连接失败:', err.message));

export default pool;
// 确保关键表存在
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
  console.log('管理相关表已就绪');
}
ensureTables().catch(console.error);