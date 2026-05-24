"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Power, Settings2, Users, UserCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

type EngineHealth = {
  engine_key: string;
  ok: boolean;
  status_code: number;
  latency_ms: number;
  url: string;
  error?: string;
};

type EngineControl = { engine_key: string; is_enabled: boolean };

type ApiResp<T> = { success: boolean; data?: T; error?: { message?: string } };

export default function SettingsHomePage() {
  const [health, setHealth] = useState<Record<string, EngineHealth>>({});
  const [controls, setControls] = useState<Record<string, EngineControl>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const engineKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const k of Object.keys(health)) keys.add(k);
    for (const k of Object.keys(controls)) keys.add(k);
    return Array.from(keys).sort();
  }, [health, controls]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [healthRes, controlsRes] = await Promise.all([
        fetch("/api/system/engines", { cache: "no-store" }),
        fetch("/api/admin/engine-controls", { cache: "no-store" }),
      ]);

      const healthJson = (await healthRes.json().catch(() => null)) as ApiResp<{ engines: EngineHealth[] }> | null;
      const controlsJson = (await controlsRes.json().catch(() => null)) as ApiResp<{ engines: EngineControl[] }> | null;

      if (!healthRes.ok || !healthJson?.success) throw new Error(healthJson?.error?.message || "Failed to load engine health");
      if (!controlsRes.ok || !controlsJson?.success) throw new Error(controlsJson?.error?.message || "Failed to load engine controls");

      const nextHealth: Record<string, EngineHealth> = {};
      for (const e of (healthJson.data?.engines ?? []) as any[]) {
        nextHealth[e.engine_key] = e as EngineHealth;
      }
      const nextControls: Record<string, EngineControl> = {};
      for (const c of (controlsJson.data?.engines ?? []) as any[]) {
        nextControls[c.engine_key] = c as EngineControl;
      }

      setHealth(nextHealth);
      setControls(nextControls);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setEngineEnabled = async (engineKey: string, isEnabled: boolean) => {
    if (busyKey) return;
    setBusyKey(engineKey);
    setError("");
    try {
      const res = await fetch(`/api/admin/engine-controls/${encodeURIComponent(engineKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: isEnabled, reason: "Changed via Admin Settings UI" }),
      });
      const json = (await res.json().catch(() => null)) as ApiResp<{ engine: EngineControl }> | null;
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to update engine control");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update engine control");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-sm text-slate-400">System controls, products/rates, users, and agent assignments.</p>
        </div>
        <button
          onClick={() => void load()}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors",
            "border-slate-800 text-slate-200 hover:bg-slate-950/30",
            loading && "opacity-60 cursor-not-allowed",
          )}
          disabled={loading}
        >
          <Wrench className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-slate-300" />
              <div className="text-sm font-bold text-white">Engine Controls</div>
            </div>
            <div className="text-xs text-slate-500">Default state: ON</div>
          </div>

          {loading ? <div className="px-6 py-6 text-sm text-slate-500">Loading…</div> : null}

          <div className="divide-y divide-slate-800">
            {engineKeys.map((k) => {
              const h = health[k];
              const c = controls[k];
              const enabled = c?.is_enabled ?? true;
              const healthy = h?.ok ?? false;
              const busy = busyKey === k;
              return (
                <div key={k} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", healthy ? "bg-green-500" : "bg-red-500")} />
                      <div className="text-white font-semibold truncate">{k}</div>
                      {h?.status_code ? (
                        <div className="text-xs text-slate-500 shrink-0">({h.status_code} · {h.latency_ms}ms)</div>
                      ) : (
                        <div className="text-xs text-slate-500 shrink-0">(unreachable)</div>
                      )}
                    </div>
                    {h?.error ? <div className="mt-1 text-xs text-red-400 truncate">{h.error}</div> : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={h?.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold border transition-colors inline-flex items-center gap-2",
                        "border-slate-800 text-slate-300 hover:bg-slate-950/30",
                        !h?.url && "opacity-50 pointer-events-none",
                      )}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Health
                    </a>
                    <button
                      onClick={() => void setEngineEnabled(k, !enabled)}
                      disabled={!!busyKey}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold border transition-colors",
                        enabled ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400",
                        busyKey && "opacity-60 cursor-not-allowed",
                      )}
                    >
                      {busy ? "Saving…" : enabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              );
            })}
            {!loading && engineKeys.length === 0 ? <div className="px-6 py-6 text-sm text-slate-500">No engines found.</div> : null}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-300" />
            <div className="text-sm font-bold text-white">Settings Pages</div>
          </div>

          <Link
            href="/settings/products"
            className="block rounded-2xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-slate-950/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold">Products & Interest Rates</div>
                <div className="text-xs text-slate-500 truncate">Configure products, limits, rates, eligibility rules</div>
              </div>
            </div>
          </Link>

          <Link
            href="/settings/pricing-policy"
            className="block rounded-2xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-slate-950/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
                <Settings2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold">Pricing Policy Console</div>
                <div className="text-xs text-slate-500 truncate">Draft, publish, activate safe pricing rules</div>
              </div>
            </div>
          </Link>

          <Link
            href="/settings/users"
            className="block rounded-2xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-slate-950/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold">Users & Roles</div>
                <div className="text-xs text-slate-500 truncate">Create staff users, roles, and access</div>
              </div>
            </div>
          </Link>

          <Link
            href="/settings/assignments"
            className="block rounded-2xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-slate-950/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold">Agents & Assignments</div>
                <div className="text-xs text-slate-500 truncate">Assign borrowers to agents for collections follow-up</div>
              </div>
            </div>
          </Link>

          <Link
            href="/settings/test-bvn"
            className="block rounded-2xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-slate-950/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold">Test BVN Catalog</div>
                <div className="text-xs text-slate-500 truncate">Temporary seeded identities for onboarding QA</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
