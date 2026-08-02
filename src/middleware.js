import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/auth';

export async function middleware(request) {
  if (!request.nextUrl.pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  try {
    const session = await getIronSession(request, response, sessionOptions);
    if (!session.username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
  return response;
}

export const config = {
  matcher: '/api/admin/:path*',
};
