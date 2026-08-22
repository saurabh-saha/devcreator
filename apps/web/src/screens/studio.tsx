"use client";
import { useState, useRef, useEffect } from "react";

const TABS = [
  { id: "li", label: "LinkedIn" },
  { id: "yt", label: "YouTube" },
  { id: "sh", label: "Short" },
  { id: "ca", label: "Carousel" },
  { id: "ar", label: "Article" },
  { id: "th", label: "Thread" },
];

type Idea = {
  title: string;
  hook: string;
  rationale: string;
  audience: string;
  score: number;
  impact: string;
  formats: string[];
};

export function Studio({ idea, navigate }: { idea: Idea | null; navigate: (s: string, state?: any) => void }) {
  const [activeTab, setActiveTab] = useState("li");
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<{id: string; format: string; createdAt: string}[]>([]);
  const [allDrafts, setAllDrafts] = useState<{ideaTitle: string; format: string; content: string; createdAt: string; ideaData?: any}[]>([]);
  const abortRefs = useRef<Record<string, AbortController>>({});
  const ideaRef = useRef(idea);
  ideaRef.current = idea;

  // Load existing drafts from DB on mount, only generate LinkedIn if none found
  useEffect(() => {
    if (!idea) return;
    fetch("/api/drafts")
      .then(r => r.json())
      .then(data => {
        const mine = (data.drafts ?? []).filter((d: any) => d.ideaTitle === idea.title);
        if (mine.length > 0) {
          const loaded: Record<string, string> = {};
          mine.forEach((d: any) => { loaded[d.format] = d.content; });
          setContent(loaded);
          setSavedDrafts(mine.map((d: any) => ({ id: d.id, format: d.format, createdAt: d.createdAt })));
          setDraftsLoaded(true);
        } else {
          setDraftsLoaded(true);
          generate("li");
        }
      })
      .catch(() => {
        setDraftsLoaded(true);
        generate("li");
      });
  }, [idea?.title]);

  // Load all drafts when no idea selected
  useEffect(() => {
    if (idea) return;
    fetch("/api/drafts")
      .then(r => r.json())
      .then(data => setAllDrafts((data.drafts ?? []).map((d: any) => ({ ...d, ideaData: d.ideaData ?? d.idea_data }))))
      .catch(() => {});
  }, [idea]);

  if (!idea) {
    // Group by ideaTitle
    const byIdea = allDrafts.reduce<Record<string, typeof allDrafts>>((acc, d) => {
      if (!acc[d.ideaTitle]) acc[d.ideaTitle] = [];
      acc[d.ideaTitle].push(d);
      return acc;
    }, {});
    const ideaTitles = Object.keys(byIdea);

    return (
      <div className="page">
        <div className="ph">
          <div className="pt">Content Studio</div>
          <div className="ps">One idea, every format, in your voice.</div>
        </div>
        {ideaTitles.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 20px", color: "var(--t3)", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✍️</div>
            <div style={{ fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>No idea selected</div>
            <div style={{ marginBottom: 20 }}>Go to Ideas, generate some, then click Create on the one you want to write.</div>
            <button className="btn bp" onClick={() => navigate("ideas")}>Go to Ideas →</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Saved drafts</div>
            {ideaTitles.map(title => (
              <div key={title} className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--t1)", marginBottom: 10 }}>{title}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {byIdea[title].map(d => {
                    const label = TABS.find(t => t.id === d.format)?.label ?? d.format;
                    const age = new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                    return (
                      <button
                        key={d.format}
                        onClick={() => d.ideaData && navigate("studio", { idea: d.ideaData })}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "var(--s2)", borderRadius: 20, fontSize: 12, border: "1px solid var(--bd)", cursor: d.ideaData ? "pointer" : "default", color: "inherit", opacity: d.ideaData ? 1 : 0.6 }}
                      >
                        <span style={{ color: "var(--t2)" }}>{label}</span>
                        <span style={{ color: "var(--t3)" }}>{age}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button className="btn bp" style={{ marginTop: 4 }} onClick={() => navigate("ideas")}>Go to Ideas →</button>
          </div>
        )}
      </div>
    );
  }

  async function generate(format: string) {
    const currentIdea = ideaRef.current;
    if (!currentIdea) return;

    abortRefs.current[format]?.abort();
    const ctrl = new AbortController();
    abortRefs.current[format] = ctrl;

    setLoading(l => ({ ...l, [format]: true }));
    setContent(c => ({ ...c, [format]: "" }));

    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: currentIdea, format }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setContent(c => ({ ...c, [format]: text }));
      }
      // Auto-save to DB after generation
      if (text) {
        fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ideaTitle: currentIdea.title, format, content: text, idea: currentIdea }),
        }).then(() => {
          setSavedDrafts(prev => {
            const exists = prev.find(d => d.format === format);
            if (exists) return prev.map(d => d.format === format ? { ...d, createdAt: new Date().toISOString() } : d);
            return [...prev, { id: "", format, createdAt: new Date().toISOString() }];
          });
        }).catch(() => {});
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setContent(c => ({ ...c, [format]: "Generation failed. Try again." }));
      }
    } finally {
      setLoading(l => ({ ...l, [format]: false }));
    }
  }

  async function saveDraft() {
    const currentIdea = ideaRef.current;
    if (!current || !currentIdea) return;
    setDraftSaving(true);
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaTitle: currentIdea.title, format: activeTab, content: current }),
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } finally {
      setDraftSaving(false);
    }
  }

  function switchTab(id: string) {
    setActiveTab(id);
    if (draftsLoaded && !content[id] && !loading[id]) generate(id);
  }

  const current = content[activeTab] ?? "";
  const isLoading = loading[activeTab] ?? false;

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Content Studio</div>
        <div className="ps">One idea, every format, in your voice.</div>
      </div>
      <div className="sto">
        <div className="stlbl">Creating from idea</div>
        <div className="sttitle">{idea.title}</div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4, fontStyle: "italic" }}>{idea.hook}</div>
      </div>
      <div className="stabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`stab${activeTab === t.id ? " active" : ""}`}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
            {loading[t.id] && <span style={{ marginLeft: 5, opacity: 0.5, fontSize: 10 }}>•••</span>}
            {content[t.id] && !loading[t.id] && <span style={{ marginLeft: 5, color: "var(--gn)", fontSize: 10 }}>✓</span>}
          </button>
        ))}
      </div>

      <div className="stout" style={{ minHeight: 200 }}>
        {isLoading && !current && (
          <div style={{ color: "var(--t3)", fontSize: 13 }}>Generating {TABS.find(t => t.id === activeTab)?.label} content…</div>
        )}
        {current && (
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            {current}
            {isLoading && <span style={{ opacity: 0.4 }}> ▋</span>}
          </pre>
        )}
      </div>

      <div className="stmeta">
        <div className="stmi"><div className="stml">Score</div><div className="stmv">{idea.score}/100</div></div>
        <div className="stmi"><div className="stml">Impact</div><div className="stmv" style={{ color: idea.impact === "High" ? "var(--gn)" : idea.impact === "Medium" ? "var(--am)" : "var(--t3)" }}>{idea.impact}</div></div>
        <div className="stmi"><div className="stml">Audience</div><div className="stmv">{idea.audience}</div></div>
      </div>

      <div className="stact">
        <button className="btn bp" disabled={!current || isLoading} onClick={() => navigator.clipboard.writeText(current)}>Copy</button>
        <button className="btn bs" disabled={!current || isLoading || draftSaving} onClick={saveDraft}>
          {draftSaved ? "Saved ✓" : draftSaving ? "Saving…" : "Save draft"}
        </button>
        <button className="btn bs" disabled={isLoading} onClick={() => generate(activeTab)}>Regenerate</button>
        <button className="btn bg-btn" onClick={() => navigate("ideas")}>← Back to Ideas</button>
      </div>

      {savedDrafts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Saved drafts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {savedDrafts.map(d => {
              const label = TABS.find(t => t.id === d.format)?.label ?? d.format;
              const age = d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div key={d.format} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--s2)", borderRadius: 8, fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 500, color: "var(--t1)" }}>{label}</span>
                    {age && <span style={{ fontSize: 11, color: "var(--t3)" }}>{age}</span>}
                  </div>
                  <button
                    className="btn bs"
                    style={{ fontSize: 11, padding: "3px 10px" }}
                    onClick={() => { setActiveTab(d.format); }}
                  >
                    {activeTab === d.format ? "Viewing" : "View"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
