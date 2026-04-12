import { cache } from "react";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

export type ProposalSection = { title: string; content: string };

export type PublicProposalPayload = {
  id: string;
  client_name: string;
  client_problem: string;
  created_at: string;
  user_id: string;
  sections: ProposalSection[];
  senderDisplayName: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** PostgREST / Postgres signals that `is_public` column is missing — treat all proposals as public. */
function isMissingIsPublicColumn(err: PostgrestError): boolean {
  const blob = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return blob.includes("is_public") || err.code === "42703" || err.code === "PGRST204";
}

export function parseProposalSections(raw: unknown): ProposalSection[] | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const sections = (obj as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return null;
  const out: ProposalSection[] = [];
  for (const s of sections) {
    if (!s || typeof s !== "object") continue;
    const title = typeof (s as ProposalSection).title === "string" ? (s as ProposalSection).title : "";
    const content = typeof (s as ProposalSection).content === "string" ? (s as ProposalSection).content : "";
    if (title && content) out.push({ title, content });
  }
  return out.length ? out : null;
}

type ProposalRow = {
  id: string;
  client_name: string;
  client_problem: string;
  content: unknown;
  created_at: string;
  user_id: string;
  is_public?: boolean | null;
};

/**
 * Loads a proposal for the public /proposal/[id] page.
 * Uses **service role** only (bypasses RLS; works in incognito with no auth cookies).
 * When `is_public` exists and is false, the proposal is hidden. If the column is missing
 * (migration not applied), all proposals are treated as public.
 */
export const fetchPublicProposalById = cache(async (id: string): Promise<PublicProposalPayload | null> => {
  if (!UUID_RE.test(id)) {
    console.error("[fetchPublicProposal] invalid proposal id (expected UUID):", id);
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "[fetchPublicProposal] missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (service role required for public proposal fetch)"
    );
    return null;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const baseColumns = "id, client_name, client_problem, content, created_at, user_id";

  let row: ProposalRow | null = null;
  let checkedIsPublic = false;

  const withPublic = await supabase
    .from("proposals")
    .select(`${baseColumns}, is_public`)
    .eq("id", id)
    .maybeSingle();

  if (withPublic.error) {
    if (isMissingIsPublicColumn(withPublic.error)) {
      console.error(
        "[fetchPublicProposal] proposals.is_public missing — retrying without column (treat all as public):",
        withPublic.error.message
      );
      const fallback = await supabase.from("proposals").select(baseColumns).eq("id", id).maybeSingle();
      if (fallback.error) {
        console.error("[fetchPublicProposal] proposals query error (fallback):", fallback.error.message, fallback.error);
        return null;
      }
      row = fallback.data as ProposalRow | null;
      checkedIsPublic = false;
    } else {
      console.error("[fetchPublicProposal] proposals query error:", withPublic.error.message, withPublic.error);
      return null;
    }
  } else {
    row = withPublic.data as ProposalRow | null;
    checkedIsPublic = true;
  }

  if (!row) {
    console.error("[fetchPublicProposal] no proposal row for id:", id);
    return null;
  }

  if (checkedIsPublic && row.is_public === false) {
    console.error("[fetchPublicProposal] proposal exists but is_public is false:", id);
    return null;
  }

  const sections = parseProposalSections(row.content);
  if (!sections?.length) {
    console.error(
      "[fetchPublicProposal] invalid or empty sections in content for id:",
      id,
      "content type:",
      row.content === null ? "null" : typeof row.content
    );
    return null;
  }

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", row.user_id)
    .maybeSingle();

  if (profErr) {
    console.error("[fetchPublicProposal] profiles lookup error (non-fatal):", profErr.message, profErr);
  }

  const displayName =
    typeof (prof as { display_name?: string } | null)?.display_name === "string"
      ? (prof as { display_name: string }).display_name.trim() || null
      : null;

  return {
    id: row.id,
    client_name: row.client_name,
    client_problem: row.client_problem,
    created_at: row.created_at,
    user_id: row.user_id,
    sections,
    senderDisplayName: displayName
  };
});

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lacore.ai").replace(/\/$/, "");
}
