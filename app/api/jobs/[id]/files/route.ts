import { NextResponse } from 'next/server';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  // TODO: persist confirmation
  return NextResponse.json({ ok: true, jobId: params.id });
}
