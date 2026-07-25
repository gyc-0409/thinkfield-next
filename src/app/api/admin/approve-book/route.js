import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [user]);
  if (userRes.rowCount === 0 || userRes.rows[0].role !== 'admin') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  const { notificationId } = await request.json();
  if (!notificationId) return NextResponse.json({ error: '缺少通知ID' }, { status: 400 });

  // 获取通知
  const notif = await pool.query('SELECT * FROM notifications WHERE id = $1', [notificationId]);
  if (notif.rowCount === 0) return NextResponse.json({ error: '通知不存在' }, { status: 404 });

  const { message, recipient } = notif.rows[0];

  // 从消息中解析书名、作者、版本（格式固定）
  const match = message.match(/申请添加书籍《(.+?)》（作者：(.+?)，版本：(.+?)）/);
  if (!match) return NextResponse.json({ error: '消息格式无法解析' }, { status: 400 });

  const [, title, author, edition] = match;

  // 创建书籍
  const bookId = 'book-' + Date.now();
  await pool.query(
    'INSERT INTO books (id, title, author, hidden, type) VALUES ($1, $2, $3, true, $4)',
    [bookId, title, author, 'science']
  );

  // 标记通知已读（或删除）
  await pool.query('DELETE FROM notifications WHERE id = $1', [notificationId]);

  return NextResponse.json({ success: true, bookId, title });
}