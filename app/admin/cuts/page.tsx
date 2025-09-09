/* app/admin/cuts/page.tsx  Importar/editar/exportar cortes con el JSON del ejemplo */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, RotateCcw, Upload } from "lucide-react";

type SheetSize = { length: number; width: number; preferred?: boolean; _edit?: boolean; };
type CutGroup = { forPaperSize: { length: number; width: number }, sheetSizes: SheetSize[], _edit?: boolean, _snapshot?: CutGroup };

const toNum = (s:string)=>{ const n = Number(s); return Number.isFinite(n) ? n : 0; };

export default function CutsAdmin(){
  const [groups, setGroups] = useState<CutGroup[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  // Cargar desde API si existe (opcional)
  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch("/api/admin/cuts",{cache:"no-store"});
      if(!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j?.items)) {
        setGroups(j.items.map((g:any)=>({...g,_edit:false,_snapshot:undefined, sheetSizes:(g.sheetSizes||[]).map((s:any)=>({...s,_edit:false}))})));
      }
    }catch{}
  })(); },[]);

  function mut(i:number, patch:Partial<CutGroup>){
    setGroups(p=>p.map((x,ix)=>ix===i?({...x,...patch}):x)); setDirty(true);
  }
  function mutRow(i:number, ri:number, patch:Partial<SheetSize>){
    const g = groups[i];
    const list = [...(g.sheetSizes||[])];
    list[ri] = {...list[ri], ...patch};
    mut(i,{sheetSizes:list});
  }

  function addGroup(){
    setGroups(p=>[
      { forPaperSize:{length:720,width:1020}, sheetSizes:[], _edit:true },
      ...p
    ]);
    setDirty(true);
  }
  function delGroup(i:number){
    if(!confirm("¿Eliminar este grupo de cortes?")) return;
    setGroups(p=>p.filter((_,ix)=>ix!==i)); setDirty(true);
  }
  function startEdit(i:number){ mut(i,{_edit:true,_snapshot:structuredClone(groups[i])}); }
  function cancelEdit(i:number){
    const snap = groups[i]._snapshot;
    mut(i, snap? {...snap,_edit:false,_snapshot:undefined}:{_edit:false});
  }
  function saveEdit(i:number){ mut(i,{_edit:false,_snapshot:undefined}); }

  function addRow(i:number){
    const g = groups[i];
    mut(i,{sheetSizes:[{length:g.forPaperSize.length,width:g.forPaperSize.width,preferred:false,_edit:true}, ...(g.sheetSizes||[])]});
  }
  function delRow(i:number, ri:number){
    const g = groups[i];
    mut(i,{sheetSizes:(g.sheetSizes||[]).filter((_,rx)=>rx!==ri)});
  }

  async function saveAll(){
    setMsg("Guardando");
    try{
      const payload = groups.map(({_edit,_snapshot, ...g})=>({
        ...g,
        sheetSizes:(g.sheetSizes||[]).map(({_edit:__,...s})=>s)
      }));
      const r = await fetch("/api/admin/cuts",{method:"PUT",headers:{'Content-Type':'application/json'}, body: JSON.stringify({items:payload})});
      const j = await r.json().catch(()=>({}));
      // Si no hay tabla, seguimos igual (fallback solo JSON)
      setGroups(payload.map(g=>({...g,_edit:false,_snapshot:undefined, sheetSizes:g.sheetSizes.map(s=>({...s,_edit:false}))})));
      setDirty(false);
      setMsg(r.ok? "Guardado OK": "No se pudo guardar en DB (usá Exportar JSON).");
    }catch(e:any){
      setMsg("No se pudo guardar en DB (usá Exportar JSON).");
    }
  }

  const exportHref = useMemo(()=>{
    const clean = groups.map(({_edit,_snapshot,...g})=>({
      ...g,
      sheetSizes:(g.sheetSizes||[]).map(({_edit:__,...s})=>s)
    }));
    return URL.createObjectURL(new Blob([JSON.stringify(clean,null,2)],{type:"application/json"}));
  },[groups]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Cortes</h1>
        <input type="file" accept="application/json" onChange={async e=>{
          const f=e.target.files?.[0]; if(!f) return;
          try{
            const arr = JSON.parse(await f.text());
            const list:CutGroup[] = (Array.isArray(arr)?arr:[]).map((g:any)=>({
              forPaperSize:{length:Number(g?.forPaperSize?.length)||0, width:Number(g?.forPaperSize?.width)||0},
              sheetSizes:(g?.sheetSizes||[]).map((s:any)=>({length:Number(s?.length)||0, width:Number(s?.width)||0, preferred:!!s?.preferred, _edit:false})),
              _edit:false,_snapshot:undefined
            }));
            setGroups(list); setDirty(true);
          }catch{ alert("JSON inválido"); }
          e.currentTarget.value="";
        }}/>
        <button className="px-3 py-2 rounded bg-white text-black" onClick={addGroup}>Agregar grupo</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20 disabled:opacity-50" onClick={saveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="cuts.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty && <span className="text-amber-300 text-sm">Cambios sin guardar</span>}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      {/* 3 tarjetas por fila en desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((g,gi)=>(
          <div key={gi} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between mb-2">
              {!g._edit ? (
                <div className="text-lg font-semibold">
                  Papel {g.forPaperSize.length}{g.forPaperSize.width} mm
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input className="inp" type="number" placeholder="L" value={g.forPaperSize.length}
                         onChange={e=>mut(gi,{forPaperSize:{...g.forPaperSize,length:toNum(e.target.value)||0}})} />
                  <input className="inp" type="number" placeholder="W" value={g.forPaperSize.width}
                         onChange={e=>mut(gi,{forPaperSize:{...g.forPaperSize,width:toNum(e.target.value)||0}})} />
                </div>
              )}
              {!g._edit ? (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Editar" onClick={()=>mut(gi,{_edit:true,_snapshot:structuredClone(g)})}><Pencil size={16}/></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Cancelar" onClick={()=>{ const s=g._snapshot; mut(gi, s? {...s,_edit:false,_snapshot:undefined}:{_edit:false}); }}><RotateCcw size={16}/></button>
                  <button className="btn-ok" title="Guardar" onClick={()=>{ mut(gi,{_edit:false,_snapshot:undefined}); }}><Upload size={16}/></button>
                  <button className="btn-danger" title="Eliminar grupo" onClick={()=>delGroup(gi)}><Trash2 size={16}/></button>
                </div>
              )}
            </div>

            {/* Listado de cortes */}
            {!g._edit ? (
              <div className="space-y-2">
                {g.sheetSizes.map((s,si)=>(
                  <div key={si} className="rounded border border-black/60 bg-white text-black px-3 py-2 text-sm">
                    {s.length}{s.width}{s.preferred ? " (preferido)" : ""}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-end mb-1">
                  <button className="btn-ok" onClick={()=>addRow(gi)}><Plus size={14}/> Añadir</button>
                </div>
                {g.sheetSizes.map((s,si)=>(
                  <div key={si} className="rounded border border-black/60 bg-white text-black p-2">
                    {/* Edición compacta: L (4)  W (4)  Preferido (3)  Borrar (1) => 12 cols */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <input className="inp col-span-4" type="number" placeholder="Largo"  value={s.length} onChange={e=>mutRow(gi,si,{length:toNum(e.target.value)||0})}/>
                      <input className="inp col-span-4" type="number" placeholder="Ancho"  value={s.width}  onChange={e=>mutRow(gi,si,{width:toNum(e.target.value)||0})}/>
                      <div className="col-span-3 flex items-center">
                        <label className="flex items-center gap-2 text-sm">
                          <span>Preferido</span>
                          <button
                            className={`relative w-12 h-6 rounded-full ${s.preferred ? "bg-green-500" : "bg-gray-300"}`}
                            onClick={()=>mutRow(gi,si,{preferred:!s.preferred})}
                            title={s.preferred ? "Preferido" : "No preferido"}
                          >
                            <span className={`absolute top-0.5 ${s.preferred ? "right-0.5" : "left-0.5"} w-5 h-5 bg-white rounded-full transition-all`} />
                          </button>
                        </label>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button className="btn-danger" onClick={()=>delRow(gi,si)}><Trash2 size={16}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}