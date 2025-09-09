// app/admin/cuts/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
type Cut = { id?:string; paper_origin_len_mm:number|null; paper_origin_wid_mm:number|null; sheet_sizes: {length:number; width:number; preferred?:boolean}[] };

export default function CutsAdmin() {
  const [items, setItems] = useState<Cut[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=> { (async()=>{
    const r = await fetch("/api/admin/paper-cuts", { cache:"no-store" });
    const j = await r.json(); setItems(j.items ?? []);
  })(); }, []);

  async function onImportFile(e:any){
    const f = e.target.files?.[0]; if(!f) return;
    try {
      const raw = JSON.parse(await f.text());
      const list: Cut[] = Array.isArray(raw) ? raw : raw.items ?? [];
      setItems(list); setDirty(true); setMsg(`Importados ${list.length} cortes`);
    } catch(err:any){ alert("JSON invalido: "+err.message); }
    e.currentTarget.value = "";
  }
  function add(){ setItems(p=> [{ paper_origin_len_mm:null, paper_origin_wid_mm:null, sheet_sizes:[] }, ...p]); setDirty(true); }
  function rm(idx:number){ setItems(p=> p.filter((_,i)=> i!==idx)); setDirty(true); }
  async function save(){
    setMsg("Guardando...");
    const r = await fetch("/api/admin/paper-cuts", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items }) });
    const j = await r.json(); if(r.ok){ setItems(j.items ?? []); setDirty(false); setMsg("OK"); } else setMsg("Error: "+(j.error||""));
  }
  const exportHref = useMemo(()=> URL.createObjectURL(new Blob([JSON.stringify({ items: items }, null, 2)], { type:"application/json" })), [items]);

  function mut(i:number, patch:Partial<Cut>){ setItems(p=> p.map((x,ix)=> ix===i ? {...x, ...patch} : x)); setDirty(true); }
  function addSheet(i:number){ setItems(p=> p.map((x,ix)=> ix===i ? {...x, sheet_sizes: [{length:0,width:0,preferred:false}, ...(x.sheet_sizes||[])] } : x)); setDirty(true); }
  function mutSheet(i:number, j:number, patch:any){ setItems(p=> p.map((x,ix)=> ix===i ? {...x, sheet_sizes: x.sheet_sizes.map((s,k)=> k===j ? {...s, ...patch}: s)} : x)); setDirty(true); }
  function rmSheet(i:number, j:number){ setItems(p=> p.map((x,ix)=> ix===i ? {...x, sheet_sizes: x.sheet_sizes.filter((_,k)=> k!==j)} : x)); setDirty(true); }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Cortes</h1>
        <input type="file" accept="application/json" onChange={onImportFile}/>
        <button className="px-3 py-2 rounded bg-white text-black" onClick={add}>Agregar</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20" onClick={save} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="paper_cuts.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty ? <span className="text-amber-300 text-sm">Cambios sin guardar</span> : null}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <div className="space-y-3">
        {items.map((c, i)=> (
          <div key={c.id ?? i} className="rounded-xl border border-white/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input className="inp w-24" type="number" placeholder="origin L" value={c.paper_origin_len_mm ?? ""} onChange={e=>mut(i,{paper_origin_len_mm: num(e.target.value)})}/>
              <span>x</span>
              <input className="inp w-24" type="number" placeholder="origin W" value={c.paper_origin_wid_mm ?? ""} onChange={e=>mut(i,{paper_origin_wid_mm: num(e.target.value)})}/>
              <button className="px-2 py-1 rounded bg-white/10 border border-white/20" onClick={()=>addSheet(i)}>+ tamaño</button>
              <button className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40" onClick={()=>rm(i)}>Borrar corte</button>
            </div>
            <div className="mt-2 space-y-2">
              {c.sheet_sizes.map((s, j)=> (
                <div key={j} className="flex flex-wrap items-center gap-2">
                  <input className="inp w-24" type="number" placeholder="L" value={s.length} onChange={e=>mutSheet(i,j,{length: num(e.target.value)})}/>
                  <span>x</span>
                  <input className="inp w-24" type="number" placeholder="W" value={s.width} onChange={e=>mutSheet(i,j,{width: num(e.target.value)})}/>
                  <label className="text-sm"><input type="checkbox" checked={!!s.preferred} onChange={e=>mutSheet(i,j,{preferred:e.target.checked})}/> preferred</label>
                  <button className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40" onClick={()=>rmSheet(i,j)}>Borrar</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`.inp{background:#0f1115;border:1px solid rgba(255,255,255,.12);padding:.45rem .6rem;border-radius:.5rem}`}</style>
    </div>
  );

  function num(s:string){ const n = Number(s); return Number.isFinite(n)? n : 0; }
}