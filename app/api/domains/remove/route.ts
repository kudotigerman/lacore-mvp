import { NextRequest, NextResponse } from "next/server";
import { requireUser, serviceSupabase } from "../_auth";

function normalizeDomainInput(raw: string): string {
  return raw
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
  const domain = normalizeDomainInput(raw);
  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  const service = serviceSupabase();
  if (!service) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const { data: row } = await service
    .from("custom_domains")
    .select("user_id")
    .eq("domain", domain)
    .eq("user_id", token.user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (vercelToken && projectId) {
    const encoded = encodeURIComponent(domain);
    await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains/${encoded}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${vercelToken}` }
    });
  }

  await service.from("custom_domains").delete().eq("domain", domain).eq("user_id", token.user.id);

  return NextResponse.json({ success: true });
}
