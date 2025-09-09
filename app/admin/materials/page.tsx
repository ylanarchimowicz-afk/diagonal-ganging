// app/admin/materials/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
type Mat = { id?:string; supplier?:string|null; name:string; grammage_gsm?:number|null; origin_len_mm?:number|null; origin_wid_mm?:number|null; cost_unit?:string|null; cost_value?:number|null; stock_sheets?:number|null };

export default function MaterialsAdmin() {
  const [items, setItems] = useState<Mat[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=> { (async()=>{
    const r = await fetch("/api/admin/materials", { cache:"no-store" });
    const j = await r.json(); setItems(j.items ?? []);
  })(); }, []);

  async function onImportFile(e:any){
    const f = e.target.files?.[0]; if(!f) return;
    try {
      const raw = JSON.parse(await f.text());
      const list: Mat[] = Array.isArray(raw) ? raw : raw.items ?? [];
      setItems(list); setDirty(true); setMsg(`Importados ${list.length} materiales`);
    } catch(err:any){ alert("JSON invalido: "+err.message); }
    e.currentTarget.value = "";
  }
  function add(){ setItems(p=> [{ name:"Nuevo material" }, ...p]); setDirty(true); }
  function rm(idx:number){ setItems(p=> p.filter((_,i)=> i!==idx)); setDirty(true); }
  async function save(){
    setMsg("Guardando...");
    const r = await fetch("/api/admin/materials", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items }) });
    const j = await r.json(); if(r.ok){ setItems(j.items ?? []); setDirty(false); setMsg("OK"); } else setMsg("Error: "+(j.error||""));
  }
  const exportHref = useMemo(()=> URL.createObjectURL(new Blob([JSON.stringify({ items: items }, null, 2)], { type:"application/json" })), [items]);

  function mut(i:number, patch:Partial<Mat>){ setItems(p=> p.map((x,ix)=> ix===i ? {...x, ...patch} : x)); setDirty(true); }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Materiales</h1>
        <input type="file" accept="application/json" onChange={onImportFile}/>
        <button className="px-3 py-2 rounded bg-white text-black" onClick={add}>Agregar</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20" onClick={save} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="materials.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty ? <span className="text-amber-300 text-sm">Cambios sin guardar</span> : null}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <Th>Nombre</Th><Th>Proveedor</Th><Th>GSM</Th><Th>Origen (LxW)</Th><Th>Costo</Th><Th>Stock</Th><Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((m, i)=> (
              <tr key={m.id ?? i} className="border-t border-white/10">
                <Td><input className="inp w-56" value={m.name} onChange={e=>mut(i,{name:e.target.value})}/></Td>
                <Td><input className="inp w-40" value={m.supplier ?? ""} onChange={e=>mut(i,{supplier:e.target.value})}/></Td>
                <Td><input className="inp w-20" type="number" value={m.grammage_gsm ?? ""} onChange={e=>mut(i,{grammage_gsm: toNum(e.target.value)})}/></Td>
                <Td>
                  <div className="flex gap-2">
                    <input className="inp w-24" type="number" placeholder="L" value={m.origin_len_mm ?? ""} onChange={e=>mut(i,{origin_len_mm: toNum(e.target.value)})}/>
                    <span>x</span>
                    <input className="inp w-24" type="number" placeholder="W" value={m.origin_wid_mm ?? ""} onChange={e=>mut(i,{origin_wid_mm: toNum(e.target.value)})}/>
                  </div>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <select className="inp w-28" value={m.cost_unit ?? ""} onChange={e=>mut(i,{cost_unit:e.target.value})}>
                      <option value="">unit</option><option value="per_kg">per_kg</option><option value="per_sheet">per_sheet</option><option value="per_ream">per_ream</option>
                    </select>
                    <input className="inp w-24" type="number" value={m.cost_value ?? ""} onChange={e=>mut(i,{cost_value: toNum(e.target.value)})}/>
                  </div>
                </Td>
                <Td><input className="inp w-24" type="number" value={m.stock_sheets ?? ""} onChange={e=>mut(i,{stock_sheets: toNum(e.target.value)})}/></Td>
                <Td><button className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40" onClick={()=>rm(i)}>Borrar</button></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`.inp{background:#0f1115;border:1px solid rgba(255,255,255,.12);padding:.45rem .6rem;border-radius:.5rem}`}</style>
    </div>
  );

  function Th({children}:{children?:any}){ return <th className="text-left font-semibold p-3">{children}</th>; }
  function Td({children}:{children?:any}){ return <td className="p-3">{children}</td>; }
  function toNum(s:string){ const n = Number(s); return Number.isFinite(n)? n : null; }
}


