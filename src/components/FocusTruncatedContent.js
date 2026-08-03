'use client';

import { renderLatexToHTML } from '@/lib/renderLatex';

export default function FocusTruncatedContent({
  content,
  cutAfterIdx,
  focusExitId,
  onExitFocus,
  nodeId,
  className = '',
  style,
  ...handlers
}) {
  const isFocusTruncated = focusExitId != null && cutAfterIdx !== undefined;
  const skipEllipsis = isFocusTruncated;

  return (
    <div
      className={`answer-text-container ${className}`.trim()}
      data-node-id={nodeId}
      style={{ whiteSpace: 'pre-wrap', ...style }}
      {...handlers}
    >
      <span dangerouslySetInnerHTML={{ __html: renderLatexToHTML(content, cutAfterIdx, skipEllipsis) }} />
      {isFocusTruncated && (
        <>
          <span className="ellipsis-indicator text-gray-500">...</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExitFocus?.(focusExitId);
            }}
            className="ml-1 inline-flex items-center text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 align-middle"
          >
            退出
          </button>
        </>
      )}
    </div>
  );
}
