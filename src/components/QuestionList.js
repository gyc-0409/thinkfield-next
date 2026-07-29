'use client';
import { useRouter } from 'next/navigation';

export default function QuestionList({ questions, bookId }) {
  const router = useRouter();

  if (!questions.length) {
    return <p className="text-gray-500 mt-4">暂无讨论，快来发起第一个吧！</p>;
  }

  return (
    <div className="space-y-3 mt-4">
      {questions.map(q => (
        <div
          key={q.id}
          onClick={() => router.push(`/question/${q.id}`)}
          className="bg-white border p-4 rounded shadow-sm hover:shadow transition cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              {q.location && <div className="text-xs text-gray-400 mb-1">📍 {q.location}</div>}
              <div className="font-bold text-gray-800">
                {q.type === 'insight' ? '💡 ' : '❓ '}{q.title}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {q.author} · {q.replies} 条回复
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}