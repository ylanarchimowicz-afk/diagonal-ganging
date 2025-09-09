import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = { title: "Diagonal — Ganging", description: "Imposición & Costeo" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0b0c10] text-[#e8edf7]">
        <header className="border-b border-white/10 bg-black/40 backdrop-blur">
          <div className="container mx-auto flex items-center justify-between py-3 px-4">
            <Link href="/" className="text-xl font-bold">Diagonal</Link>
            <nav className="flex items-center gap-4 text-sm text-white/80">
              <Link href="/jobs/new" className="hover:text-white">Nuevo Job</Link>
              <Link href="/admin" className="hover:text-white">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-white/10 py-6 text-center text-white/50 text-sm">
          © {new Date().getFullYear()} Diagonal — Ganging / Imposición
        </footer>
      </body>
    </html>
  );
}