'use client';
import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import ThoughtCard from '@/components/ThoughtCard';
import LoadingDots from '@/components/LoadingDots';
import { renderLatexToHTML } from '@/lib/renderLatex';
import { useAuth } from '@/context/AuthContext';

export default function QuestionDetail({ questionId, bookType }) {
  const { user } = useAuth();
  const [currentThoughtPage, setCurrentThoughtPage] = useState(0);
  const [comments, setComments] = useState([]);
  const [quoteText, setQuoteText] = useState('');
  const [quoteStart, setQuoteStart] = useState(0);
  const [quoteEnd, setQuoteEnd] = useState(0);
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyAuthor, setReplyAuthor] = useState('');

  const { data: question, error, mutate } = useSWR(
    questionId ? `/api/questions/${questionId}` : null,
    fetcher
  );

  const thoughts = question?.thoughts || [];
  const totalPages = thoughts.length + 1;
  const isLastPage = currentThoughtPage === thoughts.length;
  const currentThought = !isLastPage ? thoughts[currentThoughtPage] : null;

  useEffect(() => {
    setCurrentThoughtPage(0);
    setComments([]);
    setQuoteText('');
    setReplyParentId(null);
    setReplyAuthor('');
  }, [questionId]);

  const fetchComments = useCallback(async (thoughtId) => {
    if (!thoughtId || !questionId) return;
    try {
      const res = await fetch(`/api/questions/${questionId}/threads?thoughtId=${thoughtId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    }
  }, [questionId]);

  useEffect(() => {
    if (currentThought) {
      fetchComments(currentThought.id);
    } else {
      setComments([]);
    }
    setQuoteText('');
    setReplyParentId(null);
    setReplyAuthor('');
  }, [currentThoughtPage, currentThought, fetchComments]);

  const handleThoughtAdded = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleCommentPosted = useCallback(() => {
    if (currentThought) fetchComments(currentThought.id);
  }, [currentThought, fetchComments]);

  if (error) return <p className="text-red-500 p-4">加载失败</p>;
  if (!question) return <div className="p-4 flex justify-center"><LoadingDots /></div>;

  return (
    <div>
      {question.location && (
        <p className="text-sm text-gray-500 mb-2">
          📍 <span dangerouslySetInnerHTML={{ __html: renderLatexToHTML(question.location) }} />
          {question.page_range && <span className="ml-2 text-gray-400">页码 {question.page_range}</span>}
        </p>
      )}

      {question.type === 'question' && (
        <h2
          className="text-lg font-medium text-gray-800 mb-1"
          dangerouslySetInnerHTML={{ __html: renderLatexToHTML(question.title) }}
        />
      )}

      {question.type === 'insight' && (
        <h2 className="text-lg font-medium text-gray-800 mb-1">💡 分享见解</h2>
      )}

      <p className="text-sm text-gray-500 mb-4 md:mb-6">{question.author}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6">
        <ThoughtCard
          thoughts={thoughts}
          currentPage={currentThoughtPage}
          isLastPage={isLastPage}
          questionId={questionId}
          onThoughtAdded={handleThoughtAdded}
          onQuote={(text, start, end) => {
            setQuoteText(text);
            setQuoteStart(start);
            setQuoteEnd(end);
            setReplyParentId(null);
            setReplyAuthor('');
          }}
          comments={comments}
          onReply={(parentId, authorName) => {
            setReplyParentId(parentId);
            setReplyAuthor(authorName);
            setQuoteText('');
          }}
          quoteText={quoteText}
          quoteStart={quoteStart}
          quoteEnd={quoteEnd}
          replyParentId={replyParentId}
          replyAuthor={replyAuthor}
          onClearQuote={() => setQuoteText('')}
          onClearReply={() => { setReplyParentId(null); setReplyAuthor(''); }}
          onCommentPosted={handleCommentPosted}
          currentThoughtId={currentThought?.id}
          currentUser={user}
          bookType={bookType}
        />

        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => setCurrentThoughtPage(p => Math.max(0, p - 1))}
            disabled={currentThoughtPage === 0}
            className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            &larr; 上一页
          </button>
          <span className="text-sm text-gray-600">
            {currentThoughtPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentThoughtPage(p => Math.min(totalPages - 1, p + 1))}
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
