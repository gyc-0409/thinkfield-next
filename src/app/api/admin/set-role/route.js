import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';

export async function PUT(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { role } = await pool.query('SELECT role FROM users WHERE username = $1', [user]).then(res => res.rows[0]);
    if (role !== 'admin') return NextResponse.json({ error: '权限不足' }, { status: 403 });

    const { username, role: newRole } = await request.json();
    if (!username || !newRole) return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    if (!['user', 'moderator'].includes(newRole)) return NextResponse.json({ error: '角色无效' }, { status: 400 });

    const target = await pool.query('SELECT role FROM users WHERE username = $1', [username]);
    if (target.rowCount === 0) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    if (target.rows[0].role === 'admin') return NextResponse.json({ error: '不能修改超级管理员角色' }, { status: 403 });

    await pool.query('UPDATE users SET role = $1 WHERE username = $2', [newRole, username]);
    return NextResponse.json({ success: true, message: `已将 ${username} 设为 ${newRole}` });
  } catch (e) {
    return serverError(e, 'admin set-role PUT');
  }
}
