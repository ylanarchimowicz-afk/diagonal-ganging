import { Machine, Material, Estimate } from "@/app/lib/calculator/types";

// Representa un único trabajo que el usuario quiere imponer
export type JobItem = {
    id: string | number;
    width: number;
    length: number;
    quantity: number;
    // La data de material, tintas, etc., se asume común para todos los jobs "juntables"
    // y se pasará en un nivel superior.
};

// La estructura de un corte disponible, simplificada para el orquestador
export type CutOption = {
    width: number;
    length: number;
};

// La solicitud completa que recibirá nuestra nueva API
export type ImpositionRequest = {
    jobs: JobItem[];
    commonDetails: {
        material: Material;
        frontInks: number;
        backInks: number;
        isDuplex: boolean;
        samePlatesForBack: boolean;
        dollarRate: number;
    };
    availableMachines: Machine[];
    availableCuts: CutOption[];
    options: {
        numberOfResults: number;
        penalties: {
            differentPressSheetPenalty: number;
            differentMachinePenalty: number;
        };
    };
};

// El resultado que devolverá la API
export type ImpositionResult = {
    bestOptions: Estimate[];
};