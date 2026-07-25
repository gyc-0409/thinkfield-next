import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { title, author, edition, type, tree } = await request.json();
  if (!title || !author || !edition) {
    return NextResponse.json({ error: '缺少字段' }, { status: 400 });
  }

  const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [currentUser]);
  const isAdmin = userRes.rows[0]?.role === 'admin';

  if (!isAdmin) {
    const admins = await pool.query("SELECT username FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      await createNotification(
        admin.username,
        'book_request',
        `用户 ${currentUser} 申请添加书籍《${title}》（作者：${author}，版本：${edition}）`,
        null,
        'book_request'
      );
    }
    return NextResponse.json({ success: true, message: '申请已提交，管理员会尽快处理。' });
  }

  const id = 'book-' + Date.now();
  const finalType = type || 'science';
  const finalTree = Array.isArray(tree) ? tree : [];

  await pool.query(
    'INSERT INTO books (id, title, author, hidden, type, tree) VALUES ($1, $2, $3, true, $4, $5)',
    [id, title, author, finalType, JSON.stringify(finalTree)]
  );

  return NextResponse.json({ id, title, author, hidden: true, message: '书籍已创建' });
}