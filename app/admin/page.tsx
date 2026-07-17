import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPanel from "@/components/AdminPanel";

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: myProfileRaw } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  const myProfile = myProfileRaw as { id: string; full_name: string; role: string } | null;

  if (!myProfile || !["owner", "admin"].includes(myProfile.role)) {
    redirect("/");
  }

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, created_at, idea_id, workspace_members(count)")
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: 20, minHeight: "100vh", background: "#05060a" }}>
      <AdminPanel
        currentUser={myProfile}
        initialMembers={members || []}
        initialWorkspaces={(workspaces || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          createdAt: w.created_at,
          memberCount: w.workspace_members?.[0]?.count ?? 0,
        }))}
      />
    </main>
  );
}
