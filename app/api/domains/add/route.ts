import { NextRequest, NextResponse } from "next/server";
import { requireUser, serviceSupabase, userOwnsLandingSlug } from "../_auth";

export async function POST(req: NextRequest) {
  const token = await requireUser(req);
  if (!token.ok) return token.response;

  const body = (await req.json()) as { domain?: string; slug?: string };
  const domainRaw = typeof body.domain === "string" ? body.domain : "";
  const slug = typeof body.slug === "string" ? body.slug : "";
  const clean = domainRaw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0];

  if (!clean || !slug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const service = serviceSupabase();
  if (!service) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const owns = await userOwnsLandingSlug(service, token.user.id, slug);
  if (!owns) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data: existingDomain } = await service
    .from("custom_domains")
    .select("user_id")
    .eq("domain", clean)
    .maybeSingle();
  const existingRow = existingDomain as { user_id: string } | null;
  if (existingRow && existingRow.user_id !== token.user.id) {
    return NextResponse.json({ error: "Domain already registered to another account." }, { status: 409 });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: "Vercel is not configured." }, { status: 500 });
  }

  const vercelRes = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: clean })
    }
  );

  const vercelData = (await vercelRes.json()) as {
    error?: { code?: string; message?: string };
    name?: string;
    id?: string;
    verification?: unknown[];
    apexName?: string;
    verified?: boolean;
  };

  const code = vercelData.error?.code;
  const already =
    code === "domain_already_in_use" ||
    (typeof vercelData.error?.message === "string" &&
      vercelData.error.message.toLowerCase().includes("already"));

  if (!vercelRes.ok && !already) {
    return NextResponse.json(
      { error: vercelData.error?.message || "Vercel error" },
      { status: 400 }
    );
  }

  const vercelDomainId =
    vercelData.id || vercelData.name || clean;

  const { error } = await service.from("custom_domains").upsert(
    {
      user_id: token.user.id,
      slug,
      domain: clean,
      verified: Boolean(vercelData.verified),
      vercel_domain_id: vercelDomainId
    },
    { onConflict: "domain" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    verification: vercelData.verification || [],
    apexName: vercelData.apexName,
    verified: vercelData.verified || false
  });
}
