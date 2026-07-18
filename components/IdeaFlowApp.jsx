"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, Lightbulb, FolderKanban, Sparkles, Plus, Search,
  ThumbsUp, ThumbsDown, MinusCircle, MessageSquare, Users, CheckCircle2,
  Clock, TrendingUp, X, Loader2, ChevronRight, Bell, Rocket, Target,
  DollarSign, Cpu, AlertTriangle, Map, Megaphone, ArrowRight, Send,
  Flag, Circle, CheckCircle, FileText, Upload, Download, BarChart3,
  Trophy, Activity, Sun, Moon, LogOut, Shield
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { createClient } from "@/lib/supabase/client";

const TASK_COLUMNS = ["To Do", "In Progress", "Review", "Completed"];
const DOC_FOLDERS = ["Business Plans", "Pitch Decks", "Research", "Design", "Technical"];

// --- DB <-> UI mapping helpers ------------------------------------------
// The UI works in Title Case ("Approved", "To Do", "High") for readability;
// the database uses snake_case enums ("approved", "todo", "high"). These
// helpers translate between the two so real Supabase rows drop straight
// into the same components used for the offline demo/seed data.

const mapDbIdea = (row) => ({
  id: row.id,
  title: row.title,
  problem: row.problem || "",
  description: row.description || "",
  category: row.category || "General",
  creator: row.creatorName || "Unknown",
  votes: row.votes || { approve: 0, reject: 0, neutral: 0 },
  status: row.status === "approved" ? "Approved" : row.status === "rejected" ? "Rejected" : "Discussion",
  comments: [],
});

