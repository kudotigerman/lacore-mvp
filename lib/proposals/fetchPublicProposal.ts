import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

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

export function parseProposalSections(raw: unknown): ProposalSection[] | null {
  if (!raw || typeof raw !== "object") return null;
  const sections = (raw as { sections?: unknown }).sections;
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

/**
 * Loads a proposal for the public /proposal/[id] page.
 * Uses service role to join profile display_name; only rows with is_public = true are returned.
 * Cached per request (metadata + page share one fetch).
 */
export const fetchPublicProposalById = cache(async (id: string): Promise<PublicProposalPayload | null> => {
  if (!UUID_RE.test(id)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: row, error } = await supabase
    .from("proposals")
    .select("id, client_name, client_problem, content, created_at, user_id, is_public")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return null;

  const r = row as {
    id: string;
    client_name: string;
    client_problem: string;
    content: unknown;
    created_at: string;
    user_id: string;
    is_public: boolean | null;
  };

  if (r.is_public === false) return null;

  const sections = parseProposalSections(r.content);
  if (!sections?.length) return null;

  const { data: prof } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", r.user_id)
    .maybeSingle();

  const displayName =
    typeof (prof as { display_name?: string } | null)?.display_name === "string"
      ? (prof as { display_name: string }).display_name.trim() || null
      : null;

  return {
    id: r.id,
    client_name: r.client_name,
    client_problem: r.client_problem,
    created_at: r.created_at,
    user_id: r.user_id,
    sections,
    senderDisplayName: displayName
  };
});

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lacore.ai").replace(/\/$/, "");
}
