/* app/admin/machines/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Upload, Trash2, Plus } from "lucide-react";

type Bracket = {
  constraints: { maxLen: number; maxWid: number };
  sheetCost: { unit: "per_sheet" | "per_thousand"; value: number | null; currency?: string };
};

type Machine = {
  id?: string;
  name: string;
  is_offset?: boolean;
  max_len_mm?: number | null;
  max_wid_mm?: number | null;
  mech_clamp_mm?: number | null;
  mech_tail_mm?: number | null;
  mech_sides_mm?: number | null;
  base_setup_uyu?: number | null;
  base_wash_uyu?: number | null;
  base_setup_usd?: number | null;
  base_wash_usd?: number | null;
  price_brackets?: Bracket[];
  _edit?: boolean;
  _snapshot?: Machine;
};

export default function MachinesAdmin() {
  const [items, setItems] = useState<Machine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/machines", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const list: Machine[] = (j.items ?? []).map((m: Machine) => ({ ...m, _edit: false, _snapshot: undefined }));
        setItems(list);
      } catch {}
    })();
  }, []);

  const toNum = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : null; };
  function mut(i: number, patch: Partial<Machine>) { setItems(p => p.map((x, ix) => ix === i ? ({ ...x, ...patch }) : x)); setDirty(true); }
  function updBracket(mi: number, bi: number, patch: Partial<Bracket>) {
    const curr = items[mi].price_brackets ?? [];
    const next = curr.map((x, idx) => idx === bi ? ({ ...x, ...patch }) : x);
    mut(mi, { price_brackets: next });
  }
  function removeBracket(mi: number, bi: number) {
    const curr = items[mi].price_brackets ?? [];
    mut(mi, { price_brackets: curr.filter((_, idx) => idx !== bi) });
  }

  function addMachine() {
    setItems(p => [{
      name: "Nueva máquina",
      is_offset: false,
      max_len_mm: null, max_wid_mm: null,
      mech_clamp_mm: 0, mech_tail_mm: 0, mech_sides_mm: 0,
      base_setup_uyu: null, base_wash_uyu: null,
      price_brackets: [],
      _edit: true
    }, ...p]);
    setDirty(true);
  }
  function startEdit(i: number) { mut(i, { _edit: true, _snapshot: structuredClone(items[i]) }); }
  function cancelEdit(i: number) {
    const snap = items[i]._snapshot;
    setItems(p => p.map((x, ix) => ix === i ? (snap ? { ...snap, _edit: false, _snapshot: undefined } : { ...x, _edit: false }) : x));
  }
  function saveEdit(i: number) { mut(i, { _edit: false, _snapshot: undefined }); }
  async function deleteMachine(id?: string, idx?: number) {
    if (!confirm("¿Eliminar máquina?")) return;
    try { if (id) await fetch(`/api/admin/machines?id=${id}`, { method: "DELETE" }); } catch {}
    setItems(p => p.filter((_, i) => i !== (idx ?? -1)));
    setDirty(true);
  }

  async function saveAll() {
    setMsg("Guardando…");
    try {
      const payload = items.map(({ _edit, _snapshot, ...r }) => r);
      const r = await fetch("/api/admin/machines", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: payload })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "falló el guardado");
      setItems((j.items ?? payload).map((m: Machine) => ({ ...m, _edit: false, _snapshot: undefined })));
      setDirty(false); setMsg(`Guardado OK (${(j.items ?? payload).length})`);
    } catch (e: any) { setMsg("No se pudo guardar: " + (e?.message || "error")); }
  }

  const exportHref = useMemo(() =>
    URL.createObjectURL(new Blob([JSON.stringify({ machines: items.map(({ _edit, _snapshot, ...r }) => r) }, null, 2)], { type: "application/json" })),
    [items]
  );
  
  const LabeledInput = ({label, sublabel, children} : {label: string, sublabel?: string, children: React.ReactNode}) => (
    <label className="grid gap-1 text-sm">
      <div className="flex justify-between items-baseline">
        <span className="text-white/80 font-medium">{label}</span>
        {sublabel && <span className="text-xs text-white/50">{sublabel}</span>}
      </div>
      {children}
    </label>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <a href="/admin" className="px-3 py-2 rounded bg-white/10 border border-white/20">↩︎ Volver</a>
        <h1 className="text-2xl font-bold">Máquinas</h1>
        <input type="file" accept="application/json" onChange={async e => {
          const f = e.currentTarget.files?.[0]; if (!f) return;
          try {
            const raw = JSON.parse(await f.text());
            const arr: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.machines) ? raw.machines : (Array.isArray(raw?.items) ? raw.items : []));
            const list: Machine[] = arr.map((m: any) => ({ ...m, price_brackets: Array.isArray(m.price_brackets) ? m.price_brackets : [], _edit: false }));
            setItems(list); setDirty(true);
          } catch { alert("JSON inválido"); }
          e.currentTarget.value = "";
        }} />
        <button className="px-3 py-2 rounded bg-white text-black font-semibold" onClick={addMachine}>Agregar</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20 disabled:opacity-50 font-semibold" onClick={saveAll} disabled={!dirty}>Guardar Cambios</button>
        <a href={exportHref} download="machines.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty && <span className="text-amber-300 text-sm">Cambios sin guardar</span>}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((m, i) => (
          <div key={m.id ?? i} className="rounded-xl border border-white/15 bg-black/40 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <input
                className="inp text-lg font-semibold w-full bg-transparent border-none p-0 disabled:text-white"
                value={m.name} onChange={e => mut(i, { name: e.target.value })}
                placeholder="Nombre de la máquina" disabled={!m._edit}
              />
              <div className="flex gap-2 items-center">
                {!m._edit ? (
                    <button className="btn-ghost" title="Editar" onClick={() => startEdit(i)}><Pencil size={18} /></button>
                ) : (
                  <>
                    <button className="btn-ghost" title="Cancelar" onClick={() => cancelEdit(i)}><RotateCcw size={18} /></button>
                    <button className="btn-ok" title="Guardar" onClick={() => saveEdit(i)}><Upload size={18} /></button>
                    <button className="btn-danger" title="Eliminar" onClick={() => deleteMachine(m.id, i)}><Trash2 size={18} /></button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <LabeledInput label="Tipo">
                <select className="inp w-full" value={m.is_offset ? "offset" : "digital"} onChange={e => mut(i, { is_offset: e.target.value === "offset" })} disabled={!m._edit}>
                  <option value="digital">Digital</option>
                  <option value="offset">Offset</option>
                </select>
              </LabeledInput>
              
              <div/> 

              <LabeledInput label="Tamaño máximo de papel" sublabel="Ancho (entrada) × Largo">
                <div className="flex items-center gap-2">
                  <input type="number" className="inp w-full" value={m.max_len_mm ?? ""} onChange={e => mut(i, { max_len_mm: toNum(e.target.value) })} disabled={!m._edit} />
                   <span className="text-white/50">×</span>
                  <input type="number" className="inp w-full" value={m.max_wid_mm ?? ""} onChange={e => mut(i, { max_wid_mm: toNum(e.target.value) })} disabled={!m._edit} />
                </div>
              </LabeledInput>

              <LabeledInput label="Costos de preparación" sublabel="Postura / Lavado (UYU)">
                 <div className="flex items-center gap-2">
                    <input type="number" className="inp w-full" value={(m.base_setup_uyu ?? m.base_setup_usd) ?? ""} onChange={e => mut(i, { base_setup_uyu: toNum(e.target.value) })} disabled={!m._edit} />
                    <input type="number" className="inp w-full" value={(m.base_wash_uyu ?? m.base_wash_usd) ?? ""} onChange={e => mut(i, { base_wash_uyu: toNum(e.target.value) })} disabled={!m._edit} />
                  </div>
              </LabeledInput>

              <LabeledInput label="Márgenes" sublabel="Pinza / Cola / Costados (mm)">
                <div className="flex items-center gap-2">
                  <input type="number" className="inp w-full" value={m.mech_clamp_mm ?? ""} onChange={e => mut(i, { mech_clamp_mm: toNum(e.target.value) })} disabled={!m._edit} />
                  <input type="number" className="inp w-full" value={m.mech_tail_mm ?? ""} onChange={e => mut(i, { mech_tail_mm: toNum(e.target.value) })} disabled={!m._edit} />
                  <input type="number" className="inp w-full" value={m.mech_sides_mm ?? ""} onChange={e => mut(i, { mech_sides_mm: toNum(e.target.value) })} disabled={!m._edit} />
                </div>
              </LabeledInput>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-white/80 font-semibold">Costos por formato</h3>
                {m._edit && (
                  <button className="btn-ok flex items-center gap-1" onClick={() => {
                    const curr = m.price_brackets ?? [];
                    const next: Bracket = { constraints: { maxLen: 0, maxWid: 0 }, sheetCost: { unit: "per_sheet", value: 0, currency: "UYU" } };
                    mut(i, { price_brackets: [next, ...curr] });
                  }}><Plus size={16}/> Tramo</button>
                )}
              </div>

              {(m.price_brackets ?? []).length === 0 && <div className="text-xs text-white/60">Sin tramos</div>}

              <div className="space-y-2">
                {(m.price_brackets ?? []).map((b, bi) => (
                  <div key={bi} className={`rounded-lg p-2 ${m._edit ? 'bg-black/20 border border-white/10' : 'bg-white/5'}`}>
                    {!m._edit ? (
                      <div className="text-sm font-medium text-white/90">
                        {b.constraints?.maxLen ?? "-"}×{b.constraints?.maxWid ?? "-"} mm — ${b.sheetCost?.value ?? "-"} {b.sheetCost?.unit === "per_sheet" ? "por hoja" : "por millar"}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <LabeledInput label="Ancho (entrada) × Largo">
                            <div className="flex items-center gap-2">
                                <input className="inp w-full" type="number" value={b.constraints?.maxLen ?? ""} onChange={e => updBracket(i, bi, { constraints: { ...(b.constraints || { maxWid: 0 }), maxLen: Number(e.target.value || 0) } })} />
                                <span className="text-white/50">×</span>
                                <input className="inp w-full" type="number" value={b.constraints?.maxWid ?? ""} onChange={e => updBracket(i, bi, { constraints: { ...(b.constraints || { maxLen: 0 }), maxWid: Number(e.target.value || 0) } })} />
                            </div>
                          </LabeledInput>
                          <LabeledInput label="Unidad y Precio">
                            <div className="flex items-center gap-2">
                               <select className="inp w-full" value={b.sheetCost?.unit ?? "per_sheet"} onChange={e => updBracket(i, bi, { sheetCost: { ...(b.sheetCost || { value: 0 }), unit: e.target.value as any } })}>
                                  <option value="per_sheet">por hoja</option>
                                  <option value="per_thousand">por millar</option>
                               </select>
                               <input className="inp w-full" type="number" value={b.sheetCost?.value ?? ""} onChange={e => updBracket(i, bi, { sheetCost: { ...(b.sheetCost || { unit: "per_sheet" }), value: toNum(e.target.value) } })} />
                            </div>
                          </LabeledInput>
                        </div>
                        <div className="flex justify-end mt-2">
                          <button className="btn-danger" onClick={() => removeBracket(i, bi)}><Trash2 size={16}/></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}