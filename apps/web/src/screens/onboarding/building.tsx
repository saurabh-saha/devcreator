"use client";
import { useEffect, useState } from "react";
import { BrainMark } from "@/components/brain-mark";

const STEPS = [
  { label: "Loading connected accounts" },
  { label: "Importing content" },
  { label: "Analyzing posts and articles" },
  { label: "Identifying content topics" },
  { label: "Mapping your content patterns" },
  { label: "Building your creator profile" },
];

type StepStatus = "pending" | "active" | "done" | "error";

export function BuildingScreen({ connected, onDone }: { connected: string[]; onDone: () => void }) {
  const [statuses, setStatuses] = useState<StepStatus[]>(STEPS.map(() => "pending"));
  const [details, setDetails] = useState<(string | undefined)[]>(STEPS.map(() => undefined));
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/brain/build");

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);

        if (data.done) {
          es.close();
          setTimeout(() => setDone(true), 700);
          return;
        }

        if (data.error) {
          es.close();
          setError(data.error);
          return;
        }

        const { stepIndex, status, detail } = data as { stepIndex: number; status: StepStatus; detail?: string };

        setStatuses(prev => {
          const next = [...prev];
          next[stepIndex] = status;
          return next;
        });

        if (detail) {
          setDetails(prev => {
            const next = [...prev];
            next[stepIndex] = detail;
            return next;
          });
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      es.close();
      // If we got an error before any steps completed, fall back to fake timers
      setStatuses(prev => {
        if (prev.every(s => s === "pending")) {
          // Nothing started — run fake timers as fallback
          STEPS.forEach((_, i) => {
            setTimeout(() => {
              setStatuses(p => { const n = [...p]; n[i] = "done"; return n; });
              if (i === STEPS.length - 1) setTimeout(() => setDone(true), 700);
            }, 400 + i * 1000);
          });
        }
        return prev;
      });
    };

    return () => es.close();
  }, []);

  if (done) {
    return (
      <div className="ob-shell">
        <div className="ob-card ob-card-wide ob-done">
          <div className="ob-done-mark">
            <BrainMark size={48} className="brain-mark" />
          </div>
          <h1 className="ob-h1">Your Creator Brain is ready 🧠</h1>
          <p className="ob-sub">
            {connected.length > 0
              ? `I found strong content opportunities based on your existing expertise.`
              : `Your Brain is ready. Connect your platforms to unlock full personalization.`}
          </p>
          <button className="btn bp ob-cta" onClick={onDone}>
            Explore my insights →
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="ob-shell">
      <div className="ob-card ob-card-wide">
        <div className="ob-building-icon">
          <BrainMark size={36} className="brain-mark-spin" />
        </div>
        <h1 className="ob-h1">Building your Creator Brain…</h1>
        {error && <p style={{ color: "var(--err, #e55)", fontSize: 13, marginBottom: 8 }}>Error: {error}</p>}

        <div className="ob-steps">
          {STEPS.map((step, i) => {
            const s = statuses[i];
            const detail = details[i];
            return (
              <div key={i} className={`ob-step ob-step-${s}`}>
                <div className="ob-step-icon">
                  {s === "done" ? "✓" : s === "active" ? <span className="ob-spinner" /> : s === "error" ? "✗" : "·"}
                </div>
                <span>
                  {step.label}
                  {detail && s === "done" && (
                    <span style={{ opacity: 0.55, fontSize: "0.85em", marginLeft: 6 }}>— {detail}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
