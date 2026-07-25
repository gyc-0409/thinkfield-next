import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = await params;
  console.log('[API] 获取单个习题:', id);
  try {
    const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '习题不存在' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (e) {
    console.error('[API] 获取单个习题失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}