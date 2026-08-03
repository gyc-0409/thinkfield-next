'use client';

import { useRouter } from 'next/navigation';
import ExerciseSidebarItem from '@/components/ExerciseSidebarItem';

export default function ExerciseList({ exercises }) {
  const router = useRouter();

  if (!exercises.length) {
    return <p className="text-gray-500 mt-4">该小节暂无习题</p>;
  }

  return (
    <div className="space-y-3 mt-4">
      {exercises.map(ex => (
        <ExerciseSidebarItem
          key={ex.id}
          exercise={ex}
          selected={false}
          className="bg-white border p-4 rounded shadow-sm hover:shadow transition-shadow overflow-visible"
          previewPlacement="below"
          onClick={() => router.push(`/exercise/${ex.id}`)}
        />
      ))}
    </div>
  );
}
