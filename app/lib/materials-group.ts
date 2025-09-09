/* app/lib/materials-group.ts
   Agrupa gramajes que tienen mismos tamaños (w,l,preferred) y mismo usdPerTon.
   Une los valores de gram en un array y los muestra como chips.
*/
export type MatSize = { w:number; l:number; preferred?:boolean; supplier?:string; usdPerTon?:number|null };
export type MatGram = { gram:number|number[]; sizes: MatSize[] };
export type MatType = { name:string; grams: MatGram[] };

function keySize(s:MatSize){ return `${s.w}x${s.l}:${s.preferred?1:0}:${s.usdPerTon ?? ""}` }

export function groupEquivalentGrams(items: MatType[]): MatType[] {
  return (items||[]).map(t=>{
    const bySignature: Record<string, number[]> = {};
    const gramToSig: string[] = [];
    // construir firma por gramaje
    t.grams.forEach((g, idx)=>{
      const sig = (g.sizes||[])
        .slice()
        .sort((a,b)=> a.w-b.w || a.l-b.l)
        .map(keySize).join("|");
      gramToSig[idx]=sig;
      (bySignature[sig] ||= []).push(typeof g.gram==="number"? g.gram : ([] as number[]).concat(g.gram as any));
    });
    // grupos
    const used = new Set<number>();
    const gramsOut: MatGram[] = [];
    for(let i=0;i<t.grams.length;i++){
      if(used.has(i)) continue;
      const sig = gramToSig[i];
      const groupIdx = [i];
      for(let j=i+1;j<t.grams.length;j++){
        if(!used.has(j) && gramToSig[j]===sig) groupIdx.push(j);
      }
      groupIdx.forEach(k=>used.add(k));
      const mergedSizes = t.grams[i].sizes; // misma firma  mismos sizes
      const mergedGrams = groupIdx.flatMap(k=>{
        const g = t.grams[k].gram;
        return Array.isArray(g)? g as number[] : [g as number];
      }).sort((a,b)=>a-b);
      gramsOut.push({ gram: mergedGrams, sizes: mergedSizes });
    }
    return { ...t, grams: gramsOut };
  });
}