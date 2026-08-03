import { describe, it, expect } from 'vitest';
import { formatContinuationPositionHint, findContinuationById } from '@/lib/continuationUtils';

describe('formatContinuationPositionHint', () => {
  it('returns empty for missing input', () => {
    expect(formatContinuationPositionHint('', 5)).toBe('');
    expect(formatContinuationPositionHint('hello', null)).toBe('');
  });

  it('takes up to 15 chars before start with ellipsis', () => {
    expect(formatContinuationPositionHint('abcdefghijklmnopqrstuvwxyz', 20)).toBe('…fghijklmnopqrst');
  });

  it('does not prefix ellipsis at start', () => {
    expect(formatContinuationPositionHint('hello world', 5)).toBe('hello');
  });
});

describe('findContinuationById', () => {
  const tree = [
    { id: 'a', content: 'A', continuations: [{ id: 'b', content: 'B' }] },
  ];

  it('finds nested continuation', () => {
    expect(findContinuationById(tree, 'b')?.content).toBe('B');
  });

  it('returns null when missing', () => {
    expect(findContinuationById(tree, 'z')).toBeNull();
  });
});
