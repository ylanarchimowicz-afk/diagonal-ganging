import Link from "next/link";
function Card({href,title,desc}:{href:string;title:string;desc:string}) {
  return <Link href={href} className="rounded-2xl bg-[#111317] p-5 border border-white/10 hover:border-white/20 block">
    <h3 className="font-semibold">{title}</h3>
    <p className="text-white/60 text-sm mt-1">{desc}</p>
  </Link>;
}
export default function Admin() {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      <Card href="/admin/machines"  title="Máquinas"   desc="Tramos (priceBrackets)"/>
      <Card href="/admin/cuts"      title="Cortes"     desc="Cortes preferidos por papel"/>
      <Card href="/admin/materials" title="Materiales" desc="CSV de materias primas"/>
    </div>
  );
}