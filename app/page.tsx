"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const features = [
  {
    icon: "🎙️",
    label: "Filler Words",
    desc: "Counts every 'um', 'uh', 'like' and tells you exactly how many times",
    color: "#6366f1",
  },
  {
    icon: "🔁",
    label: "Word Repetition",
    desc: "Spots overused words with counts and offers professional alternatives",
    color: "#8b5cf6",
  },
  {
    icon: "✏️",
    label: "Grammar Check",
    desc: "Identifies grammatical errors with corrections and clear explanations",
    color: "#06b6d4",
  },
  {
    icon: "💼",
    label: "Professionalism",
    desc: "Rewrites weak sentences into powerful, executive-level language",
    color: "#10b981",
  },
  {
    icon: "😊",
    label: "Facial Expressions",
    desc: "Analyzes smiling, expressions, and non-verbal cues throughout your talk",
    color: "#f59e0b",
  },
  {
    icon: "🤸",
    label: "Body Language",
    desc: "Reviews eye contact, posture, gestures and movement patterns",
    color: "#ef4444",
  },
];

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const meta = user.user_metadata as { full_name?: string } | undefined;
        setUserName(meta?.full_name ?? user.email?.split("@")[0] ?? "there");
      }
    });
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ambient background orbs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
          }}
        />
      </div>

      <div
        style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}
      >
        {/* ── Nav ── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.5rem 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.6rem" }}>🎤</span>
            <span
              style={{
                fontWeight: 800,
                fontSize: "1.25rem",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Present<span className="gradient-text">Pro</span>
            </span>
          </div>
          <span
            style={{
              padding: "0.3rem 0.9rem",
              borderRadius: "99px",
              border: "1px solid var(--border-accent)",
              background: "rgba(99,102,241,0.1)",
              fontSize: "0.78rem",
              color: "#a5b4fc",
              fontWeight: 600,
            }}
          >
            Powered by Gemini AI
          </span>
          {/* Nav right side — changes based on auth state */}
          {userName ? (
            // Logged-in: show name + dashboard button
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                👋 Hi, <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{userName}</span>!
              </span>
              <a
                href="/dashboard"
                style={{
                  padding: "0.3rem 0.9rem", borderRadius: "8px",
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  fontSize: "0.82rem", color: "white", fontWeight: 600,
                  textDecoration: "none", boxShadow: "0 0 14px var(--accent-glow)",
                }}
              >
                Dashboard
              </a>
            </div>
          ) : (
            // Guest: show login + dashboard links
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <a
                href="/login"
                style={{
                  padding: "0.3rem 0.9rem", borderRadius: "8px",
                  border: "1px solid var(--border)", fontSize: "0.82rem",
                  color: "var(--text-secondary)", fontWeight: 600,
                  textDecoration: "none", transition: "border-color 0.2s",
                }}
              >
                Login
              </a>
              <a
                href="/dashboard"
                style={{
                  padding: "0.3rem 0.9rem", borderRadius: "8px",
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  fontSize: "0.82rem", color: "white", fontWeight: 600,
                  textDecoration: "none", boxShadow: "0 0 14px var(--accent-glow)",
                }}
              >
                Dashboard
              </a>
            </div>
          )}
        </nav>

        {/* ── Hero ── */}
        <section
          style={{
            textAlign: "center",
            padding: "5rem 0 3rem",
          }}
        >
          {/* Mic icon */}
          <div
            className="animate-float"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "88px",
              height: "88px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              fontSize: "2.6rem",
              marginBottom: "2rem",
              boxShadow: "0 0 40px var(--accent-glow), 0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            🎤
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              marginBottom: "1.25rem",
              color: "var(--text-primary)",
            }}
          >
            Your AI-Powered{" "}
            <span className="gradient-text">Presentation Coach</span>
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
            }}
          >
            Upload your presentation video. Gemini AI watches it and gives you
            deep, structured feedback — from filler words and grammar to facial
            expressions and professional language.
          </p>

          <button
            id="start-practice-btn"
            className="btn-primary animate-pulse-glow"
            onClick={() => router.push("/practice")}
            style={{ fontSize: "1.05rem", padding: "0.9rem 2.5rem" }}
          >
            <span>🚀</span>
            <span>Analyze My Presentation</span>
          </button>

          <p style={{ marginTop: "1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Supports MP4, MOV, AVI, WEBM • Up to 50MB
          </p>
        </section>

        {/* ── Feature Grid ── */}
        <section style={{ paddingBottom: "5rem" }}>
          <p
            style={{
              textAlign: "center",
              fontSize: "0.82rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "2rem",
            }}
          >
            What you&apos;ll get
          </p>
          <div
            className="stagger"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {features.map((f) => (
              <div
                key={f.label}
                className="glass-card animate-fade-in-up"
                style={{ padding: "1.5rem" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: `${f.color}1a`,
                      border: `1px solid ${f.color}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.3rem",
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: "0.3rem", color: "var(--text-primary)" }}>
                      {f.label}
                    </p>
                    <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}