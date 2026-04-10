/**
 * app/report/[id]/page.tsx
 * -------------------------
 * Public shareable report page — no login required.
 */

export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Feedback {
  overallScore?: number;
  summary?: string;
  fillerWords?: { word: string; count: number; advice?: string }[];
  repeatedWords?: { word: string; count: number; alternatives?: string[] }[];
  grammarMistakes?: { mistake: string; correction: string; explanation?: string }[];
  sentenceImprovements?: { original: string; improved: string; reason?: string }[];
  facialExpressions?: { type: string; timestamp: string; analysis: string }[];
  bodyLanguage?: { observation: string; timestamp: string; suggestion: string }[];
  suggestions?: string[];
}

function scoreColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export default async function SharedReportPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from("shared_reports")
    .select("feedback, created_at")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();

  let fb: Feedback = {};
  try { fb = JSON.parse(data.feedback as string); } catch { /* ignore */ }

  const score = fb.overallScore ?? 0;
  const date = new Date(data.created_at as string).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const tag = (label: string, key: string) => (
    <span key={key} style={{ padding: "0.2rem 0.6rem", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "6px", fontSize: "0.82rem", color: "#a5b4fc", fontWeight: 600, display: "inline-block", margin: "0.15rem" }}>{label}</span>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", fontFamily: "Inter, system-ui, sans-serif", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(99,102,241,0.2)", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>
          🎤 Present<span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pro</span>
        </span>
        <a href="/" style={{ fontSize: "0.82rem", color: "#a5b4fc", textDecoration: "none", fontWeight: 600 }}>Try PresentPro →</a>
      </div>

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2rem 1.25rem 5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.3rem" }}>Presentation Analysis Report</h1>
        <p style={{ color: "#64748b", fontSize: "0.88rem", marginBottom: "2.5rem" }}>Shared on {date}</p>

        {/* Score */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "2rem", textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "4rem", fontWeight: 900, color: scoreColor(score), lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.25rem" }}>Overall Score / 100</div>
          {fb.summary && <p style={{ marginTop: "1.25rem", color: "#94a3b8", lineHeight: 1.7, fontSize: "0.92rem" }}>{fb.summary}</p>}
        </div>

        {/* Filler Words */}
        {fb.fillerWords && fb.fillerWords.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#475569", marginBottom: "0.75rem" }}>🗣️ Filler Words</p>
            <div>{fb.fillerWords.map((fw) => tag(`"${fw.word}" × ${fw.count}`, fw.word))}</div>
          </div>
        )}

        {/* Grammar Mistakes */}
        {fb.grammarMistakes && fb.grammarMistakes.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#475569", marginBottom: "0.75rem" }}>✏️ Grammar Mistakes</p>
            {fb.grammarMistakes.map((gm, i) => (
              <div key={i} style={{ marginBottom: "0.5rem" }}>
                <span style={{ color: "#f87171", textDecoration: "line-through" }}>{gm.mistake}</span>
                <span style={{ color: "#64748b", margin: "0 0.4rem" }}>→</span>
                <span style={{ color: "#6ee7b7" }}>{gm.correction}</span>
                {gm.explanation && <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.15rem" }}>{gm.explanation}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Repeated Words */}
        {fb.repeatedWords && fb.repeatedWords.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#475569", marginBottom: "0.75rem" }}>🔁 Repeated Words</p>
            {fb.repeatedWords.map((rw, i) => (
              <p key={i} style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "0.3rem" }}>
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>&ldquo;{rw.word}&rdquo;</span> ×{rw.count}
                {rw.alternatives && rw.alternatives.length > 0 && <span style={{ color: "#64748b" }}> → try: {rw.alternatives.join(", ")}</span>}
              </p>
            ))}
          </div>
        )}

        {/* Body Language */}
        {fb.bodyLanguage && fb.bodyLanguage.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#475569", marginBottom: "0.75rem" }}>🤸 Body Language</p>
            {fb.bodyLanguage.map((bl, i) => (
              <div key={i} style={{ marginBottom: "0.6rem" }}>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}><span style={{ color: "#a5b4fc", fontWeight: 600 }}>{bl.timestamp}</span> — {bl.observation}</p>
                <p style={{ fontSize: "0.8rem", color: "#6ee7b7" }}>→ {bl.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {fb.suggestions && fb.suggestions.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#475569", marginBottom: "0.75rem" }}>✅ Top Suggestions</p>
            <ol style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {fb.suggestions.map((s, i) => <li key={i} style={{ fontSize: "0.88rem", color: "#94a3b8" }}>{s}</li>)}
            </ol>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ color: "#475569", fontSize: "0.82rem" }}>
            Generated by <a href="/" style={{ color: "#a5b4fc", fontWeight: 600, textDecoration: "none" }}>🎤 PresentPro</a> · AI Presentation Coach
          </p>
          <a href="/signup" style={{ display: "inline-block", marginTop: "0.75rem", padding: "0.6rem 1.5rem", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "8px", color: "white", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
            Analyze your own presentation →
          </a>
        </div>
      </div>
    </div>
  );
}
