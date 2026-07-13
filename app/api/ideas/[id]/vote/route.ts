import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/ideas/:id/vote  { choice: "approve" | "reject" | "neutral" }
// The 75% approval rule + workspace auto-creation is handled by a Postgres
// trigger (see supabase/schema.sql → check_idea_approval) so this route just
// upserts the vote and lets the database do the rest.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { choice } = await req.json();
  if (!["approve", "reject", "neutral"].includes(choice)) {
    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("idea_votes")
    .upsert(
      { idea_id: params.id, user_id: user.id, choice },
      { onConflict: "idea_id,user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: idea } = await supabase
    .from("ideas")
    .select("id, title, status")
    .eq("id", params.id)
    .single();

  return NextResponse.json({ vote: data, idea });
}
