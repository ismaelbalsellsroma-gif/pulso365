import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // No lanzamos durante dev si faltan, pero avisamos en consola para que el
  // fallo de red en el signup no sea silencioso.
  // eslint-disable-next-line no-console
  console.warn(
    "[fichaje-saas] Supabase env vars missing. Copia .env.example → .env"
  );
}

/**
 * Cliente Supabase sin tipo genérico. Tipamos manualmente las respuestas
 * en cada página usando las interfaces en `@/types`. Más adelante podremos
 * generar los tipos automáticamente con `supabase gen types typescript`.
 */
export const supabase = createClient(
  url ?? "http://localhost:54321",
  anon ?? "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
