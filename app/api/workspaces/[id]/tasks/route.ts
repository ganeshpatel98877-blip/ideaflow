import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workspaces/:id/tasks
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, profiles!tasks_assignee_id_fkey(full_name, avatar_url)")
    .eq("workspace_id", params.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/workspaces/:id/tasks  { title, assignee_id?, priority?, status? }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  if (!body?.title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: params.id,
      title: body.title,
      assignee_id: body.assignee_id ?? user.id,
      priority: body.priority ?? "medium",
      status: body.status ?? "todo",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/workspaces/:id/tasks  { taskId, status }  — used by the drag-and-drop board
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { taskId, status } = await req.json();
  if (!taskId || !status) {
    return NextResponse.json({ error: "taskId and status are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("workspace_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
