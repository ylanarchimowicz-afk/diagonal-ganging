// app/api/admin/materials/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supa = supabaseServer();
  const { data, error } = await supa.from("materials").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const payload = await req.json().catch(()=> ({}));
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return NextResponse.json({ error: "items vacio" }, { status: 400 });

  const rows = items.map((m:any)=> ({
    id: m.id ?? undefined,
    supplier: m.supplier ?? null,
    name: String(m.name ?? "Sin nombre"),
    grammage_gsm: m.grammage_gsm ?? m.gsm ?? null,
    origin_len_mm: m.origin_len_mm ?? m.paper_origin_len_mm ?? null,
    origin_wid_mm: m.origin_wid_mm ?? m.paper_origin_wid_mm ?? null,
    cost_unit: m.cost_unit ?? null,
    cost_value: m.cost_value ?? null,
    stock_sheets: m.stock_sheets ?? null,
  }));

  const supa = supabaseServer();
  const { data, error } = await supa.from("materials").upsert(rows, { onConflict: "id", ignoreDuplicates: false }).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const m = await req.json().catch(()=> ({}));
  const supa = supabaseServer();
  const { data, error } = await supa.from("materials").insert({
    supplier: m.supplier ?? null,
    name: String(m.name ?? "Sin nombre"),
    grammage_gsm: m.grammage_gsm ?? m.gsm ?? null,
    origin_len_mm: m.origin_len_mm ?? m.paper_origin_len_mm ?? null,
    origin_wid_mm: m.origin_wid_mm ?? m.paper_origin_wid_mm ?? null,
    cost_unit: m.cost_unit ?? null,
    cost_value: m.cost_value ?? null,
    stock_sheets: m.stock_sheets ?? null,
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const supa = supabaseServer();
  const { error } = await supa.from("materials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}