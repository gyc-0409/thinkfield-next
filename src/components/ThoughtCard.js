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

  // 移动端长按菜单状态
  const [touchMenu, setTouchMenu] = useState({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  const longPressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchTargetRef = useRef(null);

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

  // 获取触摸点下的字符信息
  const getCharAtPosition = (clientX, clientY) => {
    const container = contentRef.current;
    if (!container) return null;
    // 隐藏可能存在的菜单，避免干扰
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const charSpan = el.closest('.char-span');
    const mathSpan = el.closest('.math-formula');
    if (charSpan) {
      const idx = parseInt(charSpan.getAttribute('data-idx'));
      if (!isNaN(idx)) return { type: 'char', idx, text: charSpan.textContent };
    }
    if (mathSpan) {
      const idx = parseInt(mathSpan.getAttribute('data-idx'));
      const len = parseInt(mathSpan.getAttribute('data-length'));
      const formula = mathSpan.getAttribute('data-formula');
      if (!isNaN(idx) && len && formula) return { type: 'formula', idx, endIdx: idx + len, text: formula };
    }
    return null;
  };

  // 开始触摸
  const handleTouchStart = (e) => {
    if (!isMobile || !thought || !requireLogin()) return;
    if (e.touches.length !== 1) {
      clearLongPress();
      return;
    }
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchTargetRef.current = e.target;

    longPressTimer.current = setTimeout(() => {
      const charInfo = getCharAtPosition(touchStartPos.current.x, touchStartPos.current.y);
      if (charInfo) {
        const startIdx = charInfo.type === 'formula' ? charInfo.idx : charInfo.idx;
        const endIdx = charInfo.type === 'formula' ? charInfo.endIdx : startIdx + (charInfo.text ? charInfo.text.length : 1);
        const quoteText = charInfo.type === 'formula' ? charInfo.text : (charInfo.text || '');
        setTouchMenu({
          visible: true,
          x: touchStartPos.current.x,
          y: touchStartPos.current.y,
          startIdx,
          endIdx,
          text: quoteText,
        });
      }
      longPressTimer.current = null;
    }, 600);
  };

  const handleTouchMove = (e) => {
    if (!longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearLongPress();
    }
  };

  const handleTouchEnd = (e) => {
    clearLongPress();
    // 如果没有长按菜单，且没有选中文字，则允许其他行为
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMenuQuote = () => {
    if (touchMenu.startIdx !== null && touchMenu.endIdx !== null && touchMenu.text) {
      onQuote(touchMenu.text, touchMenu.startIdx, touchMenu.endIdx);
    }
    setTouchMenu({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  };

  const closeTouchMenu = () => {
    setTouchMenu({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  };

  // 右键引用（桌面端）
  useEffect(() => {
    if (!contentRef.current || !thought || isMobile) return;
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
  }, [thought, onQuote, requireLogin, isMobile]);

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

  const handleLike = async () => {
    if (!requireLogin()) return;
    try {
      const res = await fetch(`/api/questions/${questionId}/thoughts/${thought.id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setLiked(!liked);
        onThoughtAdded();
      }
    } catch (e) {
      console.error(e);
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
            onClick={handleLike}
            className={`transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
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
        className={`text-gray-800 whitespace-pre-wrap ${isMobile ? 'text-sm' : ''} select-auto`}
        style={{ marginBottom: isMobile ? 8 : 12, touchAction: 'manipulation' }}
        dangerouslySetInnerHTML={{ __html: renderLatexToHTML(thought.content) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <p className="text-xs text-gray-400 mt-2">选中文字后右键即可引用并追问</p>

      {/* 移动端长按菜单 */}
      {touchMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 px-0"
          style={{ left: touchMenu.x, top: touchMenu.y, transform: 'translate(-50%, -100%)' }}
        >
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleTouchMenuQuote}
          >
            引用
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={closeTouchMenu}
          >
            取消
          </button>
        </div>
      )}

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