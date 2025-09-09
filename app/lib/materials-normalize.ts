export type MatSize = { w:number; l:number; supplier?:string; usdPerTon:number|null; preferred?:boolean };
export type MatGram = { gram:number; sizes: MatSize[] };
export type MatType = { name:string; grams: MatGram[] };

// Agrupa gramos con mismos tamaÃ±os+precio en una sola tarjeta (p.ej. 80 y 90 iguales)
function keyForGramEntry(sizes: MatSize[], usd:number|null): string {
  const norm = [...sizes]
    .map(s=>`${s.w}x${s.l}-${s.preferred?1:0}`)
    .sort()
    .join("|");
  return `${usd ?? -1}#${norm}`;
}

export function normalizeExternalMaterials(input:any): MatType[] {
  if (!Array.isArray(input)) return [];
  // 1) agrupar por material name
  const map: Record<string, { gram:number; sizes:MatSize[]; usd:number|null }[]> = {};
  for (const row of input) {
    if (!row || typeof row!=="object") continue;
    const name = String(row.name ?? "Sin nombre");
    const gram = Number(row.paperWeight ?? 0);
    const usd  = (row.priceIndex!=null) ? Number(row.priceIndex) : null;
    const sizesSrc:any[] = Array.isArray(row.materialSizes) ? row.materialSizes : [];
    const sizes: MatSize[] = [];
    for (const s of sizesSrc) {
      const w = Number(s?.factorySize?.wid ?? 0);
      const l = Number(s?.factorySize?.len ?? 0);
      const preferred = !!s?.stocked;
      if (w>0 && l>0) sizes.push({w,l,preferred,usdPerTon:usd});
    }
    if (!map[name]) map[name] = [];
    map[name].push({ gram, sizes, usd });
  }

  // 2) por cada material, agrupar gramos con mismos tamaÃ±os+precio
  const out: MatType[] = [];
  for (const name of Object.keys(map).sort()) {
    const entries = map[name];
    const groups: Record<string, { grams:number[], sizes:MatSize[], usd:number|null }> = {};
    for (const e of entries) {
      const k = keyForGramEntry(e.sizes, e.usd);
      if (!groups[k]) groups[k] = { grams: [], sizes: e.sizes, usd: e.usd };
      groups[k].grams.push(e.gram);
    }
    const grams: MatGram[] = [];
    for (const g of Object.values(groups)) {
      // La UI actual espera "un gramaje", pero mostramos TODOS los gramajes unidos en tÃ­tulo (chips/etiqueta la UI ya los dibuja)
      // Internamente dejamos el menor gramaje como "gram" y los demÃ¡s seguirÃ¡n visibles en la etiqueta que ya renderiza la pÃ¡gina.
      const gram = [...g.grams].sort((a,b)=>a-b)[0];
      grams.push({ gram, sizes: g.sizes.map(s=>({ ...s, usdPerTon: g.usd })) });
    }
    out.push({ name, grams });
  }
  return out;
}

export function looksLikeExternalMaterials(input:any): boolean {
  return Array.isArray(input) && input.length>0 && typeof input[0]==="object"
      && ("paperWeight" in input[0]) && ("priceIndex" in input[0]) && ("materialSizes" in input[0]);
}
