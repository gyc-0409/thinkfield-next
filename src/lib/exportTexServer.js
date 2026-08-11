import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { buildCommentTree } from '@/lib/exportTex';

export async function assertBookExportable(bookId) {
  const bookRes = await pool.query(
    'SELECT id, title, hidden, type FROM books WHERE id = $1',
    [bookId]
  );
  if (bookRes.rowCount === 0) {
    return { error: '书籍不存在', status: 404 };
  }
  const book = bookRes.rows[0];
  if (book.hidden) {
    const user = await getCurrentUser();
    if (!user) return { error: '书籍未公开', status: 403 };
    const roleRes = await pool.query('SELECT role FROM users WHERE username = $1', [user]);
    if (roleRes.rows[0]?.role !== 'admin') {
      return { error: '书籍未公开', status: 403 };
    }
  }
  return { book };
}

export function normalizeQuestionThoughts(question) {
  if (!question.thoughts || question.thoughts.length === 0) {
    if (question.thought) {
      question.thoughts = [{
        id: question.id + '-thought-0',
        author: question.author,
        content: question.thought,
      }];
    } else {
      question.thoughts = [];
    }
  }
  return question;
}

export async function loadQuestionCommentTrees(questionId, thoughts) {
  const map = {};
  for (const t of thoughts || []) {
    if (!t?.id) continue;
    const { rows } = await pool.query(
      'SELECT * FROM comment_threads WHERE question_id = $1 AND thought_id = $2 ORDER BY created_at ASC',
      [questionId, t.id]
    );
    map[t.id] = buildCommentTree(rows);
  }
  return map;
}

export async function loadExerciseCommentTrees(exerciseId, answers) {
  const map = {};
  for (const a of answers || []) {
    if (!a?.id) continue;
    const { rows } = await pool.query(
      'SELECT * FROM exercise_comments WHERE exercise_id = $1 AND answer_id = $2 ORDER BY created_at ASC',
      [exerciseId, a.id]
    );
    map[a.id] = buildCommentTree(rows);
  }
  return map;
}

export function parseIncludeComments(searchParams) {
  const v = searchParams.get('includeComments');
  return v === '1' || v === 'true' || v === 'yes';
}

export function parseScope(searchParams) {
  const scope = searchParams.get('scope') || 'all';
  if (['all', 'discussions', 'exercises'].includes(scope)) return scope;
  return 'all';
}
