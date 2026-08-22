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

const IMP: Record<string, string> = { High: "tg", Medium: "ta", Low: "tr" };

export function Ideas({ navigate }: { navigate: (s: string, state?: any) => void }) {
  const [audience, setAudience] = useState("AI Engineers");
  const [topic, setTopic] = useState("Agentic AI");
  const [goal, setGoal] = useState("Build authority");
  const [platform, setPlatform] = useState("All platforms");
  const [count, setCount] = useState("10");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  useEffect(() => { generate(); }, []);

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

  const filtered = (filter === "All" ? ideas : ideas.filter(i => i.impact === filter))
    .slice().sort((a, b) => b.score - a.score);

  return (
    <div className="page">
      <div className="ph"><div className="pt">Idea Mentor</div><div className="ps">Generate ideas rooted in your expertise and audience.</div></div>
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

          {filtered.map((idea, i) => (
            <div key={i} className="idea-card">
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
                <button className="btn bs">Save</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
