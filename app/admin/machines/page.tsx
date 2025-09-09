"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Upload, Trash2 } from "lucide-react";

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
  base_setup_uyu?: number|null; base_wash_uyu?: number|null;
  base_setup_usd?: number|null; base_wash_usd?: number|null;
  // estos dos están en UI; si la DB aún no los tiene, no se persisten (API ya lo maneja)
  min_impressions?: number|null;
  feed_long_edge?: boolean;
  price_brackets?: Bracket[];
  _edit?: boolean;
  _snapshot?: Machine;
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
  }
  function saveEdit(i:number){
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
    // quitamos campos no persistentes para evitar errores si no existen en la DB
    const payload = items.map(({_edit,_snapshot, min_impressions, feed_long_edge, ...rest})=> rest);
    const r = await fetch("/api/admin/machines", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items: payload }) });
    const j = await r.json();
    if (r.ok) { setItems((j.items ?? []).map((m:Machine)=> ({...m, _edit:false}))); setDirty(false); setMsg(`Guardado OK (${j.items?.length ?? 0})`); }
    else { setMsg("Error: " + (j.error || "desconocido")); }
  }
  const exportHref = useMemo(()=> {
    const payload = items.map(({_edit,_snapshot, ...rest})=> rest);
    return URL.createObjectURL(new Blob([JSON.stringify({ machines: payload }, null, 2)], { type:"application/json" }));
  }, [items]);

  function mut(i:number, patch: Partial<Machine>) {
    setItems(prev => prev.map((x,ix)=> ix===i ? {...x, ...patch} : x));
    setDirty(true);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Máquinas</h1>
        <input type="file" accept="application/json" onChange={onImportFile} />
        <button className="px-3 py-2 rounded bg-white text-black" onClick={addMachine}>Agregar</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20" onClick={saveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="machines.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty ? <span className="text-amber-300 text-sm">Cambios sin guardar</span> : null}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <p className="text-white/60 text-xs">Nota: la <b>primera medida</b> siempre es la de <b>ENTRADA</b> del papel.</p>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th className="whitespace-nowrap">Máx. papel (Entrada L  W mm)</Th>
              <Th>Setups (Arreglo / Lavado) UYU</Th>
              <Th className="whitespace-nowrap">Márgenes (Pinza / Cola / Costados mm)</Th>
              <Th>Costos por formato</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((m, idx)=> (
              <tr key={m.id ?? idx} className="border-t border-white/10 align-top">
                <Td><input value={m.name} onChange={e=>mut(idx,{name:e.target.value})} className="inp w-48" disabled={!m._edit}/></Td>
                <Td>
                  <select value={m.is_offset ? "offset":"digital"} onChange={e=>mut(idx,{is_offset: e.target.value==="offset"})} className="inp w-28" disabled={!m._edit}>
                    <option value="digital">Digital</option>
                    <option value="offset">Offset</option>
                  </select>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Entrada L" className="inp w-28" value={num(m.max_len_mm)} onChange={e=>mut(idx,{max_len_mm: toNum(e.target.value)})} disabled={!m._edit}/>
                    <span></span>
                    <input type="number" placeholder="W" className="inp w-24" value={num(m.max_wid_mm)} onChange={e=>mut(idx,{max_wid_mm: toNum(e.target.value)})} disabled={!m._edit}/>
                  </div>
                </Td>
                <Td>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="inp" placeholder="Arreglo $UYU" value={num(m.base_setup_uyu ?? m.base_setup_usd)} onChange={e=>mut(idx,{base_setup_uyu: toNum(e.target.value)})} disabled={!m._edit}/>
                    <input type="number" className="inp" placeholder="Lavado $UYU" value={num(m.base_wash_uyu ?? m.base_wash_usd)} onChange={e=>mut(idx,{base_wash_uyu: toNum(e.target.value)})} disabled={!m._edit}/>
                  </div>
                </Td>
                <Td>
                  {!m._edit ? (
                    <div className="chip">
                      P {m.mech_clamp_mm ?? "-"}  C {m.mech_tail_mm ?? "-"}  L/R {m.mech_sides_mm ?? "-"}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="number" className="inp w-20" placeholder="Pinza" value={num(m.mech_clamp_mm)} onChange={e=>mut(idx,{mech_clamp_mm: toNum(e.target.value)})}/>
                      <input type="number" className="inp w-20" placeholder="Cola"  value={num(m.mech_tail_mm)}  onChange={e=>mut(idx,{mech_tail_mm:  toNum(e.target.value)})}/>
                      <input type="number" className="inp w-24" placeholder="Costados" value={num(m.mech_sides_mm)} onChange={e=>mut(idx,{mech_sides_mm: toNum(e.target.value)})}/>
                    </div>
                  )}
                </Td>
                <Td>
                  <BracketEditor editable={!!m._edit} value={m.price_brackets ?? []} onChange={v=>mut(idx,{price_brackets:v})}/>
                </Td>
                <Td className="whitespace-nowrap">
                  {!m._edit ? (
                    <div className="flex gap-2">
                      <button className="btn-ghost" title="Editar" onClick={()=>startEdit(idx)}><Pencil size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button className="btn-ghost" title="Cancelar cambios" onClick={()=>cancelEdit(idx)}><RotateCcw size={16} /></button>
                      <button className="btn-ok" title="Guardar edición" onClick={()=>saveEdit(idx)}><Upload size={16} /></button>
                      <button className="btn-danger" title="Eliminar" onClick={()=>deleteMachine(m.id, idx)}><Trash2 size={16} /></button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        /* Alto contraste */
        .inp { background:#fff; color:#000; border:1px solid #111; padding:.45rem .6rem; border-radius:.5rem; }
        .inp:disabled { opacity:.7; cursor:not-allowed; }
        .btn-ghost { padding:.35rem .5rem; border:1px solid rgba(255,255,255,.3); border-radius:.5rem; background:transparent; }
        .btn-danger { padding:.35rem .5rem; border:1px solid #dc2626; background:#fee2e2; color:#991b1b; border-radius:.5rem; }
        .btn-ok { padding:.35rem .5rem; border:1px solid #16a34a; background:#dcfce7; color:#14532d; border-radius:.5rem; }
        .chip { background:#fff; color:#000; border:1px solid #111; border-radius:.5rem; padding:.2rem .5rem; display:inline-block; }
      `}</style>
    </div>
  );
}

function Th({children, className}:{children?:any; className?:string}){ return <th className={`text-left font-semibold p-3 ${className||""}`}>{children ?? <>&nbsp;</>}</th>; }
function Td({children, className, colSpan}:{children?:any; className?:string; colSpan?:number}){ return <td className={`p-3 align-top ${className||""}`} colSpan={colSpan}>{children}</td>; }
function num(v:any){ return (v ?? "") as any; }
function toNum(s:string){ const n = Number(s); return Number.isFinite(n) ? n : null; }

/** Tramos / formatos */
function BracketEditor({ editable, value, onChange }:{ editable:boolean; value: Bracket[]; onChange:(v:Bracket[])=>void }) {
  const list = value ?? [];
  function add(){ onChange([{ name:"nuevo", constraints:{maxLen:0,maxWid:0}, sheetCost:{unit:"per_sheet", value:0, currency:"UYU"}, notes:"" }, ...list]); }
  function mut(i:number, patch:Partial<Bracket>){ onChange(list.map((x,ix)=> ix===i ? ({...x, ...patch}) : x)); }
  function rm(i:number){ onChange(list.filter((_,ix)=> ix!==i)); }

  if (!editable) {
    return (
      <div className="space-y-1">
        {list.length===0 && <div className="text-white/60 text-xs">Sin tramos</div>}
        {list.map((b, i)=> (
          <div key={i} className="bg-white text-black border border-black/60 rounded-md px-2 py-1 flex flex-wrap items-center gap-2">
            <span className="font-medium">{b.name}</span>
            <span>{b.constraints?.maxLen ?? "-"}{b.constraints?.maxWid ?? "-"} mm</span>
            <span> {b.sheetCost?.unit==="per_sheet" ? "por hoja" : "por millar"}</span>
            <span> {b.sheetCost?.value ?? "-"}</span>
            {b.notes ? <span> {b.notes}</span> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button className="px-2 py-1 rounded bg-white text-black border border-black/60" onClick={add}>+ Tramo</button>
      {list.map((b, i)=> (
        <div key={i} className="rounded-lg border border-black/60 bg-white text-black p-2">
          <div className="grid grid-cols-6 gap-2 items-center">
            <input className="inp" value={b.name} onChange={e=>mut(i,{name:e.target.value})} placeholder="Nombre del formato"/>
            <input className="inp w-24" type="number" value={b.constraints?.maxLen ?? ""} onChange={e=>mut(i,{constraints:{...b.constraints, maxLen: toNum(e.target.value) as any}})} placeholder="Entrada L"/>
            <input className="inp w-24" type="number" value={b.constraints?.maxWid ?? ""} onChange={e=>mut(i,{constraints:{...b.constraints, maxWid: toNum(e.target.value) as any}})} placeholder="W"/>
            <select className="inp w-36" value={b.sheetCost?.unit ?? "per_sheet"} onChange={e=>mut(i,{sheetCost:{...(b.sheetCost||{value:0}), unit: e.target.value as any}})}>
              <option value="per_sheet">Precio por hoja</option>
              <option value="per_thousand">Precio por millar</option>
            </select>
            <input className="inp w-24" type="number" value={b.sheetCost?.value ?? ""} onChange={e=>mut(i,{sheetCost:{...(b.sheetCost||{unit:"per_sheet"}), value: toNum(e.target.value) as any}})} placeholder="Valor"/>
            <div className="flex gap-2 justify-end">
              <button className="btn-danger" title="Eliminar" onClick={()=>rm(i)}><Trash2 size={16}/></button>
            </div>
          </div>
          <input className="inp w-full mt-2" value={b.notes ?? ""} onChange={e=>mut(i,{notes:e.target.value})} placeholder="Notas (opcional)"/>
        </div>
      ))}
    </div>
  );
}