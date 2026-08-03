/** 叶子节点：无 children */
function isLeafNode(node) {
  return !node.children || node.children.length === 0;
}

/**
 * 按书籍 tree 裁剪：只保留通向有贡献小节的路径，叶子附带 discussions / answers。
 */
export function buildPrunedBookTree(bookTree, contributionsByNodeId) {
  if (!Array.isArray(bookTree)) return [];

  const walk = (nodes) => {
    const out = [];
    for (const node of nodes) {
      if (!node?.id) continue;
      const contrib = contributionsByNodeId.get(node.id);

      if (isLeafNode(node)) {
        const discussions = contrib?.discussions || [];
        const answers = contrib?.answers || [];
        if (discussions.length === 0 && answers.length === 0) continue;
        out.push({
          id: node.id,
          title: node.title || '',
          discussions,
          answers,
        });
      } else {
        const children = walk(node.children);
        if (children.length === 0) continue;
        out.push({
          id: node.id,
          title: node.title || '',
          children,
        });
      }
    }
    return out;
  };

  return walk(bookTree);
}

/** 将 flat 讨论 / 解答列表按 bookId -> nodeId 分组 */
export function groupContributionsByBook(discussions, answers) {
  const byBook = new Map();

  const ensureBook = (bookId) => {
    if (!byBook.has(bookId)) byBook.set(bookId, new Map());
    return byBook.get(bookId);
  };

  const ensureNode = (bookMap, nodeId) => {
    if (!bookMap.has(nodeId)) {
      bookMap.set(nodeId, { discussions: [], answers: [] });
    }
    return bookMap.get(nodeId);
  };

  for (const d of discussions) {
    const bookMap = ensureBook(d.bookId);
    ensureNode(bookMap, d.nodeId).discussions.push(d);
  }
  for (const a of answers) {
    const bookMap = ensureBook(a.bookId);
    ensureNode(bookMap, a.nodeId).answers.push(a);
  }

  return byBook;
}
