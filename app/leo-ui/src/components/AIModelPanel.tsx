"use client";

import { useState } from "react";
import { Gauge, RefreshCw, List, Sparkles, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type ProviderStatus = { ok: boolean; message: string; detail?: string };
type ProviderStatusResponse = {
  openrouter: ProviderStatus;
  gemini: ProviderStatus;
  checkedAt: number;
};

type OpenRouterModel = { id: string; name: string; contextLength: number | null; isFree: boolean };
type OpenRouterModelsResponse = {
  totalModels: number;
  freeModelCount: number;
  paidModelCount: number;
  freeModels: OpenRouterModel[];
  checkedAt: number;
  error?: string;
};

/** Real, on-demand checks against the AI providers LEO actually calls —
 * not a static "key present" check, a live minimal request to each. */
export default function AIModelPanel() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null);
  const [checkingProviders, setCheckingProviders] = useState(false);
  const [modelsInfo, setModelsInfo] = useState<OpenRouterModelsResponse | null>(null);
  const [checkingModels, setCheckingModels] = useState(false);

  async function checkProviders() {
    setCheckingProviders(true);
    try {
      const res = await fetch("/api/admin/provider-status");
      const data: ProviderStatusResponse = await res.json();
      setProviderStatus(data);
    } catch {
      setProviderStatus(null);
    } finally {
      setCheckingProviders(false);
    }
  }

  async function checkOpenRouterModels() {
    setCheckingModels(true);
    try {
      const res = await fetch("/api/admin/openrouter-models");
      const data: OpenRouterModelsResponse = await res.json();
      setModelsInfo(data);
    } catch {
      setModelsInfo({
        totalModels: 0,
        freeModelCount: 0,
        paidModelCount: 0,
        freeModels: [],
        checkedAt: Date.now(),
        error: "Couldn't reach the server",
      });
    } finally {
      setCheckingModels(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-muted" />
            <h3 className="text-sm font-medium text-foreground">AI provider keys</h3>
          </div>
          <button
            onClick={checkProviders}
            disabled={checkingProviders}
            className="flex items-center gap-1.5 rounded-lg bg-accent-cyan/15 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-50"
          >
            <RefreshCw size={12} className={checkingProviders ? "animate-spin" : ""} />
            {checkingProviders ? "Checking…" : "Check now"}
          </button>
        </div>

        {!providerStatus ? (
          <p className="text-xs text-muted">
            Runs a real, minimal request against each provider to confirm the
            key works and show whether it&apos;s rate-limited.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {(
              [
                ["OpenRouter (free models)", providerStatus.openrouter],
                ["Gemini", providerStatus.gemini],
              ] as const
            ).map(([label, p]) => (
              <div
                key={label}
                className="flex items-start gap-2 rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2"
              >
                {p.ok ? (
                  <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-accent-green" />
                ) : (
                  <XCircle size={14} className="mt-0.5 flex-shrink-0 text-accent-magenta" />
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">{label}</p>
                  <p className="text-[11px] text-muted">
                    {p.message}
                    {p.detail ? ` · ${p.detail}` : ""}
                  </p>
                </div>
              </div>
            ))}
            <p className="font-mono text-[10px] text-muted/70">
              Checked {new Date(providerStatus.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List size={16} className="text-muted" />
            <h3 className="text-sm font-medium text-foreground">OpenRouter model access</h3>
          </div>
          <button
            onClick={checkOpenRouterModels}
            disabled={checkingModels}
            className="flex items-center gap-1.5 rounded-lg bg-accent-cyan/15 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-50"
          >
            <RefreshCw size={12} className={checkingModels ? "animate-spin" : ""} />
            {checkingModels ? "Checking…" : "Check models"}
          </button>
        </div>

        {!modelsInfo ? (
          <p className="text-xs text-muted">
            Lists every model this OpenRouter key can reach, and flags which
            ones are free tier.
          </p>
        ) : modelsInfo.error ? (
          <div className="flex items-start gap-2 text-xs text-accent-magenta">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            {modelsInfo.error}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-panel-border px-2 py-1 text-[11px] text-foreground">
                {modelsInfo.totalModels} total models
              </span>
              <span className="rounded-full border border-accent-green/40 px-2 py-1 text-[11px] text-accent-green">
                {modelsInfo.freeModelCount} free
              </span>
              <span className="rounded-full border border-panel-border px-2 py-1 text-[11px] text-muted">
                {modelsInfo.paidModelCount} paid
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-lg border border-panel-border">
              {modelsInfo.freeModels.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 border-b border-panel-border px-3 py-1.5 last:border-b-0"
                >
                  <span className="flex items-center gap-1.5 truncate text-[11px] text-foreground">
                    <Sparkles size={10} className="flex-shrink-0 text-accent-green" />
                    <span className="truncate">{m.id}</span>
                  </span>
                  {m.contextLength ? (
                    <span className="flex-shrink-0 font-mono text-[10px] text-muted">
                      {Math.round(m.contextLength / 1000)}k ctx
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <p className="font-mono text-[10px] text-muted/70">
              Checked {new Date(modelsInfo.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
