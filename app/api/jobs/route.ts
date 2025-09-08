import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // TODO: implement
  return NextResponse.json({ ok: true, id: 'job_xxx' }, { status: 201 });
}
