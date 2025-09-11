import { NextRequest, NextResponse } from "next/server";
import { EstimateRequest, Machine, Material } from "@/app/lib/calculator/types";
import { calculateEstimate } from "@/app/lib/calculator/EstimateService";

export async function POST(req: NextRequest) {
  try {
    const requestBody: EstimateRequest = await req.json();

    // Aquí, en una implementación real, los objetos `machine` y `material`
    // vendrían con un ID, y tendríamos que cargarlos desde Supabase para
    // asegurarnos de que los datos son frescos y no manipulados por el cliente.
    // Por ahora, confiamos en los datos que vienen en el request.
    
    if (!requestBody.productionPlan?.machine || !requestBody.jobDetails?.material) {
        return NextResponse.json({ error: "Faltan datos de máquina o material en la solicitud." }, { status: 400 });
    }

    const finalEstimate = calculateEstimate(requestBody);

    return NextResponse.json({ bestOption: finalEstimate });

  } catch (error: any) {
    console.error("Error en /api/jobs/calculate:", error);
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 });
  }
}