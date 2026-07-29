import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '习题不存在' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}