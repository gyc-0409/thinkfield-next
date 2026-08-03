'use client';

import Link from 'next/link';

const DELETED = '[已删除]';

export default function AuthorLink({ author, className = '', children, stopPropagation = true }) {
  if (!author || author === DELETED) {
    return <span className={className}>{children ?? author}</span>;
  }

  return (
    <Link
      href={`/user/${encodeURIComponent(author)}`}
      className={`hover:text-gray-900 hover:underline underline-offset-2 transition-colors ${className}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {children ?? author}
    </Link>
  );
}
