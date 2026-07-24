import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notifyMentions } from "@/lib/mentions";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workspaces/:id/messages
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*, profiles(full_name)")
    .eq("workspace_id", params.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/workspaces/:id/messages  { body }
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
    .from("messages")
    .insert({ workspace_id: params.id, user_id: user.id, body })
    .select("*, profiles(full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createServiceClient();
    const authorName = data.profiles?.full_name || "Someone";
    const { data: workspace } = await admin
      .from("workspaces")
      .select("name, ideas(organization_id)")
      .eq("id", params.id)
      .single();

    await notifyMentions({
      admin,
      body,
      authorId: user.id,
      authorName,
      organizationId: (workspace as any)?.ideas?.organization_id,
      notifBody: (name) => `${name} mentioned you in ${workspace?.name || "a workspace"} chat`,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
