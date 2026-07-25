'use client';
import { useState } from 'react';

let uidCounter = 0;

function newNode(title = '') {
  return { id: 'n-' + (++uidCounter), title, children: [] };
}

function TreeNode({ node, depth, maxDepth, onUpdate, onDelete }) {
  const isLeaf = depth >= maxDepth;

  const handleTitleChange = (e) => {
    onUpdate({ ...node, title: e.target.value });
  };

  const handleAddChild = () => {
    const child = newNode('');
    onUpdate({ ...node, children: [...node.children, child] });
  };

  return (
    <div style={{ marginLeft: depth * 20, marginTop: 6, paddingLeft: depth > 0 ? 8 : 0, borderLeft: depth > 0 ? '2px solid #e5e7eb' : 'none' }}>
      <div className="flex items-center gap-2">
        <input
          value={node.title}
          onChange={handleTitleChange}
          placeholder={isLeaf ? '小节名称' : '层级名称'}
          className="border border-gray-200 p-1.5 rounded text-sm flex-1"
        />
        {!isLeaf && (
          <button onClick={handleAddChild} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">+ 子级</button>
        )}
        <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-500 px-1">删除</button>
      </div>
      {node.children && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          maxDepth={maxDepth}
          onUpdate={(updatedChild) => {
            const newChildren = node.children.map(c => c.id === updatedChild.id ? updatedChild : c);
            onUpdate({ ...node, children: newChildren });
          }}
          onDelete={() => {
            const newChildren = node.children.filter(c => c.id !== child.id);
            onUpdate({ ...node, children: newChildren });
          }}
        />
      ))}
    </div>
  );
}

export default function TreeEditor({ tree, maxDepth, onChange }) {
  const handleUpdateRoot = (index, updatedNode) => {
    const newTree = tree.map((node, i) => i === index ? updatedNode : node);
    onChange(newTree);
  };

  const addRoot = () => {
    onChange([...tree, newNode('')]);
  };

  return (
    <div>
      {tree.map((node, index) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          maxDepth={maxDepth}
          onUpdate={(updatedNode) => handleUpdateRoot(index, updatedNode)}
          onDelete={() => {
            const newTree = tree.filter((_, i) => i !== index);
            onChange(newTree);
          }}
        />
      ))}
      <button onClick={addRoot} className="text-sm bg-gray-100 border border-gray-300 px-3 py-1 rounded hover:bg-gray-200 mt-2">
        + 添加顶层
      </button>
    </div>
  );
}