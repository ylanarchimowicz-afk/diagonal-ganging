import { JobItem } from "./types";
import { Size } from "@/app/lib/calculator/types";

export type Placement = {
    jobId: string | number;
    x: number;
    y: number;
    width: number;
    length: number;
    isRotated: boolean;
};

/**
 * Resuelve el problema de la mochila en 2D usando una heurística simple.
 * Acomoda los trabajos en la menor cantidad de pliegos posible.
 */
export function packJobsOnSheets(
    jobs: JobItem[],
    sheetSize: Size
): { totalSheetsNeeded: number; isSymmetricalTurn: boolean; isSymmetricalTumble: boolean } {
    
    // Convertimos cada trabajo en una lista de todas sus piezas individuales
    const allPieces = jobs.flatMap(job => 
        Array(job.quantity).fill({ width: job.width, length: job.length })
    );

    // Priorizamos las piezas más grandes primero
    allPieces.sort((a, b) => (b.width * b.length) - (a.width * a.length));
    
    let sheets = 1;
    const freeRects = [{ x: 0, y: 0, width: sheetSize.width, height: sheetSize.length }];

    // La lógica real de MaxRects es compleja. Esto es una simplificación para iniciar.
    // En una implementación real, aquí iría el algoritmo que intenta colocar cada pieza
    // en los rectángulos libres, dividiéndolos a medida que se llenan.
    
    let totalAreaOfPieces = allPieces.reduce((sum, piece) => sum + (piece.width * piece.length), 0);
    let sheetArea = sheetSize.width * sheetSize.length;
    
    if (sheetArea === 0) return { totalSheetsNeeded: Infinity, isSymmetricalTurn: false, isSymmetricalTumble: false };

    // Cálculo simplificado: cuántos pliegos se necesitan basándose en el área total.
    const totalSheetsNeeded = Math.ceil(totalAreaOfPieces / sheetArea);

    // Placeholder para la lógica de simetría.
    const isSymmetricalTurn = true; // El packer real debería determinar esto.
    const isSymmetricalTumble = false;

    return {
        totalSheetsNeeded: totalSheetsNeeded > 0 ? totalSheetsNeeded : 1, // Mínimo 1 pliego
        isSymmetricalTurn,
        isSymmetricalTumble,
    };
}