import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';
import { mapBookRequestRow } from '@/lib/bookRequests';

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };

  const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [user]);
  if (userRes.rowCount === 0 || !['admin', 'moderator'].includes(userRes.rows[0].role)) {
    return { error: NextResponse.json({ error: '权限不足' }, { status: 403 }) };
  }

  return { user, role: userRes.rows[0].role };
}

export async function GET() {
  try {
    const auth = await requireStaff();
    if (auth.error) return auth.error;

    const { rows } = await pool.query(
      `SELECT * FROM book_requests
       ORDER BY
         CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         created_at DESC
       LIMIT 100`
    );

    return NextResponse.json(rows.map(mapBookRequestRow));
  } catch (e) {
    return serverError(e, 'admin/book-requests GET');
  }
}
