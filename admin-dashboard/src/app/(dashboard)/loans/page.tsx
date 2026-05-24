'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { Search } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';

const mockLoans = [
  {
    id: 'LN-9001',
    borrower: 'Adebayo Ibrahim',
    principal: 50000,
    outstanding: 57500,
    status: 'ACTIVE',
    dueDate: '2026-05-20T00:00:00Z',
    tier: 'A',
  },
  {
    id: 'LN-9002',
    borrower: 'Chukwuma Obi',
    principal: 25000,
    outstanding: 0,
    status: 'FULLY_REPAID',
    dueDate: '2026-05-01T00:00:00Z',
    tier: 'B',
  },
  {
    id: 'LN-9003',
    borrower: 'Fatima Zahra',
    principal: 100000,
    outstanding: 125000,
    status: 'OVERDUE',
    dueDate: '2026-05-05T00:00:00Z',
    tier: 'C',
  },
];

export default function LoansPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockLoans;
    return mockLoans.filter((l) => l.id.toLowerCase().includes(q) || l.borrower.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Loans & Repayments</h1>
          <p className="text-sm text-slate-500">Track active disbursements and repayment performance across all tiers.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
           <button className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg">Active Loans</button>
           <button className="px-4 py-1.5 text-slate-400 text-xs font-bold hover:text-white transition-colors">Repayment Log</button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-blue-500"
          placeholder="Search by loan ID or borrower name..."
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/50">
                <th className="px-6 py-4">Loan ID</th>
                <th className="px-6 py-4">Borrower</th>
                <th className="px-6 py-4">Principal</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                 [1, 2, 3, 4].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-slate-800 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-800/50 rounded" />
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                  </tr>
                 ))
              ) : (
                filtered.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-blue-500">{loan.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{loan.borrower}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Risk Tier {loan.tier}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">{formatCurrency(loan.principal)}</td>
                    <td className="px-6 py-4 font-bold text-white">{formatCurrency(loan.outstanding)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                          loan.status === 'ACTIVE'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : loan.status === 'FULLY_REPAID'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                        )}
                      >
                        {loan.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDate(loan.dueDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
