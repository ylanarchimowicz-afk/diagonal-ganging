import { EstimateRequest, Estimate } from './types';
import { calculateMaterialNeeds } from './MaterialService';
import { getPrintingNeeds } from './PrintingService';
import { calculatePrintingPrice } from './MachineService';

export function calculateEstimate(request: EstimateRequest): Estimate {
    
    const { jobDetails, productionPlan } = request;
    const { material, dollarRate, frontInks, backInks, samePlatesForBack } = jobDetails;
    const { machine, sheetSize, netSheetsToPrint, isSymmetricalTurn, isSymmetricalTumble } = productionPlan;

    const techniquesToTest: string[] = [];
    if (backInks === 0) {
        techniquesToTest.push('SIMPLEX');
    } else {
        techniquesToTest.push('DUPLEX');
        if (isSymmetricalTurn) techniquesToTest.push('WORK_AND_TURN');
    }

    const estimates: Estimate[] = [];

    for (const technique of techniquesToTest) {
        const materialNeeds = calculateMaterialNeeds(material, sheetSize, netSheetsToPrint, machine, frontInks, backInks, dollarRate);
        const printNeeds = getPrintingNeeds(technique, materialNeeds.printingSheets.totalSheets, frontInks, backInks, samePlatesForBack, machine);
        
        // **CORRECCIÓN**: Ahora pasamos 'jobDetails' a la función de cálculo de precios.
        const printingPrice = calculatePrintingPrice(machine, printNeeds, material, netSheetsToPrint, jobDetails);
        
        const totalCost = materialNeeds.totalMaterialCost + printingPrice.totalPrintingCost;

        estimates.push({
            totalCost: totalCost,
            costBreakdown: {
                materialCost: materialNeeds.totalMaterialCost,
                printingCost: printingPrice,
            },
            physicalNeeds: {
                material: materialNeeds,
                printing: printNeeds,
            },
            productionPlan: {
                machineName: machine.name,
                paperName: material.name,
                sheetSize: sheetSize,
                printingTechnique: technique,
            },
        });
    }

    if (estimates.length === 0) {
        throw new Error("No se pudo generar ningún estimado.");
    }

    estimates.sort((a, b) => a.totalCost - b.totalCost);
    return estimates[0];
}