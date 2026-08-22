"use client";
import { useEffect, useState } from "react";
import { BrainMark } from "@/components/brain-mark";

type Profile = {
  expertise: string[];
  topics: string[];
  tone: string;
  targetAudience: string | null;
  contentPillars: string[];
  voiceSummary: string | null;
};

type Doc = { title: string | null; sourceType: string; sourceRef: string | null };
type Account = { platform: string; handle: string };

function sourceLabel(sourceType: string) {
  if (sourceType.startsWith("github")) return "GitHub";
  if (sourceType.startsWith("medium")) return "Medium";
  if (sourceType.startsWith("substack")) return "Substack";
  if (sourceType.startsWith("linkedin")) return "LinkedIn";
  return sourceType;
}

export function Dashboard({ navigate }: { navigate: (s: string) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("there");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setProfile(data.profile);
        setDocs(data.docs ?? []);
        setAccounts(data.accounts ?? []);
        setName(data.name ?? "there");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Interleave across sources so all platforms show, exclude raw LinkedIn profile doc
  const bySource: Record<string, Doc[]> = {};
  for (const d of docs) {
    if (!d.title || d.sourceType === "linkedin_profile") continue;
    (bySource[d.sourceType] ??= []).push(d);
  }
  const interleaved: Doc[] = [];
  const groups = Object.values(bySource);
  const maxLen = Math.max(...groups.map(g => g.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const g of groups) { if (g[i]) interleaved.push(g[i]); }
  }
  const contentList = interleaved.slice(0, 12);

  const pillarsAsOpportunities = profile?.contentPillars.slice(0, 3).map((p, i) => ({
    title: p,
    sub: profile.topics[i] ? `Related to: ${profile.topics[i]}` : "Core content theme",
    tag: ["Content pillar", "Opportunity", "Trending"][i % 3],
    tc: ["ta", "tac", "tg"][i % 3],
  })) ?? [];

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">{greeting}, {name.split(" ")[0]}.</div>
        <div className="ps">
          {loading
            ? "Loading your Creator Brain…"
            : profile
            ? `Your Brain is built from ${docs.length} pieces of content across ${accounts.length} platforms.`
            : "Connect your platforms to power your Creator Brain."}
        </div>
      </div>

      {/* Stats row — platform counts from real data */}
      <div className="g4">
        <div className="stat-tile">
          <div className="stat-lbl">Platforms connected</div>
          <div className="stat-val">{loading ? "—" : accounts.length}</div>
          <div className="stat-d">{accounts.map(a => a.platform).join(", ") || "None yet"}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl">Content imported</div>
          <div className="stat-val">{loading ? "—" : docs.length}</div>
          <div className="stat-d">READMEs, articles, newsletters</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl">Topics identified</div>
          <div className="stat-val">{loading ? "—" : profile?.topics.length ?? 0}</div>
          <div className="stat-d">{profile?.topics.slice(0, 2).join(", ") || "Run brain build first"}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl">Writing tone</div>
          <div className="stat-val" style={{ fontSize: 18, textTransform: "capitalize" }}>
            {loading ? "—" : profile?.tone ?? "—"}
          </div>
          <div className="stat-d">{profile?.targetAudience ?? "Build your brain to unlock"}</div>
        </div>
      </div>

      <div className="g21" style={{ marginBottom: 18 }}>
        {/* Creator Brain insight card */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BrainMark size={14} className="brain-mark" />
            <span className="lbl" style={{ marginBottom: 0 }}>Creator Brain</span>
          </div>
          {loading ? (
            <p style={{ fontSize: 14, color: "var(--t3)" }}>Loading your profile…</p>
          ) : profile?.voiceSummary ? (
            <>
              <p style={{ fontSize: 14.5, color: "var(--t1)", lineHeight: 1.65, marginBottom: 14 }}>
                {profile.voiceSummary}
              </p>
              {profile.expertise.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {profile.expertise.slice(0, 5).map(e => (
                    <span key={e} className="tag ta">{e}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 14, color: "var(--t3)" }}>
              No profile yet — go through onboarding to build your Creator Brain.
            </p>
          )}
          <button className="btn bao" onClick={() => navigate("chat")}>Ask your Brain →</button>
        </div>

        {/* Content pillars / opportunities */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--bd)" }}>
            <div className="lbl" style={{ marginBottom: 0 }}>
              {profile ? "Content pillars" : "Opportunities"}
            </div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {pillarsAsOpportunities.length > 0 ? pillarsAsOpportunities.map((o, i) => (
              <div key={i} style={{ padding: "12px 18px", borderBottom: i < pillarsAsOpportunities.length - 1 ? "1px solid var(--bd)" : "none" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t1)", marginBottom: 3 }}>{o.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--t2)" }}>{o.sub}</div>
                <span className={`tag ${o.tc}`} style={{ marginTop: 6, display: "inline-flex" }}>{o.tag}</span>
              </div>
            )) : (
              <div style={{ padding: "16px 18px", color: "var(--t3)", fontSize: 13 }}>
                Build your Creator Brain to unlock opportunities.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real imported content list */}
      {contentList.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bd)" }}>
            <div className="lbl" style={{ marginBottom: 0 }}>Imported content</div>
          </div>
          {contentList.map((d, i) => (
            <div key={i} className="crow">
              <span className="cr-n">{i + 1}</span>
              <span className="cr-t">{d.title?.replace(/^(GitHub|Medium|Substack|Repo): /, "") ?? "Untitled"}</span>
              <span className="cr-p">{sourceLabel(d.sourceType)}</span>
              {d.sourceRef ? (
                <a href={d.sourceRef} target="_blank" rel="noreferrer" className="cr-v" style={{ textDecoration: "none" }}>View →</a>
              ) : <span className="cr-v" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
