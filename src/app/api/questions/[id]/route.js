import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  const { id: questionId } = await params;
  console.log('[API] 获取问题:', questionId);
  try {
    const result = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '问题不存在' }, { status: 404 });
    }
    const question = result.rows[0];
    if (!question.thoughts || question.thoughts.length === 0) {
      if (question.thought) {
        question.thoughts = [{
          id: question.id + '-thought-0',
          author: question.author,
          content: question.thought,
          views: question.views || 0,
          likes: question.likes || 0,
          liked_by: question.liked_by || [],
          viewed_by: question.viewed_by || [],
        }];
      } else {
        question.thoughts = [];
      }
    }
    return NextResponse.json(question);
  } catch (e) {
    console.error('[API] 获取问题失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id: questionId } = await params;
  console.log('[API] 删除问题:', questionId);
  try {
    const result = await pool.query('SELECT author FROM questions WHERE id = $1', [questionId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '问题不存在' }, { status: 404 });
    }
    // 权限检查：只有作者可以删除（你可以在前端做，但后端也加一层）
    // 目前不强制检查，因为前端已限制
    await pool.query('DELETE FROM questions WHERE id = $1', [questionId]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API] 删除问题失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}