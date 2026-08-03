'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AnswerCard from '@/components/AnswerCard';
import { useAuth } from '@/context/AuthContext';
import { applyLikeState, mapContinuationTree } from '@/lib/likedBy';

export default function ExerciseDetailPage() {
  const { id: exerciseId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [exercise, setExercise] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentAnswerPage, setCurrentAnswerPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchExercise = async () => {
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      setExercise(data);
      setAnswers(data.answers || []);
      setCurrentAnswerPage(0);
    } catch {
      setExercise(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExercise();
  }, [exerciseId]);

  const handlePrevAnswer = () => {
    if (currentAnswerPage > 0) setCurrentAnswerPage(prev => prev - 1);
  };

  const handleNextAnswer = () => {
    const totalPages = answers.length + 1;
    if (currentAnswerPage < totalPages - 1) setCurrentAnswerPage(prev => prev + 1);
  };

  const handleAnswerLike = useCallback((answerId, { likes, liked }) => {
    if (!user) return;
    setAnswers((prev) => prev.map((a) => {
      if (a.id !== answerId) return a;
      return { ...a, likes, liked_by: applyLikeState(a.liked_by, user, liked) };
    }));
  }, [user]);

  const handleContinuationLike = useCallback((contId, { likes, liked }) => {
    if (!user) return;
    setAnswers((prev) => prev.map((a) => ({
      ...a,
      continuations: mapContinuationTree(a.continuations, contId, (c) => ({
        ...c,
        likes,
        liked_by: applyLikeState(c.liked_by, user, liked),
      })),
    })));
  }, [user]);

  if (loading) return <p className="text-gray-500 p-8">加载中...</p>;
  if (!exercise) return <p className="text-red-500 p-8">习题不存在</p>;

  const totalPages = answers.length + 1;
  const isLastPage = currentAnswerPage === answers.length;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button onClick={() => router.back()} className="text-blue-500 underline mb-4">
        ← 返回习题列表
      </button>
      <h2 className="text-xl font-bold mb-2">{exercise.title}</h2>
      <p className="text-gray-600 mb-4">来源：{exercise.content || '未知'}</p>

      <div className="bg-gray-50 border p-6 rounded">
        <AnswerCard
          answers={answers}
          currentPage={currentAnswerPage}
          isLastPage={isLastPage}
          exerciseId={exerciseId}
          onAnswerAdded={fetchExercise}
          onAnswerLike={handleAnswerLike}
          onContinuationLike={handleContinuationLike}
        />

        {/* 翻页控件 */}
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={handlePrevAnswer}
            disabled={currentAnswerPage === 0}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            ← 上一页
          </button>
          <span className="font-bold">
            第 {currentAnswerPage + 1} 页 / 共 {totalPages} 页
          </span>
          <button
            onClick={handleNextAnswer}
            disabled={isLastPage}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            下一页 →
          </button>
        </div>
      </div>
    </div>
  );
}