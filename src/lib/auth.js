import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_PASSWORD = process.env.SESSION_PASSWORD;
if (!SESSION_PASSWORD) {
  throw new Error(
    '缺少环境变量 SESSION_PASSWORD。\n' +
    '请在项目根目录的 .env.local 文件中添加一行：SESSION_PASSWORD=你的32位以上随机字符串\n' +
    '然后重启开发服务器。'
  );
}

export const sessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: 'thinkfield-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, sessionOptions);
  return session;
}

export async function login(username) {
  const session = await getSession();
  session.username = username;
  await session.save();
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}

export async function getCurrentUser() {
  const session = await getSession();
  return session.username || null;
}

/** 若用户被禁言则返回 403 Response，否则返回 null */
export async function assertNotBanned(username) {
  if (!username) return null;
  const { default: pool } = await import('@/lib/db');
  const result = await pool.query(
    'SELECT banned FROM users WHERE username = $1',
    [username]
  );
  if (result.rowCount > 0 && result.rows[0].banned) {
    return NextResponse.json({ error: '账号已被禁言' }, { status: 403 });
  }
  return null;
}

export function serverError(error, label = 'API') {
  console.error(`[${label}]`, error?.message || error);
  return NextResponse.json({ error: '服务器错误' }, { status: 500 });
}
