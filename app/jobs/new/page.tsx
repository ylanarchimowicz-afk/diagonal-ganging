"use client";
import { useState } from "react";

function Tab({children, selected, onClick}:{children:any; selected:boolean; onClick:()=>void}) {
  return (
    <button onClick={onClick}
      className={"px-3 py-2 rounded-lg border " + (selected ? "bg-white text-black border-white" : "border-white/10 text-white/80 hover:border-white/30")}>
      {children}
    </button>
  );
}
function Row({label, children}:{label:string; children:any}) {
  return <div className="grid grid-cols-3 gap-3 items-center">
    <div className="text-sm text-white/70">{label}</div>
    <div className="col-span-2 flex items-center gap-2">{children}</div>
  </div>;
}
function Dropzone({ onFiles }:{ onFiles:(f:File[])=>void }) {
  return (
    <label className="block rounded-2xl border border-dashed border-white/20 hover:border-white/40 p-8 text-center cursor-pointer">
      <input type="file" multiple accept="application/pdf" className="hidden"
             onChange={e=>onFiles(Array.from(e.target.files||[]))}/>
      <div className="text-white/80">Arrastra PDFs aqui o haz click</div>
      <div className="text-white/50 text-sm mt-1">Previews y confirmacion en el siguiente paso</div>
    </label>
  );
}

export default function NewJob() {
  const [mode, setMode] = useState<"auto"|"manual">("auto");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>("");

  async function createAndAnalyze() {
    try {
      setLoading(true);
      setLog("Creando job...");
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      const id = data.id || "job_xxx";
      setLog(`Job ${id} creado. Subiendo PDFs y disparando Analyze...`);

      // DEMO: solo simulamos el flujo
      await fetch(`/api/jobs/${id}/analyze`, { method: "POST" });
      setLog("Analyze encolado. Luego: Confirm -> Plan -> Impose.");
      alert("Listo. (Demo) Job creado y analyze encolado.");
    } catch (e) {
      console.error(e);
      alert("Error creando el job.");
    } finally {
      setLoading(false);
    }
  }

  function calcManual() {
    alert("Demo: con backend listo, hace POST /api/jobs -> /plan -> /impose");
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold">Nuevo Job</h1>

        <div className="flex gap-2">
          <Tab selected={mode==="auto"} onClick={()=>setMode("auto")}>Auto (PDF)</Tab>
          <Tab selected={mode==="manual"} onClick={()=>setMode("manual")}>Manual</Tab>
        </div>

        {mode==="auto" ? (
          <section className="space-y-4">
            <Dropzone onFiles={setFiles}/>
            {files.length>0 && (
              <div className="grid sm:grid-cols-3 gap-3">
                {files.map((f,i)=>(
                  <div key={i} className="rounded-xl bg-[#111317] p-3 border border-white/10">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-xs text-white/50">{(f.size/1024/1024).toFixed(2)} MB</div>
                  </div>
                ))}
              </div>
            )}
            <button
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold disabled:opacity-50"
              disabled={files.length===0 || loading}
              onClick={createAndAnalyze}
            >
              {loading ? "Procesando..." : "Continuar"}
            </button>
            {log && <p className="text-white/60 text-sm">{log}</p>}
          </section>
        ) : (
          <section className="space-y-3">
            <Row label="Tamaño (mm)">
              <input placeholder="ancho" className="inp"/> <span>x</span> <input placeholder="alto" className="inp"/>
            </Row>
            <Row label="Tintas"><select className="inp"><option>CMYK</option><option>B&N</option><option>Spot</option></select></Row>
            <Row label="Doble faz"><select className="inp"><option>No</option><option>Si</option></select></Row>
            <Row label="Cantidad"><input placeholder="1000" className="inp"/></Row>
            <button className="px-4 py-2 rounded-lg bg-white text-black font-semibold" onClick={calcManual}>Calcular</button>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl bg-[#111317] p-5 border border-white/10">
          <h4 className="font-semibold mb-2">Tip</h4>
          <p className="text-sm text-white/70">En Auto detectamos tamaño, BN/CMYK/Spot y bleed. Despues confirmas y listo.</p>
        </div>
      </aside>

      <style jsx>{`
        .inp { background:#0f1115; border:1px solid rgba(255,255,255,.12); padding:.5rem .6rem; border-radius:.6rem; }
      `}</style>
    </div>
  );
}