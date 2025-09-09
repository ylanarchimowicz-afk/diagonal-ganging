// app/admin/machines/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Bracket = { name:string; constraints:{maxLen:number; maxWid:number}; sheetCost:{unit:string; value:number}; notes?:string };
type Machine = {
  id?: string;
  name: string;
  is_offset?: boolean;
  max_len_mm?: number|null; max_wid_mm?: number|null;
  min_len_mm?: number|null; min_wid_mm?: number|null;
  mech_clamp_mm?: number; mech_tail_mm?: number; mech_sides_mm?: number;
  base_setup_usd?: number; base_wash_usd?: number;
  price_brackets?: Bracket[];
};

export default function MachinesAdmin() {
  const [items, setItems] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { (async () => {
    setLoading(true);
    const r = await fetch("/api/admin/machines", { cache: "no-store" });
    const j = await r.json();
    setItems(j.items ?? []); setLoading(false);
  })(); }, []);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      const list: Machine[] = Array.isArray(raw) ? raw : raw.machines ?? raw.items ?? [];
      const norm = list.map((m:any)=> ({ ...m, price_brackets: m.price_brackets ?? m.priceBrackets ?? [] }));
      setItems(norm); setDirty(true); setMsg(`Importadas ${norm.length} maquinas`);
    } catch (err:any) { alert("JSON invalido: " + err.message); }
    e.currentTarget.value = "";
  }

  function addMachine(){ setItems(p=> [{ name:"Nueva maquina", price_brackets:[] }, ...p]); setDirty(true); }
  async function deleteMachine(id?: string, idx?: number) {
    if (id) await fetch(`/api/admin/machines?id=${id}`, { method:"DELETE" });
    if (typeof idx === "number") setItems(prev => prev.filter((_,i)=> i!==idx));
    setDirty(true);
  }

  async function saveAll() {
    setMsg("Guardando...");
    const r = await fetch("/api/admin/machines", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items }) });
    const j = await r.json();
    if (r.ok) { setItems(j.items ?? []); setDirty(false); setMsg(`Guardado OK (${j.items?.length ?? 0})`); }
    else setMsg("Error: " + (j.error || "desconocido"));
  }

  const exportHref = useMemo(() => {
    const blob = new Blob([JSON.stringify({ machines: items }, null, 2)], { type:"application/json" });
    return URL.createObjectURL(blob);
  }, [items]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Maquinas</h1>
        <input type="file" accept="application/json" onChange={onImportFile} className="text-sm"/>
        <button className="px-3 py-2 rounded bg-white text-black" onClick={addMachine}>Agregar</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20" onClick={saveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="machines.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty ? <span className="text-amber-300 text-sm">Cambios sin guardar</span> : null}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <Th>Nombre</Th><Th>Offset</Th><Th>Util (LxW mm)</Th><Th>Setups</Th><Th>Brackets</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {items.map((m, idx)=> (
              <tr key={m.id ?? idx} className="border-t border-white/10 align-top">
                <Td><input value={m.name} onChange={e=>mut(idx,{name:e.target.value})} className="inp w-56"/></Td>
                <Td>
                  <select value={m.is_offset ? "1":"0"} onChange={e=>mut(idx,{is_offset:e.target.value==="1"})} className="inp">
                    <option value="0">Digital</option><option value="1">Offset</option>
                  </select>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <input type="number" placeholder="L" className="inp w-24" value={num(m.max_len_mm)} onChange={e=>mut(idx,{max_len_mm: toNum(e.target.value)})}/>
                    <span>x</span>
                    <input type="number" placeholder="W" className="inp w-24" value={num(m.max_wid_mm)} onChange={e=>mut(idx,{max_wid_mm: toNum(e.target.value)})}/>
                  </div>
                </Td>
                <Td>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="inp" placeholder="setup $" value={num(m.base_setup_usd)} onChange={e=>mut(idx,{base_setup_usd: toNum(e.target.value)})}/>
                    <input type="number" className="inp" placeholder="lavado $" value={num(m.base_wash_usd)} onChange={e=>mut(idx,{base_wash_usd: toNum(e.target.value)})}/>
                  </div>
                </Td>
                <Td><BracketEditor value={m.price_brackets ?? []} onChange={v=>mut(idx,{price_brackets:v})}/></Td>
                <Td><button className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40" onClick={()=>deleteMachine(m.id, idx)}>Borrar</button></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`.inp{background:#0f1115;border:1px solid rgba(255,255,255,.12);padding:.45rem .6rem;border-radius:.5rem}`}</style>
    </div>
  );

  function mut(i:number, patch: Partial<Machine>) { setItems(prev => prev.map((x,ix)=> ix===i ? {...x, ...patch} : x)); setDirty(true); }
}

function Th({children}:{children?:any}){ return <th className="text-left font-semibold p-3">{children}</th>; }
function Td({children}:{children?:any}){ return <td className="p-3">{children}</td>; }
function num(v:any){ return (v ?? "") as any; }
function toNum(s:string){ const n = Number(s); return Number.isFinite(n) ? n : null; }

function BracketEditor({ value, onChange }:{ value: any[]; onChange:(v:any[])=>void }) {
  const pb = value ?? [];
  function add(){ onChange([{ name:"33x48.7", constraints:{maxLen:330,maxWid:487}, sheetCost:{unit:"per_sheet", value:0.45}, notes:"" }, ...pb]); }
  function rm(i:number){ onChange(pb.filter((_,ix)=> ix!==i)); }
  function mut(i:number, patch:any){ onChange(pb.map((x,ix)=> ix===i ? {...x, ...patch} : x)); }

  return (
    <div className="space-y-2">
      <button className="px-2 py-1 rounded bg-white/10 border border-white/20" onClick={add}>+ Bracket</button>
      {pb.length===0 ? <div className="text-white/50 text-xs">Sin brackets</div> : null}
      <div className="space-y-2">
        {pb.map((b:any, i:number)=> (
          <div key={i} className="rounded-lg border border-white/10 p-2">
            <div className="grid grid-cols-5 gap-2">
              <input className="inp" value={b.name ?? ""} onChange={e=>mut(i,{name:e.target.value})} placeholder="Nombre"/>
              <input className="inp" type="number" value={b.constraints?.maxLen ?? ""} onChange={e=>mut(i,{constraints:{...b.constraints, maxLen: toNum(e.target.value)}})} placeholder="maxLen"/>
              <input className="inp" type="number" value={b.constraints?.maxWid ?? ""} onChange={e=>mut(i,{constraints:{...b.constraints, maxWid: toNum(e.target.value)}})} placeholder="maxWid"/>
              <select className="inp" value={b.sheetCost?.unit ?? "per_sheet"} onChange={e=>mut(i,{sheetCost:{...b.sheetCost, unit:e.target.value}})}>
                <option value="per_sheet">per_sheet</option>
                <option value="per_thousand">per_thousand</option>
              </select>
              <input className="inp" type="number" value={b.sheetCost?.value ?? ""} onChange={e=>mut(i,{sheetCost:{...b.sheetCost, value: toNum(e.target.value)}})} placeholder="valor"/>
            </div>
            <div className="mt-2 flex gap-2">
              <input className="inp flex-1" value={b.notes ?? ""} onChange={e=>mut(i,{notes:e.target.value})} placeholder="Notas"/>
              <button className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40" onClick={()=>rm(i)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
