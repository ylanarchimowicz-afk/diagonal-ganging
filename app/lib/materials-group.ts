export type MatSize = { w:number; l:number; supplier?:string; usdPerTon?:number|null; preferred?:boolean };
export type MatGram = { gram:number|number[]; sizes: MatSize[] };
export type MatType = { name:string; grams: MatGram[] };

/** clave única por combinación de tamaños + preferred + usdPerTon (ordenada) */
function signatureForSizes(sizes: MatSize[]): string {
  const keySize = (s:MatSize)=> `${s.w}x${s.l}-${s.preferred?1:0}-${s.usdPerTon ?? -1}`;
  return [...sizes].map(keySize).sort().join("|");
}

/** Agrupa gramajes de un mismo material cuando tienen exactamente los mismos tamaños y precio. */
export function groupEquivalentGrams(items: MatType[]): MatType[] {
  return items.map(item => {
    const bySignature: Record<string, number[]> = {};
    const sizesBySignature: Record<string, MatSize[]> = {};

    // recolectar
    item.grams.forEach((g, idx) => {
      const sig = signatureForSizes(g.sizes || []);
      if (!bySignature[sig]) bySignature[sig] = [];
      if (!sizesBySignature[sig]) sizesBySignature[sig] = g.sizes || [];

      const target = bySignature[sig];

      if (typeof g.gram === "number") {
        target.push(g.gram);
      } else if (Array.isArray(g.gram)) {
        for (const n of g.gram) {
          if (typeof n === "number" && Number.isFinite(n)) target.push(n);
        }
      }
    });

    // construir nuevo array de grams (cada entrada puede representar varios gramajes)
    const grams: MatGram[] = Object.keys(bySignature).map(sig => {
      const nums = Array.from(new Set(bySignature[sig])).sort((a,b)=>a-b); // únicos y ordenados
      // mantenemos gram como number|number[] (si hay uno solo, número; si no, array)
      const gram: number|number[] = (nums.length === 1) ? nums[0] : nums;
      return { gram, sizes: sizesBySignature[sig] };
    });

    // ordenar por el menor gramaje de cada grupo
    grams.sort((a,b)=>{
      const aMin = Array.isArray(a.gram) ? Math.min(...a.gram) : a.gram;
      const bMin = Array.isArray(b.gram) ? Math.min(...b.gram) : b.gram;
      return aMin - bMin;
    });

    return { ...item, grams };
  });
}