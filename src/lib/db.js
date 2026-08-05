import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error(
    '缺少环境变量 DATABASE_URL。\n' +
    '请在项目根目录的 .env.local 文件中添加 DATABASE_URL=postgresql://...\n' +
    'Railway 部署时请在 Variables 中配置或通过 Link PostgreSQL 自动生成。'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 3,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] 连接池错误:', err.message);
});

pool.query('SELECT NOW()')
  .then(res => console.log('[DB] 连接成功，数据库时间:', res.rows[0].now))
  .catch(err => console.error('[DB] 连接失败:', err.message));

export default pool;

// 仅自动创建管理相关表；books/users/questions 等核心表需手动维护
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
    CREATE TABLE IF NOT EXISTS book_requests (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      translator TEXT DEFAULT '',
      publisher TEXT NOT NULL,
      edition TEXT NOT NULL,
      publish_year TEXT DEFAULT '',
      isbn TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      book_id TEXT,
      reject_reason TEXT,
      handled_by TEXT,
      handled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_book_requests_pending_unique
      ON book_requests (username, lower(trim(title)))
      WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_book_requests_username ON book_requests(username);
    CREATE INDEX IF NOT EXISTS idx_book_requests_status ON book_requests(status);
  `);

  // 学生认证字段（幂等迁移）
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_status TEXT DEFAULT 'none';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_school TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_code TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_agreed_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_submitted_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_reviewed_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_reviewed_by TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_reject_reason TEXT;
    ALTER TABLE books ADD COLUMN IF NOT EXISTS edition TEXT;
    ALTER TABLE books ADD COLUMN IF NOT EXISTS publisher TEXT;
    ALTER TABLE books ADD COLUMN IF NOT EXISTS isbn TEXT;
    ALTER TABLE books ADD COLUMN IF NOT EXISTS translator TEXT;
    ALTER TABLE books ADD COLUMN IF NOT EXISTS publish_year TEXT;
  `);
}
ensureTables().catch(err => console.error('[DB] 建表失败:', err.message));
