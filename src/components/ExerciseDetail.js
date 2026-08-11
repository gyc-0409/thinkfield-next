'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import AnswerCard from '@/components/AnswerCard';
import LoadingDots from '@/components/LoadingDots';
import ExportTexButton from '@/components/ExportTexButton';
import { renderLatexToHTML } from '@/lib/renderLatex';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useAuth } from '@/context/AuthContext';
import { applyLikeState, mapContinuationTree } from '@/lib/likedBy';

export default function ExerciseDetail({ exerciseId, bookType }) {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const prevAnswersLengthRef = useRef(0);

  const { data: exercise, error, mutate } = useSWR(
    exerciseId ? `/api/exercises/${exerciseId}` : null,
    fetcher
  );

  const answers = exercise?.answers || [];

  // 在撰写页发布解答后，跳转到新解答页
  useEffect(() => {
    const prevLen = prevAnswersLengthRef.current;
    const newLen = answers.length;
    if (newLen > prevLen && currentPage === 0) {
      setCurrentPage(newLen);
    }
    prevAnswersLengthRef.current = newLen;
  }, [answers, currentPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [exerciseId]);

  const handleAnswerAdded = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleAnswerLike = useCallback((answerId, { likes, liked }) => {
    if (!user) return;
    mutate((ex) => {
      if (!ex?.answers) return ex;
      return {
        ...ex,
        answers: ex.answers.map((a) => {
          if (a.id !== answerId) return a;
          return { ...a, likes, liked_by: applyLikeState(a.liked_by, user, liked) };
        }),
      };
    }, { revalidate: false });
  }, [mutate, user]);

  const handleContinuationLike = useCallback((contId, { likes, liked }) => {
    if (!user) return;
    mutate((ex) => {
      if (!ex?.answers) return ex;
      return {
        ...ex,
        answers: ex.answers.map((a) => ({
          ...a,
          continuations: mapContinuationTree(a.continuations, contId, (c) => ({
            ...c,
            likes,
            liked_by: applyLikeState(c.liked_by, user, liked),
          })),
        })),
      };
    }, { revalidate: false });
  }, [mutate, user]);

  if (error) return <p className="text-red-500">加载失败</p>;
  if (!exercise) return <div className="p-4 flex justify-center"><LoadingDots /></div>;

  const totalPages = answers.length + 1;
  const isComposePage = currentPage === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-lg font-medium text-gray-800 flex-1 min-w-0" dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.title) }} />
        <ExportTexButton mode="exercise" exerciseId={exerciseId} className="mt-0.5" />
      </div>
      {exercise.content && (
        <p className="text-sm text-gray-500 mb-4 md:mb-6" dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.content) }} />
      )}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <AnswerCard
          answers={answers}
          currentPage={currentPage}
          isComposePage={isComposePage}
          exerciseId={exerciseId}
          onAnswerAdded={handleAnswerAdded}
          onAnswerLike={handleAnswerLike}
          onContinuationLike={handleContinuationLike}
          bookType={bookType}
        />
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            &larr; 上一页
          </button>
          <span className="text-sm text-gray-600">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            下一页 &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
