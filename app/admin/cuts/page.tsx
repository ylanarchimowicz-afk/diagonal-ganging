"use client";
import { useState } from "react";

type Cut = { w: number; l: number; preferred: boolean; _edit?: boolean };

export default function CutsPage() {
  const [items, setItems] = useState<Cut[]>([
    // ejemplo de fila
    { w: 720, l: 1020, preferred: true },
    { w: 510, l: 720, preferred: false },
  ]);

  function startEdit(i: number) {
    setItems(p => p.map((x, ix) => ix === i ? { ...x, _edit: true } : x));
  }
  function cancelEdit(i: number) {
    setItems(p => p.map((x, ix) => ix === i ? { ...x, _edit: false } : x));
  }
  function mutate(i: number, patch: Partial<Cut>) {
    setItems(p => p.map((x, ix) => ix === i ? { ...x, ...patch } : x));
  }
  function remove(i: number) {
    setItems(p => p.filter((_, ix) => ix !== i));
  }
  function addRow() {
    setItems(p => [{ w: 0, l: 0, preferred: false, _edit: true }, ...p]);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Cortes</h1>
        <a href="/admin" className="btn btn-ghost gap-2"> Volver</a>
        <button className="btn btn-primary" onClick={addRow}>+ Agregar corte</button>
      </header>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <div className="space-y-3">
            {items.map((c, i) => (
              <div key={i} className="p-3 rounded-lg border">
                {!c._edit ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <span className="font-mono">{c.w}{c.l} mm</span>{" "}
                      {c.preferred && <span className="badge badge-success">Preferido</span>}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost" title="Editar" onClick={() => startEdit(i)}></button>
                      <button className="btn btn-ghost" title="Eliminar" onClick={() => remove(i)}></button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 items-center gap-3">
                    {/* W y L chicos para dejar aire al Preferido */}
                    <input
                      type="number"
                      className="inp w-24"
                      placeholder="Ancho"
                      value={Number.isFinite(c.w) ? c.w : ""}
                      onChange={e => mutate(i, { w: Number(e.target.value || 0) })}
                    />
                    <input
                      type="number"
                      className="inp w-24"
                      placeholder="Largo"
                      value={Number.isFinite(c.l) ? c.l : ""}
                      onChange={e => mutate(i, { l: Number(e.target.value || 0) })}
                    />

                    {/* Preferido ocupa 2 cols para que no se corte el texto */}
                    <label className="col-span-2 flex items-center gap-2 select-none">
                      <span>Preferido</span>
                      <input
                        type="checkbox"
                        checked={!!c.preferred}
                        onChange={e => mutate(i, { preferred: e.target.checked })}
                        className="toggle"
                      />
                    </label>

                    <div className="col-span-4 flex justify-end gap-2">
                      <button className="btn btn-ghost" title="Cancelar" onClick={() => cancelEdit(i)}></button>
                      <button className="btn btn-primary" title="Guardar" onClick={() => mutate(i, { _edit: false })}></button>
                      <button className="btn btn-ghost" title="Eliminar" onClick={() => remove(i)}></button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-sm opacity-60">No hay cortes. Usá + Agregar corte.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}