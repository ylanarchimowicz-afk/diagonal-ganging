﻿// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // NUNCA en cliente
  return createClient(url, key, { auth: { persistSession: false } });
}