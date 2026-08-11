/**
 * 将站内富文本（含 $...$ / $$...$$）转为可编译的 LaTeX 片段与完整文档。
 */

const MATH_RE = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;

/** 转义非数学模式下的 TeX 特殊字符 */
export function escapeTexPlain(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([{}])/g, '\\$1')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/** 正文：保留已有公式，其余转义 */
export function toTexBody(text) {
  const raw = String(text ?? '');
  if (!raw) return '';
  const parts = raw.split(MATH_RE);
  return parts
    .map((part, i) => {
      if (!part) return '';
      if (i % 2 === 1) return part; // math
      return escapeTexPlain(part);
    })
    .join('');
}

function sectionHeading(title, level = 1) {
  const cmd = level <= 1 ? 'section' : level === 2 ? 'subsection' : 'subsubsection';
  return `\\${cmd}*{${escapeTexPlain(title)}}\n`;
}

function metaLine(label, value) {
  if (value == null || value === '') return '';
  return `\\noindent\\textbf{${escapeTexPlain(label)}：}${toTexBody(String(value))}\\\\\n`;
}

function formatCommentTree(nodes, depth = 0) {
  if (!Array.isArray(nodes) || nodes.length === 0) return '';
  let out = '';
  for (const node of nodes) {
    const indent = '  '.repeat(depth);
    const author = escapeTexPlain(node.author || '匿名');
    const quote = node.quote_text
      ? `${indent}\\textit{引用：${toTexBody(node.quote_text)}}\\\\\n`
      : '';
    out += `${indent}\\paragraph{${author}}\n${quote}${indent}${toTexBody(node.content)}\n\n`;
    if (node.children?.length) {
      out += formatCommentTree(node.children, depth + 1);
    }
  }
  return out;
}

function formatContinuations(continuations, depth = 0) {
  if (!Array.isArray(continuations) || continuations.length === 0) return '';
  let out = '';
  for (const cont of continuations) {
    const label = depth === 0 ? '续写' : `续写（第 ${depth + 1} 层）`;
    out += `\\subsubsection*{${escapeTexPlain(label)} · ${escapeTexPlain(cont.author || '')}}\n`;
    if (cont.motivation) {
      out += `\\noindent\\textbf{续写动机：}${toTexBody(cont.motivation)}\n\n`;
    }
    if (typeof cont.start === 'number') {
      out += `\\noindent\\textit{截断位置：第 ${cont.start} 字符处}\n\n`;
    }
    out += `${toTexBody(cont.content)}\n\n`;
    if (cont.continuations?.length) {
      out += formatContinuations(cont.continuations, depth + 1);
    }
  }
  return out;
}

export function wrapDocument({ title, metaLines = [], body }) {
  const meta = metaLines.filter(Boolean).join('');
  return `% !TEX program = xelatex
\\documentclass[12pt]{article}
\\usepackage[UTF8]{ctex}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{geometry}
\\usepackage{hyperref}
\\geometry{margin=2.5cm}
\\title{${escapeTexPlain(title)}}
\\author{思辨场导出}
\\date{\\today}
\\begin{document}
\\maketitle
${meta}
${body}
\\end{document}
`;
}

/**
 * @param {object} question
 * @param {Array} commentTreesByThoughtId - map thoughtId -> tree roots
 * @param {{ includeComments?: boolean }} options
 */
export function formatQuestionTex(question, commentTreesByThoughtId = {}, options = {}) {
  const { includeComments = false } = options;
  let body = '';
  body += sectionHeading(question.title || '讨论', 1);
  body += metaLine('类型', question.type === 'question' ? '提问' : '见解');
  body += metaLine('作者', question.author);
  body += metaLine('位置', question.location);
  body += metaLine('页码', question.page_range);
  body += '\n';

  const thoughts = Array.isArray(question.thoughts) ? question.thoughts : [];
  if (thoughts.length === 0 && question.thought) {
    thoughts.push({ author: question.author, content: question.thought });
  }

  thoughts.forEach((t, i) => {
    body += sectionHeading(`思考 ${i + 1}${t.author ? `（${t.author}）` : ''}`, 2);
    body += `${toTexBody(t.content)}\n\n`;
    if (includeComments) {
      const tree = commentTreesByThoughtId[t.id] || [];
      if (tree.length) {
        body += sectionHeading('追问与讨论', 3);
        body += formatCommentTree(tree);
      }
    }
  });

  return wrapDocument({
    title: question.title || '讨论导出',
    metaLines: [
      metaLine('导出范围', '单条讨论'),
      metaLine('含评论', includeComments ? '是' : '否'),
    ],
    body,
  });
}

/**
 * @param {object} exercise
 * @param {Record<string, Array>} commentsByAnswerId
 * @param {{ includeComments?: boolean }} options
 */
