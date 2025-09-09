// app/api/admin/paper-cuts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supa = supabaseServer();
  const { data, error } = await supa.from("paper_cuts").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const payload = await req.json().catch(()=> ({}));
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return NextResponse.json({ error: "items vacio" }, { status: 400 });

  const rows = items.map((c:any)=> ({
    id: c.id ?? undefined,
    paper_origin_len_mm: c.paper_origin_len_mm ?? c.origin_len_mm ?? null,
    paper_origin_wid_mm: c.paper_origin_wid_mm ?? c.origin_wid_mm ?? null,
    sheet_sizes: Array.isArray(c.sheet_sizes) ? c.sheet_sizes : [],
  }));

  const supa = supabaseServer();
  const { data, error } = await supa.from("paper_cuts").upsert(rows, { onConflict: "id", ignoreDuplicates: false }).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const c = await req.json().catch(()=> ({}));
  const supa = supabaseServer();
  const { data, error } = await supa.from("paper_cuts").insert({
    paper_origin_len_mm: c.paper_origin_len_mm ?? c.origin_len_mm ?? null,
    paper_origin_wid_mm: c.paper_origin_wid_mm ?? c.origin_wid_mm ?? null,
    sheet_sizes: Array.isArray(c.sheet_sizes) ? c.sheet_sizes : [],
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const supa = supabaseServer();
  const { error } = await supa.from("paper_cuts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}