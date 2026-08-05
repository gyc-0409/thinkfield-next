-- 思辨场 PostgreSQL Schema
-- 由代码推断导出，供新环境初始化参考
-- reports / notifications 由 db.js 自动创建

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  university TEXT,
  role TEXT DEFAULT 'user',
  email_verified BOOLEAN DEFAULT false,
  banned BOOLEAN DEFAULT false,
  certification_status TEXT DEFAULT 'none',
  certification_school TEXT,
  certification_code TEXT,
  certification_agreed_at TIMESTAMPTZ,
  certification_submitted_at TIMESTAMPTZ,
  certification_reviewed_at TIMESTAMPTZ,
  certification_reviewed_by TEXT,
  certification_reject_reason TEXT
);

CREATE TABLE IF NOT EXISTS verification_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expiry TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  hidden BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'science',
  tree JSONB DEFAULT '[]',
  chapters JSONB,
  sections JSONB,
  edition TEXT,
  publisher TEXT,
  isbn TEXT,
  translator TEXT,
  publish_year TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id),
  node_id TEXT NOT NULL,
  chapter INTEGER DEFAULT 0,
  section INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  thought TEXT,
  location TEXT DEFAULT '',
  type TEXT DEFAULT 'question',
  unlocked BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  viewed_by JSONB DEFAULT '[]',
  liked_by JSONB DEFAULT '[]',
  comments JSONB DEFAULT '[]',
  thoughts JSONB DEFAULT '[]',
  page_range TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id),
  node_id TEXT NOT NULL,
  chapter INTEGER DEFAULT 0,
  section INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  author TEXT,
  answers JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS comment_threads (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  thought_id TEXT,
  parent_id TEXT,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  quote_text TEXT DEFAULT '',
  quote_start INTEGER DEFAULT 0,
  quote_end INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_comments (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  answer_id TEXT NOT NULL,
  parent_id TEXT,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  quote_text TEXT DEFAULT '',
  quote_start INTEGER DEFAULT 0,
  quote_end INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  liked_by JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_questions_book_node ON questions(book_id, node_id);
CREATE INDEX IF NOT EXISTS idx_exercises_book_node ON exercises(book_id, node_id);
CREATE INDEX IF NOT EXISTS idx_comment_threads_question ON comment_threads(question_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);

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
