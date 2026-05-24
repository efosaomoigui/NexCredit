'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShieldAlert, 
  History, 
  LogOut,
  CreditCard,
  PieChart,
  Settings2,
  AlertTriangle,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { RouteLoader } from './RouteLoader';
import { UserMenu } from './UserMenu';
import AuthGate from './AuthGate';

const sidebarSections = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Applications', icon: FileText, href: '/applications' },
      { label: 'Active Loans', icon: DollarSign, href: '/loans' },
      { label: 'Borrowers', icon: Users, href: '/borrowers' },
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Escalation Desk', icon: AlertTriangle, href: '/operations/escalations' },
      { label: 'Fraud & Flags', icon: ShieldAlert, href: '/fraud' },
    ]
  },
  {
    title: 'SYSTEM CONFIG',
    items: [
      { label: 'Settings', icon: Settings2, href: '/settings' },
      { label: 'Product Factory', icon: Settings2, href: '/settings/products' },
      { label: 'Pricing Policy', icon: Settings2, href: '/settings/pricing-policy' },
      { label: 'Users & Roles', icon: Users, href: '/settings/users' },
      { label: 'Agents', icon: UserCheck, href: '/settings/assignments' },
      { label: 'Audit Logs', icon: History, href: '/audit' },
      { label: 'Analytics', icon: PieChart, href: '/analytics' },
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/login');
  };

  return (
    <AuthGate>
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <RouteLoader />
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 font-bold text-xl text-white">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">NC</div>
            NexCredit
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto pt-4">
          {sidebarSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname === item.href 
                        ? "bg-blue-600/10 text-blue-500" 
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="font-semibold text-white">
            {sidebarSections.flatMap(s => s.items).find(i => i.href === pathname)?.label || 'System'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live System
            </div>
            <UserMenu />
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
    </AuthGate>
  );
}
