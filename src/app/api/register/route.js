import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { login, serverError } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export async function POST(request) {
  const ip = clientIp(request);
  const limited = rateLimit(`register:${ip}`, { windowMs: 60_000, max: 10 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: '请求过于频繁' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const { username, password, email, university, code } = await request.json();
    if (!username || !password || !email || !university || !code) {
      return NextResponse.json({ error: '所有字段不能为空' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '密码至少8位' }, { status: 400 });
    }

    const exists = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (exists.rowCount > 0) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }
    const emailExists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (emailExists.rowCount > 0) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }
    const codeResult = await pool.query(
      'SELECT code, expiry FROM verification_codes WHERE email = $1',
      [email]
    );
    if (codeResult.rowCount === 0) {
      return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    }
    const { code: storedCode, expiry } = codeResult.rows[0];
    if (new Date() > new Date(expiry)) {
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);
      return NextResponse.json({ error: '验证码已过期' }, { status: 400 });
    }
    if (code !== storedCode) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, email, university, role, email_verified) VALUES ($1, $2, $3, $4, $5, $6)',
      [username, passwordHash, email, university, 'user', true]
    );
    await login(username);
    return NextResponse.json({ success: true, username });
  } catch (error) {
    return serverError(error, 'register');
  }
}
