import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import pool from '@/lib/db';
import { serverError } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rateLimit';

const RESET_SENT_MESSAGE = '如果该邮箱已注册，验证码已发送';

async function sendResetCode(email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('邮件服务未配置');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  await pool.query(
    'INSERT INTO verification_codes (email, code, expiry) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET code = $2, expiry = $3',
    [email, code, expiry]
  );

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: '思辨场 <noreply@thinkfield.cn>',
    to: email,
    subject: '思辨场 - 重置密码验证码',
    html: `<div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif; background:#f9f9f9; border-radius:8px;">
      <h2 style="color:#2c3e50;">思辨场 - 重置密码</h2>
      <p style="font-size:16px;color:#333;">你的验证码是：</p>
      <div style="text-align:center;margin:30px 0;">
        <span style="font-size:32px;font-weight:bold;color:#3498db;letter-spacing:8px;">${code}</span>
      </div>
      <p style="font-size:14px;color:#777;">验证码5分钟内有效，请勿泄露。如非本人操作请忽略此邮件。</p>
    </div>`,
  });
}

export async function POST(request) {
  let email;
  try {
    const body = await request.json();
    email = (body.email || '').trim();
    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }

    const ip = clientIp(request);
    const byIp = rateLimit(`reset-password:ip:${ip}`, { windowMs: 60_000, max: 5 });
    if (!byIp.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(byIp.retryAfterSec) } }
      );
    }
    const byEmail = rateLimit(`reset-password:email:${email}`, { windowMs: 60_000, max: 1 });
    if (!byEmail.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(byEmail.retryAfterSec) } }
      );
    }
    const byEmailHour = rateLimit(`reset-password:email-hour:${email}`, {
      windowMs: 3_600_000,
      max: 5,
    });
    if (!byEmailHour.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(byEmailHour.retryAfterSec) } }
      );
    }

    const exist = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exist.rowCount > 0) {
      try {
        await sendResetCode(email);
      } catch (e) {
        console.error('[reset-password POST]', e?.message || e);
        await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]).catch(() => {});
        return NextResponse.json({ error: '验证码发送失败' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: RESET_SENT_MESSAGE });
  } catch (e) {
    return serverError(e, 'reset-password POST');
  }
}

export async function PUT(request) {
  let email;
  try {
    const body = await request.json();
    email = (body.email || '').trim();
    const { code, password } = body;

    if (!email || !code || !password) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '密码至少8位' }, { status: 400 });
    }

    const ip = clientIp(request);
    const limited = rateLimit(`reset-password:put:${ip}`, { windowMs: 60_000, max: 10 });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    const userResult = await pool.query('SELECT username FROM users WHERE email = $1', [email]);
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 });
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
    if (String(code).trim() !== storedCode) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email]);
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    return NextResponse.json({ success: true, message: '密码已重置，请用新密码登录' });
  } catch (e) {
    return serverError(e, 'reset-password PUT');
  }
}
