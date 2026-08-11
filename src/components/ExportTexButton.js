'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * @param {{
 *   mode: 'question' | 'exercise' | 'section',
 *   questionId?: string,
 *   exerciseId?: string,
 *   bookId?: string,
 *   nodeId?: string,
 *   variant?: 'text' | 'icon',
 *   className?: string,
 * }} props
 */
export default function ExportTexButton({
  mode,
  questionId,
  exerciseId,
  bookId,
  nodeId,
  variant = 'text',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [includeComments, setIncludeComments] = useState(false);
  const [scope, setScope] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const buildUrl = () => {
    const q = new URLSearchParams();
    if (includeComments) q.set('includeComments', '1');
    if (mode === 'question') {
      return `/api/export/question/${encodeURIComponent(questionId)}?${q}`;
    }
    if (mode === 'exercise') {
      return `/api/export/exercise/${encodeURIComponent(exerciseId)}?${q}`;
    }
    q.set('bookId', bookId);
    q.set('nodeId', nodeId);
    q.set('scope', scope);
    return `/api/export/section?${q}`;
  };

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '导出失败');
      }
      const blob = await res.blob();
      const disp = res.headers.get('Content-Disposition') || '';
      const utfMatch = disp.match(/filename\*=UTF-8''([^;]+)/i);
      const plainMatch = disp.match(/filename="([^"]+)"/i);
      const filename = utfMatch
        ? decodeURIComponent(utfMatch[1])
        : plainMatch
          ? plainMatch[1]
          : 'export.tex';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      setError(e.message || '导出失败');
    }
    setLoading(false);
  };

  const triggerClass =
    variant === 'icon'
      ? `inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors ${className}`
      : `text-xs text-gray-600 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 transition-colors whitespace-nowrap ${className}`;

  return (
    <div className="relative inline-flex" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        title="导出 TeX"
        aria-label="导出 TeX"
      >
        {variant === 'icon' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
        ) : (
          '导出 TeX'
        )}
      </button>

      {open && (
        <div className={`absolute top-full mt-1 z-40 w-64 rounded-md border border-gray-200 bg-white p-3 shadow-lg text-left ${variant === 'icon' ? 'left-0' : 'right-0'}`}>
          <p className="text-xs font-medium text-gray-800 mb-2">导出为 LaTeX</p>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
            生成可编译的 .tex 源文件（建议 XeLaTeX）。习题默认包含续写。
          </p>

          {mode === 'section' && (
            <div className="mb-3 space-y-1.5">
              <p className="text-[11px] text-gray-500">范围</p>
              {[
                { value: 'all', label: '讨论 + 习题' },
                { value: 'discussions', label: '仅讨论区' },
                { value: 'exercises', label: '仅习题区' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="tex-scope"
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value)}
                    className="accent-gray-800"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={includeComments}
              onChange={(e) => setIncludeComments(e.target.checked)}
              className="accent-gray-800"
            />
            包含评论 / 追问
          </label>

          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="w-full bg-gray-800 text-white text-xs py-2 rounded hover:bg-gray-900 disabled:opacity-40 transition-colors"
          >
            {loading ? '生成中…' : '下载 .tex'}
          </button>
        </div>
      )}
    </div>
  );
}
