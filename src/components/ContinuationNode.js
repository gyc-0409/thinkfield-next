'use client';
import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/context/AuthContext';
import { renderLatexToHTML } from '@/lib/renderLatex';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';
import ContinuationPositionHint from '@/components/ContinuationPositionHint';
import FocusTruncatedContent from '@/components/FocusTruncatedContent';
import { resolveContextMenuQuote } from '@/lib/quoteSelection';
import { normalizeLikedBy } from '@/lib/likedBy';
import AuthorLink from '@/components/AuthorLink';

export const FocusContext = createContext();
export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus 必须在 FocusProvider 内部使用');
  return ctx;
}

export default function ContinuationNode({
  cont, depth, ancestorIds, parentContent, foldState, toggleFold,
  cutTarget, showForm, formMotivation, formContent,
  onFormMotivationChange, onFormContentChange,
  onSubmitForm, onCancelForm, exerciseId,
  currentUser, bookType, onQuoteText, onContinuationLike,
}) {
  const nodeId = `cont-${cont.id}`;
  const { focusPath, addFocus, removeFocus } = useFocus();
  const isFocused = focusPath.includes(cont.id);
  const { requireLogin } = useAuth();
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [touchMenu, setTouchMenu] = useState({ visible: false, x: 0, y: 0, startIdx: null, endIdx: null, text: '' });
  const longPressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const [liked, setLiked] = useState(() => normalizeLikedBy(cont.liked_by).includes(currentUser));
  const [likes, setLikes] = useState(cont.likes || 0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setLiked(normalizeLikedBy(cont.liked_by).includes(currentUser));
    setLikes(cont.likes || 0);
  }, [cont, currentUser]);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showForm]);

  const isVisible = focusPath.length === 0 || ancestorIds.some(id => focusPath.includes(id)) || isFocused;
  const isCutPoint = cutTarget?.nodeId === nodeId && cutTarget?.start != null;
  let cutAfterIdx;
  let focusExitId = null;
  if (isCutPoint && showForm) {
    cutAfterIdx = cutTarget.start;
  } else if (isFocused) {
    const idxInPath = focusPath.indexOf(cont.id);
    if (idxInPath !== -1 && idxInPath < focusPath.length - 1) {
      const nextFocusedId = focusPath[idxInPath + 1];
      const childCont = cont.continuations?.find(c => c.id === nextFocusedId);
      if (childCont) {
        cutAfterIdx = childCont.start;
        focusExitId = nextFocusedId;
      }
    }
  }

  const handleFocusFromPosition = (e) => {
    e.stopPropagation();
    addFocus(cont.id, ancestorIds);
  };
  const handleLike = async (e) => {
    e.stopPropagation();
    if (!requireLogin()) return;
    const wasLiked = liked;
    const nextLiked = !wasLiked;
    setLiked(nextLiked);
    setLikes((prev) => (wasLiked ? Math.max(prev - 1, 0) : prev + 1));
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/continuations/${cont.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        onContinuationLike?.(cont.id, { likes: data.likes, liked: nextLiked });
      } else {
        setLiked(wasLiked);
        setLikes((prev) => (wasLiked ? prev + 1 : Math.max(prev - 1, 0)));
      }
    } catch {
      setLiked(wasLiked);
      setLikes((prev) => (wasLiked ? prev + 1 : Math.max(prev - 1, 0)));
    }
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
    const quoted = resolveContextMenuQuote(e, e.currentTarget, cont.content);
    if (!quoted) return;
    e.preventDefault();
    e.stopPropagation();
    onQuoteText?.(quoted.quoteText, quoted.start, quoted.end);
  };

  if (!isVisible) return null;
  const showPreview = bookType !== 'literature';

  return (
    <li style={{ marginBottom: isMobile ? 8 : 12 }}>
      <div ref={containerRef} data-node-id={nodeId}
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: isMobile ? 8 : 12, marginLeft: isMobile ? depth * 12 : depth * 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 4 : 6, gap: 8, flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span style={{ cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: isMobile ? '0.875rem' : '1rem' }}
              onClick={() => toggleFold(cont.id)}>
              <AuthorLink author={cont.author} className="text-inherit font-semibold" stopPropagation />
              的续写
            </span>
            {cont.start != null && parentContent && (
              <ContinuationPositionHint
                content={parentContent}
                start={cont.start}
                onClick={handleFocusFromPosition}
              />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexShrink: 0 }}>
            <button onTouchEnd={(e) => { e.preventDefault(); handleLike(e); }} onClick={handleLike}
              className={`${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`} title="有价值">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
            </button>
          </div>
        </div>
        {!foldState[cont.id] && (
          <>
            {cont.motivation && (
              <div style={{ background: '#f3f4f6', padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: isMobile ? 13 : 14 }}
                dangerouslySetInnerHTML={{ __html: `<span style="font-weight:600;color:#374151">动机：</span>${renderLatexToHTML(cont.motivation)}` }} />
            )}
            <FocusTruncatedContent
              content={cont.content}
              cutAfterIdx={cutAfterIdx}
              focusExitId={focusExitId}
              onExitFocus={removeFocus}
              nodeId={nodeId}
              style={{ marginLeft: isMobile ? 4 : 8, marginBottom: 8, fontSize: isMobile ? '0.875rem' : 'inherit', touchAction: 'manipulation' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={handleContextMenu}
            />
            {touchMenu.visible && (
              <div className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg py-1 px-0" style={{ left: touchMenu.x, top: touchMenu.y, transform: 'translate(-50%, -100%)' }}>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={handleTouchMenuQuote}>引用</button>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={closeTouchMenu}>取消</button>
              </div>
            )}
            {cutTarget?.nodeId === nodeId && showForm && (
              <div ref={formRef} style={{ marginLeft: isMobile ? 4 : 8, marginTop: 8, padding: isMobile ? 8 : 12, border: '1px solid #ddd', borderRadius: 6, background: '#fff' }} onClick={(e) => e.stopPropagation()}>
                <ContinuationPositionHint content={cutTarget.sourceContent} start={cutTarget.start} />
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
                  <ContinuationNode key={sub.id} cont={sub} depth={depth + 1} ancestorIds={[...ancestorIds, cont.id]} parentContent={cont.content} foldState={foldState} toggleFold={toggleFold}
                    cutTarget={cutTarget} showForm={showForm} formMotivation={formMotivation} formContent={formContent}
                    onFormMotivationChange={onFormMotivationChange} onFormContentChange={onFormContentChange}
                    onSubmitForm={onSubmitForm} onCancelForm={onCancelForm} exerciseId={exerciseId}
                    currentUser={currentUser} bookType={bookType} onQuoteText={onQuoteText} onContinuationLike={onContinuationLike} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}
