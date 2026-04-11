import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!projectId) {
    return NextResponse.json({
      offer: false,
      landing: false,
      content: false,
      leads: false,
      completedSteps: 0
    });
  }

  const [offerRes, landingRes, leadsRes] = await Promise.all([
    supabase.from("offers").select("id").eq("user_id", user.id).eq("project_id", projectId).limit(1),
    supabase.from("landing_pages").select("id").eq("user_id", user.id).eq("project_id", projectId).limit(1),
    supabase.from("leads").select("id").eq("user_id", user.id).eq("project_id", projectId).limit(1)
  ]);

  const hasOffer = (offerRes.data?.length ?? 0) > 0;
  const hasLanding = (landingRes.data?.length ?? 0) > 0;
  const hasLeads = (leadsRes.data?.length ?? 0) > 0;
  const funnelContent = hasOffer && hasLanding;

  const completedSteps = [hasOffer, hasLanding, funnelContent, hasLeads].filter(Boolean).length;

  return NextResponse.json({
    offer: hasOffer,
    landing: hasLanding,
    content: hasOffer,
    leads: hasLeads,
    completedSteps
  });
}
