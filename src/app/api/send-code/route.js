import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Resend } from 'resend';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '邮件服务未配置' }, { status: 500 });
  }

  let email;
  try {
    const body = await request.json();
    email = body.email;
    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }

    const ip = clientIp(request);
    const byIp = rateLimit(`send-code:ip:${ip}`, { windowMs: 60_000, max: 5 });
    if (!byIp.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(byIp.retryAfterSec) } }
      );
    }
    const byEmail = rateLimit(`send-code:email:${email}`, { windowMs: 60_000, max: 1 });
    if (!byEmail.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(byEmail.retryAfterSec) } }
      );
    }
    const byEmailHour = rateLimit(`send-code:email-hour:${email}`, {
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
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
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
      subject: '思辨场 - 验证码',
      html: `<div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif; background:#f9f9f9; border-radius:8px;">
        <h2 style="color:#2c3e50;">思辨场 - 邮箱验证码</h2>
        <p style="font-size:16px;color:#333;">你的验证码是：</p>
        <div style="text-align:center;margin:30px 0;">
          <span style="font-size:32px;font-weight:bold;color:#3498db;letter-spacing:8px;">${code}</span>
        </div>
        <p style="font-size:14px;color:#777;">验证码5分钟内有效，请勿泄露。</p>
      </div>`,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[send-code]', e?.message || e);
    if (email) {
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]).catch(() => {});
    }
    return NextResponse.json({ error: '验证码发送失败' }, { status: 500 });
  }
}
