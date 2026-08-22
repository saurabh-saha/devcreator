"use client";
import { useState, useRef } from "react";

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
  const abortRefs = useRef<Record<string, AbortController>>({});
  const firstGenDone = useRef(false);

  if (!idea) {
    return (
      <div className="page">
        <div className="ph">
          <div className="pt">Content Studio</div>
          <div className="ps">One idea, every format, in your voice.</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 20px", color: "var(--t3)", fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✍️</div>
          <div style={{ fontWeight: 600, color: "var(--t2)", marginBottom: 6 }}>No idea selected</div>
          <div style={{ marginBottom: 20 }}>Go to Ideas, generate some, then click Create on the one you want to write.</div>
          <button className="btn bp" onClick={() => navigate("ideas")}>Go to Ideas →</button>
        </div>
      </div>
    );
  }

  async function generate(format: string) {
    abortRefs.current[format]?.abort();
    const ctrl = new AbortController();
    abortRefs.current[format] = ctrl;

    setLoading(l => ({ ...l, [format]: true }));
    setContent(c => ({ ...c, [format]: "" }));

    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, format }),
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
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setContent(c => ({ ...c, [format]: "Generation failed. Try again." }));
      }
    } finally {
      setLoading(l => ({ ...l, [format]: false }));
    }
  }

  async function saveDraft() {
    if (!current || !idea) return;
    setDraftSaving(true);
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaTitle: idea.title, format: activeTab, content: current }),
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } finally {
      setDraftSaving(false);
    }
  }

  function switchTab(id: string) {
    setActiveTab(id);
    if (!content[id] && !loading[id]) generate(id);
  }

  // Auto-generate LinkedIn tab on first render
  if (!firstGenDone.current) {
    firstGenDone.current = true;
    setTimeout(() => generate("li"), 0);
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
    </div>
  );
}
