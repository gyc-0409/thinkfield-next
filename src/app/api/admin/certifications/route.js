import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  const res = await pool.query('SELECT role FROM users WHERE username = $1', [user]);
  if (res.rowCount === 0 || res.rows[0].role !== 'admin') {
    return { error: NextResponse.json({ error: '权限不足' }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const result = await pool.query(
      `SELECT username, certification_status, certification_school, certification_code,
              certification_submitted_at, certification_reviewed_at, certification_reviewed_by,
              certification_reject_reason
       FROM users
       WHERE certification_status IN ('pending', 'approved', 'rejected')
       ORDER BY
         CASE certification_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
         certification_submitted_at DESC NULLS LAST`
    );

    const list = result.rows.map((row) => ({
      username: row.username,
      status: row.certification_status,
      school: row.certification_school || '',
      // 仅待审返回验证码，供人工核验
      code: row.certification_status === 'pending' ? (row.certification_code || '') : undefined,
      submittedAt: row.certification_submitted_at,
      reviewedAt: row.certification_reviewed_at,
      reviewedBy: row.certification_reviewed_by || '',
      rejectReason: row.certification_reject_reason || '',
    }));

    return NextResponse.json(list);
  } catch (e) {
    return serverError(e, 'admin certifications GET');
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const username = String(body.username || '').trim();
    const action = body.action;
    const school = String(body.school || '').trim();
    const reason = String(body.reason || '').trim();

    if (!username) {
      return NextResponse.json({ error: '缺少用户名' }, { status: 400 });
    }
    if (!['approve', 'reject', 'revoke'].includes(action)) {
      return NextResponse.json({ error: '无效操作' }, { status: 400 });
    }
    if (action === 'approve' && !school) {
      return NextResponse.json({ error: '通过认证需填写学校名称' }, { status: 400 });
    }

    const target = await pool.query(
      'SELECT certification_status FROM users WHERE username = $1',
      [username]
    );
    if (target.rowCount === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (action === 'approve') {
      await pool.query(
        `UPDATE users SET
           certification_status = 'approved',
           certification_school = $1,
           certification_code = NULL,
           certification_reject_reason = NULL,
           certification_reviewed_at = NOW(),
           certification_reviewed_by = $2
         WHERE username = $3`,
        [school, auth.user, username]
      );
    } else if (action === 'reject') {
      await pool.query(
        `UPDATE users SET
           certification_status = 'rejected',
           certification_school = NULL,
           certification_code = NULL,
           certification_reject_reason = $1,
           certification_reviewed_at = NOW(),
           certification_reviewed_by = $2
         WHERE username = $3`,
        [reason || '未通过审核', auth.user, username]
      );
    } else {
      // revoke
      await pool.query(
        `UPDATE users SET
           certification_status = 'none',
           certification_school = NULL,
           certification_code = NULL,
           certification_reject_reason = NULL,
           certification_agreed_at = NULL,
           certification_submitted_at = NULL,
           certification_reviewed_at = NOW(),
           certification_reviewed_by = $1
         WHERE username = $2`,
        [auth.user, username]
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return serverError(e, 'admin certifications PUT');
  }
}
