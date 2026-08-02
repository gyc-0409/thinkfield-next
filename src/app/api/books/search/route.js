import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  if (!q.trim()) {
    return NextResponse.json([]);
  }

  try {
    const currentUser = await getCurrentUser();
    let isAdmin = false;
    if (currentUser) {
      const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [currentUser]);
      isAdmin = userRes.rows[0]?.role === 'admin';
    }

    let query = `SELECT id, title, author FROM books 
       WHERE (title ILIKE $1 OR author ILIKE $1)`;
    const params = [`%${q}%`];

    if (!isAdmin) {
      query += ' AND hidden = false';
    }

    query += ' ORDER BY id DESC LIMIT 20';

    const { rows } = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
