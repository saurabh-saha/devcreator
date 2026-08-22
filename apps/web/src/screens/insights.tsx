export function Insights({ navigate }: { navigate: (s: string) => void }) {
  return (
    <div className="page">
      <div className="ph"><div className="pt">Insights</div><div className="ps">Your content is telling a story. Here&apos;s what we found.</div></div>
      <div className="ih ihg">
        <div className="ie ieg">What&apos;s working</div>
        <div className="ib">Practical technical examples outperform theory by 2.8×.</div>
        <div className="is">Posts with a concrete hook — a specific number, a surprising claim, or a personal failure — outperform generic openings by 3.4×. Your strongest content is always grounded in real production experience, not conceptual explanations.</div>
      </div>
      <div className="ih iha">
        <div className="ie iea">Content gaps</div>
        <div className="ib">You have deep expertise in areas you&apos;ve barely written about.</div>
        <div className="is">Your GitHub repos and Notion notes show strong knowledge in AI observability, agent memory patterns, and production ML infrastructure — topics your audience asks about but you&apos;ve covered minimally.</div>
        <div style={{ marginTop: 14 }}>
          {["AI observability and tracing", "Agent memory architecture", "Production AI system design"].map((t, i, a) => (
            <div key={t} style={{ padding: "10px 0", borderBottom: i < a.length - 1 ? "1px solid rgba(251,191,36,.18)" : "none", display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--t1)" }}>
              <span style={{ color: "var(--am)", fontFamily: "var(--mono)", fontSize: 12 }}>→</span>{t}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}><button className="btn bao" onClick={() => navigate("ideas")}>Generate ideas from gaps →</button></div>
      </div>
      <div className="g2" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="lbl">Best topics</div>
          {[["AI Agents", 5], ["Kafka / Streaming", 4], ["System Architecture", 4], ["Engineering Leadership", 3], ["Startups / Founder", 2]].map(([topic, score], i) => (
            <div key={i} className="ri">
              <span className="rn">{i + 1}</span>
              <span className="rt">{topic}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: j < (score as number) ? "var(--ac)" : "var(--s3)", display: "inline-block" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="lbl">Best formats</div>
          {[["Technical explainers", "2.9× avg"], ["Personal failure stories", "2.4× avg"], ["Visual carousels", "2.1× avg"], ["Contrarian takes", "1.9× avg"], ["Step-by-step tutorials", "1.6× avg"]].map(([t, v], i) => (
            <div key={i} className="ri"><span className="rn">{i + 1}</span><span className="rt">{t}</span><span className="rm">{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
