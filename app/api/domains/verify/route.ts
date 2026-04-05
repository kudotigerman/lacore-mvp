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

  const tryHosts = Array.from(
    new Set(
      [canonicalDomain, normalized, `www.${normalized}`].filter((h) => typeof h === "string" && h.length > 0)
    )
  );

  let verified = false;
  let verificationList: unknown[] = [];

  for (const host of tryHosts) {
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains/${encodeURIComponent(host)}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    if (!vercelRes.ok) continue;
    let j: { verified?: boolean; verification?: unknown[] } = {};
    try {
      j = (await vercelRes.json()) as { verified?: boolean; verification?: unknown[] };
    } catch {
      continue;
    }
    if (j.verified === true) {
      verified = true;
      verificationList = j.verification || [];
      break;
    }
  }

  await service
    .from("custom_domains")
    .update({ verified })
    .eq("domain", canonicalDomain)
    .eq("user_id", token.user.id);

  return NextResponse.json({
    verified,
    verification: verificationList
  });
}
