"use client";
export const dynamic = "force-dynamic";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import ScoreGauge from "../components/ScoreGauge";
import WordBar from "../components/WordBar";
import { supabase } from "@/lib/supabaseClient";

/* ─── Types ─────────────────────────────────────────────────────── */
interface FillerWord {
  word: string;
  count: number;
  advice: string;
}
interface RepeatedWord {
  word: string;
  count: number;
  alternatives: string[];
}
interface GrammarMistake {
  mistake: string;
  correction: string;
  explanation: string;
}
interface SentenceImprovement {
  original: string;
  improved: string;
  reason: string;
}
interface FacialExpression {
  type: string;
  timestamp: string;
  analysis: string;
  severity: "low" | "medium" | "high";
}
interface BodyLanguageItem {
  observation: string;
  timestamp: string;
  suggestion: string;
}
interface AnalysisResult {
  overallScore: number;
  summary: string;
  transcript: string;
  fillerWords: FillerWord[];
  repeatedWords: RepeatedWord[];
  grammarMistakes: GrammarMistake[];
  sentenceImprovements: SentenceImprovement[];
  facialExpressions: FacialExpression[];
  bodyLanguage: BodyLanguageItem[];
  suggestions: string[];
  error?: string;
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function SectionCard({
  icon,
  title,
  iconBg,
  children,
  delay = 0,
}: {
  icon: string;
  title: string;
  iconBg: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: "1.5rem",
        animationDelay: `${delay}s`,
        animationFillMode: "both",
      }}
    >
      <div className="section-header">
        <div className="section-icon" style={{ background: iconBg }}>
          {icon}
        </div>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
      ✓ {message}
    </p>
  );
}

function TranscriptPanel({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: 600,
          padding: 0,
          marginBottom: open ? "0.75rem" : 0,
        }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.2s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
        {open ? "Hide transcript" : "Show full transcript"}
      </button>
      {open && (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1rem",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            lineHeight: 1.8,
            maxHeight: "220px",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {text || "No transcript available."}
        </div>
      )}
    </div>
  );
}

/* ─── Progress Stepper ───────────────────────────────────────────── */
const STEPS = ["Preparing", "Uploading", "Analyzing"];

