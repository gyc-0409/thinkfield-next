import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    return NextResponse.json({ success: true, time: rows[0].now });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}