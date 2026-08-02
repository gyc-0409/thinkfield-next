import { NextResponse } from 'next/server';
import { ALL_UNIVERSITIES } from '@/data/universities';

export async function GET() {
  return NextResponse.json(ALL_UNIVERSITIES);
}
