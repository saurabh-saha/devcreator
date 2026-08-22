"use client";
import { useEffect, useState } from "react";

type InsightData = {
  whatsWorking: { headline: string; detail: string };
  contentGap: { headline: string; detail: string; gaps: string[] };
  topTopics: { topic: string; score: number }[];
  topFormats: { format: string; multiplier: string }[];
  quickStat: { label: string; value: string };
};

type Meta = { liCount: number; medCount: number; subCount: number; ghCount: number };

function SkeletonLine({ width }: { width: string | number }) {
  return <span className="skel skel-row" style={{ width, display: "block" }} />;
}

function InsightSkeleton() {
  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Insights</div>
        <div className="ps">Analyzing your content across all platforms…</div>
      </div>
      <div className="ih ihg" style={{ gap: 12 }}>
        <SkeletonLine width={80} />
        <SkeletonLine width="60%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
      </div>
      <div className="ih iha" style={{ marginTop: 14, gap: 12 }}>
        <SkeletonLine width={100} />
        <SkeletonLine width="55%" />
        <SkeletonLine width="85%" />
        {[1,2,3].map(i => <SkeletonLine key={i} width="50%" />)}
      </div>
      <div className="g2" style={{ marginTop: 18 }}>
        {[0,1].map(i => (
          <div key={i} className="card" style={{ gap: 10, display: "flex", flexDirection: "column" }}>
            <SkeletonLine width={80} />
            {[1,2,3,4,5].map(j => <SkeletonLine key={j} width={`${50 + j * 8}%`} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Insights({ navigate }: { navigate: (s: string) => void }) {
  const [data, setData] = useState<InsightData | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function loadInsights(bust = false) {
    const url = bust ? "/api/insights?refresh=1" : "/api/insights";
    return fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error === "no_data") {
          setError("no_data");
        } else if (d.insights) {
          setData(d.insights);
          setMeta(d.meta ?? null);
          setGeneratedAt(d.generatedAt ?? null);
          setCached(d.cached ?? false);
        } else {
          setError("failed");
        }
      })
      .catch(() => setError("failed"));
  }

  useEffect(() => {
    loadInsights().finally(() => setLoading(false));
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadInsights(true).finally(() => setRefreshing(false));
  }

  const ageMs = generatedAt ? Date.now() - new Date(generatedAt).getTime() : Infinity;
  const canRefresh = ageMs > 60 * 60 * 1000;
  const ageLabel = generatedAt ? (() => {
    const mins = Math.floor(ageMs / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  })() : null;

  if (loading) return <InsightSkeleton />;

  if (error === "no_data") {
    return (
      <div className="page">
        <div className="ph"><div className="pt">Insights</div><div className="ps">Your content is telling a story. Here&apos;s what we found.</div></div>
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--t3)", fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>No content data yet</div>
          <div>Connect your platforms and sync your content to see real insights.</div>
          <button className="btn bao" style={{ marginTop: 16 }} onClick={() => navigate("integrations")}>Connect platforms →</button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="ph"><div className="pt">Insights</div></div>
        <div className="card" style={{ color: "var(--t3)", fontSize: 13, padding: 20 }}>Failed to load insights. Try refreshing.</div>
      </div>
    );
  }

  const totalPieces = (meta?.liCount ?? 0) + (meta?.medCount ?? 0) + (meta?.subCount ?? 0);

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Insights</div>
        <div className="ps">
          Your content is telling a story. Here&apos;s what we found
          {totalPieces > 0 ? ` across ${totalPieces} pieces of content` : ""}.
        </div>
      </div>

      {/* Quick stat banner */}
      {data.quickStat && (
        <div style={{
          background: "var(--acd)", borderRadius: 8, padding: "12px 16px", marginBottom: 14,
          display: "flex", alignItems: "baseline", gap: 10,
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ac)", fontFamily: "var(--mono)" }}>{data.quickStat.value}</span>
          <span style={{ fontSize: 12, color: "var(--t2)" }}>{data.quickStat.label}</span>
        </div>
      )}

      <div className="ih ihg">
        <div className="ie ieg">What&apos;s working</div>
        <div className="ib">{data.whatsWorking.headline}</div>
        <div className="is">{data.whatsWorking.detail}</div>
      </div>

      <div className="ih iha">
        <div className="ie iea">Content gaps</div>
        <div className="ib">{data.contentGap.headline}</div>
        <div className="is">{data.contentGap.detail}</div>
        <div style={{ marginTop: 14 }}>
          {data.contentGap.gaps.map((t, i, a) => (
            <div key={t} style={{ padding: "10px 0", borderBottom: i < a.length - 1 ? "1px solid rgba(251,191,36,.18)" : "none", display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--t1)" }}>
              <span style={{ color: "var(--am)", fontFamily: "var(--mono)", fontSize: 12 }}>→</span>{t}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn bao" onClick={() => navigate("ideas")}>Generate ideas from gaps →</button>
        </div>
      </div>

      <div className="g2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="lbl">Best topics</div>
          {data.topTopics.map(({ topic, score }, i) => (
            <div key={i} className="ri">
              <span className="rn">{i + 1}</span>
              <span className="rt">{topic}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: j < score ? "var(--ac)" : "var(--s3)", display: "inline-block" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="lbl">Best formats</div>
          {data.topFormats.map(({ format, multiplier }, i) => (
            <div key={i} className="ri">
              <span className="rn">{i + 1}</span>
              <span className="rt">{format}</span>
              <span className="rm">{multiplier}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: "var(--t3)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
        {ageLabel && <span>Analyzed {ageLabel}</span>}
        <button
          onClick={handleRefresh}
          disabled={!canRefresh || refreshing}
          style={{
            background: "none", border: "1px solid var(--bd)", borderRadius: 4,
            padding: "3px 8px", fontSize: 11, color: canRefresh ? "var(--t2)" : "var(--t3)",
            cursor: canRefresh ? "pointer" : "not-allowed", opacity: canRefresh ? 1 : 0.5,
          }}
        >
          {refreshing ? "Re-analyzing…" : canRefresh ? "Re-analyze" : "Re-analyze (available in 1h)"}
        </button>
      </div>
    </div>
  );
}
