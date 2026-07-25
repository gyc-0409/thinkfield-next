import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.title, b.author, COUNT(q.id) as discussions
       FROM books b
       LEFT JOIN questions q ON q.book_id = b.id
       WHERE b.hidden = false
       GROUP BY b.id
       ORDER BY discussions DESC
       LIMIT 10`
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}