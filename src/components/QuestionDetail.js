'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import ThoughtCard from '@/components/ThoughtCard';
import { renderLatexToHTML } from '@/lib/renderLatex';

export default function QuestionDetail({ questionId, bookType }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [currentThoughtPage, setCurrentThoughtPage] = useState(0);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [quoteText, setQuoteText] = useState('');
  const [quoteStart, setQuoteStart] = useState(0);
  const [quoteEnd, setQuoteEnd] = useState(0);
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyAuthor, setReplyAuthor] = useState('');

  const fetchQuestion = useCallback(async () => {
    if (!questionId) return;
    try {
      const res = await fetch(`/api/questions/${questionId}`);
      const data = await res.json();
      if (data.error) return;
      setQuestion(data);
      setThoughts(data.thoughts || []);
      setCurrentThoughtPage(0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [questionId]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  useEffect(() => {
    clearQuote();
    clearReply();
  }, [questionId]);

  const fetchComments = useCallback(async (thoughtId) => {
    try {
      const res = await fetch(`/api/questions/${questionId}/threads?thoughtId=${thoughtId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }, [questionId]);

  useEffect(() => {
    const thought = thoughts[currentThoughtPage];
    if (thought) {
      fetchComments(thought.id);
    } else {
      setComments([]);
    }
  }, [currentThoughtPage, thoughts, fetchComments]);

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

  const handleCommentPosted = () => {
    const thought = thoughts[currentThoughtPage];
    if (thought) fetchComments(thought.id);
  };

  if (loading) return <p className="text-gray-500 p-4">加载中...</p>;
  if (!question) return <p className="text-red-500 p-4">问题不存在</p>;

  const totalPages = thoughts.length + 1;
  const isLastPage = currentThoughtPage === thoughts.length;
  const currentThoughtId = thoughts[currentThoughtPage]?.id;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 md:mb-6">
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
          onThoughtAdded={fetchQuestion}
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
          onCommentPosted={handleCommentPosted}
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