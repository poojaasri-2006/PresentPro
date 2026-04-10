"use client";

interface WordBarProps {
  word: string;
  count: number;
  maxCount: number;
  color?: string;
  delay?: number;
}

export default function WordBar({
  word,
  count,
  maxCount,
  color = "#6366f1",
  delay = 0,
}: WordBarProps) {
  const pct = maxCount > 0 ? Math.max(4, (count / maxCount) * 100) : 4;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 0",
      }}
    >
      {/* Word label */}
      <span
        style={{
          width: "90px",
          flexShrink: 0,
          fontWeight: 600,
          fontSize: "0.9rem",
          color: "var(--text-primary)",
          fontFamily: "monospace",
        }}
      >
        &ldquo;{word}&rdquo;
      </span>

      {/* Bar track */}
      <div
        style={{
          flex: 1,
          height: "10px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          className="word-bar-inner"
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}99)`,
            borderRadius: "99px",
            boxShadow: `0 0 8px ${color}60`,
            animationDelay: `${delay}s`,
            animationFillMode: "both",
          }}
        />
      </div>

      {/* Count badge */}
      <span
        style={{
          width: "38px",
          textAlign: "right",
          flexShrink: 0,
          fontWeight: 700,
          fontSize: "0.88rem",
          color: color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ×{count}
      </span>
    </div>
  );
}
