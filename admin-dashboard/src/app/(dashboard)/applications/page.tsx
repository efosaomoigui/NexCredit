'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { Search, Filter, Download, ChevronRight, Loader2 } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { downloadCsv } from '@/lib/csv';
import api from '@/lib/api';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        // Using the Nginx gateway path: /lending/admin/loans
        const response = await api.get('/lending/admin/loans');
        if (response.data.success) {
          setApplications(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesQuery =
        !q ||
        app.id.toLowerCase().includes(q) ||
        app.borrower_name?.toLowerCase().includes(q) ||
        app.user_id.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || app.status === statusFilter;
      const matchesTier = !tierFilter || app.risk_tier === tierFilter;
      return matchesQuery && matchesStatus && matchesTier;
    });
  }, [applications, query, statusFilter, tierFilter]);

  const exportCsv = () => {
    downloadCsv(
      `applications-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((a) => ({
        id: a.id,
        status: a.status,
        amount: a.requested_amount,
        tier: a.risk_tier,
        date: a.created_at,
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* ... search ... */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by name, ID or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-900 border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
            <Filter className="w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none"
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="AGREEMENT_PENDING">AGREEMENT_PENDING</option>
              <option value="AGREEMENT_SIGNED">AGREEMENT_SIGNED</option>
              <option value="DISBURSE_PENDING">DISBURSE_PENDING</option>
              <option value="DISBURSED">DISBURSED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        {loading && applications.length === 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-slate-800">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-800 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/50">
                  <th className="px-6 py-4">Application ID</th>
                  <th className="px-6 py-4">Requested</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-blue-500">
                      {app.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {formatCurrency(app.requested_amount)}
                      <div className="text-[10px] text-slate-500">{app.loan_product_id ? 'Standard Loan' : 'Quick Cash'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          app.status === 'APPROVED' ? "bg-green-500" : 
                          app.status === 'REJECTED' ? "bg-red-500" : 
                          app.status === 'PENDING_REVIEW' ? "bg-blue-500" : "bg-slate-500"
                        )} />
                        <span className="text-xs text-slate-300">{app.status.replaceAll('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDate(app.created_at)}</td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-400 group-hover:translate-x-1 transition-transform"
                      >
                        Review
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No applications found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">Showing {filtered.length} applications</p>
          {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        </div>
      </div>
    </div>
  );
}
