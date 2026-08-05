'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import TreeEditor from '@/components/TreeEditor';
import { compressImageFile } from '@/lib/compressImage';

const MAX_CATALOG_IMAGES = 5;

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
  const [catalogImages, setCatalogImages] = useState([]);
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [catalogProcessing, setCatalogProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const revokeCatalogUrls = useCallback((items) => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  useEffect(() => {
    return () => revokeCatalogUrls(catalogImages);
  }, [catalogImages, revokeCatalogUrls]);

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

  const getBookMeta = () => ({
    title: title.trim(),
    author: author.trim(),
    translator: translator.trim(),
    publisher: publisher.trim(),
    edition: edition.trim(),
    publishYear: publishYear.trim(),
    isbn: isbn.trim(),
  });

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
      const body = {
        ...getBookMeta(),
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
      if (isAdmin) {
        setStep('done');
      } else {
        setStep('catalog-upload');
      }
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  const handleCatalogSelect = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (picked.length === 0) return;

    const slotsLeft = MAX_CATALOG_IMAGES - catalogImages.length;
    if (slotsLeft <= 0) {
      setError(`最多上传 ${MAX_CATALOG_IMAGES} 张图片`);
      return;
    }

    setCatalogProcessing(true);
    setError('');
    try {
      const toAdd = picked.slice(0, slotsLeft);
      const compressed = await Promise.all(
        toAdd.map(async (file) => {
          const blob = await compressImageFile(file);
          const previewUrl = URL.createObjectURL(blob);
          const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          const typedBlob = blob.type === 'image/jpeg' ? blob : new File([blob], name, { type: 'image/jpeg' });
          return { blob: typedBlob, previewUrl, name, size: typedBlob.size };
        })
      );
      setCatalogImages((prev) => [...prev, ...compressed]);
    } catch (err) {
      setError(err.message || '图片处理失败');
    }
    setCatalogProcessing(false);
  };

  const removeCatalogImage = (index) => {
    setCatalogImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const finishCatalogStep = (extraMessage) => {
    if (extraMessage) {
      setMessage((prev) => `${prev}${prev ? ' ' : ''}${extraMessage}`);
    }
    revokeCatalogUrls(catalogImages);
    setCatalogImages([]);
    setStep('done');
  };

  const handleCatalogSkip = () => {
    finishCatalogStep();
  };

  const handleCatalogUpload = async () => {
    if (catalogImages.length === 0) {
      setError('请选择至少一张目录图片，或点击跳过');
      return;
    }
    setCatalogUploading(true);
    setError('');
    try {
      const formData = new FormData();
      const meta = getBookMeta();
      Object.entries(meta).forEach(([key, value]) => formData.append(key, value));
      catalogImages.forEach((item, index) => {
        formData.append('images', item.blob, item.name || `catalog-${index + 1}.jpg`);
      });

      const res = await fetch('/api/books/catalog-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      finishCatalogStep(data.message || '目录图片已发送');
    } catch (err) {
      setError(err.message);
    }
    setCatalogUploading(false);
  };

  const close = () => {
    revokeCatalogUrls(catalogImages);
    setCatalogImages([]);
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
    switch (type) {
      case 'literature': return '文学';
      case 'science': return '理学';
      default: return type;
    }
  };

  const getTypeDesc = (type) => {
    switch (type) {
      case 'literature': return '无公式预览';
      default: return '支持 LaTeX';
    }
  };

  const formatSize = (bytes) => `${Math.round(bytes / 1024)} KB`;

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
              {isAdmin ? '下一步：选择结构' : submitting ? '提交中...' : '提交申请'}
            </button>
          </div>
        )}

        {step === 'catalog-upload' && (
          <div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">上传目录图片（可选）</h2>
            <p className="text-sm text-gray-500 mb-4">
              申请已提交，可在个人主页查看审核进度。如有需要，可上传书籍目录页照片（最多 {MAX_CATALOG_IMAGES} 张，每张约 200–500 KB），将发送至管理员邮箱。
            </p>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handleCatalogSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={catalogProcessing || catalogImages.length >= MAX_CATALOG_IMAGES}
              className="w-full border border-dashed border-gray-300 rounded-md py-6 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {catalogProcessing ? '正在压缩图片...' : catalogImages.length >= MAX_CATALOG_IMAGES ? '已达上限' : '选择图片或拍照'}
            </button>

            {catalogImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {catalogImages.map((item, index) => (
                  <div key={item.previewUrl} className="relative border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={`目录 ${index + 1}`} className="w-full h-28 object-cover" />
                    <div className="px-2 py-1 text-xs text-gray-500 flex justify-between items-center">
                      <span>{formatSize(item.size)}</span>
                      <button type="button" onClick={() => removeCatalogImage(index)} className="text-red-500 hover:text-red-700">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCatalogSkip}
                disabled={catalogUploading}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                跳过
              </button>
              <button
                type="button"
                onClick={handleCatalogUpload}
                disabled={catalogUploading || catalogProcessing || catalogImages.length === 0}
                className="flex-1 bg-gray-800 text-white py-2.5 rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors"
              >
                {catalogUploading ? '发送中...' : '发送目录图片'}
              </button>
            </div>
          </div>
        )}

        {step === 'structure' && (
          <div>
            <h2 className="text-xl font-medium text-gray-800 mb-4">选择目录结构</h2>
            <p className="text-sm text-gray-500 mb-4">最底层为小节，上层结构将自动作为层级</p>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(level => (
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
