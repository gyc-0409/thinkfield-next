import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const banned = await assertNotBanned(currentUser);
  if (banned) return banned;

  try {
    const {
      title,
      author,
      edition,
      publisher,
      isbn,
      translator,
      publishYear,
      type,
      tree,
    } = await request.json();

    if (!title?.trim() || !author?.trim() || !edition?.trim() || !publisher?.trim()) {
      return NextResponse.json({ error: '书名、作者、出版社、版本为必填' }, { status: 400 });
    }

    const bookMeta = {
      title: title.trim(),
      author: author.trim(),
      edition: edition.trim(),
      publisher: publisher.trim(),
      isbn: isbn?.trim() || '',
      translator: translator?.trim() || '',
      publishYear: publishYear?.trim() || '',
    };

    const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [currentUser]);
    const isAdmin = userRes.rows[0]?.role === 'admin';

    if (!isAdmin) {
      const detailParts = [
        `作者：${bookMeta.author}`,
        bookMeta.translator && `译者：${bookMeta.translator}`,
        `出版社：${bookMeta.publisher}`,
        `版本：${bookMeta.edition}`,
        bookMeta.publishYear && `出版年份：${bookMeta.publishYear}`,
        bookMeta.isbn && `ISBN：${bookMeta.isbn}`,
      ].filter(Boolean);

      const admins = await pool.query("SELECT username FROM users WHERE role = 'admin'");
      for (const admin of admins.rows) {
        await createNotification(
          admin.username,
          'book_request',
          `用户 ${currentUser} 申请添加书籍《${bookMeta.title}》（${detailParts.join('，')}）`,
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
      `INSERT INTO books (
        id, title, author, edition, publisher, isbn, translator, publish_year,
        hidden, type, tree
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)`,
      [
        id,
        bookMeta.title,
        bookMeta.author,
        bookMeta.edition,
        bookMeta.publisher,
        bookMeta.isbn,
        bookMeta.translator,
        bookMeta.publishYear,
        finalType,
        JSON.stringify(finalTree),
      ]
    );

    return NextResponse.json({ id, title: bookMeta.title, author: bookMeta.author, hidden: true, message: '书籍已创建' });
  } catch (e) {
    return serverError(e, 'books add POST');
  }
}
