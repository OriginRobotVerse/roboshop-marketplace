"use client";

import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { useWallet } from "@/lib/wallet-context";
import { purchaseSkill, type PurchaseState } from "@/lib/payments";
import type { Skill } from "@/lib/types";

const CATEGORY_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  NAVIGATION:    { text: "#f5a623", border: "rgba(245,166,35,0.25)",   bg: "rgba(245,166,35,0.06)"   },
  PERCEPTION:    { text: "#00aaff", border: "rgba(0,170,255,0.25)",    bg: "rgba(0,170,255,0.06)"    },
  MANIPULATION:  { text: "#ffaa00", border: "rgba(255,170,0,0.25)",    bg: "rgba(255,170,0,0.06)"    },
  COMMUNICATION: { text: "#aa00ff", border: "rgba(170,0,255,0.25)",    bg: "rgba(170,0,255,0.06)"    },
  SECURITY:      { text: "#ff4444", border: "rgba(255,68,68,0.25)",    bg: "rgba(255,68,68,0.06)"    },
  PLANNING:      { text: "#00ffc8", border: "rgba(0,255,200,0.25)",    bg: "rgba(0,255,200,0.06)"    },
};

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { address, connect } = useWallet();
  const [skill,    setSkill]    = useState<Skill | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [purchase, setPurchase] = useState<PurchaseState>({ status: 'idle' });

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((skills: Array<{
        id: string; name: string; category: Skill['category']; description: string;
        longDescription: string; price: string; devAddress: string; devUsername: string;
        rating: string; reviews: number; downloads: number; version: string;
        compatibleDevices: string[]; tags: string[]; appstoreUrl: string;
      }>) => {
        const row = skills.find((s) => s.id === id);
        if (!row) { notFound(); return; }
        setSkill({
          id: row.id,
          name: row.name,
          category: row.category,
          description: row.description,
          longDescription: row.longDescription,
          price: parseFloat(row.price),
          dev: row.devUsername || row.devAddress.slice(0, 8),
          devAddress: row.devAddress,
          rating: parseFloat(row.rating ?? '0'),
          reviews: row.reviews,
          downloads: row.downloads,
          version: row.version,
          compatibleDevices: row.compatibleDevices,
          tags: row.tags,
          appstoreUrl: row.appstoreUrl,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!address) { connect(); return; }
    if (!skill) return;
    await purchaseSkill(skill, setPurchase);
  };

  const buyLabel = () => {
    switch (purchase.status) {
      case 'paying':    return 'Awaiting approval…';
      case 'verifying': return 'Verifying…';
      case 'success':   return 'Skill Unlocked ✓';
      default:          return address ? 'Buy with Base Pay' : 'Connect to Buy';
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Loading…</div>
      </div>
    );
  }

  if (!skill) return null;

  const cat = CATEGORY_COLORS[skill.category] ?? CATEGORY_COLORS.NAVIGATION;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "2rem", alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Breadcrumb */}
          <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
            <a href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Marketplace</a>
            <span style={{ margin: "0 0.4rem" }}>/</span>
            <span style={{ color: "#f5a623" }}>{skill.name}</span>
          </div>

          {/* Title block */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span className="mono" style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", padding: "0.2rem 0.5rem", borderRadius: 2, background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
                {skill.category}
              </span>
              <span className="mono" style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>v{skill.version}</span>
            </div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.2, marginBottom: "0.75rem" }}>{skill.name}</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "1rem", lineHeight: 1.65 }}>{skill.description}</p>
          </div>

          {skill.longDescription && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "1.5rem" }}>
              <h2 className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>Overview</h2>
              <p style={{ color: "var(--text-dim)", fontSize: "0.88rem", lineHeight: 1.75 }}>{skill.longDescription}</p>
            </div>
          )}

          {skill.compatibleDevices.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "1.5rem" }}>
              <h2 className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>Compatible Devices</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {skill.compatibleDevices.map((device) => (
                  <span key={device} className="mono" style={{ fontSize: "0.72rem", padding: "0.3rem 0.65rem", borderRadius: 2, background: "rgba(245,166,35,0.04)", border: "1px solid rgba(245,166,35,0.12)", color: "var(--text-dim)" }}>{device}</span>
                ))}
              </div>
            </div>
          )}

          {skill.tags.length > 0 && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {skill.tags.map((tag) => (
                <span key={tag} className="mono" style={{ fontSize: "0.65rem", padding: "0.18rem 0.5rem", borderRadius: 2, background: "transparent", border: "1px solid rgba(245,166,35,0.08)", color: "var(--text-muted)", letterSpacing: "0.05em" }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right column — purchase card */}
        <div style={{ background: "var(--bg-card)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: 76, boxShadow: "0 0 30px rgba(245,166,35,0.04)" }}>
          <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
            <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", marginBottom: "0.4rem" }}>ONE-TIME PURCHASE</div>
            <div className="mono" style={{ color: "#f5a623", fontSize: "2.2rem", fontWeight: 700 }}>
              ${skill.price}<span style={{ color: "rgba(245,166,35,0.5)", fontSize: "1rem" }}> USDC</span>
            </div>
          </div>

          <div className="divider" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "Rating",    value: skill.rating > 0 ? `★ ${skill.rating}` : '—' },
              { label: "Reviews",   value: skill.reviews   },
              { label: "Downloads", value: skill.downloads },
              { label: "Version",   value: `v${skill.version}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>{label}</div>
                <div className="mono" style={{ color: "var(--text-dim)", fontSize: "0.82rem", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="divider" />

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="mono" style={{ color: "#f5a623", fontSize: "0.7rem", fontWeight: 700 }}>
                {skill.dev[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div>
              <div className="mono" style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>@{skill.dev}</div>
              <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>Developer</div>
            </div>
          </div>

          <div className="divider" />

          {purchase.status === 'error' && (
            <p style={{ fontSize: "0.68rem", color: "#cc6666", textAlign: "center" }}>{purchase.message}</p>
          )}
          <button
            className="btn-ghost"
            disabled={purchase.status === 'paying' || purchase.status === 'verifying' || purchase.status === 'success'}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.82rem", opacity: purchase.status === 'paying' || purchase.status === 'verifying' ? 0.6 : 1, color: purchase.status === 'success' ? "#5bbfaa" : undefined, borderColor: purchase.status === 'success' ? "#5bbfaa" : undefined, cursor: purchase.status === 'paying' || purchase.status === 'verifying' ? 'wait' : 'pointer' }}
            onClick={handleBuy}
          >
            {buyLabel()}
          </button>
          <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
            USDC on Base · Instant settlement · Non-custodial
          </p>
        </div>
      </div>
    </div>
  );
}
