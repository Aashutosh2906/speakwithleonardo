import { NextRequest, NextResponse } from 'next/server';
import { logQuery } from '@/lib/github-logger';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { sessionId, question, response } = await req.json();

  await logQuery({
    timestamp: new Date().toISOString(),
    session_id: sessionId ?? 'unknown',
    question: question ?? '',
    response_excerpt: (response ?? '').slice(0, 300),
  });

  return NextResponse.json({ ok: true });
}
