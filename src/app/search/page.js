'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data => setResults(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-600 mb-6 block">
        返回首页
      </button>
      <h2 className="text-lg text-gray-700 mb-6">
        搜索 &ldquo;{query}&rdquo; 的结果
      </h2>
      {loading ? (
        <p className="text-sm text-gray-400">搜索中...</p>
      ) : results.length === 0 ? (
        <div className="text-sm text-gray-500">
          未找到相关书籍。如果你觉得这本书值得讨论，可以
          <button
            onClick={() => router.push('/?addBook=1')}
            className="text-gray-800 underline hover:text-black mx-1"
          >
            点击此处添加书籍
          </button>
          ，管理员会尽快处理。
        </div>
      ) : (
        <div className="space-y-4">
          {results.map(book => (
            <div
              key={book.id}
              onClick={() => router.push(`/book/${book.id}`)}
              className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="text-gray-800 font-medium">{book.title}</div>
                <div className="text-sm text-gray-500 mt-1">{book.author}</div>
              </div>
              <div className="text-xs text-gray-400">{book.discussions || 0} 讨论</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400 p-8">加载中...</p>}>
      <SearchContent />
    </Suspense>
  );
}