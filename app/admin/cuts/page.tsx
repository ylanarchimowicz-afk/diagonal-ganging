"use client";

import React, { useMemo, useState } from "react";

type CutSize = { w: number; l: number; preferred?: boolean };
type CutGroup = { paper_w: number; paper_l: number; sizes: CutSize[] };

function dlFile(name: string, data: any) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = name;
  a.click();
}

export default function CutsPage() {
  const [groups, setGroups] = useState<CutGroup[]>([]);
  const [dirty, setDirty]   = useState(false);
  const totalCuts = useMemo(()=> groups.reduce((acc,g)=>acc + g.sizes.length, 0), [groups]);

  function addGroup() {
    setGroups(g=>[...g, { paper_w: 0, paper_l: 0, sizes: [] }]);
    setDirty(true);
  }
  function rmGroup(i:number){
    setGroups(g => g.filter((_,ix)=>ix!==i));
    setDirty(true);
  }
  function mutGroup(i:number, patch:Partial<CutGroup>) {
    setGroups(g => g.map((x,ix)=> ix===i ? { ...x, ...patch } : x));
    setDirty(true);
  }
  function addSize(gi:number){
    setGroups(g => g.map((x,ix)=> ix===gi ? { ...x, sizes:[...x.sizes, {w:0,l:0,preferred:false}] } : x));
    setDirty(true);
  }
  function rmSize(gi:number, si:number){
    setGroups(g => g.map((x,ix)=> ix===gi ? { ...x, sizes: x.sizes.filter((_,jx)=>jx!==si) } : x));
    setDirty(true);
  }
  function mutSize(gi:number, si:number, patch:Partial<CutSize>){
    setGroups(g => g.map((x,ix)=> {
      if (ix!==gi) return x;
      return { ...x, sizes: x.sizes.map((s,jx)=> jx===si ? { ...s, ...patch } : s) };
    }));
    setDirty(true);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      // Acepta array de grupos o { groups: [...] }
      const arr: CutGroup[] = Array.isArray(raw) ? raw : Array.isArray(raw?.groups) ? raw.groups : [];
      if (!arr.length) throw new Error("Estructura no reconocida");
      setGroups(arr);
      setDirty(true);
    } catch (err:any) {
      alert("No se pudo importar el JSON: " + (err?.message ?? "error"));
    } finally {
      e.currentTarget.value = "";
    }
  }

  function onExport() {
    dlFile("cuts.json", groups);
    setDirty(false);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <a href="/admin" className="btn btn-ghost gap-2">Volver</a>
        <h1 className="text-2xl font-bold">Cortes</h1>
        <input type="file" accept="application/json" onChange={onImportFile}/>
        <button className="btn" onClick={addGroup}>Agregar grupo</button>
        <button className="btn" onClick={onExport}>Exportar JSON</button>
        {dirty && <span className="text-yellow-400">Cambios sin guardar</span>}
        <span className="opacity-70 ml-auto">{groups.length} grupos  {totalCuts} cortes</span>
      </header>

      {/* Grupos */}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g, gi)=>(
          <section key={gi} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm w-40">Ancho del papel</label>
              <input
                className="input input-bordered w-28"
                type="number" value={g.paper_w}
                onChange={e=>mutGroup(gi,{paper_w:Number(e.target.value)})}
              />
              <label className="text-sm w-40">Largo del papel</label>
              <input
                className="input input-bordered w-28"
                type="number" value={g.paper_l}
                onChange={e=>mutGroup(gi,{paper_l:Number(e.target.value)})}
              />
              <div className="ml-auto flex gap-2">
                <button className="btn btn-success btn-sm" onClick={()=>addSize(gi)}>+ Añadir</button>
                <button className="btn btn-error btn-sm" onClick={()=>rmGroup(gi)}>Eliminar grupo</button>
              </div>
            </div>

            {/* Cortes */}
            <div className="space-y-2">
              {g.sizes.map((s, si)=>(
                <div key={si} className="flex items-center gap-3 rounded-md border p-2">
                  {/* Ancho y Largo: más chicos para dejar lugar al toggle */}
                  <input
                    className="input input-bordered w-24"
                    placeholder="Ancho"
                    type="number" value={s.w}
                    onChange={e=>mutSize(gi,si,{w:Number(e.target.value)})}
                  />
                  <input
                    className="input input-bordered w-24"
                    placeholder="Largo"
                    type="number" value={s.l}
                    onChange={e=>mutSize(gi,si,{l:Number(e.target.value)})}
                  />

                  {/* Toggle preferido: ocupa más espacio y no se corta el texto */}
                  <div className="flex items-center gap-2 grow">
                    <span className="text-sm whitespace-nowrap">Preferido</span>
                    <label className="inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!s.preferred}
                        onChange={e=>mutSize(gi,si,{preferred:e.target.checked})}
                      />
                      <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 relative transition-all">
                        <div className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-all peer-checked:translate-x-6"></div>
                      </div>
                    </label>
                  </div>

                  <button className="btn btn-outline btn-error btn-sm" onClick={()=>rmSize(gi,si)}>Borrar</button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}