import { Machine, Material, MaterialNeeds, Size } from './types';

function getUsdPerTonForSize(material: Material, sheetSize: Size): number {
    const factorySize = material.factorySizes.find(fs => fs.width === sheetSize.width && fs.length === sheetSize.length);
    return factorySize?.usdPerTon || 0;
}

export function calculateMaterialNeeds(
    material: Material,
    sheetSize: Size,
    netSheets: number,
    machine: Machine,
    frontInks: number,
    backInks: number,
    dollarRate: number,
): MaterialNeeds {
    // 1. Calcular Merma
    const inkCountForOverage = machine.overage.perInk ? (frontInks + backInks) : 1;
    const overageSheets = machine.overage.amount * inkCountForOverage;
    const totalSheets = netSheets + overageSheets;

    // 2. Calcular Hojas de Fábrica (asume que 1 pliego = 1 hoja de fábrica)
    const factorySheetsNeeded = totalSheets;
    
    // 3. Calcular Costo del Material
    const usdPerTon = getUsdPerTonForSize(material, sheetSize);
    const sheetAreaM2 = (sheetSize.width / 1000) * (sheetSize.length / 1000);
    const sheetWeightKg = (sheetAreaM2 * material.grammage) / 1000;
    const costPerSheetUsd = (sheetWeightKg / 1000) * usdPerTon;
    const totalMaterialCostInLocalCurrency = factorySheetsNeeded * costPerSheetUsd * dollarRate;

    return {
        factorySheets: {
            size: sheetSize,
            quantityNeeded: factorySheetsNeeded
        },
        printingSheets: {
            netSheets: netSheets,
            overageSheets: overageSheets,
            totalSheets: totalSheets
        },
        totalMaterialCost: totalMaterialCostInLocalCurrency
    };
}