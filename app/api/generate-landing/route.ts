import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import React from "react";
import ReactDOMServer from "react-dom/server";
import LandingPage from "@/app/components/landing/LandingPage";
import type { LandingContent } from "@/types/landing";

export const maxDuration = 120;

type LandingInput = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  userEmail: string;
  businessName?: string;
  primaryGoal?: string;
  siteVibe?: string;
};

function randomFourDigits() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function buildDocument(title: string, description: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
  </head>
  <body style="margin:0;padding:0;">
    <div id="root">${body}</div>
  </body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LandingInput;
    if (!body.offer || !body.audience || !body.userEmail) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing environment variables." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const profileDisplayName =
      typeof (profileRow as { display_name?: string } | null)?.display_name === "string"
        ? (profileRow as { display_name: string }).display_name.trim()
        : "";
    const brandNameLine =
      profileDisplayName.length > 0 ? profileDisplayName : "(not set in profile)";
    const displayName =
      profileDisplayName || body.businessName || body.userEmail.split("@")[0];
    const headlineRaw =
      typeof body.headline === "string" && body.headline.trim().length > 0
        ? body.headline.trim()
        : displayName;

    const jsonEndpoint = new URL("/api/generate-landing-json", request.url);
    const jsonResponse = await fetch(jsonEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offer: body.offer,
        audience: body.audience,
        pricing: body.pricing,
        positioning: body.positioning,
        headline: body.headline,
        displayName: brandNameLine === "(not set in profile)" ? displayName : brandNameLine,
      }),
    });

    if (!jsonResponse.ok) {
      const details = await jsonResponse.text();
      return NextResponse.json({ error: "Claude request failed.", details }, { status: 502 });
    }

    const generated = (await jsonResponse.json()) as {
      success?: boolean;
      data?: LandingContent;
      error?: string;
    };
    if (!generated.success || !generated.data) {
      return NextResponse.json(
        { error: generated.error || "Invalid JSON generation response." },
        { status: 502 }
      );
    }

    const existingPage = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailBase = body.userEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();
    const slug = existingPage.data?.slug ?? `${emailBase}-${randomFourDigits()}`;
    const rendered = ReactDOMServer.renderToString(
      React.createElement(LandingPage, { content: generated.data, slug })
    );
    const description = generated.data.subheadline || `Landing page for ${displayName}`;
    const htmlWithSlug = buildDocument(headlineRaw, description, rendered);

    const { error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        {
          user_id: user.id,
          slug,
          html_content: htmlWithSlug,
          json_content: generated.data,
          jsx_content: null,
        } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to save.", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug, success: true });
  } catch (error) {
    console.error("generate-landing error:", error);
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}
