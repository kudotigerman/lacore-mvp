import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectIdParam = searchParams.get("projectId");

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let resolvedProjectId = projectIdParam?.trim() || null;
  if (!resolvedProjectId) {
    const { data: firstProject } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    resolvedProjectId = (firstProject as { id?: string } | null)?.id ?? null;
  }

  if (!resolvedProjectId) {
    return NextResponse.json({
      offer: false,
      landing: false,
      content: false,
      leads: false,
      completedSteps: 0,
      landingViewsTotal: 0,
      leadsTotalCount: 0,
      hasWonLead: false
    });
  }

  const [offerRes, landingRes, leadsRes, contentCountRes, landingViewsRes, leadsCountRes, wonRes] =
    await Promise.all([
      supabase.from("offers").select("id").eq("user_id", user.id).eq("project_id", resolvedProjectId).limit(1),
      supabase
        .from("landing_pages")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_id", resolvedProjectId)
        .limit(1)
        .maybeSingle(),
      supabase.from("leads").select("id").eq("user_id", user.id).eq("project_id", resolvedProjectId).limit(1),
      supabase
        .from("credit_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "generate_post"),
      supabase.from("landing_pages").select("views").eq("user_id", user.id).eq("project_id", resolvedProjectId),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("project_id", resolvedProjectId),
      supabase
        .from("leads")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_id", resolvedProjectId)
        .eq("status", "won")
        .limit(1)
    ]);

  const hasOffer = (offerRes.data?.length ?? 0) > 0;
  const hasLanding = landingRes.data != null && !landingRes.error;
  const hasLeads = (leadsRes.data?.length ?? 0) > 0;
  const hasContent = (contentCountRes.count ?? 0) > 0;
  const completedSteps = [hasOffer, hasLanding, hasContent].filter(Boolean).length;

  const viewRows = (landingViewsRes.data ?? []) as { views: number | null }[];
  const landingViewsTotal = viewRows.reduce((a, r) => a + (Number(r.views) || 0), 0);
  const leadsTotalCount = leadsCountRes.count ?? 0;
  const hasWonLead = (wonRes.data?.length ?? 0) > 0;

  return NextResponse.json({
    offer: hasOffer,
    landing: hasLanding,
    content: hasContent,
    leads: hasLeads,
    completedSteps,
    landingViewsTotal,
    leadsTotalCount,
    hasWonLead
  });
}
