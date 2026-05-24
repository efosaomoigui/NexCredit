"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CollectionsLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const logout = useMemo(() => searchParams.get("logout") === "1", [searchParams]);

  const [email, setEmail] = useState("agent1@demo.nexcredit.app");
  const [password, setPassword] = useState("ChangeMe123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!logout) return;
    fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  }, [logout]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message || "Login failed");
      }
      router.push(nextPath);
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white">NexCollections</h1>
          <p className="mt-2 text-slate-400">Agent access portal</p>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2.5"
              placeholder="agent@nexcredit.local"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2.5"
            />
          </div>

          <button
            disabled={loading}
            className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl disabled:opacity-60"
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 mb-2">Demo accounts (seeded in Postgres)</div>
            <div className="space-y-1 text-slate-400">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">agent1@demo.nexcredit.app</span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">agent</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">admin@demo.nexcredit.app</span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">admin</span>
              </div>
            </div>
            <div className="mt-3 text-slate-500">
              Password: <span className="text-slate-300">ChangeMe123!</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
