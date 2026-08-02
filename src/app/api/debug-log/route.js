import { NextResponse } from 'next/server';

// 进程内环形缓冲，供线上调试拉取（不落盘）
const logs = [];
const MAX = 50;

export async function POST(request) {
  try {
    const body = await request.json();
    logs.push({ ...body, timestamp: body.timestamp || Date.now() });
    if (logs.length > MAX) logs.splice(0, logs.length - MAX);
    return NextResponse.json({ ok: true, n: logs.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ logs });
}

export async function DELETE() {
  logs.length = 0;
  return NextResponse.json({ ok: true });
}
