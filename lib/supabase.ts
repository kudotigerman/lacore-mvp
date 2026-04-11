import { createClient } from "@/lib/supabase/client";

/** Browser singleton via `createBrowserClient` (see `lib/supabase/client.ts`). */
export function getSupabaseClient() {
  return createClient();
}
