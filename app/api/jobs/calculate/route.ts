import { NextRequest, NextResponse } from "next/server";
import { EstimateRequest } from "@/app/lib/calculator/types";
import { calculateEstimate } from "@/app/lib/calculator/EstimateService";

export async function POST(req: NextRequest) {
  console.log("\n\n--- [API] /api/jobs/calculate RECIBIÓ UNA SOLICITUD POST ---");
  try {
    const requestBody: EstimateRequest = await req.json();
    console.log("[API] Request Body parseado correctamente.");
    
    if (!requestBody.productionPlan?.machine || !requestBody.jobDetails?.material) {
        console.error("[API] Error: Faltan datos de máquina o material.");
        return NextResponse.json({ error: "Faltan datos de máquina o material." }, { status: 400 });
    }

    console.log("[API] Iniciando llamada a calculateEstimate...");
    const finalEstimate = calculateEstimate(requestBody);
    console.log("[API] calculateEstimate devolvió un resultado. Enviando respuesta...");

    return NextResponse.json({ bestOption: finalEstimate });

  } catch (error: any) {
    console.error("--- [API] ERROR CATASTRÓFICO CAPTURADO ---");
    console.error(error);
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 });
  }
}