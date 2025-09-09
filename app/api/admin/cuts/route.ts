import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try{
    const supa = supabaseServer();
    const { data, error } = await supa.from("cuts").select("*").order("created_at",{ascending:true});
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const items = (data||[]).map((r:any)=> ({
      forPaperSize: { length:r.for_len_mm, width:r.for_wid_mm },
      sheetSizes: Array.isArray(r.sheet_sizes) ? r.sheet_sizes : [],
    }));
    return NextResponse.json({ items });
  }catch{
    return new NextResponse(null, { status: 204 });
  }
}

export async function PUT(req: NextRequest) {
  let payload:any = {};
  try{ payload = await req.json(); }catch{}
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return NextResponse.json({ error:"items vacío" }, { status:400 });

  const rows = items.map((g:any)=> ({
    for_len_mm: g?.forPaperSize?.length ?? null,
    for_wid_mm: g?.forPaperSize?.width ?? null,
    sheet_sizes: Array.isArray(g?.sheetSizes) ? g.sheetSizes.map((s:any)=>({
      length: s?.length ?? null,
      width:  s?.width  ?? null,
      preferred: !!s?.preferred
    })) : [],
  }));

  try{
    const supa = supabaseServer();
    const { data, error } = await supa.from("cuts").upsert(rows, { ignoreDuplicates:false }).select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const out = (data||[]).map((r:any)=> ({
      forPaperSize: { length:r.for_len_mm, width:r.for_wid_mm },
      sheetSizes: Array.isArray(r.sheet_sizes) ? r.sheet_sizes : [],
    }));
    return NextResponse.json({ items: out });
  }catch(err:any){
    return NextResponse.json({ error: (err?.message || "Tabla 'cuts' inexistente. Crea la tabla o usa Exportar JSON.") }, { status: 500 });
  }
}