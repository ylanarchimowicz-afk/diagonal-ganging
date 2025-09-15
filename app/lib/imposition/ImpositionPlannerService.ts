import { ImpositionRequest, JobItem } from "./types";
import { Estimate, EstimateRequest, Machine, Size } from "@/app/lib/calculator/types";
import { calculateEstimate } from "@/app/lib/calculator/EstimateService";
import { packJobsOnSheets } from "./PackingService";

/**
 * Valida si los trabajos son "juntables".
 */
function validateGangeableJobs(jobs: ImpositionRequest['jobs']): boolean {
    if (jobs.length === 0) return false;
    const firstJobMaterialId = jobs[0].material.id;
    const firstJobFrontInks = jobs[0].frontInks;
    const firstJobBackInks = jobs[0].backInks;
    const firstJobIsDuplex = jobs[0].isDuplex;
    
    return jobs.every(job =>
        job.material.id === firstJobMaterialId &&
        job.frontInks === firstJobFrontInks &&
        job.backInks === firstJobBackInks &&
        job.isDuplex === firstJobIsDuplex
    );
}

/**
 * Orquestador principal del motor de imposición.
 */
export function findBestImpositionPlan(request: ImpositionRequest): Estimate[] {
    const { jobs, availableMachines, availableCuts, options } = request;

    // 1. Validación de trabajos "juntables"
    if (!validateGangeableJobs(jobs)) {
        throw new Error("Los trabajos no son compatibles para ser juntados (difieren en material, tintas o tipo de impresión).");
    }
    
    // **LA CORRECCIÓN ESTÁ AQUÍ**: Extraemos los detalles comunes del primer trabajo.
    const commonDetails: EstimateRequest['jobDetails'] = {
        material: jobs[0].material,
        frontInks: jobs[0].frontInks,
        backInks: jobs[0].backInks,
        isDuplex: jobs[0].isDuplex,
        samePlatesForBack: false, // Esto debería venir en la request, por ahora lo asumimos
        dollarRate: 40.5, // Esto también debería venir en la request
    };
    
    const allPossibleEstimates: Estimate[] = [];

    // 2. Generar y evaluar "Planes de Producción"
    for (const machine of availableMachines) {
        // En tu request, `availableCuts` es un array de CutGroup. Hay que iterar sobre sus `sheetSizes`.
        for (const cutGroup of request.availableCuts) {
            for (const sheetSize of cutGroup.sheetSizes) {

                // 3. Llamada al Motor de Empaquetado (Mochila 2D)
                const { totalSheetsNeeded, isSymmetricalTurn, isSymmetricalTumble } = packJobsOnSheets(jobs, sheetSize);
                
                if (totalSheetsNeeded === Infinity) continue;

                // 4. Llamada a la Calculadora de Costos
                const estimateRequest: EstimateRequest = {
                    jobDetails: commonDetails,
                    productionPlan: {
                        machine,
                        sheetSize,
                        netSheetsToPrint: totalSheetsNeeded,
                        isSymmetricalTurn,
                        isSymmetricalTumble,
                    }
                };

                const estimate = calculateEstimate(estimateRequest);
                
                // 5. Cálculo de Penalizaciones (simplificado)
                let finalCost = estimate.totalCost;
                
                allPossibleEstimates.push({ ...estimate, totalCost: finalCost });
            }
        }
    }

    // 6. Salida de Resultados
    allPossibleEstimates.sort((a, b) => a.totalCost - b.totalCost);

    return allPossibleEstimates.slice(0, options.numberOfResults);
}