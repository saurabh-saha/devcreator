"use client";
import { useEffect, useRef, useState } from "react";
import { BrainMark } from "@/components/brain-mark";

type MediumPost   = { title: string; url: string; publishedAt: string };
type SubstackPost = { title: string; url: string; comments: number; likes: number; publishedAt: string; audience: string };
type GitHubRepo   = { name: string; url: string; stars: number; forks: number; watchers: number; language: string; updatedAt: string };

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); }
function ago(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const CLAP_CACHE_KEY = "dc_medium_claps";

function fetchViaMediumExtension(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener("dc:medium-data", handler as EventListener);
      reject(new Error("timeout"));
    }, 10000);

    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener("dc:medium-data", handler as EventListener);
      if (detail.ok) resolve(detail.text);
      else reject(new Error(detail.error ?? "fetch failed"));
    }

    window.addEventListener("dc:medium-data", handler as EventListener);
    window.dispatchEvent(new CustomEvent("dc:fetch-medium", { detail: { url, requestId } }));
  });
}

export function Analytics({ navigate }: { navigate: (s: string) => void }) {
  const [medium, setMedium]         = useState<MediumPost[]>([]);
  const [substack, setSubstack]     = useState<SubstackPost[]>([]);
  const [github, setGithub]         = useState<GitHubRepo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [mediumHandle, setMediumHandle] = useState<string | null>(null);
  const [extInstalled, setExtInstalled] = useState<boolean | null>(null);
  const [clapMap, setClapMap]       = useState<Record<string, number>>({});
  const [syncing, setSyncing]       = useState(false);
  const [syncMsg, setSyncMsg]       = useState<{ text: string; ok: boolean } | null>(null);
  const [fetchingUrl, setFetchingUrl] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    // Load claps from DB (authoritative), fall back to localStorage cache
    fetch("/api/claps")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.claps?.length) {
          const map: Record<string, number> = {};
          for (const { articleUrl, clapCount } of data.claps) map[articleUrl] = clapCount;
          setClapMap(map);
          localStorage.setItem(CLAP_CACHE_KEY, JSON.stringify(map));
        } else {
          try {
            const cached = localStorage.getItem(CLAP_CACHE_KEY);
            if (cached) setClapMap(JSON.parse(cached));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(CLAP_CACHE_KEY);
          if (cached) setClapMap(JSON.parse(cached));
        } catch {}
      });

    // Extension sets window.__dc_extension = true at document_start (before React mounts)
    if ((window as any).__dc_extension) {
      setExtInstalled(true);
    } else {
      const onReady = () => setExtInstalled(true);
      window.addEventListener("dc:extension-ready", onReady);
      const fallback = setTimeout(() => setExtInstalled(prev => prev ?? false), 600);
      cleanup = () => { window.removeEventListener("dc:extension-ready", onReady); clearTimeout(fallback); };
    }

    fetch("/api/stats")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setMedium(d.medium ?? []);
        setSubstack(d.substack ?? []);
        setGithub(d.github ?? []);
        setMediumHandle(d.mediumHandle ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => cleanup?.();
  }, []);

  async function syncClaps() {
    if (!mediumHandle) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const raw = await fetchViaMediumExtension(`https://medium.com/@${mediumHandle}?format=json`);
      const json = raw.replace(/^\]\)\}while\(1\);<\/x>/, "").trim();
      const data = JSON.parse(json);
      const posts = data?.payload?.references?.Post ?? {};
      const map: Record<string, number> = {};
      for (const post of Object.values(posts) as any[]) {
        if (!post?.uniqueSlug) continue;
        map[`https://medium.com/@${mediumHandle}/${post.uniqueSlug}`] =
          post.virtuals?.totalClapCount ?? post.clapCount ?? 0;
      }
      if (!Object.keys(map).length) {
        setSyncMsg({ text: "No articles found — are you logged into Medium?", ok: false });
      } else {
        setClapMap(map);
        localStorage.setItem(CLAP_CACHE_KEY, JSON.stringify(map));
        // Persist to DB
        fetch("/api/claps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claps: Object.entries(map).map(([url, count]) => ({ url, count })) }),
        }).catch(() => {});
        const total = Object.values(map).reduce((s, n) => s + n, 0);
        setSyncMsg({ text: `Synced ${Object.keys(map).length} articles · ${fmt(total)} total claps`, ok: true });
      }
    } catch (err: any) {
      if (err?.message === "timeout") {
        setSyncMsg({ text: "Extension timed out — make sure it's enabled", ok: false });
      } else {
        setSyncMsg({ text: "Make sure you're logged into Medium in this browser", ok: false });
      }
    }
    setSyncing(false);
  }

  const totalStars    = github.reduce((s, r) => s + r.stars, 0);
  const totalForks    = github.reduce((s, r) => s + r.forks, 0);
  const totalComments = substack.reduce((s, p) => s + p.comments, 0);
  const totalClaps    = Object.values(clapMap).reduce((s, n) => s + n, 0);
  const hasClaps      = Object.keys(clapMap).length > 0;

  function getClaps(url: string): number | null {
    return clapMap[url.split("?")[0]] ?? clapMap[url] ?? null;
  }

  const extPath = "/Users/saurabh/Documents/proj/devcreator/apps/extension";

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">Analytics</div>
        <div className="ps">Real data from your connected platforms.</div>
      </div>

      {/* Summary stats */}
      <div className="g4" style={{ marginBottom: 20 }}>
        <div className="stat-tile">
          <div className="stat-lbl">GitHub Stars</div>
          <div className="stat-val">{loading ? "—" : fmt(totalStars)}</div>
          <div className="stat-d">{github.length} repos</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl">GitHub Forks</div>
          <div className="stat-val">{loading ? "—" : fmt(totalForks)}</div>
          <div className="stat-d">across all repos</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl">Medium Claps</div>
          <div className="stat-val">{hasClaps ? fmt(totalClaps) : "—"}</div>
          <div className="stat-d">{loading ? "…" : `${medium.length} articles`}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-lbl">Substack Posts</div>
          <div className="stat-val">{loading ? "—" : substack.length}</div>
          <div className="stat-d">{totalComments} comments total</div>
        </div>
      </div>

      {/* GitHub repos */}
      {github.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="lbl" style={{ marginBottom: 0 }}>GitHub Repositories</div>
            <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>stars · forks</span>
          </div>
          {github.map((r, i) => (
            <div key={r.name} className="crow" style={{ borderBottom: i < github.length - 1 ? "1px solid var(--bd)" : "none" }}>
              <span className="cr-n">{i + 1}</span>
              <span className="cr-t">
                <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "var(--t1)", textDecoration: "none" }}>
                  {r.name.split("/")[1]}
                </a>
                {r.language && <span style={{ fontSize: 10, color: "var(--t3)", marginLeft: 8, fontFamily: "var(--mono)" }}>{r.language}</span>}
              </span>
              <span className="cr-p" style={{ color: "var(--t3)", fontSize: 11 }}>{ago(r.updatedAt)}</span>
              <span className="cr-v" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>★ {r.stars} · ⑂ {r.forks}</span>
            </div>
          ))}
        </div>
      )}

      {/* Medium articles */}
      {medium.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="lbl" style={{ marginBottom: 0 }}>Medium Articles</div>
            {extInstalled ? (
              <button
                className="btn bg-btn"
                style={{ fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
                onClick={syncClaps}
                disabled={syncing}
              >
                {syncing
                  ? <><span className="ob-spinner" style={{ width: 9, height: 9 }} /> Syncing…</>
                  : <>👏 Sync claps</>}
              </button>
            ) : extInstalled === false ? (
              <span style={{ fontSize: 10, color: "var(--t3)" }}>
                👏 claps —{" "}
                <button
                  style={{ background: "none", border: "none", color: "var(--ac, var(--t1))", fontSize: 10, cursor: "pointer", padding: 0 }}
                  onClick={() => document.getElementById("ext-install-banner")?.scrollIntoView({ behavior: "smooth" })}
                >
                  install extension ↓
                </button>
              </span>
            ) : null}
          </div>

          {syncMsg && (
            <div style={{
              padding: "8px 16px", fontSize: 12,
              color: syncMsg.ok ? "var(--ok, #4caf50)" : "var(--err, #e55)",
              borderBottom: "1px solid var(--bd)",
            }}>
              {syncMsg.ok ? "✓ " : "✗ "}{syncMsg.text}
            </div>
          )}

          {medium.map((p, i) => {
            const claps = getClaps(p.url);
            const slug = p.url.split("/").pop() ?? "";
            return (
              <div key={p.url} className="crow" style={{ borderBottom: i < medium.length - 1 ? "1px solid var(--bd)" : "none" }}>
                <span className="cr-n">{i + 1}</span>
                <span className="cr-t">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--t1)", textDecoration: "none" }}
                    onClick={extInstalled ? async (e) => {
                      e.preventDefault();
                      console.log("[clap] clicking", p.url);
                      setFetchingUrl(p.url);
                      try {
                        const raw = await fetchViaMediumExtension(`${p.url}?format=json`);
                        console.log("[clap] raw length", raw?.length, "starts with", raw?.slice(0, 60));
                        const json = raw.replace(/^\]\)\}while\(1\);<\/x>/, "").trim();
                        const data = JSON.parse(json);
                        // Individual article endpoint: payload.value; profile endpoint: payload.references.Post
                        const post = data?.payload?.value ?? (Object.values(data?.payload?.references?.Post ?? {})[0] as any);
                        console.log("[clap] post keys", post ? Object.keys(post) : "null", "clapCount", post?.virtuals?.totalClapCount, post?.clapCount);
                        if (post) {
                          const count = post.virtuals?.totalClapCount ?? post.clapCount ?? 0;
                          const updated = { ...clapMap, [p.url]: count };
                          setClapMap(updated);
                          localStorage.setItem(CLAP_CACHE_KEY, JSON.stringify(updated));
                          fetch("/api/claps", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ claps: [{ url: p.url, count }] }),
                          }).catch(() => {});
                        } else {
                          console.warn("[clap] no post found in payload, keys:", Object.keys(data?.payload ?? {}));
                        }
                      } catch (err) {
                        console.error("[clap] failed", err);
                      }
                      setFetchingUrl(null);
                      window.open(p.url, "_blank");
                    } : undefined}
                  >
                    {p.title}
                  </a>
                </span>
                <span className="cr-p" style={{ color: "var(--t3)", fontSize: 11 }}>{ago(p.publishedAt)}</span>
                <span className="cr-v" style={{ fontFamily: "var(--mono)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  {fetchingUrl === p.url
                    ? <><span className="ob-spinner" style={{ width: 10, height: 10 }} /><span style={{ color: "var(--t3)", fontSize: 11 }}>syncing…</span></>
                    : claps !== null ? `👏 ${fmt(claps)}` : extInstalled ? <span style={{ color: "var(--t3)", fontSize: 11 }}>click to sync</span> : <span style={{ color: "var(--t3)" }}>—</span>}
                </span>
              </div>
            );
          })}

          {/* Install extension prompt */}
          {extInstalled === false && (
            <div id="ext-install-banner" style={{
              padding: "14px 16px", borderTop: "1px solid var(--bd)",
              background: "var(--bg2, var(--bg))", display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>
                Install the DevCreator extension to sync clap counts
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.6 }}>
                The extension fetches your Medium stats using your browser session (no copy-paste needed).
              </div>
              <ol style={{ fontSize: 11, color: "var(--t2, var(--t1))", margin: 0, paddingLeft: 18, lineHeight: 2 }}>
                <li>Open <a href="chrome://extensions" style={{ color: "var(--ac, var(--t1))" }} onClick={e => { e.preventDefault(); navigator.clipboard.writeText("chrome://extensions"); alert("Copied! Paste in a new Chrome tab."); }}>chrome://extensions</a> in Chrome</li>
                <li>Enable <strong>Developer mode</strong> (top-right toggle)</li>
                <li>Click <strong>Load unpacked</strong> and select this folder:</li>
              </ol>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, padding: "6px 10px",
                background: "var(--bg)", border: "1px solid var(--bd)", borderRadius: 6,
                color: "var(--t2, var(--t1))", userSelect: "all",
              }}>
                {extPath}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>
                Then refresh this page — the Sync claps button will appear.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Substack posts */}
      {substack.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="lbl" style={{ marginBottom: 0 }}>Substack Newsletter</div>
            <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>comments · likes</span>
          </div>
          {substack.map((p, i) => (
            <div key={p.url} className="crow" style={{ borderBottom: i < substack.length - 1 ? "1px solid var(--bd)" : "none" }}>
              <span className="cr-n">{i + 1}</span>
              <span className="cr-t">
                <a href={p.url} target="_blank" rel="noreferrer" style={{ color: "var(--t1)", textDecoration: "none" }}>{p.title}</a>
              </span>
              <span className="cr-p" style={{ color: "var(--t3)", fontSize: 11 }}>{ago(p.publishedAt)}</span>
              <span className="cr-v" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                💬 {p.comments} · ❤️ {p.likes}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: 32 }}>Loading analytics…</div>
      )}

      {!loading && medium.length === 0 && substack.length === 0 && github.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
          Connect your platforms in Integrations to see real analytics.
        </div>
      )}
    </div>
  );
}
