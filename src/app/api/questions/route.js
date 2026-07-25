import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  const nodeId = searchParams.get('nodeId'); // 替换原来的 chapter/section

  if (!bookId || !nodeId) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM questions WHERE book_id = $1 AND node_id = $2 ORDER BY sort_order ASC, id DESC',
      [bookId, nodeId]
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { bookId, nodeId, title, thought, location, type } = await request.json();
  if (!bookId || !nodeId || !title || !thought) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
  }

  const newId = bookId + '-q' + Date.now();
  const firstThought = {
    id: newId + '-thought-0',
    author: user,
    content: thought,
    views: 0,
    likes: 0,
    liked_by: [],
    viewed_by: [],
    created_at: new Date().toISOString(),
  };

  try {
    await pool.query(
      `INSERT INTO questions (id, book_id, node_id, chapter, section, title, author, thought, location, type, unlocked, views, likes, viewed_by, liked_by, comments, thoughts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        newId, bookId, nodeId, 0, 0, title, user, thought, location || '', type || 'question',
        false, 0, 0, '[]', '[]', '[]', JSON.stringify([firstThought])
      ]
    );
    return NextResponse.json({ id: newId, title });
  } catch (e) {
    console.error('创建问题失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}