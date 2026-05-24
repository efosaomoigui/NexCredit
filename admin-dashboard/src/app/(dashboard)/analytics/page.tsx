'use client';

import AdminLayout from '@/components/layout/AdminLayout';
import { PieChart, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const areaData = [
  { month: 'Jan', volume: 8.5 },
  { month: 'Feb', volume: 10.2 },
  { month: 'Mar', volume: 12.8 },
  { month: 'Apr', volume: 11.5 },
  { month: 'May', volume: 15.4 },
];

const tierData = [
  { name: 'Tier A', value: 45, color: '#10b981' },
  { name: 'Tier B', value: 30, color: '#3b82f6' },
  { name: 'Tier C', value: 15, color: '#f59e0b' },
  { name: 'Tier D', value: 10, color: '#ef4444' },
];

export default function AnalyticsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-white">Disbursement Volume</h3>
                <p className="text-sm text-slate-400">Monthly growth in millions (₦M)</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-8">Portfolio Risk Mix</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={tierData}
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {tierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">90-Day NPL</h4>
            <div className="text-3xl font-black text-red-500">2.4%</div>
            <p className="text-[10px] text-slate-400 mt-2">Target: &lt; 3.0%</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Avg. Ticket Size</h4>
            <div className="text-3xl font-black text-white">₦34.2k</div>
            <p className="text-[10px] text-slate-400 mt-2">↑ 5% from prev. quarter</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">CAC per Loan</h4>
            <div className="text-3xl font-black text-blue-500">₦1.8k</div>
            <p className="text-[10px] text-slate-400 mt-2">Optimized via AI routing</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Recoveries Rate</h4>
            <div className="text-3xl font-black text-green-500">68%</div>
            <p className="text-[10px] text-slate-400 mt-2">Tier 3 manual focus</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
