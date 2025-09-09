"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, RotateCcw, Upload, Trash2, Plus } from "lucide-react";

/** ===== Tipos de UI (interno) ===== */
type Size = { w:number; l:number; supplier?:string; usdPerTon?:number|null; preferred?:boolean };
type Gram = { grams:number[]; // chips de gramajes que comparten tamaños/costos
              sizes: Size[];
              indexHint?: number|null; // priceIndex del JSON externo (pista, no costo)
            };
type MatType = { name:string; grams: Gram[]; _edit?:boolean; _snapshot?:MatType };

/** Helpers */
const toNum = (s:string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };
const clone = <T,>(x:T)=> JSON.parse(JSON.stringify(x)) as T;

/** === Mapea JSON externo (array plano)  UI MatType[]  ===
 *  Entrada (ejemplo): [{ id, name, priceIndex, paperWeight, materialSizes:[{factorySize:{wid,len},stocked}] }, ...]
 */
function mapExternalMaterials(json:any): MatType[] {
  if (!Array.isArray(json)) return [];
  // Agrupo por name  luego por paperWeight
  const byName: Record<string, Record<number, { indexHint:number|null; sizes: Size[] }>> = {};
  for (const row of json) {
    if (!row || typeof row!=="object") continue;
    const name = String(row.name ?? "Sin nombre");
    const weight = Number(row.paperWeight ?? 0);
    const priceIndex = (row.priceIndex!=null) ? Number(row.priceIndex) : null;
    const sizesSrc: any[] = Array.isArray(row.materialSizes) ? row.materialSizes : [];

    if (!byName[name]) byName[name] = {};
    if (!byName[name][weight]) byName[name][weight] = { indexHint: priceIndex, sizes: [] };

    for (const s of sizesSrc) {
      const w = Number(s?.factorySize?.wid ?? 0);
      const l = Number(s?.factorySize?.len ?? 0);
      const preferred = Boolean(s?.stocked);
      if (w>0 && l>0) byName[name][weight].sizes.push({ w, l, preferred, usdPerTon: null, supplier: "" });
    }
  }

  const result: MatType[] = [];
  for (const name of Object.keys(byName)) {
    const grams: Gram[] = [];
    for (const weightStr of Object.keys(byName[name])) {
      const weight = Number(weightStr);
      const entry = byName[name][weight];
      grams.push({
        grams: [weight],
        sizes: entry.sizes,
        indexHint: entry.indexHint ?? null,
      });
    }
    // ordeno por gramaje
    grams.sort((a,b)=> (a.grams[0]??0)-(b.grams[0]??0));
    result.push({ name, grams });
  }
  // ordeno tipos alfabéticamente
  result.sort((a,b)=> a.name.localeCompare(b.name));
  return result;
}

