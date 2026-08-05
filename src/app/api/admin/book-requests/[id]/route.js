import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';
import { mapBookRequestRow } from '@/lib/bookRequests';

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [user]);
    if (userRes.rowCount === 0 || !['admin', 'moderator'].includes(userRes.rows[0].role)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id: rawId } = await params;
    const requestId = Number(rawId);
    if (!requestId) return NextResponse.json({ error: '无效的申请 ID' }, { status: 400 });

    const { action, bookId, reason } = await request.json();
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '无效操作' }, { status: 400 });
    }

    const existing = await pool.query('SELECT * FROM book_requests WHERE id = $1', [requestId]);
    if (existing.rowCount === 0) {
      return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    }
    if (existing.rows[0].status !== 'pending') {
      return NextResponse.json({ error: '该申请已处理' }, { status: 400 });
    }

    if (action === 'approve') {
      const trimmedBookId = String(bookId || '').trim();
      if (!trimmedBookId) {
        return NextResponse.json({ error: '请填写已创建的书籍 ID' }, { status: 400 });
      }

      const bookRes = await pool.query('SELECT id, title FROM books WHERE id = $1', [trimmedBookId]);
      if (bookRes.rowCount === 0) {
        return NextResponse.json({ error: '书籍 ID 不存在，请先在添加书籍中创建' }, { status: 400 });
      }

      const { rows } = await pool.query(
        `UPDATE book_requests
         SET status = 'approved', book_id = $1, handled_by = $2, handled_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [trimmedBookId, user, requestId]
      );

      return NextResponse.json({
        success: true,
        request: mapBookRequestRow(rows[0]),
        bookTitle: bookRes.rows[0].title,
      });
    }

    const rejectReason = String(reason || '').trim();
    const { rows } = await pool.query(
      `UPDATE book_requests
       SET status = 'rejected', reject_reason = $1, handled_by = $2, handled_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rejectReason, user, requestId]
    );

    return NextResponse.json({ success: true, request: mapBookRequestRow(rows[0]) });
  } catch (e) {
    return serverError(e, 'admin/book-requests/[id] PUT');
  }
}
