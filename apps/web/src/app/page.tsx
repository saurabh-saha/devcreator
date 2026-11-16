"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { LoginScreen } from "@/screens/onboarding/login";
import { ProfileScreen } from "@/screens/onboarding/profile";
import { ConnectScreen } from "@/screens/onboarding/connect";
import { BuildingScreen } from "@/screens/onboarding/building";

type Step = "login" | "profile" | "connect" | "building" | "app";

const GUEST_KEY = "dc-guest";

export default function Home() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<Step>("login");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  // Guest mode: try Ideas + Create without an account (flag kept on this device).
  // Read synchronously so a guest reloading /ideas isn't bounced to the login screen.
  const [guest, setGuest] = useState(() => typeof window !== "undefined" && localStorage.getItem(GUEST_KEY) === "1");
  useEffect(() => { if (session) localStorage.removeItem(GUEST_KEY); }, [session]);

  const startGuest = () => {
    localStorage.setItem(GUEST_KEY, "1");
    setGuest(true);
    window.history.pushState({}, "", "/ideas");
  };
  const exitGuest = () => {
    localStorage.removeItem(GUEST_KEY);
    setGuest(false);
    window.history.pushState({}, "", "/");
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { setStep("login"); return; }

    // Check DB — if user already has a creator profile, go straight to app
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => setStep(data?.profile ? "app" : "profile"))
      .catch(() => setStep("profile"));
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="ob-shell">
        <div style={{ color: "var(--t3)", fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  if ((status === "unauthenticated" || !session) && guest) {
    return <AppShell guest onExitGuest={exitGuest} />;
  }

  if (status === "unauthenticated" || !session) {
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.replace("/");
      return null;
    }
    return <LoginScreen onTryGuest={startGuest} />;
  }

  if (step === "profile") {
    return (
      <ProfileScreen
        name={session.user?.name ?? "there"}
        onContinue={() => setStep("connect")}
      />
    );
  }

  if (step === "connect") {
    return (
      <ConnectScreen
        onContinue={(connected) => {
          setConnectedPlatforms(connected);
          setStep("building");
        }}
      />
    );
  }

  if (step === "building") {
    return (
      <BuildingScreen
        connected={connectedPlatforms}
        onDone={() => setStep("app")}
      />
    );
  }

  return <AppShell />;
}
