'use client';

import { useState } from 'react';
import { renderLatexToHTML } from '@/lib/renderLatex';

export default function ExerciseSidebarItem({ exercise, selected, onClick, className = '', previewPlacement = 'right' }) {
  const [hovered, setHovered] = useState(false);
  const answerCount = exercise.answers?.length || 0;
  const hasContent = Boolean(exercise.title || exercise.content);

  return (
    <div
      className={`relative ${className}`.trim()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
          selected ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <div className="truncate" dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.title) }} />
        <div className="text-xs text-gray-400 mt-0.5">{answerCount} 个解答</div>
      </button>

      {hovered && hasContent && (
        <div
          className={
            previewPlacement === 'below'
              ? 'absolute left-0 top-full mt-1 z-50 w-full min-w-[16rem]'
              : 'absolute left-full top-0 ml-2 z-50 hidden md:block w-72 max-w-[min(20rem,calc(100vw-12rem))]'
          }
        >
          <div className="bg-white border border-gray-200 shadow-lg rounded-md p-3 text-sm text-gray-700 max-h-64 overflow-y-auto">
            {exercise.title && (
              <div
                className="font-medium text-gray-900 mb-2"
                dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.title) }}
              />
            )}
            {exercise.content ? (
              <div
                className="text-gray-600 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.content) }}
              />
            ) : (
              <p className="text-gray-400 text-xs">暂无习题内容</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
