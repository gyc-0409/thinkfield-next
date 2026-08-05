'use client';

import { formatContinuationPositionHint } from '@/lib/continuationUtils';

export default function ContinuationPositionHint({ content, start, onClick, className = '' }) {
  if (start == null || start === undefined) return null;
  const hint = formatContinuationPositionHint(content, start);
  if (!hint) return null;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="点击聚焦原文"
        className={`text-xs text-gray-400 hover:text-gray-600 italic cursor-pointer underline decoration-gray-300 hover:decoration-gray-500 underline-offset-2 transition-colors ${className}`}
      >
        续写位置：{hint}
        <span className="not-italic no-underline text-gray-400 ml-1">（点击聚焦原文）</span>
      </button>
    );
  }

  return <p className={`text-xs text-gray-400 mb-2 ${className}`}>续写位置：{hint}</p>;
}
