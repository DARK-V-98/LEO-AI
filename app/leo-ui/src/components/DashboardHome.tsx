"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  MessageSquare,
  Users,
  Send,
  Zap,
  Wifi,
  GraduationCap,
  BookOpen,
  UserCog,
  Link2,
  UserPlus,
  Users2,
  ChevronRight,
} from "lucide-react";
import MetricCard from "./MetricCard";
import ActivityChart from "./ActivityChart";
import { subscribeWhatsAppChatList, WhatsAppChatSummary } from "@/lib/whatsappChats";
import { subscribeDailyStats, DailyStat, lastNDayKeys, todayStatsKey } from "@/lib/dashboardStats";
import { subscribeWhatsAppStatus, WhatsAppStatus } from "@/lib/whatsapp";
import { subscribeLmsStatus, LmsStatus } from "@/lib/lmsStatus";
import { subscribeKnowledge, KnowledgeFact } from "@/lib/knowledge";
import { subscribeDashboardAdmins, DashboardAdmin } from "@/lib/dashboardAdmins";
import type { NavId } from "./Sidebar";

const WINDOW_OPTIONS = [7, 30, 90] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function firstName(user: User | null): string {
  const name = user?.displayName || user?.email || "";
  return name.split(/\s+/)[0]?.split("@")[0] || "there";
}

