import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { serverError } from '@/lib/auth';
import { formatQuestionTex, texResponse } from '@/lib/exportTex';
import {
  assertBookExportable,
  normalizeQuestionThoughts,
  loadQuestionCommentTrees,
  parseIncludeComments,
} from '@/lib/exportTexServer';

export async function GET(request, { params }) {
  try {
    const { id: questionId } = await params;
    const includeComments = parseIncludeComments(new URL(request.url).searchParams);

    const result = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '讨论不存在' }, { status: 404 });
    }
    const question = normalizeQuestionThoughts(result.rows[0]);
    const gate = await assertBookExportable(question.book_id);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const commentTrees = includeComments
      ? await loadQuestionCommentTrees(questionId, question.thoughts)
      : {};

    const tex = formatQuestionTex(question, commentTrees, { includeComments });
    const filename = `讨论_${question.title || questionId}.tex`;
    return texResponse(tex, filename);
  } catch (e) {
    return serverError(e, 'export/question GET');
  }
}
