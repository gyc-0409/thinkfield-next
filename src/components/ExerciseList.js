'use client';
import { useRouter } from 'next/navigation';

export default function ExerciseList({ exercises, bookId }) {
  const router = useRouter();

  if (!exercises.length) {
    return <p className="text-gray-500 mt-4">该小节暂无习题</p>;
  }

  return (
    <div className="space-y-3 mt-4">
      {exercises.map(ex => (
        <div
          key={ex.id}
          onClick={() => router.push(`/exercise/${ex.id}`)}
          className="bg-white border p-4 rounded shadow-sm hover:shadow cursor-pointer"
        >
          <div className="font-bold">{ex.title}</div>
          <div className="text-sm text-gray-500 mt-1">
            来源：{ex.content || '未知'} · {ex.answers?.length || 0} 个解答
          </div>
        </div>
      ))}
    </div>
  );
}