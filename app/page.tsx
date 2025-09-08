export default function Home() {
  return (
    <main style={{padding:24, fontFamily:'system-ui'}}>
      <h1>Diagonal — Ganging / Imposición (Starter)</h1>
      <ol>
        <li>Admin → Cargar <code>Máquinas</code>, <code>Cortes</code>, <code>Materiales</code></li>
        <li>Crear Job (Auto o Manual)</li>
        <li>Analyze → Confirm → Plan → Impose → Exports</li>
      </ol>
      <p>Endpoints mock listos en <code>/api</code>.</p>
    </main>
  );
}
