import { NextRequest, NextResponse } from "next/server";
import { serviceSupabase } from "../_auth";

/**
 * Reconciles custom_domains.verified with Vercel project domain status.
 * Call with: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: "Vercel is not configured." }, { status: 500 });
  }

  const service = serviceSupabase();
  if (!service) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const { data: rows, error: listErr } = await service
    .from("custom_domains")
    .select("id, domain");

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const list = (rows ?? []) as { id: string; domain: string }[];
  let checked = 0;
  let verifiedCount = 0;
  const errors: string[] = [];

  for (const row of list) {
    const domain = typeof row.domain === "string" ? row.domain.trim() : "";
    if (!domain) continue;
    checked += 1;
    const apex = domain.replace(/^www\./, "");
    const tryHosts = Array.from(new Set([domain, apex, `www.${apex}`]));
    let verified = false;
    try {
      for (const host of tryHosts) {
        const vercelRes = await fetch(
          `https://api.vercel.com/v10/projects/${projectId}/domains/${encodeURIComponent(host)}`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        );
        if (!vercelRes.ok) continue;
        const json = (await vercelRes.json()) as { verified?: boolean };
        if (json.verified === true) {
          verified = true;
          break;
        }
      }
      await service.from("custom_domains").update({ verified }).eq("id", row.id);
      if (verified) verifiedCount += 1;
    } catch (e) {
      errors.push(`${domain}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked,
    verifiedCount,
    errors: errors.length ? errors : undefined
  });
}
