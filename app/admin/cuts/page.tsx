"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, RotateCcw } from "lucide-react";

type Size = { length: number; width: number; preferred?: boolean };
type CutGroup = { forPaperSize: Size; sheetSizes: Size[]; _edit?: boolean; _snapshot?: CutGroup };

const isNum = (v:any)=> typeof v === "number" && Number.isFinite(v);

export default function CutsAdmin(){
  const [items, setItems] = useState<CutGroup[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ (async ()=>{
    try{
      const r = await fetch("/api/admin/cuts", { cache:"no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.items)) setItems(j.items.map((g:any)=>({...g, _edit:false})));
    }catch{}
  })(); },[]);

  function setDirtyItems(next:CutGroup[]){ setItems(next); setDirty(true); }

  function onAddGroup(){
    setDirtyItems([{ forPaperSize:{ length:0, width:0 }, sheetSizes:[], _edit:true }, ...items ]);
  }
  function startEdit(i:number){
    setDirtyItems(items.map((g,ix)=> ix===i ? ({...g, _edit:true, _snapshot:structuredClone(g)}) : g));
  }
  function cancelEdit(i:number){
    setDirtyItems(items.map((g,ix)=> {
      if (ix!==i) return g;
      const s = g._snapshot ?? g;
      const { _snapshot, _edit, ...rest } = s as any;
      return { ...rest, _edit:false };
    }));
  }
  function saveEdit(i:number){
    setDirtyItems(items.map((g,ix)=> ix===i ? ({...g, _edit:false, _snapshot:undefined}) : g));
  }
  function delGroup(i:number){
    if (!confirm("¿Eliminar grupo de cortes?")) return;
    setDirtyItems(items.filter((_,ix)=> ix!==i));
  }

  function mut(i:number, patch:Partial<CutGroup>){
    setDirtyItems(items.map((g,ix)=> ix===i ? ({...g, ...patch}) : g));
  }
  function mutSize(i:number, path:"paper"|"sheet", si:number|undefined, patch:Partial<Size>){
    const g = items[i];
    if (path==="paper"){
      const fp = { ...(g.forPaperSize||{}), ...patch };
      mut(i,{ forPaperSize: fp });
    } else {
      const list = [...(g.sheetSizes||[])];
      if (typeof si==="number"){
        list[si] = { ...(list[si]||{length:0,width:0}), ...patch };
      }
      mut(i,{ sheetSizes: list });
    }
  }
  function addSheet(i:number){
    const g = items[i];
    mut(i,{ sheetSizes:[{ length:0, width:0, preferred:false }, ...(g.sheetSizes||[]) ]});
  }
  function delSheet(i:number, si:number){
    const g = items[i];
    const list = (g.sheetSizes||[]).filter((_,idx)=> idx!==si);
    mut(i,{ sheetSizes:list });
  }

  async function onSaveAll(){
    setMsg("Guardando");
    try{
      const payload = items.map(({_edit,_snapshot, ...rest})=> rest);
      const r = await fetch("/api/admin/cuts", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items: payload }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Fallo al guardar");
      setItems((j.items||[]).map((g:any)=>({ ...g, _edit:false })));
      setDirty(false); setMsg(`Guardado OK (${j.items?.length ?? 0})`);
    }catch(err:any){
      setMsg("No se pudo guardar en DB: " + (err.message || "error desconocido") + " (igual podés exportar JSON)");
    }
  }

  const exportHref = useMemo(()=> {
    const payload = items.map(({_edit,_snapshot, ...rest})=> rest);
    return URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" }));
  }, [items]);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>){
    const f = e.target.files?.[0]; if (!f) return;
    try{
      const raw = JSON.parse(await f.text());
      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : null);
      const candidate: any[] = arr && Array.isArray(arr) ? arr : [];

      const valid = (g:any)=>{
        const fp = g?.forPaperSize || {};
        const ss = g?.sheetSizes;
        const fpOk = isNum(fp.length) && isNum(fp.width);
        const ssOk = Array.isArray(ss) && ss.every((s:any)=> isNum(s.length) && isNum(s.width));
        return fpOk && ssOk;
      };

      const cleaned = candidate.filter(valid).map((g:any)=>({
        forPaperSize: { length:g.forPaperSize.length, width:g.forPaperSize.width },
        sheetSizes: g.sheetSizes.map((s:any)=>({ length:s.length, width:s.width, preferred: !!s.preferred })),
        _edit:false
      }));

      if (!cleaned.length) {
        alert("El archivo no parece ser un JSON de CORTES válido.");
        return;
      }

      setItems(cleaned);
      setDirty(true);
      setMsg(`Importados ${cleaned.length} grupos de cortes (sin guardar)`);
    }catch{
      alert("JSON inválido o corrupto. No se importó.");
    }finally{
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Cortes</h1>
        <input type="file" accept="application/json" onChange={onImportFile}/>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20" onClick={onSaveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="cuts.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        <button className="px-3 py-2 rounded bg-white text-black" onClick={onAddGroup}>Agregar grupo</button>
        {dirty ? <span className="text-amber-300 text-sm">Cambios sin guardar</span> : null}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((g, i)=>(
          <div key={i} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Para papel {g.forPaperSize.width}  {g.forPaperSize.length} mm</div>
              {!g._edit
                ? <div className="flex gap-2"><button className="btn-ghost" title="Editar" onClick={()=>startEdit(i)}></button></div>
                : <div className="flex gap-2">
                    <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEdit(i)}><RotateCcw size={16}/></button>
                    <button className="btn-ok" title="Guardar edición" onClick={()=>saveEdit(i)}><Upload size={16}/></button>
                    <button className="btn-danger" title="Eliminar grupo" onClick={()=>delGroup(i)}><Trash2 size={16}/></button>
                  </div>}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-white/80">Ancho del papel (entrada)</span>
                <input className="inp" type="number" value={g.forPaperSize.length ?? ""} onChange={e=>mutSize(i,"paper",undefined,{length: toNum(e.target.value)})} disabled={!g._edit}/>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-white/80">Largo del papel</span>
                <input className="inp" type="number" value={g.forPaperSize.width ?? ""} onChange={e=>mutSize(i,"paper",undefined,{width: toNum(e.target.value)})} disabled={!g._edit}/>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-white/80 font-semibold">Tamaños de corte</span>
              {g._edit && <button className="btn-ok" onClick={()=>addSheet(i)}>+ Añadir</button>}
            </div>

            {(g.sheetSizes||[]).length===0 && <div className="text-xs text-white/60 mt-2">Sin tamaños aún</div>}

            <div className="mt-2 space-y-2">
              {(g.sheetSizes||[]).map((s,si)=>(
                <div key={si} className="rounded-lg border border-black/60 bg-white text-black p-2">
                  {!g._edit ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div>Ancho: <b>{s.length}</b> mm</div>
                      <div>Largo: <b>{s.width}</b> mm</div>
                      <div>Pref.: <b>{s.preferred? "Sí":"No"}</b></div>
                      <div></div>
                    </div>
                  ):(
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input className="inp" type="number" value={s.length ?? ""} onChange={e=>mutSize(i,"sheet",si,{length: toNum(e.target.value)})} placeholder="Ancho (entrada)"/>
                      <input className="inp" type="number" value={s.width ?? ""}  onChange={e=>mutSize(i,"sheet",si,{width: toNum(e.target.value)})}  placeholder="Largo"/>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={!!s.preferred} onChange={e=>mutSize(i,"sheet",si,{preferred: e.target.checked})}/> Preferido</label>
                      <div className="flex justify-end"><button className="btn-danger" onClick={()=>delSheet(i,si)}></button></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .inp { background:#fff; color:#000; border:1px solid #111; padding:.5rem .65rem; border-radius:.6rem; }
        .inp:disabled { opacity:.75; cursor:not-allowed; }
        .btn-ghost { padding:.4rem .55rem; border:1px solid rgba(255,255,255,.35); border-radius:.6rem; background:transparent; }
        .btn-danger { padding:.4rem .55rem; border:1px solid #dc2626; background:#fee2e2; color:#991b1b; border-radius:.6rem; }
        .btn-ok { padding:.4rem .55rem; border:1px solid #16a34a; background:#dcfce7; color:#14532d; border-radius:.6rem; }
      `}</style>
    </div>
  );
}

function toNum(s:string){ const n = Number(s); return Number.isFinite(n) ? n : 0; }