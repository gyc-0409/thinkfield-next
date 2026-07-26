'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ExerciseDetail from '@/components/ExerciseDetail';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';
import { renderLatexToHTML } from '@/lib/renderLatex';

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
  const [sidebarOpen, setSidebarOpen] = useState(false); // 手机端默认不弹出
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [showAddExercise, setShowAddExercise] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [formError, setFormError] = useState('');

  const [tocGlow, setTocGlow] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const clicked = localStorage.getItem('thinkfield-toc-clicked');
    if (!clicked) setTocGlow(true);
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
      .then(r => r.json())
      .then(data => {
        setBookType(data.type || 'science');
        const found = findNodeAndPath(data.tree || [], nodeId);
        if (found) {
          setSectionTitle(found.node.title + ' 习题');
        }
      })
      .catch(() => {});
  }, [bookId, nodeId]);

  const fetchExercises = () => {
    if (!bookId || !nodeId) return;
    fetch(`/api/exercises?bookId=${bookId}&nodeId=${nodeId}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setExercises(list);
      })
      .catch(console.error)
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

  const handleTocClick = () => {
    localStorage.setItem('thinkfield-toc-clicked', '1');
    setTocGlow(false);
    navigate(`/book/${bookId}/section/${nodeId}`);
  };

  if (loading) return <p className="p-8 text-gray-500">加载中...</p>;

  const showPreview = bookType !== 'literature';

  return (
    <div className="fixed inset-0 z-10 flex overflow-hidden bg-white">
      {/* 手机端顶部栏：只保留节名习题和返回按钮 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-medium text-gray-800 truncate flex-1 text-center">{sectionTitle}</h2>
        <button
          onClick={handleTocClick}
          className={`text-gray-400 hover:text-gray-600 p-1 ${tocGlow ? 'btn-glow' : ''}`}
          title="返回讨论"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 桌面端侧边栏（原有风格） */}
      <div className={`hidden md:flex ${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-200 border-r border-gray-200 flex-col h-full overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-800">习题列表</h2>
          <button
            onClick={handleTocClick}
            className={`text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md p-1 transition-colors ${tocGlow ? 'btn-glow' : ''}`}
            title="返回讨论"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-2 border-b border-gray-100 space-y-1">
          <button onClick={() => { setShowAddExercise(true); setSelectedExerciseId(null); }} className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 px-2 py-1 rounded">
            + 添加习题
          </button>
        </div>
        <div className="flex-1 min-h-0 scroll-container p-4 pb-8" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}>
          {exercises.length === 0 ? (
            <p className="text-sm text-gray-400">暂无习题</p>
          ) : (
            <div className="space-y-1">
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => { setShowAddExercise(false); setSelectedExerciseId(ex.id); }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${selectedExerciseId === ex.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className="truncate" dangerouslySetInnerHTML={{ __html: renderLatexToHTML(ex.title) }} />
                  <div className="text-xs text-gray-400 mt-0.5">{ex.answers?.length || 0} 个解答</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 桌面端折叠按钮 */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex h-10 w-6 bg-gray-100 hover:bg-gray-200 items-center justify-center text-gray-500 text-xs flex-shrink-0">
        {sidebarOpen ? '<' : '>'}
      </button>

      {/* 右侧内容区 */}
      <div className="flex-1 min-h-0 scroll-container p-4 md:p-8 pb-8" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}>
        {showAddExercise ? (
          <div className="max-w-xl mx-auto pt-10 md:pt-0">
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
    <Suspense fallback={<p className="p-8 text-gray-500">加载中...</p>}>
      <ExercisesContent />
    </Suspense>
  );
}