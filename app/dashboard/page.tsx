/**
 * app/dashboard/page.tsx
 * ----------------------
 * Shows all videos the logged-in user has analysed.
 * Features personalised greeting ("Hi, [Name]!") and full AI feedback cards.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface UserVideo {
  id: string;
  video_url: string | null;
  feedback: string | null; // stored as JSON string
  created_at: string;
}

interface FeedbackJson {
  overallScore?: number;
  summary?: string;
  transcript?: string;
  fillerWords?: { word: string; count: number; advice?: string }[];
  repeatedWords?: { word: string; count: number; alternatives?: string[] }[];
  grammarMistakes?: { mistake: string; correction: string; explanation?: string }[];
  sentenceImprovements?: { original: string; improved: string; reason?: string }[];
  facialExpressions?: { type: string; timestamp: string; analysis: string; severity?: string }[];
  bodyLanguage?: { observation: string; timestamp: string; suggestion: string }[];
  suggestions?: string[];
}

/* ─── Helper: parse feedback JSON safely ────────────────────────────── */
function parseFeedback(raw: string | null): FeedbackJson {
  if (!raw) return {};
  try { return JSON.parse(raw) as FeedbackJson; } catch { return {}; }
}

/* ─── Score colour ────────────────────────────────────────────────────── */
function scoreColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

