import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notifyMentions } from "@/lib/mentions";
import { NextRequest, NextResponse } from "next/server";

// GET /api/ideas/:id/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("idea_comments")
    .select("*, profiles(full_name)")
    .eq("idea_id", params.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/ideas/:id/comments  { body }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("idea_comments")
    .insert({ idea_id: params.id, user_id: user.id, body })
    .select("*, profiles(full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: idea } = await supabase.from("ideas").select("title, created_by").eq("id", params.id).single();
    const authorName = data.profiles?.full_name || "Someone";
    const admin = createServiceClient();

    // Notify the idea's creator that someone commented (skip if they're
    // commenting on their own idea).
    if (idea && idea.created_by !== user.id) {
      await admin.from("notifications").insert({
        user_id: idea.created_by,
        type: "comment_added",
        body: `${authorName} commented on "${idea.title}"`,
        link: `/`,
      });
    }

    // Separately notify anyone @mentioned in the comment body.
    await notifyMentions({
      admin,
      body,
      authorId: user.id,
      authorName,
      excludeUserIds: idea?.created_by ? [idea.created_by] : [],
      notifBody: (name) => `${name} mentioned you in a comment on "${idea?.title}"`,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
