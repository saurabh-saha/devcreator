"use client";
import { useState, useEffect, useRef } from "react";
import { BrainMark } from "./brain-mark";
import { Dashboard } from "@/screens/dashboard";
import { Chat } from "@/screens/chat";
import { Insights } from "@/screens/insights";
import { Ideas } from "@/screens/ideas";
import { Studio } from "@/screens/studio";
import { Campaigns } from "@/screens/campaigns";
import { Projects } from "@/screens/projects";
import { Knowledge } from "@/screens/knowledge";
import { Analytics } from "@/screens/analytics";
import { Integrations } from "@/screens/integrations";
import { Profile } from "@/screens/profile";
import { useSession, signOut } from "next-auth/react";

type Screen = "dashboard" | "chat" | "insights" | "ideas" | "studio" | "campaigns" | "projects" | "knowledge" | "analytics" | "integrations" | "profile";

const TITLES: Record<Screen, string> = {
  dashboard: "Dashboard", chat: "Creator Brain", insights: "Insights",
  ideas: "Idea Mentor", studio: "Content Studio", campaigns: "Campaigns",
  projects: "Projects", knowledge: "Knowledge Base", analytics: "Analytics",
  integrations: "Integrations", profile: "Profile",
};

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75"/></svg> },
  { id: "chat", label: "Chat", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "insights", label: "Insights", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "ideas", label: "Ideas", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg> },
  { id: "studio", label: "Create", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];

const NAV_WORK = [
  { id: "campaigns", label: "Campaigns", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg> },
  { id: "projects", label: "Projects", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polygon points="12 2 2 7 12 12 22 7 12 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><polyline points="2 17 12 22 22 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><polyline points="2 12 12 17 22 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];

const NAV_LIB = [
  { id: "knowledge", label: "Knowledge", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "analytics", label: "Analytics", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg> },
];

function pathToScreen(path: string): Screen {
  const seg = path.replace(/^\//, "") || "dashboard";
  const valid: Screen[] = ["dashboard","chat","insights","ideas","studio","campaigns","projects","knowledge","analytics","integrations","profile"];
  return valid.includes(seg as Screen) ? (seg as Screen) : "dashboard";
}

export function AppShell() {
  const { data: sessionData } = useSession();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialScreen = params?.get("screen")
    ? (params.get("screen") as Screen)
    : (typeof window !== "undefined" ? pathToScreen(window.location.pathname) : "dashboard");
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [studioIdea, setStudioIdea] = useState<Record<string, any> | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (...args) => {
      const res = await orig(...args);
      if (res.status >= 500) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
        const msg = `Server error ${res.status} on ${url.replace(window.location.origin, "")}`;
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 5000);
      }
      return res;
    };
    return () => { window.fetch = orig; };
  }, []);

  const [errorBanner, setErrorBanner] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    const err = p.get("connect_error");
    const reason = p.get("reason") ?? "";
    if (!err) return null;
    if (reason.toLowerCase().includes("scope")) return `LinkedIn connection failed — the app doesn't have permission for that scope. Basic profile was connected instead.`;
    return `Failed to connect ${err}${reason ? `: ${reason}` : ""}`;
  });

  // Clear query params on mount
  if (typeof window !== "undefined" && (params?.get("screen") || params?.get("connected") || params?.get("connect_error"))) {
    window.history.replaceState({}, "", window.location.pathname);
  }

  function navigate(s: string, state?: Record<string, any>) {
    const next = s as Screen;
    if (next === "studio" && state?.idea) setStudioIdea(state.idea);
    setScreen(next);
    const path = next === "dashboard" ? "/" : `/${next}`;
    window.history.pushState({}, "", path);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function NavItem({ id, label, icon }: { id: string; label: string; icon: React.ReactNode }) {
    return (
      <button className={`sb-item${screen === id ? " active" : ""}`} onClick={() => navigate(id)}>
        {icon}{label}
      </button>
    );
  }

  return (
    <div className="shell">
      {/* SIDEBAR */}
      <aside className="sb">
        <div className="sb-logo">
          <BrainMark size={18} className="brain-mark" />
          <span className="sb-wordmark">DevCreator</span>
        </div>
        <nav className="sb-nav">
          {NAV.map(n => <NavItem key={n.id} {...n} />)}
          <div className="sb-div" />
          <div className="sb-sect">Work</div>
          {NAV_WORK.map(n => <NavItem key={n.id} {...n} />)}
          <div className="sb-div" />
          <div className="sb-sect">Library</div>
          {NAV_LIB.map(n => <NavItem key={n.id} {...n} />)}
          <div className="sb-div" />
          <NavItem id="integrations" label="Integrations" icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.75"/><circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.75"/><circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.75"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>} />
        </nav>
        <div className="sb-user" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <button onClick={() => navigate("profile")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "none", border: "none", textAlign: "left", padding: 0, minWidth: 0 }}>
            {sessionData?.user?.image
              ? <img src={sessionData.user.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              : <div className="sb-av">{(sessionData?.user?.name ?? "U")[0].toUpperCase()}</div>
            }
            <div style={{ minWidth: 0 }}>
              <div className="sb-uname">{sessionData?.user?.name ?? "—"}</div>
              <div className="sb-uemail">{sessionData?.user?.email ?? ""}</div>
            </div>
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ fontSize: 11, color: "var(--t3)", background: "none", border: "1px solid var(--bd)", borderRadius: 5, padding: "4px 10px", cursor: "pointer", textAlign: "center" }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <span className="tb-title">{TITLES[screen]}</span>
          <div className="tb-right">
            <button className="tb-icon" title="Toggle theme" onClick={toggleTheme}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.75"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
            </button>
            <button className="btn-new">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              New
            </button>
          </div>
        </header>

        <div className="ca">
          {toast && (
            <div style={{
              position: "fixed", bottom: 20, right: 20, zIndex: 9999,
              background: "var(--err-bg, #3a1a1a)", color: "var(--err, #f87171)",
              border: "1px solid var(--err-bd, #7f1d1d)",
              borderRadius: 8, padding: "10px 14px", fontSize: 12,
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)", maxWidth: 360,
            }}>
              <span>⚠ {toast}</span>
              <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, opacity: 0.7 }}>×</button>
            </div>
          )}
          {errorBanner && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "10px 16px", background: "var(--err-bg, #3a1a1a)", color: "var(--err, #f87171)",
              borderBottom: "1px solid var(--err-bd, #7f1d1d)", fontSize: 12,
            }}>
              <span>⚠ {errorBanner}</span>
              <button onClick={() => setErrorBanner(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", opacity: 0.7 }}>×</button>
            </div>
          )}
          {screen === "chat" ? (
            <Chat navigate={navigate} />
          ) : (
            <div className="screen">
              {screen === "dashboard" && <Dashboard navigate={navigate} />}
              {screen === "insights" && <Insights navigate={navigate} />}
              {screen === "ideas" && <Ideas navigate={navigate} />}
              {screen === "studio" && <Studio idea={studioIdea as any} navigate={navigate} />}
              {screen === "campaigns" && <Campaigns navigate={navigate} />}
              {screen === "projects" && <Projects />}
              {screen === "knowledge" && <Knowledge />}
              {screen === "analytics" && <Analytics navigate={navigate} />}
              {screen === "integrations" && <Integrations />}
              {screen === "profile" && <Profile navigate={navigate} session={sessionData?.user ?? {}} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
