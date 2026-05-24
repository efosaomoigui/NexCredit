'use client';

import { 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { formatCurrency, cn, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

const mockChartData = [
  { name: 'Mon', disbursed: 450000, repaid: 380000 },
  { name: 'Tue', disbursed: 520000, repaid: 410000 },
  { name: 'Wed', disbursed: 380000, repaid: 450000 },
  { name: 'Thu', disbursed: 610000, repaid: 480000 },
  { name: 'Fri', disbursed: 750000, repaid: 520000 },
  { name: 'Sat', disbursed: 400000, repaid: 350000 },
  { name: 'Sun', disbursed: 300000, repaid: 280000 },
];

const StatCard = ({ title, value, subValue, trend, icon: Icon, color }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
    <div className="flex items-center justify-between">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={cn("flex items-center text-xs font-medium", trend >= 0 ? "text-green-500" : "text-red-500")}>
        {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(trend)}%
      </div>
    </div>
    <div className="mt-4">
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <h3 className="text-2xl font-bold text-white mt-1">{value || '---'}</h3>
      <p className="text-xs text-slate-500 mt-1">{subValue || 'Loading...'}</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ... fetch logic ...
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, appsRes] = await Promise.all([
          api.get('/lending/admin/stats'),
          api.get('/lending/admin/loans?status=PENDING_REVIEW')
        ]);
        
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (appsRes.data.success) setRecentApps(appsRes.data.data.slice(0, 5));
        
      } catch (error) {
        console.error('Dashboard fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Disbursed" 
          value={formatCurrency(stats?.total_disbursed || 0)}
          subValue={`${formatCurrency(stats?.weekly_disbursed || 0)} this week`}
          trend={12.5}
          icon={TrendingUp}
          color="bg-blue-500/10 text-blue-500"
        />
        {/* ... other cards ... */}
        <StatCard 
          title="Active Loans" 
          value={stats?.active_loans || 0}
          subValue="Updated just now"
          trend={8.2}
          icon={CreditCard}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard 
          title="Repayment Rate" 
          value={`${stats?.repayment_rate || 94.2}%`}
          subValue="Target: 95%"
          trend={-0.5}
          icon={PieChart}
          color="bg-green-500/10 text-green-500"
        />
        <StatCard 
          title="Overdue (NPL)" 
          value={`${stats?.npl_rate || 0}%`}
          subValue="Naira at risk"
          trend={-1.2}
          icon={AlertTriangle}
          color="bg-orange-500/10 text-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Disbursements vs Repayments</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₦${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="disbursed" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="repaid" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Pending Reviews</h3>
            <Link href="/applications" className="text-xs text-blue-500 hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {recentApps.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 group hover:border-blue-500/50 transition-colors">
                <div>
                  <div className="text-sm font-bold text-white">APP-{app.id.slice(0, 4)}</div>
                  <div className="text-[10px] text-slate-500">{formatDate(app.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-500">{formatCurrency(app.requested_amount)}</div>
                  <Link href={`/applications/${app.id}`} className="text-[10px] text-slate-400 hover:text-white underline">Review Application</Link>
                </div>
              </div>
            ))}
            {recentApps.length === 0 && !loading && (
              <div className="py-20 text-center text-sm text-slate-500 italic">No applications pending review.</div>
            )}
            {loading && (
              <div className="py-20 text-center text-sm text-slate-500 italic">Fetching applications...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
