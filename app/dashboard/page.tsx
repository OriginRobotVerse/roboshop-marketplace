"use client";

import { useState } from "react";
import { SKILLS, BOUNTIES } from "@/lib/mock-data";

const MY_SKILLS = SKILLS.slice(0, 3);
const MY_SUBMISSIONS = [
  { bountyId: "3", bounty: BOUNTIES[2], status: "IN_REVIEW",  submittedAt: "2026-03-12", skillUri: "ipfs://Qm1abc..." },
  { bountyId: "4", bounty: BOUNTIES[3], status: "COMPLETED",  submittedAt: "2026-02-10", skillUri: "ipfs://Qm2def..." },
];

const TABS = ["Overview", "My Skills", "Submissions"] as const;
type Tab = (typeof TABS)[number];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const totalEarned   = MY_SKILLS.reduce((acc, s) => acc + s.price * Math.floor(s.downloads * 0.3), 0);
  const bountyEarned  = 1620; // 90% of $1,800 bounty
  const totalRevenue  = totalEarned + bountyEarned;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          className="mono"
          style={{ color: "rgba(245,166,35,0.5)", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}
        >
          Origin Protocol · Developer Dashboard
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(245,166,35,0.12)",
              border: "1px solid rgba(245,166,35,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="mono" style={{ color: "#f5a623", fontSize: "0.9rem", fontWeight: 700 }}>R</span>
          </div>
          <div>
            <h1 style={{ color: "var(--text)", fontSize: "1.3rem", fontWeight: 600 }}>@robodev_ko</h1>
            <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.06em" }}>
              <span className="dot-amber" style={{ marginRight: "0.4rem" }} />
              Active · Base Sepolia
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1px",
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.10)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Total Earned",    value: `$${totalRevenue.toLocaleString()}`, sub: "USDC" },
          { label: "Skills Listed",   value: MY_SKILLS.length,                    sub: "active" },
          { label: "Total Downloads", value: MY_SKILLS.reduce((a, s) => a + s.downloads, 0).toLocaleString(), sub: "installs" },
          { label: "Bounties Won",    value: 1,                                   sub: "completed" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "var(--bg-card)", padding: "1rem 1.25rem" }}>
            <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              {label}
            </div>
            <div className="mono" style={{ color: "#f5a623", fontSize: "1.4rem", fontWeight: 700 }}>
              {value}
            </div>
            <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.75rem", borderBottom: "1px solid rgba(245,166,35,0.08)", paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className="mono"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.55rem 1rem",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #f5a623" : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab ? "#f5a623" : "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              marginBottom: -1,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && <OverviewTab totalRevenue={totalRevenue} />}
      {activeTab === "My Skills" && <MySkillsTab />}
      {activeTab === "Submissions" && <SubmissionsTab />}
    </div>
  );
}

function OverviewTab({ totalRevenue }: { totalRevenue: number }) {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const bars   = [120, 340, 280, 560, 410, 780];
  const max    = Math.max(...bars);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Revenue chart */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "1.5rem",
        }}
      >
        <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          Revenue (USDC) — last 6 months
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", height: 120 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", height: "100%" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${(h / max) * 100}%`,
                    background: i === bars.length - 1 ? "#f5a623" : "rgba(245,166,35,0.2)",
                    borderRadius: "2px 2px 0 0",
                    transition: "background 0.2s",
                    minHeight: 4,
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: "0.58rem", color: "var(--text-muted)" }}>{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <span className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Recent Transactions
          </span>
        </div>
        {[
          { type: "SALE",   skill: "Obstacle Avoidance v2.1", amount: "+$3.50",  date: "Mar 17", buyer: "0xabc…" },
          { type: "SALE",   skill: "Patrol Route Manager",     amount: "+$5.60",  date: "Mar 16", buyer: "0xdef…" },
          { type: "BOUNTY", skill: "Voice-Controlled Arm",     amount: "+$1,620", date: "Mar 10", buyer: "RoboArm Labs" },
          { type: "SALE",   skill: "Obstacle Avoidance v2.1", amount: "+$3.50",  date: "Mar 09", buyer: "0xghi…" },
        ].map((tx, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem 1.25rem",
              borderBottom: i < 3 ? "1px solid rgba(245,166,35,0.05)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span
                className="mono"
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  padding: "0.18rem 0.45rem",
                  borderRadius: 2,
                  background: tx.type === "BOUNTY" ? "rgba(255,170,0,0.08)" : "rgba(245,166,35,0.06)",
                  color: tx.type === "BOUNTY" ? "#ffaa00" : "#f5a623",
                  border: `1px solid ${tx.type === "BOUNTY" ? "rgba(255,170,0,0.2)" : "rgba(245,166,35,0.15)"}`,
                }}
              >
                {tx.type}
              </span>
              <div>
                <div style={{ color: "var(--text)", fontSize: "0.82rem" }}>{tx.skill}</div>
                <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>from {tx.buyer}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ color: "#f5a623", fontSize: "0.88rem", fontWeight: 600 }}>{tx.amount}</div>
              <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>{tx.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MySkillsTab() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {["Skill", "Category", "Price", "Downloads", "Revenue"].map((h) => (
          <span key={h} className="mono" style={{ color: "var(--text-muted)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {h}
          </span>
        ))}
      </div>
      {MY_SKILLS.map((skill, i) => (
        <div
          key={skill.id}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            padding: "1rem 1.25rem",
            borderBottom: i < MY_SKILLS.length - 1 ? "1px solid rgba(245,166,35,0.05)" : "none",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ color: "var(--text)", fontSize: "0.85rem" }}>{skill.name}</div>
            <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>v{skill.version}</div>
          </div>
          <span className="mono" style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{skill.category}</span>
          <span className="mono" style={{ color: "#f5a623", fontSize: "0.82rem" }}>${skill.price}</span>
          <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>{skill.downloads.toLocaleString()}</span>
          <span className="mono" style={{ color: "#f5a623", fontSize: "0.82rem" }}>
            ${(skill.price * Math.floor(skill.downloads * 0.3) * 0.7).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

function SubmissionsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {MY_SUBMISSIONS.map((sub) => (
        <div
          key={sub.bountyId}
          className="card"
          style={{ padding: "1.25rem" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <h3 style={{ color: "var(--text)", fontSize: "0.92rem", fontWeight: 600 }}>
              {sub.bounty.title}
            </h3>
            <span
              className="mono"
              style={{
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "0.18rem 0.45rem",
                borderRadius: 2,
                background: sub.status === "COMPLETED" ? "rgba(245,166,35,0.08)" : "rgba(255,170,0,0.08)",
                color:      sub.status === "COMPLETED" ? "#f5a623"            : "#ffaa00",
                border:     `1px solid ${sub.status === "COMPLETED" ? "rgba(245,166,35,0.2)" : "rgba(255,170,0,0.2)"}`,
              }}
            >
              {sub.status === "IN_REVIEW" ? "IN REVIEW" : "WON ✓"}
            </span>
          </div>
          <div
            className="mono"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", fontSize: "0.65rem" }}
          >
            <div>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>BOUNTY</div>
              <div style={{ color: "#f5a623" }}>${sub.bounty.amount.toLocaleString()} USDC</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>SUBMITTED</div>
              <div style={{ color: "var(--text-dim)" }}>{sub.submittedAt}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>SKILL URI</div>
              <div style={{ color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sub.skillUri}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
