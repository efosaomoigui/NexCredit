'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { ShieldAlert, CheckCircle, Clock, Filter, Search } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const mockFlags = [
  { id: 1, user: 'Adebayo Ibrahim', type: 'Shared Device', severity: 'critical', date: '2026-05-06T12:00:00Z', details: 'Device fingerprint shared with 3 other accounts' },
  { id: 2, user: 'Chukwuma Obi', type: 'Velocity Abuse', severity: 'high', date: '2026-05-06T11:45:00Z', details: '3 applications in 24 hours detected' },
  { id: 3, user: 'Fatima Zahra', type: 'Income Mismatch', severity: 'medium', date: '2026-05-06T11:30:00Z', details: 'Stated income > 3x banking data' },
  { id: 4, user: 'Samuel Okon', type: 'VPN Detected', severity: 'low', date: '2026-05-06T11:15:00Z', details: 'Application submitted from data-centre IP' },
];

export default function FraudQueuePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [flags, setFlags] = useState(mockFlags.map((f) => ({ ...f, resolved: false })));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flags.filter((f) => {
      const matchesQuery = !q || f.user.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || f.details.toLowerCase().includes(q);
      const matchesSeverity = !severityFilter || f.severity === severityFilter;
      return matchesQuery && matchesSeverity;
    });
  }, [flags, query, severityFilter]);

  const resolve = (id: number) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: true } : f)));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Fraud Investigation Queue</h1>
            <p className="text-sm text-slate-400">Manage and resolve high-risk identity signals.</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-blue-500"
                placeholder="Search user or flag..."
              />
            </div>
            <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-200"
              >
                <option value="">All severities</option>
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filtered.map((flag) => (
            <div key={flag.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  flag.severity === 'critical' ? "bg-red-500/10 text-red-500" :
                  flag.severity === 'high' ? "bg-orange-500/10 text-orange-500" : "bg-yellow-500/10 text-yellow-500"
                )}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">{flag.type}</h3>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                      flag.severity === 'critical' ? "bg-red-500 text-white" :
                      flag.severity === 'high' ? "bg-orange-500 text-white" : "bg-yellow-500 text-slate-950"
                    )}>
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 truncate">{flag.details}</p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(flag.date)}</div>
                    <div className="flex items-center gap-1 font-medium text-slate-300 underline underline-offset-2">{flag.user}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => router.push('/borrowers/BR-1001')}
                    className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => resolve(flag.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors",
                      flag.resolved
                        ? "bg-green-600/20 text-green-500 border border-green-600/20 cursor-default"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    <CheckCircle className="w-3 h-3" /> {flag.resolved ? 'Resolved' : 'Resolve Flag'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
