"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Rocket, ArrowLeft, UserPlus, Users, FolderKanban, Loader2, Check, X, Shield,
} from "lucide-react";

const ROLES = ["owner", "admin", "member", "viewer"];
const roleLabel = (r) => r[0].toUpperCase() + r.slice(1);

function RoleBadge({ role }) {
  const colors = {
    owner: "#7c6fff",
    admin: "#4b9bff",
    member: "#3ac98c",
    viewer: "#8b91a3",
  };
  return (
    <span className="ap-role-badge" style={{ color: colors[role], borderColor: colors[role] }}>
      {roleLabel(role)}
    </span>
  );
}

function MemberRow({ member, isMe, canEdit, onChangeRole }) {
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState(member.role);

  const save = async (newRole) => {
    setSaving(true);
    const ok = await onChangeRole(member.id, newRole);
    setSaving(false);
    if (ok) setRole(newRole);
  };

  return (
    <div className="ap-row">
      <div className="ap-avatar">{member.full_name?.[0]?.toUpperCase() || "?"}</div>
      <div className="ap-row-main">
        <div className="ap-row-name">
          {member.full_name} {isMe && <span className="ap-you">(you)</span>}
        </div>
        <div className="ap-row-sub">
          Joined {new Date(member.created_at).toLocaleDateString()}
        </div>
      </div>
      {canEdit && !isMe ? (
        <div className="ap-role-select-wrap">
          {saving ? (
            <Loader2 size={14} className="if-spin" />
          ) : (
            <select value={role} onChange={(e) => save(e.target.value)} className="ap-role-select">
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <RoleBadge role={role} />
      )}
    </div>
  );
}

function InviteForm({ onInvite }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await onInvite(email.trim(), role);
    setLoading(false);
    setResult(res);
    if (res.ok) setEmail("");
  };

  return (
    <form onSubmit={submit} className="ap-invite-form">
      <input
        type="email"
        required
        placeholder="teammate@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="ap-input"
      />
      <select value={role} onChange={(e) => setRole(e.target.value)} className="ap-role-select">
        {ROLES.filter((r) => r !== "owner").map((r) => (
          <option key={r} value={r}>{roleLabel(r)}</option>
        ))}
      </select>
      <button type="submit" className="ap-btn-primary" disabled={loading}>
        {loading ? <Loader2 size={14} className="if-spin" /> : <UserPlus size={14} />}
        Invite
      </button>
      {result && (
        <div className={"ap-invite-result" + (result.ok ? " ok" : " err")}>
          {result.ok ? <Check size={13} /> : <X size={13} />}
          {result.message}
        </div>
      )}
    </form>
  );
}

export default function AdminPanel({ currentUser, organizationName, initialMembers, initialWorkspaces }) {
  const [members, setMembers] = useState(initialMembers);

  const changeRole = async (userId, role) => {
    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not change role");
        return false;
      }
      setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));
      return true;
    } catch {
      alert("Network error changing role");
      return false;
    }
  };

  const invite = async (email, role) => {
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, message: data.error || "Invite failed" };
      return { ok: true, message: `Invite sent to ${email}` };
    } catch {
      return { ok: false, message: "Network error sending invite" };
    }
  };

  const canEdit = ["owner", "admin"].includes(currentUser.role);

  return (
    <div className="ap-root">
      <style>{`
        .ap-root {
          --bg: #0c0e14; --panel: #12151e; --panel-border: #1f2330; --text: #eef0f5;
          --muted: #8b91a3; --accent: #7c6fff; --accent-soft: rgba(124,111,255,0.14);
          --accent-text: #c9c3ff; --sunken: #0a0c12;
          font-family: 'Inter', -apple-system, sans-serif;
          color: var(--text); max-width: 900px; margin: 0 auto;
        }
        .ap-topbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
        .ap-back { display:flex; align-items:center; gap:6px; color:var(--muted); text-decoration:none; font-size:13px; }
        .ap-back:hover { color:var(--text); }
        .ap-title-row { display:flex; align-items:center; gap:10px; }
        .ap-title-row h1 { font-size:22px; margin:0; }
        .ap-org-name { font-size:12px; color:var(--muted); margin-top:2px; }
        .ap-logo-mark { width:30px; height:30px; border-radius:9px; background:linear-gradient(135deg,#7c6fff,#4b3fce); display:flex; align-items:center; justify-content:center; }
        .ap-panel { background:var(--panel); border:1px solid var(--panel-border); border-radius:12px; padding:20px; margin-bottom:18px; }
        .ap-panel-header { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
        .ap-panel-header h2 { font-size:15px; margin:0; font-weight:600; }
        .ap-invite-form { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .ap-input { flex:1; min-width:220px; background:var(--sunken); border:1px solid var(--panel-border); border-radius:8px; padding:9px 12px; color:var(--text); font-size:13px; outline:none; font-family:inherit; }
        .ap-role-select { background:var(--sunken); border:1px solid var(--panel-border); border-radius:8px; padding:9px 10px; color:var(--text); font-size:13px; font-family:inherit; }
        .ap-btn-primary { display:flex; align-items:center; gap:6px; background:var(--accent); color:#fff; border:none; padding:9px 14px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
        .ap-btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .ap-invite-result { display:flex; align-items:center; gap:6px; font-size:12px; width:100%; margin-top:4px; }
        .ap-invite-result.ok { color:#3ac98c; }
        .ap-invite-result.err { color:#ef5b6b; }
        .ap-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--panel-border); }
        .ap-row:last-child { border-bottom:none; }
        .ap-avatar { width:34px; height:34px; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
        .ap-row-main { flex:1; min-width:0; }
        .ap-row-name { font-size:13.5px; font-weight:600; }
        .ap-you { color:var(--muted); font-weight:400; font-size:12px; }
        .ap-row-sub { font-size:11.5px; color:var(--muted); }
        .ap-role-badge { font-size:11px; border:1px solid; padding:3px 9px; border-radius:6px; font-weight:600; }
        .ap-workspace-row { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--panel-border); }
        .ap-workspace-row:last-child { border-bottom:none; }
        .ap-workspace-name { font-size:13.5px; font-weight:600; }
        .ap-workspace-meta { font-size:11.5px; color:var(--muted); }
        .ap-empty { font-size:12.5px; color:var(--muted); }
        .if-spin { animation: ap-spin 1s linear infinite; }
        @keyframes ap-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ap-topbar">
        <div className="ap-title-row">
          <div className="ap-logo-mark"><Shield size={16} color="#fff" /></div>
          <div>
            <h1>Admin Panel</h1>
            <div className="ap-org-name">{organizationName}</div>
          </div>
        </div>
        <Link href="/" className="ap-back"><ArrowLeft size={14} /> Back to app</Link>
      </div>

      {canEdit && (
        <div className="ap-panel">
          <div className="ap-panel-header"><UserPlus size={15} /><h2>Invite a teammate</h2></div>
          <InviteForm onInvite={invite} />
        </div>
      )}

      <div className="ap-panel">
        <div className="ap-panel-header"><Users size={15} /><h2>Team members ({members.length})</h2></div>
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            isMe={m.id === currentUser.id}
            canEdit={canEdit}
            onChangeRole={changeRole}
          />
        ))}
        {members.length === 0 && <p className="ap-empty">No team members yet.</p>}
      </div>

      <div className="ap-panel">
        <div className="ap-panel-header"><FolderKanban size={15} /><h2>Workspaces ({initialWorkspaces.length})</h2></div>
        {initialWorkspaces.map((w) => (
          <div className="ap-workspace-row" key={w.id}>
            <div>
              <div className="ap-workspace-name">{w.name}</div>
              <div className="ap-workspace-meta">
                {w.memberCount} member{w.memberCount === 1 ? "" : "s"} &middot; created {new Date(w.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        {initialWorkspaces.length === 0 && <p className="ap-empty">No workspaces yet — approve an idea to create one.</p>}
      </div>
    </div>
  );
}
