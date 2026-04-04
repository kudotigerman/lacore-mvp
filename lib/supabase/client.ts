import { getSupabaseClient } from "@/lib/supabase";

/** Browser Supabase client (same singleton as getSupabaseClient). */
export function createClient() {
  return getSupabaseClient();
}
