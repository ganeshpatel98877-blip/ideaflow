import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/invite  { email, role }
// Only Owners/Admins can invite. Uses the service_role key server-side to
// call Supabase's admin invite API, which sends the user a real "you've
// been invited" email with a sign-up link.
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
    return NextResponse.json({ error: "Only Owners/Admins can invite members" }, { status: 403 });
  }

  const { email, role } = await req.json();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set on the server — invites require it." },
      { status: 500 }
    );
  }

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    // organization_id tells the new-user trigger to join this company
    // instead of creating a brand-new one for the invitee.
    data: { invited_role: role || "member", organization_id: (profile as any).organization_id },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If they already have a profile (rare — re-invite case), set their role now.
  if (data?.user?.id && role) {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }

  return NextResponse.json({ invited: email }, { status: 201 });
}
