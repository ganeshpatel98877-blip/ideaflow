import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/workspaces/:id/milestones  { milestoneId, completed }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { milestoneId, completed } = await req.json();
  if (!milestoneId || typeof completed !== "boolean") {
    return NextResponse.json({ error: "milestoneId and completed are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("milestones")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", milestoneId)
    .eq("workspace_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify every workspace member when a milestone is newly completed —
  // this is the one event in the app that fans out to the whole team
  // rather than a single person.
  if (completed && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createServiceClient();
    const { data: workspace } = await admin.from("workspaces").select("name").eq("id", params.id).single();
    const { data: members } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", params.id);

    if (members?.length) {
      const rows = members
        .filter((m: any) => m.user_id !== user.id)
        .map((m: any) => ({
          user_id: m.user_id,
          type: "milestone_completed",
          body: `Milestone "${data.name}" reached in ${workspace?.name || "your workspace"}! 🎉`,
          link: `/`,
        }));
      if (rows.length) await admin.from("notifications").insert(rows);
    }
  }

  return NextResponse.json(data);
}
