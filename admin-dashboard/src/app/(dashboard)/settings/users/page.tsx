"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type StaffUser = {
  id: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  display_name?: string | null;
  department?: string | null;
  created_at?: string | null;
};

type ApiResp<T> = { success: boolean; data?: T; error?: { message?: string } };

const STAFF_ROLES = ["agent", "reviewer", "admin", "superadmin"] as const;
const STAFF_STATUSES = ["active", "suspended", "closed"] as const;
const DEPARTMENTS = ["Operations", "Risk", "Collections", "Finance", "Executive", "Support", "Engineering"] as const;

export default function UsersRolesPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<(typeof STAFF_ROLES)[number]>("agent");
  const [createName, setCreateName] = useState("");
  const [createDept, setCreateDept] = useState("");
  const [creating, setCreating] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [users]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResp<{ users: StaffUser[] }> | null;
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load users");
      setUsers(json.data?.users ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createUser = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          phone: createPhone,
          password: createPassword,
          role: createRole,
          display_name: createName || null,
          department: createDept || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResp<any> | null;
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to create user");
      setCreateEmail("");
      setCreatePhone("");
      setCreatePassword("");
      setCreateName("");
      setCreateDept("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (id: string, patch: Record<string, unknown>) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json().catch(() => null)) as ApiResp<any> | null;
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to update user");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update user");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users & Roles</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Staff accounts are persisted in Postgres (Identity Engine). Only logged-in admins can create/modify users.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="text-sm font-semibold text-slate-200 mb-4">Create staff user</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300">Email</label>
            <input
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-200"
              placeholder="agent2@company.ng"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300">Phone</label>
            <input
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-200"
              placeholder="+2348012345678"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300">Password</label>
            <input
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-200"
              placeholder="Min 8 chars"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300">Role</label>
            <select
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value as any)}
              className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300">Display name</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-200"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300">Department</label>
            <select
              value={createDept}
              onChange={(e) => setCreateDept(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-slate-900 text-slate-400">
                Select Department
              </option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-slate-200">
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={creating}
            onClick={() => void createUser()}
            className={cn(
              "rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2",
              creating && "opacity-60 cursor-not-allowed",
            )}
          >
            {creating ? "Creating..." : "Create user"}
          </button>
          <button
            disabled={loading}
            onClick={() => void load()}
            className={cn(
              "rounded-xl border border-slate-800 hover:bg-slate-950/30 text-slate-200 text-sm font-semibold px-4 py-2",
              loading && "opacity-60 cursor-not-allowed",
            )}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden min-h-[300px]">
        <div className="px-6 py-4 border-b border-slate-800 text-sm font-semibold text-slate-200">Staff users</div>

        {loading ? (
          <div className="divide-y divide-slate-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-5 animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-3 w-48 bg-slate-800/50 rounded" />
                </div>
                <div className="h-8 w-24 bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sortedUsers.map((u) => (
              <div key={u.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-white font-semibold">{u.display_name || u.email}</div>
                  <div className="text-slate-400 text-sm">
                    {u.email} {" · "} {u.phone}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) => void updateUser(u.id, { role: e.target.value })}
                    className="rounded-lg bg-slate-950/40 border border-slate-800 px-3 py-2 text-xs text-slate-200"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    value={u.status}
                    onChange={(e) => void updateUser(u.id, { status: e.target.value })}
                    className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STAFF_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-slate-200">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {sortedUsers.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">No staff users found.</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

