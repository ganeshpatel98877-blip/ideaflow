import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/role  { userId, role }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Only Owners/Admins can change roles" }, { status: 403 });
  }

  const { userId, role } = await req.json();
  if (!userId || !["owner", "admin", "member", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Valid userId and role are required" }, { status: 400 });
  }

  // The actual update below uses the service-role client (bypasses RLS), so
  // this route must enforce organization membership itself — otherwise an
  // Owner/Admin from one company could edit a user in a completely
  // different company.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set on the server — role changes require it." },
      { status: 500 }
    );
  }
  const admin = createServiceClient();

  const { data: target } = await admin.from("profiles").select("role, organization_id").eq("id", userId).single();
  if (!target || target.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: "That user isn't in your organization" }, { status: 403 });
  }

  // Admins can promote/demote members and viewers, but only an Owner can
  // grant Owner access or change another Owner's role — keeps a single
  // source of ultimate control.
  if (profile.role !== "owner") {
    if (role === "owner") {
      return NextResponse.json({ error: "Only an Owner can grant Owner access" }, { status: 403 });
    }
    if (target.role === "owner") {
      return NextResponse.json({ error: "Only an Owner can change another Owner's role" }, { status: 403 });
    }
  }

  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ userId, role });
}
