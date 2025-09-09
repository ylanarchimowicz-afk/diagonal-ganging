/* app/admin/cuts/page.tsx  UI compacta + símbolo  */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Upload, Trash2, Plus, Save, RefreshCw } from "lucide-react";

type CutRow = { length_mm: number; width_mm: number; preferred?: boolean; _edit?: boolean; };
type CutGroup = {
  id?: string;
  stock_len_mm: number; // ancho del papel
  stock_wid_mm: number; // largo del papel
  cuts: CutRow[];
  _edit?: boolean;
  _snapshot?: CutGroup;
};

const toNum = (s:string)=>{ const n=Number(s); return Number.isFinite(n)?n:0; };

export default function CutsAdmin(){
  const [groups,setGroups] = useState<CutGroup[]>([]);
  const [dirty,setDirty] = useState(false);
  const [msg,setMsg] = useState("");

  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch("/api/admin/cuts",{cache:"no-store"});
      if(!r.ok) return;
      const j = await r.json();
      const list:CutGroup[] = (j.items||[]).map((g:CutGroup)=>({...g,_edit:false,_snapshot:undefined, cuts:(g.cuts||[]).map(c=>({...c,_edit:false}))}));
      setGroups(list);
    }catch{}
  })(); },[]);

  function mut(i:number, patch:Partial<CutGroup>){
    setGroups(p=>p.map((x,ix)=> ix===i?({...x,...patch}):x));
    setDirty(true);
  }
  function mutRow(i:number, ri:number, patch:Partial<CutRow>){
    const g=groups[i]; const list=[...(g.cuts||[])];
    list[ri] = {...list[ri], ...patch};
    mut(i,{cuts:list});
  }

  function addGroup(){
    setGroups(p=>[{ stock_len_mm:0, stock_wid_mm:0, cuts:[], _edit:true }, ...p]);
    setDirty(true);
  }
  function delGroup(i:number){
    if(!confirm("¿Eliminar grupo de cortes?")) return;
    setGroups(p=>p.filter((_,ix)=>ix!==i)); setDirty(true);
  }
  function startEditGroup(i:number){ mut(i,{_edit:true,_snapshot:structuredClone(groups[i])}); }
  function cancelEditGroup(i:number){ const snap=groups[i]._snapshot; mut(i, snap? {...snap, _edit:false, _snapshot:undefined}:{_edit:false}); }
  function saveEditGroup(i:number){ mut(i,{_edit:false,_snapshot:undefined}); }

  function addRow(i:number){
    const g=groups[i]; mut(i,{cuts:[{length_mm:0,width_mm:0,preferred:false,_edit:true}, ...(g.cuts||[])]});
  }
  function delRow(i:number, ri:number){
    const g=groups[i]; mut(i,{cuts:(g.cuts||[]).filter((_,rx)=>rx!==ri)});
  }

  // guardar / exportar
  async function saveAll(){
    setMsg("Guardando");
    try{
      const payload = groups.map(({_edit,_snapshot, ...g})=>({
        ...g,
        cuts: (g.cuts||[]).map(({_edit:__, ...c})=>c)
      }));
      const r = await fetch("/api/admin/cuts",{method:"PUT",headers:{'Content-Type':'application/json'}, body: JSON.stringify({items:payload})});
      const j = await r.json();
      if(!r.ok) throw new Error(j?.error || "falló guardado");
      const list:CutGroup[] = (j.items||payload).map((g:CutGroup)=>({...g,_edit:false,_snapshot:undefined, cuts:(g.cuts||[]).map(c=>({...c,_edit:false}))}));
      setGroups(list); setDirty(false); setMsg(`Guardado OK (${list.length})`);
    }catch(e:any){
      setMsg("No se pudo guardar en DB: "+(e?.message||"error")+" (igual podés exportar JSON)");
    }
  }
  const exportHref = useMemo(()=> {
    const payload = groups.map(({_edit,_snapshot, ...g})=>({
      ...g, cuts: (g.cuts||[]).map(({_edit:__,...c})=>c)
    }));
    return URL.createObjectURL(new Blob([JSON.stringify({items:payload},null,2)],{type:'application/json'}));
  },[groups]);

  function niceLW(L:number,W:number){const a=Number(L)||0;const b=Number(W)||0;return `${a}${b}`;}

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Cortes</h1>
        <input type="file" accept="application/json" onChange={async e=>{
          const f=e.target.files?.[0]; if(!f) return;
          try{
            const raw = JSON.parse(await f.text());
            const arr = Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:[]);
            const list:CutGroup[] = arr.map((g:any)=>({...g,_edit:false,_snapshot:undefined,cuts:(g.cuts||[]).map((c:any)=>({...c,_edit:false}))}));
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((g,i)=>(
          <div key={g.id ?? i} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              {!g._edit ? (
                <div className="text-lg font-semibold">Papel {niceLW(g.stock_len_mm,g.stock_wid_mm)} mm</div>
              ) : (
                <div className="text-lg font-semibold">Editar grupo</div>
              )}
              {!g._edit ? (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Editar grupo" onClick={()=>startEditGroup(i)}><Pencil size={16}/></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEditGroup(i)}><RotateCcw size={16}/></button>
                  <button className="btn-ok" title="Guardar" onClick={()=>saveEditGroup(i)}><Upload size={16}/></button>
                  <button className="btn-danger" title="Eliminar grupo" onClick={()=>delGroup(i)}><Trash2 size={16}/></button>
                </div>
              )}
            </div>

            {/* Dimensiones del papel */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <label className="grid gap-1 text-sm">
                <span className="text-white/80">Ancho del papel</span>
                <input className="inp" type="number" value={g.stock_len_mm ?? 0} onChange={e=>mut(i,{stock_len_mm: toNum(e.target.value) || 0})} disabled={!g._edit}/>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-white/80">Largo del papel</span>
                <input className="inp" type="number" value={g.stock_wid_mm ?? 0} onChange={e=>mut(i,{stock_wid_mm: toNum(e.target.value) || 0})} disabled={!g._edit}/>
              </label>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-white/80 font-semibold">Cortes</span>
              {g._edit && <button className="btn-ok flex items-center gap-1" onClick={()=>addRow(i)}><Plus size={14}/> Añadir</button>}
            </div>

            <div className="mt-2 space-y-2">
              {(g.cuts||[]).map((c,ri)=>(
                <div key={ri} className="rounded-lg border border-black/60 bg-white text-black p-2">
                  {!g._edit && !c._edit ? (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="font-medium">{niceLW(c.length_mm,c.width_mm)} mm</div>
                      <div className="flex items-center gap-2">
                        {c.preferred ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs">Preferido</span> : null}
                        <button className="btn-danger" onClick={()=>delRow(i,ri)} title="Borrar"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Inputs compactos: ~1/5 del ancho total para cada uno */}
                      <input className="col-span-3 inp" type="number" value={c.length_mm} onChange={e=>mutRow(i,ri,{length_mm: toNum(e.target.value) || 0})} placeholder="Ancho"/>
                      <input className="col-span-3 inp" type="number" value={c.width_mm}  onChange={e=>mutRow(i,ri,{width_mm: toNum(e.target.value) || 0})} placeholder="Largo"/>

                      {/* Switch preferido ancho grande */}
                      <button
                        onClick={()=>mutRow(i,ri,{preferred: !c.preferred})}
                        className={`col-span-5 rounded-full px-3 py-2 flex items-center gap-2 border ${c.preferred?'bg-green-500 text-white border-green-600':'bg-gray-100 text-gray-700 border-gray-300'}`}
                        title="Marcar como preferido"
                      >
                        <span className="text-sm font-semibold">{c.preferred?'Preferido':'No preferido'}</span>
                        <span className={`ml-auto inline-flex h-6 w-11 items-center rounded-full transition ${c.preferred?'bg-white/30':'bg-gray-300'}`}>
                          <span className={`h-5 w-5 bg-white rounded-full shadow transform transition ${c.preferred?'translate-x-5':'translate-x-1'}`} />
                        </span>
                      </button>

                      <div className="col-span-1 flex justify-end">
                        <button className="btn-danger" onClick={()=>delRow(i,ri)} title="Borrar"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(g.cuts||[]).length===0 && <div className="text-xs text-black/70 bg-white rounded p-2">Sin cortes</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}