function pctDelta(current: number, previous: number): number | undefined {
  if (previous <= 0) return undefined; // no honest baseline to compare against
  return ((current - previous) / previous) * 100;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export default function DashboardHome({
  user,
  onNavigate,
}: {
  user: User | null;
  onNavigate: (tab: NavId) => void;
}) {
  const [chats, setChats] = useState<WhatsAppChatSummary[]>([]);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [lmsStatus, setLmsStatus] = useState<LmsStatus | null>(null);
  const [facts, setFacts] = useState<KnowledgeFact[]>([]);
  const [admins, setAdmins] = useState<DashboardAdmin[]>([]);
  const [windowDays, setWindowDays] = useState<(typeof WINDOW_OPTIONS)[number]>(30);

  useEffect(() => subscribeWhatsAppChatList(setChats, 500), []);
  useEffect(() => subscribeDailyStats(setStats), []);
  useEffect(() => subscribeWhatsAppStatus(setWhatsappStatus), []);
  useEffect(() => subscribeLmsStatus(setLmsStatus), []);
  useEffect(() => subscribeKnowledge(setFacts), []);
  useEffect(() => subscribeDashboardAdmins(setAdmins), []);

  const now = Date.now();
  const windowMs = windowDays * 86_400_000;
  const cutoffCurrent = now - windowMs;
  const cutoffPrevious = now - 2 * windowMs;

  const activeUsersCurrent = chats.filter((c) => c.lastMessageAt >= cutoffCurrent).length;
  const activeUsersPrevious = chats.filter(
    (c) => c.lastMessageAt >= cutoffPrevious && c.lastMessageAt < cutoffCurrent
  ).length;

  const dayKeys = useMemo(() => lastNDayKeys(windowDays), [windowDays]);
  const statsByDate = useMemo(() => new Map(stats.map((s) => [s.date, s])), [stats]);

  const chartPoints = dayKeys.map((key) => ({
    label: key.slice(5), // MM-DD
    value: statsByDate.get(key)?.messageCount ?? 0,
  }));

  const messagesCurrentWindow = chartPoints.reduce((sum, p) => sum + p.value, 0);
  const prevDayKeys = useMemo(() => {
    const all = lastNDayKeys(windowDays * 2);
    return all.slice(0, windowDays);
  }, [windowDays]);
  const messagesPreviousWindow = prevDayKeys.reduce((sum, key) => sum + (statsByDate.get(key)?.messageCount ?? 0), 0);

  const messagesToday = statsByDate.get(todayStatsKey())?.messageCount ?? 0;

  function windowResponseAvg(keys: string[]): number | null {
    let sum = 0;
    let count = 0;
    for (const key of keys) {
      const s = statsByDate.get(key);
      if (s) {
        sum += s.responseTimeMsSum;
        count += s.responseTimeMsCount;
      }
    }
    return count > 0 ? sum / count : null;
  }
  const avgResponseCurrent = windowResponseAvg(dayKeys);
  const avgResponsePrevious = windowResponseAvg(prevDayKeys);

  const totalConversations = chats.length;

  const recent = chats.slice(0, 5);

  const whatsappConnected = whatsappStatus?.status === "connected";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {greeting()}, {firstName(user)} 👋
          </h1>
          <p className="text-sm text-muted">Here&apos;s what&apos;s happening with LEO AI today.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-panel-border p-1 text-xs">
          {WINDOW_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                windowDays === d ? "bg-accent-cyan/15 text-accent-cyan" : "text-muted hover:text-foreground"
              }`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Conversations"
          value={totalConversations.toLocaleString()}
          icon={MessageSquare}
          accent="cyan"
        />
        <MetricCard
          label="Active Chats"
          value={activeUsersCurrent.toLocaleString()}
          delta={pctDelta(activeUsersCurrent, activeUsersPrevious)}
          icon={Users}
          accent="violet"
        />
        <MetricCard
          label="Messages Today"
          value={messagesToday.toLocaleString()}
          delta={pctDelta(messagesCurrentWindow, messagesPreviousWindow)}
          icon={Send}
          accent="green"
        />
        <MetricCard
          label="Avg. Response Time"
          value={avgResponseCurrent !== null ? `${(avgResponseCurrent / 1000).toFixed(1)}s` : "—"}
          delta={
            avgResponseCurrent !== null && avgResponsePrevious !== null
              ? -1 * (pctDelta(avgResponseCurrent, avgResponsePrevious) ?? 0)
              : undefined
          }
          icon={Zap}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Conversation Activity</h2>
              <p className="text-[11px] text-muted">Messages sent and received over time</p>
            </div>
          </div>
          <ActivityChart points={chartPoints} />
        </div>

        <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">LEO AI Status</h2>
            <span className="flex items-center gap-1 text-[11px] font-medium text-accent-green">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
              {whatsappConnected ? "Online" : "Offline"}
            </span>
          </div>

          <StatusRow
            icon={Wifi}
            label="WhatsApp Bridge"
            detail={whatsappConnected ? `Connected${whatsappStatus?.phoneNumber ? ` as ${whatsappStatus.phoneNumber}` : ""}` : "Not connected"}
            ok={whatsappConnected}
          />
          <StatusRow
            icon={GraduationCap}
            label="LMS"
            detail={lmsStatus ? lmsStatus.message : "Not checked yet"}
            ok={lmsStatus?.ok ?? null}
          />
          <StatusRow
            icon={BookOpen}
            label="Knowledge Base"
            detail={`${facts.length} fact${facts.length === 1 ? "" : "s"} loaded`}
            ok={facts.length > 0}
          />
          <StatusRow
            icon={UserCog}
            label="Dashboard Admins"
            detail={`${admins.length} admin${admins.length === 1 ? "" : "s"} + developer`}
            ok
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Conversations</h2>
            <button
              onClick={() => onNavigate("conversations")}
              className="flex items-center gap-1 text-xs font-medium text-accent-cyan hover:underline"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-lg border border-panel-border bg-black/[0.03] p-3 text-center text-xs text-muted">
              No conversations yet.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recent.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {c.groupName || c.jid.split("@")[0]}
                    </p>
                    <p className="truncate text-[11px] text-muted">{timeAgo(c.lastMessageAt)}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full border border-panel-border px-2 py-0.5 text-[10px] text-muted">
                    {c.isGroup ? "Group" : "Direct"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={Link2} label="Link WhatsApp" onClick={() => onNavigate("integrations")} />
            <QuickAction icon={UserPlus} label="Add Admin" onClick={() => onNavigate("users")} />
            <QuickAction icon={Users2} label="Class Groups" onClick={() => onNavigate("chatbot-setup")} />
            <QuickAction icon={BookOpen} label="Knowledge Base" onClick={() => onNavigate("knowledge")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  detail,
  ok,
}: {
  icon: typeof Wifi;
  label: string;
  detail: string;
  ok: boolean | null;
}) {
  const color = ok === null ? "var(--muted)" : ok ? "var(--accent-green)" : "var(--accent-magenta)";
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}1a`, color }}
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="truncate text-[11px] text-muted">{detail}</p>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Wifi;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-xl border border-panel-border bg-black/[0.03] p-3 text-left transition-colors hover:bg-black/[0.05]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
        <Icon size={15} />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}
