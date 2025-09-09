// app/admin/machines/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Bracket = {
  name: string;
  constraints: { maxLen: number; maxWid: number };
  sheetCost: { unit: "per_sheet" | "per_thousand"; value: number; currency?: string };
  notes?: string;
  _edit?: boolean;
};
type Machine = {
  id?: string;
  name: string;
  is_offset?: boolean;
  max_len_mm?: number|null; max_wid_mm?: number|null;
  min_len_mm?: number|null; min_wid_mm?: number|null;
  mech_clamp_mm?: number|null; mech_tail_mm?: number|null; mech_sides_mm?: number|null;
  base_setup_usd?: number|null; base_wash_usd?: number|null;
  base_setup_uyu?: number|null; base_wash_uyu?: number|null;
  min_impressions?: number|null;
  feed_long_edge?: boolean; // true: entra por lado largo
  price_brackets?: Bracket[];
  _edit?: boolean;
  _snapshot?: Machine; // para cancelar cambios
};

export default function MachinesAdmin() {
  const [items, setItems] = useState<Machine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { (async () => {
    const r = await fetch("/api/admin/machines", { cache: "no-store" });
    const j = await r.json();
    setItems((j.items ?? []).map((m:Machine)=> ({...m, _edit:false})));
  })(); }, []);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      const list: Machine[] = Array.isArray(raw) ? raw : raw.machines ?? raw.items ?? [];
      const norm = list.map((m:any)=> ({
        ...m,
        price_brackets: m.price_brackets ?? m.priceBrackets ?? [],
        _edit: false
      }));
      setItems(norm); setDirty(true); setMsg(`Importadas ${norm.length} máquinas (sin guardar)`);
    } catch (err:any) { alert("JSON inválido: " + err.message); }
    e.currentTarget.value = "";
  }

  function addMachine(){
    setItems(p=> [{
      name:"Nueva máquina", is_offset:false,
      max_len_mm:null, max_wid_mm:null,
      mech_clamp_mm:0, mech_tail_mm:0, mech_sides_mm:0,
      base_setup_uyu:null, base_wash_uyu:null,
      min_impressions:null, feed_long_edge:true,
      price_brackets:[], _edit:true
    }, ...p]); setDirty(true);
  }

  function startEdit(i:number){
    setItems(p=> p.map((x,ix)=> ix===i ? ({...x, _edit:true, _snapshot: structuredClone(x)}) : x));
  }
  function cancelEdit(i:number){
    setItems(p=> p.map((x,ix)=> {
      if (ix!==i) return x;
      const snap = x._snapshot ?? x;
      const { _snapshot, _edit, ...rest } = snap as any;
      return { ...rest, _edit:false };
    }));
    setDirty(true); // si era nueva, igual marcamos
  }
  async function saveEdit(i:number){
    // sólo desmarcamos _edit; el guardado real es con Guardar general (PUT)
    setItems(p=> p.map((x,ix)=> ix===i ? ({...x, _edit:false, _snapshot:undefined}) : x));
    setDirty(true);
  }
  async function deleteMachine(id?: string, idx?: number){
    if (id) await fetch(`/api/admin/machines?id=${id}`, { method:"DELETE" });
    if (typeof idx === "number") setItems(p=> p.filter((_,i)=> i!==idx));
    setDirty(true);
  }

  async function saveAll(){
    setMsg("Guardando...");
    const payload = items.map(({_edit,_snapshot, ...rest})=> rest);
    const r = await fetch("/api/admin/machines", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items: payload }) });
    const j = await r.json();
    if (r.ok) {
      setItems((j.items ?? []).map((m:Machine)=> ({...m, _edit:false})));
      setDirty(false); setMsg(`Guardado OK (${j.items?.length ?? 0})`);
    } else {
      setMsg("Error: " + (j.error || "desconocido"));
    }
  }

  const exportHref = useMemo(()=> {
    const payload = items.map(({_edit,_snapshot, ...rest})=> rest);
    const blob = new Blob([JSON.stringify({ machines: payload }, null, 2)], { type:"application/json" });
    return URL.createObjectURL(blob);
  }, [items]);

  function mut(i:number, patch: Partial<Machine>) {
    setItems(prev => prev.map((x,ix)=> ix===i ? {...x, ...patch} : x));
    setDirty(true);
  }

  if (!items) return null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Máquinas</h1>
        <input type="file" accept="application/json" onChange={onImportFile} />
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
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Máx. papel (Entrada L  W mm)</Th>
              <Th>Setups (Arreglo / Lavado)</Th>
              <Th>Costos por formato</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((m, idx)=> (
              <tr key={m.id ?? idx} className="border-t border-white/10 align-top">
                <Td>
                  <input value={m.name} onChange={e=>mut(idx,{name:e.target.value})} className="inp w-48"/>
                </Td>
                <Td>
                  <select value={m.is_offset ? "offset":"digital"} onChange={e=>mut(idx,{is_offset: e.target.value==="offset"})} className="inp w-28">
                    <option value="digital">Digital</option>
                    <option value="offset">Offset</option>
                  </select>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="number" placeholder="Entrada L" className="inp w-28" value={num(m.max_len_mm)} onChange={e=>mut(idx,{max_len_mm: toNum(e.target.value)})}/>
                    <span></span>
                    <input type="number" placeholder="W" className="inp w-24" value={num(m.max_wid_mm)} onChange={e=>mut(idx,{max_wid_mm: toNum(e.target.value)})}/>
                    <span className="text-white/50 text-xs">La primera medida es la de ENTRADA</span>
                  </div>
                </Td>
                <Td>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="inp" placeholder="Arreglo $" value={num(m.base_setup_uyu ?? m.base_setup_usd)} onChange={e=>mut(idx,{base_setup_uyu: toNum(e.target.value)})}/>
                    <input type="number" className="inp" placeholder="Lavado $" value={num(m.base_wash_uyu ?? m.base_wash_usd)} onChange={e=>mut(idx,{base_wash_uyu: toNum(e.target.value)})}/>
                  </div>
                </Td>
                <Td>
                  <BracketEditor value={m.price_brackets ?? []} onChange={v=>mut(idx,{price_brackets:v})}/>
                </Td>
                <Td className="whitespace-nowrap">
                  {!m._edit && (
                    <div className="flex gap-2">
                      <button className="btn-ghost" title="Editar" onClick={()=>startEdit(idx)}></button>
                      <button className="btn-danger" title="Eliminar" onClick={()=>deleteMachine(m.id, idx)}></button>
                    </div>
                  )}
                  {m._edit && (
                    <div className="flex gap-2">
                      <button className="btn-ghost" title="Cancelar cambios" onClick={()=>cancelEdit(idx)}></button>
                      <button className="btn-ok" title="Guardar edición" onClick={()=>saveEdit(idx)}></button>
                      <button className="btn-danger" title="Eliminar" onClick={()=>deleteMachine(m.id, idx)}></button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalles adicionales por máquina (márgenes, mínimos, orientación) */}
      <div className="space-y-3">
        {items.map((m, i)=> m._edit ? (
          <div key={"detail-"+(m.id ?? i)} className="rounded-xl border border-white/10 p-4">
            <h3 className="font-semibold mb-2">Márgenes y opciones  {m.name}</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <Labeled label="Pinza (mm)">
                <input type="number" className="inp w-full" value={num(m.mech_clamp_mm)} onChange={e=>mut(i,{mech_clamp_mm: toNum(e.target.value)})}/>
              </Labeled>
              <Labeled label="Cola (mm)">
                <input type="number" className="inp w-full" value={num(m.mech_tail_mm)} onChange={e=>mut(i,{mech_tail_mm: toNum(e.target.value)})}/>
              </Labeled>
              <Labeled label="Costados (mm)">
                <input type="number" className="inp w-full" value={num(m.mech_sides_mm)} onChange={e=>mut(i,{mech_sides_mm: toNum(e.target.value)})}/>
              </Labeled>
              <Labeled label="Mín. impresiones">
                <input type="number" className="inp w-full" value={num(m.min_impressions)} onChange={e=>mut(i,{min_impressions: toNum(e.target.value)})}/>
              </Labeled>
              <Labeled label="Entrada por lado largo">
                <input type="checkbox" checked={!!m.feed_long_edge} onChange={e=>mut(i,{feed_long_edge: e.target.checked})}/>
              </Labeled>
            </div>
          </div>
        ) : null)}
      </div>

      <style jsx>{`
        .inp { background:#0f1115; border:1px solid rgba(255,255,255,.12); padding:.45rem .6rem; border-radius:.5rem; }
        .btn-ghost { padding:.35rem .5rem; border:1px solid rgba(255,255,255,.2); border-radius:.5rem; }
        .btn-danger { padding:.35rem .5rem; border:1px solid rgba(220,38,38,.5); background:rgba(220,38,38,.15); border-radius:.5rem; }
        .btn-ok { padding:.35rem .5rem; border:1px solid rgba(34,197,94,.5); background:rgba(34,197,94,.15); border-radius:.5rem; }
      `}</style>
    </div>
  );
}

function Th({children}:{children?:any}){ return <th className="text-left font-semibold p-3">{children ?? <>&nbsp;</>}</th>; }
function Td({children}:{children?:any}){ return <td className="p-3 align-top">{children}</td>; }
function num(v:any){ return (v ?? "") as any; }
function toNum(s:string){ const n = Number(s); return Number.isFinite(n) ? n : null; }

function Labeled({label, children}:{label:string; children:any}) {
  return <label className="text-sm grid gap-1">{label}{children}</label>;
}

function BracketEditor({ value, onChange }:{ value: Bracket[]; onChange:(v:Bracket[])=>void }) {
  const list = value ?? [];
  function add(){
    onChange([{ name:"33x48.7", constraints:{maxLen:330,maxWid:487}, sheetCost:{unit:"per_sheet", value:0, currency:"UYU"}, notes:"", _edit:true }, ...list]);
  }
  function mut(i:number, patch:Partial<Bracket>){ onChange(list.map((x,ix)=> ix===i ? ({...x, ...patch}) : x)); }
  function rm(i:number){ onChange(list.filter((_,ix)=> ix!==i)); }
  function start(i:number){ mut(i,{ _edit:true }); }
  function cancel(i:number){ const snap = list[i] as any; mut(i,{ _edit:false }); }
  function save(i:number){ mut(i,{ _edit:false }); }

  return (
    <div className="space-y-2">
      <button className="px-2 py-1 rounded bg-white/10 border border-white/20" onClick={add}>+ Tramo</button>
      {list.length===0 ? <div className="text-white/50 text-xs">Sin tramos</div> : null}
      <div className="space-y-2">
        {list.map((b, i)=> (
          <div key={i} className="rounded-lg border border-white/10 p-2">
            <div className="grid grid-cols-6 gap-2 items-center">
              <input className="inp" value={b.name} onChange={e=>mut(i,{name:e.target.value})} placeholder="Nombre"/>
              <input className="inp w-24" type="number" value={b.constraints?.maxLen ?? ""} onChange={e=>mut(i,{constraints:{...b.constraints, maxLen: toNum(e.target.value) as any}})} placeholder="Entrada L"/>
              <input className="inp w-24" type="number" value={b.constraints?.maxWid ?? ""} onChange={e=>mut(i,{constraints:{...b.constraints, maxWid: toNum(e.target.value) as any}})} placeholder="W"/>
              <select className="inp w-36" value={b.sheetCost?.unit ?? "per_sheet"} onChange={e=>mut(i,{sheetCost:{...(b.sheetCost||{value:0}), unit: e.target.value as any}})}>
                <option value="per_sheet">Precio por hoja</option>
                <option value="per_thousand">Precio por millar</option>
              </select>
              <input className="inp w-24" type="number" value={b.sheetCost?.value ?? ""} onChange={e=>mut(i,{sheetCost:{...(b.sheetCost||{unit:"per_sheet"}), value: toNum(e.target.value) as any}})} placeholder="Valor"/>
              <div className="flex gap-2 justify-end">
                {!b._edit ? (
                  <>
                    <button className="btn-ghost" title="Editar" onClick={()=>start(i)}></button>
                    <button className="btn-danger" title="Eliminar" onClick={()=>rm(i)}></button>
                  </>
                ) : (
                  <>
                    <button className="btn-ghost" title="Cancelar" onClick={()=>cancel(i)}></button>
                    <button className="btn-ok" title="Guardar" onClick={()=>save(i)}></button>
                    <button className="btn-danger" title="Eliminar" onClick={()=>rm(i)}></button>
                  </>
                )}
              </div>
            </div>
            <input className="inp w-full mt-2" value={b.notes ?? ""} onChange={e=>mut(i,{notes:e.target.value})} placeholder="Notas"/>
          </div>
        ))}
      </div>
    </div>
  );
}