import pool from '@/lib/db';

export async function getHotBooks() {
  const { rows } = await pool.query(
    `SELECT b.id, b.title, b.author, COUNT(q.id) as discussions
     FROM books b
     LEFT JOIN questions q ON q.book_id = b.id
     WHERE b.hidden = false
     GROUP BY b.id
     ORDER BY discussions DESC
     LIMIT 10`
  );
  return rows.map(row => ({
    ...row,
    discussions: parseInt(row.discussions, 10) || 0,
  }));
}

export async function getBooksByType(type, isAdmin = false) {
  let query = 'SELECT id, title, author, hidden, type, tree FROM books';
  const params = [];
  const conditions = [];

  if (type) {
    conditions.push('type = $' + (params.length + 1));
    params.push(type);
  }
  if (!isAdmin) {
    conditions.push('hidden = false');
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const { rows: books } = await pool.query(query, params);
  const counts = await pool.query('SELECT book_id, COUNT(*) as cnt FROM questions GROUP BY book_id');
  const countMap = {};
  counts.rows.forEach(r => { countMap[r.book_id] = parseInt(r.cnt, 10); });
  books.forEach(b => { b.discussions = countMap[b.id] || 0; });
  return books;
}
