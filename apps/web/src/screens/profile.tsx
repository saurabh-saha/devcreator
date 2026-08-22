"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type Account = { platform: string; handle: string; connectedAt: string };
type CreatorProfile = {
  expertise: string[];
  topics: string[];
  tone: string;
  targetAudience: string | null;
  contentPillars: string[];
  voiceSummary: string | null;
};

type ProfileData = {
  name: string | null;
  profile: CreatorProfile | null;
  accounts: Account[];
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn", medium: "Medium", github: "GitHub",
  substack: "Substack", x: "X / Twitter", instagram: "Instagram",
  youtube: "YouTube", notion: "Notion", google_drive: "Google Drive",
};

function ago(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) return <img src={image} alt={name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />;
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: 64, height: 64, borderRadius: "50%",
      background: "var(--acd)", color: "var(--ac)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 22, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

export function Profile({ navigate, session }: { navigate: (s: string) => void; session: { name?: string | null; email?: string | null; image?: string | null } }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const name = session.name ?? data?.name ?? "You";
  const email = session.email ?? "";

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Profile</div>
        <div className="ps">Your account and creator settings.</div>
      </div>

      {/* Identity card */}
      <div className="card" style={{ marginBottom: 16, padding: "20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <Avatar name={name} image={session.image} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{name}</div>
            <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 2 }}>{email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            background: "none", border: "1px solid var(--bd)", borderRadius: 6,
            padding: "6px 14px", fontSize: 12, color: "var(--t2)", cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>

      {/* Connected platforms */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="lbl" style={{ marginBottom: 0 }}>Connected Platforms</div>
          <button
            className="btn bg-btn"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => navigate("integrations")}
          >
            Manage
          </button>
        </div>
        {loading ? (
          <div style={{ padding: "16px", color: "var(--t3)", fontSize: 12 }}>Loading…</div>
        ) : data?.accounts?.length ? data.accounts.map((a, i) => (
          <div key={a.platform} className="crow" style={{ borderBottom: i < data.accounts.length - 1 ? "1px solid var(--bd)" : "none" }}>
            <span className="cr-t" style={{ fontSize: 13 }}>{PLATFORM_LABELS[a.platform] ?? a.platform}</span>
            <span style={{ fontSize: 12, color: "var(--t2)", fontFamily: "var(--mono)" }}>@{a.handle}</span>
            <span className="cr-p" style={{ fontSize: 11, color: "var(--t3)" }}>connected {ago(a.connectedAt)}</span>
          </div>
        )) : (
          <div style={{ padding: "20px 16px", color: "var(--t3)", fontSize: 12, textAlign: "center" }}>
            No platforms connected yet.{" "}
            <button onClick={() => navigate("integrations")} style={{ background: "none", border: "none", color: "var(--ac)", fontSize: 12, cursor: "pointer", padding: 0 }}>
              Go to Integrations →
            </button>
          </div>
        )}
      </div>

      {/* Creator profile */}
      {data?.profile && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bd)" }}>
            <div className="lbl" style={{ marginBottom: 0 }}>Creator Profile</div>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {data.profile.tone && (
              <div>
                <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--mono)", marginBottom: 4 }}>Tone</div>
                <div style={{ fontSize: 13, color: "var(--t1)" }}>{data.profile.tone}</div>
              </div>
            )}
            {data.profile.targetAudience && (
              <div>
                <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--mono)", marginBottom: 4 }}>Target Audience</div>
                <div style={{ fontSize: 13, color: "var(--t1)" }}>{data.profile.targetAudience}</div>
              </div>
            )}
            {data.profile.expertise?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--mono)", marginBottom: 6 }}>Expertise</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {data.profile.expertise.map(e => (
                    <span key={e} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "var(--acd)", color: "var(--ac)", fontFamily: "var(--mono)" }}>{e}</span>
                  ))}
                </div>
              </div>
            )}
            {data.profile.topics?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--mono)", marginBottom: 6 }}>Topics</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {data.profile.topics.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "var(--s2)", color: "var(--t2)", fontFamily: "var(--mono)" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {data.profile.voiceSummary && (
              <div>
                <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--mono)", marginBottom: 4 }}>Voice Summary</div>
                <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{data.profile.voiceSummary}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
