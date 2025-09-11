import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
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
    const { id, name, grades } = item;
    const row: any = { name, grades };
    if (id && !String(id).startsWith('new-')) {
      row.id = id;
    }
    return row;
  });
  const { data, error } = await supa.from("materials").upsert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function DELETE(req: NextRequest) {
    const supa = supabaseServer();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    const { error } = await supa.from("materials").delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Tipo de material eliminado" });
}