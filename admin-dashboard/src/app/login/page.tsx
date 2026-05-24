'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@demo.nexcredit.app');
  const [password, setPassword] = useState('ChangeMe123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get('next') || '/', [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message || 'Login failed');
      }

      router.push(nextPath);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">NexCredit Admin</h1>
          <p className="mt-2 text-slate-400">Secure operator access portal</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5"
                placeholder="admin@nexcredit.local"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : 'Sign In'}
          </button>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 mb-2">Demo accounts (seeded in Postgres)</div>
            <div className="space-y-1 text-slate-400">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">superadmin@demo.nexcredit.app</span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">superadmin</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">admin@demo.nexcredit.app</span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">admin</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">reviewer@demo.nexcredit.app</span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">reviewer</span>
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
