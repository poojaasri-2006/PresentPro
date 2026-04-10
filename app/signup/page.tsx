/**
 * app/signup/page.tsx
 * --------------------
 * Signup page – creates a new Supabase account with email + password.
 * After signup → shows a "check your email" confirmation (or auto-redirects
 * to /dashboard if email confirmation is disabled in Supabase).
 */

"use client";
export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic password length check
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName.trim() },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // If Supabase auto-confirms the user (email confirmation disabled),
      // a session is returned immediately → redirect to dashboard.
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      // Otherwise, email confirmation required → show success message.
      setSuccess(true);
      setLoading(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      if (message.includes("Failed to fetch") || message.includes("fetch")) {
        setError(
          "Could not reach the authentication server. Please check your internet connection and try again."
        );
      } else {
        setError(message);
      }
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Background orbs */}
      <div style={styles.orbTopLeft} />
      <div style={styles.orbBottomRight} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={{ fontSize: "2rem" }}>🎤</span>
          <span style={styles.logoText}>
            Present<span className="gradient-text">Pro</span>
          </span>
        </div>

        <div className="glass-card" style={styles.card}>
          {success ? (
            /* ── Success state ── */
            <div style={styles.successBox}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📬</div>
              <h2 style={{ ...styles.heading, marginBottom: "0.5rem" }}>
                Check your inbox!
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
                We sent a confirmation link to{" "}
                <strong style={{ color: "var(--text-primary)" }}>{email}</strong>. Click it
                to activate your account and get started.
              </p>
              <Link href="/login" style={{ ...styles.link, display: "inline-block", marginTop: "1.5rem" }}>
                ← Back to Login
              </Link>
            </div>
          ) : (
            /* ── Signup form ── */
            <>
              <h1 style={styles.heading}>Create your account</h1>
              <p style={styles.subheading}>Start improving your presentations today</p>

              <form onSubmit={handleSignup} style={styles.form}>
                {/* Full Name */}
                <div style={styles.field}>
                  <label htmlFor="signup-name" style={styles.label}>
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    style={styles.input}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
                {/* Email */}
                <div style={styles.field}>
                  <label htmlFor="signup-email" style={styles.label}>
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={styles.input}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Password */}
                <div style={styles.field}>
                  <label htmlFor="signup-password" style={styles.label}>
                    Password{" "}
                    <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                      (min. 6 characters)
                    </span>
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={styles.input}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>

                {/* Error message */}
                {error && (
                  <div style={styles.errorBox}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  id="signup-btn"
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: "100%", marginTop: "0.5rem" }}
                >
                  {loading ? (
                    <>
                      <span style={styles.spinner} />
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              <p style={styles.footer}>
                Already have an account?{" "}
                <Link href="/login" style={styles.link}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-base)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "1.5rem",
  },
  orbTopLeft: {
    position: "fixed",
    top: "-20%",
    left: "-10%",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  orbBottomRight: {
    position: "fixed",
    bottom: "-20%",
    right: "-10%",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  logoText: {
    fontWeight: 800,
    fontSize: "1.4rem",
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  card: {
    width: "100%",
    padding: "2rem",
  },
  successBox: {
    textAlign: "center",
    padding: "1rem 0",
  },
  heading: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.03em",
    marginBottom: "0.35rem",
  },
  subheading: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: "1.75rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  label: {
    fontSize: "0.83rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "0.7rem 0.9rem",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s",
    width: "100%",
  },
  errorBox: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "10px",
    padding: "0.75rem 1rem",
    color: "#fca5a5",
    fontSize: "0.875rem",
  },
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin-smooth 0.7s linear infinite",
  },
  footer: {
    textAlign: "center",
    marginTop: "1.5rem",
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  link: {
    color: "#a5b4fc",
    textDecoration: "none",
    fontWeight: 600,
  },
};
