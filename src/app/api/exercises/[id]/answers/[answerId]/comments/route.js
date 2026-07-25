import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET 获取某解答的所有评论
export async function GET(request, { params }) {
  const { id: exerciseId, answerId } = await params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM exercise_comments WHERE exercise_id = $1 AND answer_id = $2 ORDER BY created_at ASC',
      [exerciseId, answerId]
    );
    // 构建树形结构
    const map = {};
    const roots = [];
    rows.forEach(row => { map[row.id] = { ...row, children: [] }; });
    rows.forEach(row => {
      if (row.parent_id && map[row.parent_id]) {
        map[row.parent_id].children.push(map[row.id]);
      } else {
        roots.push(map[row.id]);
      }
    });
    return NextResponse.json(roots);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST 发表评论
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id: exerciseId, answerId } = await params;
  const { content, parentId, quoteText, quoteStart, quoteEnd } = await request.json();
  if (!content || !content.trim()) return NextResponse.json({ error: '内容不能为空' }, { status: 400 });

  const newId = 'ec-' + Date.now();
  try {
    await pool.query(
      'INSERT INTO exercise_comments (id, exercise_id, answer_id, parent_id, author, content, quote_text, quote_start, quote_end) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [newId, exerciseId, answerId, parentId || null, user, content.trim(), quoteText || '', quoteStart || 0, quoteEnd || 0]
    );
    return NextResponse.json({ success: true, id: newId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}