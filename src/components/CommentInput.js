'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';

export default function CommentInput({
  questionId,
  thoughtId,
  quoteText: initialQuoteText,
  quoteStart: initialQuoteStart,
  quoteEnd: initialQuoteEnd,
  parentId: initialParentId,
  replyingTo: initialReplyingTo,
  onCommentPosted,
  onClearQuote,
  onClearReply,
  onSubmit,
  showPreview = true,
}) {
  const { requireLogin } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quoteText = initialQuoteText || '';
  const quoteStart = initialQuoteStart || 0;
  const quoteEnd = initialQuoteEnd || 0;
  const parentId = initialParentId || null;
  const replyingTo = initialReplyingTo || '';

  const handleSubmit = async () => {
    if (!requireLogin()) return;
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({ content, parentId, quoteText, quoteStart, quoteEnd });
      } else {
        const res = await fetch(`/api/questions/${questionId}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            parentId,
            quoteText,
            quoteStart,
            quoteEnd,
            thoughtId,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        if (onCommentPosted) onCommentPosted();
      }
      setContent('');
    } catch (e) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200">
      {replyingTo && (
        <div className="bg-gray-100 p-2 rounded mb-2 flex justify-between text-sm">
          <span>回复 <strong>{replyingTo}</strong></span>
          <button type="button" onClick={onClearReply} className="text-gray-500 hover:text-gray-700 ml-4">取消</button>
        </div>
      )}
      {quoteText && (
        <div className="bg-gray-100 p-2 rounded mb-2 flex justify-between text-sm">
          <span>引用：<strong className="text-gray-700">{quoteText.substring(0, 100)}</strong></span>
          <button type="button" onClick={onClearQuote} className="text-gray-500 hover:text-gray-700 ml-4">取消</button>
        </div>
      )}
      <LatexPreviewGroup
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="写下你的评论..."
        rows={4}
        showPreview={showPreview}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-2 bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 transition-colors disabled:opacity-50"
      >
        发表评论
      </button>
    </div>
  );
}