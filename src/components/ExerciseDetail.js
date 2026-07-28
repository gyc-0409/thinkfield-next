'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import AnswerCard from '@/components/AnswerCard';
import { renderLatexToHTML } from '@/lib/renderLatex';
import LoadingDots from '@/components/LoadingDots';

export default function ExerciseDetail({ exerciseId, bookType }) {
  const [exercise, setExercise] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevAnswersLengthRef = useRef(answers.length);

  const fetchExercise = useCallback(async () => {
    if (!exerciseId) return;
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`);
      const data = await res.json();
      if (data.error) return;
      setExercise(data);
      setAnswers(data.answers || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [exerciseId]);

  useEffect(() => {
    fetchExercise();
  }, [fetchExercise]);

  useEffect(() => {
    const prevLen = prevAnswersLengthRef.current;
    const newLen = answers.length;
    if (newLen > prevLen && currentPage === prevLen) {
      setCurrentPage(newLen - 1);
    }
    prevAnswersLengthRef.current = newLen;
  }, [answers, currentPage]);

  const handleAnswerAdded = useCallback(() => {
    fetchExercise();
  }, [fetchExercise]);

  if (loading) return <LoadingDots />;
  if (!exercise) return <p className="text-red-500">习题不存在</p>;

  const totalPages = answers.length + 1;
  const isLastPage = currentPage === answers.length;

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-800 mb-1" dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.title) }} />
      {exercise.content && (
        <p className="text-sm text-gray-500 mb-4 md:mb-6" dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.content) }} />
      )}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <AnswerCard
          answers={answers}
          currentPage={currentPage}
          isLastPage={isLastPage}
          exerciseId={exerciseId}
          onAnswerAdded={handleAnswerAdded}
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
            disabled={isLastPage}
            className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            下一页 &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}