export function formatExerciseTex(exercise, commentsByAnswerId = {}, options = {}) {
  const { includeComments = false } = options;
  let body = '';
  body += sectionHeading(exercise.title || '习题', 1);
  body += metaLine('作者', exercise.author);
  if (exercise.content) {
    body += sectionHeading('题干', 2);
    body += `${toTexBody(exercise.content)}\n\n`;
  }

  const answers = Array.isArray(exercise.answers) ? exercise.answers : [];
  if (answers.length === 0) {
    body += '\\textit{（暂无解答）}\n\n';
  }

  answers.forEach((ans, i) => {
    body += sectionHeading(`解答 ${i + 1}${ans.author ? `（${ans.author}）` : ''}`, 2);
    if (ans.overallThought) {
      body += `\\noindent\\textbf{总体思路：}${toTexBody(ans.overallThought)}\n\n`;
    }
    body += `${toTexBody(ans.content)}\n\n`;
    if (ans.continuations?.length) {
      body += sectionHeading('续写', 3);
      body += formatContinuations(ans.continuations);
    }
    if (includeComments) {
      const tree = commentsByAnswerId[ans.id] || [];
      if (tree.length) {
        body += sectionHeading('评论', 3);
        body += formatCommentTree(tree);
      }
    }
  });

  return wrapDocument({
    title: exercise.title || '习题导出',
    metaLines: [
      metaLine('导出范围', '单道习题'),
      metaLine('含评论', includeComments ? '是' : '否'),
      metaLine('含续写', '是'),
    ],
    body,
  });
}

/**
 * @param {{ bookTitle: string, sectionTitle: string, questions: object[], exercises: object[],
 *   questionComments: Record<string, Record<string, Array>>,
 *   exerciseComments: Record<string, Record<string, Array>>,
 *   scope: 'all'|'discussions'|'exercises', includeComments: boolean }} data
 */
export function formatSectionTex(data) {
  const {
    bookTitle,
    sectionTitle,
    questions = [],
    exercises = [],
    questionComments = {},
    exerciseComments = {},
    scope = 'all',
    includeComments = false,
  } = data;

  let body = '';
  body += sectionHeading(sectionTitle || '小节', 1);
  body += metaLine('所属书籍', bookTitle);

  const wantDisc = scope === 'all' || scope === 'discussions';
  const wantEx = scope === 'all' || scope === 'exercises';

  if (wantDisc) {
    body += sectionHeading('讨论区', 2);
    if (questions.length === 0) {
      body += '\\textit{（暂无讨论）}\n\n';
    }
    questions.forEach((q, qi) => {
      body += sectionHeading(`${qi + 1}. ${q.title || '讨论'}`, 3);
      body += metaLine('作者', q.author);
      body += metaLine('位置', q.location);
      const thoughts = Array.isArray(q.thoughts) ? q.thoughts : [];
      thoughts.forEach((t, ti) => {
        body += `\\paragraph{思考 ${ti + 1}${t.author ? ` · ${escapeTexPlain(t.author)}` : ''}}\n`;
        body += `${toTexBody(t.content)}\n\n`;
        if (includeComments) {
          const tree = questionComments[q.id]?.[t.id] || [];
          if (tree.length) {
            body += '\\textbf{追问与讨论}\\\\\n';
            body += formatCommentTree(tree);
          }
        }
      });
    });
  }

  if (wantEx) {
    body += sectionHeading('习题区', 2);
    if (exercises.length === 0) {
      body += '\\textit{（暂无习题）}\n\n';
    }
    exercises.forEach((ex, ei) => {
      body += sectionHeading(`${ei + 1}. ${ex.title || '习题'}`, 3);
      if (ex.content) body += `${toTexBody(ex.content)}\n\n`;
      const answers = Array.isArray(ex.answers) ? ex.answers : [];
      answers.forEach((ans, ai) => {
        body += `\\paragraph{解答 ${ai + 1}${ans.author ? ` · ${escapeTexPlain(ans.author)}` : ''}}\n`;
        if (ans.overallThought) {
          body += `\\textbf{总体思路：}${toTexBody(ans.overallThought)}\n\n`;
        }
        body += `${toTexBody(ans.content)}\n\n`;
        if (ans.continuations?.length) {
          body += formatContinuations(ans.continuations);
        }
        if (includeComments) {
          const tree = exerciseComments[ex.id]?.[ans.id] || [];
          if (tree.length) {
            body += '\\textbf{评论}\\\\\n';
            body += formatCommentTree(tree);
          }
        }
      });
    });
  }

  const scopeLabel =
    scope === 'discussions' ? '本小节·仅讨论' : scope === 'exercises' ? '本小节·仅习题' : '本小节·讨论+习题';

  return wrapDocument({
    title: `${bookTitle || ''} · ${sectionTitle || '小节'}`,
    metaLines: [
      metaLine('导出范围', scopeLabel),
      metaLine('含评论', includeComments ? '是' : '否'),
      metaLine('含续写', wantEx ? '是' : '—'),
    ],
    body,
  });
}

export function texResponse(tex, filename) {
  const safeName = String(filename || 'export.tex').replace(/[^\w\u4e00-\u9fff.\-]+/g, '_');
  return new Response(tex, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-tex; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      'Cache-Control': 'no-store',
    },
  });
}

export function buildCommentTree(rows) {
  const map = {};
  const roots = [];
  (rows || []).forEach((row) => {
    map[row.id] = { ...row, children: [] };
  });
  (rows || []).forEach((row) => {
    if (row.parent_id && map[row.parent_id]) {
      map[row.parent_id].children.push(map[row.id]);
    } else {
      roots.push(map[row.id]);
    }
  });
  return roots;
}
