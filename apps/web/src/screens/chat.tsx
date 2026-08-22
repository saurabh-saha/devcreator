"use client";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { BrainMark } from "@/components/brain-mark";

const CHIPS = [
  "What should I post this week?",
  "Find my content gaps",
  "Analyze my best performing posts",
  "Turn my latest video into posts",
];

export function Chat({ navigate: _navigate }: { navigate: (s: string) => void }) {
  const { messages, input, setInput, append, isLoading, status } = useChat({
    api: "/api/chat",
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function send(msg?: string) {
    const m = msg ?? input.trim();
    if (!m || isLoading) return;
    setInput("");
    append({ role: "user", content: m });
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="screen-chat">
      {!hasMessages ? (
        <div className="chat-empty">
          <div className="chat-mark">
            <BrainMark size={52} />
          </div>
          <div className="chat-heading">Your Creator Brain</div>
          <div className="chat-sub">Ask about your content, your audience, what&apos;s working, or what to create next.</div>
          <div className="chat-chips">
            {CHIPS.map((c) => (
              <button key={c} className="cc" onClick={() => send(c)}>{c}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-convo">
          {messages.map((m) => (
            m.role === "user" ? (
              <div key={m.id} className="cmu">
                <div className="cbu">{m.content}</div>
              </div>
            ) : (
              <div key={m.id} className="cmai">
                <div className="cmal">
                  <BrainMark size={12} />
                  Brain
                </div>
                <div className="cair" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                  {m.content}
                </div>
              </div>
            )
          ))}
          {isLoading && status === "submitted" && (
            <div className="cmai">
              <div className="cmal"><BrainMark size={12} />Brain</div>
              <div className="cair" style={{ color: "var(--t3)" }}>Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <div className="chat-input-row">
        <input
          className="cinput"
          placeholder="Ask your Brain anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={isLoading}
        />
        <button className="csend" onClick={() => send()} disabled={isLoading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <line x1="22" y1="2" x2="11" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}
