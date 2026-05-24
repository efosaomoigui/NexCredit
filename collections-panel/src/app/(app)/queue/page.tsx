"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Clock, Filter, Search, Loader2 } from "lucide-react";
import Link from "next/link";

type AssignedBorrower = {
  borrower_id: string;
  full_name?: string | null;
  phone: string;
  email?: string | null;
  status: string;
};

export default function QueueView() {
  const [items, setItems] = useState<AssignedBorrower[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/assignments/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load queue");
        setItems(json.data?.borrowers ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load queue");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((b) => {
      const name = (b.full_name || "").toLowerCase();
      return (
        name.includes(s) ||
        b.phone.toLowerCase().includes(s) ||
        (b.email || "").toLowerCase().includes(s) ||
        b.borrower_id.toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Collections Queue</h1>
          <p className="text-slate-500 mt-1">
            You have <span className="font-bold text-blue-600">{loading ? "…" : items.length}</span> active cases assigned to you.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              className="input-field pl-10 w-80 bg-white"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-all">
            <Filter size={18} /> Filters
          </button>
        </div>
      </div>

      {error ? (
        <div className="card p-4 border border-red-200 bg-red-50 text-red-700 font-semibold">{error}</div>
      ) : null}

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-bottom border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Borrower</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Escalation</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Contact</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-100 rounded" />
                        <div className="h-3 w-20 bg-slate-100/50 rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                  <td className="px-6 py-5"><div className="h-4 w-12 bg-slate-100 rounded" /></td>
                  <td className="px-6 py-5"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                  <td className="px-6 py-5"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                  <td className="px-6 py-5"></td>
                </tr>
              ))
            ) : null}

            {!loading && filtered.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-slate-500" colSpan={6}>
                  No assigned cases.
                </td>
              </tr>
            ) : null}

            {filtered.map((item) => (
              <tr key={item.borrower_id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                      {(item.full_name || item.phone)[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.full_name || item.phone}</p>
                      <p className="text-xs text-slate-400">#{item.borrower_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 font-bold text-slate-700">—</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <Clock size={16} className="text-slate-400" />
                    —
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`badge ${item.status === "active" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                    Assigned
                  </span>
                </td>
                <td className="px-6 py-5 text-slate-500 text-sm">—</td>
                <td className="px-6 py-5 text-right">
                  <Link href={`/cases/${item.borrower_id}`} className="inline-flex items-center gap-1.5 text-blue-600 font-bold hover:gap-3 transition-all">
                    Manage <ArrowUpRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

