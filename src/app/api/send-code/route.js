import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Resend } from 'resend';

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '邮件服务未配置' }, { status: 500 });
  }

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
  }

  try {
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
      </div>`
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (email) {
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]).catch(() => {});
    }
    return NextResponse.json({ error: '验证码发送失败' }, { status: 500 });
  }
}
