/* app/admin/materials/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, RotateCcw, Upload } from "lucide-react";

type SizeRow = { length_mm: number; width_mm: number; supplier?: string; usd_per_ton?: number | null; };
type Grade = { grams: number[]; sizes: SizeRow[]; };
type MaterialType = { id?: string; name: string; grades: Grade[]; _edit?: boolean; _snapshot?: MaterialType; };

// Tipo para el JSON externo que importas
type ExternalMaterialRow = {
    name?: string;
    paperWeight?: number;
    priceIndex?: number | null;
    materialSizes?: {
        factorySize?: {
            len?: number;
            wid?: number;
        };
        stocked?: boolean;
    }[];
};

const toNum = (s:string)=>{ const n = Number(s); return Number.isFinite(n) ? n : null; };

// Helper para agrupar gramajes con tamaños idénticos
function groupEquivalentGrades(grades: {grams: number[], sizes: SizeRow[]}[]): Grade[] {
  const bySignature: Record<string, number[]> = {};
  const sizesBySignature: Record<string, SizeRow[]> = {};
  const keyForSizes = (sizes: SizeRow[]) => (sizes||[]).map(s => `${s.length_mm}x${s.width_mm}:${s.supplier}:${s.usd_per_ton}`).sort().join('|');

  (grades||[]).forEach(g => {
    const sig = keyForSizes(g.sizes || []);
    if (!bySignature[sig]) bySignature[sig] = [];
    if (!sizesBySignature[sig]) sizesBySignature[sig] = g.sizes || [];
    bySignature[sig].push(...(Array.isArray(g.grams) ? g.grams : [g.grams as number]));
  });

  return Object.keys(bySignature).map(sig => ({
    grams: Array.from(new Set(bySignature[sig])).sort((a,b)=>a-b),
    sizes: sizesBySignature[sig],
  }));
}

export default function MaterialsAdmin(){
  const [items,setItems] = useState<MaterialType[]>([]);
  const [dirty,setDirty] = useState(false);
  const [msg,setMsg] = useState("");
  const [addingGram, setAddingGram] = useState<{typeIdx:number, gradeIdx:number}|null>(null);
  const [newGramValue, setNewGramValue] = useState("");

  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch("/api/admin/materials",{cache:"no-store"});
      if(!r.ok) return;
      const j = await r.json();
      setItems((j.items || []).map((t:any) => ({...t, grades: groupEquivalentGrades(t.grades)})));
    }catch{}
  })()},[]);

  function mut(i:number, patch:Partial<MaterialType>){ setItems(p=>p.map((x,ix)=>ix===i?({...x,...patch}):x)); setDirty(true); }
  function mutGrade(i:number, gi:number, patch:Partial<Grade>){
    const t = items[i];
    const grades = [...(t.grades||[])];
    grades[gi] = {...grades[gi], ...patch};
    mut(i,{grades});
  }
  function mutSize(i:number, gi:number, si:number, patch:Partial<SizeRow>){
    const t = items[i];
    const grades = [...(t.grades||[])];
    const sizes = [...(grades[gi].sizes||[])];
    sizes[si] = {...sizes[si], ...patch};
    grades[gi] = {...grades[gi], sizes};
    mut(i,{grades});
  }

  function addType(){ setItems(p=>[{ name:"Nuevo tipo", grades:[{ grams:[90], sizes:[] }], _edit:true }, ...p]); setDirty(true); }
  function delType(i:number){ if(!confirm("¿Eliminar este tipo de material?")) return; setItems(p=>p.filter((_,ix)=>ix!==i)); setDirty(true); }
  function startEditType(i:number){ mut(i,{_edit:true,_snapshot:structuredClone(items[i])}); }
  function cancelEditType(i:number){ const snap=items[i]._snapshot; mut(i, snap? {...snap, _edit:false, _snapshot:undefined}:{_edit:false}); }
  function saveEditType(i:number){ mut(i,{_edit:false,_snapshot:undefined}); }

  function addGrade(i:number){ const t = items[i]; mut(i,{grades:[{grams:[], sizes:[]}, ...(t.grades||[])]}); }
  function delGrade(i:number, gi:number){ const t = items[i]; mut(i,{grades:(t.grades||[]).filter((_,gx)=>gx!==gi)}); }
  function addGramChip(typeIdx:number, gradeIdx:number, gram:number){
      const g = items[typeIdx].grades[gradeIdx];
      const grams = Array.from(new Set([...(g.grams||[]), gram])).sort((a,b)=>a-b);
      mutGrade(typeIdx, gradeIdx, {grams});
  }
  function removeGramChip(typeIdx:number, gradeIdx:number, gram:number){
      const g = items[typeIdx].grades[gradeIdx];
      const grams = (g.grams||[]).filter(g => g !== gram);
      if(grams.length === 0 && g.sizes.length > 0){
          if(!confirm("Esto borrará el último gramaje. Se borrarán también los tamaños asociados. ¿Continuar?")){
              return;
          }
          delGrade(typeIdx, gradeIdx);
      } else {
        mutGrade(typeIdx, gradeIdx, {grams});
      }
  }

  function addSize(i:number, gi:number){ const g = items[i].grades[gi]; mutGrade(i,gi,{sizes:[{length_mm:0,width_mm:0,supplier:"",usd_per_ton:0}, ...(g.sizes||[])]}); }
  function delSize(i:number, gi:number, si:number){ const g = items[i].grades[gi]; mutGrade(i,gi,{sizes:(g.sizes||[]).filter((_,sx)=>sx!==si)}); }

  async function saveAll(){
    setMsg("Guardando…");
    try{
      const payload = items.map(({_edit,_snapshot, ...t})=>t);
      const r = await fetch("/api/admin/materials",{method:"PUT",headers:{'Content-Type':'application/json'}, body: JSON.stringify({items:payload})});
      const j = await r.json();
      if(!r.ok) throw new Error(j?.error || "Falló guardado");
      setItems((j.items||payload)); setDirty(false); setMsg("Guardado OK");
    }catch(e:any){ setMsg("No se pudo guardar: "+(e?.message||"error")); }
  }

  const exportHref = useMemo(()=>URL.createObjectURL(new Blob([JSON.stringify({items},null,2)],{type:'application/json'})),[items]);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>){
      const f=e.currentTarget.files?.[0]; if(!f) return;
      try{
          const raw = JSON.parse(await f.text());
          const external: ExternalMaterialRow[] = Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:[]);
          const byName: Record<string, {grams:number, sizes:SizeRow[], usd:number|null}[]> = {};
          
          external.forEach((row: ExternalMaterialRow) => {
              const name = row.name || "Sin nombre";
              if(!byName[name]) byName[name] = [];
              byName[name].push({
                  grams: Number(row.paperWeight || 0),
                  sizes: (row.materialSizes||[]).map((s:any) => ({
                      length_mm: Number(s.factorySize?.len || 0),
                      width_mm: Number(s.factorySize?.wid || 0),
                      supplier: "",
                      usd_per_ton: Number(row.priceIndex || 0)
                  })),
                  usd: Number(row.priceIndex || 0)
              });
          });

          const grouped: MaterialType[] = Object.keys(byName).map(name => {
              return {
                  name,
                  grades: groupEquivalentGrades(byName[name].map(g => ({grams: [g.grams], sizes: g.sizes})))
              };
          });

          setItems(grouped);
          setDirty(true);
          setMsg(`Importados ${grouped.length} tipos de papel.`);
      }catch(err:any){ alert("JSON inválido: "+err.message); }
      e.currentTarget.value="";
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <a href="/admin" className="px-3 py-2 rounded bg-white/10 border border-white/20">↩︎ Volver</a>
        <h1 className="text-2xl font-bold">Materiales</h1>
        <input type="file" accept="application/json" onChange={onImportFile} />
        <button className="px-3 py-2 rounded bg-white text-black" onClick={addType}>Agregar tipo</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20 disabled:opacity-50" onClick={saveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="materials.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty && <span className="text-amber-300 text-sm">Cambios sin guardar</span>}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((t, ti)=>(
          <div key={ti} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <input className="inp w-full text-lg font-semibold min-w-0" value={t.name} onChange={e=>mut(ti,{name:e.target.value})} disabled={!t._edit} />
              {!t._edit ? (
                <button className="btn-ghost" title="Editar" onClick={()=>startEditType(ti)}><Pencil size={18}/></button>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEditType(ti)}><RotateCcw size={18}/></button>
                  <button className="btn-ok" title="Guardar" onClick={()=>saveEditType(ti)}><Upload size={18}/></button>
                  <button className="btn-danger" title="Eliminar tipo" onClick={()=>delType(ti)}><Trash2 size={18}/></button>
                </div>
              )}
            </div>

            <div className="mt-1 space-y-3">
              <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80 font-semibold">Gramajes</span>
                  {t._edit && <button className="btn-ok" onClick={()=>addGrade(ti)}><Plus size={14}/> Añadir</button>}
              </div>
              {(t.grades||[]).map((g, gi)=>(
                <div key={gi} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    {(g.grams||[]).map(gram => (
                      <span key={gram} className="inline-flex items-center gap-2 bg-white text-black rounded-full px-3 py-1 text-sm">
                        {gram} g
                        {t._edit && <button className="text-red-700" onClick={()=>removeGramChip(ti,gi,gram)}><Trash2 size={14}/></button>}
                      </span>
                    ))}
                    {t._edit && (
                      addingGram?.typeIdx === ti && addingGram?.gradeIdx === gi ?
                      <input autoFocus className="inp !py-1 !px-2 w-20" placeholder="g" value={newGramValue} onChange={e=>setNewGramValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){addGramChip(ti,gi,Number(newGramValue)); setAddingGram(null);}}} onBlur={()=>setAddingGram(null)} />
                      : <button className="btn-ok !px-2 !py-1" onClick={()=>setAddingGram({typeIdx:ti, gradeIdx:gi})}><Plus size={14}/></button>
                    )}
                    {t._edit && <button className="btn-danger ml-auto" title="Eliminar bloque" onClick={()=>delGrade(ti,gi)}><Trash2 size={16}/></button>}
                  </div>

                  <div className="space-y-2">
                    {(g.sizes||[]).map((s,si)=>(
                      <div key={si} className="grid grid-cols-12 gap-2 items-center rounded border border-black/60 bg-white text-black p-2">
                        <input className="inp col-span-3" type="number" value={s.length_mm} onChange={e=>mutSize(ti,gi,si,{length_mm:Number(e.target.value)})} disabled={!t._edit} placeholder="Ancho"/>
                        <input className="inp col-span-3" type="number" value={s.width_mm}  onChange={e=>mutSize(ti,gi,si,{width_mm:Number(e.target.value)})}  disabled={!t._edit} placeholder="Largo"/>
                        <input className="inp col-span-3" value={s.supplier||""} onChange={e=>mutSize(ti,gi,si,{supplier:e.target.value})} disabled={!t._edit} placeholder="Proveedor"/>
                        <input className="inp col-span-2" type="number" value={s.usd_per_ton ?? ""} onChange={e=>mutSize(ti,gi,si,{usd_per_ton:toNum(e.target.value)})} disabled={!t._edit} placeholder="USD/Ton"/>
                        <div className="col-span-1 flex justify-end">
                           {t._edit && <button className="btn-danger" onClick={()=>delSize(ti,gi,si)}><Trash2 size={16}/></button>}
                        </div>
                      </div>
                    ))}
                    {t._edit && <button className="btn-ok mt-2" onClick={()=>addSize(ti,gi)}><Plus size={16}/> Añadir tamaño</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}