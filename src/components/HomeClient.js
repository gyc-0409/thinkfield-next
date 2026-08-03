'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UserBooksGrid from '@/components/UserBooksGrid';
import AuthModal from '@/components/AuthModal';
import AdminPanel from '@/components/AdminPanel';
import AddBookModal from '@/components/AddBookModal';

export default function HomeClient({ initialHotBooks = [], hotBooksError: initialError = null }) {
  const { user, logout, role } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [hotBooks, setHotBooks] = useState(initialHotBooks);
  const [hotBooksError, setHotBooksError] = useState(initialError);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === '1') setShowAuthModal(true);
      if (params.get('addBook') === '1') setShowAddBook(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('addBook');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (initialHotBooks.length > 0 || initialError) return;
    fetch('/api/books/hot')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
        setHotBooks(Array.isArray(data) ? data : []);
      })
      .catch((e) => setHotBooksError(e.message));
  }, [initialHotBooks.length, initialError]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 bg-white">
        {user ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button onClick={() => setShowAddBook(true)} className="text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1 rounded transition-colors">
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
            <button onClick={() => setShowAuthModal(true)} className="text-sm bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 transition-colors">
              登录
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center pt-12 sm:pt-20 pb-8 sm:pb-16 px-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
          <img src="/favicon.ico" alt="站点图标" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
          <h1 className="text-2xl sm:text-3xl font-light text-gray-800 tracking-wide">思辨场</h1>
        </div>

        <form onSubmit={handleSearch} className="w-full max-w-xl mb-4 sm:mb-6">
          <div className="flex items-center border-2 border-gray-200 rounded-full bg-white focus-within:border-gray-400 transition-colors">
            <button type="submit" className="pl-4 sm:pl-5 pr-2 sm:pr-3 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索书籍..." className="flex-1 h-10 sm:h-14 pr-4 sm:pr-6 bg-transparent border-none text-base sm:text-lg text-gray-700 focus:outline-none" />
          </div>
        </form>

        <div className="w-full max-w-xl mb-2 text-sm sm:text-base text-gray-500">
          点击下方书籍卡片进入讨论
        </div>

        {user && (
          <div className="w-full max-w-4xl mt-10 sm:mt-16">
            <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4 sm:mb-5">继续讨论</h2>
            <UserBooksGrid />
          </div>
        )}

        {hotBooksError ? (
          <div className="w-full max-w-4xl mt-10 sm:mt-16">
            <p className="text-sm text-red-500">书籍加载失败，请稍后重试</p>
          </div>
        ) : hotBooks.length > 0 ? (
          <div className="w-full max-w-4xl mt-10 sm:mt-16">
            <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4 sm:mb-5">讨论榜 TOP5</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {hotBooks.slice(0, 5).map(book => (
                <div key={book.id} onClick={() => router.push(`/book/${book.id}`)} className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                  <div className="h-2 bg-gray-800" />
                  <div className="p-3 sm:p-4">
                    <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 mb-1">{book.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{book.author}</p>
                    <p className="text-xs text-blue-600 mt-2 font-medium">{book.discussions} 讨论</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl mt-10 sm:mt-16">
            <p className="text-sm text-gray-400">暂无书籍，可从分类进入浏览</p>
          </div>
        )}

        <div className="w-full max-w-4xl mt-10 sm:mt-16">
          <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4 sm:mb-5">分类</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div onClick={() => router.push('/category/literature')} className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
              <div className="h-2 bg-gray-700" />
              <div className="p-4 sm:p-6 text-center">
                <span className="text-xl sm:text-2xl font-light text-gray-800">文学</span>
                <p className="text-sm text-gray-500 mt-1">文学书籍</p>
              </div>
            </div>
            <div onClick={() => router.push('/category/science')} className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
              <div className="h-2 bg-gray-500" />
              <div className="p-4 sm:p-6 text-center">
                <span className="text-xl sm:text-2xl font-light text-gray-800">理学</span>
                <p className="text-sm text-gray-500 mt-1">理学书籍</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} />}
    </div>
  );
}
