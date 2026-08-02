import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';

export async function PUT(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { role, university: adminUniversity } = await pool.query('SELECT role, university FROM users WHERE username = $1', [user]).then(res => res.rows[0]);
    if (!['admin', 'moderator'].includes(role)) return NextResponse.json({ error: '权限不足' }, { status: 403 });

    const { username } = await request.json();
    if (!username) return NextResponse.json({ error: '缺少用户名' }, { status: 400 });

    const target = await pool.query('SELECT university, role FROM users WHERE username = $1', [username]);
    if (target.rowCount === 0) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    const { university: targetUni, role: targetRole } = target.rows[0];
    if (targetRole === 'admin') return NextResponse.json({ error: '不能禁言超级管理员' }, { status: 403 });
    if (role === 'moderator' && targetUni !== adminUniversity) return NextResponse.json({ error: '只能禁言本大学用户' }, { status: 403 });

    await pool.query('UPDATE users SET banned = true WHERE username = $1', [username]);
    await pool.query("UPDATE reports SET status = 'banned', handled_by = $1, handled_at = NOW() WHERE reported_user = $2 AND status = 'pending'", [user, username]);
    return NextResponse.json({ success: true, message: `已禁言 ${username}` });
  } catch (e) {
    return serverError(e, 'admin ban PUT');
  }
}
