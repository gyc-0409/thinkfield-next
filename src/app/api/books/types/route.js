import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query('SELECT DISTINCT type FROM books');
    const dbTypes = rows.map(r => r.type);
    
    // 始终包含文学和理学作为基础类型
    const baseTypes = ['literature', 'science'];
    const allTypes = [...new Set([...baseTypes, ...dbTypes])];
    
    return NextResponse.json(allTypes);
  } catch (e) {
    // 即使数据库查询失败，也返回基础类型
    return NextResponse.json(['literature', 'science']);
  }
}