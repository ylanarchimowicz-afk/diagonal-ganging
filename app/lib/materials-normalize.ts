/* app/lib/materials-normalize.ts */
export type MatSize = { w:number; l:number; supplier?:string; usdPerTon?:number|null; preferred?:boolean };
export type MatGram = { gram:number; sizes: MatSize[] };
export type MatType = { name:string; grams: MatGram[] };

export function normalizeExternalMaterials(input:any): MatType[] {
  if (!Array.isArray(input)) return [];
  const byName: Record<string, Record<number, MatSize[]>> = {};
  const usdByNameGram: Record<string, Record<number, number|null>> = {};

  for (const row of input) {
    if (!row || typeof row!=="object") continue;
    const name = String(row.name ?? "Sin nombre");
    const weight = Number(row.paperWeight ?? 0);
    const priceIndex = (row.priceIndex!=null) ? Number(row.priceIndex) : null;
    const sizesSrc: any[] = Array.isArray(row.materialSizes) ? row.materialSizes : [];

    byName[name] ||= {};
    byName[name][weight] ||= [];
    (usdByNameGram[name] ||= {})[weight] = priceIndex;

    for (const s of sizesSrc) {
      const w = Number(s?.factorySize?.wid ?? 0);
      const l = Number(s?.factorySize?.len ?? 0);
      const preferred = Boolean(s?.stocked);
      if (w>0 && l>0) byName[name][weight].push({
        w, l, preferred, supplier:"", usdPerTon:priceIndex
      });
    }
  }

  const out: MatType[] = Object.keys(byName).sort().map(name => {
    const grams: MatGram[] = Object.keys(byName[name])
      .map(g => Number(g)).sort((a,b)=>a-b)
      .map(gram => ({
        gram,
        sizes: (byName[name][gram] || []).map(s => ({
          w:s.w, l:s.l, preferred:!!s.preferred, supplier:s.supplier ?? "",
          usdPerTon: typeof usdByNameGram[name]?.[gram] === "number"
            ? (usdByNameGram[name][gram] as number)
            : (s.usdPerTon ?? null),
        })),
      }));
    return { name, grams };
  });

  return out;
}

export function looksLikeExternalMaterials(input:any): boolean {
  return Array.isArray(input) && input.length>0 &&
         typeof input[0]==="object" &&
         ("paperWeight" in input[0]) &&
         ("materialSizes" in input[0]);
}
