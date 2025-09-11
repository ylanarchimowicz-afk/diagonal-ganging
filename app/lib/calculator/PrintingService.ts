import { Machine, PrintNeeds } from './types';

interface CostCalculator {
    calculateNeeds(totalSheets: number, frontInks: number, backInks: number, samePlates: boolean, machine: Machine): PrintNeeds;
}

class SimplexCostCalculator implements CostCalculator {
    calculateNeeds(totalSheets, frontInks, backInks, samePlates, machine): PrintNeeds {
        return {
            technique: 'SIMPLEX',
            totalPlates: frontInks,
            printRuns: [{ sheetsToPrint: totalSheets, impressionsPerSheetFront: frontInks, impressionsPerSheetBack: 0 }]
        };
    }
}

class DuplexCostCalculator implements CostCalculator {
    calculateNeeds(totalSheets, frontInks, backInks, samePlates, machine): PrintNeeds {
        return {
            technique: 'DUPLEX',
            totalPlates: frontInks + (samePlates ? 0 : backInks),
            printRuns: [{ sheetsToPrint: totalSheets, impressionsPerSheetFront: frontInks, impressionsPerSheetBack: backInks }]
        };
    }
}

class WorkAndTurnCostCalculator implements CostCalculator {
    calculateNeeds(totalSheets, frontInks, backInks, samePlates, machine): PrintNeeds {
        return {
            technique: 'WORK_AND_TURN',
            totalPlates: Math.max(frontInks, backInks),
            printRuns: [{ sheetsToPrint: totalSheets, impressionsPerSheetFront: Math.max(frontInks, backInks), impressionsPerSheetBack: 0 }]
        };
    }
}

const calculators: { [key: string]: CostCalculator } = {
    'SIMPLEX': new SimplexCostCalculator(),
    'DUPLEX': new DuplexCostCalculator(),
    'WORK_AND_TURN': new WorkAndTurnCostCalculator(),
};

export function getPrintingNeeds(
    technique: string,
    totalSheets: number,
    frontInks: number,
    backInks: number,
    samePlates: boolean,
    machine: Machine
): PrintNeeds {
    const calculator = calculators[technique];
    if (!calculator) throw new Error(`Técnica desconocida: ${technique}`);
    return calculator.calculateNeeds(totalSheets, frontInks, backInks, samePlates, machine);
}