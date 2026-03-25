"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/lib/wallet-context";
import { approveBounty, type BountyTxState } from "@/lib/escrow";
import type { SkillCategory } from "@/lib/types";

const TABS = ["Overview", "My Skills", "Submissions", "Posted Bounties"] as const;
type Tab = (typeof TABS)[number];

const CATEGORIES: SkillCategory[] = ["NAVIGATION", "MANIPULATION", "PERCEPTION", "COMMUNICATION", "SECURITY", "PLANNING"];

interface DbSkill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  price: string;
  devAddress: string;
  devUsername: string;
  version: string;
  downloads: number;
}

interface DbBounty {
  id: string;
  onChainId: string | null;
  title: string;
  description: string;
  amount: string;
  manufacturerAddress: string;
  status: 'OPEN' | 'IN_REVIEW' | 'COMPLETED';
  createdAt: string;
}

interface DbSubmission {
  id: string;
  bountyId: string;
  onChainSubmissionId: string | null;
  devAddress: string;
  skillUri: string;
  notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const { address, connect } = useWallet();

  const [mySkills,      setMySkills]      = useState<DbSkill[]>([]);
  const [mySubmissions, setMySubmissions] = useState<(DbSubmission & { bountyTitle: string; bountyAmount: string })[]>([]);
  const [myBounties,    setMyBounties]    = useState<DbBounty[]>([]);

