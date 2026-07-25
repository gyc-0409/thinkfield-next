'use client';
import { useState } from 'react';

function TreeNode({ node, depth, onSelectLeaf }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = !hasChildren;
  const nodeId = node.id || `fallback-${depth}-${node.title || 'untitled'}`;

  const toggleExpand = () => {
    if (hasChildren) setExpanded(!expanded);
  };

  return (
    <div>
      <div
        className="flex items-center py-2 md:py-1 px-2 rounded cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => {
          if (isLeaf) {
            onSelectLeaf({ ...node, id: nodeId });
          } else {
            toggleExpand();
          }
        }}
      >
        {hasChildren && (
          <span className="mr-2 text-xs text-gray-400">{expanded ? '▼' : '▶'}</span>
        )}
        <span className={`text-sm ${isLeaf ? 'text-gray-700 hover:text-gray-900' : 'font-medium text-gray-600'}`}>
          {node.title}
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id || `fallback-${depth + 1}-${child.title || ''}`}
              node={child}
              depth={depth + 1}
              onSelectLeaf={onSelectLeaf}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookTree({ tree, onSelectLeaf }) {
  if (!tree || tree.length === 0) {
    return <p className="text-sm text-gray-400">暂无章节</p>;
  }
  return (
    <div>
      {tree.map(node => (
        <TreeNode
          key={node.id || `fallback-root-${node.title || ''}`}
          node={node}
          depth={0}
          onSelectLeaf={onSelectLeaf}
        />
      ))}
    </div>
  );
}