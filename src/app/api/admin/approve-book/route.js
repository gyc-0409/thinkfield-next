import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [user]);
    if (userRes.rowCount === 0 || userRes.rows[0].role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { notificationId } = await request.json();
    if (!notificationId) return NextResponse.json({ error: '缺少通知ID' }, { status: 400 });

    const notif = await pool.query('SELECT * FROM notifications WHERE id = $1', [notificationId]);
    if (notif.rowCount === 0) return NextResponse.json({ error: '通知不存在' }, { status: 404 });

    const { message } = notif.rows[0];

    const match = message.match(/申请添加书籍《(.+?)》（作者：(.+?)，版本：(.+?)）/);
    if (!match) return NextResponse.json({ error: '消息格式无法解析' }, { status: 400 });

    const [, title, author] = match;

    const bookId = 'book-' + Date.now();
    await pool.query(
      'INSERT INTO books (id, title, author, hidden, type) VALUES ($1, $2, $3, true, $4)',
      [bookId, title, author, 'science']
    );

    await pool.query('DELETE FROM notifications WHERE id = $1', [notificationId]);

    return NextResponse.json({ success: true, bookId, title });
  } catch (e) {
    return serverError(e, 'admin approve-book POST');
  }
}
