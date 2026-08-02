'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingDots from '@/components/LoadingDots';

export default function UserBooksGrid({ books: propBooks }) {
  const router = useRouter();
  const [books, setBooks] = useState(propBooks || []);
  const [loading, setLoading] = useState(!propBooks);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (propBooks) {
      setBooks(propBooks);
      setLoading(false);
      return;
    }
    fetch('/api/user/books')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
        setBooks(Array.isArray(data) ? data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propBooks]);

  if (loading) return <LoadingDots text="加载中" />;
  if (error) return <p className="text-sm text-red-500">数据加载失败，请稍后重试</p>;
  if (books.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      {books.map(book => (
        <div
          key={book.id}
          onClick={() => router.push(`/book/${book.id}`)}
          className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
        >
          <div className="h-2 bg-gray-800" />
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 mb-1">
              {book.title}
            </h3>
            <p className="text-xs text-gray-500 truncate">{book.author}</p>
            <p className="text-xs text-blue-600 mt-2 font-medium">{book.discussions} 讨论</p>
          </div>
        </div>
      ))}
    </div>
  );
}
