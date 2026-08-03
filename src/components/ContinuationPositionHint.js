'use client';

import { formatContinuationPositionHint } from '@/lib/continuationUtils';

export default function ContinuationPositionHint({ content, start, onClick, className = '' }) {
  if (start == null || start === undefined) return null;
  const hint = formatContinuationPositionHint(content, start);
  if (!hint) return null;

  const label = `续写位置：${hint}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline cursor-pointer ${className}`}
      >
        {label}
      </button>
    );
  }

  return <p className={`text-xs text-gray-400 mb-2 ${className}`}>{label}</p>;
}
