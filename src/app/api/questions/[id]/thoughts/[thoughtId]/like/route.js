import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id: questionId, thoughtId } = await params;
  try {
    const result = await pool.query('SELECT thoughts FROM questions WHERE id = $1', [questionId]);
    if (result.rowCount === 0) return NextResponse.json({ error: '问题不存在' }, { status: 404 });
    let thoughts = result.rows[0].thoughts || [];
    const thought = thoughts.find(t => t.id === thoughtId);
    if (!thought) return NextResponse.json({ error: '思考不存在' }, { status: 404 });
    if (!thought.liked_by) thought.liked_by = [];

    if (thought.liked_by.includes(user)) {
      // 取消点赞
      thought.liked_by = thought.liked_by.filter(u => u !== user);
      thought.likes = Math.max((thought.likes || 1) - 1, 0);
    } else {
      // 点赞
      thought.liked_by.push(user);
      thought.likes = (thought.likes || 0) + 1;
    }

    await pool.query('UPDATE questions SET thoughts = $1 WHERE id = $2', [JSON.stringify(thoughts), questionId]);
    return NextResponse.json({ likes: thought.likes });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}