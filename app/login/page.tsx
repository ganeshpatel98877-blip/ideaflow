"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Rocket, Github, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(err);
  }, [searchParams]);

  const oauthLogin = async (provider: "google" | "github") => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  const emailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // No emailRedirectTo here on purpose — we're using the 6-digit code flow
    // below instead of the magic link, which avoids failures when the link
    // is opened in a different browser/session (common in Codespaces where
    // the email client isn't the same browser as the dev server tab).
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setVerifying(false);
    if (error) setError(error.message);
    else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>
            <Rocket size={18} color="#fff" />
          </div>
          <span style={styles.logoText}>IdeaFlow</span>
        </div>

        <h1 style={styles.title}>Sign in</h1>
        <p style={styles.subtitle}>Build your startup, one approved idea at a time.</p>

        <button style={styles.oauthBtn} onClick={() => oauthLogin("google")}>
          <GoogleIcon /> Continue with Google
        </button>
        <button style={styles.oauthBtn} onClick={() => oauthLogin("github")}>
          <Github size={16} /> Continue with GitHub
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine} />
        </div>

        {!sent ? (
          <form onSubmit={emailLogin} style={styles.form}>
            <div style={styles.inputWrap}>
              <Mail size={15} color="#8b91a3" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
            </div>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? <Loader2 size={14} className="spin" /> : null}
              {loading ? "Sending code..." : "Continue with Email"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} style={styles.form}>
            <p style={styles.sentText}>
              We sent a 6-digit code to <strong>{email}</strong>. Enter it
              below — don&apos;t click the link in the email, just use the code.
            </p>
            <div style={styles.inputWrap}>
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ ...styles.input, letterSpacing: 4, textAlign: "center" }}
                maxLength={6}
              />
            </div>
            <button type="submit" style={styles.submitBtn} disabled={verifying}>
              {verifying ? <Loader2 size={14} className="spin" /> : null}
              {verifying ? "Verifying..." : "Verify & Sign in"}
            </button>
            <button
              type="button"
              onClick={() => { setSent(false); setCode(""); setError(null); }}
              style={styles.backBtn}
            >
              Use a different email
            </button>
          </form>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.7 36.4 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#05060a", fontFamily: "Inter, sans-serif" },
  card: { width: 360, background: "#12151e", border: "1px solid #1f2330", borderRadius: 16, padding: 32 },
  logoRow: { display: "flex", alignItems: "center", gap: 9, marginBottom: 28 },
  logoMark: { width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7c6fff,#4b3fce)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#eef0f5", fontWeight: 700, fontSize: 16 },
  title: { color: "#eef0f5", fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  subtitle: { color: "#8b91a3", fontSize: 13, margin: "0 0 24px" },
  oauthBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#0a0c12", border: "1px solid #1f2330", color: "#eef0f5", borderRadius: 8, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: 10 },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "18px 0" },
  dividerLine: { flex: 1, height: 1, background: "#1f2330" },
  dividerText: { color: "#8b91a3", fontSize: 11 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  inputWrap: { display: "flex", alignItems: "center", gap: 8, background: "#0a0c12", border: "1px solid #1f2330", borderRadius: 8, padding: "10px 12px" },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#eef0f5", fontSize: 13.5, fontFamily: "inherit" },
  submitBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#7c6fff", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  sentText: { color: "#c8cad6", fontSize: 13, lineHeight: 1.6, margin: "0 0 4px" },
  backBtn: { background: "transparent", border: "none", color: "#8b91a3", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0, marginTop: 4 },
  error: { color: "#ef5b6b", fontSize: 12.5, marginTop: 14 },
};
