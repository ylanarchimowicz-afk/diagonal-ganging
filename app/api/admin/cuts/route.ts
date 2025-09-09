/* app/api/admin/cuts/route.ts
   GET  -> devuelve { items }
   PUT  -> guarda { items } en memoria de la lambda y devuelve eco
   OPTIONS -> 200 (para preflight)
*/
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Memoria simple mientras no haya DB
let MEMORY: { items: any[] } = { items: [] };

function jsonOk(data: any, init: ResponseInit = {}) {
  return NextResponse.json(data, { status: 200, ...init, headers: { "Cache-Control": "no-store", ...(init.headers||{}) } });
}
function jsonErr(message: string, code = 400) {
  return NextResponse.json({ error: message }, { status: code, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return jsonOk(MEMORY);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];
    MEMORY = { items };
    return jsonOk({ items });
  } catch (e: any) {
    return jsonErr(e?.message || "invalid json", 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// 405 para el resto
export const POST = () => jsonErr("Method Not Allowed", 405);
export const PATCH = () => jsonErr("Method Not Allowed", 405);
export const DELETE = () => jsonErr("Method Not Allowed", 405);