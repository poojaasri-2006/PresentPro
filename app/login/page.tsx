/**
 * app/login/page.tsx
 * -------------------
 * Login page – email + password authentication via Supabase.
 * On success → redirects to /dashboard (or the page the user was on before).
 */

"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where to redirect after login (respects ?redirectedFrom= param set by middleware)
  const redirectTo = searchParams.get("redirectedFrom") ?? "/dashboard";

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Login succeeded — navigate to the protected page
      router.push(redirectTo);
      router.refresh(); // force Next.js to reload server components with new session
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Background orbs matching the app design */}
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
          <h1 style={styles.heading}>Welcome back</h1>
          <p style={styles.subheading}>Sign in to your account to continue</p>

          <form onSubmit={handleLogin} style={styles.form}>
            {/* Email */}
            <div style={styles.field}>
              <label htmlFor="email" style={styles.label}>
                Email address
              </label>
              <input
                id="email"
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
              <label htmlFor="password" style={styles.label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
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
              id="login-btn"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {loading ? (
                <>
                  <span style={styles.spinner} />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Footer link */}
          <p style={styles.footer}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={styles.link}>
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline styles (matches the existing dark design system) ──────── */
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
