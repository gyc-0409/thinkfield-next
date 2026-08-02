import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetcher } from '@/lib/fetcher';

describe('fetcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON when response is ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ books: [] }),
    }));

    await expect(fetcher('/api/books')).resolves.toEqual({ books: [] });
  });

  it('throws when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(fetcher('/api/books')).rejects.toThrow('请求失败');
  });
});
