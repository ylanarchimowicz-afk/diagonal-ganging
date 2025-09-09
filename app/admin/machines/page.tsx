"use client";

export default function MachinesPage() {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Máquinas</h1>
        <a href="/admin" className="btn btn-ghost gap-2"> Volver</a>
      </header>

      <div className="card bg-base-100 border">
        <div className="card-body">
          <p className="text-sm opacity-70">
            Esta pantalla fue restaurada. Si antes tenías listado y edición, lo reponemos encima,
            pero al menos no se cae el build.
          </p>
        </div>
      </div>
    </div>
  );
}