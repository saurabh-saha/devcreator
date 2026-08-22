"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { LoginScreen } from "@/screens/onboarding/login";
import { ProfileScreen } from "@/screens/onboarding/profile";
import { ConnectScreen } from "@/screens/onboarding/connect";
import { BuildingScreen } from "@/screens/onboarding/building";

type Step = "login" | "profile" | "connect" | "building" | "app";

export default function Home() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<Step>("login");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      setStep("login");
      return;
    }

    const key = (k: string) => `${k}_${session.user?.email ?? "anon"}`;

    // Check localStorage first for fast path
    const done = localStorage.getItem(key("ob_done"));
    if (done) { setStep("app"); return; }

    // Check DB — if user already has a creator profile, skip onboarding entirely
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.profile) {
          // Already onboarded in another browser/session
          localStorage.setItem(key("ob_done"), "1");
          setStep("app");
          return;
        }
        // Fall back to localStorage-based step tracking
        const savedStep = localStorage.getItem(key("ob_step")) as Step | null;
        if (savedStep && savedStep !== "login" && savedStep !== "app") {
          setStep(savedStep);
          return;
        }
        const profileDone = localStorage.getItem(key("ob_profile"));
        if (profileDone) { setStep("connect"); return; }
        setStep("profile");
      })
      .catch(() => {
        // Network error — fall back to localStorage
        const savedStep = localStorage.getItem(key("ob_step")) as Step | null;
        if (savedStep && savedStep !== "login" && savedStep !== "app") { setStep(savedStep); return; }
        const profileDone = localStorage.getItem(key("ob_profile"));
        if (profileDone) { setStep("connect"); return; }
        setStep("profile");
      });
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="ob-shell">
        <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    // Redirect sub-pages (e.g. /analytics) back to / for login
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.replace("/");
      return null;
    }
    return <LoginScreen />;
  }

  const key = (k: string) => `${k}_${session.user?.email ?? "anon"}`;

  if (step === "profile") {
    return (
      <ProfileScreen
        name={session.user?.name ?? "there"}
        onContinue={(data) => {
          localStorage.setItem(key("ob_profile"), JSON.stringify(data));
          setStep("connect");
        }}
      />
    );
  }

  if (step === "connect") {
    return (
      <ConnectScreen
        onContinue={(connected) => {
          setConnectedPlatforms(connected);
          localStorage.setItem(key("ob_step"), "building");
          setStep("building");
        }}
      />
    );
  }

  if (step === "building") {
    return (
      <BuildingScreen
        connected={connectedPlatforms}
        onDone={() => {
          localStorage.removeItem(key("ob_step"));
          localStorage.setItem(key("ob_done"), "1");
          setStep("app");
        }}
      />
    );
  }

  return <AppShell />;
}
