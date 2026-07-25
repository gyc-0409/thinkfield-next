import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  const { id: bookId } = await params;
  console.log('[API] 获取书籍:', bookId);
  try {
    const result = await pool.query(
      'SELECT id, title, author, hidden, type, tree, chapters, sections FROM books WHERE id = $1',
      [bookId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: '书籍不存在' }, { status: 404 });
    }
    const book = result.rows[0];
    
    // 如果没有 tree 字段或为空，则从旧 chapters/sections 构建临时树
    if (!book.tree || book.tree.length === 0) {
      const chapters = book.chapters || [];
      const sections = book.sections || [];
      const tree = [];
      for (let i = 0; i < chapters.length; i++) {
        const chapterNode = {
          id: `old-ch-${i}`,
          title: chapters[i],
          children: []
        };
        const sectionList = sections[i] || [];
        for (let j = 0; j < sectionList.length; j++) {
          chapterNode.children.push({
            id: `old-sec-${i}-${j}`,
            title: sectionList[j],
            children: []
          });
        }
        tree.push(chapterNode);
      }
      book.tree = tree;
    }
    
    return NextResponse.json(book);
  } catch (e) {
    console.error('[API] 获取书籍失败:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}