'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BookTree from '@/components/BookTree';

export default function BookEntryPage() {
  const { id: bookId } = useParams();
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/${bookId}`)
      .then(r => r.json())
      .then(data => {
        setBook(data);
        setShowModal(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) return <p className="p-8 text-gray-500">加载中...</p>;
  if (!book) return <p className="p-8 text-red-500">书籍不存在</p>;

  const handleSelectLeaf = (leafNode) => {
    setShowModal(false);
    router.push(`/book/${bookId}/section/${leafNode.id}`);
  };

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] sm:max-h-[80vh] overflow-y-auto relative mx-2 sm:mx-0">
            <button onClick={() => router.push('/')} className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-medium mb-1">{book.title}</h2>
              <p className="text-sm text-gray-500 mb-2 sm:mb-4">{book.author}</p>
              <p className="text-sm text-gray-400 mb-3 sm:mb-4">请选择小节进入讨论</p>
              <BookTree tree={book.tree} onSelectLeaf={handleSelectLeaf} />
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-50" />
    </>
  );
}