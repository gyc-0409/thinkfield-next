import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';

// 查找续写对象
function findContById(continuations, id) {
  for (const c of continuations) {
    if (c.id === id) return c;
    if (c.continuations) {
      const found = findContById(c.continuations, id);
      if (found) return found;
    }
  }
  return null;
}

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const banned = await assertNotBanned(user);
  if (banned) return banned;

  const { id: exerciseId, contId } = await params;

  try {
    const result = await pool.query('SELECT answers FROM exercises WHERE id = $1', [exerciseId]);
    if (result.rowCount === 0) return NextResponse.json({ error: '习题不存在' }, { status: 404 });

    let answers = result.rows[0].answers || [];
    let cont = null;
    for (const ans of answers) {
      cont = findContById(ans.continuations || [], contId);
      if (cont) break;
    }
    if (!cont) return NextResponse.json({ error: '续写不存在' }, { status: 404 });

    if (!cont.liked_by) cont.liked_by = [];
    if (cont.liked_by.includes(user)) {
      // 取消点赞
      cont.liked_by = cont.liked_by.filter(u => u !== user);
      cont.likes = Math.max((cont.likes || 1) - 1, 0);
    } else {
      // 点赞
      cont.liked_by.push(user);
      cont.likes = (cont.likes || 0) + 1;
    }

    await pool.query('UPDATE exercises SET answers = $1 WHERE id = $2', [JSON.stringify(answers), exerciseId]);
    return NextResponse.json({ likes: cont.likes });
  } catch (e) {
    return serverError(e, 'continuation like POST');
  }
}