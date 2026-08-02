import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit } from '@/lib/rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  it('allows requests under the max', () => {
    expect(rateLimit('t1', { windowMs: 60_000, max: 2 }).allowed).toBe(true);
    expect(rateLimit('t1', { windowMs: 60_000, max: 2 }).allowed).toBe(true);
  });

  it('blocks when max is exceeded', () => {
    rateLimit('t2', { windowMs: 60_000, max: 1 });
    const blocked = rateLimit('t2', { windowMs: 60_000, max: 1 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after the window', () => {
    rateLimit('t3', { windowMs: 60_000, max: 1 });
    expect(rateLimit('t3', { windowMs: 60_000, max: 1 }).allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit('t3', { windowMs: 60_000, max: 1 }).allowed).toBe(true);
  });
});
