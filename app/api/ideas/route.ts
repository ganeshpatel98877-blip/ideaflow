import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/ideas — list all ideas with vote tallies
export async function GET() {
  const supabase = createClient();

  const { data: ideas, error } = await supabase
    .from("ideas")
    .select("*, idea_votes(choice)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withTallies = ideas.map((idea: any) => {
    const votes = { approve: 0, reject: 0, neutral: 0 };
    for (const v of idea.idea_votes || []) votes[v.choice as keyof typeof votes]++;
    const total = votes.approve + votes.reject + votes.neutral;
    const approvalPct = total ? Math.round((votes.approve / total) * 100) : 0;
    const { idea_votes, ...rest } = idea;
    return { ...rest, votes, approvalPct };
  });

  return NextResponse.json(withTallies);
}

// POST /api/ideas — create a new idea (must be signed in)
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  if (!body?.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      title: body.title,
      problem: body.problem ?? null,
      description: body.description ?? null,
      category: body.category ?? "General",
      priority: body.priority ?? "Medium",
      tags: body.tags ?? [],
      created_by: user.id,
      organization_id: (myProfile as any)?.organization_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget notification for the team (kept simple: notify the creator only here;
  // extend this to fan out to all workspace/team members as needed).
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "idea_created",
    body: `You created a new idea — ${data.title}`,
  });

  return NextResponse.json(data, { status: 201 });
}