/* ─── Section block ──────────────────────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={cardStyles.infoBox}>
      <p style={cardStyles.infoLabel}>{label}</p>
      <div style={{ marginTop: "0.5rem" }}>{children}</div>
    </div>
  );
}

/* ─── Video Card ─────────────────────────────────────────────────────── */
function VideoCard({ video }: { video: UserVideo }) {
  const [open, setOpen] = useState(false);
  const fb = parseFeedback(video.feedback);
  const score = fb.overallScore ?? 0;
  const date = new Date(video.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // Detect whether video_url is a real hosted URL or just a filename
  const isRealUrl = video.video_url?.startsWith("https://");
  const displayName = isRealUrl
    ? (video.video_url!.split("/").pop()?.split("?")[0]?.replace(/^\d+_/, "") ?? "Recording")
    : (video.video_url ?? "Presentation session");

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: "1.5rem" }}>
      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
            🎬 {displayName}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{date}</p>
        </div>

        {/* Score badge */}
        <div style={{
          minWidth: "64px", textAlign: "center",
          background: `${scoreColor(score)}18`,
          border: `1px solid ${scoreColor(score)}44`,
          borderRadius: "12px", padding: "0.5rem 0.85rem",
        }}>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>{score}</p>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>score</p>
        </div>
      </div>

      {/* ── Inline video player (only for real stored videos) ── */}
      {isRealUrl && (
        <div style={{ marginTop: "1rem" }}>
          <video
            src={video.video_url!}
            controls
            preload="metadata"
            style={{
              width: "100%",
              maxHeight: "300px",
              borderRadius: "12px",
              objectFit: "contain",
              background: "#000",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Summary */}
      {fb.summary && (
        <p style={{ marginTop: "1rem", fontSize: "0.87rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {fb.summary}
        </p>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          marginTop: "1rem", background: "none", border: "none",
          color: "#a5b4fc", fontSize: "0.83rem", fontWeight: 600,
          cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.35rem",
        }}
      >
        <span style={{ transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
        {open ? "Hide details" : "View full feedback"}
      </button>

      {open && (
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>

          {/* Transcript */}
          {fb.transcript && (
            <Section label="📄 Transcript">
              <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.7, maxHeight: "110px", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fb.transcript.slice(0, 450)}{fb.transcript.length > 450 ? "…" : ""}
              </p>
            </Section>
          )}

          {/* Filler words */}
          {fb.fillerWords && fb.fillerWords.length > 0 && (
            <Section label="🗣️ Filler Words">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {fb.fillerWords.map((fw) => (
                  <span key={fw.word} style={cardStyles.tag}>
                    &ldquo;{fw.word}&rdquo; × {fw.count}
                  </span>
                ))}
              </div>
              {fb.fillerWords[0]?.advice && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  💡 {fb.fillerWords[0].advice}
                </p>
              )}
            </Section>
          )}

          {/* Repeated words */}
          {fb.repeatedWords && fb.repeatedWords.length > 0 && (
            <Section label="🔁 Repeated Words">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {fb.repeatedWords.map((rw, i) => (
                  <p key={i} style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#fbbf24", fontWeight: 600 }}>&ldquo;{rw.word}&rdquo;</span>
                    {" "}×{rw.count}
                    {rw.alternatives && rw.alternatives.length > 0 && (
                      <span style={{ color: "var(--text-muted)" }}> → try: {rw.alternatives.join(", ")}</span>
                    )}
                  </p>
                ))}
              </div>
            </Section>
          )}

          {/* Grammar mistakes */}
          {fb.grammarMistakes && fb.grammarMistakes.length > 0 && (
            <Section label="✏️ Grammar Mistakes">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {fb.grammarMistakes.map((gm, i) => (
                  <div key={i}>
                    <p style={{ fontSize: "0.83rem" }}>
                      <span style={{ color: "#f87171", textDecoration: "line-through" }}>{gm.mistake}</span>
                      {" → "}
                      <span style={{ color: "#6ee7b7" }}>{gm.correction}</span>
                    </p>
                    {gm.explanation && (
                      <p style={{ fontSize: "0.77rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{gm.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Sentence improvements */}
          {fb.sentenceImprovements && fb.sentenceImprovements.length > 0 && (
            <Section label="💼 Sentence Improvements">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {fb.sentenceImprovements.map((si, i) => (
                  <div key={i} style={{ borderLeft: "2px solid rgba(99,102,241,0.3)", paddingLeft: "0.75rem" }}>
                    <p style={{ fontSize: "0.81rem", color: "#f87171", marginBottom: "0.15rem" }}>Before: {si.original}</p>
                    <p style={{ fontSize: "0.81rem", color: "#6ee7b7" }}>After: {si.improved}</p>
                    {si.reason && <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{si.reason}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Facial expressions */}
          {fb.facialExpressions && fb.facialExpressions.length > 0 && (
            <Section label="😊 Facial Expressions">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {fb.facialExpressions.map((fe, i) => (
                  <p key={i} style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                    <span style={{ color: "#a5b4fc", fontWeight: 600 }}>{fe.timestamp}</span>
                    {" — "}
                    <span style={{ fontWeight: 600 }}>{fe.type}</span>: {fe.analysis}
                  </p>
                ))}
              </div>
            </Section>
          )}

          {/* Body language */}
          {fb.bodyLanguage && fb.bodyLanguage.length > 0 && (
            <Section label="🤸 Body Language">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {fb.bodyLanguage.map((bl, i) => (
                  <div key={i}>
                    <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: "#a5b4fc", fontWeight: 600 }}>{bl.timestamp}</span>
                      {" — "}{bl.observation}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "#6ee7b7", marginTop: "0.1rem" }}>→ {bl.suggestion}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Suggestions */}
          {fb.suggestions && fb.suggestions.length > 0 && (
            <Section label="💡 Top Suggestions">
              <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {fb.suggestions.map((s, i) => (
                  <li key={i} style={{ fontSize: "0.83rem", color: "var(--text-secondary)" }}>{s}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Get name from user_metadata (set at signup) or fall back to email prefix
      const meta = user.user_metadata as { full_name?: string } | undefined;
      const name = meta?.full_name ?? user.email?.split("@")[0] ?? null;
      setUserName(name);
      setUserEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("user_videos")
        .select("id, video_url, feedback, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setVideos(data as UserVideo[]);
      setLoading(false);
    }
    loadData();
  }, [router]);

  async function handleLogout() {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Greeting based on time of day
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative" }}>
      {/* Ambient orbs */}
      <div style={{ position: "fixed", top: "-15%", right: "-15%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", padding: "0 1.25rem 4rem" }}>

        {/* ── Nav ── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 0 2rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-primary)" }}>
              🎤 Present<span className="gradient-text">Pro</span>
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {userEmail && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userEmail}
              </span>
            )}
            <Link href="/practice" style={pageStyles.navBtn}>+ New Session</Link>
            <button id="logout-btn" onClick={handleLogout} disabled={logoutLoading} style={pageStyles.logoutBtn}>
              {logoutLoading ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </nav>

        {/* ── Personalised greeting ── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "0.4rem" }}>
            {userName
              ? <>{timeGreeting}, <span className="gradient-text">{userName}</span>! 👋</>
              : <>Your Dashboard 👋</>
            }
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {videos.length > 0
              ? `You have ${videos.length} presentation session${videos.length === 1 ? "" : "s"} — keep it up!`
              : "Welcome! Upload your first presentation video to get started."}
          </p>
        </div>

        {/* ── Stats strip (shown once there are sessions) ── */}
        {!loading && videos.length > 0 && (() => {
          const scores = videos.map(v => parseFeedback(v.feedback).overallScore ?? 0);
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          const best = Math.max(...scores);
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
              {[
                { label: "Sessions", value: videos.length, icon: "🎬" },
                { label: "Avg Score", value: `${avg}/100`, icon: "📊" },
                { label: "Best Score", value: `${best}/100`, icon: "🏆" },
              ].map(stat => (
                <div key={stat.label} className="glass-card" style={{ padding: "1rem", textAlign: "center" }}>
                  <p style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>{stat.icon}</p>
                  <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>{stat.value}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "120px", borderRadius: "16px" }} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && videos.length === 0 && (
          <div className="glass-card" style={{ padding: "3rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎬</div>
            <h2 style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>No sessions yet</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Upload your first presentation video to get AI-powered coaching.
            </p>
            <Link href="/practice">
              <button className="btn-primary"><span>🚀</span> <span>Start Practice Session</span></button>
            </Link>
          </div>
        )}

        {/* ── Video cards ── */}
        {!loading && videos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */
const pageStyles: Record<string, React.CSSProperties> = {
  navBtn: {
    display: "inline-flex", alignItems: "center",
    padding: "0.4rem 1rem",
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white", fontWeight: 600, fontSize: "0.85rem",
    borderRadius: "8px", textDecoration: "none",
    boxShadow: "0 0 14px var(--accent-glow)",
  },
  logoutBtn: {
    padding: "0.4rem 1rem",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "8px", color: "#f87171",
    fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  infoBox: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid var(--border)",
    borderRadius: "10px", padding: "0.85rem",
  },
  infoLabel: {
    fontSize: "0.78rem", fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em", color: "var(--text-muted)",
    marginBottom: "0.1rem",
  },
  tag: {
    padding: "0.2rem 0.6rem",
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.25)",
    borderRadius: "6px", fontSize: "0.8rem",
    color: "#a5b4fc", fontWeight: 600,
  },
};
