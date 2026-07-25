import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const currentUser = await getCurrentUser();

  let isAdmin = false;
  if (currentUser) {
    const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [currentUser]);
    isAdmin = userRes.rows[0]?.role === 'admin';
  }

  try {
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

    // 统计讨论数
    const counts = await pool.query('SELECT book_id, COUNT(*) as cnt FROM questions GROUP BY book_id');
    const countMap = {};
    counts.rows.forEach(r => { countMap[r.book_id] = parseInt(r.cnt); });
    books.forEach(b => { b.discussions = countMap[b.id] || 0; });

    return NextResponse.json(books);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}