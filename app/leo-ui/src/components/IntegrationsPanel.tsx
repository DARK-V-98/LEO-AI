"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Smartphone,
  Link2,
  Unlink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import {
  subscribeWhatsAppStatus,
  requestWhatsAppLink,
  requestWhatsAppUnlink,
  WhatsAppStatus,
} from "@/lib/whatsapp";
import { subscribeLmsStatus, requestLmsCheck, LmsStatus } from "@/lib/lmsStatus";
import { firebaseEnabled } from "@/lib/firebase";

const STATUS_COPY: Record<WhatsAppStatus["status"], { label: string; color: string }> = {
  disconnected: { label: "Not linked", color: "var(--muted)" },
  connecting: { label: "Connecting…", color: "var(--accent-amber)" },
  qr: { label: "Scan to link", color: "var(--accent-amber)" },
  connected: { label: "Connected", color: "var(--accent-green)" },
  error: { label: "Error", color: "var(--accent-magenta)" },
};

/** Live status + controls for the two things LEO actually connects to
 * outside this dashboard: WhatsApp (via the bridge worker) and the LMS. */
export default function IntegrationsPanel() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [lmsStatus, setLmsStatus] = useState<LmsStatus | null>(null);
  const [checkingLms, setCheckingLms] = useState(false);
  const lmsRequestedAtRef = useRef(0);

  useEffect(() => subscribeWhatsAppStatus(setStatus), []);
  useEffect(() => subscribeLmsStatus(setLmsStatus), []);

  useEffect(() => {
    if (checkingLms && lmsStatus?.checkedAt && lmsStatus.checkedAt >= lmsRequestedAtRef.current) {
      setCheckingLms(false);
    }
  }, [lmsStatus, checkingLms]);

  async function checkLms() {
    setCheckingLms(true);
    lmsRequestedAtRef.current = Date.now();
    await requestLmsCheck();
    setTimeout(() => setCheckingLms(false), 15000);
  }

  const current = status?.status ?? "disconnected";
  const copy = STATUS_COPY[current];

  async function handleLink() {
    setRequesting(true);
    await requestWhatsAppLink();
    setRequesting(false);
  }

  async function handleUnlink() {
    setRequesting(true);
    await requestWhatsAppUnlink();
    setRequesting(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-muted" />
            <h3 className="text-sm font-medium text-foreground">LEO&apos;s WhatsApp</h3>
          </div>
          <span
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{ borderColor: `${copy.color}55`, color: copy.color }}
          >
            {current === "connected" ? <CheckCircle2 size={10} /> : null}
            {copy.label}
          </span>
        </div>

        {!firebaseEnabled ? (
          <p className="text-xs text-muted">
            Firebase isn&apos;t configured in this environment, so WhatsApp
            linking is unavailable here.
          </p>
        ) : !status || status.status === "disconnected" ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-xs text-muted">
              Not linked yet. Request a link and the bridge worker will
              generate a QR code here — scan it from the phone that should
              be LEO&apos;s WhatsApp (WhatsApp → Settings → Linked Devices →
              Link a Device), then add that number to the company group.
            </p>
            <button
              onClick={handleLink}
              disabled={requesting}
              className="flex items-center gap-2 rounded-lg bg-accent-cyan/15 px-3 py-2 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-50"
            >
              <Link2 size={14} />
              {requesting ? "Requesting…" : "Request link"}
            </button>
          </div>
        ) : status.status === "qr" && status.qr ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-white p-3">
              <Image src={status.qr} alt="WhatsApp link QR code" width={220} height={220} unoptimized />
            </div>
            <p className="text-center text-xs text-muted">
              Scan this from the phone that will be LEO&apos;s WhatsApp.
              Expires after a short while — request again if it goes stale.
            </p>
          </div>
        ) : status.status === "connecting" ? (
          <p className="text-xs text-muted">Bridge is starting up…</p>
        ) : status.status === "connected" ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-foreground">
              Linked{status.phoneNumber ? ` as ${status.phoneNumber}` : ""}.
              {status.connectedAt ? ` Connected ${new Date(status.connectedAt).toLocaleString()}.` : ""}
            </p>
            <p className="text-xs text-muted">
              Make sure this number has been added to the company WhatsApp group so LEO can post there.
            </p>
            <button
              onClick={handleUnlink}
              disabled={requesting}
              className="flex items-center gap-2 self-start rounded-lg bg-accent-magenta/15 px-3 py-2 text-xs font-medium text-accent-magenta hover:bg-accent-magenta/25 disabled:opacity-50"
            >
              <Unlink size={14} />
              {requesting ? "Requesting…" : "Unlink"}
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-xs text-accent-magenta">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            {status.error ?? "Something went wrong with the WhatsApp connection."}
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-muted" />
            <h3 className="text-sm font-medium text-foreground">LMS connection</h3>
          </div>
          <button
            onClick={checkLms}
            disabled={checkingLms}
            className="flex items-center gap-1.5 rounded-lg bg-accent-cyan/15 px-3 py-1.5 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/25 disabled:opacity-50"
          >
            <RefreshCw size={12} className={checkingLms ? "animate-spin" : ""} />
            {checkingLms ? "Checking…" : "Check connection"}
          </button>
        </div>

        {!firebaseEnabled ? (
          <p className="text-xs text-muted">Firebase isn&apos;t configured here.</p>
        ) : !lmsStatus ? (
          <p className="text-xs text-muted">
            Only the WhatsApp bridge holds the LMS credentials, so this asks
            it (via Firestore) to make a real authenticated call to the LMS
            and report back — not just &quot;is the key set&quot;.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2">
              {lmsStatus.ok ? (
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-accent-green" />
              ) : (
                <XCircle size={14} className="mt-0.5 flex-shrink-0 text-accent-magenta" />
              )}
              <div>
                <p className="text-xs font-medium text-foreground">{lmsStatus.message}</p>
                {lmsStatus.detail ? <p className="text-[11px] text-muted">{lmsStatus.detail}</p> : null}
              </div>
            </div>
            {lmsStatus.checkedAt ? (
              <p className="font-mono text-[10px] text-muted/70">
                Checked {new Date(lmsStatus.checkedAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
