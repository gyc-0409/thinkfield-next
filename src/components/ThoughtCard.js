'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import CommentTree from '@/components/CommentTree';
import CommentInput from '@/components/CommentInput';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';
import { renderLatexToHTML } from '@/lib/renderLatex';

export default function ThoughtCard({
  thoughts,
  currentPage,
  isLastPage,
  questionId,
  onThoughtAdded,
  onQuote,
  comments,
  onReply,
  quoteText,
  quoteStart,
  quoteEnd,
  replyParentId,
  replyAuthor,
  onClearQuote,
  onClearReply,
  onCommentPosted,
  currentThoughtId,
  currentUser,
  bookType,
}) {
  const { requireLogin } = useAuth();
  const [newThought, setNewThought] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const contentRef = useRef(null);

  const thought = !isLastPage ? thoughts[currentPage] : null;

  // 移动端检测
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 点赞状态
  const initialLiked = thought ? (thought.liked_by?.includes(currentUser) || false) : false;
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(thought?.likes || 0);
  useEffect(() => {
    if (thought) {
      setLiked(thought.liked_by?.includes(currentUser) || false);
      setLikes(thought.likes || 0);
    }
  }, [thought, currentUser]);

  // 点击引用滚动高亮
  const handleQuoteClick = useCallback((start, end) => {
    if (!contentRef.current) return;
    const container = contentRef.current;
    const spans = container.querySelectorAll('.char-span');
    let firstSpan = null;
    spans.forEach(span => {
      const idx = parseInt(span.getAttribute('data-idx'));
      if (!isNaN(idx) && idx >= start && idx <= end) {
        span.classList.add('highlight-quote');
        if (!firstSpan) firstSpan = span;
      }
    });
    if (firstSpan) {
      firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      spans.forEach(span => {
        if (span.classList.contains('highlight-quote')) {
          span.classList.remove('highlight-quote');
        }
      });
    }, 3000);
  }, []);

  // 右键引用（支持公式直接右键）
  useEffect(() => {
    if (!contentRef.current || !thought) return;
    const el = contentRef.current;

    const handler = (e) => {
      if (!requireLogin()) return;

      const formulaSpan = e.target.closest('.math-formula');
      if (formulaSpan) {
        e.preventDefault();
        e.stopPropagation();
        const formulaText = formulaSpan.getAttribute('data-formula');
        if (!formulaText) return;
        let idx = parseInt(formulaSpan.getAttribute('data-idx'));
        let len = parseInt(formulaSpan.getAttribute('data-length'));
        if (isNaN(idx) || isNaN(len)) {
          const searchIdx = thought.content.indexOf(formulaText);
          if (searchIdx === -1) return;
          idx = searchIdx;
          len = formulaText.length;
        }
        const start = idx;
        const end = idx + len;
        const selectedText = formulaText;
        onQuote(selectedText, start, end);
        return;
      }

      e.preventDefault();
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      const fullText = thought.content;
      const start = fullText.indexOf(selectedText);
      if (start === -1) return;
      const end = start + selectedText.length;

      onQuote(selectedText, start, end);
    };

    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [thought, onQuote, requireLogin]);

  const handleSubmit = async () => {
    if (!requireLogin()) return;
    if (!newThought.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${questionId}/thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newThought }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewThought('');
      onThoughtAdded();
    } catch (e) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  // 点赞/取消点赞（乐观更新）
  const handleLike = async () => {
    if (!requireLogin()) return;
    const wasLiked = liked;
    // 立即切换 UI
    setLiked(!wasLiked);
    setLikes(prev => wasLiked ? Math.max(prev - 1, 0) : prev + 1);

    try {
      const res = await fetch(`/api/questions/${questionId}/thoughts/${thought.id}/like`, {
        method: 'POST',
      });
      if (!res.ok) {
        // 请求失败，回滚状态
        setLiked(wasLiked);
        setLikes(prev => wasLiked ? prev + 1 : Math.max(prev - 1, 0));
      } else {
        // 成功，用服务器返回的值校准（可选）
        const data = await res.json();
        setLikes(data.likes);
        // 不再调用 onThoughtAdded()，避免全量刷新
      }
    } catch (e) {
      // 网络错误，回滚
      setLiked(wasLiked);
      setLikes(prev => wasLiked ? prev + 1 : Math.max(prev - 1, 0));
    }
  };

  const showPreview = bookType !== 'literature';

  if (isLastPage) {
    return (
      <div>
        <h3 className="font-bold text-lg mb-3">写下你的思考</h3>
        <LatexPreviewGroup
          value={newThought}
          onChange={e => setNewThought(e.target.value)}
          placeholder="写下你对这个问题的思考..."
          rows={isMobile ? 5 : 8}
          showPreview={showPreview}
        />
        <button onClick={handleSubmit} disabled={submitting}
          className="mt-3 bg-gray-800 text-white px-6 py-2 rounded text-sm hover:bg-gray-900 transition-colors">
          发布思考
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{thought.author}的思考区</h3>
        <div className="flex items-center gap-2">
          <button
            onTouchEnd={(e) => { e.preventDefault(); handleLike(); }}
            onClick={handleLike}
            className={`${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            title="有价值"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={contentRef}
        className={`text-gray-800 whitespace-pre-wrap ${isMobile ? 'text-sm' : ''}`}
        style={{ marginBottom: isMobile ? 8 : 12 }}
        dangerouslySetInnerHTML={{ __html: renderLatexToHTML(thought.content) }}
      />
      <p className="text-xs text-gray-400 mt-2">选中文字后右键即可引用并追问</p>

      {/* 评论列表 */}
      {comments && comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <CommentTree
            comments={comments}
            questionId={questionId}
            thoughtId={currentThoughtId}
            onReply={onReply}
            onQuoteClick={handleQuoteClick}
            onDelete={onCommentPosted}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* 引用/回复输入框 */}
      {(quoteText || replyParentId) && (
        <div className="mt-4">
          <CommentInput
            questionId={questionId}
            thoughtId={currentThoughtId}
            quoteText={quoteText}
            quoteStart={quoteStart}
            quoteEnd={quoteEnd}
            parentId={replyParentId}
            replyingTo={replyAuthor}
            onCommentPosted={onCommentPosted}
            onClearQuote={onClearQuote}
            onClearReply={onClearReply}
            showPreview={showPreview}
          />
        </div>
      )}
    </div>
  );
}