import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/ideas/:id/workspace — returns the workspace auto-created for this
// idea (once it crosses 75% approval), along with its tasks and messages.
// Returns { workspace: null } if the idea hasn't been approved yet.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, idea_id, created_at")
    .eq("idea_id", params.id)
    .maybeSingle();

  if (wsError) {
    return NextResponse.json({ error: wsError.message }, { status: 500 });
  }
  if (!workspace) {
    return NextResponse.json({ workspace: null, tasks: [], messages: [], documents: [], milestones: [] });
  }

  const [{ data: tasks }, { data: messages }, { data: documents }, { data: milestones }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("*, profiles!tasks_assignee_id_fkey(full_name)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("messages")
        .select("*, profiles(full_name)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("documents")
        .select("*, profiles(full_name)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("milestones")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("sort_order", { ascending: true }),
    ]);

  return NextResponse.json({ workspace, tasks, messages, documents, milestones });
}
