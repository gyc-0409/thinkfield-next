/** Find a node by id in a book tree; returns { node, path } or null. */
export function findNodeAndPath(tree, targetId, path = []) {
  if (!Array.isArray(tree)) return null;
  for (const node of tree) {
    const nextPath = [...path, node];
    if (node.id === targetId) return { node, path: nextPath };
    if (node.children?.length) {
      const found = findNodeAndPath(node.children, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeTitle(tree, nodeId) {
  const found = findNodeAndPath(tree, nodeId);
  return found?.node?.title || '';
}
