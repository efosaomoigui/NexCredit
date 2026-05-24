"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ShieldCheck, Sparkles } from "lucide-react";

type Policy = {
  id: string;
  version: string;
  status: "draft" | "published" | "active";
  is_active: boolean;
  config: any;
  created_at: string;
};

export default function PricingPolicyPage() {
  const [items, setItems] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [version, setVersion] = useState("pricing_policy_v2");
  const [rateHigh, setRateHigh] = useState("0.85");
  const [rateMedium, setRateMedium] = useState("1.00");
  const [rateLow, setRateLow] = useState("1.15");
  const [limitHigh, setLimitHigh] = useState("1.00");
  const [limitMedium, setLimitMedium] = useState("0.85");
  const [limitLow, setLimitLow] = useState("0.60");
  const [creditMin, setCreditMin] = useState("0");
  const [locationMin, setLocationMin] = useState("0");
  const [compositeMin, setCompositeMin] = useState("0");

  const active = useMemo(() => items.find((i) => i.is_active), [items]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pricing-policy", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load policies");
      setItems(json.data || []);
      setLastSyncedAt(new Date().toISOString());
    } catch (e: any) {
      setError(e?.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createDraft = async () => {
    setBusy("create");
    setError("");
    try {
      if (!version.trim()) throw new Error("Policy version is required");
      const parsedValues = [
        Number(rateHigh),
        Number(rateMedium),
        Number(rateLow),
        Number(limitHigh),
        Number(limitMedium),
        Number(limitLow),
        Number(creditMin),
        Number(locationMin),
        Number(compositeMin),
      ];
      if (parsedValues.some((v) => !Number.isFinite(v))) {
        throw new Error("All policy fields must contain valid numbers");
      }
      const isEdit = Boolean(editingVersion);
      const target = isEdit
        ? `/api/admin/pricing-policy/${encodeURIComponent(editingVersion as string)}`
        : "/api/admin/pricing-policy";
      const res = await fetch(target, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          rate_multipliers: { high: Number(rateHigh), medium: Number(rateMedium), low: Number(rateLow) },
          limit_multipliers: { high: Number(limitHigh), medium: Number(limitMedium), low: Number(limitLow) },
          score_gates: {
            credit_score_min: Number(creditMin),
            location_score_min: Number(locationMin),
            composite_score_min: Number(compositeMin),
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) throw new Error("Session expired. Please log in again.");
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to create draft");
      setEditingVersion(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to create draft");
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (versionValue: string, action: "publish" | "activate") => {
    setBusy(`${action}:${versionValue}`);
    setError("");
    try {
      const res = await fetch(`/api/admin/pricing-policy/${encodeURIComponent(versionValue)}/${action}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) throw new Error("Session expired. Please log in again.");
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || `Failed to ${action}`);
      await load();
    } catch (e: any) {
      setError(e?.message || `Failed to ${action}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pricing Policy Console</h1>
        <p className="mt-2 text-sm text-slate-400">
          Safe policy management with draft, publish, and SuperAdmin activation.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Create Draft Policy
          </div>
          <input className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="version" />

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 text-xs text-slate-400 font-semibold">Rate Multipliers (High, Medium, Low)</div>
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={rateHigh} onChange={(e) => setRateHigh(e.target.value)} placeholder="rate high" />
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={rateMedium} onChange={(e) => setRateMedium(e.target.value)} placeholder="rate medium" />
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={rateLow} onChange={(e) => setRateLow(e.target.value)} placeholder="rate low" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 text-xs text-slate-400 font-semibold">Limit Multipliers (High, Medium, Low)</div>
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={limitHigh} onChange={(e) => setLimitHigh(e.target.value)} placeholder="limit high" />
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={limitMedium} onChange={(e) => setLimitMedium(e.target.value)} placeholder="limit medium" />
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={limitLow} onChange={(e) => setLimitLow(e.target.value)} placeholder="limit low" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 text-xs text-slate-400 font-semibold">Score Gates (Credit, Location, Composite Minimums)</div>
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={creditMin} onChange={(e) => setCreditMin(e.target.value)} placeholder="credit min" />
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={locationMin} onChange={(e) => setLocationMin(e.target.value)} placeholder="location min" />
            <input className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white" value={compositeMin} onChange={(e) => setCompositeMin(e.target.value)} placeholder="composite min" />
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={loading}
              onClick={() => void load()}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold disabled:opacity-60"
            >
              Refresh
            </button>
            <button disabled={busy === "create"} onClick={createDraft} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60">
              {busy === "create" ? "Saving..." : editingVersion ? "Update Draft" : "Create Draft"}
            </button>
          </div>
          {editingVersion ? (
            <button
              onClick={() => {
                setEditingVersion(null);
                setVersion("pricing_policy_v2");
              }}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-white font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Active Policy
          </div>
          {active ? (
            <div className="text-sm text-slate-300">
              <div>Version: <span className="text-white font-semibold">{active.version}</span></div>
              <div>Status: <span className="text-emerald-400 font-semibold">{active.status}</span></div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No active policy</div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="text-white font-semibold mb-4">Policy Versions</div>
        {loading ? <div className="text-slate-500 text-sm">Loading...</div> : null}
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-white font-semibold">{p.version}</div>
                <div className="text-xs text-slate-500">{p.status}{p.is_active ? " • active" : ""}</div>
                <div className="text-xs text-slate-500">
                  Credit/Location/Composite minimums: {p.config?.score_gates?.credit_score_min ?? "-"} / {p.config?.score_gates?.location_score_min ?? "-"} / {p.config?.score_gates?.composite_score_min ?? "-"}
                </div>
                <div className="text-xs text-slate-600">
                  Created: {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy === `publish:${p.version}` || p.status === "active"}
                  onClick={() => runAction(p.version, "publish")}
                  className="px-3 py-2 rounded-lg border border-slate-700 text-slate-200 text-xs disabled:opacity-50"
                >
                  {busy === `publish:${p.version}` ? "Publishing..." : "Publish"}
                </button>
                <button
                  disabled={busy === `activate:${p.version}` || p.status !== "published"}
                  onClick={() => runAction(p.version, "activate")}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-50"
                >
                  {busy === `activate:${p.version}` ? "Activating..." : "Activate"}
                </button>
                <button
                  disabled={p.status !== "draft"}
                  onClick={() => {
                    const rate = p.config?.rate_multipliers || {};
                    const limit = p.config?.limit_multipliers || {};
                    const gates = p.config?.score_gates || {};
                    setEditingVersion(p.version);
                    setVersion(p.version);
                    setRateHigh(String(rate.high ?? 0.85));
                    setRateMedium(String(rate.medium ?? 1.0));
                    setRateLow(String(rate.low ?? 1.15));
                    setLimitHigh(String(limit.high ?? 1.0));
                    setLimitMedium(String(limit.medium ?? 0.85));
                    setLimitLow(String(limit.low ?? 0.6));
                    setCreditMin(String(gates.credit_score_min ?? 0));
                    setLocationMin(String(gates.location_score_min ?? 0));
                    setCompositeMin(String(gates.composite_score_min ?? 0));
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-700 text-slate-200 text-xs disabled:opacity-50"
                >
                  Edit Draft
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
