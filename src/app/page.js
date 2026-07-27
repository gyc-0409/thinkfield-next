'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UserBooksGrid from '@/components/UserBooksGrid';
import AuthModal from '@/components/AuthModal';
import AdminPanel from '@/components/AdminPanel';
import AddBookModal from '@/components/AddBookModal';

export default function HomePage() {
  const { user, logout, role } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [hotBooks, setHotBooks] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);

  // 检查 URL 参数，自动打开登录弹窗
useEffect(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') {
      setShowAuthModal(true);
    }
    if (params.get('addBook') === '1') {
      setShowAddBook(true);
    }
    // 清除参数
    const url = new URL(window.location.href);
    url.searchParams.delete('login');
    url.searchParams.delete('addBook');
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
}, []);

  useEffect(() => {
    fetch('/api/books/hot')
      .then(r => r.json())
      .then(data => setHotBooks(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* 顶部导航 */}
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 bg-white">
        {user ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowAddBook(true)}
              className="text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1 rounded transition-colors"
            >
              + 添加书籍
            </button>
            {(role === 'admin' || role === 'moderator') && (
              <button onClick={() => setShowAdmin(true)} className="text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1 rounded">
                管理后台
              </button>
            )}
            <span className="text-sm text-gray-600">{user}</span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">退出</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-sm bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 transition-colors"
            >
              登录
            </button>
          </div>
        )}
      </div>

      {/* 主体区域 */}
      <div className="flex flex-col items-center pt-12 sm:pt-20 pb-8 sm:pb-16 px-4">
        {/* 标题 */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-gray-800 tracking-wide">思辨场</h1>
        </div>

        {/* 搜索栏 */}
        <form onSubmit={handleSearch} className="w-full max-w-xl mb-4 sm:mb-6">
          <div className="flex items-center border-2 border-gray-200 rounded-full bg-white focus-within:border-gray-400 transition-colors">
            <button type="submit" className="pl-4 sm:pl-5 pr-2 sm:pr-3 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索书籍..."
              className="flex-1 h-10 sm:h-14 pr-4 sm:pr-6 bg-transparent border-none text-base sm:text-lg text-gray-700 focus:outline-none"
            />
          </div>
        </form>

        {/* 最近热搜 */}
        <div className="w-full max-w-xl mb-2 text-sm sm:text-base">
          <span className="text-sm text-gray-400 mr-2 sm:mr-3">最近热搜</span>
          <div className="inline-flex flex-wrap gap-x-4 gap-y-1">
            {hotBooks.slice(0, 3).map((book, index) => (
              <span
                key={book.id}
                onClick={() => router.push(`/book/${book.id}`)}
                className={`inline-block text-sm cursor-pointer hover:text-gray-600 transition-colors ${
                  index < 3 ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                {book.title}
              </span>
            ))}
            {hotBooks.length === 0 && (
              <span className="text-sm text-gray-300">暂无数据</span>
            )}
          </div>
        </div>

        {/* 继续讨论 */}
        {user && (
          <div className="w-full max-w-4xl mt-10 sm:mt-16">
            <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4 sm:mb-5">继续讨论</h2>
            <UserBooksGrid />
          </div>
        )}

        {/* 讨论榜 TOP5 */}
        {hotBooks.length > 0 && (
          <div className="w-full max-w-4xl mt-10 sm:mt-16">
            <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4 sm:mb-5">讨论榜 TOP5</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {hotBooks.slice(0, 5).map(book => (
                <div
                  key={book.id}
                  onClick={() => router.push(`/book/${book.id}`)}
                  className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  <div className="h-2 bg-gray-800" />
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 mb-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{book.author}</p>
                    <p className="text-xs text-blue-600 mt-2 font-medium">{book.discussions} 讨论</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 分类 */}
        <div className="w-full max-w-4xl mt-10 sm:mt-16">
          <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4 sm:mb-5">分类</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div
              onClick={() => router.push('/category/literature')}
              className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
            >
              <div className="h-2 bg-gray-700" />
              <div className="p-4 sm:p-6 text-center">
                <span className="text-xl sm:text-2xl font-light text-gray-800">文学</span>
                <p className="text-sm text-gray-500 mt-1">文学书籍</p>
              </div>
            </div>
            <div
              onClick={() => router.push('/category/science')}
              className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
            >
              <div className="h-2 bg-gray-500" />
              <div className="p-4 sm:p-6 text-center">
                <span className="text-xl sm:text-2xl font-light text-gray-800">理学</span>
                <p className="text-sm text-gray-500 mt-1">理学书籍</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 登录/注册模态框 */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {/* 管理后台 */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {/* 添加书籍 */}
      {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} />}
    </div>
  );
}