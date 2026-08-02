'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AddBookModal from '@/components/AddBookModal';

export default function CategoryClient({ type, initialBooks = [], loadError: initialError = null }) {
  const router = useRouter();
  const { role, requireLogin } = useAuth();
  const [books, setBooks] = useState(initialBooks);
  const [loading, setLoading] = useState(!initialBooks.length && !initialError);
  const [error, setError] = useState(initialError);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);

  const isAdmin = role === 'admin';
  const typeLabel = type === 'literature' ? '文学' : '理学';

  useEffect(() => {
    if (initialBooks.length > 0 || initialError) {
      setLoading(false);
      return;
    }
    if (!type) {
      setLoading(false);
      return;
    }
    fetch(`/api/books?type=${type}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
        setBooks(Array.isArray(data) ? data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [type, initialBooks.length, initialError]);

  const toggleHidden = async (bookId) => {
    try {
      const res = await fetch(`/api/books/${bookId}/toggle-hidden`, { method: 'PUT' });
      if (!res.ok) throw new Error('操作失败');
      const data = await res.json();
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, hidden: data.hidden } : b));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleOpenAddBook = () => {
    if (!requireLogin()) return;
    setShowAddBook(true);
  };

  if (loading) return <p className="text-sm text-gray-400 p-8">加载中...</p>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-600 mb-4 sm:mb-6 block">
        返回首页
      </button>
      <h2 className="text-lg sm:text-xl font-medium text-gray-800 mb-4 sm:mb-6">{typeLabel}书籍</h2>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索书籍..."
          className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
        />
        <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-900 transition-colors">
          搜索
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-500">数据加载失败，请稍后重试</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-gray-400">暂无书籍</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {books.map(book => (
            <div key={book.id} className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer relative">
              <div onClick={() => router.push(`/book/${book.id}`)}>
                <h3 className="text-xs font-medium text-gray-800 truncate">{book.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
                <p className="text-xs text-blue-500 mt-1">{book.discussions} 讨论</p>
              </div>
              {isAdmin && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-xs ${book.hidden ? 'text-red-500' : 'text-green-600'}`}>
                    {book.hidden ? '已隐藏' : '公开'}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); toggleHidden(book.id); }} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded transition-colors">
                    {book.hidden ? '设为公开' : '设为隐藏'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-gray-500 text-center">
        没有找到想要的书？
        <button type="button" onClick={handleOpenAddBook} className="text-gray-800 underline underline-offset-2 hover:text-black ml-1">
          点击此处添加书籍
        </button>
      </p>

      {showAddBook && <AddBookModal onClose={() => setShowAddBook(false)} />}
    </div>
  );
}
