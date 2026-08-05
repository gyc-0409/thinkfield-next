'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import LoadingDots from '@/components/LoadingDots';
import UserBooksGrid from '@/components/UserBooksGrid';
import UserBookTree from '@/components/UserBookTree';

function roleLabel(role) {
  if (role === 'admin') return '管理员';
  if (role === 'moderator') return '副管理员';
  return null;
}

function certEntryLabel(status) {
  if (status === 'pending') return '学生认证审核中';
  if (status === 'approved') return '学生认证已通过';
  if (status === 'rejected') return '学生认证未通过，可重新提交';
  return '去学生认证';
}

function bookRequestStatusLabel(status) {
  if (status === 'pending') return '审核中';
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '未通过';
  return status;
}

function bookRequestStatusClass(status) {
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700';
  if (status === 'rejected') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-500';
}

export default function ProfileClient({ username }) {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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
            {data.certified && (
              <span className="text-xs text-emerald-700 border border-emerald-200 bg-emerald-50 rounded px-1.5 py-0.5">
                已认证学生
              </span>
            )}
            {badge && (
              <span className="text-xs text-gray-500 border border-gray-300 rounded px-1.5 py-0.5">
                {badge}
              </span>
            )}
          </div>
          {isSelf && data.university && (
            <p className="text-sm text-gray-500">{data.university}</p>
          )}
          {isSelf && data.certified && data.certificationSchool && (
            <p className="text-sm text-gray-500 mt-0.5">认证学校：{data.certificationSchool}</p>
          )}
          {isSelf && (
            <Link
              href="/certification"
              className="inline-block mt-3 text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              {certEntryLabel(data.certificationStatus)}
            </Link>
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
            <span className="block text-xl font-medium text-gray-900 tabular-nums">{data.stats.thoughts ?? 0}</span>
            <span className="text-gray-500">思考</span>
          </div>
          <div>
            <span className="block text-xl font-medium text-gray-900 tabular-nums">{data.stats.answers}</span>
            <span className="text-gray-500">解答</span>
          </div>
          <div>
            <span className="block text-xl font-medium text-gray-900 tabular-nums">{data.stats.likes ?? 0}</span>
            <span className="text-gray-500">有价值</span>
          </div>
        </div>

        {isSelf && Array.isArray(data.continueBooks) && data.continueBooks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-base font-medium text-gray-800 mb-4">继续讨论</h2>
            <UserBooksGrid books={data.continueBooks} />
          </section>
        )}

        {isSelf && Array.isArray(data.bookRequests) && (
          <section className="mb-10">
            <h2 className="text-base font-medium text-gray-800 mb-4">书籍申请</h2>
            {data.bookRequests.length === 0 ? (
              <p className="text-sm text-gray-400">暂无书籍申请</p>
            ) : (
              <ul className="space-y-3">
                {data.bookRequests.map((req) => (
                  <li
                    key={req.id}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">《{req.title}》</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                      {req.status === 'rejected' && req.rejectReason && (
                        <p className="text-xs text-gray-500 mt-1">原因：{req.rejectReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded ${bookRequestStatusClass(req.status)}`}>
                        {bookRequestStatusLabel(req.status)}
                      </span>
                      {req.status === 'approved' && req.bookId && (
                        <Link
                          href={`/book/${req.bookId}`}
                          className="text-xs text-gray-700 underline underline-offset-2 hover:text-gray-900"
                        >
                          进入
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section>
          <h2 className="text-base font-medium text-gray-800 mb-4">贡献记录</h2>
          <UserBookTree books={data.books} isSelf={isSelf} />
        </section>
      </div>
    </div>
  );
}
