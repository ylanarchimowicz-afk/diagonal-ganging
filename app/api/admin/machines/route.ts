import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supa = supabaseServer();
  const { data, error } = await supa.from("machines").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const supa = supabaseServer();
  const payload = await req.json().catch(() => ({}));
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const rows = items.map((item: any) => {
    const row: any = {
      name: item.name,
      printingBodies: item.printingBodies,
      sheetFeedOrientation: item.sheetFeedOrientation,
      margins: item.margins,
      minSheetSize: item.minSheetSize,
      maxSheetSize: item.maxSheetSize,
      overage: item.overage,
      minImpressionsCharge: item.minImpressionsCharge,
      setupCost: item.setupCost,
      washCost: item.washCost,
      impressionCost: item.impressionCost,
      duplexChargePrice: item.duplexChargePrice,
      specialMaterialCharges: item.specialMaterialCharges,
      price_brackets: item.price_brackets
    };
    if (item.id && !String(item.id).startsWith('new-')) {
      row.id = item.id;
    }
    return row;
  });

  const { data, error } = await supa.from("machines").upsert(rows).select();
  if (error) {
      console.error("Error en Supabase al guardar máquinas:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function DELETE(req: NextRequest) {
    const supa = supabaseServer();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });
    const { error } = await supa.from("machines").delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Máquina eliminada" });
}