'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import ThoughtCard from '@/components/ThoughtCard';
import LoadingDots from '@/components/LoadingDots';
import { renderLatexToHTML } from '@/lib/renderLatex';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

export default function QuestionDetail({ questionId, bookType }) {
  const { user } = useAuth();
  const [currentThoughtPage, setCurrentThoughtPage] = useState(0);
  const [quoteText, setQuoteText] = useState('');
  const [quoteStart, setQuoteStart] = useState(0);
  const [quoteEnd, setQuoteEnd] = useState(0);
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyAuthor, setReplyAuthor] = useState('');

  // 问题数据
  const { data: question, error, mutate } = useSWR(
    questionId ? `/api/questions/${questionId}` : null,
    fetcher
  );

  const thoughts = question?.thoughts || [];
  const currentThoughtId = thoughts[currentThoughtPage]?.id;

  // 评论数据（SWR 自动缓存）
  const { data: comments = [] } = useSWR(
    currentThoughtId ? `/api/questions/${questionId}/threads?thoughtId=${currentThoughtId}` : null,
    fetcher
  );

  useEffect(() => {
    setCurrentThoughtPage(0);
    clearQuote();
    clearReply();
  }, [questionId]);

  const handleQuote = (text, start, end) => {
    setQuoteText(text);
    setQuoteStart(start);
    setQuoteEnd(end);
    setReplyParentId(null);
    setReplyAuthor('');
  };

  const handleReply = (parentId, authorName) => {
    setReplyParentId(parentId);
    setReplyAuthor(authorName);
    setQuoteText('');
    setQuoteStart(0);
    setQuoteEnd(0);
  };

  const clearQuote = () => {
    setQuoteText('');
    setQuoteStart(0);
    setQuoteEnd(0);
  };

  const clearReply = () => {
    setReplyParentId(null);
    setReplyAuthor('');
  };

  if (error) return <p className="text-red-500 p-4">加载失败</p>;
  if (!question) return <div className="p-4 flex justify-center"><LoadingDots /></div>;

  const totalPages = thoughts.length + 1;
  const isLastPage = currentThoughtPage === thoughts.length;

  return (
    <div className="h-full flex flex-col pt-14 md:pt-0">
      <div className="mb-6">
        {question.location && (
          <div className="text-xs text-gray-400 mb-1" dangerouslySetInnerHTML={{ __html: renderLatexToHTML(question.location) }} />
        )}
        <h2 className="text-lg font-medium text-gray-800" dangerouslySetInnerHTML={{ __html: renderLatexToHTML((question.type === 'insight' ? '[见解] ' : '[提问] ') + question.title) }} />
        <p className="text-sm text-gray-500 mt-1">作者：{question.author}</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <ThoughtCard
          thoughts={thoughts}
          currentPage={currentThoughtPage}
          isLastPage={isLastPage}
          questionId={questionId}
          onThoughtAdded={mutate}
          onQuote={handleQuote}
          comments={comments}
          onReply={handleReply}
          quoteText={quoteText}
          quoteStart={quoteStart}
          quoteEnd={quoteEnd}
          replyParentId={replyParentId}
          replyAuthor={replyAuthor}
          onClearQuote={clearQuote}
          onClearReply={clearReply}
          currentThoughtId={currentThoughtId}
          currentUser={user}
          bookType={bookType}
        />

        <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              clearQuote();
              clearReply();
              setCurrentThoughtPage(p => Math.max(0, p - 1));
            }}
            disabled={currentThoughtPage === 0}
            className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm disabled:opacity-40"
          >
            &larr; 上一页
          </button>
          <span className="text-sm text-gray-600">
            {currentThoughtPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => {
              clearQuote();
              clearReply();
              setCurrentThoughtPage(p => Math.min(totalPages - 1, p + 1));
            }}
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