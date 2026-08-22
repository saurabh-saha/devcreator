const SOURCES = [
  { name: "LinkedIn", detail: "418 posts · 2h ago" },
  { name: "YouTube", detail: "32 videos · 2h ago" },
  { name: "Instagram", detail: "284 posts · 3h ago" },
  { name: "GitHub", detail: "18 repos · 4h ago" },
  { name: "Notion", detail: "142 pages · 6h ago" },
];

const EXPERTISE = [
  ["AI / Machine Learning", 94],
  ["Backend Engineering", 87],
  ["System Architecture", 78],
  ["Engineering Leadership", 65],
  ["Kafka / Streaming", 58],
  ["Startups", 47],
  ["Developer Tools", 39],
];

export function Knowledge() {
  return (
    <div className="page">
      <div className="ph"><div className="pt">Knowledge Base</div><div className="ps">894 documents across 5 sources. This is what your Brain knows about you.</div></div>
      <div className="g21">
        <div>
          <div className="lbl">Connected sources</div>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
            {SOURCES.map((s, i) => (
              <div key={s.name} style={{ padding: "13px 18px", borderBottom: i < SOURCES.length - 1 ? "1px solid var(--bd)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                <span className="dot dg" />
                <span style={{ flex: 1, fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{s.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>{s.detail}</span>
              </div>
            ))}
          </div>
          <div className="lbl">Topics you haven&apos;t covered yet</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {["AI observability", "Agent memory", "Production ML", "SRE fundamentals", "Vector databases"].map(t => (
              <span key={t} className="tag ta">{t}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="lbl">Detected expertise</div>
          <div className="card">
            {EXPERTISE.map(([label, pct]) => (
              <div key={label} className="er">
                <span className="el">{label}</span>
                <div className="eb"><div className="ef" style={{ width: `${pct}%` }} /></div>
                <span className="ep">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
