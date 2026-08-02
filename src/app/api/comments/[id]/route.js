import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const banned = await assertNotBanned(user);
  if (banned) return banned;

  const { id: commentId } = await params;

  try {
    const result = await pool.query('SELECT author, parent_id FROM comment_threads WHERE id = $1', [commentId]);
    if (result.rowCount === 0) return NextResponse.json({ error: '评论不存在' }, { status: 404 });

    const comment = result.rows[0];
    if (comment.author !== user) return NextResponse.json({ error: '只能删除自己的评论' }, { status: 403 });

    // 检查是否有子评论
    const children = await pool.query('SELECT id FROM comment_threads WHERE parent_id = $1', [commentId]);

    if (children.rowCount > 0) {
      // 软删除：改为已删除标记
      await pool.query("UPDATE comment_threads SET content = '[已删除]', author = '[已删除]' WHERE id = $1", [commentId]);
    } else {
      // 硬删除
      await pool.query('DELETE FROM comment_threads WHERE id = $1', [commentId]);

      // 递归检查父评论，若父评论为已删除且无其他子评论，则硬删除父评论
      let parentId = comment.parent_id;
      while (parentId) {
        const parentRes = await pool.query('SELECT author, parent_id FROM comment_threads WHERE id = $1', [parentId]);
        if (parentRes.rowCount === 0) break;
        const parent = parentRes.rows[0];
        if (parent.author !== '[已删除]') break; // 父评论不是软删除，停止

        // 检查父评论是否还有其他子评论
        const parentChildren = await pool.query('SELECT id FROM comment_threads WHERE parent_id = $1', [parentId]);
        if (parentChildren.rowCount === 0) {
          // 没有子评论，硬删除父评论，并继续向上
          await pool.query('DELETE FROM comment_threads WHERE id = $1', [parentId]);
          parentId = parent.parent_id; // 继续向上
        } else {
          // 仍有其他子评论，停止递归
          break;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return serverError(e, 'comments DELETE');
  }
}