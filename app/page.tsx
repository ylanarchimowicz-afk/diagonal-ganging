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
        <h1 className="text-3xl font-bold">Ganging / Imposición</h1>
        <p className="text-white/70">Calculá costos, asigná máquinas (brackets) y generá imposición lista para imprimir.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card href="/jobs/new" title="Crear Job" desc="Auto (PDF) o Manual. Previews, confirmación y cálculo." />
          <Card href="/admin"   title="Admin" desc="Máquinas (priceBrackets), Cortes, Materiales." />
        </div>

        <ul className="text-white/60 text-sm list-disc pl-4">
          <li>Auto: detecta tamaño, B&N/CMYK/Spot, bleed estimado</li>
          <li>Asignación: máquina + formato + corte por costo</li>
          <li>Imposición: PDF + CSV guillotina</li>
        </ul>
      </section>

      <aside className="space-y-4">
        <Panel title="Estado">
          <p className="text-white/70">Endpoints mock listos en <code className="text-white">/api</code>.</p>
        </Panel>
        <Panel title="Siguiente">
          <ol className="list-decimal pl-5 text-white/70">
            <li>Cargar Máquinas, Cortes, Materiales</li>
            <li>Subir PDFs o cargar tamaños</li>
            <li>Calcular → Imponer</li>
          </ol>
        </Panel>
      </aside>
    </div>
  );
}