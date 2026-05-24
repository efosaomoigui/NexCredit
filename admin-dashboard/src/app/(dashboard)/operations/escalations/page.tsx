'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  ChevronRight, 
  Search, 
  Filter, 
  UserPlus,
  Clock,
  ShieldCheck,
  Flag
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

// Mock escalation data until we connect the Collections API
const mockEscalations = [
  { 
    id: 'ESC-8821', 
    loanId: 'LN-2021', 
    borrower: 'Adebayo Ibrahim', 
    level: 2, 
    reason: 'Frequent Broken PTP (Promise to Pay)', 
    overdueDays: 45, 
    amount: 15000,
    status: 'OPEN',
    assignedTo: 'Senior Supervisor'
  },
  { 
    id: 'ESC-8822', 
    loanId: 'LN-2045', 
    borrower: 'Chukwuma Obi', 
    level: 3, 
    reason: 'Suspected Identity Fraud - Flagged by Field Agent', 
    overdueDays: 12, 
    amount: 25000,
    status: 'IN_REVIEW',
    assignedTo: 'Fraud Task Force'
  },
  { 
    id: 'ESC-8823', 
    loanId: 'LN-2089', 
    borrower: 'Fatima Zahra', 
    level: 1, 
    reason: 'Communication Barrier - Request for Dialect Agent', 
    overdueDays: 8, 
    amount: 5000,
    status: 'ASSIGNED',
    assignedTo: 'Support Desk'
  },
];

export default function EscalationDeskPage() {
  const [loading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Escalation Desk</h1>
          <p className="text-sm text-slate-400 mt-1">Supervisory queue for high-risk and flagged collection cases.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-400">
             <Clock className="w-3.5 h-3.5" />
             Avg. Resolution: 14h
           </div>
           <button className="bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
             <AlertTriangle className="w-4 h-4" />
             Emergency Lockdown
           </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            className="w-full bg-slate-900 border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-red-500/50" 
            placeholder="Search by escalation ID or borrower name..."
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
            Priority Level
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
             <ShieldCheck className="w-4 h-4" />
             Fraud Only
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/50">
                <th className="px-6 py-4">Escalation</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Reason / Borrower</th>
                <th className="px-6 py-4">Exposure</th>
                <th className="px-6 py-4">Status / Assignee</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {mockEscalations.map((esc) => (
                <tr key={esc.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs text-red-400">{esc.id}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Loan: {esc.loanId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                      esc.level === 3 ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                      esc.level === 2 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : 
                      "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      <Flag className="w-3 h-3" />
                      LVL {esc.level}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-white">{esc.borrower}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{esc.reason}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-white">{formatCurrency(esc.amount)}</div>
                    <div className="text-[10px] text-red-400">{esc.overdueDays} Days Late</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                       <div className="text-xs text-white">{esc.status}</div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                       <UserPlus className="w-3 h-3" />
                       {esc.assignedTo}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 group-hover:translate-x-1 transition-transform">
                      Resolve Case
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Urgent Attention</div>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                <div className="text-xs font-bold text-red-400">Broken PTPs (24h)</div>
                <div className="text-lg font-bold text-white">14</div>
             </div>
             <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
                <div className="text-xs font-bold text-orange-400">High Exposure (&gt;20k)</div>
                <div className="text-lg font-bold text-white">8</div>
             </div>
          </div>
        </div>
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Team Performance</div>
             <div className="text-[10px] text-blue-500 font-bold uppercase">Weekly Metrics</div>
          </div>
          <div className="flex gap-10">
             <div className="flex-1 space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="text-slate-500 uppercase">Resolution Rate</span>
                   <span className="text-green-500">82%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                   <div className="h-full bg-green-500 w-[82%]" />
                </div>
             </div>
             <div className="flex-1 space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="text-slate-500 uppercase">Fraud Capture</span>
                   <span className="text-blue-500">94%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 w-[94%]" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
