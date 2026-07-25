import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  let query = 'SELECT * FROM notifications WHERE recipient = $1';
  const params = [user];

  if (type !== 'all') {
    query += ' AND type = $2';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  try {
    const { rows } = await pool.query(query, params);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}