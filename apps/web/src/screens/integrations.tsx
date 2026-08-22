"use client";
import { useEffect, useState } from "react";

type Account = {
  id: string;
  platform: string;
  handle: string;
  connectedAt: string;
};

const PLATFORM_META: Record<string, { label: string; desc: string; connectUrl: string; type: "oauth" | "username" }> = {
  linkedin:  { label: "LinkedIn",     desc: "Posts, articles, follower data",      connectUrl: "/api/connect/linkedin",  type: "oauth" },
  github:    { label: "GitHub",       desc: "Repos, READMEs, activity",            connectUrl: "/api/connect/github",    type: "oauth" },
  medium:    { label: "Medium",       desc: "Articles imported via RSS",            connectUrl: "/api/connect/medium",    type: "username" },
  substack:  { label: "Substack",     desc: "Newsletter posts imported via RSS",    connectUrl: "/api/connect/substack",  type: "username" },
  youtube:   { label: "YouTube",      desc: "Videos, analytics, audience",          connectUrl: "#",                      type: "oauth" },
  instagram: { label: "Instagram",    desc: "Posts, reels, reach data",             connectUrl: "#",                      type: "oauth" },
  notion:    { label: "Notion",       desc: "Add your notes and docs",              connectUrl: "#",                      type: "oauth" },
  google_drive: { label: "Google Drive", desc: "Index your docs and slides",        connectUrl: "#",                      type: "oauth" },
};

const ALL_PLATFORMS = ["linkedin", "github", "medium", "substack", "youtube", "instagram", "notion", "google_drive"];
const COMING_SOON = new Set(["youtube", "instagram", "notion", "google_drive"]);

export function Integrations() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [modal, setModal] = useState<{ platform: string; label: string } | null>(null);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await fetch("/api/profile").then(r => r.ok ? r.json() : { accounts: [] });
    setAccounts(data.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function disconnect(platform: string) {
    setDisconnecting(platform);
    await fetch(`/api/connect/${platform}/disconnect`, { method: "POST" });
    await load();
    setDisconnecting(null);
  }

  function connect(platform: string) {
    const meta = PLATFORM_META[platform];
    if (!meta) return;
    if (meta.type === "oauth") {
      window.location.href = meta.connectUrl + "?from=integrations";
    } else {
      setUsername("");
      setUsernameError("");
      setModal({ platform, label: meta.label });
    }
  }

  async function submitUsername() {
    if (!modal || !username.trim()) return;
    setSaving(true);
    setUsernameError("");
    const res = await fetch(`/api/connect/${modal.platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setUsernameError(d.error ?? "Not found — check the username");
      setSaving(false);
      return;
    }
    setModal(null);
    setSaving(false);
    await load();
  }

  const connectedMap = new Map(accounts.map(a => [a.platform, a]));

  return (
    <div className="page">
      {modal && (
        <div className="ob-modal-backdrop" onClick={() => setModal(null)}>
          <div className="ob-modal" onClick={e => e.stopPropagation()}>
            <h2 className="ob-modal-title">Connect {modal.label}</h2>
            <p className="ob-modal-sub">Enter your {modal.label} username</p>
            <input
              className="ob-modal-input"
              placeholder={modal.platform === "substack" ? "yourname (from yourname.substack.com)" : "@yourhandle"}
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitUsername()}
              autoFocus
            />
            {usernameError && <p className="ob-modal-error">{usernameError}</p>}
            <div className="ob-modal-actions">
              <button className="ob-skip" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn bp" onClick={submitUsername} disabled={!username.trim() || saving}>
                {saving ? "Verifying…" : "Connect →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ph">
        <div className="pt">Integrations</div>
        <div className="ps">Connect your platforms to build your Creator Brain.</div>
      </div>

      <div className="g2" style={{ marginBottom: 12 }}>
        {ALL_PLATFORMS.map(platform => {
          const meta = PLATFORM_META[platform];
          const account = connectedMap.get(platform);
          const isConnected = !!account;
          const isSoon = COMING_SOON.has(platform);

          return (
            <div key={platform} className="pc" style={!isConnected ? { borderStyle: "dashed", opacity: isSoon ? 0.5 : 0.75 } : {}}>
              <div className="pch">
                <div className="pn">
                  <span className={`dot ${isConnected ? "dg" : "dgr"}`} />
                  {meta.label}
                  {isSoon && <span style={{ fontSize: 10, color: "var(--t3)", marginLeft: 6 }}>coming soon</span>}
                </div>
                <span className={`tag ${isConnected ? "tg" : "tn"}`}>
                  {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>

              {isConnected ? (
                <>
                  <div className="phand">{account.handle}</div>
                  <div className="psync">
                    Connected {new Date(account.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="pact">
                    <button className="btn bg-btn" style={{ fontSize: 12, padding: "5px 10px" }}
                      onClick={() => connect(platform)}>
                      Reconnect
                    </button>
                    <button className="btn bg-btn" style={{ fontSize: 12, padding: "5px 10px", color: "var(--err, #e55)" }}
                      onClick={() => disconnect(platform)}
                      disabled={disconnecting === platform}>
                      {disconnecting === platform ? "…" : "Disconnect"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="phand" style={{ color: "var(--t3)" }}>{meta.desc}</div>
                  <div className="pact">
                    <button className="btn bao" style={{ fontSize: 12, padding: "5px 10px" }}
                      onClick={() => connect(platform)}
                      disabled={isSoon}>
                      {isSoon ? "Coming soon" : `Connect ${meta.label}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
