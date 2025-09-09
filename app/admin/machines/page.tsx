/* app/admin/machines/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Upload, Trash2, Plus } from "lucide-react";

type Bracket = {
  constraints: { maxLen: number; maxWid: number };
  sheetCost: { unit: "per_sheet" | "per_thousand"; value: number; currency?: string };
};
type Machine = {
  id?: string;
  name: string;
  is_offset?: boolean;
  max_len_mm?: number|null; max_wid_mm?: number|null;
  mech_clamp_mm?: number|null; mech_tail_mm?: number|null; mech_sides_mm?: number|null;
  base_setup_uyu?: number|null; base_wash_uyu?: number|null;
  base_setup_usd?: number|null; base_wash_usd?: number|null;
  price_brackets?: Bracket[];
  _edit?: boolean; _snapshot?: Machine;
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
      const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.machines)?raw.machines:(Array.isArray(raw?.items)?raw.items:[]));
      const list: Machine[] = arr.map((m:any)=>({
        ...m, price_brackets: Array.isArray(m.price_brackets)?m.price_brackets:[], _edit:false
      }));
      setItems(list); setDirty(true); setMsg(`Importadas ${list.length} máquinas (sin guardar)`);
    } catch { alert("JSON inválido."); }
    e.currentTarget.value = "";
  }

  function addMachine(){
    setItems(p=> [{
      name:"Nueva máquina", is_offset:false,
      max_len_mm:null, max_wid_mm:null,
      mech_clamp_mm:0, mech_tail_mm:0, mech_sides_mm:0,
      base_setup_uyu:null, base_wash_uyu:null,
      price_brackets:[], _edit:true
    }, ...p]); setDirty(true);
  }
  function startEdit(i:number){ setItems(p=>p.map((x,ix)=>ix===i?({...x,_edit:true,_snapshot:structuredClone(x)}):x)); }
  function cancelEdit(i:number){ setItems(p=>p.map((x,ix)=>ix===i?(x._snapshot?({...x._snapshot,_edit:false,_snapshot:undefined}):({...x,_edit:false})):x)); }
  function saveEdit(i:number){ setItems(p=>p.map((x,ix)=>ix===i?({...x,_edit:false,_snapshot:undefined}):x)); setDirty(true); }
  async function deleteMachine(id?:string, idx?:number){
    if(!confirm("¿Eliminar máquina?")) return;
    if(id) await fetch(`/api/admin/machines?id=${id}`,{method:"DELETE"});
    if(typeof idx==="number") setItems(p=>p.filter((_,i)=>i!==idx));
    setDirty(true);
  }
  async function saveAll(){
    setMsg("Guardando");
    const payload = items.map(({_edit,_snapshot,...rest})=>rest);
    const r = await fetch("/api/admin/machines",{method:"PUT",headers:{'Content-Type':'application/json'},body:JSON.stringify({items:payload})});
    const j = await r.json();
    if(r.ok){ setItems((j.items??[]).map((m:Machine)=>({...m,_edit:false,_snapshot:undefined}))); setDirty(false); setMsg(`Guardado OK (${j.items?.length??0})`); }
    else setMsg("Error: "+(j.error||"desconocido"));
  }
  const exportHref = useMemo(()=> URL.createObjectURL(new Blob([JSON.stringify({machines:items.map(({_edit,_snapshot,...r})=>r)},null,2)],{type:'application/json'})),[items]);
  function mut(i:number, patch:Partial<Machine>){ setItems(p=>p.map((x,ix)=>ix===i?({...x,...patch}):x)); setDirty(true); }

  return (
      return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Máquinas</h1>
        <input type="file" accept="application/json" onChange={onImportFile} />
        <button className="px-3 py-2 rounded bg-white text-black" onClick={addMachine}>Agregar</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20 disabled:opacity-50" onClick={saveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="machines.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty && <span className="text-amber-300 text-sm">Cambios sin guardar</span>}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <p className="text-white/60 text-xs">
        Nota: la <b>primera medida</b> es la de <b>entrada a máquina</b>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((m, i) => (
          <div key={m.id ?? i} className="rounded-xl border border-white/15 bg-black/40 p-4">
            {/* Título + acciones */}
            <div className="flex items-center justify-between gap-2">
              <input
                className="bg-white text-black border border-black/80 rounded-md px-3 py-2 w-full text-lg font-semibold disabled:opacity-70"
                value={m.name}
                onChange={e => mut(i, { name: e.target.value })}
                placeholder="Nombre de la máquina"
                disabled={!m._edit}
              />
              {!m._edit ? (
                <div className="flex gap-2">
                  <button className="px-2.5 py-1.5 rounded border border-white/40" title="Editar" onClick={() => startEdit(i)}>✏️</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="px-2.5 py-1.5 rounded border border-white/40" title="Cancelar" onClick={() => cancelEdit(i)}>↩️</button>
                  <button className="px-2.5 py-1.5 rounded border border-green-600 bg-green-100 text-green-900" title="Guardar edición" onClick={() => saveEdit(i)}>⬆️</button>
                  <button className="px-2.5 py-1.5 rounded border border-red-600 bg-red-100 text-red-900" title="Eliminar" onClick={() => deleteMachine(m.id, i)}>🗑️</button>
                </div>
              )}
            </div>

            {/* Cuerpo: izquierda datos / derecha tramos */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Izquierda */}
              <div className="space-y-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-white/80">Tipo</span>
                  <select
                    className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                    value={m.is_offset ? "offset" : "digital"}
                    onChange={e => mut(i, { is_offset: e.target.value === "offset" })}
                    disabled={!m._edit}
                  >
                    <option value="digital">Digital</option>
                    <option value="offset">Offset</option>
                  </select>
                </label>

                {/* Tamaño máximo: 1 fila, 4 columnas (cada input 1/4) */}
                <div className="sm:col-span-2">
                  <label className="grid gap-2 text-sm">
                    <span className="text-white/80">Tamaño máximo de papel</span>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="grid gap-1">
                        <span className="text-xs text-white/70">Ancho (entrada a máquina)</span>
                        <input type="number"
                          className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                          value={m.max_len_mm ?? ""}
                          onChange={e => mut(i, { max_len_mm: toNum(e.target.value) })}
                          disabled={!m._edit}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-white/70">Largo</span>
                        <input type="number"
                          className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                          value={m.max_wid_mm ?? ""}
                          onChange={e => mut(i, { max_wid_mm: toNum(e.target.value) })}
                          disabled={!m._edit}
                        />
                      </div>
                      <div />
                      <div />
                    </div>
                  </label>
                </div>

                {/* Preparación: 1 fila, 4 columnas (cada input 1/4) */}
                <div className="sm:col-span-2">
                  <label className="grid gap-2 text-sm">
                    <span className="text-white/80">Costos de preparación (UYU)</span>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="grid gap-1">
                        <span className="text-xs text-white/70">Postura</span>
                        <input type="number"
                          className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                          value={(m.base_setup_uyu ?? m.base_setup_usd) ?? ""}
                          onChange={e => mut(i, { base_setup_uyu: toNum(e.target.value) })}
                          disabled={!m._edit}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-white/70">Lavado</span>
                        <input type="number"
                          className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                          value={(m.base_wash_uyu ?? m.base_wash_usd) ?? ""}
                          onChange={e => mut(i, { base_wash_uyu: toNum(e.target.value) })}
                          disabled={!m._edit}
                        />
                      </div>
                      <div />
                      <div />
                    </div>
                  </label>
                </div>

                {/* Márgenes: 1 fila, 6 columnas (cada input 1/6) */}
                <div className="sm:col-span-2">
                  <label className="grid gap-2 text-sm">
                    <span className="text-white/80">Márgenes (mm)</span>
                    <div className="grid grid-cols-6 gap-2">
                      <div className="grid gap-1">
                        <span className="text-xs text-white/70">Pinza</span>
                        <input type="number"
                          className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                          value={m.mech_clamp_mm ?? ""}
                          onChange={e => mut(i, { mech_clamp_mm: toNum(e.target.value) })}
                          disabled={!m._edit}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-white/70">Cola</span>
                        <input type="number"
                          className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                          value={m.mech_tail_mm ?? ""}
                          onChange={e => mut(i, { mech_tail_mm: toNum(e.target.value) })}
                          disabled={!m._edit}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-xs text-white/70">Márgenes</span>
                        <input type="number"
                          className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                          value={m.mech_sides_mm ?? ""}
                          onChange={e => mut(i, { mech_sides_mm: toNum(e.target.value) })}
                          disabled={!m._edit}
                        />
                      </div>
                      <div /><div /><div />
                    </div>
                  </label>
                </div>
              </div>

              {/* Derecha — Costos por formato */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80 font-semibold">Costos por formato</span>
                  {m._edit && (
                    <button className="px-2 py-1 rounded border border-green-600 bg-green-100 text-green-900 flex items-center gap-1"
                      onClick={()=>{
                        const curr = m.price_brackets ?? [];
                        const next = { constraints:{maxLen:0,maxWid:0}, sheetCost:{unit:"per_sheet" as const, value:0, currency:"UYU"} };
                        mut(i,{price_brackets:[next, ...curr]});
                      }}
                    >+ Tramo</button>
                  )}
                </div>

                {(m.price_brackets ?? []).length === 0 && (
                  <div className="text-xs text-white/60">Sin tramos</div>
                )}

                <div className="space-y-2">
                  {(m.price_brackets ?? []).map((b, bi) => (
                    <div key={bi} className="rounded-lg border border-black/60 bg-white text-black p-2">
                      {!m._edit ? (
                        <div className="text-sm">
                          {(b.constraints?.maxLen ?? "-")}×{(b.constraints?.maxWid ?? "-")} mm — ${b.sheetCost?.value ?? "-"} {b.sheetCost?.unit === "per_sheet" ? "por hoja" : "por millar"}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-1">
                              <span className="text-xs">Ancho (entrada)</span>
                              <input className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                                     type="number" value={b.constraints?.maxLen ?? ""}
                                     onChange={e=>updBracket(i,bi,{constraints:{...b.constraints,maxLen:toNum(e.target.value) as any}})} />
                            </div>
                            <div className="grid gap-1">
                              <span className="text-xs">Largo</span>
                              <input className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                                     type="number" value={b.constraints?.maxWid ?? ""}
                                     onChange={e=>updBracket(i,bi,{constraints:{...b.constraints,maxWid:toNum(e.target.value) as any}})} />
                            </div>
                            <div className="grid gap-1">
                              <span className="text-xs">Unidad</span>
                              <select className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                                      value={b.sheetCost?.unit ?? "per_sheet"}
                                      onChange={e=>updBracket(i,bi,{sheetCost:{...(b.sheetCost||{value:0}),unit:e.target.value as any}})}>
                                <option value="per_sheet">por hoja</option>
                                <option value="per_thousand">por millar</option>
                              </select>
                            </div>
                            <div className="grid gap-1">
                              <span className="text-xs">Precio</span>
                              <input className="bg-white text-black border border-black/80 rounded-md px-3 py-2"
                                     type="number" value={b.sheetCost?.value ?? ""}
                                     onChange={e=>updBracket(i,bi,{sheetCost:{...(b.sheetCost||{unit:"per_sheet"}),value:toNum(e.target.value) as any}})} />
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <button className="px-2 py-1 rounded border border-red-600 bg-red-100 text-red-900"
                                    onClick={()=>removeBracket(i,bi)}>🗑️</button>
                          </div>
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
    </div>
  );
}
