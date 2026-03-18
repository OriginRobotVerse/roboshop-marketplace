"use client";

import { useState } from "react";
import Link from "next/link";
import type { Skill } from "@/lib/types";
import type { PurchaseState } from "@/lib/payments";
import { purchaseSkill, purchaseSkillWithWallet } from "@/lib/payments";
import { useWallet } from "@/lib/wallet-context";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NAVIGATION:    { bg: "rgba(245,166,35,0.08)",  text: "#f5a623", border: "rgba(245,166,35,0.2)"  },
  PERCEPTION:    { bg: "rgba(100,170,210,0.08)", text: "#6ab0d4", border: "rgba(100,170,210,0.2)" },
  MANIPULATION:  { bg: "rgba(91,191,170,0.08)",  text: "#5bbfaa", border: "rgba(91,191,170,0.2)"  },
  COMMUNICATION: { bg: "rgba(170,130,200,0.08)", text: "#aa82c8", border: "rgba(170,130,200,0.2)" },
  SECURITY:      { bg: "rgba(200,100,100,0.08)", text: "#cc6666", border: "rgba(200,100,100,0.2)" },
  PLANNING:      { bg: "rgba(100,180,120,0.08)", text: "#64b478", border: "rgba(100,180,120,0.2)" },
};

export default function SkillCard({ skill }: { skill: Skill }) {
  const cat = CATEGORY_COLORS[skill.category] ?? CATEGORY_COLORS.NAVIGATION;
  const { address, connect } = useWallet();
  const [purchase, setPurchase] = useState<PurchaseState>({ status: 'idle' });

  const handleBuy = async () => {
    if (!address) { connect(); return; }
    await purchaseSkillWithWallet(skill, address as `0x${string}`, setPurchase);
  };

  const buyLabel = () => {
    switch (purchase.status) {
      case 'paying':     return 'Awaiting approval…';
      case 'verifying':  return 'Verifying…';
      case 'success':    return 'Unlocked ✓';
      default:           return `Buy · $${skill.price} USDC`;
    }
  };

  return (
    <div
      className="card"
      style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "0.18rem 0.45rem",
            borderRadius: 2,
            background: cat.bg,
            color: cat.text,
            border: `1px solid ${cat.border}`,
          }}
        >
          {skill.category}
        </span>
        <span style={{ color: "#f5a623", fontSize: "0.95rem", fontWeight: 700 }}>
          ${skill.price}
        </span>
      </div>

      {/* Name + description */}
      <div style={{ flex: 1 }}>
        <h3 style={{ color: "#ffffff", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.4rem", lineHeight: 1.3 }}>
          {skill.name}
        </h3>
        <p
          style={{
            color: "var(--text-dim)",
            fontSize: "0.78rem",
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {skill.description}
        </p>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem", color: "var(--text-muted)" }}>
        <span>@{skill.dev}</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ color: "#f5a623" }}>★</span>
          <span style={{ color: "var(--text-dim)" }}>{skill.rating} ({skill.reviews})</span>
        </span>
      </div>

      <div className="divider" />

      {/* Error message */}
      {purchase.status === 'error' && (
        <p style={{ fontSize: "0.68rem", color: "#cc6666", margin: 0 }}>
          {purchase.message}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Link
          href={`/skills/${skill.id}`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.45rem",
            fontSize: "0.68rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 2,
            transition: "color 0.15s ease",
          }}
        >
          Details
        </Link>
        <button
          onClick={handleBuy}
          disabled={purchase.status === 'paying' || purchase.status === 'verifying' || purchase.status === 'success'}
          className="btn-ghost"
          style={{
            flex: 2,
            opacity: purchase.status === 'paying' || purchase.status === 'verifying' ? 0.6 : 1,
            color: purchase.status === 'success' ? "#5bbfaa" : undefined,
            borderColor: purchase.status === 'success' ? "#5bbfaa" : undefined,
            cursor: purchase.status === 'paying' || purchase.status === 'verifying' ? 'wait' : 'pointer',
          }}
        >
          {!address ? `Connect to Buy` : buyLabel()}
        </button>
      </div>
    </div>
  );
}
