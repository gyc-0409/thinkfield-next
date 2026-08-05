'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import TreeEditor from '@/components/TreeEditor';

export default function AddBookModal({ onClose }) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [step, setStep] = useState(isAdmin ? 'type' : 'form');
  const [bookTypes, setBookTypes] = useState(['literature', 'science']);
  const [bookType, setBookType] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('');
  const [publisher, setPublisher] = useState('');
  const [edition, setEdition] = useState('');
  const [publishYear, setPublishYear] = useState('');
  const [isbn, setIsbn] = useState('');
  const [structureLevel, setStructureLevel] = useState(0);
  const [tree, setTree] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/books/types')
        .then(async (res) => {
          const types = await res.json();
          if (!res.ok) throw new Error(types.error || '加载书籍类型失败');
          if (Array.isArray(types)) setBookTypes(types);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const handleTypeSelect = (type) => {
    setBookType(type);
    setStep('form');
  };

  const handleFormNext = () => {
    if (!title.trim() || !author.trim() || !publisher.trim() || !edition.trim()) {
      setError('请填写书名、作者、出版社和版本');
      return;
    }
    setError('');
    if (isAdmin) {
      setStep('structure');
    } else {
      handleSubmit(true);
    }
  };

  const handleStructureSelect = (level) => {
    setStructureLevel(level);
    setTree([]);
    setStep('structure-input');
  };

  const handleSubmit = async (skipStructure = false) => {
    setSubmitting(true);
    setError('');
    try {
      let body = {
        title: title.trim(),
        author: author.trim(),
        translator: translator.trim(),
        publisher: publisher.trim(),
        edition: edition.trim(),
        publishYear: publishYear.trim(),
        isbn: isbn.trim(),
        type: isAdmin ? bookType : 'science',
      };
      if (isAdmin && !skipStructure) {
        body.tree = tree;
      }
      const res = await fetch('/api/books/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失败');
      setMessage(data.message || '提交成功');
      setStep('done');
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  const close = () => {
    setStep(isAdmin ? 'type' : 'form');
    setBookType('');
    setTitle('');
    setAuthor('');
    setTranslator('');
    setPublisher('');
    setEdition('');
    setPublishYear('');
    setIsbn('');
    setStructureLevel(0);
    setTree([]);
    setMessage('');
    setError('');
    onClose();
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'literature': return '文学';
      case 'science': return '理学';
      default: return type;
    }
  };

  const getTypeDesc = (type) => {
    switch(type) {
      case 'literature': return '无公式预览';
      default: return '支持 LaTeX';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-lg p-6 md:p-8 w-full h-full md:h-auto md:max-w-2xl overflow-y-auto relative">
        <button onClick={close} className="absolute top-3 right-4 text-gray-400 text-2xl hover:text-gray-600">&times;</button>

        {step === 'type' && (
          <div>
            <h2 className="text-xl font-medium text-gray-800 mb-4">选择书籍类型</h2>
            <div className="flex flex-wrap gap-3">
              {bookTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="flex-1 min-w-[120px] bg-gray-100 border border-gray-300 text-gray-700 py-4 rounded hover:bg-gray-200 transition-colors"
                >
                  <div className="font-medium">{getTypeLabel(type)}</div>
                  <div className="text-xs text-gray-500 mt-1">{getTypeDesc(type)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && (
          <div>
            <h2 className="text-xl font-medium text-gray-800 mb-4">添加新书籍</h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="space-y-3">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="书名 *"
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
              <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="作者 *"
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
              <input value={translator} onChange={e => setTranslator(e.target.value)} placeholder="译者（仅翻译类书籍需填写）"
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
              <input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="出版社 *"
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
              <input value={edition} onChange={e => setEdition(e.target.value)} placeholder="版本 *"
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
              <input value={publishYear} onChange={e => setPublishYear(e.target.value)} placeholder="出版年份"
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
              <input value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="ISBN"
                className="w-full border border-gray-200 p-2.5 rounded-md text-sm focus:outline-none focus:border-gray-400 placeholder:text-gray-400" />
            </div>
            <button
              onClick={handleFormNext}
              disabled={submitting}
              className="w-full mt-4 bg-gray-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors"
            >
              {isAdmin ? '下一步：选择结构' : '创建'}
            </button>
          </div>
        )}

        {step === 'structure' && (
          <div>
            <h2 className="text-xl font-medium text-gray-800 mb-4">选择目录结构</h2>
            <p className="text-sm text-gray-500 mb-4">最底层为小节，上层结构将自动作为层级</p>
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(level => (
                <button
                  key={level}
                  onClick={() => handleStructureSelect(level)}
                  className="bg-gray-100 border border-gray-300 text-gray-700 py-4 rounded hover:bg-gray-200 transition-colors"
                >
                  <div className="font-medium">{level}级结构</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {level === 1 && '仅小节列表'}
                    {level === 2 && '章节 + 小节'}
                    {level === 3 && '章 + 节 + 小节'}
                    {level === 4 && '章 + 节 + 目 + 小节'}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('form')} className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              返回修改信息
            </button>
          </div>
        )}

        {step === 'structure-input' && (
          <div className="max-h-[60vh] overflow-y-auto">
            <h2 className="text-xl font-medium text-gray-800 mb-4">输入目录内容</h2>
            <p className="text-xs text-gray-400 mb-4">最底层为小节，上层均为层级名称</p>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <TreeEditor
              tree={tree}
              maxDepth={structureLevel}
              onChange={setTree}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('structure')} className="text-sm bg-gray-100 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200">
                返回选择结构
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="flex-1 bg-gray-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors"
              >
                {submitting ? '创建中...' : '创建书籍'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <p className="text-gray-700 mb-6">{message}</p>
            <button onClick={close} className="bg-gray-800 text-white px-6 py-2 rounded text-sm hover:bg-gray-900 transition-colors">
              确定
            </button>
          </div>
        )}
      </div>
    </div>
  );
}