"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number; // 0–100
}

function getScoreColor(score: number) {
  if (score >= 75) return "#10b981"; // green
  if (score >= 50) return "#f59e0b"; // yellow
  return "#ef4444"; // red
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Developing";
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const [animated, setAnimated] = useState(0);

  // Animate score counter
  useEffect(() => {
    let start = 0;
    const step = score / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= score) {
        setAnimated(score);
        clearInterval(timer);
      } else {
        setAnimated(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  // Only fill the bottom 75% arc (270 degrees)
  const arcLength = circumference * 0.75;
  const progress = (score / 100) * arcLength;
  const gap = arcLength - progress;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <svg
        width="220"
        height="180"
        viewBox="0 0 220 200"
        style={{ overflow: "visible" }}
      >
        {/* Outer subtle ring */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="18"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={-circumference * 0.125}
          strokeLinecap="round"
        />
        {/* Track */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="14"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={-circumference * 0.125}
          strokeLinecap="round"
        />
        {/* Progress fill */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={`${progress} ${gap + circumference * 0.25}`}
          strokeDashoffset={-circumference * 0.125}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 10px ${color}80)`,
            animation: "score-draw 1.4s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        />

        {/* Score number */}
        <text
          x="110"
          y="105"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize="44"
          fontWeight="800"
          fontFamily="var(--font-inter), Inter, sans-serif"
          style={{ filter: `drop-shadow(0 0 12px ${color}60)` }}
        >
          {animated}
        </text>

        {/* /100 label */}
        <text
          x="110"
          y="138"
          textAnchor="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize="13"
          fontWeight="500"
          fontFamily="var(--font-inter), Inter, sans-serif"
        >
          out of 100
        </text>
      </svg>

      {/* Label badge */}
      <span
        style={{
          padding: "0.3rem 1rem",
          borderRadius: "99px",
          background: `${color}20`,
          border: `1px solid ${color}40`,
          color: color,
          fontSize: "0.85rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          marginTop: "-0.5rem",
        }}
      >
        {label}
      </span>
    </div>
  );
}
