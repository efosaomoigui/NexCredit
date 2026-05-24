import { Inter } from "next/font/google";
import Link from "next/link";
import { Activity, LayoutDashboard, ListChecks, LogOut, Settings, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import "../globals.css";
import { RouteLoader } from "@/components/RouteLoader";
import { verifySessionToken } from "@/lib/auth";
import AuthGate from "@/components/AuthGate";

const inter = Inter({ subsets: ["latin"] });
const ALLOWED_ROLES = new Set(["agent", "admin", "superadmin"]);
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/login?next=/");

  try {
    const payload = await verifySessionToken(token);
    const role = payload.role ?? "";
    if (!ALLOWED_ROLES.has(role)) {
      redirect("/login?next=/");
    }
  } catch {
    redirect("/login?next=/");
  }

  return (
    <AuthGate>
    <div className={`flex min-h-screen ${inter.className}`}>
      <RouteLoader />
      {/* Sidebar */}
      <aside className="w-64 sidebar-glass text-white p-6 flex flex-col fixed h-full z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight">NexCollections</span>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { label: "Overview", icon: LayoutDashboard, href: "/" },
            { label: "Active Queue", icon: ListChecks, href: "/queue" },
            { label: "My Activity", icon: Activity, href: "/activity" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all text-slate-300 hover:text-white font-medium"
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all text-slate-400 hover:text-white"
          >
            <Settings size={20} />
            Settings
          </Link>
          <Link
            href="/login?logout=1"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all text-red-400 hover:text-red-300"
          >
            <LogOut size={20} />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 bg-slate-50 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-end sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">Sarah K.</p>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Agent T2</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              SK
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
    </AuthGate>
  );
}
