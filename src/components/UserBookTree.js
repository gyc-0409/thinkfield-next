'use client';

import { useState } from 'react';
import Link from 'next/link';
import { renderLatexToHTML } from '@/lib/renderLatex';

function DiscussionLink({ item, bookId, nodeId }) {
  return (
    <Link
      href={`/book/${bookId}/section/${nodeId}?q=${encodeURIComponent(item.id)}`}
      className="block rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm hover:border-gray-200 hover:bg-gray-100 transition-colors"
    >
      <div
        className="font-medium text-gray-800 line-clamp-2"
        dangerouslySetInnerHTML={{ __html: renderLatexToHTML(item.title) }}
      />
      <div className="mt-0.5 text-xs text-gray-500 flex flex-wrap gap-x-2">
        {item.type === 'insight' && <span>见解</span>}
        {item.type === 'question' && <span>疑问</span>}
        <span>{item.replies} 回复</span>
        {item.pageRange && <span>页码 {item.pageRange}</span>}
      </div>
    </Link>
  );
}

function AnswerLink({ item, bookId, nodeId }) {
  return (
    <Link
      href={`/book/${bookId}/exercises?nodeId=${encodeURIComponent(nodeId)}&exerciseId=${encodeURIComponent(item.exerciseId)}`}
      className="block rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm hover:border-gray-200 hover:bg-gray-100 transition-colors"
    >
      <div
        className="font-medium text-gray-800 line-clamp-2"
        dangerouslySetInnerHTML={{ __html: renderLatexToHTML(item.exerciseTitle) }}
      />
      <div className="mt-0.5 text-xs text-gray-500">{item.likes} 有价值</div>
    </Link>
  );
}

function TreeNode({ node, bookId, depth, isExpanded, onToggle }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isSection = !hasChildren;
  const expanded = isExpanded(node.id);

  const discussions = node.discussions || [];
  const answers = node.answers || [];
  const hasContent = discussions.length > 0 || answers.length > 0;

  if (isSection && !hasContent) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className="flex w-full items-center gap-2 py-2 px-2 rounded text-left hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        {(hasChildren || hasContent) && (
          <span className="text-xs text-gray-400 w-3 flex-shrink-0">{expanded ? '▼' : '▶'}</span>
        )}
        <span className={`text-sm ${isSection ? 'text-gray-700' : 'font-medium text-gray-600'}`}>
          {node.title}
        </span>
      </button>

      {expanded && isSection && hasContent && (
        <div className="space-y-2 pb-2" style={{ paddingLeft: depth * 16 + 28 }}>
          {discussions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400 font-medium">讨论</p>
              {discussions.map((d) => (
                <DiscussionLink key={d.id} item={d} bookId={bookId} nodeId={node.id} />
              ))}
            </div>
          )}
          {answers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400 font-medium">习题解答</p>
              {answers.map((a, idx) => (
                <AnswerLink
                  key={a.id || `${a.exerciseId}-${idx}`}
                  item={a}
                  bookId={bookId}
                  nodeId={node.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              bookId={bookId}
              depth={depth + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserBookTree({ books, isSelf }) {
  const [activeBookId, setActiveBookId] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);

  const isExpanded = (bookId, nodeId) =>
    activeBookId === bookId && expandedIds.includes(nodeId);

  const toggleNode = (bookId, nodeId) => {
    if (bookId !== activeBookId) {
      setActiveBookId(bookId);
      setExpandedIds([nodeId]);
      return;
    }
    setExpandedIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  if (!books || books.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        {isSelf ? '还没有参与过讨论或习题，去一本书里开个头吧' : '暂无公开贡献'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {books.map((book) => (
        <div key={book.id} className="rounded-md border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900">{book.title}</h3>
          </div>
          <div className="py-2">
            {book.tree.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">暂无章节数据</p>
            ) : (
              book.tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  bookId={book.id}
                  depth={0}
                  isExpanded={(nodeId) => isExpanded(book.id, nodeId)}
                  onToggle={(nodeId) => toggleNode(book.id, nodeId)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
