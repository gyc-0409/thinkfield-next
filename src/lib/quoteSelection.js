/**
 * 从右键/选区解析引用范围，逻辑与提问区 ThoughtCard 一致。
 * 支持：纯文字、纯公式、文字+公式混合选区。
 *
 * @param {MouseEvent} e
 * @param {HTMLElement} containerEl 渲染后的内容容器
 * @param {string} sourceContent 原始源文本（含 $...$）
 * @returns {{ quoteText: string, start: number, end: number } | null}
 */
export function resolveContextMenuQuote(e, containerEl, sourceContent) {
  if (!containerEl || typeof sourceContent !== 'string') return null;

  const selection = window.getSelection();
  const formulaSpan = e.target.closest?.('.math-formula');

  // 情况1：右键直接点在公式上，且无有效选区
  if (formulaSpan && containerEl.contains(formulaSpan) && (!selection?.rangeCount || selection.isCollapsed)) {
    const formulaText = formulaSpan.getAttribute('data-formula');
    const idx = parseInt(formulaSpan.getAttribute('data-idx'), 10);
    const len = parseInt(formulaSpan.getAttribute('data-length'), 10);
    if (!isNaN(idx) && len) {
      return { quoteText: formulaText || sourceContent.substring(idx, idx + len), start: idx, end: idx + len };
    }
  }

  // 情况2：选区非空（纯文字 / 纯公式 / 混合）
  if (!selection?.rangeCount || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!containerEl.contains(range.commonAncestorContainer)) return null;

  let minIdx = Infinity;
  let maxIdx = -Infinity;

  const root =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!root) return null;

  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes = [];
  while (treeWalker.nextNode()) {
    textNodes.push(treeWalker.currentNode);
  }

  for (const textNode of textNodes) {
    let parent = textNode.parentElement;
    while (parent && parent !== containerEl) {
      if (parent.classList.contains('char-span')) {
        const idx = parseInt(parent.getAttribute('data-idx'), 10);
        if (!isNaN(idx)) {
          minIdx = Math.min(minIdx, idx);
          maxIdx = Math.max(maxIdx, idx);
        }
        break;
      }
      if (parent.classList.contains('math-formula')) {
        const idx = parseInt(parent.getAttribute('data-idx'), 10);
        const len = parseInt(parent.getAttribute('data-length'), 10);
        if (!isNaN(idx) && !isNaN(len)) {
          minIdx = Math.min(minIdx, idx);
          maxIdx = Math.max(maxIdx, idx + len - 1);
        }
        break;
      }
      parent = parent.parentElement;
    }
  }

  if (minIdx === Infinity || maxIdx === -Infinity) return null;

  const start = minIdx;
  const end = maxIdx + 1;
  return { quoteText: sourceContent.substring(start, end), start, end };
}
