'use client';
import { useRef, useEffect, useState } from 'react';
import { renderLatexToHTML } from '@/lib/renderLatex';

export default function LatexPreviewGroup({
  value,
  onChange,
  placeholder = '',
  rows = 4,
  className = '',
  showPreview = true,
  textareaClassName = '',
}) {
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const [height, setHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!showPreview || !textareaRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(textareaRef.current);
    return () => observer.disconnect();
  }, [showPreview]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [value]);

  const previewHtml = showPreview ? renderLatexToHTML(value) : '';
  const showEmptyHint = showPreview && (!value || value.trim() === '');

  if (!showPreview) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`w-full border border-gray-200 p-3 rounded-md text-sm focus:outline-none focus:border-gray-400 resize-y placeholder:text-gray-400 ${textareaClassName}`}
      />
    );
  }

  return (
    <div className={`${isMobile ? 'flex flex-col' : 'flex'} gap-2 ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={isMobile ? Math.min(rows, 4) : rows}
        className={`flex-1 border border-gray-200 p-3 rounded-md text-sm focus:outline-none focus:border-gray-400 resize-y placeholder:text-gray-400 ${textareaClassName}`}
        style={{ minHeight: '60px' }}
      />
      <div
        ref={previewRef}
        className="flex-1 border border-gray-200 p-3 rounded-md bg-gray-50 overflow-y-auto text-sm"
        style={{ height: isMobile ? '150px' : (height ? `${height}px` : 'auto'), minHeight: '80px' }}
      >
        {showEmptyHint ? (
          <span className="text-gray-400 italic">Latex预览</span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )}
      </div>
    </div>
  );
}