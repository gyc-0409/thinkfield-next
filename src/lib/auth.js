import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

console.log('[Auth] 初始化 Session 配置');

export const sessionOptions = {
  password: process.env.SESSION_PASSWORD || 'complex_password_at_least_32_characters_long',
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
  console.log('[Auth] getSession 被调用，当前用户:', session.username || '未登录');
  return session;
}

export async function login(username) {
  const session = await getSession();
  session.username = username;
  await session.save();
  console.log('[Auth] 登录成功:', username);
}

export async function logout() {
  const session = await getSession();
  console.log('[Auth] 登出用户:', session.username);
  session.destroy();
}

export async function getCurrentUser() {
  const session = await getSession();
  return session.username || null;
}