import { NextRequest, NextResponse } from "next/server";
import { requireUser, serviceSupabase } from "../_auth";

export async function POST(req: NextRequest) {
  const token = await requireUser(req);
  if (!token.ok) return token.response;

  const body = (await req.json()) as { domain?: string };
  const domain = typeof body.domain === "string" ? body.domain.toLowerCase().trim() : "";
  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  const service = serviceSupabase();
  if (!service) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const { data: row } = await service
    .from("custom_domains")
    .select("user_id, domain")
    .eq("domain", domain)
    .eq("user_id", token.user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: "Vercel is not configured." }, { status: 500 });
  }

  const encoded = encodeURIComponent(domain);
  const vercelRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/domains/${encoded}`,
    {
      headers: { Authorization: `Bearer ${vercelToken}` }
    }
  );

  const data = (await vercelRes.json()) as {
    verified?: boolean;
    verification?: unknown[];
  };

  const verified = data.verified === true;

  if (verified) {
    await service.from("custom_domains").update({ verified: true }).eq("domain", domain).eq("user_id", token.user.id);
  }

  return NextResponse.json({
    verified,
    verification: data.verification || []
  });
}
