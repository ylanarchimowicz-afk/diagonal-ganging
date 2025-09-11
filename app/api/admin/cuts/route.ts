import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const fromDB = (item: any) => ({
    id: item.id,
    forPaperSize: { length: item.stock_len_mm, width: item.stock_wid_mm },
    sheetSizes: item.cuts || [],
});
const toDB = (item: any) => {
    const row: any = {
        stock_len_mm: item.forPaperSize?.length,
        stock_wid_mm: item.forPaperSize?.width,
        cuts: item.sheetSizes || [],
    };
    if (item.id && !String(item.id).startsWith('new-')) {
        row.id = item.id;
    }
    return row;
};

export async function GET() {
  const supa = supabaseServer();
  const { data, error } = await supa.from("cuts").select("*").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data?.map(fromDB) ?? [] });
}

export async function PUT(req: NextRequest) {
  const supa = supabaseServer();
  const payload = await req.json().catch(() => ({}));
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const rows = items.map(toDB);
  const { data, error } = await supa.from("cuts").upsert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data?.map(fromDB) ?? [] });
}

export async function DELETE(req: NextRequest) {
    const supa = supabaseServer();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    const { error } = await supa.from("cuts").delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Grupo de cortes eliminado" });
}