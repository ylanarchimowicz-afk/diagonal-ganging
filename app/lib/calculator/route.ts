import { NextRequest, NextResponse } from "next/server";
import { EstimateRequest } from "@/app/lib/calculator/types";
import { calculateEstimate } from "@/app/lib/calculator/EstimateService";

export async function POST(req: NextRequest) {
  try {
    const requestBody: EstimateRequest = await req.json();
    
    if (!requestBody.productionPlan?.machine || !requestBody.jobDetails?.material) {
        return NextResponse.json({ error: "Faltan datos de máquina o material." }, { status: 400 });
    }

    const finalEstimate = calculateEstimate(requestBody);

    return NextResponse.json({ bestOption: finalEstimate });

  } catch (error: any) {
    console.error("Error en /api/jobs/calculate:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
}