export default function MaterialsAdmin(){
  const [items, setItems] = useState<MatType[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  // Carga actual desde API (si existe)
  useEffect(()=>{(async()=>{
    try{
      const r = await fetch("/api/admin/materials", { cache:"no-store" });
      if (!r.ok) return;
      const j = await r.json();
      // intentamos entender si ya viene en nuestro formato
      const arr = Array.isArray(j?.items) ? j.items : [];
      if (arr.length){
        setItems(arr as MatType[]);
      }
    }catch{}
  })()},[]);

  function addType(){
    setItems(p=>[ { name:"Nuevo tipo", grams:[{ grams:[80], sizes:[] }], _edit:true }, ...p ]);
    setDirty(true);
  }
  function startEdit(ix:number){ setItems(p=>p.map((t,i)=> i===ix ? ({...t, _edit:true, _snapshot:clone(t)}) : t)); }
  function cancelEdit(ix:number){ setItems(p=>p.map((t,i)=> i===ix ? (t._snapshot ? {...t._snapshot, _edit:false, _snapshot:undefined} : {...t, _edit:false}) : t)); }
  function saveEdit(ix:number){ setItems(p=>p.map((t,i)=> i===ix ? ({...t, _edit:false, _snapshot:undefined}) : t)); }

  function rmType(ix:number){
    if(!confirm("¿Eliminar este tipo de papel y todos sus gramajes?")) return;
    setItems(p=>p.filter((_,i)=>i!==ix)); setDirty(true);
  }

  function addGram(ix:number){
    setItems(p=>p.map((t,i)=> i===ix ? ({...t, grams:[{ grams:[80], sizes:[] }, ...t.grams] }) : t));
    setDirty(true);
  }
  function rmGram(ix:number, gx:number){
    setItems(p=>p.map((t,i)=> i===ix ? ({...t, grams:t.grams.filter((_,j)=>j!==gx)}) : t)); setDirty(true);
  }
  function mutType(ix:number, patch:Partial<MatType>){
    setItems(p=>p.map((t,i)=> i===ix ? ({...t, ...patch}) : t)); setDirty(true);
  }
  function mutGram(ix:number, gx:number, patch:Partial<Gram>){
    setItems(p=>p.map((t,i)=> i===ix ? ({...t, grams: t.grams.map((g,j)=> j===gx ? ({...g, ...patch}) : g) }) : t));
    setDirty(true);
  }
  function mutSize(ix:number, gx:number, sx:number, patch:Partial<Size>){
    setItems(p=>p.map((t,i)=> i===ix ? ({
      ...t,
      grams: t.grams.map((g,j)=> j===gx ? ({
        ...g,
        sizes: g.sizes.map((s,k)=> k===sx ? ({...s, ...patch}) : s)
      }) : g)
    }) : t));
    setDirty(true);
  }
  function addSize(ix:number, gx:number){
    setItems(p=>p.map((t,i)=> i===ix ? ({
      ...t, grams: t.grams.map((g,j)=> j===gx ? ({...g, sizes:[...g.sizes, { w:0, l:0, preferred:false, usdPerTon:null, supplier:"" }]}) : g)
    }) : t));
    setDirty(true);
  }
  function rmSize(ix:number, gx:number, sx:number){
    setItems(p=>p.map((t,i)=> i===ix ? ({
      ...t, grams: t.grams.map((g,j)=> j===gx ? ({...g, sizes:g.sizes.filter((_,k)=>k!==sx)}) : g)
    }) : t));
    setDirty(true);
  }

  async function saveAll(){
    setMsg("Guardando");
    try{
      const payload = { items: items.map(({_edit,_snapshot, ...t})=>t) };
      const r = await fetch("/api/admin/materials", { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      if (!r.ok){ const j = await r.json().catch(()=>null); throw new Error(j?.error || "falló el guardado"); }
      setDirty(false); setMsg("Guardado OK");
    }catch(e:any){ setMsg("No se pudo guardar: "+(e?.message||"error")); }
  }

  /** Importa tanto nuestro formato documentado como el JSON externo plano */
  async function onImportFile(file:File){
    try{
      const txt = await file.text();
      const j = JSON.parse(txt);
      let imported: MatType[] = [];
      if (Array.isArray(j) && j.length && j[0]?.paperWeight !== undefined && j[0]?.materialSizes !== undefined){
        // JSON EXTERNO (array plano) => agrupar
        imported = mapExternalMaterials(j);
      } else if (Array.isArray(j?.items)) {
        // nuestro contenedor items
        imported = j.items;
      } else if (Array.isArray(j)) {
        // quizá ya sea MatType[] crudo
        imported = j;
      }
      if (!imported.length) throw new Error("Estructura no reconocida");
      setItems(imported.map(t=>({...t, _edit:false, _snapshot:undefined})));
      setDirty(true); setMsg(`Importados ${imported.length} tipos (sin guardar)`);
    }catch(e:any){
      alert("No se pudo importar el JSON: " + (e?.message || "error"));
    }
  }

  const exportHref = useMemo(()=> {
    const blob = new Blob([JSON.stringify({ items }, null, 2)], { type:"application/json" });
    return URL.createObjectURL(blob);
  }, [items]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Materiales</h1>
        <input type="file" accept="application/json" onChange={e=>{ const f=e.currentTarget.files?.[0]; if(f) onImportFile(f); e.currentTarget.value=""; }} />
        <button className="px-3 py-2 rounded bg-white text-black" onClick={addType}>Agregar tipo</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20 disabled:opacity-50" onClick={saveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="materials.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty && <span className="text-amber-300 text-sm">Cambios sin guardar</span>}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((t,ix)=>(
          <div key={ix} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <input className="inp w-full text-lg font-semibold min-w-0" value={t.name} onChange={e=>mutType(ix,{name:e.target.value})} disabled={!t._edit} />
              {!t._edit ? (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Editar" onClick={()=>startEdit(ix)}><Pencil size={18}/></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEdit(ix)}><RotateCcw size={18}/></button>
                  <button className="btn-ok" title="Guardar" onClick={()=>saveEdit(ix)}><Upload size={18}/></button>
                  <button className="btn-danger" title="Eliminar tipo" onClick={()=>rmType(ix)}><Trash2 size={18}/></button>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-4">
              {/* Gramajes */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80 font-semibold">Gramajes</span>
                {t._edit && <button className="btn-ok flex items-center gap-1" onClick={()=>addGram(ix)}><Plus size={16}/> Añadir g</button>}
              </div>

              {t.grams.map((g,gx)=>(
                <div key={gx} className="rounded-lg border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {/* chips de gramajes */}
                    <input
                      className="inp w-32"
                      value={g.grams.join(", ")}
                      onChange={e=>mutGram(ix,gx,{ grams: e.target.value.split(",").map(s=>toNum(s.trim())).filter(n=>n>0) })}
                      disabled={!t._edit}
                      placeholder="80, 90"
                    />
                    <span className="text-xs text-white/50">Índice: {g.indexHint ?? "-"}</span>
                    {t._edit && <button className="btn-danger ml-auto" title="Borrar gramaje" onClick={()=>rmGram(ix,gx)}><Trash2 size={16}/></button>}
                  </div>

                  {/* Lista de tamaños/costos */}
                  <div className="space-y-2">
                    {g.sizes.map((s,sx)=>(
                      <div key={sx} className="grid grid-cols-12 gap-2">
                        <input className="inp col-span-3" type="number" value={s.w} onChange={e=>mutSize(ix,gx,sx,{w:toNum(e.target.value)})} disabled={!t._edit} placeholder="ancho" />
                        <input className="inp col-span-3" type="number" value={s.l} onChange={e=>mutSize(ix,gx,sx,{l:toNum(e.target.value)})} disabled={!t._edit} placeholder="largo" />
                        <input className="inp col-span-3" value={s.supplier ?? ""} onChange={e=>mutSize(ix,gx,sx,{supplier:e.target.value})} disabled={!t._edit} placeholder="proveedor" />
                        <input className="inp col-span-2" type="number" inputMode="decimal" value={s.usdPerTon ?? ""} onChange={e=>mutSize(ix,gx,sx,{usdPerTon: e.target.value===""?null: Number(e.target.value)})} disabled={!t._edit} placeholder="USD/Ton" />
                        <label className="col-span-1 flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={!!s.preferred} onChange={e=>mutSize(ix,gx,sx,{preferred:e.target.checked})} disabled={!t._edit} />
                          Pref.
                        </label>
                        {t._edit && <button className="btn-danger col-span-12 sm:col-span-12 justify-self-end" onClick={()=>rmSize(ix,gx,sx)}><Trash2 size={16}/></button>}
                      </div>
                    ))}
                  </div>

                  {t._edit && <div className="mt-2">
                    <button className="btn-ok" onClick={()=>addSize(ix,gx)}><Plus size={16}/> Añadir tamaño</button>
                  </div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==== utilidades de estilo mínimas (re-uso de Tailwind) ==== */