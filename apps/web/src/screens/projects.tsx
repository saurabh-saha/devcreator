const TASKS = [
  { done: true, label: "Positioning document" },
  { done: true, label: "Founder story — LinkedIn post" },
  { done: true, label: "Launch video script — YouTube" },
  { done: true, label: "LinkedIn announcement campaign" },
  { done: true, label: "Instagram teaser series (3 posts)" },
  { done: true, label: "Product Hunt post copy" },
  { done: true, label: "Newsletter edition — subscribers" },
  { done: true, label: "Twitter/X thread" },
  { done: false, label: "YouTube video — full walkthrough", tag: "ta", tagLabel: "In progress" },
  { done: false, label: "Demo video — 90 seconds" },
  { done: false, label: "Blog post — technical deep dive" },
];

export function Projects() {
  return (
    <div className="page">
      <div className="ph"><div className="pt">Projects</div><div className="ps">Goal-driven work tracked end-to-end.</div></div>
      <div className="projcard">
        <div className="projh">
          <div><div className="projt">Launch AI Product</div><div className="projs">8 of 11 assets complete</div></div>
          <div className="projpct">72%</div>
        </div>
        <div className="pw" style={{ marginBottom: 14 }}><div className="pf" style={{ width: "72%" }} /></div>
        <div>
          {TASKS.map((t, i) => (
            <div key={i} className="titem">
              {t.done ? <div className="tcd">✓</div> : <div className="tcp" />}
              <span className={t.done ? "ttd" : "tt"}>{t.label}</span>
              {t.tag && <span className={`tag ${t.tag}`} style={{ marginLeft: "auto" }}>{t.tagLabel}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="projcard">
        <div className="projh">
          <div><div className="projt">Grow Developer Audience</div><div className="projs">Goal: 10K → 25K followers · +891/mo current pace</div></div>
          <div className="projpct">34%</div>
        </div>
        <div className="pw" style={{ marginBottom: 16 }}><div className="pf" style={{ width: "34%" }} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[["Monthly target", "+1,200", "var(--t1)"], ["Current pace", "+891", "var(--gn)"], ["Posts planned", "16/mo", "var(--t1)"]].map(([l, v, c]) => (
            <div key={l} style={{ background: "var(--s2)", borderRadius: 6, padding: "12px 14px" }}>
              <div className="lbl" style={{ marginBottom: 3 }}>{l}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
