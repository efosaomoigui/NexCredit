"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings, Users } from "lucide-react";
import { useRouter } from "next/navigation";

type User = { name: string; email: string; role: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => setUser(payload?.data?.user ?? null))
      .catch(() => null);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const badge = useMemo(() => initials(user?.name ?? "System Admin"), [user?.name]);

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-slate-900/60 transition-colors"
      >
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-white leading-4">{user?.name ?? "System Admin"}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-4">
            {user?.role ?? "admin"}
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold">
          {badge}
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-sm font-semibold text-white">{user?.name ?? "System Admin"}</div>
            <div className="text-xs text-slate-400">{user?.email ?? ""}</div>
          </div>
          <div className="p-2">
            <Link
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-900"
              href="/settings/users"
              onClick={() => setOpen(false)}
            >
              <Users className="w-4 h-4" />
              Users & Roles
            </Link>
            <Link
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-900"
              href="/settings/assignments"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Agent Assignments
            </Link>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

