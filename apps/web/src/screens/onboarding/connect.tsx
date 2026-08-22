"use client";
import { useState, useEffect } from "react";

const PLATFORMS = [
  { id: "linkedin",  label: "LinkedIn",  icon: "in", desc: "Posts, articles, follower data",  type: "oauth",    oauthUrl: "/api/connect/linkedin" },
  { id: "youtube",   label: "YouTube",   icon: "▶",  desc: "Videos, analytics, audience",     type: "soon",     oauthUrl: null },
  { id: "instagram", label: "Instagram", icon: "◉",  desc: "Posts, reels, reach data",        type: "soon",     oauthUrl: null },
  { id: "github",    label: "GitHub",    icon: "⌥",  desc: "Repos, READMEs, activity",        type: "oauth",    oauthUrl: "/api/connect/github" },
  { id: "medium",    label: "Medium",    icon: "M",  desc: "Articles, claps, reads",          type: "username", oauthUrl: null },
  { id: "substack",  label: "Substack",  icon: "S",  desc: "Newsletters, subscriber data",    type: "username", oauthUrl: null },
];

const REAL_PLATFORMS = new Set(["github", "medium", "substack", "linkedin"]);

export function ConnectScreen({ onContinue }: { onContinue: (connected: string[]) => void }) {
  const [connected, setConnected] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [usernameModal, setUsernameModal] = useState<{ platformId: string; label: string } | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justConnected = params.get("connected");
    if (justConnected) {
      setConnected(prev => prev.includes(justConnected) ? prev : [...prev, justConnected]);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function markConnected(platformId: string) {
    setConnected(prev => prev.includes(platformId) ? prev : [...prev, platformId]);
  }

  async function connect(platformId: string, type: string, oauthUrl: string | null) {
    if (connected.includes(platformId)) return;

    if (type === "oauth" && oauthUrl) {
      window.location.href = oauthUrl;
      return;
    }

    if (type === "username") {
      const p = PLATFORMS.find(p => p.id === platformId)!;
      setUsernameInput("");
      setUsernameError("");
      setUsernameModal({ platformId, label: p.label });
      return;
    }

    // coming soon — do nothing
  }

  async function submitUsername() {
    if (!usernameModal || !usernameInput.trim()) return;
    setConnecting(usernameModal.platformId);
    setUsernameError("");

    try {
      const res = await fetch(`/api/connect/${usernameModal.platformId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setUsernameError(data.error ?? "Not found — check the username");
        setConnecting(null);
        return;
      }

      markConnected(usernameModal.platformId);
      setUsernameModal(null);
    } catch {
      setUsernameError("Something went wrong, try again");
    }
    setConnecting(null);
  }

  return (
    <div className="ob-shell">
      {usernameModal && (
        <div className="ob-modal-backdrop" onClick={() => setUsernameModal(null)}>
          <div className="ob-modal" onClick={e => e.stopPropagation()}>
            <h2 className="ob-modal-title">Connect {usernameModal.label}</h2>
            <p className="ob-modal-sub">Enter your {usernameModal.label} username</p>
            <input
              className="ob-modal-input"
              placeholder={usernameModal.platformId === "substack" ? "yourname (from yourname.substack.com)" : "@yourhandle"}
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitUsername()}
              autoFocus
            />
            {usernameError && <p className="ob-modal-error">{usernameError}</p>}
            <div className="ob-modal-actions">
              <button className="ob-skip" onClick={() => setUsernameModal(null)}>Cancel</button>
              <button
                className="btn bp"
                onClick={submitUsername}
                disabled={!usernameInput.trim() || connecting === usernameModal.platformId}
              >
                {connecting === usernameModal.platformId ? "Verifying…" : "Connect →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ob-card ob-card-wide">
        <h1 className="ob-h1">Connect your content</h1>
        <p className="ob-sub">I'll use your existing content to understand your expertise, audience and style.</p>

        <div className="ob-platforms">
          {PLATFORMS.map(p => {
            const isConnected = connected.includes(p.id);
            const isConnecting = connecting === p.id;
            const isComingSoon = p.type === "soon";
            return (
              <div key={p.id} className={`ob-platform ${isConnected ? "ob-platform-connected" : ""}`}>
                <div className="ob-platform-icon">{p.icon}</div>
                <div className="ob-platform-info">
                  <div className="ob-platform-name">
                    {p.label}
                    {isComingSoon && <span style={{ fontSize: 10, color: "var(--t3)", marginLeft: 6 }}>coming soon</span>}
                  </div>
                  <div className="ob-platform-desc">{p.desc}</div>
                </div>
                <button
                  className={`ob-connect-btn ${isConnected ? "ob-connect-btn-done" : ""}`}
                  onClick={() => connect(p.id, p.type, p.oauthUrl)}
                  disabled={isConnected || isConnecting || isComingSoon}
                >
                  {isConnecting ? "…" : isConnected ? "✓ Connected" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="ob-privacy">🔒 Read-only access only. You control what we can see.</p>

        <div className="ob-connect-actions">
          <button
            className="btn bp ob-cta"
            onClick={() => onContinue(connected)}
            disabled={connected.length === 0}
          >
            {connected.length === 0
              ? "Connect at least one platform"
              : `Continue with ${connected.length} platform${connected.length > 1 ? "s" : ""} →`}
          </button>
          <button className="ob-skip" onClick={() => onContinue([])}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}
