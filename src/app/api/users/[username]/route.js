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

    const thoughtRows = await pool.query(
      `SELECT q.id AS question_id, q.title AS question_title, q.book_id, q.node_id,
              b.title AS book_title, b.tree,
              t.elem AS thought
       FROM questions q
       JOIN books b ON b.id = q.book_id
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(q.thoughts, '[]'::jsonb)) AS t(elem)
       WHERE t.elem->>'author' = $1 AND (b.hidden = false OR $2)
       ORDER BY COALESCE(t.elem->>'created_at', '') DESC, q.id DESC
       LIMIT 100`,
      [username, isSelf]
    );

    const thoughts = thoughtRows.rows.map((row) => {
      const thought = row.thought || {};
      const content = typeof thought.content === 'string' ? thought.content : '';
      return {
        id: thought.id || null,
        questionId: row.question_id,
        questionTitle: row.question_title,
        contentPreview: content.length > 80 ? `${content.slice(0, 80)}…` : content,
        likes: Number(thought.likes) || 0,
        bookId: row.book_id,
        nodeId: row.node_id,
        bookTitle: row.book_title,
        sectionTitle: findNodeTitle(row.tree, row.node_id),
      };
    });

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

    const thoughtCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM questions q
       JOIN books b ON b.id = q.book_id
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(q.thoughts, '[]'::jsonb)) AS t(elem)
       WHERE t.elem->>'author' = $1 AND (b.hidden = false OR $2)`,
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
         UNION
         SELECT q.book_id
         FROM questions q
         JOIN books b ON b.id = q.book_id
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(q.thoughts, '[]'::jsonb)) AS t(elem)
         WHERE t.elem->>'author' = $1 AND (b.hidden = false OR $2)
       ) t`,
      [username, isSelf]
    );

    // 获赞总数：思考 + 解答 + 续写 + 评论
    const thoughtLikesResult = await pool.query(
      `SELECT COALESCE(SUM(COALESCE((t.elem->>'likes')::int, 0)), 0)::int AS total
       FROM questions q
       JOIN books b ON b.id = q.book_id
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(q.thoughts, '[]'::jsonb)) AS t(elem)
       WHERE t.elem->>'author' = $1 AND (b.hidden = false OR $2)`,
      [username, isSelf]
    );

    const answerLikesResult = await pool.query(
      `SELECT COALESCE(SUM(COALESCE((ans.elem->>'likes')::int, 0)), 0)::int AS total
       FROM exercises e
       JOIN books b ON b.id = e.book_id
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.answers, '[]'::jsonb)) AS ans(elem)
       WHERE ans.elem->>'author' = $1 AND (b.hidden = false OR $2)`,
      [username, isSelf]
    );

    const continuationLikesResult = await pool.query(
      `WITH RECURSIVE cont_tree AS (
         SELECT c.elem AS node
         FROM exercises e
         JOIN books b ON b.id = e.book_id
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.answers, '[]'::jsonb)) AS ans(elem)
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ans.elem->'continuations', '[]'::jsonb)) AS c(elem)
         WHERE (b.hidden = false OR $2)
         UNION ALL
         SELECT c2.elem
         FROM cont_tree
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(cont_tree.node->'continuations', '[]'::jsonb)) AS c2(elem)
       )
       SELECT COALESCE(SUM(COALESCE((node->>'likes')::int, 0)), 0)::int AS total
       FROM cont_tree
       WHERE node->>'author' = $1`,
      [username, isSelf]
    );

    let commentLikes = 0;
    try {
      const threadLikes = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(likes, 0)), 0)::int AS total
         FROM comment_threads WHERE author = $1`,
        [username]
      );
      commentLikes += threadLikes.rows[0]?.total || 0;
    } catch {
      /* likes 列可能不存在，忽略 */
    }
    try {
      const exCommentLikes = await pool.query(
        `SELECT COALESCE(SUM(COALESCE(likes, 0)), 0)::int AS total
         FROM exercise_comments WHERE author = $1`,
        [username]
      );
      commentLikes += exCommentLikes.rows[0]?.total || 0;
    } catch {
      /* ignore */
    }

    const likesTotal =
      (thoughtLikesResult.rows[0]?.total || 0) +
      (answerLikesResult.rows[0]?.total || 0) +
      (continuationLikesResult.rows[0]?.total || 0) +
      commentLikes;

    const payload = {
      username,
      role: role || 'user',
      isSelf,
      certified: (certStatus || 'none') === 'approved',
      stats: {
        books: bookCountResult.rows[0]?.count || 0,
        discussions: discussionCountResult.rows[0]?.count || 0,
        thoughts: thoughtCountResult.rows[0]?.count || 0,
        answers: answerCountResult.rows[0]?.count || 0,
        likes: likesTotal,
      },
      discussions,
      thoughts,
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
