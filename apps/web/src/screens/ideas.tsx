"use client";
import { useState, useEffect } from "react";

interface Idea {
  score: number;
  title: string;
  hook: string;
  impact: "High" | "Medium" | "Low";
  rationale: string;
  formats: string[];
  audience: string;
}

interface SavedIdea extends Idea {
  id: string;
  savedAt: string;
}

const IMP: Record<string, string> = { High: "tg", Medium: "ta", Low: "tr" };

export function Ideas({ navigate }: { navigate: (s: string, state?: any) => void }) {
  const [tab, setTab] = useState<"generate" | "saved">("generate");

  const [audience, setAudience] = useState("AI Engineers");
  const [topic, setTopic] = useState("Agentic AI");
  const [goal, setGoal] = useState("Build authority");
  const [platform, setPlatform] = useState("All platforms");
  const [count, setCount] = useState("10");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<Set<number>>(new Set());

  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => { generate(); }, []);

  useEffect(() => {
    if (tab === "saved") loadSaved();
  }, [tab]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, topic, goal, platform, count: parseInt(count) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setIdeas(data.ideas ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadSaved() {
    setSavedLoading(true);
    try {
      const res = await fetch("/api/saved-ideas");
      if (res.ok) {
        const data = await res.json();
        setSavedIdeas(data.ideas ?? []);
      }
    } finally {
      setSavedLoading(false);
    }
  }

  async function saveIdea(idea: Idea, idx: number) {
    setSaving(s => new Set(s).add(idx));
    try {
      const res = await fetch("/api/saved-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(idea),
      });
      if (res.ok) setSaved(s => new Set(s).add(idx));
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(idx); return n; });
    }
  }

  async function removeIdea(id: string) {
    setRemoving(s => new Set(s).add(id));
    try {
      await fetch("/api/saved-ideas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSavedIdeas(prev => prev.filter(i => i.id !== id));
    } finally {
      setRemoving(s => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  const filtered = (filter === "All" ? ideas : ideas.filter(i => i.impact === filter))
    .slice().sort((a, b) => b.score - a.score);

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="pt">Idea Mentor</div>
            <div className="ps">Generate ideas rooted in your expertise and audience.</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className={`btn ${tab === "generate" ? "bp" : "bs"}`}
              onClick={() => setTab("generate")}
            >Generate</button>
            <button
              className={`btn ${tab === "saved" ? "bp" : "bs"}`}
              onClick={() => setTab("saved")}
            >Saved {savedIdeas.length > 0 && `(${savedIdeas.length})`}</button>
          </div>
        </div>
      </div>

      {tab === "generate" && (
        <div className="ideas-layout">
          <div>
            <div className="card">
              <div className="fg"><div className="fl">Audience</div>
                <select className="fsel" value={audience} onChange={e => setAudience(e.target.value)}>
                  <option>AI Engineers</option>
                  <option>Backend Developers</option>
                  <option>Engineering Managers</option>
                  <option>Technical Founders</option>
                </select>
              </div>
              <div className="fg"><div className="fl">Topic focus</div>
                <input className="fi" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Kafka, AI agents…" />
              </div>
              <div className="fg"><div className="fl">Goal</div>
                <select className="fsel" value={goal} onChange={e => setGoal(e.target.value)}>
                  <option>Build authority</option>
                  <option>Grow audience</option>
                  <option>Launch product</option>
                  <option>Generate leads</option>
                </select>
              </div>
              <div className="fg"><div className="fl">Platform</div>
                <select className="fsel" value={platform} onChange={e => setPlatform(e.target.value)}>
                  <option>All platforms</option>
                  <option>LinkedIn</option>
                  <option>YouTube</option>
                  <option>Instagram</option>
                </select>
              </div>
              <div className="fg"><div className="fl">Count</div>
                <select className="fsel" value={count} onChange={e => setCount(e.target.value)}>
                  <option value="5">5 ideas</option>
                  <option value="10">10 ideas</option>
                  <option value="20">20 ideas</option>
                </select>
              </div>
              <button className="btn bp" style={{ width: "100%" }} onClick={generate} disabled={loading}>
                {loading ? "Generating…" : "Generate ideas"}
              </button>
              {error && <div style={{ fontSize: 12, color: "var(--rd)", marginTop: 8 }}>{error}</div>}
            </div>
          </div>

          <div>
            {ideas.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{filtered.length} idea{filtered.length !== 1 ? "s" : ""}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["All", "High", "Medium", "Low"].map(f => (
                    <span key={f} className={`tag ${filter === f ? "tac" : "tn"}`} style={{ cursor: "pointer" }} onClick={() => setFilter(f)}>{f}</span>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 13 }}>
                Generating ideas with Gemini…
              </div>
            )}

            {!loading && ideas.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 13 }}>
                Set your parameters and click Generate ideas.
              </div>
            )}

            {filtered.map((idea, idx) => (
              <div key={idx} className="idea-card">
                <div className="idh">
                  <div className="idscore">{idea.score}</div>
                  <div className="idt">{idea.title}</div>
                  <span className={`tag ${IMP[idea.impact] ?? "tn"}`}>{idea.impact}</span>
                </div>
                <div className="idhook">{idea.hook}</div>
                <div className="idtags">
                  {idea.formats.map(t => <span key={t} className="tag tn">{t}</span>)}
                  <span className="tag ta">{idea.audience}</span>
                </div>
                <div className="cair" style={{ fontSize: 12.5, marginBottom: 10, color: "var(--t2)" }}>{idea.rationale}</div>
                <div className="idact">
                  <button className="btn bp" onClick={() => navigate("studio", { idea })}>Create</button>
                  <button
                    className="btn bs"
                    disabled={saving.has(idx) || saved.has(idx)}
                    onClick={() => saveIdea(idea, idx)}
                  >{saved.has(idx) ? "Saved ✓" : saving.has(idx) ? "Saving…" : "Save"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "saved" && (
        <div>
          {savedLoading && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 13 }}>
              Loading saved ideas…
            </div>
          )}
          {!savedLoading && savedIdeas.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--t3)", fontSize: 13 }}>
              No saved ideas yet. Generate some and hit Save.
            </div>
          )}
          {savedIdeas.map(idea => (
            <div key={idea.id} className="idea-card">
              <div className="idh">
                <div className="idscore">{idea.score}</div>
                <div className="idt">{idea.title}</div>
                <span className={`tag ${IMP[idea.impact] ?? "tn"}`}>{idea.impact}</span>
              </div>
              <div className="idhook">{idea.hook}</div>
              <div className="idtags">
                {idea.formats.map(t => <span key={t} className="tag tn">{t}</span>)}
                <span className="tag ta">{idea.audience}</span>
              </div>
              <div className="cair" style={{ fontSize: 12.5, marginBottom: 10, color: "var(--t2)" }}>{idea.rationale}</div>
              <div className="idact">
                <button className="btn bp" onClick={() => navigate("studio", { idea })}>Create</button>
                <button
                  className="btn bs"
                  disabled={removing.has(idea.id)}
                  onClick={() => removeIdea(idea.id)}
                  style={{ color: "var(--rd)" }}
                >{removing.has(idea.id) ? "Removing…" : "Remove"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
