import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id: exerciseId, answerId } = await params;

  try {
    const result = await pool.query('SELECT answers FROM exercises WHERE id = $1', [exerciseId]);
    if (result.rowCount === 0) return NextResponse.json({ error: '习题不存在' }, { status: 404 });

    let answers = result.rows[0].answers || [];
    const answer = answers.find(a => a.id === answerId);
    if (!answer) return NextResponse.json({ error: '解答不存在' }, { status: 404 });

    if (!answer.liked_by) answer.liked_by = [];
    if (!answer.likes) answer.likes = 0;

    if (answer.liked_by.includes(user)) {
      // 取消点赞
      answer.liked_by = answer.liked_by.filter(u => u !== user);
      answer.likes = Math.max(answer.likes - 1, 0);
    } else {
      // 点赞
      answer.liked_by.push(user);
      answer.likes += 1;
    }

    await pool.query('UPDATE exercises SET answers = $1 WHERE id = $2', [JSON.stringify(answers), exerciseId]);
    return NextResponse.json({ likes: answer.likes });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}