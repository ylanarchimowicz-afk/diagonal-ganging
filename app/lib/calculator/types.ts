import { PackedRect } from "./packer";

// (El resto de los tipos se mantienen igual, solo cambia MaterialNeeds)
export type Size = { width: number; length: number; };
export type Material = { id: number; name: string; grammage: number; isSpecialMaterial: boolean; factorySizes: { width: number; length: number; usdPerTon: number | null; }[]; };
export type Machine = { id: number; name: string; printingBodies: number; sheetFeedOrientation: 'long_edge' | 'short_edge'; margins: { clamp: number; tail: number; sides: number; }; minSheetSize: Size; maxSheetSize: Size; overage: { amount: number; perInk: boolean; }; minImpressionsCharge: number; setupCost: { price: number; perInk: boolean; }; washCost: { price: number; perInk: boolean; }; impressionCost: { pricePerThousand: number; perInkPass: boolean; }; duplexChargePrice?: number; specialMaterialCharges?: { setupCharge?: number; impressionCharge?: number; }; };
export type EstimateRequest = { jobDetails: { material: Material; dollarRate: number; frontInks: number; backInks: number; samePlatesForBack: boolean; }; productionPlan: { machine: Machine; sheetSize: Size; netSheetsToPrint: number; isSymmetricalTurn: boolean; isSymmetricalTumble: boolean; }; };
export type PrintRun = { sheetsToPrint: number; impressionsPerSheetFront: number; impressionsPerSheetBack: number; };
export type PrintNeeds = { technique: string; totalPlates: number; printRuns: PrintRun[]; };
export type PrintingPrice = { setupCost: number; washCost: number; impressionCost: number; duplexChargeCost: number; specialMaterialChargeCost: number; totalPrintingCost: number; };

// --- TIPO DE DATO CORREGIDO ---
export type MaterialNeeds = {
    factorySheets: {
        size: Size;
        quantityNeeded: number;
        /** El plano de corte para UNA hoja de fábrica. La UI puede replicar este dibujo. */
        cuttingPlan: {
            cutsPerSheet: number;
            positions: PackedRect[];
            wastePercentage: number;
        };
    };
    printingSheets: {
        netSheets: number;
        overageSheets: number;
        totalSheets: number;
    };
    totalMaterialCost: number;
};

export type Estimate = { totalCost: number; costBreakdown: { materialCost: number; printingCost: PrintingPrice; }; physicalNeeds: { material: MaterialNeeds; printing: PrintNeeds; }; productionPlan: { machineName: string; paperName: string; sheetSize: Size; printingTechnique: string; }; };