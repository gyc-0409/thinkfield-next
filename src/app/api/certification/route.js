import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, assertNotBanned, serverError } from '@/lib/auth';

const CODE_RE = /^[A-Za-z0-9]{12}$/;

export async function GET() {
  try {
    const username = await getCurrentUser();
    if (!username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT certification_status, certification_school, certification_reject_reason,
              certification_submitted_at, certification_reviewed_at
       FROM users WHERE username = $1`,
      [username]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      status: row.certification_status || 'none',
      school: row.certification_school || '',
      rejectReason: row.certification_reject_reason || '',
      submittedAt: row.certification_submitted_at,
      reviewedAt: row.certification_reviewed_at,
    });
  } catch (e) {
    return serverError(e, 'certification GET');
  }
}

export async function POST(request) {
  try {
    const username = await getCurrentUser();
    if (!username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    const banned = await assertNotBanned(username);
    if (banned) return banned;

    const body = await request.json();
    const agreed = !!body.agreed;
    const code = String(body.code || '').trim();

    if (!agreed) {
      return NextResponse.json({ error: '请先阅读并同意认证信息告知书' }, { status: 400 });
    }
    if (!CODE_RE.test(code)) {
      return NextResponse.json({ error: '请输入 12 位在线验证码（字母或数字）' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT certification_status FROM users WHERE username = $1',
      [username]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const status = result.rows[0].certification_status || 'none';
    if (status === 'pending') {
      return NextResponse.json({ error: '认证审核中，请耐心等待' }, { status: 400 });
    }
    if (status === 'approved') {
      return NextResponse.json({ error: '你已通过学生认证' }, { status: 400 });
    }

    await pool.query(
      `UPDATE users SET
         certification_status = 'pending',
         certification_code = $1,
         certification_agreed_at = NOW(),
         certification_submitted_at = NOW(),
         certification_school = NULL,
         certification_reject_reason = NULL,
         certification_reviewed_at = NULL,
         certification_reviewed_by = NULL
       WHERE username = $2`,
      [code.toUpperCase(), username]
    );

    return NextResponse.json({ success: true, status: 'pending' });
  } catch (e) {
    return serverError(e, 'certification POST');
  }
}
