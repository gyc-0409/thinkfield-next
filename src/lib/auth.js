import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

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