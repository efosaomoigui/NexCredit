'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import { cn, formatDate } from '@/lib/utils';
import { CheckCircle2, ShieldAlert, User, XCircle } from 'lucide-react';

type Flag = { id: number; type: string; severity: 'low' | 'medium' | 'high'; resolved: boolean };

export default function BorrowerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [flags, setFlags] = useState<Flag[]>([
    { id: 1, type: 'Shared Device', severity: 'medium', resolved: true },
    { id: 2, type: 'VPN Detected', severity: 'low', resolved: false },
    { id: 3, type: 'Multiple SIM Swaps', severity: 'high', resolved: false },
    { id: 4, type: 'Inconsistent Names', severity: 'medium', resolved: false },
  ]);

  const borrower = useMemo(
    () => ({
      id: params.id,
      name: 'Adebayo Ibrahim',
      phone: '+234 812 345 6789',
      email: 'adebayo@example.com',
      status: 'ACTIVE',
      createdAt: '2026-05-01T09:00:00Z',
    }),
    [params.id]
  );

  const resolveFlag = (id: number) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: true } : f)));
  };

  const viewProfile = () => {
    alert('Borrower profile view (mock). Hook to Identity Engine later.');
  };

  const openIssues = () => {
    router.push('/fraud');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center font-extrabold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{borrower.name}</h1>
              <p className="text-sm text-slate-400">
                {borrower.phone} • Joined {formatDate(borrower.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openIssues}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 hover:text-white"
            >
              View Issues
            </button>
            <button
              onClick={viewProfile}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white"
            >
              View Profile
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-500" /> Flags
            </h2>
          </div>
          <div className="divide-y divide-slate-800">
            {flags.map((flag) => (
              <div key={flag.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{flag.type}</p>
                  <p className="text-xs text-slate-500">
                    Severity:{' '}
                    <span
                      className={cn(
                        'font-bold',
                        flag.severity === 'high'
                          ? 'text-red-500'
                          : flag.severity === 'medium'
                            ? 'text-orange-500'
                            : 'text-slate-300'
                      )}
                    >
                      {flag.severity.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {flag.resolved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-500">
                      <CheckCircle2 className="w-4 h-4" /> Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => resolveFlag(flag.id)}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={viewProfile}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

