import { createBrowserClient } from "@supabase/ssr";

// See lib/supabase/server.ts for why the <Database> generic is omitted here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
