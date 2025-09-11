/* app/admin/cuts/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, RotateCcw, Upload, ArrowLeft, FileUp } from "lucide-react";

type SheetSize = { length: number; width: number; preferred?: boolean };
type CutGroup = { id?: string, forPaperSize: { length: number; width: number }, sheetSizes: SheetSize[], _dirty?: boolean, _snapshot?: CutGroup };

const toNum = (s:string)=>{ const n = Number(s); return Number.isFinite(n) ? n : 0; };

const EditableField = ({ value, onChange, placeholder, className = "" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const commonClasses = `w-full bg-transparent px-1 py-0.5 rounded-sm transition-colors text-white/90`;
  const viewClasses = `border-b border-transparent hover:border-white/30 cursor-pointer`;
  const editClasses = `border-b border-white/60 focus:border-white focus:outline-none bg-black/30`;

  if (isEditing) {
    return ( <input type="number" value={value ?? ""} onChange={onChange} onBlur={() => setIsEditing(false)} onKeyDown={(e) => { if(e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLElement).blur() }} placeholder={placeholder} className={`${commonClasses} ${editClasses} ${className}`} autoFocus /> );
  }
  return (
    <div className={`${commonClasses} ${viewClasses} min-h-[32px] flex items-center ${className}`} onClick={() => setIsEditing(true)}>
      {value || <span className="text-white/40">{placeholder}</span>}
    </div>
  );
};

export default function CutsAdmin(){
  const [groups, setGroups] = useState<CutGroup[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch("/api/admin/cuts",{cache:"no-store"});
      if(!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j?.items)) {
        setGroups(j.items.map((g:any)=>({...g, _dirty:false, _snapshot:undefined, sheetSizes:(g.sheetSizes||[])})));
      }
    }catch{}
  })(); },[]);

  function mut(i:number, patch:Partial<CutGroup>){
    setGroups(p=>p.map((x,ix)=>{
        if(ix !== i) return x;
        const snapshot = x._snapshot ?? structuredClone(x);
        return {...x, ...patch, _dirty: true, _snapshot: snapshot};
    }));
  }
  function mutRow(i:number, ri:number, patch:Partial<SheetSize>){
    const g = groups[i];
    const list = [...(g.sheetSizes||[])];
    list[ri] = {...list[ri], ...patch};
    mut(i,{sheetSizes:list});
  }

  function addGroup(){
    const newId = `new-${Date.now()}`;
    setGroups(p=>[{ id: newId, forPaperSize:{length:720,width:1020}, sheetSizes:[], _dirty:true }, ...p]);
  }
  
  function cancelCardChanges(i: number) {
    const snap = groups[i]._snapshot;
    if (!snap) { setGroups(p => p.filter((_, ix) => ix !== i)); return; }
    setGroups(p => p.map((x, ix) => ix === i ? { ...snap, _dirty: false, _snapshot: undefined } : x));
  }

  async function saveCardChanges(i: number) {
    const groupToSave = groups[i];
    const { _dirty, _snapshot, ...payload } = groupToSave;
    setMsg(`Guardando grupo ${payload.forPaperSize.length}×${payload.forPaperSize.width}...`);
    try {
      const r = await fetch("/api/admin/cuts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [payload] }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Falló guardado");
      const savedItem = j.items[0];
      setGroups(p => p.map((x, ix) => ix === i ? { ...savedItem, _dirty: false, _snapshot: undefined } : x));
      setMsg("Grupo guardado.");
    } catch (e: any) { setMsg("Error al guardar: " + e.message); }
  }

  async function deleteGroup(id?: string, idx?: number){
    if(!confirm("¿Eliminar este grupo de cortes?")) return;
    try {
      if (id && !id.startsWith('new-')) {
        await fetch(`/api/admin/cuts?id=${id}`, { method:"DELETE" });
      }
      setGroups(p=>p.filter((_,ix)=>ix!==idx));
      setMsg("Grupo eliminado.");
    } catch (e: any) { setMsg("Error al eliminar: " + e.message); }
  }

  function addRow(i:number){
    const g = groups[i];
    mut(i,{sheetSizes:[{length:0,width:0,preferred:false}, ...(g.sheetSizes||[])]});
  }
  function delRow(i:number, ri:number){
    const g = groups[i];
    mut(i,{sheetSizes:(g.sheetSizes||[]).filter((_,rx)=>rx!==ri)});
  }
  
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>){
      const input = e.currentTarget;
      const f = input.files?.[0]; if(!f) return;
      try{
        const arr = JSON.parse(await f.text());
        const newItems:CutGroup[] = (Array.isArray(arr)?arr:[]).map((g:any)=>({
          forPaperSize:{length:Number(g?.forPaperSize?.length)||0, width:Number(g?.forPaperSize?.width)||0},
          sheetSizes:(g?.sheetSizes||[]).map((s:any)=>({length:Number(s?.length)||0, width:Number(s?.width)||0, preferred:!!s?.preferred})),
        }));

        const combinedList = [...groups, ...newItems];

        setMsg("Importando y guardando...");
        const r = await fetch("/api/admin/cuts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: combinedList }) });
        const j = await r.json();
        if(!r.ok) throw new Error(j.error || "Falló el guardado en la API");
        
        setGroups(j.items || []);
        setMsg(`Importados y guardados ${newItems.length} grupos nuevos. Total: ${j.items.length}.`);
      }catch(err:any){ 
        setMsg("Error al importar/guardar: " + err.message);
        alert("JSON inválido o error al guardar: "+err.message); 
      }
      input.value = "";
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <a href="/admin" title="Volver" className="p-2 rounded bg-white/10 border border-white/20 hover:bg-white/20 transition-colors">
            <ArrowLeft size={20}/>
        </a>
        <h1 className="text-2xl font-bold mr-auto">Cortes</h1>
        
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
        
        <label title="Importar y Guardar" className="p-2 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold cursor-pointer">
            <FileUp size={20}/>
            <input type="file" accept="application/json" onChange={onImportFile} className="hidden"/>
        </label>
        <button title="Agregar Grupo" className="p-2 rounded bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors font-semibold" onClick={addGroup}>
            <Plus size={20}/>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((g,gi)=>(
          <div key={g.id ?? gi} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span>Papel</span>
                <EditableField value={g.forPaperSize.length} onChange={(e:any)=>mut(gi,{forPaperSize:{...g.forPaperSize,length:toNum(e.target.value)||0}})} />
                <span>×</span>
                <EditableField value={g.forPaperSize.width} onChange={(e:any)=>mut(gi,{forPaperSize:{...g.forPaperSize,width:toNum(e.target.value)||0}})} />
              </div>
              <div className="flex items-center gap-1.5">
                {g._dirty && (
                    <>
                        <button title="Deshacer" onClick={()=>cancelCardChanges(gi)} className="p-1.5 rounded-md text-white/60 hover:text-white"><RotateCcw size={18}/></button>
                        <button title="Guardar" onClick={()=>saveCardChanges(gi)} className="p-1.5 rounded-md text-green-400 hover:text-green-300"><Upload size={18}/></button>
                    </>
                )}
                <button title="Eliminar" onClick={()=>deleteGroup(g.id, gi)} className="p-1.5 rounded-md text-red-500 hover:text-red-400"><Trash2 size={18}/></button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/80 font-semibold">Cortes</span>
              <button className="p-1.5 rounded-md bg-green-600/30 hover:bg-green-600/50 text-green-300" onClick={()=>addRow(gi)}><Plus size={14}/></button>
            </div>

            <div className="mt-2 space-y-2">
              {(g.sheetSizes||[]).map((s,si)=>(
                <div key={si} className="relative rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="grid grid-cols-12 gap-2 items-center pr-8">
                      <div className="col-span-3"><EditableField value={s.length} onChange={(e:any)=>mutRow(gi,si,{length:toNum(e.target.value)||0})} placeholder="Ancho"/></div>
                      <span className="text-white/50 col-span-1 text-center">×</span>
                      <div className="col-span-3"><EditableField value={s.width}  onChange={(e:any)=>mutRow(gi,si,{width:toNum(e.target.value)||0})}  placeholder="Largo"/></div>
                      <label className="col-span-5 flex items-center justify-center gap-2 cursor-pointer" onClick={()=>mutRow(gi,si,{preferred:!s.preferred})}>
                        <span className={`text-xs font-semibold tracking-wider ${s.preferred ? 'text-green-400' : 'text-white/50'}`}>{s.preferred ? 'PREFERIDO' : 'OFF'}</span>
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${s.preferred ? 'bg-green-600/50' : 'bg-white/20'}`}>
                            <div className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transform transition-transform ${s.preferred ? 'translate-x-5' : ''}`} />
                        </div>
                      </label>
                    </div>
                    <button onClick={()=>delRow(gi,si)} title="Borrar" className="absolute top-1/2 -translate-y-1/2 right-1 p-1.5 rounded-md text-red-500/60 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
              {(g.sheetSizes||[]).length===0 && <div className="text-xs text-center text-white/60 bg-white/5 rounded p-2 mt-2">Sin cortes definidos</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}