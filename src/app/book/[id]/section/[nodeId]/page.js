'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import QuestionDetail from '@/components/QuestionDetail';
import BookTree from '@/components/BookTree';
import LatexPreviewGroup from '@/components/LatexPreviewGroup';
import { renderLatexToHTML } from '@/lib/renderLatex';
import AuthorLink from '@/components/AuthorLink';

function SectionContent() {
  const { id: bookId, nodeId } = useParams();
  const searchParams = useSearchParams();
  const deepQuestionId = searchParams.get('q');
  const deepThoughtId = searchParams.get('t');
  const router = useRouter();
  const { user, requireLogin } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [book, setBook] = useState(null);
  const [nodePath, setNodePath] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState(deepQuestionId || null);
  const [showNewDiscussion, setShowNewDiscussion] = useState(!deepQuestionId);
  const [discussionType, setDiscussionType] = useState('question');
  const [showChapterPanel, setShowChapterPanel] = useState(false);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [pageRange, setPageRange] = useState('');
  const [thought, setThought] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [tocGlow, setTocGlow] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const resizingRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('thinkfield-section-sidebar-width');
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
          localStorage.setItem('thinkfield-section-sidebar-width', String(w));
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

  useEffect(() => {
    const clicked = localStorage.getItem('thinkfield-toc-clicked');
    if (!clicked) setTocGlow(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!deepQuestionId) return;
    setSelectedQuestionId(deepQuestionId);
    setShowNewDiscussion(false);
  }, [deepQuestionId]);

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

  const fetchQuestions = async (sectionNodeId) => {
    try {
      const res = await fetch(`/api/questions?bookId=${bookId}&nodeId=${sectionNodeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e.message);
    }
  };

  useEffect(() => {
    if (!bookId || !nodeId) return;
    setLoadError(null);
    fetch(`/api/books/${bookId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
        setBook(data);
        const found = findNodeAndPath(data.tree || [], nodeId);
        if (found) {
          setCurrentNode(found.node);
          setNodePath(found.path);
          fetchQuestions(nodeId);
        } else {
          alert('小节不存在，返回上一页');
          router.push(`/book/${bookId}`);
        }
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [bookId, nodeId]);

  const handleDeleteQuestion = async (questionId) => {
    if (!requireLogin()) return;
    if (!confirm('确定删除此讨论吗？')) return;
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      fetchQuestions(nodeId);
      if (selectedQuestionId === questionId) {
        setSelectedQuestionId(null);
        setShowNewDiscussion(true);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <p className="p-8 text-gray-500">加载中...</p>;
  if (loadError) return <p className="p-8 text-red-500">数据加载失败，请稍后重试</p>;

  const handleNewDiscussion = () => {
    setShowNewDiscussion(true);
    setSelectedQuestionId(null);
    setDiscussionType('question');
    clearForm();
  };

  const handleSelectQuestion = (questionId) => {
    setSelectedQuestionId(questionId);
    setShowNewDiscussion(false);
  };

  const clearForm = () => {
    setTitle('');
    setLocation('');
    setPageRange('');
    setThought('');
    setFormError('');
  };

  const handleSubmit = async () => {
    if (!requireLogin()) return;
    if (!location.trim()) return setFormError('请输入具体位置');
    if (discussionType === 'question' && !title.trim()) return setFormError('请输入你的疑问');
    if (!thought.trim()) return setFormError('请输入你的思考');

    const page = pageRange.trim();
    if (page && !/^\d+(-\d+)?$/.test(page)) {
      return setFormError('请输入正确的页码格式，如 25 或 30-35');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId, nodeId,
          title: discussionType === 'question' ? title : `关于"${location}"的见解`,
          thought, location,
          page_range: pageRange,
          type: discussionType,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await fetchQuestions(nodeId);
      const refreshed = await fetch(`/api/questions?bookId=${bookId}&nodeId=${nodeId}`)
        .then(r => r.json());
      const list = Array.isArray(refreshed) ? refreshed : [];
      if (list.length > 0) setSelectedQuestionId(list[list.length - 1].id);
      setShowNewDiscussion(false);
      clearForm();
    } catch (e) {
      setFormError(e.message);
    }
    setSubmitting(false);
  };

  const navigate = (url) => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    router.push(url);
  };

  const handleLeafSelect = (leafNode) => {
    setShowChapterPanel(false);
    navigate(`/book/${bookId}/section/${leafNode.id}`);
  };

  const handleGoHome = () => {
    setShowChapterPanel(false);
    navigate('/');
  };

  const handleTocClick = () => {
    localStorage.setItem('thinkfield-toc-clicked', '1');
    setTocGlow(false);
    setShowChapterPanel(true);
  };

  const sectionTitle = nodePath.length > 0 ? nodePath[nodePath.length - 1].title : (currentNode?.title || '未知小节');
  const showPreview = book?.type !== 'literature';

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
        <button onClick={handleGoHome} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200" title="返回主页">
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
              onClick={() => { handleGoHome(); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-5h2v5a1 1 0 001 1h4a1 1 0 001-1V10" />
              </svg>
              <span>返回主页</span>
            </button>
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <h2 className="text-sm font-medium text-gray-800 truncate flex-1">{sectionTitle}</h2>
              <button onClick={() => setSidebarOpen(false)} className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200" title="收起边栏">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="border-b border-gray-200">
              <button
                onClick={() => { handleTocClick(); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100 ${tocGlow ? 'btn-glow' : ''}`}
              >
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
                <span className="flex-1 text-left">目录</span>
              </button>
              <button onClick={() => { handleNewDiscussion(); setSidebarOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="flex-1 text-left">讨论区</span>
                <span className="text-xl font-light text-gray-500 leading-none">+</span>
              </button>
              <button onClick={() => { navigate(`/book/${bookId}/exercises?nodeId=${nodeId}`); setSidebarOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="flex-1 text-left">习题区</span>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex-1">
              {questions.length === 0 ? (
                <p className="text-sm text-gray-400">暂无讨论</p>
              ) : (
                <div className="space-y-1">
                  {questions.map(q => (
                    <div
                      key={q.id}
                      role="button"
                      tabIndex={0}
                      title={q.title}
                      onClick={() => { handleSelectQuestion(q.id); setSidebarOpen(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectQuestion(q.id); setSidebarOpen(false); } }}
                      className={`group w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer ${selectedQuestionId === q.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 truncate">
                          <span dangerouslySetInnerHTML={{ __html: renderLatexToHTML(q.title) }} />
                        </div>
                        {user && q.author === user && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} className="text-gray-300 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="删除">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        <AuthorLink author={q.author} className="text-gray-400" />
                        {' '}· {q.replies} 回复{q.page_range ? ` · 页码 ${q.page_range}` : ''}
                      </div>
                    </div>
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
            onClick={handleGoHome}
            className="w-full flex items-center gap-2 px-4 py-3.5 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-200 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-5h2v5a1 1 0 001 1h4a1 1 0 001-1V10" />
            </svg>
            <span>返回主页</span>
          </button>
          <div className="p-4 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
            <h2 className="text-sm font-medium text-gray-800 truncate flex-1">{sectionTitle}</h2>
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
          <div className="border-b border-gray-200 flex-shrink-0">
            <button
              onClick={handleTocClick}
              className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100 transition-colors ${tocGlow ? 'btn-glow' : ''}`}
            >
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              <span className="flex-1 text-left">目录</span>
            </button>
            <button onClick={handleNewDiscussion} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100 transition-colors">
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="flex-1 text-left">讨论区</span>
              <span className="text-xl font-light text-gray-500 leading-none">+</span>
            </button>
            <button onClick={() => navigate(`/book/${bookId}/exercises?nodeId=${nodeId}`)} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="flex-1 text-left">习题区</span>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 scroll-container p-4 pb-8" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-400">暂无讨论</p>
            ) : (
              <div className="space-y-1">
                {questions.map(q => (
                  <div
                    key={q.id}
                    role="button"
                    tabIndex={0}
                    title={q.title}
                    onClick={() => handleSelectQuestion(q.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectQuestion(q.id); } }}
                    className={`group w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer ${selectedQuestionId === q.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0 truncate">
                        <span dangerouslySetInnerHTML={{ __html: renderLatexToHTML(q.title) }} />
                      </div>
                      {user && q.author === user && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} className="text-gray-300 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="删除">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      <AuthorLink author={q.author} className="text-gray-400" />
                      {' '}· {q.replies} 回复{q.page_range ? ` · 页码 ${q.page_range}` : ''}
                    </div>
                  </div>
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
        <div className="hidden md:flex w-12 flex-shrink-0 border-r border-gray-200 bg-white pt-3 justify-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="打开边栏"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* 右侧内容区 */}
      <div className="flex-1 min-h-0 scroll-container p-4 md:p-8 pb-8 relative pt-14 md:pt-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 92%, transparent 100%)' }}>
        {showNewDiscussion ? (
          <div className="max-w-xl mx-auto">
            <h2 className="text-lg font-medium text-gray-800 mb-6">发起新讨论</h2>
            <div className="flex gap-3 mb-6">
              <button onClick={() => { setDiscussionType('question'); clearForm(); }} className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${discussionType === 'question' ? 'bg-gray-200 text-gray-900 ring-1 ring-gray-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-150'}`}>提出疑问</button>
              <button onClick={() => { setDiscussionType('insight'); clearForm(); }} className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${discussionType === 'insight' ? 'bg-gray-200 text-gray-900 ring-1 ring-gray-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-150'}`}>分享见解</button>
            </div>
            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

            <input
              value={pageRange}
              onChange={e => setPageRange(e.target.value)}
              placeholder="页码（如 25 或 30-35）"
              className="w-full border border-gray-200 p-3 rounded-md mb-3 text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
            />

            <LatexPreviewGroup
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={'本页中的具体位置（必填）。例如：定理2.1的证明中\u201C由极限定义可知...\u201D'}
              rows={2}
              showPreview={showPreview}
            />

            {discussionType === 'question' && (
              <LatexPreviewGroup value={title} onChange={e => setTitle(e.target.value)} placeholder="你的疑问" rows={3} showPreview={showPreview} />
            )}
            <LatexPreviewGroup value={thought} onChange={e => setThought(e.target.value)} placeholder="我的思考" rows={5} showPreview={showPreview} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleSubmit} disabled={submitting} className="bg-gray-800 text-white px-6 py-2.5 rounded-md text-sm hover:bg-gray-900 transition-colors">发布</button>
              <button onClick={() => { setShowNewDiscussion(false); clearForm(); }} className="text-gray-500 text-sm hover:text-gray-700 transition-colors">取消</button>
            </div>
          </div>
        ) : selectedQuestionId ? (
          <QuestionDetail questionId={selectedQuestionId} bookType={book?.type} initialThoughtId={deepThoughtId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">请从左侧选择一个讨论</div>
        )}
      </div>

      {showChapterPanel && (
        <div className="absolute inset-0 z-20 flex">
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowChapterPanel(false)} />
          <div className="relative w-72 bg-white shadow-2xl h-full overflow-y-auto z-30 animate-slide-in">
            <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-sm font-medium text-gray-800 truncate flex-1">{book?.title || ''}</h3>
                <button
                  type="button"
                  onClick={() => setShowChapterPanel(false)}
                  className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                  title="关闭目录"
                  aria-label="关闭目录"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <BookTree tree={book?.tree || []} onSelectLeaf={handleLeafSelect} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SectionPage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-500">加载中...</p>}>
      <SectionContent />
    </Suspense>
  );
}