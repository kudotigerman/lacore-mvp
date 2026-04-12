import { NextRequest, NextResponse } from "next/server";
import { requireUser, serviceSupabase } from "../_auth";

function normalizeDomainInput(d: string): string {
  return d
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0]
    .replace(/^www\./, "");
}

async function fetchVerifiedFromVercel(
  vercelToken: string,
  projectId: string,
  normalized: string,
  canonicalDomain: string
): Promise<boolean> {
  const v9Res = await fetch(`https://api.vercel.com/v9/domains/${encodeURIComponent(normalized)}`, {
    headers: { Authorization: `Bearer ${vercelToken}` }
  });
  if (v9Res.ok) {
    try {
      const j = (await v9Res.json()) as { verified?: boolean };
      if (j.verified === true) return true;
    } catch {
      /* fall through */
    }
  }

  const apex = normalized.replace(/^www\./, "");
  const tryHosts = Array.from(
    new Set(
      [canonicalDomain, normalized, apex, `www.${apex}`].filter((h) => typeof h === "string" && h.length > 0)
    )
  );

  for (const host of tryHosts) {
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains/${encodeURIComponent(host)}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    if (!vercelRes.ok) continue;
    try {
      const j = (await vercelRes.json()) as { verified?: boolean };
      if (j.verified === true) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const token = await requireUser(req);
  if (!token.ok) return token.response;

  const body = (await req.json()) as { domain?: string };
  const raw = typeof body.domain === "string" ? body.domain : "";
  const normalized = normalizeDomainInput(raw);
  if (!normalized) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  const service = serviceSupabase();
  if (!service) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const candidates = [normalized, `www.${normalized}`];
  const { data: row } = await service
    .from("custom_domains")
    .select("user_id, domain")
    .eq("user_id", token.user.id)
    .in("domain", candidates)
    .maybeSingle();

  const found = row as { user_id: string; domain: string } | null;
  if (!found?.domain) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  const canonicalDomain = found.domain;

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: "Vercel is not configured." }, { status: 500 });
  }

  const verified = await fetchVerifiedFromVercel(vercelToken, projectId, normalized, canonicalDomain);

  await service
    .from("custom_domains")
    .update({ verified })
    .eq("domain", canonicalDomain)
    .eq("user_id", token.user.id);

  return NextResponse.json({ verified });
}
