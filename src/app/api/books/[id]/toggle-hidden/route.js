import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const userRes = await pool.query('SELECT role FROM users WHERE username = $1', [user]);
  if (userRes.rowCount === 0 || userRes.rows[0].role !== 'admin') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  const { id: bookId } = await params;
  const result = await pool.query('SELECT hidden FROM books WHERE id = $1', [bookId]);
  if (result.rowCount === 0) return NextResponse.json({ error: '书籍不存在' }, { status: 404 });

  const newHidden = !result.rows[0].hidden;
  await pool.query('UPDATE books SET hidden = $1 WHERE id = $2', [newHidden, bookId]);
  return NextResponse.json({ success: true, hidden: newHidden });
}