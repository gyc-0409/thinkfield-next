import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const username = await getCurrentUser();
  if (!username) {
    return NextResponse.json([]);
  }
  try {
    // 查询该用户发表过问题或见解的书籍，去重并关联书籍信息，同时统计总讨论数
    const { rows } = await pool.query(
      `SELECT DISTINCT b.id, b.title, b.author,
         (SELECT COUNT(*) FROM questions WHERE book_id = b.id) as discussions
       FROM questions q
       JOIN books b ON b.id = q.book_id
       WHERE q.author = $1 AND b.hidden = false
       ORDER BY b.title`,
      [username]
    );
    return NextResponse.json(rows);
  } catch (e) {
    console.error('获取用户书籍失败:', e);
    return NextResponse.json([]);
  }
}