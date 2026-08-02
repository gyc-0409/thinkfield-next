'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function CategoryContent() {
  const { type } = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = role === 'admin';
  const typeLabel = type === 'literature' ? '文学' : '理学';

  const fetchBooks = async () => {
    if (!type) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/books?type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
      setBooks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
  }, [type]);

  const toggleHidden = async (bookId, currentHidden) => {
    try {
      const res = await fetch(`/api/books/${bookId}/toggle-hidden`, { method: 'PUT' });
      if (!res.ok) throw new Error('操作失败');
      const data = await res.json();
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, hidden: data.hidden } : b));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <p className="text-sm text-gray-400 p-8">加载中...</p>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-600 mb-4 sm:mb-6 block">
        返回首页
      </button>
      <h2 className="text-lg sm:text-xl font-medium text-gray-800 mb-4 sm:mb-6">{typeLabel}书籍</h2>
      {error ? (
        <p className="text-sm text-red-500">数据加载失败，请稍后重试</p>
      ) : books.length === 0 ? (
        <p className="text-sm text-gray-400">暂无书籍</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {books.map(book => (
            <div
              key={book.id}
              className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer relative"
            >
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(book.id, book.hidden);
                    }}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded transition-colors"
                  >
                    {book.hidden ? '设为公开' : '设为隐藏'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400 p-8">加载中...</p>}>
      <CategoryContent />
    </Suspense>
  );
}