/* app/admin/materials/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, RotateCcw, Upload, X, ArrowLeft, FileUp } from "lucide-react";

type SizeRow = { length_mm: number; width_mm: number; supplier?: string; usd_per_ton?: number | null; };
// **CAMBIO**: Se añade `isSpecialMaterial` al grupo de gramajes.
type Grade = { grams: number[]; sizes: SizeRow[]; isSpecialMaterial?: boolean; };
type MaterialType = { id?: string; name: string; grades: Grade[]; _dirty?: boolean; _snapshot?: MaterialType; };

const toNum = (s:string)=>{ const n = Number(s); return Number.isFinite(n) ? n : null; };

// Helper para agrupar gramajes con tamaños idénticos. Ahora también considera isSpecialMaterial.
function groupEquivalentGrades(grades: any[]): Grade[] {
  if (!grades) return [];
  const bySignature: Record<string, { grams: number[], isSpecial: boolean }> = {};
  const sizesBySignature: Record<string, SizeRow[]> = {};
  const keyForSizes = (sizes: SizeRow[]) => (sizes||[]).map(s => `${s.length_mm}x${s.width_mm}:${s.supplier}:${s.usd_per_ton}`).sort().join('|');

  grades.forEach(g => {
    const sig = keyForSizes(g.sizes || []);
    if (!bySignature[sig]) bySignature[sig] = { grams: [], isSpecial: false };
    if (!sizesBySignature[sig]) sizesBySignature[sig] = g.sizes || [];
    
    const gramsToAdd = Array.isArray(g.grams) ? g.grams : [Number(g.grams)].filter(n => n > 0);
    bySignature[sig].grams.push(...gramsToAdd);
    // Si cualquier material del grupo es especial, todo el grupo se considera especial.
    if (g.isSpecialMaterial) {
        bySignature[sig].isSpecial = true;
    }
  });

  return Object.keys(bySignature).map(sig => ({
    grams: Array.from(new Set(bySignature[sig].grams)).sort((a,b)=>a-b),
    sizes: sizesBySignature[sig],
    isSpecialMaterial: bySignature[sig].isSpecial,
  }));
}

const EditableField = ({ value, onChange, placeholder, className = "" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const commonClasses = `w-full bg-transparent px-1 py-0.5 rounded-sm transition-colors text-white/90`;
  const viewClasses = `border-b border-transparent hover:border-white/30 cursor-pointer`;
  const editClasses = `border-b border-white/60 focus:border-white focus:outline-none bg-black/30`;

  if (isEditing) {
    return ( <input type="text" value={value ?? ""} onChange={onChange} onBlur={() => setIsEditing(false)} onKeyDown={(e) => { if(e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLElement).blur() }} placeholder={placeholder} className={`${commonClasses} ${editClasses} ${className}`} autoFocus /> );
  }
  return (
    <div className={`${commonClasses} ${viewClasses} min-h-[32px] flex items-center ${className}`} onClick={() => setIsEditing(true)}>
      {value || <span className="text-white/40">{placeholder}</span>}
    </div>
  );
};

export default function MaterialsAdmin(){
  const [items,setItems] = useState<MaterialType[]>([]);
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

  function mut(i:number, patch:Partial<MaterialType>){ 
    setItems(p=>p.map((x,ix)=>{
        if(ix !== i) return x;
        const snapshot = x._snapshot ?? structuredClone(x);
        return {...x, ...patch, _dirty: true, _snapshot: snapshot};
    }));
  }
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

  function addType(){ setItems(p=>[{ id: `new-${Date.now()}`, name:"Nuevo tipo", grades:[{ grams:[90], sizes:[], isSpecialMaterial: false }], _dirty:true }, ...p]); }
  function delType(id?: string, i?: number){ 
    if(!confirm("¿Eliminar este tipo de material y todos sus gramajes?")) return;
    try {
        if (id && !id.startsWith('new-')) {
            fetch(`/api/admin/materials?id=${id}`, { method: "DELETE" });
        }
        setItems(p=>p.filter((_,ix)=>ix!==i)); 
        setMsg("Tipo de material eliminado.");
    } catch(e:any) {
        setMsg("Error al eliminar: " + e.message);
    }
  }
  function cancelCardChanges(i: number) {
    const snap = items[i]._snapshot;
    if (!snap) { setItems(p => p.filter((_, ix) => ix !== i)); return; }
    setItems(p => p.map((x, ix) => ix === i ? { ...snap, _dirty: false, _snapshot: undefined } : x));
  }
  async function saveCardChanges(i: number) {
    const itemToSave = { ...items[i] };
    const { _dirty, _snapshot, ...payload } = itemToSave;
    setMsg(`Guardando "${payload.name}"...`);
    try {
      const r = await fetch("/api/admin/materials", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [payload] }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Falló guardado");
      const savedItem = j.items[0];
      setItems(p => p.map((x, ix) => ix === i ? { ...savedItem, _dirty: false, _snapshot: undefined, grades: groupEquivalentGrades(savedItem.grades) } : x));
      setMsg(`"${savedItem.name}" guardado.`);
    } catch (e: any) {
      setMsg("Error al guardar: " + e.message);
    }
  }

  function addGrade(i:number){ const t=items[i]; mut(i,{grades:[{grams:[], sizes:[], isSpecialMaterial: false}, ...(t.grades||[])]}); }
  function delGrade(i:number, gi:number){ const t=items[i]; mut(i,{grades:(t.grades||[]).filter((_,gx)=>gx!==gi)}); }
  function addGramChip(typeIdx:number, gradeIdx:number, gram:number | null){
      if (gram === null || gram <= 0) { setAddingGram(null); return; }
      const g = items[typeIdx].grades[gradeIdx];
      const grams = Array.from(new Set([...(g.grams||[]), gram])).sort((a,b)=>a-b);
      mutGrade(typeIdx, gradeIdx, {grams});
      setNewGramValue("");
      setAddingGram(null);
  }
  function removeGramChip(typeIdx:number, gradeIdx:number, gram:number){
      const g = items[typeIdx].grades[gradeIdx];
      const grams = (g.grams||[]).filter(g => g !== gram);
      if(grams.length === 0 && g.sizes.length > 0){
          if(!confirm("Esto borrará el último gramaje y todos los tamaños asociados. ¿Continuar?")){ return; }
          delGrade(typeIdx, gradeIdx);
      } else { mutGrade(typeIdx, gradeIdx, {grams}); }
  }

  function addSize(i:number, gi:number){ const g = items[i].grades[gi]; mutGrade(i,gi,{sizes:[{length_mm:0,width_mm:0,supplier:"",usd_per_ton:0}, ...(g.sizes||[])]}); }
  function delSize(i:number, gi:number, si:number){ const g = items[i].grades[gi]; mutGrade(i,gi,{sizes:(g.sizes||[]).filter((_,sx)=>sx!==si)}); }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>){
      const input = e.currentTarget;
      const f=input.files?.[0]; if(!f) return;
      try{
          const raw = JSON.parse(await f.text());
          const external: any[] = Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:[]);
          const byName: Record<string, {grams:number, sizes:SizeRow[], usd:number|null}[]> = {};
          
          external.forEach((row: any) => {
              const name = row.name || "Sin nombre";
              if(!byName[name]) byName[name] = [];
              byName[name].push({
                  grams: Number(row.paperWeight || 0),
                  sizes: (row.materialSizes||[]).map((s:any) => ({
                      length_mm: Number(s.factorySize?.len || 0),
                      width_mm: Number(s.factorySize?.wid || 0),
                      supplier: "",
                      usd_per_ton: toNum(String(row.priceIndex))
                  })),
                  usd: toNum(String(row.priceIndex))
              });
          });

          const newItems: MaterialType[] = Object.keys(byName).map(name => ({
              name,
              grades: groupEquivalentGrades(byName[name].map(g => ({grams: [g.grams], sizes: g.sizes})))
          }));

          const combinedList = [...items, ...newItems];

          setMsg("Importando y guardando...");
          const r = await fetch("/api/admin/materials", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: combinedList }) });
          const j = await r.json();
          if(!r.ok) throw new Error(j.error || "Falló el guardado en la API");
          
          setItems(j.items || []);
          setMsg(`Importados y guardados ${newItems.length} tipos. Total: ${j.items.length}.`);
      }catch(err:any){ 
        setMsg("Error al importar/guardar: " + err.message);
        alert("JSON inválido o error al guardar: "+err.message); 
      }
      input.value="";
  }

  const IconButton = ({ onClick, children, title, className = "" }: any) => (
    <button className={`p-1.5 rounded-md transition-colors text-white/60 hover:text-white ${className}`} title={title} onClick={onClick}>
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <a href="/admin" title="Volver" className="p-2 rounded bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"><ArrowLeft size={20}/></a>
        <h1 className="text-2xl font-bold mr-auto">Materiales</h1>
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
        <label title="Importar y Guardar" className="p-2 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold cursor-pointer">
            <FileUp size={20}/>
            <input type="file" accept="application/json" onChange={onImportFile} className="hidden"/>
        </label>
        <button title="Agregar Tipo" className="p-2 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold" onClick={addType}>
            <Plus size={20}/>
        </button>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((t, ti)=>(
          <div key={t.id ?? ti} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-2 pb-3 border-b border-white/10">
              <EditableField value={t.name} onChange={(e:any) => mut(ti, {name: e.target.value})} className="text-lg font-semibold" placeholder="Nombre del Tipo" />
              <div className="flex items-center gap-1.5">
                  {t._dirty && (
                      <>
                          <IconButton title="Deshacer" onClick={() => cancelCardChanges(ti)}><RotateCcw size={18} /></IconButton>
                          <IconButton title="Guardar" onClick={() => saveCardChanges(ti)} colorClass="text-green-400 hover:text-green-300"><Upload size={18} /></IconButton>
                      </>
                  )}
                  <IconButton title="Eliminar tipo" onClick={()=>delType(t.id, ti)} colorClass="text-red-500 hover:text-red-400"><Trash2 size={18}/></IconButton>
              </div>
            </div>

            <div className="mt-1 space-y-3">
              <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80 font-semibold">Grupos de Gramajes</span>
                  <IconButton title="Añadir bloque de gramaje" onClick={()=>addGrade(ti)} className="bg-green-600/30 hover:bg-green-600/50 text-green-300"><Plus size={14}/></IconButton>
              </div>
              {(t.grades||[]).map((g, gi)=>(
                <div key={gi} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(g.grams||[]).map(gram => (
                        <span key={gram} className="inline-flex items-center gap-2 bg-zinc-700 text-zinc-100 rounded-full px-3 py-1 text-sm font-medium">
                          {gram} g
                          <button className="text-red-400/70 hover:text-red-400" onClick={()=>removeGramChip(ti,gi,gram)}><X size={14}/></button>
                        </span>
                      ))}
                      { addingGram?.typeIdx === ti && addingGram?.gradeIdx === gi ?
                        <input autoFocus className="inp !py-1 !px-2 w-20 bg-white text-black" placeholder="g" value={newGramValue} onChange={e=>setNewGramValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){addGramChip(ti,gi,toNum(newGramValue));}}} onBlur={()=>addGramChip(ti,gi,toNum(newGramValue))} />
                        : <IconButton title="Añadir gramaje a este grupo" onClick={()=>setAddingGram({typeIdx:ti, gradeIdx:gi})} className="bg-white/10 hover:bg-white/20 rounded-full"><Plus size={14}/></IconButton>
                      }
                    </div>
                     <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                            <span>Especial?</span>
                            <button
                                onClick={() => mutGrade(ti, gi, { isSpecialMaterial: !g.isSpecialMaterial })}
                                className={`h-6 w-11 rounded-full transition-colors ${g.isSpecialMaterial ? 'bg-green-500' : 'bg-white/20'}`}
                            >
                                <span className={`block h-5 w-5 bg-white rounded-full shadow transform transition-transform ${g.isSpecialMaterial ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </label>
                        <IconButton title="Eliminar este bloque de gramajes" onClick={()=>delGrade(ti,gi)} colorClass="text-red-500/70 hover:text-red-500"><Trash2 size={16}/></IconButton>
                     </div>
                  </div>

                  <div className="space-y-2">
                    {(g.sizes||[]).map((s,si)=>(
                      <div key={si} className="relative rounded-lg p-2 transition-colors border border-transparent hover:bg-black/20">
                          <div className="grid grid-cols-4 gap-2 pr-8">
                            <EditableField value={s.length_mm} onChange={(e:any) => mutSize(ti,gi,si,{length_mm:Number(e.target.value)})} placeholder="Ancho"/>
                            <EditableField value={s.width_mm}  onChange={(e:any) => mutSize(ti,gi,si,{width_mm:Number(e.target.value)})}  placeholder="Largo"/>
                            <EditableField value={s.supplier} onChange={(e:any) => mutSize(ti,gi,si,{supplier:e.target.value})} placeholder="Proveedor"/>
                            <EditableField value={s.usd_per_ton} onChange={(e:any) => mutSize(ti,gi,si,{usd_per_ton:toNum(e.target.value)})} placeholder="USD/Ton"/>
                          </div>
                          <IconButton title="Eliminar tamaño" onClick={()=>delSize(ti,gi,si)} className="absolute top-1/2 -translate-y-1/2 right-1" colorClass="text-red-500/60 hover:text-red-500"><Trash2 size={16}/></IconButton>
                      </div>
                    ))}
                    <div className="flex justify-end">
                        <button className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 mt-2 flex items-center gap-1" onClick={()=>addSize(ti,gi)}><Plus size={12}/> Añadir tamaño</button>
                    </div>
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