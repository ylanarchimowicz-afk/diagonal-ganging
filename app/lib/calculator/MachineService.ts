import { Machine, Material, PrintNeeds, PrintingPrice } from './types';

export function calculatePrintingPrice(
    machine: Machine,
    printNeeds: PrintNeeds,
    material: Material
): PrintingPrice {

    const { setupCost, washCost, impressionCost, duplexChargePrice, specialMaterialCharges } = machine;
    const { totalPlates, printRuns } = printNeeds;

    const totalSetupCost = setupCost.perInk ? (setupCost.price * totalPlates) : setupCost.price;
    const totalWashCost = washCost.perInk ? (washCost.price * totalPlates) : washCost.price;

    let totalImpressionCost = 0;
    for (const run of printRuns) {
        const sheetsToCharge = Math.max(run.sheetsToPrint, machine.minImpressionsCharge);
        const passes = impressionCost.perInkPass ? (run.impressionsPerSheetFront + run.impressionsPerSheetBack) : (run.impressionsPerSheetFront > 0 ? 1 : 0) + (run.impressionsPerSheetBack > 0 ? 1 : 0);
        totalImpressionCost += (sheetsToCharge / 1000) * impressionCost.pricePerThousand * passes;
    }

    const totalDuplexChargeCost = (printNeeds.technique !== 'SIMPLEX' && duplexChargePrice) ? duplexChargePrice : 0;

    let totalSpecialMaterialCost = 0;
    if (material.isSpecialMaterial && specialMaterialCharges) {
        totalSpecialMaterialCost += specialMaterialCharges.setupCharge || 0;
        totalSpecialMaterialCost += ((printRuns[0]?.sheetsToPrint || 0) / 1000) * (specialMaterialCharges.impressionCharge || 0);
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