import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const userRes = await pool.query('SELECT role, university FROM users WHERE username = $1', [user]);
    if (userRes.rowCount === 0) return NextResponse.json({ error: '用户不存在' }, { status: 403 });
    const { role, university } = userRes.rows[0];
    if (!['admin', 'moderator'].includes(role)) return NextResponse.json({ error: '权限不足' }, { status: 403 });

    let reports;
    if (role === 'admin') {
      reports = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
    } else {
      reports = await pool.query(
        'SELECT r.* FROM reports r JOIN users u ON r.reported_user = u.username WHERE u.university = $1 ORDER BY r.created_at DESC',
        [university]
      );
    }
    return NextResponse.json(reports.rows);
  } catch (e) {
    return serverError(e, 'admin reports GET');
  }
}
