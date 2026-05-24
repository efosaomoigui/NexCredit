"use client";

import { useEffect, useState } from "react";

type TestBvnIdentity = {
  id: string;
  bvn: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  dob: string | null;
  is_active: boolean;
  created_at: string | null;
  source?: string;
  onboarding_status?: string;
  linked_user_id?: string | null;
  bvn_verified?: boolean;
  test_credit_score?: number | null;
  recommendation?: { decision?: string; recommended_amount?: number; band?: string } | null;
  recommendation_source?: string | null;
};

export default function TestBvnCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<TestBvnIdentity[]>([]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/test-bvn-identities", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load test BVN identities");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load test BVN identities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Test BVN Catalog</h1>
          <p className="mt-2 text-sm text-slate-400">
            Temporary QA page. Records are seeded from `shared/mocks/identity_providers.json` if empty.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-800 text-slate-200 hover:bg-slate-950/30"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
          {error}
        </div>
      ) : null}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 text-sm font-bold text-white">Seeded Identities</div>
        {loading ? (
          <div className="px-6 py-6 text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-6 text-sm text-slate-500">No test BVN identities found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950/40 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">BVN</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">First Name</th>
                  <th className="text-left px-4 py-3">Last Name</th>
                  <th className="text-left px-4 py-3">DOB</th>
                  <th className="text-left px-4 py-3">Active</th>
                  <th className="text-left px-4 py-3">Onboarding</th>
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Recommendation</th>
                  <th className="text-left px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3 font-mono">{r.bvn}</td>
                    <td className="px-4 py-3 font-mono">{r.phone || "-"}</td>
                    <td className="px-4 py-3">{r.first_name}</td>
                    <td className="px-4 py-3">{r.last_name}</td>
                    <td className="px-4 py-3">{r.dob || "-"}</td>
                    <td className="px-4 py-3">{r.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">{r.onboarding_status || "-"}</td>
                    <td className="px-4 py-3">{r.test_credit_score ?? "-"}</td>
                    <td className="px-4 py-3">
                      {r.recommendation
                        ? `${r.recommendation.decision || "n/a"} / ₦${(r.recommendation.recommended_amount || 0).toLocaleString()} / ${r.recommendation.band || "n/a"}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{r.recommendation_source || r.source || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
