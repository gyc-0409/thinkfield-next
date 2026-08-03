'use client';
import { useState, useEffect } from 'react';
import { normalizeLikedBy } from '@/lib/likedBy';

export default function CommentTree({ comments, depth = 0, questionId, thoughtId, onReply, onQuoteClick, onDelete, onCommentLike, currentUser, deleteComment }) {
  if (!comments || comments.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          depth={depth}
          questionId={questionId}
          thoughtId={thoughtId}
          onReply={onReply}
          onQuoteClick={onQuoteClick}
          onDelete={onDelete}
          onCommentLike={onCommentLike}
          currentUser={currentUser}
          deleteComment={deleteComment}
        />
      ))}
    </div>
  );
}

function CommentItem({ comment, depth, questionId, thoughtId, onReply, onQuoteClick, onDelete, onCommentLike, currentUser, deleteComment }) {
  const isDeleted = comment.author === '[已删除]';
  const [likes, setLikes] = useState(comment.likes || 0);
  const [liked, setLiked] = useState(() => (
    isDeleted ? false : normalizeLikedBy(comment.liked_by).includes(currentUser)
  ));
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const list = normalizeLikedBy(comment.liked_by);
    setLiked(isDeleted ? false : list.includes(currentUser));
    setLikes(comment.likes || 0);
  }, [comment.id, comment.liked_by, comment.likes, currentUser, isDeleted]);

  const hasChildren = comment.children && comment.children.length > 0;

  if (isDeleted && !hasChildren) return null;

  const isAuthor = currentUser && comment.author === currentUser;

  // 引用点击处理（不再需要 useEffect 和 ref）
  const handleQuoteClick = (e) => {
    e.stopPropagation();
    if (onQuoteClick && comment.quote_start !== undefined && comment.quote_end !== undefined) {
      onQuoteClick(comment.quote_start, comment.quote_end, comment.quote_text || '');
    }
  };

  const handleLike = async () => {
    if (loading || isDeleted) return;
    setLoading(true);
    const wasLiked = liked;
    const nextLiked = !wasLiked;
    setLiked(nextLiked);
    setLikes((prev) => (wasLiked ? Math.max(prev - 1, 0) : prev + 1));
    try {
      const res = await fetch(`/api/comments/${comment.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        onCommentLike?.(comment.id, { likes: data.likes, liked: nextLiked });
      } else {
        setLiked(wasLiked);
        setLikes((prev) => (wasLiked ? prev + 1 : Math.max(prev - 1, 0)));
      }
    } catch (e) {
      setLiked(wasLiked);
      setLikes((prev) => (wasLiked ? prev + 1 : Math.max(prev - 1, 0)));
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这条评论吗？')) return;
    setDeleting(true);
    try {
      if (deleteComment) {
        await deleteComment(comment.id);
      } else {
        const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('删除失败');
      }
      if (onDelete) onDelete(comment.id);
    } catch (e) {
      alert(e.message);
    }
    setDeleting(false);
  };

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="group p-3 rounded border-2 border-gray-800 bg-gray-50 mb-2">
        {isDeleted ? (
          <div className="text-sm text-gray-400 italic">此评论已被作者删除</div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <span className="font-bold">{comment.author}</span>
              <button
                onClick={() => onReply(comment.id, comment.author)}
                className="text-xs text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                回复
              </button>
              {isAuthor && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-gray-300 hover:text-red-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {comment.quote_text && (
              <div className="text-xs text-gray-500 mb-1">
                <button
                  type="button"
                  onClick={handleQuoteClick}
                  title="点击查看原文"
                  className="italic cursor-pointer underline decoration-gray-300 hover:decoration-gray-500 hover:text-gray-700 transition-colors text-left"
                >
                  引用：{comment.quote_text.substring(0, 80)}
                  <span className="not-italic no-underline text-gray-400 ml-1">（点击跳转原文）</span>
                </button>
              </div>
            )}

            <div className="text-gray-800 whitespace-pre-wrap">{comment.content}</div>

            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
              <button
                onTouchEnd={(e) => { e.preventDefault(); handleLike(); }}
                onClick={handleLike}
                disabled={loading || isDeleted}
                className={`${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                title="有价值"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
              </button>
            </div>
          </>
        )}

        {hasChildren && (
          <CommentTree
            comments={comment.children}
            depth={depth + 1}
            questionId={questionId}
            thoughtId={thoughtId}
            onReply={onReply}
            onQuoteClick={onQuoteClick}
            onDelete={onDelete}
            onCommentLike={onCommentLike}
            currentUser={currentUser}
            deleteComment={deleteComment}
          />
        )}
      </div>
    </div>
  );
}
