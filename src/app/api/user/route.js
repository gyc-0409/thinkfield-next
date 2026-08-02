import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const username = await getCurrentUser();
    if (!username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    const result = await pool.query(
      'SELECT email, university, role, email_verified FROM users WHERE username = $1',
      [username]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }
    const { email, university, role, email_verified } = result.rows[0];
    return NextResponse.json({ username, email, university, role, email_verified });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
