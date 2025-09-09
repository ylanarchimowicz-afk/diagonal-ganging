import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supa = supabaseServer();
  const { data, error } = await supa.from("materials").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const supa = supabaseServer();
  const payload = await req.json().catch(() => ({}));
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const rows = items.map((item: any) => {
    const { id, ...rest } = item;
    const row: any = { ...rest };
    if (id) {
      row.id = id;
    }
    return row;
  });

  const { data, error } = await supa.from("materials").upsert(rows).select();

  if (error) {
    console.error("Error saving materials:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ items: data ?? [] });
}