const dbStatusToUi = { todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Completed" };
const uiStatusToDb = { "To Do": "todo", "In Progress": "in_progress", "Review": "review", "Completed": "completed" };
const dbPriorityToUi = { low: "Low", medium: "Medium", high: "High" };

const mapDbTask = (row) => ({
  id: row.id,
  title: row.title,
  assignee: row.profiles?.full_name || "Unassigned",
  priority: dbPriorityToUi[row.priority] || "Medium",
  status: dbStatusToUi[row.status] || "To Do",
});

const mapDbMessage = (row) => ({
  id: row.id,
  author: row.profiles?.full_name || "Someone",
  text: row.body,
});

const mapDbComment = (row) => ({
  id: row.id,
  author: row.profiles?.full_name || "Someone",
  text: row.body,
});

const seedWorkspaceData = {
  2: {
    tasks: [
      { id: 1, title: "Define MVP feature set", assignee: "Priya Shah", priority: "High", status: "Completed" },
      { id: 2, title: "Design listing + chat wireframes", assignee: "Ganesh Rao", priority: "High", status: "In Progress" },
      { id: 3, title: "Set up Supabase auth (college email)", assignee: "Aman Verma", priority: "Medium", status: "In Progress" },
      { id: 4, title: "Build listing upload flow", assignee: "Priya Shah", priority: "Medium", status: "To Do" },
      { id: 5, title: "Draft community guidelines doc", assignee: "Ganesh Rao", priority: "Low", status: "Review" },
      { id: 6, title: "Set up campus verification check", assignee: "Aman Verma", priority: "High", status: "To Do" },
    ],
    messages: [
      { id: 1, author: "Priya Shah", text: "Kicked off the workspace — let's get the MVP scope locked by Friday." },
      { id: 2, author: "Ganesh Rao", text: "Wireframes for listing + chat are in progress, sharing tomorrow." },
      { id: 3, author: "Aman Verma", text: "Starting on college-email verification for signup." },
    ],
    documents: [
      { id: 1, name: "Campus Marketplace - Business Plan.pdf", folder: "Business Plans", uploadedBy: "Priya Shah", size: "1.2 MB", version: 2 },
      { id: 2, name: "Seed Pitch Deck v3.pptx", folder: "Pitch Decks", uploadedBy: "Ganesh Rao", size: "4.8 MB", version: 3 },
      { id: 3, name: "Campus Survey Results.xlsx", folder: "Research", uploadedBy: "Aman Verma", size: "640 KB", version: 1 },
      { id: 4, name: "Listing Flow Wireframes.fig", folder: "Design", uploadedBy: "Ganesh Rao", size: "2.1 MB", version: 4 },
    ],
  },
};

const seedIdeas = [
  {
    id: 1,
    title: "AI Resume Builder",
    problem: "Job seekers struggle to write resumes that pass ATS filters.",
    description:
      "A tool that generates ATS-optimized resumes using AI, tailored to each job description.",
    category: "AI / SaaS",
    creator: "Aman Verma",
    votes: { approve: 14, reject: 2, neutral: 1 },
    status: "Discussion",
    comments: [
      { id: 1, author: "Ganesh Rao", text: "Love this — huge market in India alone." },
      { id: 2, author: "Priya Shah", text: "We should validate pricing before building." },
    ],
  },
  {
    id: 2,
    title: "Campus Marketplace",
    problem: "Students have no trusted way to buy/sell used items on campus.",
    description:
      "A hyperlocal marketplace app restricted to verified college email addresses.",
    category: "Marketplace",
    creator: "Priya Shah",
    votes: { approve: 19, reject: 1, neutral: 0 },
    status: "Approved",
    comments: [{ id: 1, author: "Aman Verma", text: "This basically builds itself, let's ship an MVP." }],
  },
  {
    id: 3,
    title: "Freelance Escrow Tool",
    problem: "Freelancers get stiffed on payments from international clients.",
    description:
      "A lightweight escrow + milestone payment tool built for freelancers and small agencies.",
    category: "Fintech",
    creator: "Ganesh Rao",
    votes: { approve: 6, reject: 5, neutral: 3 },
    status: "Discussion",
    comments: [],
  },
];

const statusColor = (status) =>
  status === "Approved" ? "var(--approve)" : status === "Rejected" ? "var(--reject)" : "var(--accent)";

function approvalPct(votes) {
  const total = votes.approve + votes.reject + votes.neutral;
  if (total === 0) return 0;
  return Math.round((votes.approve / total) * 100);
}

function Sidebar({ tab, setTab, theme, onToggleTheme, currentUser, onSignOut }) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "ideas", label: "Ideas", icon: Lightbulb },
    { key: "workspaces", label: "Workspaces", icon: FolderKanban },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];
  const name = currentUser?.name || "Guest";
  const role = currentUser?.role ? currentUser.role[0].toUpperCase() + currentUser.role.slice(1) : "Demo";
  return (
    <div className="if-sidebar">
      <div className="if-logo">
        <div className="if-logo-mark"><Rocket size={18} /></div>
        <span>IdeaFlow</span>
      </div>
      <nav className="if-nav">
        {items.map((it) => (
          <button
            key={it.key}
            className={"if-nav-item" + (tab === it.key ? " active" : "")}
            onClick={() => setTab(it.key)}
          >
            <it.icon size={17} />
            <span>{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="if-sidebar-footer">
        {currentUser && ["owner", "admin"].includes(currentUser.role) && (
          <a href="/admin" className="if-theme-toggle" style={{ textDecoration: "none" }}>
            <Shield size={14} />
            <span>Admin Panel</span>
          </a>
        )}
        <button className="if-theme-toggle" onClick={onToggleTheme}>
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <div className="if-user-chip">
          <div className="if-avatar">{name[0]?.toUpperCase()}</div>
          <div>
            <div className="if-user-name">{name}</div>
            <div className="if-user-role">{role}</div>
          </div>
          {currentUser && (
            <button className="if-icon-btn" onClick={onSignOut} title="Sign out">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Topbar({ title, onNewIdea, ideas = [], workspaceData = {}, onGoToIdea, onGoToWorkspace, notifications = [], onOpenNotifications }) {
  const [query, setQuery] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setQuery(""); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const q = query.trim().toLowerCase();
  let results = { ideas: [], tasks: [], docs: [] };
  if (q.length > 0) {
    results.ideas = ideas.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 4);
    Object.entries(workspaceData).forEach(([wsId, ws]) => {
      (ws.tasks || []).forEach((t) => {
        if (t.title.toLowerCase().includes(q)) results.tasks.push({ ...t, workspaceId: Number(wsId) });
      });
      (ws.documents || []).forEach((d) => {
        if (d.name.toLowerCase().includes(q)) results.docs.push({ ...d, workspaceId: Number(wsId) });
      });
    });
    results.tasks = results.tasks.slice(0, 4);
    results.docs = results.docs.slice(0, 4);
  }
  const hasResults = results.ideas.length || results.tasks.length || results.docs.length;

  return (
    <div className="if-topbar">
      <div>
        <div className="if-eyebrow">Startup Execution OS</div>
        <h1 className="if-title">{title}</h1>
      </div>
      <div className="if-topbar-actions">
        <div className="if-search-wrap" ref={wrapRef}>
          <div className="if-search">
            <Search size={15} />
            <input
              placeholder="Search ideas, tasks, docs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && <button className="if-search-clear" onClick={() => setQuery("")}><X size={13} /></button>}
          </div>
          {q.length > 0 && (
            <div className="if-search-dropdown">
              {!hasResults && <div className="if-search-empty">No results for &quot;{query}&quot;</div>}
              {results.ideas.length > 0 && (
                <div className="if-search-group">
                  <div className="if-search-group-label">Ideas</div>
                  {results.ideas.map((i) => (
                    <button key={"i" + i.id} className="if-search-row" onClick={() => { onGoToIdea && onGoToIdea(i.id); setQuery(""); }}>
                      <Lightbulb size={13} /> {i.title}
                    </button>
                  ))}
                </div>
              )}
              {results.tasks.length > 0 && (
                <div className="if-search-group">
                  <div className="if-search-group-label">Tasks</div>
                  {results.tasks.map((t) => (
                    <button key={"t" + t.id + t.workspaceId} className="if-search-row" onClick={() => { onGoToWorkspace && onGoToWorkspace(t.workspaceId); setQuery(""); }}>
                      <CheckCircle2 size={13} /> {t.title}
                    </button>
                  ))}
                </div>
              )}
              {results.docs.length > 0 && (
                <div className="if-search-group">
                  <div className="if-search-group-label">Documents</div>
                  {results.docs.map((d) => (
                    <button key={"d" + d.id + d.workspaceId} className="if-search-row" onClick={() => { onGoToWorkspace && onGoToWorkspace(d.workspaceId); setQuery(""); }}>
                      <FileText size={13} /> {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="if-notif-wrap">
          <button
            className="if-icon-btn"
            onClick={() => {
              setShowNotif((s) => {
                const next = !s;
                if (next && onOpenNotifications) onOpenNotifications();
                return next;
              });
            }}
          >
            <Bell size={16} />
            {notifications.some((n) => n.read !== true) && <span className="if-notif-dot" />}
          </button>
          {showNotif && (
            <div className="if-notif-dropdown">
              <div className="if-search-group-label" style={{ padding: "10px 12px 4px" }}>Notifications</div>
              {notifications.map((n, i) => (
                <div className={"if-notif-row" + (n.read === false ? " unread" : "")} key={n.id ?? i}>
                  <div className="if-feed-icon"><n.icon size={13} /></div>
                  <div className="if-feed-text">{n.text}</div>
                </div>
              ))}
              {notifications.length === 0 && <div className="if-search-empty">You&apos;re all caught up.</div>}
            </div>
          )}
        </div>

        {onNewIdea && (
          <button className="if-btn-primary" onClick={onNewIdea}>
            <Plus size={15} /> New Idea
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint }) {
  return (
    <div className="if-stat-card">
      <div className="if-stat-icon" style={{ background: tint }}>
        <Icon size={16} />
      </div>
      <div>
        <div className="if-stat-value">{value}</div>
        <div className="if-stat-label">{label}</div>
      </div>
    </div>
  );
}

function Dashboard({ ideas, setTab, workspaceData, onGoToIdea, onGoToWorkspace, notifications, onOpenNotifications }) {
  const approved = ideas.filter((i) => i.status === "Approved").length;
  const discussion = ideas.filter((i) => i.status === "Discussion").length;
  const feed = [
    { icon: Lightbulb, text: "Aman Verma created a new idea — AI Resume Builder." },
    { icon: ThumbsUp, text: "Priya Shah voted Approve on Campus Marketplace." },
    { icon: FolderKanban, text: "Workspace created for Campus Marketplace." },
    { icon: CheckCircle2, text: "Task \u201cWireframe onboarding flow\u201d completed." },
  ];
  return (
    <div>
      <Topbar title="Dashboard" ideas={ideas} workspaceData={workspaceData} onGoToIdea={onGoToIdea} onGoToWorkspace={onGoToWorkspace} notifications={notifications} onOpenNotifications={onOpenNotifications} />
      <div className="if-content">
        <div className="if-stat-grid">
          <StatCard label="Total Ideas" value={ideas.length} icon={Lightbulb} tint="rgba(124,111,255,0.16)" />
          <StatCard label="Approved Ideas" value={approved} icon={CheckCircle2} tint="rgba(58,201,140,0.16)" />
          <StatCard label="In Discussion" value={discussion} icon={MessageSquare} tint="rgba(245,166,35,0.16)" />
          <StatCard label="Active Workspaces" value={approved} icon={FolderKanban} tint="rgba(124,111,255,0.16)" />
          <StatCard label="Team Members" value={12} icon={Users} tint="rgba(58,201,140,0.16)" />
          <StatCard label="Tasks Completed" value={47} icon={CheckCircle2} tint="rgba(245,166,35,0.16)" />
        </div>

        <div className="if-two-col">
          <div className="if-panel">
            <div className="if-panel-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="if-feed">
              {feed.map((f, i) => (
                <div className="if-feed-row" key={i}>
                  <div className="if-feed-icon"><f.icon size={14} /></div>
                  <div className="if-feed-text">{f.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="if-panel">
            <div className="if-panel-header">
              <h3>Top Ideas</h3>
              <button className="if-link-btn" onClick={() => setTab("ideas")}>
                View all <ChevronRight size={13} />
              </button>
            </div>
            <div className="if-mini-list">
              {ideas.slice(0, 3).map((idea) => (
                <div className="if-mini-idea" key={idea.id}>
                  <div>
                    <div className="if-mini-title">{idea.title}</div>
                    <div className="if-mini-sub">{idea.category}</div>
                  </div>
                  <div className="if-pct" style={{ color: statusColor(idea.status) }}>
                    {approvalPct(idea.votes)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdeaCard({ idea, onOpen }) {
  const pct = approvalPct(idea.votes);
  return (
    <div className="if-idea-card">
      <div className="if-idea-card-top">
        <span className="if-tag">{idea.category}</span>
        <span className="if-status-pill" style={{ color: statusColor(idea.status), borderColor: statusColor(idea.status) }}>
          {idea.status}
        </span>
      </div>
      <h4>{idea.title}</h4>
      <p>{idea.problem}</p>
      <div className="if-idea-card-bottom">
        <div className="if-mini-votes">
          <ThumbsUp size={13} /> {idea.votes.approve}
          <span className="if-pct-inline" style={{ color: statusColor(idea.status) }}>{pct}% approval</span>
        </div>
        <button className="if-link-btn" onClick={() => onOpen(idea)}>
          Open <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

function NewIdeaModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: "", problem: "", description: "", category: "AI / SaaS" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="if-modal-backdrop" onClick={onClose}>
      <div className="if-modal" onClick={(e) => e.stopPropagation()}>
        <div className="if-modal-header">
          <h3>New Idea</h3>
          <button className="if-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="if-modal-body">
          <label>Idea Title</label>
          <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. AI Resume Builder" />
          <label>Problem Statement</label>
          <textarea rows={2} value={form.problem} onChange={(e) => update("problem", e.target.value)} placeholder="What problem does this solve?" />
          <label>Detailed Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the solution..." />
          <label>Category</label>
          <select value={form.category} onChange={(e) => update("category", e.target.value)}>
            <option>AI / SaaS</option>
            <option>Marketplace</option>
            <option>Fintech</option>
            <option>Consumer</option>
            <option>Dev Tools</option>
          </select>
        </div>
        <div className="if-modal-footer">
          <button className="if-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="if-btn-primary"
            disabled={!form.title.trim()}
            onClick={() => {
              if (!form.title.trim()) return;
              onCreate(form);
              onClose();
            }}
          >
            Submit Idea
          </button>
        </div>
      </div>
    </div>
  );
}

function VoteRow({ idea, onVote }) {
  const pct = approvalPct(idea.votes);
  return (
    <div className="if-vote-panel">
      <div className="if-vote-bar-track">
        <div className="if-vote-bar-fill" style={{ width: pct + "%" }} />
      </div>
      <div className="if-vote-meta">
        <span>{pct}% approval &middot; 75% required</span>
        <span style={{ color: statusColor(idea.status) }}>{idea.status}</span>
      </div>
      <div className="if-vote-buttons">
        <button className="if-vote-btn approve" onClick={() => onVote(idea.id, "approve")}>
          <ThumbsUp size={14} /> Approve ({idea.votes.approve})
        </button>
        <button className="if-vote-btn neutral" onClick={() => onVote(idea.id, "neutral")}>
          <MinusCircle size={14} /> Neutral ({idea.votes.neutral})
        </button>
        <button className="if-vote-btn reject" onClick={() => onVote(idea.id, "reject")}>
          <ThumbsDown size={14} /> Reject ({idea.votes.reject})
        </button>
      </div>
    </div>
  );
}

function AICoFounder({ idea }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ask = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Calls our own server route (app/api/ai-cofounder/route.ts), which holds
      // the ANTHROPIC_API_KEY server-side and forwards the request to Claude.
      const response = await fetch("/api/ai-cofounder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e) {
      setError("AI Co-Founder could not respond right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="if-panel if-ai-panel">
      <div className="if-panel-header">
        <h3><Sparkles size={15} style={{ marginRight: 6, verticalAlign: -2 }} />AI Co-Founder</h3>
        <button className="if-btn-primary sm" onClick={ask} disabled={loading}>
          {loading ? <Loader2 size={14} className="if-spin" /> : <Sparkles size={14} />}
          {loading ? "Thinking..." : "Analyze Idea"}
        </button>
      </div>

      {error && <div className="if-ai-error">{error}</div>}

      {!result && !loading && !error && (
        <p className="if-ai-empty">
          Get live market analysis, competitor research, revenue ideas, tech stack, risks and a
          launch roadmap — generated by Claude in real time.
        </p>
      )}

      {result && (
        <div className="if-ai-grid">
          <div className="if-ai-block">
            <div className="if-ai-block-head"><Target size={13} /> Market Analysis</div>
            <p>{result.marketAnalysis}</p>
          </div>
          <div className="if-ai-block">
            <div className="if-ai-block-head"><Users size={13} /> Competitors</div>
            <ul>{result.competitors?.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
          <div className="if-ai-block">
            <div className="if-ai-block-head"><DollarSign size={13} /> Revenue Ideas</div>
            <ul>{result.revenueIdeas?.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
          <div className="if-ai-block">
            <div className="if-ai-block-head"><Cpu size={13} /> Tech Stack</div>
            <ul>{result.techStack?.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
          <div className="if-ai-block">
            <div className="if-ai-block-head"><AlertTriangle size={13} /> Risks</div>
            <ul>{result.risks?.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
          <div className="if-ai-block">
            <div className="if-ai-block-head"><Map size={13} /> Roadmap</div>
            <ol>{result.roadmap?.map((c, i) => <li key={i}>{c}</li>)}</ol>
          </div>
        </div>
      )}
    </div>
  );
}

function IdeaDetail({ idea, onBack, onVote, onComment, allIdeas, workspaceData, onGoToIdea, onGoToWorkspace, notifications, onOpenNotifications }) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(idea.comments || []);

  useEffect(() => {
    setComments(idea.comments || []);
    let ignore = false;
    fetch(`/api/ideas/${idea.id}/comments`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows) => {
        if (!ignore && rows && rows.length) {
          setComments(rows.map((r) => ({ id: r.id, author: r.profiles?.full_name || "Someone", text: r.body })));
        }
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [idea.id]);

  const postComment = (text) => {
    setComments((c) => [...c, { id: "temp-" + Date.now(), author: "You", text }]);
    onComment(idea.id, text);
  };

  return (
    <div>
      <Topbar title={idea.title} ideas={allIdeas} workspaceData={workspaceData} onGoToIdea={onGoToIdea} onGoToWorkspace={onGoToWorkspace} notifications={notifications} onOpenNotifications={onOpenNotifications} />
      <div className="if-content">
        <button className="if-back-btn" onClick={onBack}>&larr; Back to ideas</button>

        <div className="if-two-col">
          <div>
            <div className="if-panel">
              <div className="if-panel-header"><h3>Overview</h3></div>
              <p className="if-detail-text"><strong>Problem:</strong> {idea.problem}</p>
              <p className="if-detail-text"><strong>Solution:</strong> {idea.description}</p>
              <div className="if-detail-meta">
                <span><Users size={13} /> {idea.creator}</span>
                <span className="if-tag">{idea.category}</span>
              </div>
            </div>

            <div className="if-panel">
              <div className="if-panel-header"><h3>Voting</h3></div>
              <VoteRow idea={idea} onVote={onVote} />
            </div>

            <div className="if-panel">
              <div className="if-panel-header"><h3>Discussion ({comments.length})</h3></div>
              <div className="if-comments">
                {comments.map((c) => (
                  <div className="if-comment" key={c.id}>
                    <div className="if-avatar sm">{c.author[0]}</div>
                    <div>
                      <div className="if-comment-author">{c.author}</div>
                      <div className="if-comment-text">{c.text}</div>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <p className="if-ai-empty">No comments yet — start the discussion.</p>}
              </div>
              <div className="if-comment-input">
                <input
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && comment.trim()) {
                      postComment(comment.trim());
                      setComment("");
                    }
                  }}
                />
                <button
                  className="if-btn-primary sm"
                  onClick={() => {
                    if (comment.trim()) {
                      postComment(comment.trim());
                      setComment("");
                    }
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>

          <div>
            <AICoFounder idea={idea} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Workspaces({ ideas, workspaceData, onOpen, onGoToIdea, notifications, onOpenNotifications }) {
  const approved = ideas.filter((i) => i.status === "Approved");
  return (
    <div>
      <Topbar title="Workspaces" ideas={ideas} workspaceData={workspaceData} onGoToIdea={onGoToIdea} onGoToWorkspace={onOpen} notifications={notifications} onOpenNotifications={onOpenNotifications} />
      <div className="if-content">
        {approved.length === 0 && (
          <div className="if-panel">
            <p className="if-ai-empty">No workspaces yet. Approve an idea (75%+ votes) to auto-create one.</p>
          </div>
        )}
        <div className="if-idea-grid">
          {approved.map((idea) => {
            const ws = workspaceData[idea.id] || { tasks: [], messages: [] };
            const done = ws.tasks.filter((t) => t.status === "Completed").length;
            const pct = ws.tasks.length ? Math.round((done / ws.tasks.length) * 100) : 0;
            return (
              <div className="if-panel if-workspace-card-click" key={idea.id} onClick={() => onOpen(idea.id)}>
                <div className="if-panel-header"><h3>{idea.title}</h3><ChevronRight size={15} color="var(--muted)" /></div>
                <div className="if-workspace-tree">
                  {["Tasks", "Documents", "Discussions", "Milestones"].map((n) => (
                    <span className="if-tree-chip" key={n}>{n}</span>
                  ))}
                </div>
                <div className="if-vote-bar-track" style={{ marginTop: 12 }}>
                  <div className="if-vote-bar-fill" style={{ width: pct + "%" }} />
                </div>
                <div className="if-vote-meta" style={{ marginBottom: 0 }}>
                  <span>{done}/{ws.tasks.length} tasks done</span>
                  <span>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const priorityColor = (p) => (p === "High" ? "var(--reject)" : p === "Medium" ? "var(--amber, #F5A623)" : "var(--muted)");

function TaskCard({ task, onMove, onDragStart, onDragEnd, isDragging }) {
  const idx = TASK_COLUMNS.indexOf(task.status);
  return (
    <div
      className={"if-task-card" + (isDragging ? " dragging" : "")}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(task.id); }}
      onDragEnd={onDragEnd}
    >
      <div className="if-task-top">
        <span className="if-task-priority" style={{ color: priorityColor(task.priority) }}>
          <Flag size={11} /> {task.priority}
        </span>
      </div>
      <div className="if-task-title">{task.title}</div>
      <div className="if-task-bottom">
        <span className="if-task-assignee">
          <div className="if-avatar sm">{task.assignee[0]}</div>
          {task.assignee}
        </span>
        {idx < TASK_COLUMNS.length - 1 && (
          <button className="if-task-move" onClick={() => onMove(task.id, TASK_COLUMNS[idx + 1])} title={"Move to " + TASK_COLUMNS[idx + 1]}>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ tasks, onMove, onAdd, workspaceId, isLive }) {
  const [newTitle, setNewTitle] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [liveTasks, setLiveTasks] = useState(tasks);
  const supabaseRef = useRef(typeof window !== "undefined" ? createClient() : null);

  useEffect(() => { setLiveTasks(tasks); }, [tasks]);

  // Real-time: reflect task moves/adds from other team members instantly.
  useEffect(() => {
    if (!isLive || !workspaceId || !supabaseRef.current) return;
    const channel = supabaseRef.current
      .channel(`workspace-tasks-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          setLiveTasks((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((t) => t.id !== payload.old.id);
            }
            const row = payload.new;
            const mapped = {
              id: row.id,
              title: row.title,
              priority: dbPriorityToUi[row.priority] || "Medium",
              status: dbStatusToUi[row.status] || "To Do",
            };
            const existing = prev.find((t) => t.id === row.id);
            if (existing) {
              // Preserve the assignee name we already resolved locally —
              // the raw Realtime payload only has assignee_id, not the joined name.
              return prev.map((t) => (t.id === row.id ? { ...mapped, assignee: t.assignee } : t));
            }
            return [...prev, { ...mapped, assignee: "Team" }];
          });
        }
      )
      .subscribe();
    return () => { supabaseRef.current.removeChannel(channel); };
  }, [isLive, workspaceId]);

  const handleDrop = (col) => {
    if (draggingId != null) onMove(draggingId, col);
    setDraggingId(null);
    setDragOverCol(null);
  };

  return (
    <div>
      <div className="if-kanban-add">
        <input
          placeholder="Quick add a task to To Do..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTitle.trim()) { onAdd(newTitle.trim()); setNewTitle(""); }
          }}
        />
        <button className="if-btn-primary sm" onClick={() => { if (newTitle.trim()) { onAdd(newTitle.trim()); setNewTitle(""); } }}>
          <Plus size={13} /> Add
        </button>
      </div>
      <div className="if-kanban">
        {TASK_COLUMNS.map((col) => {
          const colTasks = liveTasks.filter((t) => t.status === col);
          return (
            <div
              className={"if-kanban-col" + (dragOverCol === col ? " drag-over" : "")}
              key={col}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
              onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
              onDrop={(e) => { e.preventDefault(); handleDrop(col); }}
            >
              <div className="if-kanban-col-head">
                <span>{col}</span>
                <span className="if-kanban-count">{colTasks.length}</span>
              </div>
              <div className="if-kanban-col-body">
                {colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onMove={onMove}
                    onDragStart={setDraggingId}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                    isDragging={draggingId === t.id}
                  />
                ))}
                {colTasks.length === 0 && <div className="if-kanban-empty">Drop tasks here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkspaceChat({ messages, onSend, workspaceId, currentUser, isLive }) {
  const [text, setText] = useState("");
  const [liveMessages, setLiveMessages] = useState(messages);
  const endRef = useRef(null);
  const supabaseRef = useRef(typeof window !== "undefined" ? createClient() : null);

  useEffect(() => { setLiveMessages(messages); }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [liveMessages.length]);

  // Real-time: subscribe to new chat rows for this workspace so every
  // member sees messages arrive instantly, WhatsApp-style, without refresh.
  useEffect(() => {
    if (!isLive || !workspaceId || !supabaseRef.current) return;
    const channel = supabaseRef.current
      .channel(`workspace-chat-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `workspace_id=eq.${workspaceId}` },
        async (payload) => {
          setLiveMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : prev));
          // Skip if this is our own optimistically-added message (already shown).
          if (currentUser && payload.new.user_id === currentUser.id) return;
          let authorName = "Someone";
          try {
            const { data } = await supabaseRef.current
              .from("profiles")
              .select("full_name")
              .eq("id", payload.new.user_id)
              .single();
            if (data?.full_name) authorName = data.full_name;
          } catch {}
          setLiveMessages((prev) =>
            prev.some((m) => m.id === payload.new.id)
              ? prev
              : [...prev, { id: payload.new.id, author: authorName, text: payload.new.body, userId: payload.new.user_id }]
          );
        }
      )
      .subscribe();
    return () => { supabaseRef.current.removeChannel(channel); };
  }, [isLive, workspaceId, currentUser]);

  return (
    <div className="if-panel if-whatsapp-panel">
      <div className="if-panel-header">
        <h3><MessageSquare size={15} style={{ marginRight: 6, verticalAlign: -2 }} />Team Discussion</h3>
        {isLive && <span className="if-live-dot" title="Live"><span /> Live</span>}
      </div>
      <div className="if-chat-scroll if-wa-scroll">
        {liveMessages.map((m) => {
          const mine = currentUser && (m.author === currentUser.name || m.userId === currentUser.id);
          return (
            <div className={"if-wa-row" + (mine ? " mine" : "")} key={m.id}>
              {!mine && <div className="if-avatar sm">{m.author[0]}</div>}
              <div className={"if-wa-bubble" + (mine ? " mine" : "")}>
                {!mine && <div className="if-wa-author">{m.author}</div>}
                <div className="if-wa-text">{m.text}</div>
              </div>
            </div>
          );
        })}
        {liveMessages.length === 0 && <p className="if-ai-empty">No messages yet — say hi to the team.</p>}
        <div ref={endRef} />
      </div>
      <div className="if-comment-input">
        <input
          placeholder="Message the team..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onSend(text.trim()); setText(""); } }}
        />
        <button className="if-btn-primary sm" onClick={() => { if (text.trim()) { onSend(text.trim()); setText(""); } }}>
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

function DocumentsPanel({ documents, onUpload, workspaceId, isLive, onLocalDocAdded }) {
  const [folder, setFolder] = useState("All");
  const [uploadFolder, setUploadFolder] = useState(DOC_FOLDERS[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const supabaseRef = useRef(typeof window !== "undefined" ? createClient() : null);

  const filtered = folder === "All" ? documents : documents.filter((d) => d.folder === folder);

  const triggerPicker = () => {
    if (!isLive) { onUpload(); return; }
    fileInputRef.current?.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !workspaceId || !supabaseRef.current) return;

    setUploading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser();
      const path = `${workspaceId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabaseRef.current.storage
        .from("documents")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabaseRef.current
        .from("documents")
        .insert({
          workspace_id: workspaceId,
          name: file.name,
          folder: uploadFolder,
          storage_path: path,
          size_bytes: file.size,
          uploaded_by: user?.id,
        })
        .select("*, profiles(full_name)")
        .single();
      if (insertError) throw insertError;

      onLocalDocAdded({
        id: row.id,
        name: row.name,
        folder: row.folder,
        uploadedBy: row.profiles?.full_name || "You",
        size: `${(row.size_bytes / 1024 / 1024).toFixed(2)} MB`,
        version: row.version,
        storagePath: row.storage_path,
      });
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const download = async (doc) => {
    if (!isLive || !doc.storagePath || !supabaseRef.current) return;
    const { data, error: signError } = await supabaseRef.current.storage
      .from("documents")
      .createSignedUrl(doc.storagePath, 3600);
    if (signError) { alert(signError.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="if-panel">
      <div className="if-panel-header">
        <h3>Documents</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isLive && (
            <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} className="if-doc-folder-select">
              {DOC_FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
          <button className="if-btn-primary sm" onClick={triggerPicker} disabled={uploading}>
            {uploading ? <Loader2 size={13} className="if-spin" /> : <Upload size={13} />}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        <input ref={fileInputRef} type="file" onChange={handleFile} style={{ display: "none" }} />
      </div>
      {error && <div className="if-ai-error" style={{ marginBottom: 10 }}>{error}</div>}
      <div className="if-doc-folders">
        {["All", ...DOC_FOLDERS].map((f) => (
          <button key={f} className={"if-folder-chip" + (folder === f ? " active" : "")} onClick={() => setFolder(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="if-doc-list">
        {filtered.map((d) => (
          <div className="if-doc-row" key={d.id}>
            <div className="if-doc-icon"><FileText size={15} /></div>
            <div className="if-doc-info">
              <div className="if-doc-name">{d.name}</div>
              <div className="if-doc-meta">{d.folder} &middot; {d.size} &middot; v{d.version} &middot; uploaded by {d.uploadedBy}</div>
            </div>
            <button className="if-icon-btn" onClick={() => download(d)}><Download size={14} /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="if-ai-empty">No documents in this folder yet.</p>}
      </div>
    </div>
  );
}

function WorkspaceDetail({ idea, ws, onBack, onMoveTask, onAddTask, onSendMessage, onUploadDoc, allIdeas, workspaceData, onGoToIdea, onGoToWorkspace, notifications, onOpenNotifications, currentUser, isLive }) {
  const [tab, setTab] = useState("board");
  const milestones = [
    { name: "Idea Approved", done: true },
    { name: "MVP Completed", done: false },
    { name: "Beta Released", done: false },
    { name: "First Customer", done: false },
    { name: "Funding Raised", done: false },
    { name: "Public Launch", done: false },
  ];
  return (
    <div>
      <Topbar title={idea.title + " — Workspace"} ideas={allIdeas} workspaceData={workspaceData} onGoToIdea={onGoToIdea} onGoToWorkspace={onGoToWorkspace} notifications={notifications} onOpenNotifications={onOpenNotifications} />
      <div className="if-content">
        <button className="if-back-btn" onClick={onBack}>&larr; Back to workspaces</button>
        <div className="if-ws-tabs">
          {[["board", "Task Board"], ["discussion", "Discussion"], ["documents", "Documents"], ["milestones", "Milestones"]].map(([k, l]) => (
            <button key={k} className={"if-ws-tab" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === "board" && (
          <KanbanBoard tasks={ws.tasks} onMove={onMoveTask} onAdd={onAddTask} workspaceId={ws.workspaceId} isLive={isLive} />
        )}
        {tab === "discussion" && (
          <WorkspaceChat messages={ws.messages} onSend={onSendMessage} workspaceId={ws.workspaceId} currentUser={currentUser} isLive={isLive} />
        )}
        {tab === "documents" && (
          <DocumentsPanel documents={ws.documents || []} onUpload={onUploadDoc} workspaceId={ws.workspaceId} isLive={isLive} onLocalDocAdded={(doc) => onUploadDoc(doc)} />
        )}
        {tab === "milestones" && (
          <div className="if-panel">
            <div className="if-panel-header"><h3>Milestones</h3></div>
            <div className="if-milestones">
              {milestones.map((m, i) => (
                <div className="if-milestone-row" key={i}>
                  {m.done ? <CheckCircle size={16} color="var(--approve)" /> : <Circle size={16} color="var(--muted)" />}
                  <span style={{ color: m.done ? "var(--text)" : "var(--muted)" }}>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CHART_COLORS = ["#7C6FFF", "#3AC98C", "#F5A623", "#EF5B6B", "#4B9BFF"];

function AnalyticsPage({ ideas, workspaceData, onGoToIdea, onGoToWorkspace, notifications, onOpenNotifications }) {
  const memberVotes = [
    { name: "Priya Shah", votes: 21, tasks: 14 },
    { name: "Ganesh Rao", votes: 18, tasks: 11 },
    { name: "Aman Verma", votes: 15, tasks: 9 },
    { name: "You", votes: 6, tasks: 3 },
  ];
  const statusData = [
    { name: "Approved", value: ideas.filter((i) => i.status === "Approved").length },
    { name: "Discussion", value: ideas.filter((i) => i.status === "Discussion").length },
  ];
  const allTasks = Object.values(workspaceData).flatMap((w) => w.tasks || []);
  const completionByCol = TASK_COLUMNS.map((col) => ({
    name: col,
    count: allTasks.filter((t) => t.status === col).length,
  }));

  return (
    <div>
      <Topbar title="Analytics" ideas={ideas} workspaceData={workspaceData} onGoToIdea={onGoToIdea} onGoToWorkspace={onGoToWorkspace} notifications={notifications} onOpenNotifications={onOpenNotifications} />
      <div className="if-content">
        <div className="if-two-col">
          <div className="if-panel">
            <div className="if-panel-header"><h3><Trophy size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Most Active Members</h3></div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={memberVotes} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2330" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8b91a3", fontSize: 11 }} axisLine={{ stroke: "#1f2330" }} tickLine={false} />
                  <YAxis tick={{ fill: "#8b91a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#12151e", border: "1px solid #1f2330", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="votes" name="Votes cast" fill="#7C6FFF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tasks" name="Tasks done" fill="#3AC98C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="if-panel">
            <div className="if-panel-header"><h3><Activity size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Idea Status Mix</h3></div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12, color: "#8b91a3" }} />
                  <Tooltip contentStyle={{ background: "#12151e", border: "1px solid #1f2330", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="if-panel">
          <div className="if-panel-header"><h3>Task Completion Rate (all workspaces)</h3></div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={completionByCol} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2330" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#8b91a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#8b91a3", fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: "#12151e", border: "1px solid #1f2330", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#7C6FFF" radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IdeaFlowApp({ initialIdeas = [], currentUser = null }) {
  const supabase = useRef(typeof window !== "undefined" ? createClient() : null).current;

  const [ideas, setIdeas] = useState(
    initialIdeas.length ? initialIdeas.map(mapDbIdea) : seedIdeas
  );
  const isLive = initialIdeas.length > 0; // true once real Supabase data is flowing
  const [tab, setTab] = useState("dashboard");
  const [theme, setTheme] = useState("dark");
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [workspaceData, setWorkspaceData] = useState(seedWorkspaceData);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);

  const selectedIdea = ideas.find((i) => i.id === selectedId);
  const selectedWorkspaceIdea = ideas.find((i) => i.id === selectedWorkspaceId);

  const demoNotifications = [
    { icon: Lightbulb, text: "Aman Verma created a new idea — AI Resume Builder." },
    { icon: ThumbsUp, text: "Priya Shah voted Approve on Campus Marketplace." },
    { icon: FolderKanban, text: "Workspace created for Campus Marketplace." },
    { icon: CheckCircle2, text: "Task \u201cDefine MVP feature set\u201d completed." },
  ];

  const notifIcon = { idea_approved: CheckCircle2, comment_added: MessageSquare, task_assigned: FolderKanban };
  const [liveNotifications, setLiveNotifications] = useState(null);

  useEffect(() => {
    if (!isLive) return;
    let ignore = false;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows) => {
        if (ignore) return;
        setLiveNotifications(rows.map((n) => ({ id: n.id, icon: notifIcon[n.type] || Bell, text: n.body, read: n.read })));
      })
      .catch(() => { if (!ignore) setLiveNotifications([]); });
    return () => { ignore = true; };
  }, [isLive]);

  // Live badge/dropdown updates the moment a new notification row is
  // inserted for this user (idea approved, comment received, task assigned).
  useEffect(() => {
    if (!isLive || !supabase || !currentUser) return;
    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          setLiveNotifications((prev) => [
            { id: payload.new.id, icon: notifIcon[payload.new.type] || Bell, text: payload.new.body, read: false },
            ...(prev || []),
          ]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLive, currentUser]);

  const notifications = isLive ? (liveNotifications ?? []) : demoNotifications;

  const onOpenNotifications = () => {
    if (!isLive) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
    setLiveNotifications((prev) => (prev ? prev.map((n) => ({ ...n, read: true })) : prev));
  };

  const ensureWorkspace = (id) =>
    workspaceData[id] || { tasks: [], messages: [] };

  // When a real (approved) idea's workspace is opened, pull its live tasks,
  // messages, and documents from the database. Falls back to whatever is
  // already in local workspaceData (e.g. seed demo data) if there's no
  // matching row yet — so the UI never goes blank.
  useEffect(() => {
    if (!isLive || !selectedWorkspaceId) return;
    let ignore = false;
    fetch(`/api/ideas/${selectedWorkspaceId}/workspace`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (ignore || !data.workspace) return;
        setWorkspaceData((prev) => ({
          ...prev,
          [selectedWorkspaceId]: {
            workspaceId: data.workspace.id,
            tasks: (data.tasks || []).map(mapDbTask),
            messages: (data.messages || []).map(mapDbMessage),
            documents: (data.documents || []).map((d) => ({
              id: d.id,
              name: d.name,
              folder: d.folder,
              uploadedBy: d.profiles?.full_name || "Someone",
              size: d.size_bytes ? `${(d.size_bytes / 1024 / 1024).toFixed(1)} MB` : "—",
              version: d.version,
              storagePath: d.storage_path,
            })),
          },
        }));
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [isLive, selectedWorkspaceId]);

  const moveTask = (workspaceId, taskId, newStatus) => {
    // optimistic local update first
    setWorkspaceData((prev) => {
      const ws = prev[workspaceId] || { tasks: [], messages: [] };
      return {
        ...prev,
        [workspaceId]: {
          ...ws,
          tasks: ws.tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
        },
      };
    });
    const realWsId = workspaceData[workspaceId]?.workspaceId;
    if (isLive && realWsId) {
      fetch(`/api/workspaces/${realWsId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: uiStatusToDb[newStatus] }),
      }).catch(() => {});
    }
  };

  const addTask = (workspaceId, title) => {
    const realWsId = workspaceData[workspaceId]?.workspaceId;
    if (isLive && realWsId) {
      fetch(`/api/workspaces/${realWsId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((row) => {
          setWorkspaceData((prev) => {
            const ws = prev[workspaceId] || { tasks: [], messages: [] };
            return { ...prev, [workspaceId]: { ...ws, tasks: [...ws.tasks, mapDbTask({ ...row, profiles: { full_name: currentUser?.name } })] } };
          });
        })
        .catch(() => {
          setWorkspaceData((prev) => {
            const ws = prev[workspaceId] || { tasks: [], messages: [] };
            const nextId = ws.tasks.length ? Math.max(...ws.tasks.map((t) => t.id)) + 1 : 1;
            return { ...prev, [workspaceId]: { ...ws, tasks: [...ws.tasks, { id: nextId, title, assignee: "You", priority: "Medium", status: "To Do" }] } };
          });
        });
      return;
    }
    setWorkspaceData((prev) => {
      const ws = prev[workspaceId] || { tasks: [], messages: [] };
      const nextId = ws.tasks.length ? Math.max(...ws.tasks.map((t) => t.id)) + 1 : 1;
      return {
        ...prev,
        [workspaceId]: {
          ...ws,
          tasks: [...ws.tasks, { id: nextId, title, assignee: "You", priority: "Medium", status: "To Do" }],
        },
      };
    });
  };

  const sendMessage = (workspaceId, text) => {
    const realWsId = workspaceData[workspaceId]?.workspaceId;
    if (isLive && realWsId) {
      fetch(`/api/workspaces/${realWsId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((row) => {
          setWorkspaceData((prev) => {
            const ws = prev[workspaceId] || { tasks: [], messages: [] };
            return { ...prev, [workspaceId]: { ...ws, messages: [...ws.messages, mapDbMessage({ ...row, profiles: { full_name: currentUser?.name } })] } };
          });
        })
        .catch(() => {
          setWorkspaceData((prev) => {
            const ws = prev[workspaceId] || { tasks: [], messages: [] };
            const nextId = ws.messages.length ? Math.max(...ws.messages.map((m) => m.id)) + 1 : 1;
            return { ...prev, [workspaceId]: { ...ws, messages: [...ws.messages, { id: nextId, author: "You", text }] } };
          });
        });
      return;
    }
    setWorkspaceData((prev) => {
      const ws = prev[workspaceId] || { tasks: [], messages: [] };
      const nextId = ws.messages.length ? Math.max(...ws.messages.map((m) => m.id)) + 1 : 1;
      return {
        ...prev,
        [workspaceId]: { ...ws, messages: [...ws.messages, { id: nextId, author: "You", text }] },
      };
    });
  };

  const uploadDoc = (workspaceId, realDoc) => {
    setWorkspaceData((prev) => {
      const ws = prev[workspaceId] || { tasks: [], messages: [], documents: [] };
      const docs = ws.documents || [];

      if (realDoc) {
        return { ...prev, [workspaceId]: { ...ws, documents: [...docs, realDoc] } };
      }

      // Offline/demo mode — no real Storage wired up, so fake a placeholder doc.
      const nextId = docs.length ? Math.max(...docs.map((d) => d.id)) + 1 : 1;
      const newDoc = {
        id: nextId,
        name: "New Document " + nextId + ".pdf",
        folder: DOC_FOLDERS[nextId % DOC_FOLDERS.length],
        uploadedBy: "You",
        size: "1.0 MB",
        version: 1,
      };
      return { ...prev, [workspaceId]: { ...ws, documents: [...docs, newDoc] } };
    });
  };

  const vote = (id, kind) => {
    if (isLive) {
      fetch(`/api/ideas/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: kind }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(({ idea }) => {
          if (!idea) return;
          setIdeas((prev) =>
            prev.map((i) =>
              i.id === id
                ? { ...i, votes: { ...i.votes, [kind]: (i.votes[kind] || 0) + 1 }, status: idea.status === "approved" ? "Approved" : "Discussion" }
                : i
            )
          );
        })
        .catch(() => {});
      return;
    }
    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== id) return idea;
        const votes = { ...idea.votes, [kind]: idea.votes[kind] + 1 };
        const pct = approvalPct(votes);
        return { ...idea, votes, status: pct >= 75 ? "Approved" : "Discussion" };
      })
    );
  };

  const addComment = (id, text) => {
    if (isLive) {
      fetch(`/api/ideas/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((row) => {
          setIdeas((prev) =>
            prev.map((idea) =>
              idea.id === id
                ? { ...idea, comments: [...idea.comments, mapDbComment({ ...row, profiles: { full_name: currentUser?.name } })] }
                : idea
            )
          );
        })
        .catch(() => {});
      return;
    }
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === id
          ? { ...idea, comments: [...idea.comments, { id: idea.comments.length + 1, author: "You", text }] }
          : idea
      )
    );
  };

  const createIdea = (form) => {
    if (isLive) {
      fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((row) => {
          setIdeas((prev) => [
            mapDbIdea({ ...row, creatorName: currentUser?.name, votes: { approve: 0, reject: 0, neutral: 0 } }),
            ...prev,
          ]);
          setTab("ideas");
        })
        .catch(() => {});
      return;
    }
    const newIdea = {
      id: Math.max(...ideas.map((i) => i.id)) + 1,
      title: form.title,
      problem: form.problem || "Problem statement pending.",
      description: form.description || "Description pending.",
      category: form.category,
      creator: "You",
      votes: { approve: 0, reject: 0, neutral: 0 },
      status: "Discussion",
      comments: [],
    };
    setIdeas((prev) => [newIdea, ...prev]);
    setTab("ideas");
  };

  const signOut = () => {
    supabase?.auth.signOut().then(() => window.location.reload());
  };

  return (
    <div className="if-root" data-theme={theme}>
      <style>{`
        .if-root {
          --bg: #0c0e14;
          --panel: #12151e;
          --panel-border: #1f2330;
          --text: #eef0f5;
          --text-secondary: var(--text-secondary);
          --muted: #8b91a3;
          --accent: #7c6fff;
          --accent-soft: rgba(124,111,255,0.14);
          --accent-text: var(--accent-text);
          --approve: #3ac98c;
          --reject: #ef5b6b;
          --sunken: var(--sunken);
          --hover: var(--hover);
          --track: var(--track);
          --sidebar-bg: var(--sunken);
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--bg);
          color: var(--text);
          display: flex;
          min-height: 680px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--panel-border);
          transition: background 0.2s ease, color 0.2s ease;
        }
        .if-root[data-theme="light"] {
          --bg: #f6f6fb;
          --panel: #ffffff;
          --panel-border: #e6e6f0;
          --text: #16171f;
          --text-secondary: #454857;
          --muted: #757a8c;
          --accent: #6c5ce7;
          --accent-soft: rgba(108,92,231,0.10);
          --accent-text: #5b4bd6;
          --approve: #1f9e63;
          --reject: #d63c4a;
          --sunken: #f0f0f6;
          --hover: #ececf4;
          --track: #e6e6f0;
          --sidebar-bg: #ffffff;
        }
        .if-root[data-theme="light"] .if-sidebar { border-right: 1px solid var(--panel-border); }
        .if-root[data-theme="light"] .if-logo-mark { box-shadow: 0 4px 10px rgba(108,92,231,0.25); }
        }
        .if-sidebar {
          width: 216px;
          flex-shrink: 0;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--panel-border);
          display: flex;
          flex-direction: column;
          padding: 18px 14px;
        }
        .if-logo { display:flex; align-items:center; gap:9px; font-weight:700; font-size:16px; letter-spacing:-0.01em; padding: 4px 6px 22px; }
        .if-logo-mark { width:26px; height:26px; border-radius:8px; background: linear-gradient(135deg, var(--accent), #4b3fce); display:flex; align-items:center; justify-content:center; }
        .if-nav { display:flex; flex-direction:column; gap:2px; flex:1; }
        .if-nav-item { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; border:none; background:transparent; color:var(--muted); font-size:13.5px; cursor:pointer; text-align:left; font-family:inherit; }
        .if-nav-item:hover { background:var(--hover); color:var(--text); }
        .if-nav-item.active { background:var(--accent-soft); color:var(--accent-text); font-weight:600; }
        .if-sidebar-footer { border-top:1px solid var(--panel-border); padding-top:12px; margin-top:8px; display:flex; flex-direction:column; gap:10px; }
        .if-theme-toggle { display:flex; align-items:center; gap:8px; background:var(--sunken); border:1px solid var(--panel-border); color:var(--muted); font-size:12px; font-weight:600; padding:8px 10px; border-radius:8px; cursor:pointer; font-family:inherit; width:100%; }
        .if-theme-toggle:hover { color:var(--text); border-color:var(--accent); }
        .if-user-chip { display:flex; align-items:center; gap:9px; }
        .if-avatar { width:28px; height:28px; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
        .if-avatar.sm { width:24px; height:24px; font-size:11px; }
        .if-user-name { font-size:12.5px; font-weight:600; }
        .if-user-role { font-size:11px; color:var(--muted); }

        .if-root > div:last-child { flex:1; overflow-y:auto; }
        .if-topbar { display:flex; align-items:center; justify-content:space-between; padding:20px 26px; border-bottom:1px solid var(--panel-border); }
        .if-eyebrow { font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; color:var(--accent); font-weight:700; margin-bottom:3px; }
        .if-title { font-size:20px; font-weight:700; letter-spacing:-0.01em; margin:0; }
        .if-topbar-actions { display:flex; align-items:center; gap:10px; }
        .if-search-wrap { position:relative; }
        .if-search { display:flex; align-items:center; gap:7px; background:var(--panel); border:1px solid var(--panel-border); border-radius:8px; padding:7px 10px; color:var(--muted); width:220px; transition: border-color 0.15s; }
        .if-search:focus-within { border-color: var(--accent); }
        .if-search-clear { background:transparent; border:none; color:var(--muted); cursor:pointer; display:flex; padding:0; }
        .if-search-dropdown { position:absolute; top:calc(100% + 8px); left:0; width:300px; background:var(--panel); border:1px solid var(--panel-border); border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,0.4); z-index:40; padding:8px 0; max-height:360px; overflow-y:auto; }
        .if-search-group { padding:4px 0; }
        .if-search-group + .if-search-group { border-top:1px solid var(--panel-border); }
        .if-search-group-label { font-size:10.5px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); font-weight:700; padding:6px 14px 4px; }
        .if-search-row { display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:transparent; border:none; color:var(--text); font-size:12.5px; padding:8px 14px; cursor:pointer; font-family:inherit; }
        .if-search-row:hover { background:var(--hover); }
        .if-search-empty { font-size:12px; color:var(--muted); padding:14px; text-align:center; }

        .if-notif-wrap { position:relative; }
        .if-notif-dot { position:absolute; top:6px; right:6px; width:7px; height:7px; border-radius:50%; background:var(--reject); border:1.5px solid var(--panel); }
        .if-notif-dropdown { position:absolute; top:calc(100% + 8px); right:0; width:300px; background:var(--panel); border:1px solid var(--panel-border); border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,0.4); z-index:40; padding:4px 0 8px; max-height:360px; overflow-y:auto; }
        .if-notif-row { display:flex; align-items:center; gap:10px; padding:9px 14px; }
        .if-notif-row.unread { background:var(--accent-soft); }
        .if-notif-row:hover { background:var(--hover); }
        .if-search input { background:transparent; border:none; outline:none; color:var(--text); font-size:12.5px; width:100%; font-family:inherit; }
        .if-icon-btn { width:32px; height:32px; border-radius:8px; background:var(--panel); border:1px solid var(--panel-border); color:var(--muted); display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .if-btn-primary { display:flex; align-items:center; gap:6px; background:var(--accent); color:#fff; border:none; padding:9px 14px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
        .if-btn-primary.sm { padding:6px 10px; font-size:12px; }
        .if-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .if-btn-ghost { background:transparent; color:var(--muted); border:1px solid var(--panel-border); padding:9px 14px; border-radius:8px; font-size:13px; cursor:pointer; font-family:inherit; }

        .if-content { padding:22px 26px 40px; }
        .if-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
        .if-stat-card { background:var(--panel); border:1px solid var(--panel-border); border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px; }
        .if-stat-icon { width:34px; height:34px; border-radius:9px; color:var(--accent); display:flex; align-items:center; justify-content:center; }
        .if-stat-value { font-size:19px; font-weight:700; }
        .if-stat-label { font-size:11.5px; color:var(--muted); }

        .if-two-col { display:grid; grid-template-columns:1.4fr 1fr; gap:16px; align-items:start; }
        .if-panel { background:var(--panel); border:1px solid var(--panel-border); border-radius:12px; padding:16px 18px; margin-bottom:14px; }
        .if-panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .if-panel-header h3 { font-size:14px; margin:0; font-weight:600; }
        .if-link-btn { background:transparent; border:none; color:var(--accent); font-size:12px; display:flex; align-items:center; gap:3px; cursor:pointer; font-family:inherit; }

        .if-feed-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--panel-border); }
        .if-feed-row:last-child { border-bottom:none; }
        .if-feed-icon { width:26px; height:26px; border-radius:7px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .if-feed-text { font-size:12.5px; color:var(--text-secondary); }

        .if-mini-idea { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--panel-border); }
        .if-mini-idea:last-child { border-bottom:none; }
        .if-mini-title { font-size:13px; font-weight:600; }
        .if-mini-sub { font-size:11px; color:var(--muted); }
        .if-pct { font-size:13px; font-weight:700; }

        .if-idea-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .if-idea-card { background:var(--panel); border:1px solid var(--panel-border); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:8px; }
        .if-idea-card h4 { margin:0; font-size:15px; }
        .if-idea-card p { margin:0; font-size:12.5px; color:var(--muted); line-height:1.5; }
        .if-idea-card-top { display:flex; justify-content:space-between; align-items:center; }
        .if-tag { font-size:10.5px; background:var(--accent-soft); color:var(--accent-text); padding:3px 8px; border-radius:6px; font-weight:600; }
        .if-status-pill { font-size:10.5px; border:1px solid; padding:3px 8px; border-radius:6px; font-weight:600; }
        .if-idea-card-bottom { display:flex; justify-content:space-between; align-items:center; margin-top:6px; }
        .if-mini-votes { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--muted); }
        .if-pct-inline { font-weight:700; margin-left:6px; }

        .if-modal-backdrop { position:fixed; inset:0; background:rgba(4,5,9,0.6); display:flex; align-items:center; justify-content:center; z-index:50; }
        .if-modal { background:var(--panel); border:1px solid var(--panel-border); border-radius:14px; width:420px; max-width:90vw; }
        .if-modal-header { display:flex; justify-content:space-between; align-items:center; padding:16px 18px; border-bottom:1px solid var(--panel-border); }
        .if-modal-header h3 { margin:0; font-size:15px; }
        .if-modal-body { padding:16px 18px; display:flex; flex-direction:column; gap:4px; max-height:60vh; overflow-y:auto; }
        .if-modal-body label { font-size:11.5px; color:var(--muted); margin-top:8px; font-weight:600; }
        .if-modal-body input, .if-modal-body textarea, .if-modal-body select {
          background:var(--sunken); border:1px solid var(--panel-border); border-radius:8px; padding:9px 10px; color:var(--text); font-size:13px; font-family:inherit; outline:none; resize:vertical;
        }
        .if-modal-footer { display:flex; justify-content:flex-end; gap:8px; padding:14px 18px; border-top:1px solid var(--panel-border); }

        .if-back-btn { background:transparent; border:none; color:var(--muted); font-size:12.5px; cursor:pointer; margin-bottom:14px; font-family:inherit; padding:0; }
        .if-detail-text { font-size:13px; line-height:1.6; color:var(--text-secondary); margin:0 0 8px; }
        .if-detail-meta { display:flex; gap:10px; align-items:center; font-size:12px; color:var(--muted); margin-top:10px; }
        .if-detail-meta span { display:flex; align-items:center; gap:5px; }

        .if-vote-bar-track { height:6px; background:var(--track); border-radius:6px; overflow:hidden; }
        .if-vote-bar-fill { height:100%; background:linear-gradient(90deg, var(--accent), var(--approve)); }
        .if-vote-meta { display:flex; justify-content:space-between; font-size:11.5px; color:var(--muted); margin:8px 0 12px; }
        .if-vote-buttons { display:flex; gap:8px; }
        .if-vote-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid var(--panel-border); background:var(--sunken); color:var(--text); font-family:inherit; }
        .if-vote-btn.approve:hover { border-color:var(--approve); color:var(--approve); }
        .if-vote-btn.reject:hover { border-color:var(--reject); color:var(--reject); }
        .if-vote-btn.neutral:hover { border-color:var(--muted); }

        .if-comments { display:flex; flex-direction:column; gap:10px; margin-bottom:10px; }
        .if-comment { display:flex; gap:9px; }
        .if-comment-author { font-size:12px; font-weight:700; }
        .if-comment-text { font-size:12.5px; color:var(--text-secondary); }
        .if-comment-input { display:flex; gap:8px; }
        .if-comment-input input { flex:1; background:var(--sunken); border:1px solid var(--panel-border); border-radius:8px; padding:8px 10px; color:var(--text); font-size:12.5px; outline:none; font-family:inherit; }

        .if-ai-panel { position:sticky; top:0; }
        .if-ai-empty { font-size:12.5px; color:var(--muted); line-height:1.6; }
        .if-ai-error { font-size:12.5px; color:var(--reject); background:rgba(239,91,107,0.1); padding:8px 10px; border-radius:8px; }
        .if-ai-grid { display:flex; flex-direction:column; gap:12px; }
        .if-ai-block-head { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--accent-text); margin-bottom:4px; }
        .if-ai-block p, .if-ai-block li { font-size:12px; color:var(--text-secondary); line-height:1.5; }
        .if-ai-block ul, .if-ai-block ol { margin:0; padding-left:16px; }
        .if-spin { animation: if-spin 1s linear infinite; }
        @keyframes if-spin { to { transform: rotate(360deg); } }

        .if-workspace-tree { display:flex; flex-wrap:wrap; gap:6px; }
        .if-tree-chip { font-size:11px; background:var(--sunken); border:1px solid var(--panel-border); padding:4px 8px; border-radius:6px; color:var(--muted); }
        .if-workspace-card-click { cursor:pointer; transition: border-color 0.15s; }
        .if-workspace-card-click:hover { border-color: var(--accent); }

        .if-ws-tabs { display:flex; gap:6px; margin-bottom:16px; border-bottom:1px solid var(--panel-border); }
        .if-ws-tab { background:transparent; border:none; color:var(--muted); font-size:13px; font-weight:600; padding:9px 4px; cursor:pointer; font-family:inherit; border-bottom:2px solid transparent; margin-right:14px; }
        .if-ws-tab.active { color:var(--text); border-bottom-color: var(--accent); }

        .if-kanban-add { display:flex; gap:8px; margin-bottom:14px; }
        .if-kanban-add input { flex:1; background:var(--panel); border:1px solid var(--panel-border); border-radius:8px; padding:9px 12px; color:var(--text); font-size:13px; outline:none; font-family:inherit; }
        .if-kanban { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .if-kanban-col { background:var(--sunken); border:1px solid var(--panel-border); border-radius:12px; padding:10px; min-height:120px; transition: border-color 0.15s, background 0.15s; }
        .if-kanban-col.drag-over { border-color: var(--accent); background: var(--accent-soft); }
        .if-task-card.dragging { opacity: 0.4; }
        .if-task-card { cursor: grab; }
        .if-task-card:active { cursor: grabbing; }
        .if-kanban-col-head { display:flex; justify-content:space-between; align-items:center; font-size:11.5px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.04em; padding:4px 6px 10px; }
        .if-kanban-count { background:var(--panel-border); color:var(--text); border-radius:10px; padding:1px 7px; font-size:10.5px; }
        .if-kanban-col-body { display:flex; flex-direction:column; gap:8px; }
        .if-kanban-empty { font-size:11.5px; color:var(--muted); text-align:center; padding:14px 0; border:1px dashed var(--panel-border); border-radius:8px; }
        .if-task-card { background:var(--panel); border:1px solid var(--panel-border); border-radius:9px; padding:10px; }
        .if-task-top { margin-bottom:6px; }
        .if-task-priority { display:flex; align-items:center; gap:4px; font-size:10.5px; font-weight:700; }
        .if-task-title { font-size:12.5px; color:var(--text); line-height:1.4; margin-bottom:10px; }
        .if-task-bottom { display:flex; align-items:center; justify-content:space-between; }
        .if-task-assignee { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--muted); }
        .if-task-move { background:var(--accent-soft); border:none; color:var(--accent); width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; }

        .if-chat-scroll { display:flex; flex-direction:column; gap:12px; max-height:360px; overflow-y:auto; margin-bottom:10px; padding-right:4px; }
        .if-wa-scroll { max-height:420px; gap:8px; padding:4px 6px; }
        .if-wa-row { display:flex; align-items:flex-end; gap:8px; max-width:78%; }
        .if-wa-row.mine { margin-left:auto; flex-direction:row-reverse; }
        .if-wa-bubble { background:var(--sunken); border:1px solid var(--panel-border); border-radius:14px 14px 14px 4px; padding:8px 12px; }
        .if-wa-bubble.mine { background:var(--accent); border-color:var(--accent); border-radius:14px 14px 4px 14px; }
        .if-wa-author { font-size:11px; font-weight:700; color:var(--accent-text); margin-bottom:2px; }
        .if-wa-text { font-size:13px; color:var(--text); line-height:1.45; word-break:break-word; }
        .if-wa-bubble.mine .if-wa-text { color:#fff; }
        .if-live-dot { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--approve); font-weight:600; }
        .if-live-dot span { width:7px; height:7px; border-radius:50%; background:var(--approve); display:inline-block; animation: if-pulse 1.6s ease-in-out infinite; }
        @keyframes if-pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }

        .if-milestones { display:flex; flex-direction:column; gap:12px; }
        .if-milestone-row { display:flex; align-items:center; gap:10px; font-size:13px; }

        .if-doc-folders { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
        .if-folder-chip { background:var(--sunken); border:1px solid var(--panel-border); color:var(--muted); font-size:11.5px; padding:5px 10px; border-radius:7px; cursor:pointer; font-family:inherit; }
        .if-folder-chip.active { background:var(--accent-soft); color:var(--accent-text); border-color:var(--accent); }
        .if-doc-list { display:flex; flex-direction:column; gap:8px; }
        .if-doc-row { display:flex; align-items:center; gap:10px; padding:10px; background:var(--sunken); border:1px solid var(--panel-border); border-radius:9px; }
        .if-doc-icon { width:30px; height:30px; border-radius:8px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .if-doc-info { flex:1; min-width:0; }
        .if-doc-name { font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .if-doc-meta { font-size:11px; color:var(--muted); }
        .if-doc-folder-select { background:var(--sunken); border:1px solid var(--panel-border); border-radius:8px; padding:7px 10px; color:var(--text); font-size:12px; font-family:inherit; }

        @media (max-width: 860px) {
          .if-two-col { grid-template-columns:1fr; }
          .if-stat-grid { grid-template-columns:repeat(2,1fr); }
          .if-idea-grid { grid-template-columns:1fr; }
          .if-kanban { grid-template-columns:1fr 1fr; }
        }

        @media (max-width: 640px) {
          .if-root { flex-direction:column; min-height:auto; border-radius:0; }
          .if-sidebar { width:100%; flex-direction:row; align-items:center; padding:10px 12px; gap:10px; }
          .if-logo { padding:0; margin-right:auto; }
          .if-logo span { display:none; }
          .if-nav { flex-direction:row; flex:none; gap:4px; }
          .if-nav-item span { display:none; }
          .if-nav-item { padding:8px; }
          .if-sidebar-footer { border-top:none; margin-top:0; padding-top:0; flex-direction:row; margin-left:auto; }
          .if-theme-toggle span, .if-user-name, .if-user-role { display:none; }
          .if-theme-toggle { width:auto; padding:8px; }
          .if-user-chip { gap:0; }

          .if-topbar { flex-direction:column; align-items:flex-start; gap:10px; padding:14px 16px; }
          .if-topbar-actions { width:100%; }
          .if-search { width:100%; }
          .if-search-wrap { flex:1; }
          .if-search-dropdown, .if-notif-dropdown { width:100%; left:0; right:0; }

          .if-content { padding:16px; }
          .if-stat-grid { grid-template-columns:1fr 1fr; }
          .if-kanban { grid-template-columns:1fr; overflow-x:visible; }
          .if-vote-buttons { flex-direction:column; }
          .if-modal { width:94vw; }
        }
      `}</style>

      <Sidebar
        tab={selectedIdea ? "ideas" : selectedWorkspaceId ? "workspaces" : tab}
        setTab={(t) => { setSelectedId(null); setSelectedWorkspaceId(null); setTab(t); }}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        currentUser={currentUser}
        onSignOut={signOut}
      />
      <div>
        {selectedIdea ? (
          <IdeaDetail
            idea={selectedIdea}
            onBack={() => setSelectedId(null)}
            onVote={vote}
            onComment={addComment}
            allIdeas={ideas}
            workspaceData={workspaceData}
            onGoToIdea={setSelectedId}
            onGoToWorkspace={(id) => { setSelectedId(null); setSelectedWorkspaceId(id); }}
            notifications={notifications}
          />
        ) : selectedWorkspaceIdea ? (
          <WorkspaceDetail
            idea={selectedWorkspaceIdea}
            ws={ensureWorkspace(selectedWorkspaceIdea.id)}
            onBack={() => setSelectedWorkspaceId(null)}
            onMoveTask={(taskId, status) => moveTask(selectedWorkspaceIdea.id, taskId, status)}
            onAddTask={(title) => addTask(selectedWorkspaceIdea.id, title)}
            onSendMessage={(text) => sendMessage(selectedWorkspaceIdea.id, text)}
            onUploadDoc={(realDoc) => uploadDoc(selectedWorkspaceIdea.id, realDoc)}
            allIdeas={ideas}
            workspaceData={workspaceData}
            onGoToIdea={(id) => { setSelectedWorkspaceId(null); setSelectedId(id); }}
            onGoToWorkspace={setSelectedWorkspaceId}
            notifications={notifications}
            onOpenNotifications={onOpenNotifications}
            currentUser={currentUser}
            isLive={isLive}
          />
        ) : tab === "dashboard" ? (
          <Dashboard ideas={ideas} setTab={setTab} workspaceData={workspaceData} onGoToIdea={setSelectedId} onGoToWorkspace={setSelectedWorkspaceId} notifications={notifications} onOpenNotifications={onOpenNotifications} />
        ) : tab === "workspaces" ? (
          <Workspaces ideas={ideas} workspaceData={workspaceData} onOpen={setSelectedWorkspaceId} onGoToIdea={setSelectedId} notifications={notifications} onOpenNotifications={onOpenNotifications} />
        ) : tab === "analytics" ? (
          <AnalyticsPage ideas={ideas} workspaceData={workspaceData} onGoToIdea={setSelectedId} onGoToWorkspace={setSelectedWorkspaceId} notifications={notifications} onOpenNotifications={onOpenNotifications} />
        ) : (
          <div>
            <Topbar title="Ideas" onNewIdea={() => setShowNew(true)} ideas={ideas} workspaceData={workspaceData} onGoToIdea={setSelectedId} onGoToWorkspace={setSelectedWorkspaceId} notifications={notifications} onOpenNotifications={onOpenNotifications} />
            <div className="if-content">
              <div className="if-idea-grid">
                {ideas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} onOpen={(i) => setSelectedId(i.id)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showNew && <NewIdeaModal onClose={() => setShowNew(false)} onCreate={createIdea} />}
    </div>
  );
}
