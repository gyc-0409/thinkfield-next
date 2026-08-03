'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoadingDots from '@/components/LoadingDots';
import UserBooksGrid from '@/components/UserBooksGrid';
import { renderLatexToHTML } from '@/lib/renderLatex';

function roleLabel(role) {
  if (role === 'admin') return '管理员';
  if (role === 'moderator') return '副管理员';
  return null;
}

export default function ProfileClient({ username }) {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('discussions');

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '加载失败');
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [username, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex justify-center pt-20">
        <LoadingDots />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">{error || '用户不存在'}</p>
        <Link href="/" className="text-sm text-gray-800 underline underline-offset-2">
          返回首页
        </Link>
      </div>
    );
  }

  const badge = roleLabel(data.role);
  const isSelf = data.isSelf;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← 返回
          </button>
          <span className="text-sm text-gray-400">|</span>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            思辨场
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <header className="mb-8">
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            <h1 className="text-2xl font-medium text-gray-900 tracking-tight">{data.username}</h1>
            {badge && (
              <span className="text-xs text-gray-500 border border-gray-300 rounded px-1.5 py-0.5">
                {badge}
              </span>
            )}
          </div>
          {isSelf && data.university && (
            <p className="text-sm text-gray-500">{data.university}</p>
          )}
        </header>

        <div className="flex flex-wrap gap-6 sm:gap-10 mb-8 text-sm">
          <div>
            <span className="block text-xl font-medium text-gray-900 tabular-nums">{data.stats.books}</span>
            <span className="text-gray-500">参与过的书</span>
          </div>
          <div>
            <span className="block text-xl font-medium text-gray-900 tabular-nums">{data.stats.discussions}</span>
            <span className="text-gray-500">讨论</span>
          </div>
          <div>
            <span className="block text-xl font-medium text-gray-900 tabular-nums">{data.stats.answers}</span>
            <span className="text-gray-500">解答</span>
          </div>
        </div>

        {isSelf && Array.isArray(data.continueBooks) && data.continueBooks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-medium text-gray-800 mb-4">继续讨论</h2>
            <UserBooksGrid books={data.continueBooks} />
          </section>
        )}

        <div className="flex gap-1 border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setTab('discussions')}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              tab === 'discussions'
                ? 'border-gray-800 text-gray-900 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            讨论
          </button>
          <button
            type="button"
            onClick={() => setTab('answers')}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              tab === 'answers'
                ? 'border-gray-800 text-gray-900 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            解答
          </button>
        </div>

        {tab === 'discussions' && (
          <ul className="space-y-2">
            {data.discussions.length === 0 ? (
              <li className="text-sm text-gray-400 py-8 text-center">
                {isSelf ? '还没有发起讨论，去一本书的小节里开个头吧' : '暂无公开讨论'}
              </li>
            ) : (
              data.discussions.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/book/${item.bookId}/section/${item.nodeId}?q=${encodeURIComponent(item.id)}`}
                    className="block rounded-md border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="text-sm font-medium text-gray-900 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: renderLatexToHTML(item.title) }}
                    />
                    <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>{item.bookTitle}</span>
                      {item.sectionTitle && <span>· {item.sectionTitle}</span>}
                      {item.type === 'insight' && <span>· 见解</span>}
                      {item.type === 'question' && <span>· 疑问</span>}
                      <span>· {item.replies} 回复</span>
                      {item.pageRange && <span>· 页码 {item.pageRange}</span>}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}

        {tab === 'answers' && (
          <ul className="space-y-2">
            {data.answers.length === 0 ? (
              <li className="text-sm text-gray-400 py-8 text-center">
                {isSelf ? '还没有写过解答' : '暂无公开解答'}
              </li>
            ) : (
              data.answers.map((item, idx) => (
                <li key={item.id || `${item.exerciseId}-${idx}`}>
                  <Link
                    href={`/book/${item.bookId}/exercises?nodeId=${encodeURIComponent(item.nodeId)}&exerciseId=${encodeURIComponent(item.exerciseId)}`}
                    className="block rounded-md border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="text-sm font-medium text-gray-900 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: renderLatexToHTML(item.exerciseTitle) }}
                    />
                    <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>{item.bookTitle}</span>
                      {item.sectionTitle && <span>· {item.sectionTitle}</span>}
                      <span>· {item.likes} 有价值</span>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