function ProgressStepper({ step, uploadProgress }: { step: number; uploadProgress: number }) {
  // step: 0 = getting upload URL, 1 = uploading to Gemini, 2 = analyzing, done = -1
  return (
    <div style={{ padding: "2rem 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          maxWidth: "480px",
          margin: "0 auto 1.5rem",
        }}
      >
        {STEPS.map((label, i) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}
          >
            <div
              className={`step-dot ${i < step ? "done" : i === step ? "active" : ""}`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`step-line ${i < step ? "done" : i === step ? "active" : ""}`}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", maxWidth: "480px", margin: "0 auto" }}>
        {STEPS.map((label, i) => (
          <span
            key={label}
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color:
                i < step
                  ? "var(--accent-green)"
                  : i === step
                  ? "#a5b4fc"
                  : "var(--text-muted)",
              transition: "color 0.3s",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Upload progress bar (shown during step 1) */}
      {step === 1 && uploadProgress > 0 && (
        <div style={{ maxWidth: "360px", margin: "1.5rem auto 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Uploading to Gemini…</span>
            <span style={{ fontSize: "0.8rem", color: "#a5b4fc", fontWeight: 700 }}>{uploadProgress}%</span>
          </div>
          <div style={{ height: "6px", background: "rgba(99,102,241,0.15)", borderRadius: "99px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${uploadProgress}%`,
                background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))",
                borderRadius: "99px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Spinner */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "1.75rem", gap: "0.75rem" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "3px solid rgba(99,102,241,0.2)",
            borderTopColor: "var(--accent-primary)",
            animation: "spin-smooth 0.9s linear infinite",
          }}
        />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
          {step === 0 ? "Getting a secure upload URL…" :
           step === 1 ? "Uploading your video directly to Gemini…" :
           "AI is analyzing your presentation…"}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          {step === 1
            ? "The video uploads directly — Vercel never touches it"
            : "This may take 30–90 seconds for longer videos"}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function PracticePage() {
  const router = useRouter();

  // Upload state
  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(-1);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100 during video upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Share state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Wire live stream to video element
  useEffect(() => {
    if (liveVideoRef.current && liveStream) {
      liveVideoRef.current.srcObject = liveStream;
    }
  }, [liveStream]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── File selection ── */
  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) {
      setError("Please select a video file (MP4, MOV, AVI, WEBM).");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  /* ── Recording logic ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLiveStream(stream);
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const f = new File([blob], `recording_${Date.now()}.webm`, { type: "video/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setLiveStream(null);
        handleFile(f);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError(
          "Camera/microphone access was blocked. Click the 🔒 lock icon in your browser's address bar → reset permissions → refresh the page and try again."
        );
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        setError("No camera or microphone found. Please connect a camera/mic and try again.");
      } else if (e.name === "NotSupportedError" || e.name === "SecurityError") {
        setError(
          "Live recording requires a secure connection (HTTPS). You're on HTTP — please use localhost:3000 on this PC, or deploy to Vercel for HTTPS access on other devices."
        );
      } else {
        setError(`Camera error: ${e.message || e.name}. Try refreshing the page.`);
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ── Chat logic ── */
  const sendChat = async () => {
    if (!chatInput.trim() || !result) return;
    const userMsg = { role: "user" as const, content: chatInput.trim() };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: JSON.stringify(result), messages: newHistory }),
      });
      const data = await res.json();
      if (data.reply && data.reply.trim()) {
        setChatMessages((prev) => [...prev, { role: "model", content: data.reply }]);
      } else {
        // Show the actual error if there is one, otherwise generic
        const errText = data.error
          ? `Coach error: ${data.error}`
          : "The coach didn't respond. Please try again in a moment.";
        setChatMessages((prev) => [...prev, { role: "model", content: `⚠️ ${errText}` }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "model", content: "⚠️ Network error — please check your connection and try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ── Share logic ── */
  const handleShare = async () => {
    if (!result) return;
    setShareLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: dbErr } = await supabase
        .from("shared_reports")
        .insert({ user_id: user?.id ?? null, feedback: JSON.stringify(result) })
        .select("id")
        .single();
      if (dbErr || !data) throw new Error(dbErr?.message ?? "Insert failed");
      const url = `${window.location.origin}/report/${data.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (e) {
      setError(`Share failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setShareLoading(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  /* ── Analyze ── */
  const handleAnalyze = async () => {
    if (!file) { setError("Please upload a video first."); return; }
    if (file.size > 100 * 1024 * 1024) {
      setError("Video is too large (max 100 MB). Please trim or compress it.");
      return;
    }
    setError(null);
    setResult(null);
    await runAnalysis(file);
  };

  /* ── Core upload + analyze ── */
  const runAnalysis = async (videoFile: File) => {
    const mimeType = videoFile.type || "video/mp4";

    try {
      // STEP 1 & 2: Upload video through our server proxy
      // (Direct browser→Gemini XHR is blocked by CORS — server proxy fixes this)
      setAnalysisStep(1);
      setUploadProgress(5);

      const formData = new FormData();
      formData.append("video", videoFile);

      // Animate progress while upload runs in background
      let prog = 5;
      const ticker = setInterval(() => {
        prog = Math.min(prog + 2, 88);
        setUploadProgress(prog);
      }, 500);

      let proxyRes: Response;
      try {
        proxyRes = await fetch("/api/upload-proxy", {
          method: "POST",
          body: formData,
        });
      } finally {
        clearInterval(ticker);
      }
      setUploadProgress(100);

      const proxyText = await proxyRes.text();
      if (!proxyRes.ok) {
        let msg = proxyText;
        try { msg = (JSON.parse(proxyText) as { error?: string })?.error ?? proxyText; } catch { /* keep raw */ }
        throw new Error(`Upload failed (${proxyRes.status}): ${msg}`);
      }

      const proxyData = JSON.parse(proxyText) as { fileUri: string; fileName: string; mimeType: string };
      const geminiFileName = proxyData.fileName ?? "";
      const geminiFileUri  = proxyData.fileUri  ?? "";

      if (!geminiFileName || !geminiFileUri) {
        throw new Error("Could not get file info from Gemini. Please try again.");
      }

      // STEP 3: Ask our server to analyze using just the file URI
      setAnalysisStep(2);
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUri: geminiFileUri, fileName: geminiFileName, mimeType }),
      });

      // Read as text first so real errors are visible
      const rawText = await analyzeRes.text();
      let data: AnalysisResult;
      try {
        data = JSON.parse(rawText) as AnalysisResult;
      } catch {
        throw new Error(`Server error: ${rawText.slice(0, 300)}`);
      }

      if (data.error && data.overallScore === 0) {
        setError(data.error);
        setAnalysisStep(-1);
        setUploadProgress(0);
        return;
      }

      setResult(data);
      setAnalysisStep(-1);
      setUploadProgress(0);

      // ── Save to Supabase ────────────────────────────────────────
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let videoPublicUrl: string = videoFile.name;
          const ext = videoFile.name.split(".").pop() ?? "mp4";
          const storagePath = `${user.id}/${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

          const { error: storageErr } = await supabase.storage
            .from("presentation-videos")
            .upload(storagePath, videoFile, {
              cacheControl: "3600",
              upsert: false,
              contentType: videoFile.type || `video/${ext}`,
            });

          if (storageErr) {
            setSaveError(`Video stored via Gemini, but Supabase backup failed: ${storageErr.message}`);
          } else {
            const { data: urlData } = supabase.storage
              .from("presentation-videos")
              .getPublicUrl(storagePath);
            videoPublicUrl = urlData.publicUrl;
          }

          const { error: dbErr } = await supabase.from("user_videos").insert({
            user_id: user.id,
            video_url: videoPublicUrl,
            feedback: JSON.stringify(data),
          });

          if (dbErr) {
            setSaveError(`Analysis shown, but dashboard save failed: ${dbErr.message}`);
          } else {
            setSavedToDb(true);
            setTimeout(() => setSavedToDb(false), 5000);
          }
        }
      } catch (saveEx) {
        console.error("Save error:", saveEx);
        setSaveError("Could not save session to dashboard.");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")
          ? "⚠️ Gemini API quota reached. Please wait 1–2 minutes and try again."
          : msg.startsWith("Error:") ? msg : `Error: ${msg}`
      );
      setAnalysisStep(-1);
      setUploadProgress(0);
    }
  };

  const formatBytes = (b: number) =>
    b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  const isLoading = analysisStep >= 0;

  /* ── Filler words max for bar scaling ── */
  const maxFiller = result?.fillerWords?.length
    ? Math.max(...result.fillerWords.map((f) => f.count))
    : 1;
  const maxRepeated = result?.repeatedWords?.length
    ? Math.max(...result.repeatedWords.map((r) => r.count))
    : 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        position: "relative",
      }}
    >
      {/* Ambient orb */}
      <div
        style={{
          position: "fixed",
          top: "-15%",
          right: "-15%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "820px",
          margin: "0 auto",
          padding: "0 1.25rem 4rem",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "1.5rem 0 2rem",
          }}
        >
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              color: "var(--text-muted)",
              fontSize: "0.88rem",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
          >
            ← Back
          </a>
          <div style={{ flex: 1 }} />
          <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-primary)" }}>
            🎤 Present<span className="gradient-text">Pro</span>
          </span>
          {/* Dashboard link */}
          <a
            href="/dashboard"
            style={{
              padding: "0.35rem 0.85rem",
              background: "rgba(99,102,241,0.12)",
              border: "1px solid var(--border-accent)",
              borderRadius: "8px",
              fontSize: "0.82rem",
              color: "#a5b4fc",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Dashboard
          </a>
          {/* Logout */}
          <button
            id="practice-logout-btn"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
              router.refresh();
            }}
            style={{
              padding: "0.35rem 0.85rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "8px",
              color: "#f87171",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
            color: "var(--text-primary)",
          }}
        >
          Practice Session
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
          Upload a video or record directly — then get instant AI coaching.
        </p>

        {/* ── Mode tabs ── */}
        {!isLoading && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "0.25rem" }}>
            {(["upload", "record"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setFile(null); setPreview(null); setError(null); }}
                style={{
                  flex: 1, padding: "0.6rem", borderRadius: "10px", border: "none",
                  cursor: "pointer", fontWeight: 700, fontSize: "0.88rem",
                  transition: "all 0.2s",
                  background: mode === m ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" : "transparent",
                  color: mode === m ? "white" : "var(--text-muted)",
                  boxShadow: mode === m ? "0 0 14px var(--accent-glow)" : "none",
                }}
              >
                {m === "upload" ? "📁 Upload File" : "🎤 Record Live"}
              </button>
            ))}
          </div>
        )}

        {/* ── Upload zone ── */}
        {!isLoading && mode === "upload" && (
          <div
            id="upload-zone"
            className={`drop-zone ${isDragging ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: "2.5rem 1.5rem", textAlign: "center", marginBottom: "1.25rem" }}
          >
            <input ref={fileInputRef} type="file" accept="video/*" onChange={onInputChange} style={{ display: "none" }} id="video-upload-input" />
            {file ? (
              <div onClick={(e) => e.stopPropagation()}>
                {preview && (
                  <video src={preview} controls style={{ width: "100%", maxHeight: "320px", borderRadius: "12px", marginBottom: "1rem", objectFit: "contain", background: "#000" }} />
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.75rem", background: "rgba(99,102,241,0.12)", border: "1px solid var(--border-accent)", borderRadius: "8px", fontSize: "0.85rem", color: "#a5b4fc", fontWeight: 500 }}>
                    🎬 {file.name} <span style={{ color: "var(--text-muted)" }}>({formatBytes(file.size)})</span>
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null); setError(null); }} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "0.35rem 0.75rem", color: "#f87171", fontSize: "0.82rem", cursor: "pointer", fontWeight: 600 }}>Remove</button>
                </div>
                <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Click to change video</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem", filter: isDragging ? "brightness(1.3)" : undefined, transition: "filter 0.2s" }}>🎬</div>
                <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)", marginBottom: "0.4rem" }}>{isDragging ? "Drop it here!" : "Drop your video or click to browse"}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>MP4, MOV, AVI, WEBM • Max 50MB</p>
              </div>
            )}
          </div>
        )}

        {/* ── Record Live zone ── */}
        {!isLoading && mode === "record" && (
          <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.25rem", textAlign: "center" }}>
            {/* Live camera preview */}
            {liveStream && (
              <video ref={liveVideoRef} autoPlay muted playsInline style={{ width: "100%", maxHeight: "280px", borderRadius: "12px", marginBottom: "1rem", objectFit: "cover", background: "#000" }} />
            )}
            {/* Recorded preview */}
            {!liveStream && file && preview && (
              <video src={preview} controls style={{ width: "100%", maxHeight: "280px", borderRadius: "12px", marginBottom: "1rem", objectFit: "contain", background: "#000" }} />
            )}
            {/* Empty state */}
            {!liveStream && !file && (
              <div style={{ padding: "2rem 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🎤</div>
                <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Record your presentation live</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Your camera & microphone will be used</p>
              </div>
            )}
            {/* Timer */}
            {isRecording && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse-glow 1s infinite" }} />
                <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{formatTime(recordingSeconds)}</span>
              </div>
            )}
            {/* Controls */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              {!isRecording && !file && (
                <button className="btn-primary" onClick={startRecording} style={{ padding: "0.7rem 1.5rem" }}>
                  <span>🔴</span> <span>Start Recording</span>
                </button>
              )}
              {isRecording && (
                <button onClick={stopRecording} style={{ padding: "0.7rem 1.5rem", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "10px", color: "#f87171", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                  ⏹ Stop Recording
                </button>
              )}
              {!isRecording && file && (
                <button onClick={() => { setFile(null); setPreview(null); setResult(null); }} style={{ padding: "0.6rem 1.2rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", color: "#f87171", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>🔄 Record Again</button>
              )}
            </div>
          </div>
        )}

        {/* ── Saved-to-dashboard banner ── */}
        {savedToDb && (
          <div
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              color: "#6ee7b7",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ✓ Session saved to your{" "}
            <a href="/dashboard" style={{ color: "#34d399", fontWeight: 700 }}>dashboard</a>
          </div>
        )}

        {/* ── Save error banner ── */}
        {saveError && (
          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              color: "#fbbf24",
              fontSize: "0.875rem",
            }}
          >
            ⚠️ {saveError}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
              color: "#fca5a5",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ── Analyze button ── */}
        {!isLoading && !result && (
          <button
            id="analyze-btn"
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={!file}
            style={{ width: "100%", fontSize: "1rem", padding: "0.9rem" }}
          >
            <span>🔍</span>
            <span>Analyze My Presentation</span>
          </button>
        )}

        {/* ── Loading / progress ── */}
        {isLoading && (
          <div className="glass-card animate-fade-in" style={{ padding: "1.5rem" }}>
            <ProgressStepper step={analysisStep} uploadProgress={uploadProgress} />
          </div>
        )}

        {/* ══════════════════════════════════════ RESULTS ══════════════ */}
        {result && !isLoading && (
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "0.5rem" }}>

            {/* ─ Action buttons row ─ */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button id="reanalyze-btn" className="btn-primary" onClick={handleAnalyze} style={{ flex: 1, padding: "0.75rem" }}>
                <span>🔄</span> <span>Re-analyze</span>
              </button>
              <button
                onClick={handleShare}
                disabled={shareLoading}
                style={{ flex: 1, padding: "0.75rem", background: shareUrl ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.12)", border: `1px solid ${shareUrl ? "rgba(16,185,129,0.4)" : "var(--border-accent)"}`, borderRadius: "10px", color: shareUrl ? "#6ee7b7" : "#a5b4fc", fontWeight: 700, cursor: shareLoading ? "wait" : "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
              >
                {shareLoading ? "⏳ Creating link…" : shareCopied ? "✓ Link copied!" : shareUrl ? "📋 Copy link again" : "📤 Share Report"}
              </button>
            </div>
            {shareUrl && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "10px", padding: "0.75rem 1rem", fontSize: "0.83rem", color: "#6ee7b7", wordBreak: "break-all" }}>
                🔗 <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#34d399" }}>{shareUrl}</a>
              </div>
            )}

            {/* ─ Score + Summary ─ */}
            <div
              className="glass-card animate-fade-in-up"
              style={{
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.25rem",
                animationDelay: "0s",
              }}
            >
              <ScoreGauge score={result.overallScore ?? 0} />
              <div style={{ textAlign: "center", maxWidth: "600px" }}>
                <h2
                  style={{
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    marginBottom: "0.5rem",
                    color: "var(--text-primary)",
                  }}
                >
                  Overall Assessment
                </h2>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
                  {result.summary}
                </p>
              </div>
              {result.transcript && (
                <div style={{ width: "100%" }}>
                  <TranscriptPanel text={result.transcript} />
                </div>
              )}
            </div>

            {/* ─ Filler Words ─ */}
            <SectionCard icon="🗣️" title="Filler Words" iconBg="rgba(99,102,241,0.15)" delay={0.05}>
              {result.fillerWords?.length > 0 ? (
                <div>
                  <div style={{ marginBottom: "1rem" }}>
                    {result.fillerWords.map((fw, i) => (
                      <WordBar
                        key={fw.word}
                        word={fw.word}
                        count={fw.count}
                        maxCount={maxFiller}
                        color="#6366f1"
                        delay={i * 0.05}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {result.fillerWords.map((fw) => (
                      <div
                        key={fw.word}
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          display: "flex",
                          gap: "0.4rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ color: "#6366f1", fontWeight: 700, flexShrink: 0 }}>
                          &ldquo;{fw.word}&rdquo;
                        </span>
                        — {fw.advice}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState message="No significant filler words detected. Great job!" />
              )}
            </SectionCard>

            {/* ─ Repeated Words ─ */}
            <SectionCard icon="🔁" title="Repeated Words" iconBg="rgba(139,92,246,0.15)" delay={0.1}>
              {result.repeatedWords?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ marginBottom: "0.5rem" }}>
                    {result.repeatedWords.map((rw, i) => (
                      <WordBar
                        key={rw.word}
                        word={rw.word}
                        count={rw.count}
                        maxCount={maxRepeated}
                        color="#8b5cf6"
                        delay={i * 0.05}
                      />
                    ))}
                  </div>
                  {result.repeatedWords.map((rw) => (
                    <div
                      key={rw.word}
                      style={{
                        background: "rgba(139,92,246,0.06)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        borderRadius: "10px",
                        padding: "0.75rem",
                        fontSize: "0.88rem",
                      }}
                    >
                      <span style={{ color: "#c084fc", fontWeight: 700 }}>
                        &ldquo;{rw.word}&rdquo;
                      </span>{" "}
                      <span style={{ color: "var(--text-muted)" }}>
                        used {rw.count}× — try replacing with:
                      </span>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.4rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        {rw.alternatives?.map((alt) => (
                          <span
                            key={alt}
                            style={{
                              padding: "0.2rem 0.6rem",
                              background: "rgba(139,92,246,0.12)",
                              border: "1px solid rgba(139,92,246,0.3)",
                              borderRadius: "6px",
                              color: "#c084fc",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No overused words detected. Your vocabulary is varied!" />
              )}
            </SectionCard>

            {/* ─ Grammar Mistakes ─ */}
            <SectionCard icon="✏️" title="Grammar Mistakes" iconBg="rgba(239,68,68,0.12)" delay={0.15}>
              {result.grammarMistakes?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {result.grammarMistakes.map((gm, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                        <div className="diff-mistake">{gm.mistake}</div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            color: "var(--text-muted)",
                            fontSize: "1.1rem",
                          }}
                        >
                          →
                        </div>
                        <div className="diff-correction">{gm.correction}</div>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "0.25rem" }}>
                        {gm.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No grammar mistakes found. Excellent language use!" />
              )}
            </SectionCard>

            {/* ─ Sentence Improvements ─ */}
            <SectionCard icon="💼" title="Sentence Improvements" iconBg="rgba(16,185,129,0.12)" delay={0.2}>
              {result.sentenceImprovements?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {result.sentenceImprovements.map((si, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "1rem",
                      }}
                    >
                      <div style={{ marginBottom: "0.6rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "#f87171",
                          }}
                        >
                          Original
                        </span>
                        <p
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.9rem",
                            marginTop: "0.3rem",
                            fontStyle: "italic",
                          }}
                        >
                          &ldquo;{si.original}&rdquo;
                        </p>
                      </div>
                      <div style={{ marginBottom: "0.6rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "#6ee7b7",
                          }}
                        >
                          More Professional
                        </span>
                        <p
                          style={{
                            color: "var(--text-primary)",
                            fontSize: "0.9rem",
                            marginTop: "0.3rem",
                            fontWeight: 600,
                          }}
                        >
                          &ldquo;{si.improved}&rdquo;
                        </p>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                        💡 {si.reason}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Your sentences are already professional and polished!" />
              )}
            </SectionCard>

            {/* ─ Facial Expressions ─ */}
            <SectionCard icon="😊" title="Facial Expressions" iconBg="rgba(245,158,11,0.12)" delay={0.25}>
              {result.facialExpressions?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {result.facialExpressions.map((fe, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "0.85rem 1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                          {fe.type}
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {fe.timestamp}
                          </span>
                          <span className={`badge badge-${fe.severity ?? "medium"}`}>
                            {fe.severity}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: "0.87rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        {fe.analysis}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Your facial expressions look natural and engaging!" />
              )}
            </SectionCard>

            {/* ─ Body Language ─ */}
            <SectionCard icon="🤸" title="Body Language" iconBg="rgba(6,182,212,0.12)" delay={0.3}>
              {result.bodyLanguage?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {result.bodyLanguage.map((bl, i) => (
                    <div
                      key={i}
                      style={{
                        borderLeft: "3px solid var(--accent-cyan)",
                        paddingLeft: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                          {bl.observation}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", flexShrink: 0 }}>
                          {bl.timestamp}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", fontWeight: 500 }}>
                        💡 {bl.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Your body language is confident and appropriate!" />
              )}
            </SectionCard>

            {/* ─ Top Suggestions ─ */}
            {result.suggestions?.length > 0 && (
              <SectionCard icon="✅" title="Top Suggestions" iconBg="rgba(16,185,129,0.15)" delay={0.35}>
                <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", padding: 0 }}>
                  {result.suggestions.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          width: "24px",
                          height: "24px",
                          borderRadius: "6px",
                          background: "rgba(16,185,129,0.15)",
                          border: "1px solid rgba(16,185,129,0.3)",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#6ee7b7",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </SectionCard>
            )}

            {/* ══════ AI CHAT COACH ══════ */}
            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setChatOpen((o) => !o)}
                style={{ width: "100%", padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: chatOpen ? "1px solid var(--border)" : "none" }}
              >
                <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  💬 Ask Your AI Coach
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", background: "rgba(99,102,241,0.15)", border: "1px solid var(--border-accent)", borderRadius: "99px", color: "#a5b4fc" }}>BETA</span>
                </span>
                <span style={{ color: "var(--text-muted)", transition: "transform 0.2s", display: "inline-block", transform: chatOpen ? "rotate(180deg)" : "none" }}>▼</span>
              </button>

              {chatOpen && (
                <div style={{ display: "flex", flexDirection: "column", height: "420px" }}>
                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {chatMessages.length === 0 && (
                      <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤖</div>
                        <p>Ask me anything about your presentation!</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", marginTop: "0.75rem" }}>
                          {["How do I reduce filler words?", "What was my biggest weakness?", "Give me a weekly practice plan"].map((q) => (
                            <button key={q} onClick={() => { setChatInput(q); }} style={{ padding: "0.3rem 0.75rem", background: "rgba(99,102,241,0.1)", border: "1px solid var(--border-accent)", borderRadius: "99px", color: "#a5b4fc", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>{q}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "80%", padding: "0.65rem 0.9rem", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" : "rgba(255,255,255,0.05)", border: msg.role === "user" ? "none" : "1px solid var(--border)", color: msg.role === "user" ? "white" : "var(--text-secondary)", fontSize: "0.87rem", lineHeight: 1.6 }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.83rem" }}>
                        <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "var(--accent-primary)", borderRadius: "50%", animation: "spin-smooth 0.7s linear infinite" }} />
                        Coach is thinking…
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Input */}
                  <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem" }}>
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                      placeholder="Ask your coach anything…"
                      style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.6rem 0.85rem", color: "var(--text-primary)", fontSize: "0.88rem", outline: "none" }}
                    />
                    <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="btn-primary" style={{ padding: "0.6rem 1rem", fontSize: "0.88rem" }}>Send</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}