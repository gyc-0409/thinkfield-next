import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// 递归查找父续写节点并追加
function findAndAppendContinuation(continuations, parentId, newCont) {
  for (const cont of continuations) {
    if (cont.id === parentId) {
      if (!cont.continuations) cont.continuations = [];
      cont.continuations.push(newCont);
      return true;
    }
    if (cont.continuations && cont.continuations.length > 0) {
      if (findAndAppendContinuation(cont.continuations, parentId, newCont)) {
        return true;
      }
    }
  }
  return false;
}

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id: exerciseId, answerId } = await params;
  const { start, content, motivation, parentContinuationId } = await request.json();
  if (content === undefined || !motivation) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    const result = await pool.query('SELECT answers FROM exercises WHERE id = $1', [exerciseId]);
    if (result.rowCount === 0) return NextResponse.json({ error: '习题不存在' }, { status: 404 });

    let answers = result.rows[0].answers || [];
    const answer = answers.find(a => a.id === answerId);
    if (!answer) return NextResponse.json({ error: '解答不存在' }, { status: 404 });

    const newCont = {
      id: 'cont-' + Date.now(),
      start: parseInt(start) || 0,
      content: content.trim(),
      motivation: motivation.trim(),
      author: user,
      continuations: [],
      createdAt: new Date().toISOString(),
    };

    if (parentContinuationId) {
      if (!answer.continuations) answer.continuations = [];
      const inserted = findAndAppendContinuation(answer.continuations, parentContinuationId, newCont);
      if (!inserted) {
        return NextResponse.json({ error: '父续写不存在' }, { status: 404 });
      }
    } else {
      if (!answer.continuations) answer.continuations = [];
      answer.continuations.push(newCont);
    }

    await pool.query('UPDATE exercises SET answers = $1 WHERE id = $2', [JSON.stringify(answers), exerciseId]);
    return NextResponse.json(newCont);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}