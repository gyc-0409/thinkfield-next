import katex from 'katex';

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 将文本中的 LaTeX 公式 ($...$ 和 $$...$$) 渲染为 HTML，并保留字符级 span 用于截断点选择。
 * @param {string} text - 原始文本
 * @param {number} [cutAfterIdx] - 可选，在指定字符索引后截断并显示省略号
 * @returns {string} HTML 字符串
 */
export function renderLatexToHTML(text, cutAfterIdx) {
  if (!text) return '';

  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  let result = '';
  let lastIdx = 0;
  let match;

  while ((match = mathRegex.exec(text)) !== null) {
    // 处理公式前的普通文本
    const before = text.substring(lastIdx, match.index);
    for (let i = 0; i < before.length; i++) {
      const idx = lastIdx + i;
      // 截断检查
      if (cutAfterIdx !== undefined && idx >= cutAfterIdx) {
        result += '<span class="ellipsis-indicator">...</span>';
        return result;
      }
      const ch = before[i];
      if (ch === '\n') {
        result += '<br>';
      } else {
        result += `<span class="char-span" data-idx="${idx}">${escapeHtml(ch)}</span>`;
      }
    }

    // 处理公式
    const formula = match[0];
    const formulaIdx = match.index;
    if (cutAfterIdx !== undefined && formulaIdx >= cutAfterIdx) {
      result += '<span class="ellipsis-indicator">...</span>';
      return result;
    }

    try {
      // 判断是否为行内公式：$...$ 且不以 $$ 开头
      const isDisplay = formula.startsWith('$$') || formula.startsWith('\\[');
      const rendered = katex.renderToString(
        formula.replace(/^\$\$?|\$\$?$/g, '').replace(/^\\\[|\\\]$/g, ''),
        { displayMode: isDisplay, throwOnError: false }
      );
      result += `<span class="math-formula" data-idx="${formulaIdx}" data-length="${formula.length}" data-formula="${escapeHtml(formula)}">${rendered}</span>`;
    } catch (e) {
      // 渲染失败时回退为原始文本
      result += escapeHtml(formula);
    }

    lastIdx = match.index + formula.length;
  }

  // 处理剩余文本
  const after = text.substring(lastIdx);
  for (let i = 0; i < after.length; i++) {
    const idx = lastIdx + i;
    if (cutAfterIdx !== undefined && idx >= cutAfterIdx) {
      result += '<span class="ellipsis-indicator">...</span>';
      return result;
    }
    const ch = after[i];
    if (ch === '\n') {
      result += '<br>';
    } else {
      result += `<span class="char-span" data-idx="${idx}">${escapeHtml(ch)}</span>`;
    }
  }

  return result;
}