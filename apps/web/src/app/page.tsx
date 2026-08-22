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
    const done = localStorage.getItem("ob_done");
    if (done) { setStep("app"); return; }

    const savedStep = localStorage.getItem("ob_step") as Step | null;
    if (savedStep && savedStep !== "login" && savedStep !== "app") {
      setStep(savedStep);
      return;
    }
    const profileDone = localStorage.getItem("ob_profile");
    if (profileDone) { setStep("connect"); return; }
    setStep("profile");
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

  if (step === "profile") {
    return (
      <ProfileScreen
        name={session.user?.name ?? "there"}
        onContinue={(data) => {
          localStorage.setItem("ob_profile", JSON.stringify(data));
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
          localStorage.setItem("ob_step", "building");
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
          localStorage.removeItem("ob_step");
          localStorage.setItem("ob_done", "1");
          setStep("app");
        }}
      />
    );
  }

  return <AppShell />;
}
