import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser, serverError } from '@/lib/auth';
import { findNodeTitle } from '@/lib/bookTree';

export async function GET(_request, { params }) {
  try {
    const { username: raw } = await params;
    const username = decodeURIComponent(raw || '').trim();
    if (!username || username === '[已删除]') {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const userResult = await pool.query(
      `SELECT username, university, role,
              certification_status, certification_school, certification_reject_reason
       FROM users WHERE username = $1`,
      [username]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const viewer = await getCurrentUser();
    const isSelf = viewer === username;
    const {
      role,
      university,
      certification_status: certStatus,
      certification_school: certSchool,
      certification_reject_reason: certRejectReason,
    } = userResult.rows[0];

    const discussionRows = await pool.query(
      `SELECT q.id, q.title, q.type, q.replies, q.page_range, q.book_id, q.node_id,
              b.title AS book_title, b.tree
       FROM questions q
       JOIN books b ON b.id = q.book_id
       WHERE q.author = $1 AND (b.hidden = false OR $2)
       ORDER BY q.sort_order DESC NULLS LAST, q.id DESC
       LIMIT 100`,
      [username, isSelf]
    );

    const discussions = discussionRows.rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      replies: row.replies || 0,
      pageRange: row.page_range || '',
      bookId: row.book_id,
      nodeId: row.node_id,
      bookTitle: row.book_title,
      sectionTitle: findNodeTitle(row.tree, row.node_id),
    }));

    const answerRows = await pool.query(
      `SELECT e.id AS exercise_id, e.title AS exercise_title, e.book_id, e.node_id,
              b.title AS book_title, b.tree,
              ans.elem AS answer
       FROM exercises e
       JOIN books b ON b.id = e.book_id
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.answers, '[]'::jsonb)) AS ans(elem)
       WHERE ans.elem->>'author' = $1 AND (b.hidden = false OR $2)
       ORDER BY e.id DESC
       LIMIT 100`,
      [username, isSelf]
    );

    const answers = answerRows.rows.map((row) => {
      const answer = row.answer || {};
      return {
        id: answer.id || null,
        exerciseId: row.exercise_id,
        exerciseTitle: row.exercise_title,
        likes: Number(answer.likes) || 0,
        bookId: row.book_id,
        nodeId: row.node_id,
        bookTitle: row.book_title,
        sectionTitle: findNodeTitle(row.tree, row.node_id),
      };
    });

    const discussionCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM questions q
       JOIN books b ON b.id = q.book_id
       WHERE q.author = $1 AND (b.hidden = false OR $2)`,
      [username, isSelf]
    );

    const answerCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM exercises e
       JOIN books b ON b.id = e.book_id
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.answers, '[]'::jsonb)) AS ans(elem)
       WHERE ans.elem->>'author' = $1 AND (b.hidden = false OR $2)`,
      [username, isSelf]
    );

    const bookCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM (
         SELECT q.book_id
         FROM questions q
         JOIN books b ON b.id = q.book_id
         WHERE q.author = $1 AND (b.hidden = false OR $2)
         UNION
         SELECT e.book_id
         FROM exercises e
         JOIN books b ON b.id = e.book_id
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.answers, '[]'::jsonb)) AS ans(elem)
         WHERE ans.elem->>'author' = $1 AND (b.hidden = false OR $2)
       ) t`,
      [username, isSelf]
    );

    const payload = {
      username,
      role: role || 'user',
      isSelf,
      certified: (certStatus || 'none') === 'approved',
      stats: {
        books: bookCountResult.rows[0]?.count || 0,
        discussions: discussionCountResult.rows[0]?.count || 0,
        answers: answerCountResult.rows[0]?.count || 0,
      },
      discussions,
      answers,
    };

    if (isSelf) {
      payload.university = university || '';
      payload.certificationStatus = certStatus || 'none';
      payload.certificationSchool = certSchool || '';
      payload.certificationRejectReason = certRejectReason || '';
      const booksResult = await pool.query(
        `SELECT DISTINCT b.id, b.title, b.author,
           (SELECT COUNT(*)::int FROM questions WHERE book_id = b.id) AS discussions
         FROM questions q
         JOIN books b ON b.id = q.book_id
         WHERE q.author = $1 AND b.hidden = false
         ORDER BY b.title`,
        [username]
      );
      payload.continueBooks = booksResult.rows;
    }

    return NextResponse.json(payload);
  } catch (e) {
    return serverError(e, 'users/[username] GET');
  }
}
