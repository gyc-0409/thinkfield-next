import pool from './db';

export function normalizeBookTitle(title) {
  return String(title || '').trim().toLowerCase();
}

export async function findDuplicateRequest(username, title) {
  const normalized = normalizeBookTitle(title);
  const { rows } = await pool.query(
    `SELECT id, status FROM book_requests
     WHERE username = $1 AND lower(trim(title)) = $2 AND status IN ('pending', 'approved')
     LIMIT 1`,
    [username, normalized]
  );
  return rows[0] || null;
}

export function mapBookRequestRow(row) {
  return {
    id: row.id,
    username: row.username,
    title: row.title,
    author: row.author,
    translator: row.translator || '',
    publisher: row.publisher,
    edition: row.edition,
    publishYear: row.publish_year || '',
    isbn: row.isbn || '',
    status: row.status,
    bookId: row.book_id || null,
    rejectReason: row.reject_reason || '',
    createdAt: row.created_at,
    handledAt: row.handled_at || null,
    handledBy: row.handled_by || null,
  };
}
