"use client";
import { useState } from "react";

const TOPIC_OPTIONS = ["AI", "Machine Learning", "Software Engineering", "Backend", "Startups", "DevOps", "System Design", "Open Source", "Career", "Leadership"];
const AUDIENCE_OPTIONS = ["Developers", "AI Engineers", "Engineering Managers", "Technical Founders", "Backend Engineers", "Startup CTOs", "Students"];

export function ProfileScreen({ name, onContinue }: { name: string; onContinue: (data: { topics: string[]; audiences: string[] }) => void }) {
  const [topics, setTopics] = useState<string[]>(["AI", "Software Engineering"]);
  const [audiences, setAudiences] = useState<string[]>(["Developers", "AI Engineers"]);

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  }

  return (
    <div className="ob-shell">
      <div className="ob-card ob-card-wide">
        <h1 className="ob-h1">Welcome, {name.split(" ")[0]} 👋</h1>
        <p className="ob-sub">Let's build your Creator Brain.</p>

        <div className="ob-section">
          <div className="ob-label">What do you create?</div>
          <div className="ob-chips">
            {TOPIC_OPTIONS.map(t => (
              <button
                key={t}
                className={`ob-chip ${topics.includes(t) ? "ob-chip-on" : ""}`}
                onClick={() => toggle(topics, setTopics, t)}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className="ob-section">
          <div className="ob-label">Who do you want to reach?</div>
          <div className="ob-chips">
            {AUDIENCE_OPTIONS.map(a => (
              <button
                key={a}
                className={`ob-chip ${audiences.includes(a) ? "ob-chip-on" : ""}`}
                onClick={() => toggle(audiences, setAudiences, a)}
              >{a}</button>
            ))}
          </div>
        </div>

        <p className="ob-hint">AI will infer more from your content once you connect your accounts.</p>

        <button
          className="btn bp ob-cta"
          onClick={() => onContinue({ topics, audiences })}
          disabled={topics.length === 0}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
