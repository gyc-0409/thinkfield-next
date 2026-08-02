import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const username = await getCurrentUser();
    if (!username) {
      return NextResponse.json([]);
    }
    const { rows } = await pool.query(
      `SELECT DISTINCT b.id, b.title, b.author,
         (SELECT COUNT(*) FROM questions WHERE book_id = b.id) as discussions
       FROM questions q
       JOIN books b ON b.id = q.book_id
       WHERE q.author = $1 AND b.hidden = false
       ORDER BY b.title`,
      [username]
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
