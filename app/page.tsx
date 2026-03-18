import SkillCard from "@/components/skill-card";
import { SKILLS, PLATFORM_STATS } from "@/lib/mock-data";

export default function MarketplacePage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Hero */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div
          className="mono"
          style={{
            color: "rgba(245,166,35,0.5)",
            fontSize: "0.7rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.6rem",
          }}
        >
          Origin Protocol · Skill Marketplace
        </div>
        <h1
          style={{
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.2,
            marginBottom: "0.75rem",
          }}
        >
          Deploy robot capabilities{" "}
          <span style={{ color: "#f5a623" }}>instantly</span>
        </h1>
        <p
          style={{
            color: "var(--text-dim)",
            fontSize: "0.95rem",
            maxWidth: 540,
            lineHeight: 1.65,
          }}
        >
          Browse skills built by the Origin developer community. Purchase with USDC,
          deploy to any compatible runtime in minutes.
        </p>
      </div>

      {/* Platform stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1px",
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.10)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: "2.5rem",
        }}
      >
        {[
          { label: "Skills Listed",  value: PLATFORM_STATS.totalSkills                    },
          { label: "Volume (USDC)",  value: `$${PLATFORM_STATS.totalVolume.toLocaleString()}` },
          { label: "Active Devs",    value: PLATFORM_STATS.activeDevs                     },
          { label: "Open Bounties",  value: PLATFORM_STATS.openBounties                   },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--bg-card)",
              padding: "1rem 1.25rem",
            }}
          >
            <div
              className="mono"
              style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}
            >
              {label}
            </div>
            <div
              className="mono"
              style={{ color: "#f5a623", fontSize: "1.4rem", fontWeight: 700 }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
        }}
      >
        {["ALL", "NAVIGATION", "MANIPULATION", "PERCEPTION", "COMMUNICATION", "SECURITY", "PLANNING"].map(
          (cat) => (
            <button
              key={cat}
              className="mono"
              style={{
                padding: "0.35rem 0.8rem",
                fontSize: "0.68rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderRadius: 2,
                border: `1px solid ${cat === "ALL" ? "rgba(245,166,35,0.35)" : "rgba(245,166,35,0.10)"}`,
                background: cat === "ALL" ? "rgba(245,166,35,0.10)" : "transparent",
                color: cat === "ALL" ? "#f5a623" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* Skills grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: "1rem",
        }}
      >
        {SKILLS.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>

      {/* Footer note */}
      <div
        className="mono"
        style={{
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid rgba(245,166,35,0.08)",
          color: "var(--text-muted)",
          fontSize: "0.68rem",
          letterSpacing: "0.05em",
          textAlign: "center",
        }}
      >
        Payments processed via Base Pay · USDC on Base · Non-custodial splits
      </div>
    </div>
  );
}
