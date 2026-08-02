import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';

// 获取该问题某个思考的追问树
export async function GET(request, { params }) {
  const { id: questionId } = await params;
  const { searchParams } = new URL(request.url);
  const thoughtId = searchParams.get('thoughtId');

  let query = 'SELECT * FROM comment_threads WHERE question_id = $1';
  const values = [questionId];
  if (thoughtId) {
    query += ' AND thought_id = $2';
    values.push(thoughtId);
  }
  query += ' ORDER BY created_at ASC';

  try {
    const { rows } = await pool.query(query, values);
    // 构建树状结构
    const threadMap = {};
    const roots = [];
    rows.forEach(row => {
      threadMap[row.id] = { ...row, children: [] };
    });
    rows.forEach(row => {
      if (row.parent_id && threadMap[row.parent_id]) {
        threadMap[row.parent_id].children.push(threadMap[row.id]);
      } else {
        roots.push(threadMap[row.id]);
      }
    });
    return NextResponse.json(roots);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// 发表追问
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const banned = await assertNotBanned(user);
  if (banned) return banned;

  const { id: questionId } = await params;
  const { content, parentId, quoteText, quoteStart, quoteEnd, thoughtId } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
  }

  const newId = 'ct-' + Date.now();
  try {
    await pool.query(
      `INSERT INTO comment_threads (id, question_id, thought_id, parent_id, author, content, quote_text, quote_start, quote_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [newId, questionId, thoughtId || null, parentId || null, user, content.trim(), quoteText || '', quoteStart || 0, quoteEnd || 0]
    );
    await pool.query('UPDATE questions SET replies = replies + 1 WHERE id = $1', [questionId]);
    return NextResponse.json({ success: true, id: newId });
  } catch (e) {
    return serverError(e, 'questions threads POST');
  }
}