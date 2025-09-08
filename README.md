# Diagonal — Ganging/Imposición (Starter)

## Usar rápido
1) **Duplicá** `.env.example` → `.env.local` y completá SUPABASE_*.
2) `npm i && npm run dev` (Vercel: Importar repo y agregar envs).
3) Pegarle a los endpoints:
   - `POST /api/jobs` → crea job
   - `POST /api/jobs/:id/analyze` → analiza (202)
   - `POST /api/jobs/:id/confirm` → confirma
   - `POST /api/jobs/:id/plan` → planifica (202)
   - `POST /api/jobs/:id/impose` → impone (202)
   - `GET  /api/jobs/:id` → estado
   - `GET  /api/jobs/:id/exports` → URLs firmadas

> Esto es un esqueleto: conectá Supabase (DB/Storage) y Edge Functions para los procesos pesados.
