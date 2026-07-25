import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { login } from '@/lib/auth';

export async function POST(request) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
  }

  try {
    // 判断输入是否为邮箱
    const isEmail = username.includes('@');
    let result;
    if (isEmail) {
      result = await pool.query('SELECT username, password_hash FROM users WHERE email = $1', [username]);
    } else {
      result = await pool.query('SELECT username, password_hash FROM users WHERE username = $1', [username]);
    }

    if (result.rowCount === 0) {
      return NextResponse.json({ error: '用户名或邮箱错误' }, { status: 400 });
    }

    const { username: realUsername, password_hash } = result.rows[0];
    const match = await bcrypt.compare(password, password_hash);
    if (!match) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 400 });
    }

    await login(realUsername);
    return NextResponse.json({ success: true, username: realUsername });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}