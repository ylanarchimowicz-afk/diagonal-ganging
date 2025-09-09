import Link from "next/link";

function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block rounded-2xl bg-[#111317] p-5 border border-white/10 hover:border-white/20 transition">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-white/60 text-sm mt-1">{desc}</p>
    </Link>
  );
}

function Panel({ title, children }: any) {
  return (
    <div className="rounded-2xl bg-[#111317] p-5 border border-white/10">
      <h4 className="font-semibold mb-2">{title}</h4>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <section className="col-span-2 space-y-4">
        <h1 className="text-3xl font-bold">Ganging / ImposiciÃ³n</h1>
        <p className="text-white/70">CalculÃ¡ costos, asignÃ¡ mÃ¡quinas (brackets) y generÃ¡ imposiciÃ³n lista para imprimir.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card href="/jobs/new" title="Crear Job" desc="Auto (PDF) o Manual. Previews, confirmaciÃ³n y cÃ¡lculo." />
          <Card href="/admin"   title="Admin" desc="MÃ¡quinas (priceBrackets), Cortes, Materiales." />
        </div>

        <ul className="text-white/60 text-sm list-disc pl-4">
          <li>Auto: detecta tamaÃ±o, B&N/CMYK/Spot, bleed estimado</li>
          <li>AsignaciÃ³n: mÃ¡quina + formato + corte por costo</li>
          <li>ImposiciÃ³n: PDF + CSV guillotina</li>
        </ul>
      </section>

      <aside className="space-y-4">
        <Panel title="Estado">
          <p className="text-white/70">Endpoints mock listos en <code className="text-white">/api</code>.</p>
        </Panel>
        <Panel title="Siguiente">
          <ol className="list-decimal pl-5 text-white/70">
            <li>Cargar MÃ¡quinas, Cortes, Materiales</li>
            <li>Subir PDFs o cargar tamaÃ±os</li>
            <li>Calcular â†’ Imponer</li>
          </ol>
        </Panel>
      </aside>
    </div>
  );
}