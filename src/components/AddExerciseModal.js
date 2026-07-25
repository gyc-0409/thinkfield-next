'use client';
import { useState } from 'react';

export default function AddExerciseModal({ onClose, onSuccess, bookId, chapter, section }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请输入习题题目');
      return;
    }
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, chapter, section, title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 text-2xl">&times;</button>
        <h2 className="text-xl font-bold mb-4">添加习题</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <label className="block mb-1 font-bold">习题题目</label>
        <textarea value={title} onChange={e => setTitle(e.target.value)} rows={4}
          placeholder="请输入完整的习题内容..." className="w-full border p-2 rounded mb-3" />
        <label className="block mb-1 font-bold">补充说明（可选）</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
          placeholder="比如来源、特别说明等..." className="w-full border p-2 rounded mb-3" />
        <button onClick={handleSubmit} className="w-full bg-green-500 text-white py-2 rounded font-bold">
          发布习题
        </button>
      </div>
    </div>
  );
}