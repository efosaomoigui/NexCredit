'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { Search, Filter, History, User, Activity } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { downloadCsv } from '@/lib/csv';

const mockLogs = [
  { id: 1, actor: 'superadmin@nexcredit.ng', action: 'loan.approve', entity: 'LOAN-1234', date: '2026-05-06T12:00:00Z', status: 'success' },
  { id: 2, actor: 'reviewer_1@nexcredit.ng', action: 'kyc.verify', entity: 'USER-9876', date: '2026-05-06T11:45:00Z', status: 'success' },
  { id: 3, actor: 'system', action: 'payment.disburse', entity: 'DISB-5544', date: '2026-05-06T11:30:00Z', status: 'success' },
  { id: 4, actor: 'agent_5@nexcredit.ng', action: 'collections.log_ptp', entity: 'LOAN-1234', date: '2026-05-06T11:15:00Z', status: 'success' },
  { id: 5, actor: 'superadmin@nexcredit.ng', action: 'admin.toggle_product', entity: 'PROD-SILVER', date: '2026-05-06T10:00:00Z', status: 'success' },
];

export default function AuditLogsPage() {
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockLogs.filter((l) => {
      const matchesQuery = !q || l.actor.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q);
      const matchesAction = !actionFilter || l.action === actionFilter;
      return matchesQuery && matchesAction;
    });
  }, [query, actionFilter]);

  const exportCsv = () => {
    downloadCsv(
      `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((l) => ({ timestamp: l.date, actor: l.actor, action: l.action, entity: l.entity, status: l.status }))
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">System Audit Trail</h3>
            <p className="text-sm text-slate-400">Search and browse all administrative actions.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search actor or action..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-slate-950 border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-blue-500"
              />
            </div>
            <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm text-slate-300 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-transparent outline-none"
              >
                <option value="">All actions</option>
                {Array.from(new Set(mockLogs.map((l) => l.action))).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={exportCsv}
              className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity Reference</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">{log.date.replace('T', ' ').split('.')[0]}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-xs font-medium text-slate-200">{log.actor}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-tight">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.entity}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-xs text-slate-400">Success</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
