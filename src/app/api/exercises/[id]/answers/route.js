import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id: exerciseId } = await params;
  const { content, overallThought } = await request.json();
  if (!content || !content.trim() || !overallThought || !overallThought.trim()) {
    return NextResponse.json({ error: '请填写完整' }, { status: 400 });
  }

  try {
    const result = await pool.query('SELECT answers FROM exercises WHERE id = $1', [exerciseId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '习题不存在' }, { status: 404 });
    }
    let answers = result.rows[0].answers || [];
    const newAnswer = {
      id: 'ans-' + Date.now(),
      author: user,
      overallThought: overallThought.trim(),
      content: content.trim(),
      continuations: [],
      views: 0,
      likes: 0,
      liked_by: [],
      createdAt: new Date().toISOString(),
    };
    answers.push(newAnswer);
    await pool.query('UPDATE exercises SET answers = $1 WHERE id = $2', [JSON.stringify(answers), exerciseId]);
    return NextResponse.json(newAnswer);
  } catch (e) {
    console.error('[API] 添加解答失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}