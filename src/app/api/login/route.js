import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { login, serverError } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export async function POST(request) {
  const ip = clientIp(request);
  const limited = rateLimit(`login:${ip}`, { windowMs: 60_000, max: 10 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: '请求过于频繁' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    const isEmail = username.includes('@');
    let result;
    if (isEmail) {
      result = await pool.query(
        'SELECT username, password_hash, banned FROM users WHERE email = $1',
        [username]
      );
    } else {
      result = await pool.query(
        'SELECT username, password_hash, banned FROM users WHERE username = $1',
        [username]
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json({ error: '用户名或邮箱错误' }, { status: 400 });
    }

    const { username: realUsername, password_hash, banned } = result.rows[0];
    if (banned) {
      return NextResponse.json({ error: '账号已被禁言' }, { status: 403 });
    }

    const match = await bcrypt.compare(password, password_hash);
    if (!match) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 400 });
    }

    await login(realUsername);
    return NextResponse.json({ success: true, username: realUsername });
  } catch (error) {
    return serverError(error, 'login');
  }
}
