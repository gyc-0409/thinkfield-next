/**
 * 进程内滑动窗口限流（适合 Railway 单实例）。
 * @param {string} key
 * @param {{ windowMs: number, max: number }} options
 * @returns {{ allowed: boolean, retryAfterSec?: number }}
 */
const buckets = new Map();

export function rateLimit(key, { windowMs, max }) {
  const now = Date.now();
  let timestamps = buckets.get(key);
  if (!timestamps) {
    timestamps = [];
    buckets.set(key, timestamps);
  }

  const cutoff = now - windowMs;
  while (timestamps.length > 0 && timestamps[0] <= cutoff) {
    timestamps.shift();
  }

  if (timestamps.length >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  timestamps.push(now);
  return { allowed: true };
}

export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
