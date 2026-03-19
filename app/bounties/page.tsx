"use client";

import { useState } from "react";
import BountyCard from "@/components/bounty-card";
import { BOUNTIES, PLATFORM_STATS } from "@/lib/mock-data";
import type { Bounty, BountyStatus } from "@/lib/types";
import { useWallet } from "@/lib/wallet-context";
import { postBounty, submitSkill, type BountyTxState } from "@/lib/escrow";

type Filter = BountyStatus | "ALL";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All",        value: "ALL"       },
  { label: "Open",       value: "OPEN"      },
  { label: "In Review",  value: "IN_REVIEW" },
  { label: "Completed",  value: "COMPLETED" },
];

export default function BountiesPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const { address, connect } = useWallet();

  // Post bounty form state
  const [postForm, setPostForm] = useState({ title: '', description: '', amount: '', days: '14' });
  const [postTx, setPostTx] = useState<BountyTxState>({ status: 'idle' });

  // Submit skill form state
  const [submitForm, setSubmitForm] = useState({ skillUri: '', notes: '' });
  const [submitTx, setSubmitTx] = useState<BountyTxState>({ status: 'idle' });

  const handlePostBounty = async () => {
    if (!address) { connect(); return; }
    const amount = parseFloat(postForm.amount);
    const days   = parseInt(postForm.days);
    if (!postForm.title || !amount || !days) return;
    if (days < 7) {
      setPostTx({ status: 'error', message: 'Minimum duration is 7 days (contract enforced).' });
      return;
    }

    const metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify({
      title: postForm.title,
      description: postForm.description,
    }))}`;

    await postBounty(
      { address: address as `0x${string}`, amountUsdc: amount, metadataUri, timeoutDays: days },
      (s) => {
        setPostTx(s);
        if (s.status === 'success') {
          setTimeout(() => { setShowPostModal(false); setPostTx({ status: 'idle' }); }, 2000);
        }
      },
    );
  };

  const handleSubmitSkill = async () => {
    if (!address) { connect(); return; }
    if (!selectedBounty || !submitForm.skillUri) return;

    await submitSkill(
      { address: address as `0x${string}`, bountyId: BigInt(selectedBounty.id), skillUri: submitForm.skillUri },
      (s) => {
        setSubmitTx(s);
        if (s.status === 'success') {
          setTimeout(() => { setShowSubmitModal(false); setSubmitTx({ status: 'idle' }); }, 2000);
        }
      },
    );
  };

  const visible = filter === "ALL"
    ? BOUNTIES
    : BOUNTIES.filter((b) => b.status === filter);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              color: "rgba(245,166,35,0.5)",
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Origin Protocol · Bounty Board
          </div>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 2rem)",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            Build skills.{" "}
            <span style={{ color: "#f5a623" }}>Earn USDC.</span>
          </h1>
          <p
            style={{
              color: "var(--text-dim)",
              fontSize: "0.85rem",
              marginTop: "0.5rem",
              maxWidth: 440,
              lineHeight: 1.6,
            }}
          >
            Manufacturers post bounties for capabilities they need. Developers build and
            submit. Funds locked in escrow — released on approval.
          </p>
        </div>
        <button
          className="btn-ghost"
          style={{ alignSelf: "flex-start", padding: "0.65rem 1.25rem" }}
          onClick={() => setShowPostModal(true)}
        >
          + Post Bounty
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1px",
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.10)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Open Bounties",  value: PLATFORM_STATS.openBounties                               },
          { label: "USDC Locked",    value: `$${PLATFORM_STATS.totalBountyUsdc.toLocaleString()}`     },
          { label: "Avg Payout",     value: `$${Math.round(PLATFORM_STATS.totalBountyUsdc / PLATFORM_STATS.openBounties).toLocaleString()}` },
          { label: "Total Posted",   value: BOUNTIES.length                                            },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--bg-card)", padding: "1rem 1.25rem" }}>
            <div
              className="mono"
              style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}
            >
              {label}
            </div>
            <div className="mono" style={{ color: "#f5a623", fontSize: "1.4rem", fontWeight: 700 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.75rem" }}>
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            className="mono"
            onClick={() => setFilter(value)}
            style={{
              padding: "0.35rem 0.8rem",
              fontSize: "0.68rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 2,
              border: `1px solid ${filter === value ? "rgba(245,166,35,0.35)" : "rgba(245,166,35,0.10)"}`,
              background: filter === value ? "rgba(245,166,35,0.10)" : "transparent",
              color: filter === value ? "#f5a623" : "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bounty grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1rem",
        }}
      >
        {visible.map((bounty) => (
          <BountyCard
            key={bounty.id}
            bounty={bounty}
            onSubmit={(b) => {
              setSelectedBounty(b);
              setShowSubmitModal(true);
            }}
          />
        ))}
      </div>

      {/* POST BOUNTY MODAL */}
      {showPostModal && (
        <Modal title="Post a Bounty" onClose={() => setShowPostModal(false)}>
          <ModalField label="Skill Title" placeholder="e.g. Warehouse Inventory Scanner"
            value={postForm.title} onChange={(v) => setPostForm(f => ({ ...f, title: v }))} />
          <ModalField label="Description" placeholder="Describe the required skill, test conditions, and expected output..."
            textarea value={postForm.description} onChange={(v) => setPostForm(f => ({ ...f, description: v }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <ModalField label="Amount (USDC)" placeholder="e.g. 2500"
              value={postForm.amount} onChange={(v) => setPostForm(f => ({ ...f, amount: v }))} />
            <ModalField label="Duration (days, min 7)" placeholder="e.g. 14"
              value={postForm.days} onChange={(v) => setPostForm(f => ({ ...f, days: v }))} />
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
              Funds locked in the Origin Escrow contract on Base until you approve a submission
              or the deadline passes. Fee: 15% ({"<"}$1K) · 10% ({">"}=$1K).
            </p>
            {postTx.status === 'error' && (
              <p style={{ fontSize: "0.68rem", color: "#cc6666", marginBottom: "0.75rem" }}>{postTx.message}</p>
            )}
            <button
              className="btn-ghost"
              style={{ width: "100%", opacity: postTx.status === 'posting' ? 0.6 : 1 }}
              disabled={postTx.status === 'approving' || postTx.status === 'posting'}
              onClick={handlePostBounty}
            >
              {postTx.status === 'approving' ? 'Approving USDC… (1/2)'
                : postTx.status === 'posting' ? 'Posting Bounty… (2/2)'
                : postTx.status === 'success' ? 'Bounty Posted ✓'
                : address ? 'Lock Funds & Post Bounty'
                : 'Connect to Post'}
            </button>
          </div>
        </Modal>
      )}

      {/* SUBMIT SKILL MODAL */}
      {showSubmitModal && selectedBounty && (
        <Modal
          title={`Submit Skill · ${selectedBounty.title}`}
          onClose={() => setShowSubmitModal(false)}
        >
          <div
            className="mono"
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(245,166,35,0.05)",
              border: "1px solid rgba(245,166,35,0.15)",
              borderRadius: 3,
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.08em" }}>BOUNTY</span>
              <span style={{ color: "#f5a623", fontSize: "0.9rem", fontWeight: 700 }}>
                ${selectedBounty.amount.toLocaleString()} USDC
              </span>
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
              {selectedBounty.manufacturer} · {selectedBounty.daysLeft}d remaining
            </div>
          </div>
          <ModalField label="Skill Package URI (IPFS)" placeholder="ipfs://Qm..."
            value={submitForm.skillUri} onChange={(v) => setSubmitForm(f => ({ ...f, skillUri: v }))} />
          <ModalField label="Notes for Reviewer" placeholder="Describe your implementation approach..."
            textarea value={submitForm.notes} onChange={(v) => setSubmitForm(f => ({ ...f, notes: v }))} />
          {submitTx.status === 'error' && (
            <p style={{ fontSize: "0.68rem", color: "#cc6666" }}>{submitTx.message}</p>
          )}
          <button
            className="btn-ghost"
            style={{ width: "100%", marginTop: "0.5rem", opacity: submitTx.status === 'submitting' ? 0.6 : 1 }}
            disabled={submitTx.status === 'submitting'}
            onClick={handleSubmitSkill}
          >
            {submitTx.status === 'submitting' ? 'Submitting…'
              : submitTx.status === 'success' ? 'Submitted ✓'
              : address ? 'Submit Skill'
              : 'Connect to Submit'}
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Shared modal primitives (local to this page)
   ────────────────────────────────────────────────── */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(245,166,35,0.25)",
          borderRadius: 4,
          padding: "1.75rem",
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          boxShadow: "0 0 40px rgba(245,166,35,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2
            style={{ color: "var(--text)", fontSize: "0.95rem", fontWeight: 600 }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1.2rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div className="divider" />
        {children}
      </div>
    </div>
  );
}

function ModalField({
  label,
  placeholder,
  textarea,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  textarea?: boolean;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const sharedStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(245,166,35,0.03)",
    border: "1px solid rgba(245,166,35,0.12)",
    borderRadius: 2,
    color: "var(--text)",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.8rem",
    padding: "0.6rem 0.75rem",
    outline: "none",
    resize: "none" as const,
    marginTop: "0.4rem",
  };

  return (
    <div>
      <label style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </label>
      {textarea ? (
        <textarea rows={3} placeholder={placeholder} style={sharedStyle}
          value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} />
      ) : (
        <input type="text" placeholder={placeholder} style={sharedStyle}
          value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} />
      )}
    </div>
  );
}
