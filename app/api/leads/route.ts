/*
Run in Supabase SQL editor to create the leads table:

CREATE TABLE leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  slug text NOT NULL,
  name text,
  email text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      message?: string;
      slug?: string;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!slug || !email) {
      return NextResponse.json({ error: "Missing slug or email." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: page, error: pageError } = await supabase
      .from("landing_pages")
      .select("user_id")
      .eq("slug", slug)
      .maybeSingle();

    if (pageError) {
      return NextResponse.json({ error: pageError.message }, { status: 500 });
    }
    if (!page?.user_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase.from("leads").insert({
      user_id: page.user_id,
      slug,
      name: name || null,
      email,
      message: message || null,
      created_at: new Date().toISOString()
    } as never);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
