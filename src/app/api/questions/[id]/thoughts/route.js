import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id: questionId } = await params;
  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '思考内容不能为空' }, { status: 400 });
  }

  try {
    const result = await pool.query('SELECT thoughts FROM questions WHERE id = $1', [questionId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '问题不存在' }, { status: 404 });
    }
    let thoughts = result.rows[0].thoughts || [];
    const newThought = {
      id: 'thought-' + Date.now(),
      author: user,
      content: content.trim(),
      views: 0,
      likes: 0,
      liked_by: [],
      viewed_by: [],
      created_at: new Date().toISOString(),
    };
    thoughts.push(newThought);
    await pool.query('UPDATE questions SET thoughts = $1 WHERE id = $2', [JSON.stringify(thoughts), questionId]);
    return NextResponse.json(newThought);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}