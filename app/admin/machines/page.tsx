/* app/admin/machines/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Upload, Trash2, Plus } from "lucide-react";

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
  // estos dos quizás no existen en DB; no se envían al guardar
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
      name:"Nueva máquina",
      is_offset:false, max_len_mm:null, max_wid_mm:null,
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
    setItems(p=> p.map((x,ix)=> ix===i ? (x._snapshot ? ({...x._snapshot, _edit:false, _snapshot:undefined}) : ({...x, _edit:false})) : x));
  }
  function saveEdit(i:number){
    setItems(p=> p.map((x,ix)=> ix===i ? ({...x, _edit:false, _snapshot:undefined}) : x));
    setDirty(true);
  }
  async function deleteMachine(id?: string, idx?: number){
    if (!confirm("¿Eliminar máquina?")) return;
    if (id) await fetch(`/api/admin/machines?id=${id}`, { method:"DELETE" });
    if (typeof idx === "number") setItems(p=> p.filter((_,i)=> i!==idx));
    setDirty(true);
  }

  async function saveAll(){
    setMsg("Guardando...");
    // no enviar campos que tal vez no existan en DB
    const payload = items.map(({_edit,_snapshot, min_impressions, feed_long_edge, ...rest})=> rest);
    const r = await fetch("/api/admin/machines", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ items: payload }) });
    const j = await r.json();
    if (r.ok) {
      setItems((j.items ?? []).map((m:Machine)=> ({...m, _edit:false, _snapshot:undefined})));
      setDirty(false); setMsg(`Guardado OK (${j.items?.length ?? 0})`);
    } else {
      setMsg("Error: " + (j.error || "desconocido"));
    }
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

      <p className="text-white/60 text-xs">Nota: la <b>primera medida</b> siempre es la de <b>ENTRADA</b> del papel.</p>

      {/* grid de tarjetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((m, i)=> (
          <div key={m.id ?? i} className="rounded-xl border border-white/15 bg-black/40 p-4">
            {/* header tarjeta */}
            <div className="flex items-center justify-between gap-2">
              <input
                className="inp text-lg font-semibold w-full"
                value={m.name} onChange={e=>mut(i,{name:e.target.value})}
                placeholder="Nombre de la máquina" disabled={!m._edit}
              />
              {!m._edit ? (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Editar" onClick={()=>startEdit(i)}><Pencil size={18}/></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEdit(i)}><RotateCcw size={18}/></button>
                  <button className="btn-ok" title="Guardar edición" onClick={()=>saveEdit(i)}><Upload size={18}/></button>
                  <button className="btn-danger" title="Eliminar" onClick={()=>deleteMachine(m.id, i)}><Trash2 size={18}/></button>
                </div>
              )}
            </div>

            {/* cuerpo tarjeta */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Columna izquierda */}
              <div className="space-y-3">
                <Labeled label="Tipo">
                  <select className="inp" value={m.is_offset ? "offset" : "digital"}
                          onChange={e=>mut(i,{is_offset: e.target.value==="offset"})} disabled={!m._edit}>
                    <option value="digital">Digital</option>
                    <option value="offset">Offset</option>
                  </select>
                </Labeled>

                <Labeled label="Máximo papel (Entrada L × W mm)">
                  <div className="flex items-center gap-2">
                    <input type="number" className="inp w-28" placeholder="Entrada L"
                           value={num(m.max_len_mm)} onChange={e=>mut(i,{max_len_mm: toNum(e.target.value)})}
                           disabled={!m._edit}/>
                    <span>×</span>
                    <input type="number" className="inp w-28" placeholder="W"
                           value={num(m.max_wid_mm)} onChange={e=>mut(i,{max_wid_mm: toNum(e.target.value)})}
                           disabled={!m._edit}/>
                  </div>
                </Labeled>

                <Labeled label="Setups (UYU)">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="inp" placeholder="Arreglo"
                           value={num(m.base_setup_uyu ?? m.base_setup_usd)}
                           onChange={e=>mut(i,{base_setup_uyu: toNum(e.target.value)})} disabled={!m._edit}/>
                    <input type="number" className="inp" placeholder="Lavado"
                           value={num(m.base_wash_uyu ?? m.base_wash_usd)}
                           onChange={e=>mut(i,{base_wash_uyu: toNum(e.target.value)})} disabled={!m._edit}/>
                  </div>
                </Labeled>

                <Labeled label="Márgenes (mm)">
                  {!m._edit ? (
                    <div className="chip">Pinza {m.mech_clamp_mm ?? "-"} · Cola {m.mech_tail_mm ?? "-"} · Costados {m.mech_sides_mm ?? "-"}</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input type="number" className="inp w-24" placeholder="Pinza"
                             value={num(m.mech_clamp_mm)} onChange={e=>mut(i,{mech_clamp_mm: toNum(e.target.value)})}/>
                      <input type="number" className="inp w-24" placeholder="Cola"
                             value={num(m.mech_tail_mm)} onChange={e=>mut(i,{mech_tail_mm: toNum(e.target.value)})}/>
                      <input type="number" className="inp w-28" placeholder="Costados"
                             value={num(m.mech_sides_mm)} onChange={e=>mut(i,{mech_sides_mm: toNum(e.target.value)})}/>
                    </div>
                  )}
                </Labeled>
              </div>

              {/* Columna derecha – Tramos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80 font-semibold">Costos por formato</span>
                  {m._edit && (
                    <button className="btn-ok flex items-center gap-1" onClick={()=>{
                      const curr = m.price_brackets ?? [];
                      const next: Bracket = { name:"nuevo", constraints:{maxLen:0,maxWid:0}, sheetCost:{unit:"per_sheet", value:0, currency:"UYU"}, notes:"", _edit:true };
                      mut(i,{ price_brackets: [next, ...curr] });
                    }}>
                      <Plus size={16}/> Tramo
                    </button>
                  )}
                </div>

                {(m.price_brackets ?? []).length===0 && (
                  <div className="text-xs text-white/60">Sin tramos</div>
                )}

                <div className="space-y-2">
                  {(m.price_brackets ?? []).map((b, bi)=> (
                    <div key={bi} className="rounded-lg border border-black/60 bg-white text-black p-2">
                      {!m._edit ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="font-medium">{b.name}</span>
                          <span>{b.constraints?.maxLen ?? "-"}×{b.constraints?.maxWid ?? "-"} mm</span>
                          <span>· {b.sheetCost?.unit==="per_sheet" ? "por hoja" : "por millar"}</span>
                          <span>· {b.sheetCost?.value ?? "-"}</span>
                          {b.notes ? <span>· {b.notes}</span> : null}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-6 gap-2 items-center">
                            <input className="inp" value={b.name} onChange={e=>updateBracket(i, bi, {name:e.target.value, b})} placeholder="Nombre"/>
                            <input className="inp w-24" type="number" value={b.constraints?.maxLen ?? ""} onChange={e=>updateBracket(i, bi, {constraints:{...b.constraints, maxLen: toNum(e.target.value) as any}, b})} placeholder="Entrada L"/>
                            <input className="inp w-24" type="number" value={b.constraints?.maxWid ?? ""} onChange={e=>updateBracket(i, bi, {constraints:{...b.constraints, maxWid: toNum(e.target.value) as any}, b})} placeholder="W"/>
                            <select className="inp w-36" value={b.sheetCost?.unit ?? "per_sheet"} onChange={e=>updateBracket(i, bi, {sheetCost:{...(b.sheetCost||{value:0}), unit: e.target.value as any}, b})}>
                              <option value="per_sheet">Precio por hoja</option>
                              <option value="per_thousand">Precio por millar</option>
                            </select>
                            <input className="inp w-24" type="number" value={b.sheetCost?.value ?? ""} onChange={e=>updateBracket(i, bi, {sheetCost:{...(b.sheetCost||{unit:"per_sheet"}), value: toNum(e.target.value) as any}, b})} placeholder="Valor"/>
                            <button className="btn-danger justify-self-end" onClick={()=>removeBracket(i, bi)}><Trash2 size={16}/></button>
                          </div>
                          <input className="inp w-full mt-2" value={b.notes ?? ""} onChange={e=>updateBracket(i, bi, {notes:e.target.value, b})} placeholder="Notas (opcional)"/>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
        .chip { background:#fff; color:#000; border:1px solid #111; border-radius:.6rem; padding:.2rem .6rem; display:inline-block; }
      `}</style>
    </div>
  );

  function updateBracket(mi:number, bi:number, patch:{b:Bracket} & Partial<Bracket>) {
    const curr = items[mi].price_brackets ?? [];
    const next = curr.map((x,idx)=> idx===bi ? ({...(patch.b), ...patch}) as Bracket : x);
    mut(mi, { price_brackets: next });
  }
  function removeBracket(mi:number, bi:number) {
    const curr = items[mi].price_brackets ?? [];
    const next = curr.filter((_,idx)=> idx!==bi);
    mut(mi, { price_brackets: next });
  }
}

function Labeled({label, children}:{label:string; children:any}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-white/80">{label}</span>
      {children}
    </label>
  );
}
function num(v:any){ return (v ?? "") as any; }
function toNum(s:string){ const n = Number(s); return Number.isFinite(n) ? n : null; }