"use client";

import Link from "next/link";
import { Calendar, CheckCircle2, MessageSquare, Phone } from "lucide-react";

const activity = [
  {
    at: "Today • 09:12",
    type: "Called - Spoke",
    borrower: "Chinyere Okafor",
    caseId: "2",
    note: "Confirmed repayment on payday (Friday).",
    icon: Phone,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    at: "Yesterday • 15:05",
    type: "SMS Sent",
    borrower: "Olumide Johnson",
    caseId: "4",
    note: "Reminder sent (D+1 overdue).",
    icon: MessageSquare,
    tone: "bg-slate-50 text-slate-700 border-slate-200",
  },
  {
    at: "May 6 • 11:44",
    type: "PTP Recorded",
    borrower: "Adebayo Ibrahim",
    caseId: "1",
    note: "Promise to pay ₦24,500 by May 9.",
    icon: Calendar,
    tone: "bg-amber-50 text-amber-800 border-amber-100",
  },
  {
    at: "May 4 • 16:10",
    type: "Recovered",
    borrower: "System",
    caseId: "2",
    note: "Payment confirmed and case closed.",
    icon: CheckCircle2,
    tone: "bg-green-50 text-green-800 border-green-100",
  },
];

export default function ActivityPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Activity</h1>
          <p className="text-slate-500 mt-1">Recent actions logged by you (mock data).</p>
        </div>
        <Link href="/queue" className="btn-secondary">
          Back to Queue
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {activity.map((a, idx) => (
            <div key={idx} className="p-6 flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${a.tone}`}>
                <a.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 truncate">{a.type}</p>
                    <p className="text-sm text-slate-500 truncate">
                      {a.borrower} • {a.at}
                    </p>
                  </div>
                  <Link href={`/cases/${a.caseId}`} className="btn-tertiary whitespace-nowrap">
                    Open case
                  </Link>
                </div>
                <p className="text-sm text-slate-700 mt-3">{a.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
