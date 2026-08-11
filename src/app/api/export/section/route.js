import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { serverError } from '@/lib/auth';
import { formatSectionTex, texResponse } from '@/lib/exportTex';
import {
  assertBookExportable,
  normalizeQuestionThoughts,
  loadQuestionCommentTrees,
  loadExerciseCommentTrees,
  parseIncludeComments,
  parseScope,
} from '@/lib/exportTexServer';

function findNodeTitle(tree, nodeId) {
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (n.id === nodeId) return n.title || nodeId;
      const child = walk(n.children);
      if (child) return child;
    }
    return null;
  };
  return walk(tree) || nodeId;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const nodeId = searchParams.get('nodeId');
    if (!bookId || !nodeId) {
      return NextResponse.json({ error: '缺少 bookId 或 nodeId' }, { status: 400 });
    }

    const includeComments = parseIncludeComments(searchParams);
    const scope = parseScope(searchParams);

    const gate = await assertBookExportable(bookId);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const book = gate.book;
    const sectionTitle = findNodeTitle(book.tree || [], nodeId);

    let questions = [];
    let exercises = [];
    const questionComments = {};
    const exerciseComments = {};

    if (scope === 'all' || scope === 'discussions') {
      const qRes = await pool.query(
        'SELECT * FROM questions WHERE book_id = $1 AND node_id = $2 ORDER BY sort_order ASC, id DESC',
        [bookId, nodeId]
      );
      questions = qRes.rows.map(normalizeQuestionThoughts);
      if (includeComments) {
        for (const q of questions) {
          questionComments[q.id] = await loadQuestionCommentTrees(q.id, q.thoughts);
        }
      }
    }

    if (scope === 'all' || scope === 'exercises') {
      const eRes = await pool.query(
        'SELECT * FROM exercises WHERE book_id = $1 AND node_id = $2 ORDER BY id ASC',
        [bookId, nodeId]
      );
      exercises = eRes.rows;
      if (includeComments) {
        for (const ex of exercises) {
          const answers = Array.isArray(ex.answers) ? ex.answers : [];
          exerciseComments[ex.id] = await loadExerciseCommentTrees(ex.id, answers);
        }
      }
    }

    // tree may not be selected - need full book for tree
    const fullBook = await pool.query('SELECT title, tree FROM books WHERE id = $1', [bookId]);
    const bookTitle = fullBook.rows[0]?.title || book.title;
    const tree = fullBook.rows[0]?.tree || [];
    const resolvedSectionTitle = findNodeTitle(tree, nodeId);

    const tex = formatSectionTex({
      bookTitle,
      sectionTitle: resolvedSectionTitle || sectionTitle,
      questions,
      exercises,
      questionComments,
      exerciseComments,
      scope,
      includeComments,
    });

    const filename = `小节_${resolvedSectionTitle || nodeId}.tex`;
    return texResponse(tex, filename);
  } catch (e) {
    return serverError(e, 'export/section GET');
  }
}
