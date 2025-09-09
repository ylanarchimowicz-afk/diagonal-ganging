/* app/admin/materials/page.tsx  UI en tarjetas: Tipo  Gramaje  Tamaños */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, RotateCcw, Pencil } from "lucide-react";

type SizeRow = { length_mm: number; width_mm: number; provider?: string; cost_per_ton_usd?: number };
type WeightCard = { gsm: number; sizes: SizeRow[]; _edit?: boolean; _snapshot?: WeightCard };
type MaterialType = { name: string; weights: WeightCard[]; _edit?: boolean; _snapshot?: MaterialType };

const toNum = (s:string)=>{ const n=Number(s); return Number.isFinite(n)?n:0; };

export default function MaterialsAdmin(){
  const [items, setItems] = useState<MaterialType[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  // Carga inicial desde API si existe; si no, quedamos en blanco
  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch("/api/admin/materials",{cache:"no-store"});
      if(!r.ok) return;
      const j = await r.json();
      if(Array.isArray(j.items)) setItems(normalizeIn(j.items));
    }catch{}
  })(); },[]);

  function normalizeIn(raw:any[]):MaterialType[] {
    // Acepta formato agrupado (ya correcto) o flat {name,gsm,length_mm,width_mm,provider,cost_per_ton_usd}
    const isGrouped = (o:any)=> Array.isArray(o?.weights);
    if(raw.every(isGrouped)) {
      return raw.map((t:any)=>({
        name: String(t.name||""),
        weights: (t.weights||[]).map((w:any)=>({
          gsm: Number(w.gsm||0),
          sizes: (w.sizes||[]).map((s:any)=>({
            length_mm: Number(s.length_mm||0),
            width_mm: Number(s.width_mm||0),
            provider: s.provider||"",
            cost_per_ton_usd: s.cost_per_ton_usd!=null? Number(s.cost_per_ton_usd): undefined
          })),
          _edit:false
        })),
        _edit:false
      }));
    }
    // Agrupar flat
    const map = new Map<string, Map<number, SizeRow[]>>();
    for(const r of raw){
      const name = String(r.name||"");
      const gsm  = Number(r.gsm||0);
      const sz: SizeRow = {
        length_mm: Number(r.length_mm||r.len||r.L||0),
        width_mm:  Number(r.width_mm ||r.wid||r.W||0),
        provider: r.provider||r.proveedor||"",
        cost_per_ton_usd: r.cost_per_ton_usd!=null? Number(r.cost_per_ton_usd): undefined
      };
      if(!map.has(name)) map.set(name,new Map());
      const g = map.get(name)!;
      if(!g.has(gsm)) g.set(gsm,[]);
      g.get(gsm)!.push(sz);
    }
    const out:MaterialType[]=[];
    for(const [name, m] of map.entries()){
      const weights:WeightCard[]=[];
      for(const [gsm, sizes] of m.entries()){
        weights.push({ gsm, sizes, _edit:false });
      }
      out.push({ name, weights, _edit:false });
    }
    return out;
  }

  function setDirtyItems(next:MaterialType[]){ setItems(next); setDirty(true); }

  // Acciones de tipo
  function addType(){ setDirtyItems([{ name:"Nuevo tipo", weights:[], _edit:true }, ...items]); }
  function startEditType(i:number){ setDirtyItems(items.map((t,ix)=> ix===i?({...t,_edit:true,_snapshot:structuredClone(t)}):t)); }
  function cancelEditType(i:number){ setDirtyItems(items.map((t,ix)=> ix===i?(t._snapshot?({...t._snapshot,_edit:false,_snapshot:undefined}):({...t,_edit:false})):t)); }
  function saveEditType(i:number){ setDirtyItems(items.map((t,ix)=> ix===i?({...t,_edit:false,_snapshot:undefined}):t)); }
  function delType(i:number){ if(!confirm("¿Eliminar tipo de papel?"))return; setDirtyItems(items.filter((_,ix)=>ix!==i)); }
  function mutType(i:number, patch:Partial<MaterialType>){ setDirtyItems(items.map((t,ix)=> ix===i?({...t,...patch}):t)); }

  // Acciones de gramaje
  function addWeight(i:number){ const t=items[i]; mutType(i,{weights:[{gsm:0,sizes:[],_edit:true},...(t.weights||[])]}); }
  function startEditWeight(i:number, wi:number){ const t=items[i]; const next=(t.weights||[]).map((w,wx)=> wx===wi?({...w,_edit:true,_snapshot:structuredClone(w)}):w); mutType(i,{weights:next}); }
  function cancelEditWeight(i:number, wi:number){ const t=items[i]; const next=(t.weights||[]).map((w,wx)=> wx===wi?(w._snapshot?({...w._snapshot,_edit:false,_snapshot:undefined}):({...w,_edit:false})):w); mutType(i,{weights:next}); }
  function saveEditWeight(i:number, wi:number){ const t=items[i]; const next=(t.weights||[]).map((w,wx)=> wx===wi?({...w,_edit:false,_snapshot:undefined}):w); mutType(i,{weights:next}); }
  function delWeight(i:number, wi:number){ if(!confirm("¿Eliminar gramaje?"))return; const t=items[i]; mutType(i,{weights:(t.weights||[]).filter((_,wx)=>wx!==wi)}); }
  function mutWeight(i:number, wi:number, patch:Partial<WeightCard>){ const t=items[i]; const next=(t.weights||[]).map((w,wx)=> wx===wi?({...w,...patch}):w); mutType(i,{weights:next}); }

  // Acciones de tamaño
  function addSize(i:number, wi:number){ const t=items[i]; const w=t.weights[wi]; mutWeight(i,wi,{sizes:[{length_mm:0,width_mm:0,provider:"",cost_per_ton_usd:undefined},...(w.sizes||[])]}); }
  function delSize(i:number, wi:number, si:number){ const t=items[i]; const w=t.weights[wi]; mutWeight(i,wi,{sizes:(w.sizes||[]).filter((_,sx)=>sx!==si)}); }
  function mutSize(i:number, wi:number, si:number, patch:Partial<SizeRow>){
    const t=items[i]; const w=t.weights[wi]; const list=[...(w.sizes||[])];
    list[si]={...(list[si]||{length_mm:0,width_mm:0}),...patch};
    mutWeight(i,wi,{sizes:list});
  }

  // Guardar / Exportar / Importar
  async function onSaveAll(){
    setMsg("Guardando");
    try{
      const payload = items.map(({_edit,_snapshot,...r})=>({
        ...r,
        weights: r.weights.map(({_edit:__,_snapshot:___,...w})=>w)
      }));
      const r = await fetch("/api/admin/materials",{method:"PUT",headers:{'Content-Type':'application/json'},body:JSON.stringify({items:payload})});
      const j = await r.json();
      if(!r.ok) throw new Error(j?.error||"Fallo al guardar");
      setItems(normalizeIn(j.items||payload).map(t=>({...t,_edit:false})));
      setDirty(false); setMsg(`Guardado OK (${(j.items||payload).length})`);
    }catch(err:any){
      setMsg("No se pudo guardar en DB: "+(err.message||"error desconocido")+" (igual podés exportar JSON)");
    }
  }
  const exportHref = useMemo(()=> {
    const payload = items.map(({_edit,_snapshot,...r})=>({
      ...r,
      weights: r.weights.map(({_edit:__,_snapshot:___,...w})=>w)
    }));
    return URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  },[items]);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const raw = JSON.parse(await f.text());
      const arr = Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:[]);
      const norm = normalizeIn(arr);
      if(!norm.length) { alert("JSON de materiales inválido."); return; }
      setItems(norm); setDirty(true);
      setMsg(`Importados ${norm.length} tipos (sin guardar)`);
    }catch{ alert("JSON inválido."); }
    e.currentTarget.value="";
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Materiales</h1>
        <input type="file" accept="application/json" onChange={onImportFile}/>
        <button className="px-3 py-2 rounded bg-white text-black" onClick={addType}>Agregar tipo</button>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20" onClick={onSaveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="materials.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        {dirty && <span className="text-amber-300 text-sm">Cambios sin guardar</span>}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      {/* TIPOS (tarjetas madre) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((t,i)=>(
          <div key={i} className="rounded-xl border border-white/15 bg-black/40 p-4">
            <div className="flex items-center justify-between">
              {!t._edit ? (
                <div className="text-lg font-semibold">{t.name}</div>
              ) : (
                <input className="inp text-lg font-semibold" value={t.name} onChange={e=>mutType(i,{name:e.target.value})}/>
              )}
              {!t._edit
                ? <button className="btn-ghost" title="Editar" onClick={()=>startEditType(i)}><Pencil size={16}/></button>
                : <div className="flex gap-2">
                    <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEditType(i)}><RotateCcw size={16}/></button>
                    <button className="btn-ok" title="Guardar" onClick={()=>saveEditType(i)}><Upload size={16}/></button>
                    <button className="btn-danger" title="Eliminar tipo" onClick={()=>delType(i)}><Trash2 size={16}/></button>
                  </div>}
            </div>

            {/* WEIGHTS */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80 font-semibold">Gramajes</span>
                {t._edit && <button className="btn-ok" onClick={()=>addWeight(i)}><Plus size={14}/> Agregar gramaje</button>}
              </div>

              <div className="space-y-3">
                {(t.weights||[]).map((w,wi)=>(
                  <div key={wi} className="rounded-lg border border-white/15 bg-black/30 p-3">
                    <div className="flex items-center justify-between">
                      {!w._edit
                        ? <div className="font-medium">{w.gsm} g</div>
                        : <div className="flex items-center gap-2"><span className="text-sm text-white/70">Gramaje</span><input className="inp w-28" type="number" value={w.gsm} onChange={e=>mutWeight(i,wi,{gsm:toNum(e.target.value)})}/><span>g</span></div>}
                      {!w._edit
                        ? <button className="btn-ghost" title="Editar gramaje" onClick={()=>startEditWeight(i,wi)}><Pencil size={14}/></button>
                        : <div className="flex gap-2">
                            <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEditWeight(i,wi)}><RotateCcw size={14}/></button>
                            <button className="btn-ok" title="Guardar" onClick={()=>saveEditWeight(i,wi)}><Upload size={14}/></button>
                            <button className="btn-danger" title="Eliminar gramaje" onClick={()=>delWeight(i,wi)}><Trash2 size={14}/></button>
                          </div>}
                    </div>

                    {/* SIZES */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">Tamaños</span>
                        {w._edit && <button className="btn-ok" onClick={()=>addSize(i,wi)}><Plus size={12}/> Añadir tamaño</button>}
                      </div>

                      <div className="mt-2 space-y-2">
                        {(w.sizes||[]).map((s,si)=>(
                          <div key={si} className="rounded-md border border-black/60 bg-white text-black p-2">
                            {!w._edit ? (
                              <div className="grid grid-cols-4 gap-2 text-sm">
                                <div>{s.length_mm}  {s.width_mm} mm</div>
                                <div>Proveedor: <b>{s.provider||"-"}</b></div>
                                <div>USD/Ton: <b>{s.cost_per_ton_usd ?? "-"}</b></div>
                                <div></div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                                <input className="inp" type="number" value={s.length_mm} onChange={e=>mutSize(i,wi,si,{length_mm:toNum(e.target.value)})} placeholder="L"/>
                                <input className="inp" type="number" value={s.width_mm}  onChange={e=>mutSize(i,wi,si,{width_mm:toNum(e.target.value)})}  placeholder="W"/>
                                <input className="inp" value={s.provider||""} onChange={e=>mutSize(i,wi,si,{provider:e.target.value})} placeholder="Proveedor"/>
                                <div className="flex items-center gap-2"><span className="text-xs">USD/Ton</span><input className="inp w-28" type="number" value={s.cost_per_ton_usd ?? ""} onChange={e=>mutSize(i,wi,si,{cost_per_ton_usd:toNum(e.target.value)})}/></div>
                                <div className="flex justify-end"><button className="btn-danger" onClick={()=>delSize(i,wi,si)}><Trash2 size={14}/></button></div>
                              </div>
                            )}
                          </div>
                        ))}
                        {(w.sizes||[]).length===0 && <div className="text-xs text-white/60">Sin tamaños</div>}
                      </div>
                    </div>
                  </div>
                ))}
                {(t.weights||[]).length===0 && <div className="text-xs text-white/60">Sin gramajes</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .inp{background:#fff;color:#000;border:1px solid #111;padding:.45rem .6rem;border-radius:.55rem;}
        .btn-ghost{padding:.35rem .5rem;border:1px solid rgba(255,255,255,.35);border-radius:.55rem;background:transparent;}
        .btn-danger{padding:.35rem .5rem;border:1px solid #dc2626;background:#fee2e2;color:#991b1b;border-radius:.55rem;}
        .btn-ok{padding:.35rem .5rem;border:1px solid #16a34a;background:#dcfce7;color:#14532d;border-radius:.55rem;}
      `}</style>
    </div>
  );
}