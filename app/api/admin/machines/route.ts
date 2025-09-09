// app/api/admin/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Bracket = {
  name: string;
  constraints: { maxLen: number; maxWid: number };
  sheetCost: { unit: "per_sheet" | "per_thousand"; value: number; currency?: string };
  notes?: string;
};

export async function GET() {
  const supa = supabaseServer();
  const { data, error } = await supa.from("machines").select("*").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const incoming = Array.isArray(payload?.items) ? payload.items : [];
  if (!incoming.length) return NextResponse.json({ error: "items vacío" }, { status: 400 });

  const rows = incoming.map((m: any) => {
    const row: any = {
      // NO enviamos id si no existe (evita 'null value in column id')
      name: String(m.name ?? "Sin nombre"),
      is_offset: !!m.is_offset,
      max_len_mm: m.max_len_mm ?? null,
      max_wid_mm: m.max_wid_mm ?? null,
      min_len_mm: m.min_len_mm ?? null,
      min_wid_mm: m.min_wid_mm ?? null,
      mech_clamp_mm: m.mech_clamp_mm ?? 0,
      mech_tail_mm: m.mech_tail_mm ?? 0,
      mech_sides_mm: m.mech_sides_mm ?? 0,
      base_setup_usd: m.base_setup_usd ?? null,
      base_wash_usd: m.base_wash_usd ?? null,
      base_setup_uyu: m.base_setup_uyu ?? null,
      base_wash_uyu: m.base_wash_uyu ?? null,
      min_impressions: m.min_impressions ?? null,
      feed_long_edge: !!m.feed_long_edge,
      price_brackets: Array.isArray(m.price_brackets) ? m.price_brackets : (m.priceBrackets ?? []),
    };
    if (m.id) row.id = m.id; // sólo si existe
    return row;
  });

  const supa = supabaseServer();
  const { data, error } = await supa
    .from("machines")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false })
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const m = await req.json().catch(()=> ({}));
  const supa = supabaseServer();
  const row: any = {
    name: String(m.name ?? "Sin nombre"),
    is_offset: !!m.is_offset,
    max_len_mm: m.max_len_mm ?? null,
    max_wid_mm: m.max_wid_mm ?? null,
    min_len_mm: m.min_len_mm ?? null,
    min_wid_mm: m.min_wid_mm ?? null,
    mech_clamp_mm: m.mech_clamp_mm ?? 0,
    mech_tail_mm: m.mech_tail_mm ?? 0,
    mech_sides_mm: m.mech_sides_mm ?? 0,
    base_setup_usd: m.base_setup_usd ?? null,
    base_wash_usd: m.base_wash_usd ?? null,
    base_setup_uyu: m.base_setup_uyu ?? null,
    base_wash_uyu: m.base_wash_uyu ?? null,
    min_impressions: m.min_impressions ?? null,
    feed_long_edge: !!m.feed_long_edge,
    price_brackets: Array.isArray(m.price_brackets) ? m.price_brackets : (m.priceBrackets ?? []),
  };
  const { data, error } = await supa.from("machines").insert(row).select("*").single();
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