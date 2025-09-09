// app/api/admin/materials/route.ts
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

  if (!items.length) {
    // Si se envia un array vacío, borramos todo
    const { error } = await supa.from("materials").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: [] });
  }

  // FIX: Solo enviamos el 'id' si ya existe en el item.
  // Para items nuevos, el campo 'id' no se envía y Supabase lo genera.
  const rows = items.map((item: any) => {
    const { id, name, grades } = item;
    const row: any = { name, grades };
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