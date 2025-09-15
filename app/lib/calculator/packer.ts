import { Size } from './types';

// Representa una pieza (un pliego) con sus coordenadas en la hoja de fábrica
export type PackedRect = { x: number; y: number; width: number; length: number };

// Representa el resultado del cálculo de corte para una hoja de fábrica
export type CuttingPlan = {
    cutsPerSheet: number;
    positions: PackedRect[];
    wastePercentage: number;
};

/**
 * Función 'acomoda', traducida de tu código de referencia.
 * Calcula un grid simple y devuelve el desglose.
 */
function acomoda(sheetW: number, sheetH: number, cutW: number, cutH: number): { count: number; positions: PackedRect[]; cols: number; rows: number; } {
    if (cutW <= 0 || cutH <= 0 || sheetW < cutW || sheetH < cutH) {
        return { count: 0, positions: [], cols: 0, rows: 0 };
    }
    
    const cols = Math.floor(sheetW / cutW);
    const rows = Math.floor(sheetH / cutH);
    const count = cols * rows;

    const positions: PackedRect[] = [];
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            positions.push({ x: i * cutW, y: j * cutH, width: cutW, length: cutH });
        }
    }
    return { count, positions, cols, rows };
}

/**
 * Encuentra la mejor forma de cortar, implementando la lógica de 'Máximo' de tu código.
 */
export function findBestCut(sheet: Size, cut: Size): CuttingPlan {
    const b = Math.max(sheet.width, sheet.length);
    const h = Math.min(sheet.width, sheet.length);
    const cb = Math.max(cut.width, cut.length);
    const ch = Math.min(cut.width, cut.length);

    let bestPlan = { count: 0, positions: [] as PackedRect[] };

    // --- Estrategia 1: Acomodo Horizontal y luego subdividir el sobrante ---
    const initialH = acomoda(b, h, cb, ch);
    let bestHorizontal = { count: initialH.count, positions: initialH.positions };

    for (let i = 1; i <= initialH.cols; i++) {
        const mainW = i * cb;
        const remainingW = b - mainW;
        
        const mainCut = acomoda(mainW, h, cb, ch);
        const remainingCut = acomoda(remainingW, h, ch, cb); // Probar sobrante con corte rotado

        if (mainCut.count + remainingCut.count > bestHorizontal.count) {
            const combinedPositions = [...mainCut.positions];
            remainingCut.positions.forEach(p => combinedPositions.push({ ...p, x: p.x + mainW }));
            bestHorizontal = { count: mainCut.count + remainingCut.count, positions: combinedPositions };
        }
    }
    
    // --- Estrategia 2: Acomodo Vertical y luego subdividir el sobrante ---
    const initialV = acomoda(b, h, ch, cb);
    let bestVertical = { count: initialV.count, positions: initialV.positions };
    
    for (let i = 1; i <= initialV.rows; i++) {
        const mainH = i * cb; // cb porque el corte está rotado (ch, cb)
        const remainingH = h - mainH;

        const mainCut = acomoda(b, mainH, ch, cb);
        const remainingCut = acomoda(b, remainingH, cb, ch); // Probar sobrante con corte sin rotar

        if (mainCut.count + remainingCut.count > bestVertical.count) {
            const combinedPositions = [...mainCut.positions];
            remainingCut.positions.forEach(p => combinedPositions.push({ ...p, y: p.y + mainH }));
            bestVertical = { count: mainCut.count + remainingCut.count, positions: combinedPositions };
        }
    }
    
    // Elegir la mejor de las dos estrategias
    if (bestHorizontal.count > bestVertical.count) {
        bestPlan = bestHorizontal;
    } else {
        bestPlan = bestVertical;
    }

    const areaUtilizada = bestPlan.count * (cut.width * cut.length);
    const areaTotal = sheet.width * sheet.length;
    const wastePercentage = 100 - ((areaUtilizada / areaTotal) * 100);

    return {
        cutsPerSheet: bestPlan.count,
        positions: bestPlan.positions,
        wastePercentage: wastePercentage,
    };
}