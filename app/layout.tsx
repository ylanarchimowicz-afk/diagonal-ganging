/* app/layout.tsx  Root layout con estilos globales */
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagonal  Ganging / Imposición",
  description: "Calculá costos, asigná máquinas y generá imposición lista para imprimir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-screen bg-zinc-900 text-zinc-100">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </body>
    </html>
  );
}