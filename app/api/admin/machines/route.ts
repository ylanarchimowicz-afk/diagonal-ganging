// app/api/admin/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supa = supabaseServer();
  const { data, error } = await supa.from("machines").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return NextResponse.json({ error: "items vacio" }, { status: 400 });

  const rows = items.map((m: any) => ({
    id: m.id ?? undefined,
    name: String(m.name ?? "Sin nombre"),
    is_offset: !!m.is_offset,
    max_len_mm: m.max_len_mm ?? null,
    max_wid_mm: m.max_wid_mm ?? null,
    min_len_mm: m.min_len_mm ?? null,
    min_wid_mm: m.min_wid_mm ?? null,
    mech_clamp_mm: m.mech_clamp_mm ?? 0,
    mech_tail_mm: m.mech_tail_mm ?? 0,
    mech_sides_mm: m.mech_sides_mm ?? 0,
    base_setup_usd: m.base_setup_usd ?? 0,
    base_wash_usd: m.base_wash_usd ?? 0,
    price_brackets: Array.isArray(m.price_brackets) ? m.price_brackets : (m.priceBrackets ?? []),
  }));

  const supa = supabaseServer();
  const { data, error } = await supa.from("machines").upsert(rows, { onConflict: "id", ignoreDuplicates: false }).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const m = await req.json().catch(()=> ({}));
  const supa = supabaseServer();
  const { data, error } = await supa.from("machines").insert({
    name: String(m.name ?? "Sin nombre"),
    is_offset: !!m.is_offset,
    max_len_mm: m.max_len_mm ?? null,
    max_wid_mm: m.max_wid_mm ?? null,
    min_len_mm: m.min_len_mm ?? null,
    min_wid_mm: m.min_wid_mm ?? null,
    mech_clamp_mm: m.mech_clamp_mm ?? 0,
    mech_tail_mm: m.mech_tail_mm ?? 0,
    mech_sides_mm: m.mech_sides_mm ?? 0,
    base_setup_usd: m.base_setup_usd ?? 0,
    base_wash_usd: m.base_wash_usd ?? 0,
    price_brackets: Array.isArray(m.price_brackets) ? m.price_brackets : (m.priceBrackets ?? []),
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
  const supa = supabaseServer();
  const { error } = await supa.from("machines").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}