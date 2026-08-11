import { describe, it, expect } from 'vitest';
import { escapeTexPlain, toTexBody, formatQuestionTex, formatExerciseTex } from '@/lib/exportTex';

describe('exportTex', () => {
  it('escapes special characters outside math', () => {
    expect(escapeTexPlain('a_b % c')).toContain('\\_');
    expect(escapeTexPlain('a_b % c')).toContain('\\%');
  });

  it('preserves inline math', () => {
    const out = toTexBody('导数 $f\'(x)$ 很好');
    expect(out).toContain("$f'(x)$");
    expect(out).toContain('导数');
  });

  it('formats a question document', () => {
    const tex = formatQuestionTex(
      {
        title: '测试问题',
        author: 'Alice',
        type: 'question',
        thoughts: [{ id: 't1', author: 'Alice', content: '思考内容 $x^2$' }],
      },
      {},
      { includeComments: false }
    );
    expect(tex).toContain('\\documentclass');
    expect(tex).toContain('测试问题');
    expect(tex).toContain('$x^2$');
  });

  it('includes continuations in exercise export', () => {
    const tex = formatExerciseTex(
      {
        title: '习题一',
        content: '题干',
        answers: [
          {
            id: 'a1',
            author: 'Bob',
            overallThought: '思路',
            content: '解答正文结束。',
            continuations: [
              {
                id: 'c1',
                start: 4,
                motivation: '补证明',
                author: 'Carol',
                content: '续写内容',
                continuations: [],
              },
            ],
          },
        ],
      },
      {},
      { includeComments: false }
    );
    expect(tex).toContain('续写动机');
    expect(tex).toContain('续写内容');
    expect(tex).toContain('含续写');
  });
});
