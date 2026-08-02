import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const nodeId = searchParams.get('nodeId');

  if (!bookId || !nodeId) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM exercises WHERE book_id = $1 AND node_id = $2',
      [bookId, nodeId]
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const banned = await assertNotBanned(user);
  if (banned) return banned;

  const { bookId, nodeId, title, content } = await request.json();
  if (!bookId || !nodeId || !title) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
  }
  const newId = 'exer-' + Date.now();
  try {
    await pool.query(
      'INSERT INTO exercises (id, book_id, node_id, chapter, section, title, content, author, answers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [newId, bookId, nodeId, 0, 0, title, content || '', user, '[]']
    );
    return NextResponse.json({ id: newId, title });
  } catch (e) {
    return serverError(e, 'exercises POST');
  }
}