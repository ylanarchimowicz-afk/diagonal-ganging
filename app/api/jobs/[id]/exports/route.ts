import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  // TODO: return signed URLs to exports
  return NextResponse.json({ jobId: params.id, files: [] });
}
