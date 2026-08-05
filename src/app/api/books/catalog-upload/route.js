import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rateLimit';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '1392598786@qq.com';
const MAX_FILES = 5;
const MAX_FILE_BYTES = 520 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function buildBookSummary(fields) {
  const lines = [
    `书名：${fields.title}`,
    `作者：${fields.author}`,
    fields.translator && `译者：${fields.translator}`,
    `出版社：${fields.publisher}`,
    `版本：${fields.edition}`,
    fields.publishYear && `出版年份：${fields.publishYear}`,
    fields.isbn && `ISBN：${fields.isbn}`,
    `提交用户：${fields.username}`,
  ].filter(Boolean);
  return lines.join('\n');
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '邮件服务未配置' }, { status: 500 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const banned = await assertNotBanned(currentUser);
  if (banned) return banned;

  const roleRes = await pool.query('SELECT role FROM users WHERE username = $1', [currentUser]);
  if (roleRes.rows[0]?.role === 'admin') {
    return NextResponse.json({ error: '管理员无需上传目录图片' }, { status: 403 });
  }

  try {
    const ip = clientIp(request);
    const byIp = rateLimit(`catalog-upload:ip:${ip}`, { windowMs: 60_000, max: 3 });
    if (!byIp.allowed) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429, headers: { 'Retry-After': String(byIp.retryAfterSec) } }
      );
    }
    const byUser = rateLimit(`catalog-upload:user:${currentUser}`, { windowMs: 3_600_000, max: 10 });
    if (!byUser.allowed) {
      return NextResponse.json(
        { error: '今日上传次数已达上限' },
        { status: 429, headers: { 'Retry-After': String(byUser.retryAfterSec) } }
      );
    }

    const formData = await request.formData();
    const title = String(formData.get('title') || '').trim();
    const author = String(formData.get('author') || '').trim();
    if (!title || !author) {
      return NextResponse.json({ error: '缺少书籍信息' }, { status: 400 });
    }

    const files = formData.getAll('images').filter((f) => f && typeof f === 'object' && 'arrayBuffer' in f);
    if (files.length === 0) {
      return NextResponse.json({ error: '请至少选择一张图片' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `最多上传 ${MAX_FILES} 张图片` }, { status: 400 });
    }

    const attachments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = (file.type || '').toLowerCase();
      if (!ALLOWED_TYPES.has(type)) {
        return NextResponse.json({ error: '仅支持 JPG、PNG、WebP 图片' }, { status: 400 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `第 ${i + 1} 张图片超过大小限制` }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      attachments.push({
        filename: `catalog-${i + 1}.${ext}`,
        content: buffer,
      });
    }

    const bookFields = {
      title,
      author,
      translator: String(formData.get('translator') || '').trim(),
      publisher: String(formData.get('publisher') || '').trim(),
      edition: String(formData.get('edition') || '').trim(),
      publishYear: String(formData.get('publishYear') || '').trim(),
      isbn: String(formData.get('isbn') || '').trim(),
      username: currentUser,
    };

    const summary = buildBookSummary(bookFields);
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: '思辨场 <noreply@thinkfield.cn>',
      to: ADMIN_EMAIL,
      subject: `【目录图片】${title}`,
      text: `收到新的书籍目录图片补充材料：\n\n${summary}\n\n共 ${attachments.length} 张图片，请查看附件。`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2 style="color:#2c3e50;">书籍目录图片补充</h2>
        <pre style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap;font-size:14px;">${summary.replace(/</g, '&lt;')}</pre>
        <p>共 <strong>${attachments.length}</strong> 张图片，请查看邮件附件。</p>
      </div>`,
      attachments,
    });

    return NextResponse.json({ success: true, message: '目录图片已发送给管理员' });
  } catch (e) {
    return serverError(e, 'books/catalog-upload POST');
  }
}
