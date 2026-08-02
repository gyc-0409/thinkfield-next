import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';

export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const banned = await assertNotBanned(user);
  if (banned) return banned;

  const { id: commentId } = await params; // 这里必须 await

  try {
    const result = await pool.query('SELECT * FROM comment_threads WHERE id = $1', [commentId]);
    if (result.rowCount === 0) return NextResponse.json({ error: '评论不存在' }, { status: 404 });

    let comment = result.rows[0];
    let likedBy = comment.liked_by || [];

    if (likedBy.includes(user)) {
      // 取消点赞
      likedBy = likedBy.filter(u => u !== user);
      comment.likes = Math.max((comment.likes || 1) - 1, 0);
    } else {
      // 点赞
      likedBy.push(user);
      comment.likes = (comment.likes || 0) + 1;
    }

    await pool.query('UPDATE comment_threads SET liked_by = $1, likes = $2 WHERE id = $3',
      [JSON.stringify(likedBy), comment.likes, commentId]);

    return NextResponse.json({ likes: comment.likes });
  } catch (e) {
    return serverError(e, 'comment like POST');
  }
}