import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IdeaFlowApp from "@/components/IdeaFlowApp";

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  const { data: ideas } = await supabase
    .from("ideas")
    .select("*, idea_votes(choice), profiles!ideas_created_by_fkey(full_name)")
    .order("created_at", { ascending: false });

  const initialIdeas = (ideas || []).map((idea: any) => {
    const votes = { approve: 0, reject: 0, neutral: 0 };
    for (const v of idea.idea_votes || []) votes[v.choice as keyof typeof votes]++;
    const { idea_votes, profiles, ...rest } = idea;
    return { ...rest, votes, creatorName: profiles?.full_name || "Unknown" };
  });

  return (
    <main style={{ padding: 20, minHeight: "100vh", background: "#05060a" }}>
      <IdeaFlowApp
        initialIdeas={initialIdeas}
        currentUser={{
          id: user.id,
          name: profile?.full_name || user.email || "You",
          role: profile?.role || "member",
        }}
      />
    </main>
  );
}
