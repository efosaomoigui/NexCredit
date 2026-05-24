'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { cn, formatDate } from '@/lib/utils';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Borrower = {
  user_id: string;
  phone: string;
  email?: string | null;
  full_name?: string | null;
  status: string;
  created_at?: string | null;
};

export default function BorrowersPage() {
  const [query, setQuery] = useState('');
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/borrowers', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          setBorrowers(Array.isArray(json.data?.borrowers) ? json.data.borrowers : []);
        } else {
          setBorrowers([]);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return borrowers;
    return borrowers.filter((b) =>
      b.user_id.toLowerCase().includes(q) ||
      (b.full_name || '').toLowerCase().includes(q) ||
      (b.email || '').toLowerCase().includes(q) ||
      (b.phone || '').includes(q)
    );
  }, [query, borrowers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Borrowers</h1>
        <p className="text-sm text-slate-500">Borrower directory (live backend data).</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search borrowers by name, ID or phone..."
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                <th className="px-6 py-4">Borrower ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((b) => (
                <tr key={b.user_id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-blue-500">{b.user_id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 font-medium text-white">
                    <Link className="hover:underline" href={`/borrowers/${b.user_id}`}>
                      {b.full_name || 'Unnamed Borrower'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{b.phone}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        b.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                      )}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{b.created_at ? formatDate(b.created_at) : '-'}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>No borrowers found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
