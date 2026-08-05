import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';
import { findDuplicateRequest } from '@/lib/bookRequests';

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
      const duplicate = await findDuplicateRequest(currentUser, bookMeta.title);
      if (duplicate) {
        if (duplicate.status === 'pending') {
          return NextResponse.json({ error: '该书已有审核中的申请，请勿重复提交' }, { status: 409 });
        }
        return NextResponse.json({ error: '该书申请已通过，无需重复提交' }, { status: 409 });
      }

      const insert = await pool.query(
        `INSERT INTO book_requests (
          username, title, author, translator, publisher, edition, publish_year, isbn
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          currentUser,
          bookMeta.title,
          bookMeta.author,
          bookMeta.translator,
          bookMeta.publisher,
          bookMeta.edition,
          bookMeta.publishYear,
          bookMeta.isbn,
        ]
      );

      return NextResponse.json({
        success: true,
        requestId: insert.rows[0].id,
        message: '申请已提交，可在个人主页查看审核进度。',
      });
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
    if (e.code === '23505') {
      return NextResponse.json({ error: '该书已有审核中的申请，请勿重复提交' }, { status: 409 });
    }
    return serverError(e, 'books/add POST');
  }
}
