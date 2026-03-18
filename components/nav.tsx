"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, shortAddress } from "@/lib/wallet-context";

const LINKS = [
  { href: "/",          label: "Marketplace" },
  { href: "/bounties",  label: "Bounties"    },
  { href: "/dashboard", label: "Dashboard"   },
];

export default function Nav() {
  const pathname = usePathname();
  const { address, connecting, connect, disconnect } = useWallet();

  return (
    <header
      style={{
        background: "rgba(17,17,17,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 1.5rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#f5a623", fontSize: "1.1rem", fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ color: "#ffffff", fontWeight: 500, fontSize: "0.88rem", letterSpacing: "0.05em" }}>
              origin
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.65rem", letterSpacing: "0.08em", marginTop: 1 }}>
              / skills
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", gap: "0.1rem" }}>
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.72rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  borderRadius: 2,
                  color: active ? "#f5a623" : "rgba(255,255,255,0.45)",
                  background: "transparent",
                  transition: "color 0.15s ease",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet button */}
        {address ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.85rem",
                border: "1px solid rgba(245,166,35,0.3)",
                borderRadius: 2,
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.04em",
              }}
            >
              <span className="dot-amber" />
              {shortAddress(address)}
            </div>
            <button
              onClick={disconnect}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 2,
                color: "rgba(255,255,255,0.3)",
                fontSize: "0.68rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.35rem 0.6rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#cc4444";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(204,68,68,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={connecting}
            style={{
              background: "transparent",
              border: "1px solid #f5a623",
              borderRadius: 2,
              color: "#f5a623",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.35rem 0.85rem",
              cursor: connecting ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              opacity: connecting ? 0.6 : 1,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!connecting)
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,166,35,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <span className="dot-amber" />
            {connecting ? "Connecting…" : "Connect"}
          </button>
        )}
      </div>
    </header>
  );
}