  const [submissionsByBounty, setSubmissionsByBounty] = useState<Record<string, DbSubmission[]>>({});
  const [approveTx,  setApproveTx]  = useState<BountyTxState>({ status: 'idle' });
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Post skill form
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillForm, setSkillForm] = useState({
    name: '', category: 'NAVIGATION' as SkillCategory, description: '',
    longDescription: '', price: '', version: '1.0.0',
    compatibleDevices: '', tags: '', appstoreUrl: '',
  });
  const [skillPosting, setSkillPosting] = useState(false);
  const [skillError,   setSkillError]   = useState('');

  const load = useCallback(async () => {
    if (!address) return;
    const addr = address.toLowerCase();

    const [skillsRes, bountiesRes] = await Promise.all([
      fetch('/api/skills'),
      fetch('/api/bounties'),
    ]);

    const allSkills: DbSkill[]   = await skillsRes.json();
    const allBounties: DbBounty[] = await bountiesRes.json();

    const mine       = allSkills.filter((s) => s.devAddress.toLowerCase() === addr);
    const myPosted   = allBounties.filter((b) => b.manufacturerAddress.toLowerCase() === addr);

    setMySkills(mine);
    setMyBounties(myPosted);

    // Load submissions for my bounties
    const subMap: Record<string, DbSubmission[]> = {};
    await Promise.all(
      myPosted.map(async (b) => {
        const res = await fetch(`/api/bounties/${b.id}/submissions`);
        subMap[b.id] = await res.json();
      })
    );
    setSubmissionsByBounty(subMap);

    // Load all bounties to find ones the user has submitted to
    const allSubsRes = await Promise.all(
      allBounties.map((b) => fetch(`/api/bounties/${b.id}/submissions`).then((r) => r.json()))
    );
    const mySubs = allSubsRes
      .flatMap((subs: DbSubmission[], i) =>
        subs
          .filter((s) => s.devAddress.toLowerCase() === addr)
          .map((s) => ({ ...s, bountyTitle: allBounties[i].title, bountyAmount: allBounties[i].amount }))
      );
    setMySubmissions(mySubs);
  }, [address]);

  useEffect(() => { load(); }, [load]);

  const handlePostSkill = async () => {
    if (!address) return;
    setSkillPosting(true);
    setSkillError('');
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skillForm.name,
          category: skillForm.category,
          description: skillForm.description,
          longDescription: skillForm.longDescription,
          price: parseFloat(skillForm.price),
          devAddress: address,
          devUsername: skillForm.name,
          version: skillForm.version,
          compatibleDevices: skillForm.compatibleDevices.split(',').map((d) => d.trim()).filter(Boolean),
          tags: skillForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
          appstoreUrl: skillForm.appstoreUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSkillError(data.error ?? 'Failed to post skill.');
        return;
      }
      setShowSkillForm(false);
      setSkillForm({ name: '', category: 'NAVIGATION', description: '', longDescription: '', price: '', version: '1.0.0', compatibleDevices: '', tags: '', appstoreUrl: '' });
      await load();
    } finally {
      setSkillPosting(false);
    }
  };

  const handleApprove = async (bounty: DbBounty, submission: DbSubmission) => {
    if (!address) return;
    if (!bounty.onChainId || !submission.onChainSubmissionId) {
      // No on-chain IDs — just update DB directly
      setApprovingId(submission.id);
      await fetch(`/api/bounties/${bounty.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      });
      setApprovingId(null);
      await load();
      return;
    }

    setApprovingId(submission.id);
    await approveBounty(
      {
        address: address as `0x${string}`,
        onChainBountyId: BigInt(bounty.onChainId),
        onChainSubmissionId: BigInt(submission.onChainSubmissionId),
      },
      async (s) => {
        setApproveTx(s);
        if (s.status === 'success') {
          await fetch(`/api/bounties/${bounty.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId: submission.id }),
          });
          await load();
          setApprovingId(null);
          setTimeout(() => setApproveTx({ status: 'idle' }), 2000);
        }
        if (s.status === 'error') {
          setApprovingId(null);
        }
      },
    );
  };

  const totalSkillRevenue = mySkills.reduce((acc, s) => acc + parseFloat(s.price) * Math.floor(s.downloads * 0.3), 0);
  const bountyRevenue     = mySubmissions.filter((s) => s.status === 'APPROVED').reduce((acc, s) => acc + parseFloat(s.bountyAmount) * 0.9, 0);

  if (!address) {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>Connect your wallet to view your dashboard.</p>
        <button className="btn-ghost" onClick={connect}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="mono" style={{ color: "rgba(245,166,35,0.5)", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Origin Protocol · Developer Dashboard
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="mono" style={{ color: "#f5a623", fontSize: "0.9rem", fontWeight: 700 }}>
              {address.slice(2, 3).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 style={{ color: "var(--text)", fontSize: "1.3rem", fontWeight: 600 }}>
              {address.slice(0, 6)}…{address.slice(-4)}
            </h1>
            <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem", letterSpacing: "0.06em" }}>
              <span className="dot-amber" style={{ marginRight: "0.4rem" }} />
              Active · Base Sepolia
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1px", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.10)", borderRadius: 4, overflow: "hidden", marginBottom: "2rem" }}>
        {[
          { label: "Total Earned",    value: `$${(totalSkillRevenue + bountyRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "USDC" },
          { label: "Skills Listed",   value: mySkills.length,    sub: "active" },
          { label: "Bounties Won",    value: mySubmissions.filter((s) => s.status === 'APPROVED').length, sub: "completed" },
          { label: "Bounties Posted", value: myBounties.length,  sub: "as manufacturer" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "var(--bg-card)", padding: "1rem 1.25rem" }}>
            <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{label}</div>
            <div className="mono" style={{ color: "#f5a623", fontSize: "1.4rem", fontWeight: 700 }}>{value}</div>
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

      {activeTab === "Overview"        && <OverviewTab skills={mySkills} totalRevenue={totalSkillRevenue + bountyRevenue} />}
      {activeTab === "My Skills"       && (
        <MySkillsTab
          skills={mySkills}
          showForm={showSkillForm}
          onToggleForm={() => setShowSkillForm((v) => !v)}
          skillForm={skillForm}
          setSkillForm={setSkillForm}
          onPost={handlePostSkill}
          posting={skillPosting}
          error={skillError}
        />
      )}
      {activeTab === "Submissions"     && <SubmissionsTab submissions={mySubmissions} />}
      {activeTab === "Posted Bounties" && (
        <PostedBountiesTab
          bounties={myBounties}
          submissionsByBounty={submissionsByBounty}
          onApprove={handleApprove}
          approveTx={approveTx}
          approvingId={approvingId}
        />
      )}
    </div>
  );
}

function OverviewTab({ skills, totalRevenue }: { skills: DbSkill[]; totalRevenue: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, padding: "1.5rem" }}>
        <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1rem" }}>
          Summary
        </div>
        <div className="mono" style={{ color: "#f5a623", fontSize: "2rem", fontWeight: 700 }}>
          ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.25rem" }}>
          estimated lifetime earnings · USDC
        </div>
      </div>

      {skills.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <span className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>My Skills</span>
          </div>
          {skills.map((skill, i) => (
            <div key={skill.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1.25rem", borderBottom: i < skills.length - 1 ? "1px solid rgba(245,166,35,0.05)" : "none" }}>
              <div>
                <div style={{ color: "var(--text)", fontSize: "0.82rem" }}>{skill.name}</div>
                <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>{skill.category} · v{skill.version}</div>
              </div>
              <div className="mono" style={{ color: "#f5a623", fontSize: "0.82rem" }}>${skill.price} USDC</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MySkillsTab({
  skills, showForm, onToggleForm, skillForm, setSkillForm, onPost, posting, error,
}: {
  skills: DbSkill[];
  showForm: boolean;
  onToggleForm: () => void;
  skillForm: { name: string; category: SkillCategory; description: string; longDescription: string; price: string; version: string; compatibleDevices: string; tags: string; appstoreUrl: string };
  setSkillForm: (f: typeof skillForm) => void;
  onPost: () => void;
  posting: boolean;
  error: string;
}) {
  const input: React.CSSProperties = {
    width: "100%", background: "rgba(245,166,35,0.03)", border: "1px solid rgba(245,166,35,0.12)",
    borderRadius: 2, color: "var(--text)", fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.8rem", padding: "0.6rem 0.75rem", outline: "none", marginTop: "0.3rem",
  };
  const label: React.CSSProperties = { color: "var(--text-muted)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-ghost" style={{ padding: "0.55rem 1.1rem", fontSize: "0.72rem" }} onClick={onToggleForm}>
          {showForm ? '− Cancel' : '+ Post Skill'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--bg-card)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="mono" style={{ color: "#f5a623", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>New Skill Listing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={label}>Skill Name</label>
              <input style={input} placeholder="e.g. Obstacle Avoidance v2" value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} />
            </div>
            <div>
              <label style={label}>Category</label>
              <select style={{ ...input, marginTop: "0.3rem" }} value={skillForm.category} onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value as SkillCategory })}>
                {["NAVIGATION", "MANIPULATION", "PERCEPTION", "COMMUNICATION", "SECURITY", "PLANNING"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={label}>Short Description</label>
            <input style={input} placeholder="One-line description shown on skill cards" value={skillForm.description} onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })} />
          </div>
          <div>
            <label style={label}>Full Description</label>
            <textarea rows={3} style={{ ...input, resize: "none" }} placeholder="Detailed description shown on skill detail page" value={skillForm.longDescription} onChange={(e) => setSkillForm({ ...skillForm, longDescription: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={label}>Price (USDC)</label>
              <input style={input} placeholder="e.g. 4.99" value={skillForm.price} onChange={(e) => setSkillForm({ ...skillForm, price: e.target.value })} />
            </div>
            <div>
              <label style={label}>Version</label>
              <input style={input} placeholder="e.g. 1.0.0" value={skillForm.version} onChange={(e) => setSkillForm({ ...skillForm, version: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={label}>Compatible Devices (comma-separated)</label>
            <input style={input} placeholder="e.g. ROS2 Humble, Spot SDK, UR5" value={skillForm.compatibleDevices} onChange={(e) => setSkillForm({ ...skillForm, compatibleDevices: e.target.value })} />
          </div>
          <div>
            <label style={label}>Tags (comma-separated)</label>
            <input style={input} placeholder="e.g. lidar, slam, navigation" value={skillForm.tags} onChange={(e) => setSkillForm({ ...skillForm, tags: e.target.value })} />
          </div>
          <div>
            <label style={label}>Appstore / Download URL</label>
            <input style={input} placeholder="https://origin-systems.vercel.app/#apps" value={skillForm.appstoreUrl} onChange={(e) => setSkillForm({ ...skillForm, appstoreUrl: e.target.value })} />
          </div>
          {error && <p style={{ color: "#cc6666", fontSize: "0.72rem" }}>{error}</p>}
          <button className="btn-ghost" style={{ width: "100%", opacity: posting ? 0.6 : 1 }} disabled={posting} onClick={onPost}>
            {posting ? 'Posting…' : 'List Skill'}
          </button>
        </div>
      )}

      {skills.length === 0 && !showForm ? (
        <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>
          No skills listed yet.
        </div>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            {["Skill", "Category", "Price", "Downloads", "Version"].map((h) => (
              <span key={h} className="mono" style={{ color: "var(--text-muted)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {skills.map((skill, i) => (
            <div key={skill.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "1rem 1.25rem", borderBottom: i < skills.length - 1 ? "1px solid rgba(245,166,35,0.05)" : "none", alignItems: "center" }}>
              <div>
                <div style={{ color: "var(--text)", fontSize: "0.85rem" }}>{skill.name}</div>
              </div>
              <span className="mono" style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{skill.category}</span>
              <span className="mono" style={{ color: "#f5a623", fontSize: "0.82rem" }}>${skill.price}</span>
              <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>{skill.downloads}</span>
              <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>v{skill.version}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionsTab({ submissions }: { submissions: (DbSubmission & { bountyTitle: string; bountyAmount: string })[] }) {
  if (submissions.length === 0) {
    return <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>No bounty submissions yet.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {submissions.map((sub) => (
        <div key={sub.id} className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <h3 style={{ color: "var(--text)", fontSize: "0.92rem", fontWeight: 600 }}>{sub.bountyTitle}</h3>
            <span className="mono" style={{
              fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", padding: "0.18rem 0.45rem", borderRadius: 2,
              background: sub.status === 'APPROVED' ? "rgba(91,191,170,0.08)" : "rgba(255,170,0,0.08)",
              color: sub.status === 'APPROVED' ? "#5bbfaa" : "#ffaa00",
              border: `1px solid ${sub.status === 'APPROVED' ? "rgba(91,191,170,0.2)" : "rgba(255,170,0,0.2)"}`,
            }}>
              {sub.status === 'APPROVED' ? 'WON ✓' : sub.status}
            </span>
          </div>
          <div className="mono" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", fontSize: "0.65rem" }}>
            <div>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>BOUNTY</div>
              <div style={{ color: "#f5a623" }}>${parseFloat(sub.bountyAmount).toLocaleString()} USDC</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>SUBMITTED</div>
              <div style={{ color: "var(--text-dim)" }}>{new Date(sub.createdAt).toLocaleDateString()}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>SKILL URI</div>
              <div style={{ color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.skillUri}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PostedBountiesTab({
  bounties, submissionsByBounty, onApprove, approveTx, approvingId,
}: {
  bounties: DbBounty[];
  submissionsByBounty: Record<string, DbSubmission[]>;
  onApprove: (bounty: DbBounty, submission: DbSubmission) => void;
  approveTx: BountyTxState;
  approvingId: string | null;
}) {
  if (bounties.length === 0) {
    return <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>No bounties posted yet. Post one from the Bounty Board.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {bounties.map((bounty) => {
        const subs = submissionsByBounty[bounty.id] ?? [];
        return (
          <div key={bounty.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "var(--text)", fontSize: "0.9rem", fontWeight: 600 }}>{bounty.title}</div>
                <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem", marginTop: "0.2rem" }}>
                  ${parseFloat(bounty.amount).toLocaleString()} USDC · {subs.length} submission{subs.length !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="mono" style={{
                fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", padding: "0.18rem 0.45rem", borderRadius: 2,
                background: bounty.status === 'COMPLETED' ? "rgba(91,191,170,0.08)" : bounty.status === 'IN_REVIEW' ? "rgba(255,170,0,0.08)" : "rgba(245,166,35,0.08)",
                color: bounty.status === 'COMPLETED' ? "#5bbfaa" : bounty.status === 'IN_REVIEW' ? "#ffaa00" : "#f5a623",
                border: `1px solid ${bounty.status === 'COMPLETED' ? "rgba(91,191,170,0.2)" : bounty.status === 'IN_REVIEW' ? "rgba(255,170,0,0.2)" : "rgba(245,166,35,0.2)"}`,
              }}>
                {bounty.status}
              </span>
            </div>

            {subs.length === 0 ? (
              <div className="mono" style={{ padding: "1rem 1.25rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                No submissions yet.
              </div>
            ) : (
              subs.map((sub, i) => (
                <div key={sub.id} style={{ padding: "1rem 1.25rem", borderBottom: i < subs.length - 1 ? "1px solid rgba(245,166,35,0.05)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mono" style={{ color: "var(--text-dim)", fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sub.devAddress.slice(0, 10)}…
                    </div>
                    <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "0.2rem" }}>
                      {sub.skillUri}
                    </div>
                    {sub.notes && (
                      <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: "0.3rem" }}>{sub.notes}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    {sub.status === 'APPROVED' ? (
                      <span className="mono" style={{ color: "#5bbfaa", fontSize: "0.68rem" }}>Approved ✓</span>
                    ) : bounty.status !== 'COMPLETED' ? (
                      <button
                        className="btn-ghost"
                        style={{ padding: "0.35rem 0.9rem", fontSize: "0.68rem", opacity: approvingId === sub.id ? 0.6 : 1 }}
                        disabled={approvingId !== null}
                        onClick={() => onApprove(bounty, sub)}
                      >
                        {approvingId === sub.id
                          ? approveTx.status === 'approving-submission' ? 'Approving…' : 'Processing…'
                          : 'Approve & Pay'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
