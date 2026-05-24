"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Phone,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Plus,
  ArrowUpCircle,
} from "lucide-react";

export default function CaseDetail({ params }: { params: { id: string } }) {
  const [borrower, setBorrower] = useState<null | { borrower_id: string; full_name?: string | null; phone: string }>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [action, setAction] = useState("Called - Spoke");
  const [ptpDate, setPtpDate] = useState("");
  const [ptpAmount, setPtpAmount] = useState("24500");
  const [busy, setBusy] = useState<null | "escalate" | "save" | "ptp">(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await fetch("/api/assignments/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load case");
        const list = (json.data?.borrowers ?? []) as any[];
        const found = list.find((x) => x.borrower_id === params.id);
        if (!found) throw new Error("This case is not assigned to your account.");
        setBorrower({ borrower_id: found.borrower_id, full_name: found.full_name ?? null, phone: found.phone });
      } catch (e: any) {
        setLoadError(e?.message ?? "Failed to load case");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id]);

  const displayName = useMemo(() => borrower?.full_name || borrower?.phone || "Borrower", [borrower]);

  const escalate = async () => {
    if (busy) return;
    const ok = window.confirm("Escalate this case to Tier 3?");
    if (!ok) return;
    setBusy("escalate");
    try {
      await new Promise((r) => setTimeout(r, 500));
      window.alert("Escalated (mock).");
    } finally {
      setBusy(null);
    }
  };

  const saveInteraction = async () => {
    if (busy) return;
    if (!note.trim()) {
      window.alert("Add a note before saving.");
      return;
    }
    setBusy("save");
    try {
      await new Promise((r) => setTimeout(r, 500));
      window.alert("Interaction saved (mock).");
      setNote("");
    } finally {
      setBusy(null);
    }
  };

  const setPtp = async () => {
    if (busy) return;
    if (!ptpDate) {
      window.alert("Select a promised date.");
      return;
    }
    setBusy("ptp");
    try {
      await new Promise((r) => setTimeout(r, 500));
      window.alert(`PTP saved (mock): ₦${ptpAmount} on ${ptpDate}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header / Summary */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
            {displayName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{loading ? "Loading…" : displayName}</h1>
            <div className="flex gap-3 mt-1 items-center">
              <span className="badge bg-red-100 text-red-600">Tier 2 Overdue</span>
              <span className="text-slate-500 text-sm flex items-center gap-1">
                <Phone size={14} /> {borrower?.phone || "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={escalate}
            disabled={busy === "escalate"}
            className="btn-primary bg-slate-800 flex items-center gap-2 disabled:opacity-60"
          >
            <ArrowUpCircle size={18} /> {busy === "escalate" ? "Escalating..." : "Escalate to Tier 3"}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="card p-4 border border-red-200 bg-red-50 text-red-700 font-semibold">{loadError}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Financial Card */}
          <div className="card grid grid-cols-3 gap-6">
            <div>
              <p className="text-slate-500 text-sm uppercase tracking-wider font-bold">Total Due</p>
              <p className="text-2xl font-bold mt-1 text-red-600">₦24,500.00</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm uppercase tracking-wider font-bold">Days Overdue</p>
              <p className="text-2xl font-bold mt-1">12 Days</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm uppercase tracking-wider font-bold">Due Date</p>
              <p className="text-2xl font-bold mt-1">May 15, 2026</p>
            </div>
          </div>

          {/* Contact Log */}
          <div className="card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-500" /> Interaction History
            </h3>
            <div className="space-y-6">
              {[
                {
                  date: "Yesterday, 2:45 PM",
                  agent: "Sarah K.",
                  action: "Called - Spoke",
                  note: "Borrower promised to pay by Friday. Salary was delayed.",
                },
                {
                  date: "May 20, 10:00 AM",
                  agent: "System",
                  action: "SMS Sent",
                  note: "D+5 Overdue reminder sent automatically.",
                },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 border-l-2 border-slate-100 pl-4 relative">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800">{log.action}</p>
                      <span className="text-xs text-slate-400">{log.date}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{log.note}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Logged by {log.agent}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-8">
          {/* Add Note Form */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus size={20} className="text-blue-500" /> Log Contact
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Action Taken</label>
                <select className="input-field mt-1" value={action} onChange={(e) => setAction(e.target.value)}>
                  <option>Called - Spoke</option>
                  <option>Called - No Answer</option>
                  <option>SMS Sent</option>
                  <option>PTP Recorded</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Details</label>
                <textarea
                  className="input-field mt-1 h-32 resize-none"
                  placeholder="Enter notes from call..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button disabled={busy === "save"} onClick={saveInteraction} className="btn-primary w-full disabled:opacity-60">
                {busy === "save" ? "Saving..." : "Save Interaction"}
              </button>
            </div>
          </div>

          {/* PTP Form */}
          <div className="card bg-blue-50 border-blue-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-900">
              <Calendar size={20} className="text-blue-600" /> Promise to Pay
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-blue-800 uppercase">Promised Date</label>
                <input
                  type="date"
                  className="input-field mt-1 border-blue-200"
                  value={ptpDate}
                  onChange={(e) => setPtpDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-blue-800 uppercase">Amount (₦)</label>
                <input
                  type="number"
                  className="input-field mt-1 border-blue-200"
                  placeholder="24500"
                  value={ptpAmount}
                  onChange={(e) => setPtpAmount(e.target.value)}
                />
              </div>
              <button
                disabled={busy === "ptp"}
                onClick={setPtp}
                className="btn-primary w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60"
              >
                {busy === "ptp" ? "Saving..." : "Set PTP"}
              </button>
            </div>
          </div>

          <div className="card border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-700 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-amber-900">Case ID</p>
                <p className="text-sm text-amber-800">#{params.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
