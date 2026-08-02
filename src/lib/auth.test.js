import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TEST_PASSWORD = 'test-session-password-32-chars-min';

describe('auth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SESSION_PASSWORD = TEST_PASSWORD;
  });

  afterEach(() => {
    delete process.env.SESSION_PASSWORD;
  });

  it('throws when SESSION_PASSWORD is missing', async () => {
    delete process.env.SESSION_PASSWORD;
    await expect(import('@/lib/auth')).rejects.toThrow('SESSION_PASSWORD');
  });

  it('exports sessionOptions with expected cookie settings', async () => {
    const { sessionOptions } = await import('@/lib/auth');
    expect(sessionOptions.password).toBe(TEST_PASSWORD);
    expect(sessionOptions.cookieName).toBe('thinkfield-session');
    expect(sessionOptions.cookieOptions.httpOnly).toBe(true);
    expect(sessionOptions.cookieOptions.sameSite).toBe('lax');
  });
});
