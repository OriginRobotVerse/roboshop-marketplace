"use client";

import type { Bounty } from "@/lib/types";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  OPEN:      { bg: "rgba(245,166,35,0.08)",  text: "#f5a623", border: "rgba(245,166,35,0.25)",  label: "OPEN"      },
  IN_REVIEW: { bg: "rgba(100,170,210,0.08)", text: "#6ab0d4", border: "rgba(100,170,210,0.25)", label: "IN REVIEW" },
  COMPLETED: { bg: "rgba(80,80,80,0.08)",    text: "#555555", border: "rgba(80,80,80,0.25)",    label: "COMPLETED" },
};

interface Props {
  bounty: Bounty;
  onSubmit?: (bounty: Bounty) => void;
}

export default function BountyCard({ bounty, onSubmit }: Props) {
  const st = STATUS_STYLES[bounty.status];

  return (
    <div
      className="card"
      style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            padding: "0.18rem 0.5rem",
            borderRadius: 2,
            background: st.bg,
            color: st.text,
            border: `1px solid ${st.border}`,
          }}
        >
          {st.label}
        </span>
        <span style={{ color: "#f5a623", fontSize: "1.05rem", fontWeight: 700 }}>
          ${bounty.amount.toLocaleString()}
          <span style={{ color: "rgba(245,166,35,0.45)", fontSize: "0.68rem", fontWeight: 400 }}>
            {" "}USDC
          </span>
        </span>
      </div>

      {/* Title + description */}
      <div>
        <h3
          style={{
            color: "#ffffff",
            fontSize: "0.9rem",
            fontWeight: 600,
            marginBottom: "0.45rem",
            lineHeight: 1.3,
          }}
        >
          {bounty.title}
        </h3>
        <p
          style={{
            color: "var(--text-dim)",
            fontSize: "0.77rem",
            lineHeight: 1.65,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {bounty.description}
        </p>
      </div>

      {/* Meta */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0.5rem",
          fontSize: "0.65rem",
        }}
      >
        <div>
          <div style={{ color: "var(--text-muted)", marginBottom: 3 }}>POSTED BY</div>
          <div style={{ color: "var(--text-dim)" }}>{bounty.manufacturer}</div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)", marginBottom: 3 }}>EXPIRES</div>
          <div
            style={{
              color:
                bounty.daysLeft !== null && bounty.daysLeft <= 3
                  ? "#cc6666"
                  : "var(--text-dim)",
            }}
          >
            {bounty.daysLeft !== null ? `${bounty.daysLeft}d` : "—"}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--text-muted)", marginBottom: 3 }}>SUBMISSIONS</div>
          <div style={{ color: "var(--text-dim)" }}>{bounty.submissions}</div>
        </div>
      </div>

      {/* Divider */}
      <div className="divider" />

      {/* Action */}
      {bounty.status === "OPEN" ? (
        <button
          className="btn-ghost"
          style={{ width: "100%", textAlign: "center" }}
          onClick={() => onSubmit?.(bounty)}
        >
          Submit Skill
        </button>
      ) : bounty.status === "IN_REVIEW" ? (
        <div
          style={{
            textAlign: "center",
            fontSize: "0.65rem",
            color: "#6ab0d4",
            letterSpacing: "0.06em",
          }}
        >
          Under review by {bounty.manufacturer}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
          }}
        >
          Bounty awarded ✓
        </div>
      )}
    </div>
  );
}
