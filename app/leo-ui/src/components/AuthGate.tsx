"use client";

import { LogIn, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LeoOrb from "./LeoOrb";
import CodeRainBackground from "./CodeRainBackground";
import { firebaseEnabled } from "@/lib/firebase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, error, signIn } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <CodeRainBackground />
        <LeoOrb mood="thinking" size={120} />
      </div>
    );
  }

  if (status === "signed-in") {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4">
      <CodeRainBackground />
      <div className="glass-panel flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl p-8 text-center">
        <LeoOrb mood="idle" size={120} hud />
        <div>
          <h1 className="text-lg font-semibold text-foreground">LEO AI</h1>
          <p className="font-mono text-[11px] text-muted">
            SmartLabs NeuraLink · sign in to continue
          </p>
        </div>

        {!firebaseEnabled ? (
          <div className="flex items-start gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3 text-left text-xs text-accent-amber">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            Firebase isn&apos;t configured in this environment, so sign-in is
            unavailable here.
          </div>
        ) : (
          <button
            onClick={signIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-cyan/15 px-4 py-2.5 text-sm font-medium text-accent-cyan transition-colors hover:bg-accent-cyan/25"
          >
            <LogIn size={16} />
            Sign in with Google
          </button>
        )}

        {error ? (
          <p className="text-xs text-accent-magenta">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
