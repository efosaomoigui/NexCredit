import Link from "next/link";
import { AlertTriangle, Clock, ListChecks, TrendingUp } from "lucide-react";

const stats = [
  { label: "Active Cases", value: "24", icon: ListChecks, tone: "text-blue-600 bg-blue-50 border-blue-100" },
  { label: "Overdue Today", value: "7", icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-100" },
  { label: "Critical (30+ days)", value: "3", icon: AlertTriangle, tone: "text-red-700 bg-red-50 border-red-100" },
  { label: "Recovered This Week", value: "₦182,000", icon: TrendingUp, tone: "text-green-700 bg-green-50 border-green-100" },
];

export default function CollectionsHome() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Overview</h1>
          <p className="text-slate-500 mt-1">Collections workspace for assigned overdue loans (mock data).</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/queue" className="btn-primary">
            Open Active Queue
          </Link>
          <Link href="/activity" className="btn-secondary">
            View My Activity
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${s.tone}`}>
                <s.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Priority Follow-ups</h2>
          <Link className="text-sm font-bold text-blue-600 hover:text-blue-700" href="/queue">
            See all
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { id: "3", name: "Musa Bello", days: 35, due: "₦50,000", level: "Critical" },
            { id: "1", name: "Adebayo Ibrahim", days: 12, due: "₦24,500", level: "High" },
            { id: "2", name: "Chinyere Okafor", days: 4, due: "₦15,000", level: "Medium" },
          ].map((item) => (
            <div key={item.id} className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{item.name}</p>
                <p className="text-sm text-slate-500">
                  {item.days} days overdue • Due {item.due}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    "badge " +
                    (item.level === "Critical"
                      ? "bg-red-100 text-red-700"
                      : item.level === "High"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700")
                  }
                >
                  {item.level}
                </span>
                <Link href={`/cases/${item.id}`} className="btn-tertiary">
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
