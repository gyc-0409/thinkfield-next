/** 从原文截断点向前取若干字符，用于「续写位置」提示 */
export function formatContinuationPositionHint(content, start, maxLen = 15) {
  if (start == null || start === undefined || !content) return '';
  const safeStart = Math.max(0, Math.min(start, content.length));
  const from = Math.max(0, safeStart - maxLen);
  const snippet = content.slice(from, safeStart);
  const prefix = from > 0 ? '…' : '';
  return `${prefix}${snippet}`;
}

/** 在续写树中按 id 查找节点 */
export function findContinuationById(continuations, id) {
  if (!Array.isArray(continuations)) return null;
  for (const cont of continuations) {
    if (cont.id === id) return cont;
    if (cont.continuations?.length) {
      const found = findContinuationById(cont.continuations, id);
      if (found) return found;
    }
  }
  return null;
}
