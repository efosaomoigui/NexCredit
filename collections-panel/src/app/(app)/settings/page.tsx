"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Sarah K.");
  const [agentTier, setAgentTier] = useState("T2");
  const [notifySms, setNotifySms] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Local preferences for the Collections Panel (mock).</p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Display name</label>
            <input className="input-field mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label">Agent tier</label>
            <select className="input-field mt-1" value={agentTier} onChange={(e) => setAgentTier(e.target.value)}>
              <option value="T1">T1</option>
              <option value="T2">T2</option>
              <option value="T3">T3</option>
              <option value="T4">T4</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} />
            Enable SMS reminders
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={notifyWhatsapp} onChange={(e) => setNotifyWhatsapp(e.target.checked)} />
            Enable WhatsApp reminders
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button className="btn-secondary" type="button" onClick={() => location.reload()}>
            Reset
          </button>
          <button className="btn-primary" type="button" onClick={() => alert("Saved (mock).")}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
