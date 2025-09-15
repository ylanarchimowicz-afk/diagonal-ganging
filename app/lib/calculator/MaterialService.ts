import { Machine, Material, MaterialNeeds, Size } from './types';
import { findBestCut, CuttingPlan } from './packer';

function getUsdPerTonForSize(material: Material, factorySize: Size): number {
    const sizeInfo = material.factorySizes.find(fs => fs.width === factorySize.width && fs.length === factorySize.length);
    return sizeInfo?.usdPerTon || 0;
}

export function calculateMaterialNeeds(
    material: Material,
    printingSheetSize: Size,
    netSheets: number,
    machine: Machine,
    frontInks: number,
    backInks: number,
    dollarRate: number,
): MaterialNeeds {
    // 1. Calcular Merma
    const inkCountForOverage = machine.overage.perInk ? (frontInks + backInks) : 1;
    const overageSheets = machine.overage.amount * inkCountForOverage;
    const totalPrintingSheets = netSheets + overageSheets;

    // 2. Optimización de Corte
    let bestFactoryOption = {
        factorySize: null as Size | null,
        sheetsToCut: Infinity,
        cuttingPlan: null as CuttingPlan | null,
    };

    for (const factorySize of material.factorySizes) {
        const plan = findBestCut(factorySize, printingSheetSize);
        if (plan.cutsPerSheet > 0) {
            const factorySheetsNeeded = Math.ceil(totalPrintingSheets / plan.cutsPerSheet);
            // Elegimos la opción que necesite menos hojas de fábrica
            if (factorySheetsNeeded < bestFactoryOption.sheetsToCut) {
                bestFactoryOption = {
                    factorySize: factorySize,
                    sheetsToCut: factorySheetsNeeded,
                    cuttingPlan: plan,
                };
            }
        }
    }

    if (!bestFactoryOption.factorySize || !bestFactoryOption.cuttingPlan) {
        throw new Error(`No se encontró un tamaño de fábrica en el material "${material.name}" desde el cual se pueda cortar el pliego de ${printingSheetSize.width}x${printingSheetSize.length}`);
    }

    // 3. Calcular Costo del Material
    const usdPerTon = getUsdPerTonForSize(material, bestFactoryOption.factorySize);
    const sheetAreaM2 = (bestFactoryOption.factorySize.width / 1000) * (bestFactoryOption.factorySize.length / 1000);
    const sheetWeightKg = (sheetAreaM2 * material.grammage) / 1000;
    const costPerFactorySheetUSD = (sheetWeightKg / 1000) * usdPerTon;
    const totalMaterialCost = bestFactoryOption.sheetsToCut * costPerFactorySheetUSD * dollarRate;

    return {
        factorySheets: {
            size: bestFactoryOption.factorySize,
            quantityNeeded: bestFactoryOption.sheetsToCut,
            cuttingPlan: bestFactoryOption.cuttingPlan,
        },
        printingSheets: { netSheets, overageSheets, totalSheets: totalPrintingSheets },
        totalMaterialCost,
    };
}