'use client';
import { useState, useRef, useCallback, createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { renderLatexToHTML } from '@/lib/renderLatex';
import CommentTree from '@/components/CommentTree';
import CommentInput from '@/components/CommentInput';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';

const FocusContext = createContext();
function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus 必须在 FocusProvider 内部使用');
  return ctx;
}

function ContinuationNode({
  cont, depth, ancestorIds, foldState, toggleFold,
  cutTarget, showForm, formMotivation, formContent,
  onFormMotivationChange, onFormContentChange,
  onSubmitForm, onCancelForm, exerciseId, answerId,
  currentUser, bookType, onQuoteText,
}) {
  const nodeId = `cont-${cont.id}`;
  const { focusPath, addFocus, removeFocus } = useFocus();
  const isFocused = focusPath.includes(cont.id);
  const { requireLogin } = useAuth();
  const [hover, setHover] = useState(false);
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [touchMenu, setTouchMenu] = useState({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  const longPressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const initialLiked = cont.liked_by?.includes(currentUser) || false;
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(cont.likes || 0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  useEffect(() => {
    setLiked(cont.liked_by?.includes(currentUser) || false);
    setLikes(cont.likes || 0);
  }, [cont, currentUser]);

  // 续写表单出现时自动滚动
  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showForm]);

  const isVisible = focusPath.length === 0 || ancestorIds.some(id => focusPath.includes(id)) || isFocused;
  let cutAfterIdx;
  if (isFocused) {
    const idxInPath = focusPath.indexOf(cont.id);
    if (idxInPath !== -1 && idxInPath < focusPath.length - 1) {
      const nextFocusedId = focusPath[idxInPath + 1];
      const childCont = cont.continuations?.find(c => c.id === nextFocusedId);
      if (childCont) cutAfterIdx = childCont.start;
    }
  }

  const handleMouseEnter = () => setHover(true);
  const handleMouseLeave = (e) => {
    if (containerRef.current && e.relatedTarget && containerRef.current.contains(e.relatedTarget)) return;
    setHover(false);
  };
  const handleFocusToggle = (e) => { e.stopPropagation(); isFocused ? removeFocus(cont.id) : addFocus(cont.id, ancestorIds); };
  const handleLike = async (e) => {
    e.stopPropagation();
    if (!requireLogin()) return;
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/continuations/${cont.id}/like`, { method: 'POST' });
      if (res.ok) { const data = await res.json(); setLikes(data.likes); setLiked(!liked); }
    } catch (error) { console.error(error); }
  };

  const getCharAtPosition = (clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return null;
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const charSpan = el.closest('.char-span');
    const mathSpan = el.closest('.math-formula');
    if (charSpan) { const idx = parseInt(charSpan.getAttribute('data-idx')); if (!isNaN(idx)) return { type: 'char', idx, text: charSpan.textContent }; }
    if (mathSpan) { const idx = parseInt(mathSpan.getAttribute('data-idx')), len = parseInt(mathSpan.getAttribute('data-length')), formula = mathSpan.getAttribute('data-formula'); if (!isNaN(idx) && len && formula) return { type: 'formula', idx, endIdx: idx + len, text: formula }; }
    return null;
  };
  const clearLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
  const handleTouchStart = (e) => {
    if (!isMobile || !cont || !requireLogin()) return;
    if (e.touches.length !== 1) { clearLongPress(); return; }
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      const charInfo = getCharAtPosition(touchStartPos.current.x, touchStartPos.current.y);
      if (charInfo) {
        const startIdx = charInfo.type === 'formula' ? charInfo.idx : charInfo.idx;
        const endIdx = charInfo.type === 'formula' ? charInfo.endIdx : startIdx + (charInfo.text ? charInfo.text.length : 1);
        const quoteText = charInfo.type === 'formula' ? charInfo.text : (charInfo.text || '');
        setTouchMenu({ visible: true, x: touchStartPos.current.x, y: touchStartPos.current.y, startIdx, endIdx, text: quoteText });
      }
      longPressTimer.current = null;
    }, 600);
  };
  const handleTouchMove = (e) => {
    if (!longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearLongPress();
  };
  const handleTouchEnd = () => clearLongPress();
  const handleTouchMenuQuote = () => {
    if (touchMenu.startIdx !== null) { onQuoteText?.(touchMenu.text, touchMenu.startIdx, touchMenu.endIdx); }
    setTouchMenu({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  };
  const closeTouchMenu = () => setTouchMenu({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  const handleContextMenu = (e) => {
    if (isMobile || !requireLogin()) return;
    const formulaSpan = e.target.closest('.math-formula');
    if (formulaSpan) {
      e.preventDefault(); e.stopPropagation();
      const formulaText = formulaSpan.getAttribute('data-formula');
      const idx = parseInt(formulaSpan.getAttribute('data-idx'));
      const len = parseInt(formulaSpan.getAttribute('data-length'));
      if (!isNaN(idx) && len) { onQuoteText?.(formulaText, idx, idx + len); return; }
    }
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    e.preventDefault();
    const fullText = cont.content;
    const start = fullText.indexOf(selectedText);
    if (start !== -1) onQuoteText?.(selectedText, start, start + selectedText.length);
  };

  if (!isVisible) return null;
  const showFocusBtn = hover || isFocused;
  const showPreview = bookType !== 'literature';

  return (
    <li style={{ marginBottom: isMobile ? 8 : 12 }}>
      <div ref={containerRef} data-node-id={nodeId} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: isMobile ? 8 : 12, marginLeft: isMobile ? depth * 12 : depth * 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 4 : 6 }}>
          <span style={{ cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: isMobile ? '0.875rem' : '1rem' }}
            onClick={() => toggleFold(cont.id)}>{cont.author}的续写</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
            <button onClick={handleLike} className={`transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`} title="有价值">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
            </button>
            {showFocusBtn && <button onClick={handleFocusToggle} className={`text-xs px-2.5 py-1 rounded transition-colors ${isFocused ? 'bg-gray-700 text-white font-semibold' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>{isFocused ? '退出聚焦' : '聚焦'}</button>}
          </div>
        </div>
        {!foldState[cont.id] && (
          <>
            {cont.motivation && (
              <div style={{ background: '#f3f4f6', padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: isMobile ? 13 : 14 }}
                dangerouslySetInnerHTML={{ __html: `<span style="font-weight:600;color:#374151">动机：</span>${renderLatexToHTML(cont.motivation)}` }} />
            )}
            <div className="answer-text-container" data-node-id={nodeId}
              style={{ whiteSpace: 'pre-wrap', marginLeft: isMobile ? 4 : 8, marginBottom: 8, fontSize: isMobile ? '0.875rem' : 'inherit', touchAction: 'manipulation' }}
              dangerouslySetInnerHTML={{ __html: renderLatexToHTML(cont.content, cutAfterIdx) }}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onContextMenu={handleContextMenu} />
            {touchMenu.visible && <div className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 px-0" style={{ left: touchMenu.x, top: touchMenu.y, transform: 'translate(-50%, -100%)' }}>
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={handleTouchMenuQuote}>引用</button>
              <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeTouchMenu}>取消</button>
            </div>}
            {cutTarget?.nodeId === nodeId && showForm && (
              <div ref={formRef} style={{ marginLeft: isMobile ? 4 : 8, marginTop: 8, padding: isMobile ? 8 : 12, border: '1px solid #ddd', borderRadius: 6, background: '#fff' }} onClick={(e) => e.stopPropagation()}>
                <div className="text-sm font-medium mb-2">续写动机 *</div>
                <LatexPreviewGroup value={formMotivation} onChange={(e) => onFormMotivationChange(e.target.value)} rows={2} placeholder="为什么要续写这一步？" showPreview={showPreview} />
                <div className="text-sm font-medium mb-2">续写内容 *</div>
                <LatexPreviewGroup value={formContent} onChange={(e) => onFormContentChange(e.target.value)} rows={4} placeholder="写下你的续写/改写步骤..." showPreview={showPreview} />
                <div className="flex gap-2 mt-2"><button onClick={onSubmitForm} className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900">提交续写</button><button onClick={onCancelForm} className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300">取消</button></div>
              </div>
            )}
            {cont.continuations && cont.continuations.length > 0 && (
              <ul style={{ paddingLeft: 0, marginTop: 12 }}>
                {cont.continuations.map((sub) => (
                  <ContinuationNode key={sub.id} cont={sub} depth={depth + 1} ancestorIds={[...ancestorIds, cont.id]} foldState={foldState} toggleFold={toggleFold}
                    cutTarget={cutTarget} showForm={showForm} formMotivation={formMotivation} formContent={formContent}
                    onFormMotivationChange={onFormMotivationChange} onFormContentChange={onFormContentChange}
                    onSubmitForm={onSubmitForm} onCancelForm={onCancelForm} exerciseId={exerciseId} answerId={answerId}
                    currentUser={currentUser} bookType={bookType} onQuoteText={onQuoteText} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function AnswerCard({ answers, currentPage, isLastPage, exerciseId, onAnswerAdded, bookType }) {
  const { user, requireLogin } = useAuth();
  const [cutMode, setCutMode] = useState(false);
  const [cutTarget, setCutTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formMotivation, setFormMotivation] = useState('');
  const [formContent, setFormContent] = useState('');
  const [foldState, setFoldState] = useState({});
  const toggleFold = useCallback((contId) => { setFoldState(prev => ({ ...prev, [contId]: !prev[contId] })); }, []);
  const [focusPath, setFocusPath] = useState([]);
  const addFocus = useCallback((contId, ancestors) => { setFocusPath([...ancestors, contId]); }, []);
  const removeFocus = useCallback((contId) => { setFocusPath(prev => { const idx = prev.indexOf(contId); return idx === -1 ? prev : prev.slice(0, idx); }); }, []);
  const answerContainerRef = useRef(null);
  const answerTextRef = useRef(null);
  const commentInputRef = useRef(null);
  const [overallThought, setOverallThought] = useState('');
  const [newAnswerContent, setNewAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchMenu, setTouchMenu] = useState({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  const longPressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const currentAns = !isLastPage ? answers[currentPage] : null;
  const [answerLiked, setAnswerLiked] = useState(currentAns?.liked_by?.includes(user) || false);
  const [answerLikes, setAnswerLikes] = useState(currentAns?.likes || 0);
  const [exerciseComments, setExerciseComments] = useState([]);
  const [quoteText, setQuoteText] = useState('');
  const [quoteStart, setQuoteStart] = useState(0);
  const [quoteEnd, setQuoteEnd] = useState(0);
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  useEffect(() => { const check = () => setIsMobile(window.innerWidth < 768); check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check); }, []);
  useEffect(() => { if (currentAns) { setAnswerLiked(currentAns.liked_by?.includes(user) || false); setAnswerLikes(currentAns.likes || 0); } }, [currentAns, user]);
  const fetchComments = useCallback(async () => { if (!currentAns) return; try { const res = await fetch(`/api/exercises/${exerciseId}/answers/${currentAns.id}/comments`); const data = await res.json(); setExerciseComments(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } }, [exerciseId, currentAns]);
  useEffect(() => { if (currentAns) { fetchComments(); setQuoteText(''); setReplyParentId(null); setShowCommentInput(false); } }, [currentAns, fetchComments]);

  // 评论输入框出现时自动滚动
  useEffect(() => {
    if (showCommentInput && commentInputRef.current) {
      commentInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showCommentInput]);

  const handleQuote = (text, start, end) => { setQuoteText(text); setQuoteStart(start); setQuoteEnd(end); setReplyParentId(null); setReplyAuthor(''); setShowCommentInput(true); };
  const handleContextMenu = (e) => {
    if (isMobile || !requireLogin()) return;
    const formulaSpan = e.target.closest('.math-formula');
    if (formulaSpan) {
      e.preventDefault(); e.stopPropagation();
      const formulaText = formulaSpan.getAttribute('data-formula');
      const idx = parseInt(formulaSpan.getAttribute('data-idx'));
      const len = parseInt(formulaSpan.getAttribute('data-length'));
      if (!isNaN(idx) && len) { handleQuote(formulaText, idx, idx + len); return; }
    }
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    e.preventDefault();
    const container = e.currentTarget;
    const fullText = container.textContent || '';
    const start = fullText.indexOf(selectedText);
    if (start !== -1) handleQuote(selectedText, start, start + selectedText.length);
  };
  const getCharAtPosition = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const charSpan = el.closest('.char-span');
    const mathSpan = el.closest('.math-formula');
    if (charSpan) { const idx = parseInt(charSpan.getAttribute('data-idx')); if (!isNaN(idx)) return { type: 'char', idx, text: charSpan.textContent }; }
    if (mathSpan) { const idx = parseInt(mathSpan.getAttribute('data-idx')), len = parseInt(mathSpan.getAttribute('data-length')), formula = mathSpan.getAttribute('data-formula'); if (!isNaN(idx) && len && formula) return { type: 'formula', idx, endIdx: idx + len, text: formula }; }
    return null;
  };
  const clearLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } };
  const handleTouchStart = (e) => {
    if (!isMobile || !currentAns || !requireLogin()) return;
    if (e.touches.length !== 1) { clearLongPress(); return; }
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      const charInfo = getCharAtPosition(touchStartPos.current.x, touchStartPos.current.y);
      if (charInfo) {
        const startIdx = charInfo.type === 'formula' ? charInfo.idx : charInfo.idx;
        const endIdx = charInfo.type === 'formula' ? charInfo.endIdx : startIdx + (charInfo.text ? charInfo.text.length : 1);
        const quoteText = charInfo.type === 'formula' ? charInfo.text : (charInfo.text || '');
        setTouchMenu({ visible: true, x: touchStartPos.current.x, y: touchStartPos.current.y, startIdx, endIdx, text: quoteText });
      }
      longPressTimer.current = null;
    }, 600);
  };
  const handleTouchMove = (e) => {
    if (!longPressTimer.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearLongPress();
  };
  const handleTouchEnd = () => clearLongPress();
  const handleTouchMenuQuote = () => { if (touchMenu.startIdx !== null) { handleQuote(touchMenu.text, touchMenu.startIdx, touchMenu.endIdx); } setTouchMenu({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' }); };
  const closeTouchMenu = () => setTouchMenu({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  const handleCommentPosted = () => { fetchComments(); setShowCommentInput(false); setQuoteText(''); setReplyParentId(null); };
  const handleReply = (commentId, author) => { setReplyParentId(commentId); setReplyAuthor(author); setQuoteText(''); setShowCommentInput(true); };
  const handleDeleteExerciseComment = async (commentId) => { if (!currentAns) return; try { const res = await fetch(`/api/exercises/${exerciseId}/answers/${currentAns.id}/comments/${commentId}`, { method: 'DELETE' }); if (!res.ok) throw new Error((await res.json()).error); } catch (e) { throw e; } };

  const handleQuoteClick = useCallback((start, end, quoteText) => {
    setFocusPath([]);
    const container = answerContainerRef.current;
    if (!container) return;

    const allSpans = container.querySelectorAll('.char-span, .math-formula');
    let firstSpan = null;

    // 1. 公式高亮：遍历所有 .math-formula，只要索引区间重叠就高亮
    allSpans.forEach(span => {
      if (span.classList.contains('math-formula')) {
        const idx = parseInt(span.getAttribute('data-idx'));
        const len = parseInt(span.getAttribute('data-length'));
        if (isNaN(idx) || isNaN(len)) return;
        const spanEnd = idx + len;
        if (idx < end && spanEnd > start) {
          span.style.backgroundColor = '#1a1a1a';
          span.style.color = '#fff';
          span.style.transition = 'background-color 0.3s, color 0.3s';
          if (!firstSpan) firstSpan = span;
        }
      }
    });

    // 2. 文字高亮：仅当 quoteText 有效时用文本匹配
    if (quoteText && quoteText.trim().length > 0) {
      const charSpans = container.querySelectorAll('.char-span');
      const spanList = [];
      let accumulated = '';
      charSpans.forEach(span => {
        accumulated += span.textContent;
        spanList.push(span);
      });
      const idx = accumulated.indexOf(quoteText);
      if (idx !== -1) {
        let currentPos = 0;
        for (const span of spanList) {
          const spanStart = currentPos;
          const spanEnd = currentPos + span.textContent.length;
          if (spanEnd > idx && spanStart < idx + quoteText.length) {
            span.style.backgroundColor = '#1a1a1a';
            span.style.color = '#fff';
            span.style.transition = 'background-color 0.3s, color 0.3s';
            if (!firstSpan) firstSpan = span;
          }
          currentPos = spanEnd;
        }
      }
    }

    if (firstSpan) {
      firstSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      allSpans.forEach(span => {
        span.style.backgroundColor = '';
        span.style.color = '';
      });
    }, 3000);
  }, [setFocusPath]);

  const handleExerciseCommentSubmit = async ({ content, parentId, quoteText, quoteStart, quoteEnd }) => {
    if (!requireLogin()) return;
    if (!currentAns) return;
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/answers/${currentAns.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId, quoteText, quoteStart, quoteEnd }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      handleCommentPosted();
    } catch (e) { alert(e.message); }
  };

  const handleEnterCutMode = () => { setCutMode(true); setCutTarget(null); setShowForm(false); };
  const handleCancelCut = () => { setCutMode(false); setCutTarget(null); setShowForm(false); };
  const handleContainerClick = (e) => {
    if (!cutMode) return;
    const target = e.target;
    if (!target.classList.contains('char-span') && !target.classList.contains('math-formula')) return;
    e.stopPropagation();
    if (!target.closest('.answer-text-container')) return;
    const idx = parseInt(target.getAttribute('data-idx'));
    if (isNaN(idx)) return;
    const nodeContainer = target.closest('[data-node-id]');
    if (!nodeContainer) return;
    const nodeId = nodeContainer.getAttribute('data-node-id');
    let parentContinuationId = null;
    if (nodeId.startsWith('cont-')) parentContinuationId = nodeId.replace('cont-', '');
    setCutTarget({ nodeId, start: idx, parentContinuationId: parentContinuationId || null });
    setCutMode(false); setShowForm(true); setFormMotivation(''); setFormContent('');
  };
  const handleSubmitForm = async () => {
    if (!requireLogin()) return;
    if (!formMotivation.trim() || !formContent.trim()) { alert('请填写完整'); return; }
    if (!cutTarget) return;
    const ansId = answers[currentPage]?.id;
    if (!ansId) return;
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/answers/${ansId}/continuations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: cutTarget.start, content: formContent.trim(), motivation: formMotivation.trim(), parentContinuationId: cutTarget.parentContinuationId || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setFormMotivation(''); setFormContent(''); setShowForm(false); setCutTarget(null);
      onAnswerAdded(() => {
        if (cutTarget.parentContinuationId) {
          setFocusPath(prev => { const idx = prev.indexOf(cutTarget.parentContinuationId); return idx !== -1 ? prev.slice(0, idx + 1) : prev; });
        } else setFocusPath([]);
      });
    } catch (e) { alert(e.message); }
  };
  const handleSubmitAnswer = async () => {
    if (!requireLogin()) return;
    if (!overallThought.trim() || !newAnswerContent.trim()) return alert('请填写完整');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/answers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newAnswerContent, overallThought }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setOverallThought(''); setNewAnswerContent('');
      onAnswerAdded(() => {});
    } catch (e) { alert(e.message); }
    setSubmitting(false);
  };
  const handleCancelForm = () => { setShowForm(false); setCutTarget(null); setFormMotivation(''); setFormContent(''); };
  const handleAnswerLike = async () => {
    if (!requireLogin()) return;
    if (!currentAns) return;
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/answers/${currentAns.id}/like`, { method: 'POST' });
      if (res.ok) { const data = await res.json(); setAnswerLikes(data.likes); setAnswerLiked(!answerLiked); }
    } catch (e) { console.error(e); }
  };

  const showPreview = bookType !== 'literature';

  if (isLastPage) {
    return (
      <div>
        <h3 className="font-bold text-lg mb-3">添加你的解答</h3>
        <label className="block mb-1 font-bold">整体思路 *</label>
        <LatexPreviewGroup value={overallThought} onChange={e => setOverallThought(e.target.value)} rows={3} placeholder="是什么启发你选择了这个解题方向？" showPreview={showPreview} />
        <label className="block mb-1 font-bold mt-3">解答过程 *</label>
        <LatexPreviewGroup value={newAnswerContent} onChange={e => setNewAnswerContent(e.target.value)} rows={8} placeholder="请流畅地写下你的完整解答。" showPreview={showPreview} />
        <button onClick={handleSubmitAnswer} disabled={submitting} className="mt-3 bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-900 transition-colors">发布解答</button>
      </div>
    );
  }

  const ans = currentAns;
  if (!ans) return null;
  const isAnswerCutPoint = cutTarget && cutTarget.nodeId === `answer-${ans.id}`;
  let answerCutAfterIdx;
  if (focusPath.length > 0) {
    const firstContId = focusPath[0];
    const cont = ans.continuations?.find(c => c.id === firstContId);
    if (cont) answerCutAfterIdx = cont.start;
  }

  return (
    <FocusContext.Provider value={{ focusPath, addFocus, removeFocus }}>
      <div ref={answerContainerRef} onClick={handleContainerClick} data-node-id={`answer-${ans.id}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg">{ans.author} 的解答</h3>
            <button onClick={handleAnswerLike} className={`transition-colors ${answerLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`} title="有价值">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); cutMode ? handleCancelCut() : handleEnterCutMode(); }}
              className={`text-sm px-3 py-1 rounded transition-colors ${cutMode ? 'bg-gray-700 text-white font-semibold' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
              {cutMode ? '取消续写' : '续写'}
            </button>
          </div>
        </div>
        <div ref={answerTextRef} onContextMenu={handleContextMenu} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ touchAction: 'manipulation' }}>
          {ans.overallThought && (
            <div className="bg-gray-100 p-3 rounded mb-3" dangerouslySetInnerHTML={{ __html: `<strong>整体思路：</strong>${renderLatexToHTML(ans.overallThought)}` }} />
          )}
          <div className="answer-text-container" data-node-id={`answer-${ans.id}`} style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: renderLatexToHTML(ans.content, answerCutAfterIdx) }} />
        </div>
        {touchMenu.visible && <div className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 px-0" style={{ left: touchMenu.x, top: touchMenu.y, transform: 'translate(-50%, -100%)' }}>
          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={handleTouchMenuQuote}>引用</button>
          <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeTouchMenu}>取消</button>
        </div>}
        {isAnswerCutPoint && showForm && (
          <div style={{ marginTop: 8, padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fff' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium mb-2">续写动机 *</div>
            <LatexPreviewGroup value={formMotivation} onChange={(e) => setFormMotivation(e.target.value)} rows={2} placeholder="为什么要续写这一步？" showPreview={showPreview} />
            <div className="text-sm font-medium mb-2">续写内容 *</div>
            <LatexPreviewGroup value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={4} placeholder="写下你的续写/改写步骤..." showPreview={showPreview} />
            <div className="flex gap-2 mt-2"><button onClick={handleSubmitForm} className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900">提交续写</button><button onClick={handleCancelForm} className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300">取消</button></div>
          </div>
        )}
        {ans.continuations && ans.continuations.length > 0 && (
          <ul style={{ paddingLeft: 0, marginTop: 12 }}>
            {ans.continuations.map((cont) => (
              <ContinuationNode key={cont.id} cont={cont} depth={0} ancestorIds={[]} foldState={foldState} toggleFold={toggleFold}
                cutTarget={cutTarget} showForm={showForm} formMotivation={formMotivation} formContent={formContent}
                onFormMotivationChange={setFormMotivation} onFormContentChange={setFormContent}
                onSubmitForm={handleSubmitForm} onCancelForm={handleCancelForm} exerciseId={exerciseId} answerId={ans.id}
                currentUser={user} bookType={bookType} onQuoteText={handleQuote} />
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-400 mt-2">选中文字后右键即可引用并追问</p>
        {exerciseComments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <CommentTree comments={exerciseComments} questionId={null} thoughtId={null} onReply={handleReply} onQuoteClick={handleQuoteClick} onDelete={handleCommentPosted} currentUser={user} deleteComment={handleDeleteExerciseComment} />
          </div>
        )}
        {showCommentInput && (
          <div ref={commentInputRef} className="mt-4">
            <CommentInput questionId={null} thoughtId={null} quoteText={quoteText} quoteStart={quoteStart} quoteEnd={quoteEnd} parentId={replyParentId} replyingTo={replyAuthor} onCommentPosted={handleCommentPosted} onClearQuote={() => { setShowCommentInput(false); setQuoteText(''); }} onClearReply={() => { setReplyParentId(null); setReplyAuthor(''); }} onSubmit={handleExerciseCommentSubmit} showPreview={showPreview} />
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}