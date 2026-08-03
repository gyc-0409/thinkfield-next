/** Normalize liked_by from DB/JSON (array or string). */
export function normalizeLikedBy(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Apply like / unlike for a user onto a liked_by list. */
export function applyLikeState(likedByRaw, user, liked) {
  const list = normalizeLikedBy(likedByRaw);
  if (!user) return list;
  if (liked) {
    return list.includes(user) ? list : [...list, user];
  }
  return list.filter((u) => u !== user);
}

/** Deep-update a continuation (and nested children) by id. */
export function mapContinuationTree(continuations, contId, updater) {
  if (!Array.isArray(continuations)) return continuations;
  return continuations.map((c) => {
    if (c.id === contId) return updater(c);
    if (c.continuations?.length) {
      return {
        ...c,
        continuations: mapContinuationTree(c.continuations, contId, updater),
      };
    }
    return c;
  });
}

/** Update a comment (and nested children) by id in a tree. */
export function mapCommentTree(comments, commentId, updater) {
  if (!Array.isArray(comments)) return comments;
  return comments.map((c) => {
    if (c.id === commentId) return updater(c);
    if (c.children?.length) {
      return {
        ...c,
        children: mapCommentTree(c.children, commentId, updater),
      };
    }
    return c;
  });
}
