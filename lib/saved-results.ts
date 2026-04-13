import type { SupabaseClient } from "@supabase/supabase-js";

export type SavedResultType = "pricing" | "sequence" | "outreach" | "analytics_insights";

export async function upsertSavedResult(
  supabase: SupabaseClient,
  params: {
    userId: string;
    projectId: string;
    type: SavedResultType;
    input: Record<string, unknown>;
    result: unknown;
  }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("saved_results").upsert(
    {
      user_id: params.userId,
      project_id: params.projectId,
      type: params.type,
      input: params.input,
      result: params.result,
      updated_at: new Date().toISOString()
    } as never,
    { onConflict: "user_id,project_id,type" }
  );
  return { error: error ? new Error(error.message) : null };
}

export async function fetchLatestSavedResult(
  supabase: SupabaseClient,
  params: { userId: string; projectId: string; type: SavedResultType }
): Promise<{ input: Record<string, unknown> | null; result: unknown | null }> {
  const { data, error } = await supabase
    .from("saved_results")
    .select("input, result")
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .eq("type", params.type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { input: null, result: null };
  }
  const row = data as { input?: unknown; result?: unknown };
  const input = row.input && typeof row.input === "object" && !Array.isArray(row.input) ? (row.input as Record<string, unknown>) : null;
  return { input, result: row.result ?? null };
}
