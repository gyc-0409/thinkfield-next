import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { role } = await pool.query('SELECT role FROM users WHERE username = $1', [user]).then(res => res.rows[0]);
  if (role !== 'admin') return NextResponse.json({ error: '权限不足，仅超级管理员可删除内容' }, { status: 403 });

  const { report_id } = await request.json();
  if (!report_id) return NextResponse.json({ error: '缺少举报ID' }, { status: 400 });

  const report = await pool.query('SELECT * FROM reports WHERE id = $1', [report_id]);
  if (report.rowCount === 0) return NextResponse.json({ error: '举报不存在' }, { status: 404 });
  const r = report.rows[0];

  // 根据类型删除内容
  if (r.content_type === 'question') {
    await pool.query('DELETE FROM questions WHERE id = $1', [r.content_id]);
  } else if (r.content_type === 'comment') {
    await pool.query('DELETE FROM comment_threads WHERE id = $1', [r.content_id]);
  } else if (r.content_type === 'answer' || r.content_type === 'continuation') {
    // 从 exercises 中移除解答或续写
    const exercises = await pool.query('SELECT id, answers FROM exercises');
    for (const ex of exercises.rows) {
      let answers = ex.answers || [];
      let updated = false;
      if (r.content_type === 'answer') {
        const idx = answers.findIndex(a => a.id === r.content_id);
        if (idx !== -1) {
          answers.splice(idx, 1);
          updated = true;
        }
      } else { // continuation
        for (const ans of answers) {
          if (removeContById(ans.continuations, r.content_id)) {
            updated = true;
            break;
          }
        }
      }
      if (updated) {
        await pool.query('UPDATE exercises SET answers = $1 WHERE id = $2', [JSON.stringify(answers), ex.id]);
        break;
      }
    }
  }

  await pool.query("UPDATE reports SET status = 'deleted', handled_by = $1, handled_at = NOW() WHERE id = $2", [user, report_id]);
  return NextResponse.json({ success: true, message: '内容已删除' });
}

function removeContById(continuations, id) {
  if (!continuations) return false;
  for (let i = 0; i < continuations.length; i++) {
    if (continuations[i].id === id) {
      continuations.splice(i, 1);
      return true;
    }
    if (continuations[i].continuations && removeContById(continuations[i].continuations, id)) return true;
  }
  return false;
}