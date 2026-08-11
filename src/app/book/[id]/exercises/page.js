'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ExerciseDetail from '@/components/ExerciseDetail';
import ExerciseSidebarItem from '@/components/ExerciseSidebarItem';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';
import LoadingDots from '@/components/LoadingDots';
import ExportTexButton from '@/components/ExportTexButton';

function ExercisesContent() {
  const { id: bookId } = useParams();
  const searchParams = useSearchParams();
  const nodeId = searchParams.get('nodeId');
  const router = useRouter();
  const { requireLogin } = useAuth();

  const [exercises, setExercises] = useState([]);
  const [bookType, setBookType] = useState('science');
  const [sectionTitle, setSectionTitle] = useState('习题');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // 初始值会在 useEffect 中根据屏幕宽度调整
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [showAddExercise, setShowAddExercise] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [formError, setFormError] = useState('');

  const [sidebarWidth, setSidebarWidth] = useState(288);
  const resizingRef = useRef(false);
  const deepExerciseId = searchParams.get('exerciseId');

  useEffect(() => {
    if (!deepExerciseId) return;
    setSelectedExerciseId(deepExerciseId);
    setShowAddExercise(false);
  }, [deepExerciseId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('thinkfield-exercises-sidebar-width');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 220 && n <= 560) setSidebarWidth(n);
      }
    } catch { /* ignore */ }
  }, []);

  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!resizingRef.current) return;
      setSidebarWidth(Math.min(560, Math.max(220, ev.clientX)));
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth((w) => {
        try {
          localStorage.setItem('thinkfield-exercises-sidebar-width', String(w));
        } catch { /* ignore */ }
        return w;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  // 根据屏幕宽度初始化侧边栏状态，并监听窗口变化
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    handleResize(); // 立即执行一次
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const findNodeAndPath = (tree, targetId, path = []) => {
    for (const node of tree) {
      if (node.id === targetId) return { node, path: [...path, node] };
      if (node.children && node.children.length > 0) {
        const result = findNodeAndPath(node.children, targetId, [...path, node]);
        if (result) return result;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!bookId || !nodeId) return;
    fetch(`/api/books/${bookId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
        setBookType(data.type || 'science');
        const found = findNodeAndPath(data.tree || [], nodeId);
        if (found) {
          setSectionTitle(found.node.title + ' 习题');
        }
      })
      .catch((e) => setLoadError(e.message));
  }, [bookId, nodeId]);

  const fetchExercises = () => {
    if (!bookId || !nodeId) {
      setLoadError('缺少章节参数');
      setLoading(false);
      return;
    }
    fetch(`/api/exercises?bookId=${bookId}&nodeId=${nodeId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
        setExercises(Array.isArray(data) ? data : []);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExercises();
  }, [bookId, nodeId]);

  const handleAddExercise = async () => {
    if (!requireLogin()) return;
    if (!newTitle.trim()) return setFormError('请输入习题题目');
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, nodeId, title: newTitle, content: newContent }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setNewTitle('');
      setNewContent('');
      setShowAddExercise(false);
      setFormError('');
      const refreshed = await fetch(`/api/exercises?bookId=${bookId}&nodeId=${nodeId}`)
        .then(r => r.json());
      const list = Array.isArray(refreshed) ? refreshed : [];
      setExercises(list);
      const newExercise = list.find(e => e.id === data.id);
      if (newExercise) {
        setSelectedExerciseId(newExercise.id);
      } else if (list.length > 0) {
        setSelectedExerciseId(list[list.length - 1].id);
      }
    } catch (e) {
      setFormError(e.message);
    }
  };

  const navigate = (url) => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    router.push(url);
  };

  const handleBackToDiscussion = () => {
    navigate(`/book/${bookId}/section/${nodeId}`);
  };

  if (loading) return <div className="p-8 flex justify-center"><LoadingDots /></div>;
  if (loadError) return <div className="p-8 text-sm text-red-500 text-center">数据加载失败，请稍后重试</div>;

  const showPreview = bookType !== 'literature';

  return (
    <div className="fixed inset-0 z-10 flex overflow-hidden bg-white">
      {/* 手机端顶部栏 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
        <button onClick={() => setSidebarOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200" title="打开列表">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
          </svg>
        </button>
        <h2 className="text-sm font-medium text-gray-800 truncate flex-1 text-center px-2">{sectionTitle}</h2>
        <button
          onClick={handleBackToDiscussion}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
          title="返回讨论区"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-5h2v5a1 1 0 001 1h4a1 1 0 001-1V10" />
          </svg>
        </button>
      </div>

      {/* 手机端抽屉侧边栏 */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-white shadow-2xl h-full overflow-y-auto animate-slide-in flex flex-col">
            <button
              onClick={() => { handleBackToDiscussion(); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-5h2v5a1 1 0 001 1h4a1 1 0 001-1V10" />
              </svg>
              <span>返回讨论区</span>
            </button>
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <h2 className="text-sm font-medium text-gray-800 flex-1 truncate">{sectionTitle || '习题列表'}</h2>
              {nodeId && <ExportTexButton mode="section" bookId={bookId} nodeId={nodeId} variant="icon" />}
              <button
                onClick={() => setSidebarOpen(false)}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
                title="收起边栏"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-2 border-b border-gray-200">
              <button onClick={() => { setShowAddExercise(true); setSelectedExerciseId(null); setSidebarOpen(false); }} className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 px-2 py-2 rounded">
                ＋ 添加习题
              </button>
            </div>
            <div className="p-4 flex-1">
              {exercises.length === 0 ? (
                <p className="text-sm text-gray-400">暂无习题</p>
              ) : (
                <div className="space-y-1">
                  {exercises.map(ex => (
                    <ExerciseSidebarItem
                      key={ex.id}
                      exercise={ex}
                      selected={selectedExerciseId === ex.id}
                      onClick={() => { setShowAddExercise(false); setSelectedExerciseId(ex.id); setSidebarOpen(false); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 桌面端侧边栏 */}
      {sidebarOpen ? (
        <div
          className="hidden md:flex border-r border-gray-200 flex-col h-full overflow-hidden bg-white relative flex-shrink-0"
          style={{ width: sidebarWidth }}
        >
          <button
            onClick={handleBackToDiscussion}
            className="w-full flex items-center gap-2 px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-200 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-5h2v5a1 1 0 001 1h4a1 1 0 001-1V10" />
            </svg>
            <span>返回讨论区</span>
          </button>
          <div className="p-4 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <h2 className="text-sm font-medium text-gray-800 flex-1 truncate">{sectionTitle || '习题列表'}</h2>
            {nodeId && <ExportTexButton mode="section" bookId={bookId} nodeId={nodeId} variant="icon" />}
            <button
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="收起边栏"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <button onClick={() => { setShowAddExercise(true); setSelectedExerciseId(null); }} className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 px-2 py-2 rounded transition-colors">
              ＋ 添加习题
            </button>
          </div>
          <div className="flex-1 min-h-0 scroll-container p-4 pb-8" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}>
            {exercises.length === 0 ? (
              <p className="text-sm text-gray-400">暂无习题</p>
            ) : (
              <div className="space-y-1">
                {exercises.map(ex => (
                  <ExerciseSidebarItem
                    key={ex.id}
                    exercise={ex}
                    selected={selectedExerciseId === ex.id}
                    onClick={() => { setShowAddExercise(false); setSelectedExerciseId(ex.id); }}
                  />
                ))}
              </div>
            )}
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="拖拽调整边栏宽度"
            onMouseDown={onResizeStart}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-20 hover:bg-gray-300/80 active:bg-gray-400/80"
            title="拖拽调整宽度"
          />
        </div>
      ) : (
        <div className="hidden md:flex w-12 flex-shrink-0 border-r border-gray-200 bg-white pt-3 flex-col items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            title="打开边栏"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            </svg>
          </button>
          {nodeId && <ExportTexButton mode="section" bookId={bookId} nodeId={nodeId} variant="icon" />}
        </div>
      )}

      {/* 右侧内容区 */}
      <div className="flex-1 min-h-0 scroll-container p-4 md:p-8 pb-8 pt-14 md:pt-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}>
        {showAddExercise ? (
          <div className="max-w-xl mx-auto">
            <h2 className="text-lg font-medium text-gray-800 mb-4">添加新习题</h2>
            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
            <LatexPreviewGroup value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="习题题目" rows={3} showPreview={showPreview} />
            <input value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="来源（选填）" className="w-full border border-gray-200 p-3 rounded-md mb-4 text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
            <div className="flex gap-3">
              <button onClick={handleAddExercise} className="bg-gray-800 text-white px-6 py-2.5 rounded-md text-sm hover:bg-gray-900 transition-colors">发布</button>
              <button onClick={() => { setShowAddExercise(false); setFormError(''); }} className="text-gray-500 text-sm hover:text-gray-700 transition-colors">取消</button>
            </div>
          </div>
        ) : selectedExerciseId ? (
          <ExerciseDetail exerciseId={selectedExerciseId} bookType={bookType} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">请从左侧选择一道习题</div>
        )}
      </div>
    </div>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><LoadingDots /></div>}>
      <ExercisesContent />
    </Suspense>
  );
}