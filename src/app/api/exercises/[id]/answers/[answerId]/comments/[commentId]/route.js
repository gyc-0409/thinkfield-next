import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { commentId } = await params;

  try {
    // 获取评论
    const result = await pool.query(
      'SELECT author, parent_id FROM exercise_comments WHERE id = $1',
      [commentId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 });
    }

    const comment = result.rows[0];
    if (comment.author !== user) {
      return NextResponse.json({ error: '只能删除自己的评论' }, { status: 403 });
    }

    // 检查是否有子评论
    const children = await pool.query(
      'SELECT id FROM exercise_comments WHERE parent_id = $1',
      [commentId]
    );

    if (children.rowCount > 0) {
      // 软删除
      await pool.query(
        "UPDATE exercise_comments SET content = '[已删除]', author = '[已删除]' WHERE id = $1",
        [commentId]
      );
    } else {
      // 硬删除
      await pool.query('DELETE FROM exercise_comments WHERE id = $1', [commentId]);

      // 递归清理父级空壳
      let parentId = comment.parent_id;
      while (parentId) {
        const parentRes = await pool.query(
          'SELECT author, parent_id FROM exercise_comments WHERE id = $1',
          [parentId]
        );
        if (parentRes.rowCount === 0) break;

        const parent = parentRes.rows[0];
        if (parent.author !== '[已删除]') break;

        const parentChildren = await pool.query(
          'SELECT id FROM exercise_comments WHERE parent_id = $1',
          [parentId]
        );
        if (parentChildren.rowCount === 0) {
          await pool.query('DELETE FROM exercise_comments WHERE id = $1', [parentId]);
          parentId = parent.parent_id;
        } else {
          break;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}