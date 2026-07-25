'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserBooksGrid({ books: propBooks }) {
  const router = useRouter();
  const [books, setBooks] = useState(propBooks || []);
  const [loading, setLoading] = useState(!propBooks);

  useEffect(() => {
    if (propBooks) {
      setBooks(propBooks);
      setLoading(false);
      return;
    }
    fetch('/api/user/books')
      .then(r => r.json())
      .then(data => setBooks(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propBooks]);

  if (loading) return <p className="text-sm text-gray-400">加载中...</p>;
  if (books.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      {books.map(book => (
        <div
          key={book.id}
          onClick={() => router.push(`/book/${book.id}`)}
          className="group bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
        >
          {/* 模拟书脊/封面色块 */}
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