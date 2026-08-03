'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import CommentTree from '@/components/CommentTree';
import CommentInput from '@/components/CommentInput';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';
import { renderLatexToHTML } from '@/lib/renderLatex';
import { normalizeLikedBy } from '@/lib/likedBy';

export default function ThoughtCard({
  thoughts,
  currentPage,
  isLastPage,
  questionId,
  onThoughtAdded,
  onThoughtLike,
  onQuote,
  comments,
  onReply,
  onCommentLike,
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

  const [liked, setLiked] = useState(() => normalizeLikedBy(thought?.liked_by).includes(currentUser));
  const [likes, setLikes] = useState(thought?.likes || 0);
  useEffect(() => {
    if (thought) {
      setLiked(normalizeLikedBy(thought.liked_by).includes(currentUser));
      setLikes(thought.likes || 0);
    }
  }, [thought, currentUser, currentPage]);

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

  // 右键引用（支持公式直接右键，以及文字+公式混合选区）
  useEffect(() => {
    if (!contentRef.current || !thought) return;
    const el = contentRef.current;

    const handler = (e) => {
      if (!requireLogin()) return;

      // 情况1：右键直接点击了公式（没有选区或选区折叠）
      const formulaSpan = e.target.closest('.math-formula');
      const selection = window.getSelection();
      if (formulaSpan && (!selection.rangeCount || selection.isCollapsed)) {
        e.preventDefault();
        e.stopPropagation();
        const formulaText = formulaSpan.getAttribute('data-formula');
        const idx = parseInt(formulaSpan.getAttribute('data-idx'));
        const len = parseInt(formulaSpan.getAttribute('data-length'));
        if (!isNaN(idx) && len) {
          onQuote(formulaText, idx, idx + len);
          return;
        }
      }

      // 情况2：选区非空（包括纯文字、纯公式、混合）
      if (!selection.rangeCount || selection.isCollapsed) return;

      e.preventDefault();
      const range = selection.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;

      // 遍历选区内所有文本节点，收集索引
      let minIdx = Infinity;
      let maxIdx = -Infinity;

      const treeWalker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            // 只接受在选区内或与选区相交的文本节点
            if (range.intersectsNode(node)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          },
        }
      );

      const textNodes = [];
      while (treeWalker.nextNode()) {
        textNodes.push(treeWalker.currentNode);
      }

      for (const textNode of textNodes) {
        // 找到该文本节点所在的 char-span 或 math-formula
        let parent = textNode.parentElement;
        while (parent && parent !== el) {
          if (parent.classList.contains('char-span')) {
            const idx = parseInt(parent.getAttribute('data-idx'));
            if (!isNaN(idx)) {
              // char-span 每个字符一个 data-idx，文本节点内容就是它的 textContent
              // 考虑文本节点可能被部分选中，但这里简化处理：只要文本节点被选中，整个 char-span 的索引就纳入范围
              minIdx = Math.min(minIdx, idx);
              maxIdx = Math.max(maxIdx, idx);
            }
            break;
          } else if (parent.classList.contains('math-formula')) {
            const idx = parseInt(parent.getAttribute('data-idx'));
            const len = parseInt(parent.getAttribute('data-length'));
            if (!isNaN(idx) && !isNaN(len)) {
              const formulaEnd = idx + len;
              minIdx = Math.min(minIdx, idx);
              maxIdx = Math.max(maxIdx, formulaEnd - 1);
            }
            break;
          }
          parent = parent.parentElement;
        }
      }

      if (minIdx === Infinity || maxIdx === -Infinity) return;

      const start = minIdx;
      const end = maxIdx + 1; // end 是开区间
      const quoteText = thought.content.substring(start, end);
      onQuote(quoteText, start, end);
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

  // 点赞（乐观更新，并写回父级数据以免翻页后丢失）
  const handleLike = async () => {
    if (!requireLogin()) return;
    if (!thought) return;
    const wasLiked = liked;
    const nextLiked = !wasLiked;
    setLiked(nextLiked);
    setLikes(prev => wasLiked ? Math.max(prev - 1, 0) : prev + 1);
    try {
      const res = await fetch(`/api/questions/${questionId}/thoughts/${thought.id}/like`, {
        method: 'POST',
      });
      if (!res.ok) {
        setLiked(wasLiked);
        setLikes(prev => wasLiked ? prev + 1 : Math.max(prev - 1, 0));
      } else {
        const data = await res.json();
        setLikes(data.likes);
        onThoughtLike?.(thought.id, { likes: data.likes, liked: nextLiked });
      }
    } catch (e) {
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
      <div className="flex justify-between items-center mb-3 gap-2">
        <h3 className={`font-bold min-w-0 truncate ${isMobile ? 'text-base' : 'text-lg'}`}>{thought.author}的思考区</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onTouchEnd={(e) => { e.preventDefault(); handleLike(); }}
            onClick={handleLike}
            className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            title="有价值"
            aria-label="有价值"
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
            onCommentLike={onCommentLike}
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