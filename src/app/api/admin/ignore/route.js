import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { role, university } = await pool.query('SELECT role, university FROM users WHERE username = $1', [user]).then(res => res.rows[0]);
  if (!['admin', 'moderator'].includes(role)) return NextResponse.json({ error: '权限不足' }, { status: 403 });

  const { report_id } = await request.json();
  if (!report_id) return NextResponse.json({ error: '缺少举报ID' }, { status: 400 });

  const report = await pool.query('SELECT * FROM reports WHERE id = $1', [report_id]);
  if (report.rowCount === 0) return NextResponse.json({ error: '举报不存在' }, { status: 404 });

  if (role === 'moderator') {
    const reportedUser = report.rows[0].reported_user;
    const u = await pool.query('SELECT university FROM users WHERE username = $1', [reportedUser]);
    if (u.rowCount === 0 || u.rows[0].university !== university) return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  await pool.query("UPDATE reports SET status = 'ignored', handled_by = $1, handled_at = NOW() WHERE id = $2", [user, report_id]);
  return NextResponse.json({ success: true, message: '已忽略该举报' });
}