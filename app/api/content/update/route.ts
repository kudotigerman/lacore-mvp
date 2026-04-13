import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
    error: userErr
  } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { post_id?: string; content?: string };
  try {
    body = (await req.json()) as { post_id?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const postId = typeof body.post_id === "string" ? body.post_id.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!postId || !content) {
    return NextResponse.json({ error: "post_id and content are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("generated_posts")
    .update({ content } as never)
    .eq("id", postId)
    .eq("user_id", user.id)
    .select("id, content")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  return NextResponse.json({ success: true, post: data });
}
