"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type AgentUser = { id: string; email: string; display_name?: string | null; role: string };
type Borrower = { user_id: string; full_name?: string | null; phone: string; email?: string | null; status: string };
type Assignment = { id: string; agent_id: string; borrower_id: string; is_active: boolean };

type ApiResp<T> = { success: boolean; data?: T; error?: { message?: string } };

export default function AgentAssignmentsPage() {
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyBorrowerId, setBusyBorrowerId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, borrowersRes, assignmentsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/borrowers", { cache: "no-store" }),
        fetch("/api/admin/assignments", { cache: "no-store" }),
      ]);

      const usersJson = (await usersRes.json().catch(() => null)) as ApiResp<{ users: any[] }> | null;
      const borrowersJson = (await borrowersRes.json().catch(() => null)) as ApiResp<{ borrowers: Borrower[] }> | null;
      const assignmentsJson = (await assignmentsRes.json().catch(() => null)) as ApiResp<{ assignments: Assignment[] }> | null;

      if (!usersRes.ok || !usersJson?.success) throw new Error(usersJson?.error?.message || "Failed to load agents");
      if (!borrowersRes.ok || !borrowersJson?.success)
        throw new Error(borrowersJson?.error?.message || "Failed to load borrowers");
      if (!assignmentsRes.ok || !assignmentsJson?.success)
        throw new Error(assignmentsJson?.error?.message || "Failed to load assignments");

      const nextAgents = (usersJson.data?.users ?? []).filter((u) => u.role === "agent") as AgentUser[];
      setAgents(nextAgents);
      setBorrowers(borrowersJson.data?.borrowers ?? []);
      setAssignments(assignmentsJson.data?.assignments ?? []);
      setSelectedAgentId((prev) => prev || nextAgents[0]?.id || "");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const assignedBorrowerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of assignments) {
      if (a.is_active && a.agent_id === selectedAgentId) ids.add(a.borrower_id);
    }
    return ids;
  }, [assignments, selectedAgentId]);

  const filteredBorrowers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return borrowers;
    return borrowers.filter((b) => {
      const name = (b.full_name || "").toLowerCase();
      return (
        name.includes(s) ||
        b.phone.toLowerCase().includes(s) ||
        (b.email || "").toLowerCase().includes(s) ||
        b.user_id.toLowerCase().includes(s)
      );
    });
  }, [borrowers, q]);

  const toggleAssign = async (borrowerId: string) => {
    if (!selectedAgentId) return;
    if (busyBorrowerId) return;
    setBusyBorrowerId(borrowerId);
    setError("");
    try {
      const assigned = assignedBorrowerIds.has(borrowerId);
      const res = await fetch("/api/admin/assignments", {
        method: assigned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selectedAgentId, borrower_id: borrowerId }),
      });
      const json = (await res.json().catch(() => null)) as ApiResp<any> | null;
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to update assignment");
      await loadAll();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update assignment");
    } finally {
      setBusyBorrowerId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agents & Assignments</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Assign borrowers to agents for follow-up. Assignments are persisted in Postgres (Identity Engine).
        </p>
      </div>

        {error ? (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-sm font-semibold text-slate-200 mb-3">Agents</div>
            {loading ? <div className="text-sm text-slate-500">Loading…</div> : null}
            <div className="space-y-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAgentId(a.id)}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-xl border transition-colors",
                    a.id === selectedAgentId ? "border-blue-600 bg-blue-600/10" : "border-slate-800 hover:bg-slate-950/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{a.display_name || a.email}</div>
                      <div className="text-xs text-slate-400 truncate">{a.email}</div>
                    </div>
                    <div className="text-xs text-slate-400">{assignments.filter((x) => x.is_active && x.agent_id === a.id).length}</div>
                  </div>
                </button>
              ))}
              {!loading && agents.length === 0 ? <div className="text-sm text-slate-500">No agents found.</div> : null}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  {(selectedAgent?.display_name || selectedAgent?.email) ?? "Select an agent"}
                </div>
                <div className="text-xs text-slate-400">Assign borrowers to follow up with</div>
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search borrowers…"
                className="w-64 max-w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
              />
            </div>

            <div className="divide-y divide-slate-800">
              {filteredBorrowers.map((b) => {
                const assigned = assignedBorrowerIds.has(b.user_id);
                const busy = busyBorrowerId === b.user_id;
                return (
                  <div key={b.user_id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{b.full_name || b.email || b.phone}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {b.phone} · {b.user_id}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className={cn("px-2 py-0.5 rounded-md font-bold", b.status === "active" ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-300")}>
                          {b.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => void toggleAssign(b.user_id)}
                      disabled={!selectedAgentId || !!busyBorrowerId}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold border transition-colors",
                        assigned ? "bg-blue-600 border-blue-600 text-white" : "border-slate-700 text-slate-200 hover:bg-slate-950/30",
                        (!selectedAgentId || !!busyBorrowerId) && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {busy ? "Saving…" : assigned ? "Assigned" : "Assign"}
                    </button>
                  </div>
                );
              })}
              {!loading && filteredBorrowers.length === 0 ? <div className="px-5 py-6 text-sm text-slate-500">No matches.</div> : null}
            </div>
          </div>
        </div>
    </div>
  );
}
