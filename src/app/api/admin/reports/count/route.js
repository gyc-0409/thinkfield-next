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

    let count;
    if (role === 'admin') {
      count = await pool.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'");
    } else {
      count = await pool.query(
        "SELECT COUNT(*) FROM reports r JOIN users u ON r.reported_user = u.username WHERE r.status = 'pending' AND u.university = $1",
        [university]
      );
    }
    return NextResponse.json({ count: parseInt(count.rows[0].count) });
  } catch (e) {
    return serverError(e, 'admin reports count GET');
  }
}
