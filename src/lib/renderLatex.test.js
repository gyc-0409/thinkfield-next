import { describe, it, expect } from 'vitest';
import { renderLatexToHTML } from '@/lib/renderLatex';

describe('renderLatexToHTML', () => {
  it('returns empty string for falsy input', () => {
    expect(renderLatexToHTML('')).toBe('');
    expect(renderLatexToHTML(null)).toBe('');
  });

  it('escapes HTML in plain text', () => {
    const html = renderLatexToHTML('<script>alert(1)</script>');
    expect(html).toContain('&lt;');
    expect(html).not.toContain('<script>');
  });

  it('wraps characters in char-span elements', () => {
    const html = renderLatexToHTML('ab');
    expect(html).toContain('class="char-span"');
    expect(html).toContain('data-idx="0"');
    expect(html).toContain('data-idx="1"');
  });

  it('renders inline LaTeX as math-formula span', () => {
    const html = renderLatexToHTML('value $x^2$ end');
    expect(html).toContain('class="math-formula"');
    expect(html).toContain('data-formula=');
  });

  it('truncates after cutAfterIdx with ellipsis', () => {
    const html = renderLatexToHTML('abcdef', 3);
    expect(html).toContain('ellipsis-indicator');
    expect(html).not.toContain('data-idx="3"');
  });

  it('truncates without ellipsis when skipEllipsis is true', () => {
    const html = renderLatexToHTML('abcdef', 3, true);
    expect(html).not.toContain('ellipsis-indicator');
    expect(html).not.toContain('data-idx="3"');
  });
});
