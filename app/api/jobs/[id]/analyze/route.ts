import { NextResponse } from 'next/server';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  // TODO: enqueue background work (Supabase Edge Function)
  return NextResponse.json({ ok: true, jobId: params.id }, { status: 202 });
}
