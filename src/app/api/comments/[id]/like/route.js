import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';

function normalizeLikedBy(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function toggleLikeInTable(table, commentId, user) {
  const selectSql =
    table === 'comment_threads'
      ? 'SELECT * FROM comment_threads WHERE id = $1'
      : 'SELECT * FROM exercise_comments WHERE id = $1';
  const updateSql =
    table === 'comment_threads'
      ? 'UPDATE comment_threads SET liked_by = $1, likes = $2 WHERE id = $3'
      : 'UPDATE exercise_comments SET liked_by = $1, likes = $2 WHERE id = $3';

  const result = await pool.query(selectSql, [commentId]);
  if (result.rowCount === 0) return null;

  const comment = result.rows[0];
  let likedBy = normalizeLikedBy(comment.liked_by);
  let likes = Number(comment.likes) || 0;

  if (likedBy.includes(user)) {
    likedBy = likedBy.filter((u) => u !== user);
    likes = Math.max(likes - 1, 0);
  } else {
    likedBy.push(user);
    likes += 1;
  }

  await pool.query(updateSql, [JSON.stringify(likedBy), likes, commentId]);
  return { likes };
}

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const banned = await assertNotBanned(user);
  if (banned) return banned;

  const { id: commentId } = await params;

  try {
    let data = await toggleLikeInTable('comment_threads', commentId, user);
    if (!data) {
      data = await toggleLikeInTable('exercise_comments', commentId, user);
    }
    if (!data) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return serverError(e, 'comment like POST');
  }
}
