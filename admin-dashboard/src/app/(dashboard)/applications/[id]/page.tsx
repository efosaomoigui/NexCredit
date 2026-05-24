'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { 
  ShieldCheck, 
  Wallet, 
  BarChart3, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  Clock,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/lending/admin/loans/${params.id}`);
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch detail:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [params.id]);

  const takeDecision = async (action: 'approve' | 'reject') => {
    if (submitting) return;
    const ok = window.confirm(`${action.toUpperCase()} application ${params.id}?`);
    if (!ok) return;

    setSubmitting(true);
    try {
      const endpoint = `/lending/admin/loans/${params.id}/${action}`;
      const payload = action === 'approve' 
        ? { approved_amount: data.application.requested_amount, decision_notes: decisionNotes }
        : { reason: decisionNotes };
      
      const response = await api.post(endpoint, payload);
      if (response.data.success) {
        window.alert(`Application ${action}ed successfully.`);
        router.push('/applications');
      }
    } catch (error: any) {
      window.alert(error.response?.data?.message || `Failed to ${action} application.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500">Fetching application dossier...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!data) return <AdminLayout>Not found</AdminLayout>;

  const { application: app, risk_score: risk, fraud_flags: flags } = data;

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Profile & Request */}
        <div className="space-y-6">
          {/* Identity Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold text-lg">
                {app.id.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">User ID: {app.user_id.slice(0, 8)}</h3>
                <p className="text-sm text-slate-400">Borrower profile</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-500">Status</span>
                <span className="text-xs text-blue-500 font-bold">{app.status}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-xs text-slate-500">Registered</span>
                <span className="text-xs text-white">{formatDate(app.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Loan Request Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-white font-bold mb-6">
              <Wallet className="w-5 h-5 text-blue-500" />
              Loan Request
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Product</span>
                <span className="text-sm font-semibold text-white">{app.loan_product_id ? 'Standard' : 'Quick Cash'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Principal</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(app.requested_amount)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Tenor</span>
                  <span className="text-sm font-bold text-white">30 Days</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Risk & Bureau */}
        <div className="space-y-6">
          {/* Risk Score Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              {risk && (
                <span className={cn(
                  "px-3 py-1 rounded text-xs font-bold uppercase",
                  risk.risk_tier === 'A' ? "bg-green-500/20 text-green-500" : "bg-orange-500/20 text-orange-500"
                )}>
                  Tier {risk.risk_tier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-white font-bold mb-8">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Risk Analysis
            </div>
            
            {risk ? (
              <>
                <div className="flex items-end gap-4 mb-8">
                  <div className="text-5xl font-black text-white">{Math.round(risk.composite_score)}</div>
                  <div className="text-sm text-slate-400 mb-1">Composite Score</div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Bureau {risk.bureau_score}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Banking {risk.bank_behaviour_score}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Internal {risk.internal_score}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Identity {risk.identity_score}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-slate-500 text-sm italic">Scoring in progress...</div>
            )}
          </div>

          {/* Bureau Report Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-white font-bold">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                Credit Bureau
              </div>
            </div>
            <div className="text-center py-6">
              <p className="text-xs text-slate-400">Bureau data available in Risk Score snapshot above.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Banking & Fraud */}
        <div className="space-y-6">
          {/* Fraud Flags Panel */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-white font-bold mb-6">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              Fraud Signals
            </div>
            <div className="space-y-3">
              {flags && flags.length > 0 ? flags.map((flag: any) => (
                <div key={flag.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white uppercase">{flag.flag_type}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                      flag.severity === 'HIGH' ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {flag.severity}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">Source: {flag.source}</div>
                </div>
              )) : (
                <div className="text-center py-4 text-xs text-green-500">No active fraud flags detected.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Footer */}
      <div className="fixed bottom-0 left-64 right-0 p-6 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 flex items-center gap-6 z-20">
        <div className="flex-1 flex gap-4">
          <div className="relative flex-1 max-w-2xl">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Add decision notes or internal comments..."
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="w-full bg-slate-900 border-slate-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            disabled={submitting}
            onClick={() => takeDecision('reject')}
            className={cn(
              "px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-bold text-white flex items-center gap-2 transition-colors",
              submitting && "opacity-60 cursor-not-allowed"
            )}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
          <button 
            disabled={submitting || (flags && flags.some((f: any) => f.severity === 'HIGH'))}
            onClick={() => takeDecision('approve')}
            className={cn(
              "px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white flex items-center gap-2 transition-colors",
              (submitting || (flags && flags.some((f: any) => f.severity === 'HIGH'))) && "opacity-50 cursor-not-allowed"
            )}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve Application
          </button>
        </div>
      </div>
      <div className="h-24" /> {/* Spacer for footer */}
    </AdminLayout>
  );
}
