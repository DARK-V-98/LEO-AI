"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar, { NavId } from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import DashboardHome from "@/components/DashboardHome";
import ChatPanel from "@/components/ChatPanel";
import HomeHero from "@/components/HomeHero";
import VoicesPanel from "@/components/VoicesPanel";
import WhatsAppChatsPanel from "@/components/WhatsAppChatsPanel";
import KnowledgeBasePanel from "@/components/KnowledgeBasePanel";
import AIModelPanel from "@/components/AIModelPanel";
import ChatbotSetupPanel from "@/components/ChatbotSetupPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import UsersAccessPanel from "@/components/UsersAccessPanel";
import IntegrationsPanel from "@/components/IntegrationsPanel";
import SettingsPanel from "@/components/SettingsPanel";
import AuthGate from "@/components/AuthGate";
import { useMicPermission } from "@/hooks/useMicPermission";
import { VoiceLang } from "@/hooks/useWakeWord";
import { useAuth } from "@/hooks/useAuth";
import { LeoMoodProvider, LeoThemeSync } from "@/hooks/useLeoMood";

const PAGE_META: Record<Exclude<NavId, "home" | "chat">, { title: string; subtitle: string }> = {
  conversations: { title: "Conversations", subtitle: "Every WhatsApp chat LEO is part of" },
  knowledge: { title: "Knowledge Base", subtitle: "Facts LEO knows about the company" },
  "ai-model": { title: "AI Model", subtitle: "Live status of LEO's AI providers" },
  "chatbot-setup": { title: "Chatbot Setup", subtitle: "Groups configured for essay/speaking scoring" },
  analytics: { title: "Analytics", subtitle: "Tasks, leads, ads and SEO — once connectors are wired up" },
  users: { title: "Users & Access", subtitle: "Who can sign in, and who can run admin commands" },
  integrations: { title: "Integrations", subtitle: "WhatsApp and LMS connection status" },
  settings: { title: "Settings", subtitle: "Your account and data policy" },
  voices: { title: "Voice Profiles", subtitle: "People LEO can recognise by voice" },
};

function DashboardApp() {
  const [nav, setNav] = useState<NavId>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("en-US");
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const mic = useMicPermission();
  const { user, signOut, isDeveloper } = useAuth();

  function go(id: NavId) {
    setNav(id);
    setMobileNavOpen(false);
  }

  return (
    <LeoMoodProvider>
      <LeoThemeSync />
      <div className="flex min-h-screen w-full gap-4 p-4">
        <Sidebar active={nav} onChange={go} className="hidden lg:flex" />

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <div className="relative z-10 p-4">
              <Sidebar active={nav} onChange={go} />
            </div>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-6 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4">
          {nav !== "home" ? (
            <PageHeader
              title={nav === "chat" ? "Talk to LEO" : PAGE_META[nav].title}
              subtitle={nav === "chat" ? "Voice or text, same assistant" : PAGE_META[nav].subtitle}
              user={user}
              isDeveloper={isDeveloper}
              onSignOut={signOut}
              onOpenMobileNav={() => setMobileNavOpen(true)}
            />
          ) : (
            <button
              onClick={() => setMobileNavOpen(true)}
              className="glass-panel flex h-9 w-9 items-center justify-center self-start rounded-xl text-muted lg:hidden"
            >
              <Menu size={16} />
            </button>
          )}

          {nav === "home" && <DashboardHome user={user} onNavigate={go} />}

          {nav === "chat" && (
            <div className="flex flex-col gap-4">
              <div className="h-[46vh] min-h-[340px]">
                <HomeHero
                  micState={mic.state}
                  micError={mic.error}
                  onRequestMic={mic.request}
                  onHeardCommand={setLastHeard}
                  voiceLang={voiceLang}
                  fullSpace
                />
              </div>
              {lastHeard ? (
                <div className="fade-up rounded-xl border border-panel-border bg-black/[0.03] px-4 py-2 text-center text-xs text-muted">
                  Heard: <span className="text-foreground">&quot;{lastHeard}&quot;</span>
                </div>
              ) : null}
              <div className="h-[55vh] min-h-[360px]">
                <ChatPanel voiceLang={voiceLang} uid={user?.uid ?? null} />
              </div>
              <div className="flex items-center justify-center gap-1 rounded-xl border border-panel-border p-1 text-xs self-center">
                <button
                  onClick={() => setVoiceLang("en-US")}
                  className={`rounded-lg px-3 py-1 transition-colors ${voiceLang === "en-US" ? "bg-accent-cyan/15 text-accent-cyan" : "text-muted"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setVoiceLang("si-LK")}
                  className={`rounded-lg px-3 py-1 transition-colors ${voiceLang === "si-LK" ? "bg-accent-cyan/15 text-accent-cyan" : "text-muted"}`}
                >
                  සිං
                </button>
              </div>
            </div>
          )}

          {nav === "conversations" && (
            <div className="h-[75vh]">
              <WhatsAppChatsPanel />
            </div>
          )}

          {nav === "knowledge" && <KnowledgeBasePanel />}
          {nav === "ai-model" && <AIModelPanel />}
          {nav === "chatbot-setup" && <ChatbotSetupPanel />}
          {nav === "analytics" && <AnalyticsPanel />}
          {nav === "users" && isDeveloper && <UsersAccessPanel />}
          {nav === "integrations" && isDeveloper && <IntegrationsPanel />}
          {nav === "settings" && <SettingsPanel user={user} isDeveloper={isDeveloper} onSignOut={signOut} />}

          {nav === "voices" && (
            <div className="h-[70vh]">
              <VoicesPanel micState={mic.state} onRequestMic={mic.request} />
            </div>
          )}

          {(nav === "users" || nav === "integrations") && !isDeveloper ? (
            <p className="rounded-xl border border-panel-border bg-black/[0.03] p-4 text-center text-xs text-muted">
              This section is developer-only.
            </p>
          ) : null}
        </main>
      </div>
    </LeoMoodProvider>
  );
}

export default function Home() {
  return (
    <AuthGate>
      <DashboardApp />
    </AuthGate>
  );
}
