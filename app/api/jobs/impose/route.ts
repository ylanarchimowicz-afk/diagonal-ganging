import { NextRequest, NextResponse } from "next/server";
import { ImpositionRequest } from "@/app/lib/imposition/types";
import { findBestImpositionPlan } from "@/app/lib/imposition/ImpositionPlannerService";

export async function POST(req: NextRequest) {
  try {
    const requestBody: ImpositionRequest = await req.json();
    
    if (!requestBody.jobs || requestBody.jobs.length === 0) {
        return NextResponse.json({ error: "La lista de trabajos no puede estar vacía." }, { status: 400 });
    }

    const bestOptions = findBestImpositionPlan(requestBody);

    return NextResponse.json({ bestOptions });

  } catch (error: any) {
    console.error("Error en /api/jobs/impose:", error);
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 });
  }
}