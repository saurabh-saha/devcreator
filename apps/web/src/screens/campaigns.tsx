export function Campaigns({ navigate }: { navigate: (s: string) => void }) {
  const weeks = [
    { label: "Week 1", title: "Foundation — What is an AI Agent?", items: [
      { pl: "LinkedIn", t: "Why AI agents exist and what they actually do", tag: "tg", tagLabel: "Published" },
      { pl: "Thread", t: "Agent vs. workflow — a clear distinction", tag: "tg", tagLabel: "Published" },
      { pl: "YouTube Short", t: "Are agents overhyped? My honest take", tag: "tg", tagLabel: "Published" },
    ]},
    { label: "Week 2", title: "Technical Depth — How Agents Work", items: [
      { pl: "LinkedIn", t: "How memory works in AI agents", tag: "ta", tagLabel: "Scheduled" },
      { pl: "Carousel", t: "Tool calling, explained visually", tag: "ta", tagLabel: "Scheduled" },
      { pl: "YouTube Short", t: "My agent setup in 60 seconds", tag: "ta", tagLabel: "Scheduled" },
    ]},
    { label: "Week 3", title: "Real World — Agents in Production", items: [
      { pl: "LinkedIn", t: "Production AI agent architecture (what actually runs)", tag: "tn", tagLabel: "Draft" },
      { pl: "Article", t: "What breaks when you put an agent in production", tag: "tn", tagLabel: "Draft" },
      { pl: "Instagram", t: "Agent debugging tips (visual)", tag: null, tagLabel: null },
    ]},
    { label: "Week 4", title: "Advanced — The Future", items: [
      { pl: "LinkedIn", t: "When NOT to use AI agents", tag: null, tagLabel: null },
      { pl: "YouTube", t: "The future of agentic AI — my predictions", tag: null, tagLabel: null },
    ]},
  ];

  return (
    <div className="page">
      <div className="ph"><div className="pt">Campaigns</div><div className="ps">Multi-week content strategies around a single goal.</div></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: "var(--r)", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)", letterSpacing: "-.025em", marginBottom: 4 }}>Become Known for Agentic AI</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="tag tac">Active</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>4 weeks · AI Engineers · LinkedIn + YouTube + Instagram</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button className="btn bg-btn">Edit</button>
          <button className="btn bp">Add content</button>
        </div>
      </div>
      {weeks.map((w, wi) => (
        <div key={wi} className="wb">
          <div className="wh"><span className="wn">{w.label}</span><span className="wt">{w.title}</span></div>
          {w.items.map((item, ii) => (
            <div key={ii} className="wi">
              <span className="wp">{item.pl}</span>
              {item.t}
              <span style={{ marginLeft: "auto" }}>
                {item.tag ? <span className={`tag ${item.tag}`}>{item.tagLabel}</span> : <button className="btn bao" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => navigate("studio")}>Create</button>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
