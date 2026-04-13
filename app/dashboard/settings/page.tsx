"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConnectDomainSettings } from "@/components/dashboard/ConnectDomainSettings";
import { ConnectStripeSettings } from "@/components/dashboard/ConnectStripeSettings";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardSettingsPage() {
  const d = useDashboardData();
  const [billingPlan, setBillingPlan] = useState<string | null>(null);
  const [billingCredits, setBillingCredits] = useState<number | null>(null);
  const [telegramTestLoading, setTelegramTestLoading] = useState(false);
  const [telegramTestMessage, setTelegramTestMessage] = useState<string | null>(null);

  function applyBillingPayload(data: { plan?: string; credits_balance?: unknown }) {
    setBillingPlan(typeof data.plan === "string" && data.plan.length > 0 ? data.plan : "free");
    const raw = data.credits_balance;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
    setBillingCredits(Number.isFinite(n) ? n : 0);
  }

  const loadBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/balance", {
        credentials: "include",
        cache: "no-store"
      });
      const data = (await res.json()) as { plan?: string; credits_balance?: unknown; error?: string };
      if (!res.ok) {
        setBillingPlan("free");
        setBillingCredits(0);
        return;
      }
      applyBillingPayload(data);
    } catch {
      setBillingPlan("free");
      setBillingCredits(0);
    }
  }, []);

  useEffect(() => {
    if (d.loading) return;
    if (!d.userId) {
      setBillingPlan("free");
      setBillingCredits(0);
      return;
    }
    void loadBilling();
  }, [d.loading, d.userId, loadBilling]);

  const toggleBtn = (on: boolean) =>
    on
      ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
      : "border-white/10 bg-transparent text-white/50";

  const handleSendTelegramTest = useCallback(async () => {
    if (!d.sessionToken) {
      setTelegramTestMessage("Session expired. Refresh and try again.");
      return;
    }
    setTelegramTestLoading(true);
    setTelegramTestMessage(null);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${d.sessionToken}`
        }
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setTelegramTestMessage(json.error || "Failed to send test notification.");
        return;
      }
      setTelegramTestMessage("Test notification sent.");
    } catch {
      setTelegramTestMessage("Failed to send test notification.");
    } finally {
      setTelegramTestLoading(false);
    }
  }, [d.sessionToken]);

  return (
    <div className="min-h-full max-w-xl">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-white/45">Manage your account and preferences</p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-4 text-sm font-medium text-white">Profile</p>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Display name</span>
          <input
            className="dash-focusable w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none"
            type="text"
            value={d.profileDisplayName}
            onChange={(e) => d.setProfileDisplayName(e.target.value)}
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Email</span>
          <input
            className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/40"
            type="text"
            readOnly
            value={d.email || "—"}
          />
        </label>
        {d.profileSaveError ? <p className="mb-3 text-sm text-red-400">{d.profileSaveError}</p> : null}
        <button
          type="button"
          disabled={d.profileSaving}
          onClick={() => void d.handleSaveProfile()}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {d.profileSaving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-4 text-sm font-medium text-white">Notifications</p>
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Email</span>
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => d.setProfileEmailNotifications(true)}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors ${toggleBtn(d.profileEmailNotifications)}`}
          >
            On
          </button>
          <button
            type="button"
            onClick={() => d.setProfileEmailNotifications(false)}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors ${toggleBtn(!d.profileEmailNotifications)}`}
          >
            Off
          </button>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Telegram chat ID</span>
          <input
            className="dash-focusable w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none"
            type="text"
            value={d.profileTelegramChatId}
            onChange={(e) => d.setProfileTelegramChatId(e.target.value)}
            placeholder="123456789"
          />
        </label>
        <p className="mt-2 text-xs leading-relaxed text-white/35">
          Send /start to @lacorebot to get your chat ID.
        </p>
        <div className="mt-3">
          <button
            type="button"
            disabled={telegramTestLoading}
            onClick={() => void handleSendTelegramTest()}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-60"
          >
            {telegramTestLoading ? "Sending..." : "Send test notification"}
          </button>
          {telegramTestMessage ? <p className="mt-2 text-xs text-white/50">{telegramTestMessage}</p> : null}
        </div>
        <p className="mt-3 text-xs text-white/30">Use Save below to persist notification settings.</p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-4 text-sm font-medium text-white">Integrations</p>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Telegram</span>
          <input
            className="dash-focusable w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none"
            type="text"
            value={d.profileTelegram}
            onChange={(e) => d.setProfileTelegram(e.target.value)}
            placeholder="@username"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">WhatsApp</span>
          <input
            className="dash-focusable w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none"
            type="text"
            value={d.profileWhatsapp}
            onChange={(e) => d.setProfileWhatsapp(e.target.value)}
            placeholder="+1…"
          />
        </label>
        <button
          type="button"
          disabled={d.profileSaving}
          onClick={() => void d.handleSaveProfile()}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {d.profileSaving ? "Saving…" : "Save integrations"}
        </button>
      </div>

      <div id="stripe" className="scroll-mt-6 rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-1 text-sm font-medium text-white">Connect Stripe</p>
        <p className="mb-4 text-xs leading-relaxed text-white/40">
          Accept payments on your public landing page via Stripe Checkout. Use test keys while you set things up.
        </p>
        {!d.loading ? <ConnectStripeSettings userId={d.userId} /> : <p className="text-sm text-white/40">Loading…</p>}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-1 text-sm font-medium text-white">Connect domain</p>
        <p className="mb-4 text-xs leading-relaxed text-white/40">
          Use your own domain for a landing page. Add the DNS records we show, then we check verification automatically
          every 15 seconds for up to 5 minutes (or use Check status anytime).
        </p>
        {!d.loading ? (
          <ConnectDomainSettings
            userId={d.userId}
            activeProjectId={d.activeProject?.id}
            defaultSlug={d.landingSlug}
          />
        ) : (
          <p className="text-sm text-white/40">Loading…</p>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-4 text-sm font-medium text-white">Billing</p>
        <p className="text-xs uppercase tracking-wider text-white/40">Current plan</p>
        <p className="mt-1 text-lg font-semibold capitalize text-white">
          {d.loading || (d.userId && billingPlan === null) ? "…" : (billingPlan ?? "free")}
        </p>
        <p className="mt-4 text-xs uppercase tracking-wider text-white/40">Credits balance</p>
        <p className="mt-1 text-lg font-semibold text-white">
          {d.loading || (d.userId && billingCredits === null) ? "…" : (billingCredits ?? 0)}
        </p>
        <Link
          href="/#pricing"
          className="mt-4 inline-block text-sm text-indigo-400 transition-colors hover:text-indigo-300"
        >
          Upgrade plan →
        </Link>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-4 text-sm font-medium text-white">Appearance</p>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => d.setDashboardTheme(theme)}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm uppercase transition-colors ${toggleBtn(d.uiTheme === theme)}`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 mb-4">
        <p className="mb-4 text-sm font-medium text-white">Session</p>
        <button
          type="button"
          onClick={() => void d.handleSignOut()}
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
        >
          Sign out
        </button>
      </div>

      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <p className="mb-2 text-sm font-medium text-red-300">Danger zone</p>
        <p className="mb-4 text-xs text-white/40">
          Account deletion is permanent. Contact us to remove your data and cancel billing.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href =
              "mailto:support@lacore.ai?subject=Delete%20my%20LACORE%20account&body=Please%20delete%20my%20account%20associated%20with%20this%20email.";
          }}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Request account deletion
        </button>
      </div>
    </div>
  );
}
