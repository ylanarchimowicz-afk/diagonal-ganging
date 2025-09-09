/* app/admin/cuts/page.tsx */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, RotateCcw, Pencil } from "lucide-react";

type Size = { length: number; width: number; preferred?: boolean };
type CutGroup = { forPaperSize: Size; sheetSizes: Size[]; _edit?: boolean; _snapshot?: CutGroup };
const isNum = (v:any)=> typeof v==="number" && Number.isFinite(v);
const toNum = (s:string)=> { const n=Number(s); return Number.isFinite(n)?n:0; };

export default function CutsAdmin(){
  const [items, setItems] = useState<CutGroup[]>([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ (async()=>{
    try{ const r=await fetch("/api/admin/cuts",{cache:"no-store"}); if(!r.ok) return;
      const j=await r.json(); if(Array.isArray(j.items)) setItems(j.items.map((g:any)=>({...g,_edit:false})));
    }catch{}
  })(); },[]);

  function setDirtyItems(next:CutGroup[]){ setItems(next); setDirty(true); }
  function onAddGroup(){ setDirtyItems([{forPaperSize:{length:0,width:0},sheetSizes:[],_edit:true},...items]); }
  function startEdit(i:number){ setDirtyItems(items.map((g,ix)=>ix===i?({...g,_edit:true,_snapshot:structuredClone(g)}):g)); }
  function cancelEdit(i:number){ setDirtyItems(items.map((g,ix)=>ix===i?(g._snapshot?({...g._snapshot,_edit:false,_snapshot:undefined}):({...g,_edit:false})):g)); }
  function saveEdit(i:number){ setDirtyItems(items.map((g,ix)=>ix===i?({...g,_edit:false,_snapshot:undefined}):g)); }
  function delGroup(i:number){ if(!confirm("¿Eliminar grupo?"))return; setDirtyItems(items.filter((_,ix)=>ix!==i)); }
  function mut(i:number, patch:Partial<CutGroup>){ setDirtyItems(items.map((g,ix)=>ix===i?({...g,...patch}):g)); }
  function mutSize(i:number, si:number, patch:Partial<Size>){
    const list=[...(items[i].sheetSizes||[])]; list[si]={...(list[si]||{length:0,width:0,preferred:false}),...patch};
    mut(i,{sheetSizes:list});
  }
  function addSheet(i:number){ const g=items[i]; mut(i,{sheetSizes:[{length:0,width:0,preferred:false},...(g.sheetSizes||[])]}); }
  function delSheet(i:number, si:number){ const g=items[i]; mut(i,{sheetSizes:(g.sheetSizes||[]).filter((_,idx)=>idx!==si)}); }

  async function onSaveAll(){
    setMsg("Guardando");
    try{
      const payload=items.map(({_edit,_snapshot,...rest})=>rest);
      const r=await fetch("/api/admin/cuts",{method:"PUT",headers:{'Content-Type':'application/json'},body:JSON.stringify({items:payload})});
      const j=await r.json(); if(!r.ok) throw new Error(j?.error||"Fallo al guardar");
      setItems((j.items||[]).map((g:any)=>({...g,_edit:false}))); setDirty(false); setMsg(`Guardado OK (${j.items?.length??0})`);
    }catch(err:any){ setMsg("No se pudo guardar en DB: "+(err.message||"error desconocido")+" (igual podés exportar JSON)"); }
  }

  const exportHref=useMemo(()=> URL.createObjectURL(new Blob([JSON.stringify(items.map(({_edit,_snapshot,...r})=>r),null,2)],{type:'application/json'})),[items]);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const raw=JSON.parse(await f.text());
      const arr=Array.isArray(raw)?raw:(Array.isArray(raw?.items)?raw.items:[]);
      const ok=(g:any)=>isNum(g?.forPaperSize?.length)&&isNum(g?.forPaperSize?.width)&&Array.isArray(g?.sheetSizes);
      const cleaned=arr.filter(ok).map((g:any)=>({forPaperSize:{length:g.forPaperSize.length,width:g.forPaperSize.width},sheetSizes:g.sheetSizes.map((s:any)=>({length:s.length,width:s.width,preferred:!!s.preferred})),_edit:false}));
      if(!cleaned.length){ alert("JSON de cortes inválido."); return; }
      setItems(cleaned); setDirty(true); setMsg(`Importados ${cleaned.length} grupos (sin guardar)`);
    }catch{ alert("JSON inválido."); }
    e.currentTarget.value="";
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Cortes</h1>
        <input type="file" accept="application/json" onChange={onImportFile}/>
        <button className="px-3 py-2 rounded bg-white/10 border border-white/20" onClick={onSaveAll} disabled={!dirty}>Guardar</button>
        <a href={exportHref} download="cuts.export.json" className="px-3 py-2 rounded bg-white/10 border border-white/20">Exportar JSON</a>
        <button className="px-3 py-2 rounded bg-white text-black" onClick={onAddGroup}>Agregar grupo</button>
        {dirty && <span className="text-amber-300 text-sm">Cambios sin guardar</span>}
        {msg && <span className="text-white/60 text-sm">{msg}</span>}
      </header>

      {/* 3 por fila en desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((g,i)=>(
          <div key={i} className="rounded-lg border border-white/15 bg-black/40 p-3">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">Papel {g.forPaperSize.length}  {g.forPaperSize.width} mm</div>
              {!g._edit
                ? <button className="btn-ghost" title="Editar" onClick={()=>startEdit(i)}><Pencil size={16}/></button>
                : <div className="flex gap-2">
                    <button className="btn-ghost" title="Cancelar" onClick={()=>cancelEdit(i)}><RotateCcw size={16}/></button>
                    <button className="btn-ok" title="Guardar" onClick={()=>saveEdit(i)}><Upload size={16}/></button>
                    <button className="btn-danger" title="Eliminar grupo" onClick={()=>delGroup(i)}><Trash2 size={16}/></button>
                  </div>}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs">
                <span className="text-white/70">Ancho del papel</span>
                <input className="inp" type="number" value={g.forPaperSize.length ?? ""} onChange={e=>mut(i,{forPaperSize:{...g.forPaperSize,length:toNum(e.target.value)}})} disabled={!g._edit}/>
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-white/70">Largo del papel</span>
                <input className="inp" type="number" value={g.forPaperSize.width ?? ""} onChange={e=>mut(i,{forPaperSize:{...g.forPaperSize,width:toNum(e.target.value)}})} disabled={!g._edit}/>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-white/80 font-semibold">Cortes</span>
              {g._edit && <button className="btn-ok" onClick={()=>addSheet(i)}><Plus size={14}/> Añadir</button>}
            </div>

            <div className="mt-2 space-y-2">
              {(g.sheetSizes||[]).map((s,si)=>(
                <div key={si} className="rounded-md border border-black/50 bg-white text-black px-2 py-1 flex items-center justify-between">
                  {!g._edit ? (
                    <span className="text-sm">{s.length}  {s.width} {s.preferred ? "(Preferido)":""}</span>
                  ) : (
                    <div className="w-full grid grid-cols-5 gap-2 items-center">
                      <input className="inp" type="number" value={s.length ?? ""} onChange={e=>mutSize(i,si,{length:toNum(e.target.value)})} placeholder="Ancho"/>
                      <input className="inp" type="number" value={s.width ?? ""} onChange={e=>mutSize(i,si,{width:toNum(e.target.value)})} placeholder="Largo"/>
                      <button className={`px-2 py-1 rounded text-sm ${s.preferred?'bg-green-600 text-white':'bg-gray-200 text-gray-900'}`} onClick={()=>mutSize(i,si,{preferred:!s.preferred})}>{s.preferred?'ON':'OFF'}</button>
                      <div className="col-span-2 flex justify-end">
                        <button className="btn-danger" onClick={()=>delSheet(i,si)}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(g.sheetSizes||[]).length===0 && <div className="text-xs text-white/60">Sin tamaños</div>}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .inp{background:#fff;color:#000;border:1px solid #111;padding:.35rem .5rem;border-radius:.5rem;}
        .inp:disabled{opacity:.75;cursor:not-allowed;}
        .btn-ghost{padding:.3rem .45rem;border:1px solid rgba(255,255,255,.35);border-radius:.5rem;background:transparent;}
        .btn-danger{padding:.3rem .45rem;border:1px solid #dc2626;background:#fee2e2;color:#991b1b;border-radius:.5rem;}
        .btn-ok{padding:.3rem .45rem;border:1px solid #16a34a;background:#dcfce7;color:#14532d;border-radius:.5rem;}
      `}</style>
    </div>
  );
}