'use client';

import { renderLatexToHTML } from '@/lib/renderLatex';

function buildTooltip(exercise) {
  const parts = [exercise.title, exercise.content].filter(Boolean);
  return parts.join('\n\n');
}

export default function ExerciseSidebarItem({ exercise, selected, onClick, className = '' }) {
  const answerCount = exercise.answers?.length || 0;
  const tooltip = buildTooltip(exercise);

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip || undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer ${
        selected ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
      } ${className}`.trim()}
    >
      <div className="flex-1 min-w-0 truncate">
        <span dangerouslySetInnerHTML={{ __html: renderLatexToHTML(exercise.title) }} />
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{answerCount} 个解答</div>
    </div>
  );
}
