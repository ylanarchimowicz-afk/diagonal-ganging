import { Machine, Material, PrintNeeds, PrintingPrice, EstimateRequest } from './types';

export function calculatePrintingPrice(
    machine: Machine,
    printNeeds: PrintNeeds,
    material: Material,
    netSheets: number,
    jobDetails: EstimateRequest['jobDetails']
): PrintingPrice {

    const { setupCost, washCost, impressionCost, duplexChargePrice, specialMaterialCharges } = machine;
    const { totalPlates, printRuns, technique } = printNeeds;
    const { frontInks, backInks } = jobDetails;

    // --- CÁLCULO DE COSTO DE IMPRESIÓN (NUEVA LÓGICA) ---
    let totalImpressionCost = 0;

    if (technique === 'DUPLEX') {
        // Dos posturas: se aplica el mínimo a cada una por separado.
        const sheetsToChargeFront = Math.max(netSheets, machine.minImpressionsCharge);
        const sheetsToChargeBack = Math.max(netSheets, machine.minImpressionsCharge);

        const passesFront = impressionCost.perInkPass ? frontInks : 1;
        const passesBack = impressionCost.perInkPass ? backInks : 1;

        const costFront = (sheetsToChargeFront / 1000) * impressionCost.pricePerThousand * passesFront;
        const costBack = (sheetsToChargeBack / 1000) * impressionCost.pricePerThousand * passesBack;
        
        totalImpressionCost = costFront + costBack;

    } else { // SIMPLEX o WORK_AND_TURN
        // Una postura: el mínimo se aplica sobre el total de pasadas.
        const costableImpressions = netSheets * (technique === 'WORK_AND_TURN' ? 2 : 1);
        const sheetsToCharge = Math.max(costableImpressions, machine.minImpressionsCharge);
        
        const inksForPass = technique === 'WORK_AND_TURN' ? Math.max(frontInks, backInks) : frontInks;
        const passes = impressionCost.perInkPass ? inksForPass : 1;
        
        totalImpressionCost = (sheetsToCharge / 1000) * impressionCost.pricePerThousand * passes;
    }
    
    // --- CÁLCULO DE COSTOS FIJOS (LÓGICA ANTERIOR, YA CORRECTA) ---
    const setupsNeeded = setupCost.perInk ? totalPlates : printRuns.length;
    const totalSetupCost = setupCost.price * setupsNeeded;

    const washesNeeded = washCost.perInk ? totalPlates : printRuns.length;
    const totalWashCost = washCost.price * washesNeeded;
    
    // El costo extra ahora solo aplica a técnicas de una sola postura frente y dorso.
    const isWorkAndTurnOrTumble = technique === 'WORK_AND_TURN' || technique === 'WORK_AND_TUMBLE';
    const totalDuplexChargeCost = (isWorkAndTurnOrTumble && duplexChargePrice) ? duplexChargePrice : 0;

    let totalSpecialMaterialCost = 0;
    if (material.isSpecialMaterial && specialMaterialCharges) {
        const sheetsForSpecialCharge = Math.max(netSheets, machine.minImpressionsCharge);
        totalSpecialMaterialCost += specialMaterialCharges.setupCharge || 0;
        totalSpecialMaterialCost += (sheetsForSpecialCharge / 1000) * (specialMaterialCharges.impressionCharge || 0);
    }

    return {
        setupCost: totalSetupCost,
        washCost: totalWashCost,
        impressionCost: totalImpressionCost,
        duplexChargeCost: totalDuplexChargeCost,
        specialMaterialChargeCost: totalSpecialMaterialCost,
        totalPrintingCost: totalSetupCost + totalWashCost + totalImpressionCost + totalDuplexChargeCost + totalSpecialMaterialCost
    };
}