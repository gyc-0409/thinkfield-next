'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ThoughtCard from '@/components/ThoughtCard';
import CommentTree from '@/components/CommentTree';
import CommentInput from '@/components/CommentInput';
import { useAuth } from '@/context/AuthContext';
import { applyLikeState, mapCommentTree } from '@/lib/likedBy';

export default function QuestionDetailPage() {
  const { id: questionId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [currentThoughtPage, setCurrentThoughtPage] = useState(0);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentKey, setCommentKey] = useState(0); // 用于刷新 CommentInput

  const fetchQuestion = useCallback(async () => {
    if (!questionId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/questions/${questionId}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setQuestion(null);
        return;
      }
      setQuestion(data);
      setThoughts(data.thoughts || []);
      setCurrentThoughtPage(0);
    } catch {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const fetchComments = useCallback(async (thoughtId) => {
    try {
      const res = await fetch(`/api/questions/${questionId}/threads?thoughtId=${thoughtId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setQuestion(null);
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

  const handlePrevPage = () => {
    if (currentThoughtPage > 0) setCurrentThoughtPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    const totalPages = thoughts.length + 1;
    if (currentThoughtPage < totalPages - 1) setCurrentThoughtPage(prev => prev + 1);
  };

  const handleCommentPosted = () => {
    const thought = thoughts[currentThoughtPage];
    if (thought) fetchComments(thought.id);
    setCommentKey(prev => prev + 1); // 强制刷新 CommentInput
  };

  const handleThoughtLike = useCallback((thoughtId, { likes, liked }) => {
    if (!user) return;
    setThoughts((prev) => prev.map((t) => {
      if (t.id !== thoughtId) return t;
      return { ...t, likes, liked_by: applyLikeState(t.liked_by, user, liked) };
    }));
  }, [user]);

  const handleCommentLike = useCallback((commentId, { likes, liked }) => {
    if (!user) return;
    setComments((prev) => mapCommentTree(prev, commentId, (c) => ({
      ...c,
      likes,
      liked_by: applyLikeState(c.liked_by, user, liked),
    })));
  }, [user]);

  if (loading) return <p className="text-gray-500 p-8">加载中...</p>;
  if (!question) return <p className="text-red-500 p-8">问题不存在</p>;

  const totalPages = thoughts.length + 1;
  const isLastPage = currentThoughtPage === thoughts.length;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button onClick={() => router.back()} className="text-blue-500 underline mb-4">
        ← 返回讨论列表
      </button>

      {/* 位置信息 */}
      {question.location && (
        <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded mb-4">
          <h3 className="font-bold">位置</h3>
          <p>{question.location}</p>
        </div>
      )}

      {/* 问题框 */}
      {question.type === 'question' && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded mb-4">
          <h3 className="font-bold">问题</h3>
          <p className="text-gray-600 text-sm">提问者：{question.author}</p>
          <p className="mt-2">{question.title}</p>
        </div>
      )}

      {/* 思考区 */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
        <ThoughtCard
          thoughts={thoughts}
          currentPage={currentThoughtPage}
          isLastPage={isLastPage}
          questionId={questionId}
          onThoughtAdded={fetchQuestion}
          onThoughtLike={handleThoughtLike}
          currentUser={user}
          onQuote={(text, start, end) => {
            // 传给 CommentInput
            window.__quoteText = text;
            window.__quoteStart = start;
            window.__quoteEnd = end;
            setCommentKey(prev => prev + 1);
          }}
        />

        {/* 翻页控件 */}
        <div className="flex justify-center items-center gap-4 mt-4">
          <button onClick={handlePrevPage} disabled={currentThoughtPage === 0}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
            ← 上一页
          </button>
          <span className="font-bold">第 {currentThoughtPage + 1} 页 / 共 {totalPages} 页</span>
          <button onClick={handleNextPage} disabled={isLastPage}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300">
            下一页 →
          </button>
        </div>
      </div>

      {/* 追问区 */}
      {!isLastPage && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-3">追问与讨论</h3>
          <CommentTree
            comments={comments}
            questionId={questionId}
            thoughtId={thoughts[currentThoughtPage]?.id}
            currentUser={user}
            onCommentLike={handleCommentLike}
            onReply={(parentId, authorName) => {
              window.__commentParentId = parentId;
              window.__commentReplyTo = authorName;
              setCommentKey(prev => prev + 1);
            }}
          />
          <CommentInput
            key={commentKey}
            questionId={questionId}
            thoughtId={thoughts[currentThoughtPage]?.id}
            onCommentPosted={handleCommentPosted}
          />
        </div>
      )}
    </div>
  );
}