import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const C = {
  bg: "#F7F5F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EDE8",
  border: "#E8E3DC",
  borderLight: "#F0EDE8",
  text: "#1A1410",
  textSub: "#6B6159",
  textMuted: "#9E958A",
  primary: "#2D1B69",
  primaryLight: "#F0EDFF",
  accent: "#FF5C38",
  accentLight: "#FFF0EC",
  gold: "#D4A017",
  goldLight: "#FFF8E6",
  success: "#0BA270",
  successLight: "#E6F7F2",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  gradA: "#2D1B69",
  gradB: "#FF5C38",
};

/* ═══════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════ */
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { display: none; }
  input, textarea, select { outline: none; font-family: 'Sora', sans-serif; }
  input::placeholder { color: ${C.textMuted}; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
  .fade-up { animation: fadeUp 0.45s ease both; }
  .fade-in { animation: fadeIn 0.3s ease both; }
  .scale-in { animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  .delay-1 { animation-delay: 0.08s; }
  .delay-2 { animation-delay: 0.16s; }
  .delay-3 { animation-delay: 0.24s; }
  .delay-4 { animation-delay: 0.32s; }
  .delay-5 { animation-delay: 0.40s; }
`;

/* ═══════════════════════════════════════════════════════════
   BASE COMPONENTS
═══════════════════════════════════════════════════════════ */

const Spinner = ({ size = 20, color = C.primary }) => (
  <div style={{ width: size, height: size, border: `2.5px solid ${color}30`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0 }} />
);

const Badge = ({ children, color = C.primary, bg, dot }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg || `${color}14`, color, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, letterSpacing: 0.2, fontFamily: "Sora" }}>
    {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />}
    {children}
  </span>
);

const Card = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 2px 16px rgba(45,27,105,0.06)", ...style }}>
    {children}
  </div>
);

const Btn = ({ children, variant = "primary", onClick, disabled, loading, style = {}, size = "md", icon }) => {
  const sizes = { sm: { padding: "9px 16px", fontSize: 13 }, md: { padding: "14px 20px", fontSize: 14 }, lg: { padding: "16px 24px", fontSize: 15 } };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${C.gradA} 0%, #4A2AB0 100%)`, color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(45,27,105,0.3)" },
    accent: { background: `linear-gradient(135deg, ${C.accent} 0%, #FF7B59 100%)`, color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(255,92,56,0.3)" },
    outline: { background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}` },
    ghost: { background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}` },
    danger: { background: C.dangerLight, color: C.danger, border: `1px solid ${C.danger}30` },
    success: { background: C.successLight, color: C.success, border: `1px solid ${C.success}30` },
  };
  return (
    <button onClick={disabled || loading ? undefined : onClick} style={{
      ...sizes[size], ...variants[variant], borderRadius: 14, cursor: disabled || loading ? "default" : "pointer",
      fontFamily: "Sora", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      width: "100%", transition: "all 0.2s", opacity: disabled ? 0.5 : 1, ...style,
    }}>
      {loading ? <Spinner size={16} color={variant === "primary" || variant === "accent" ? "#fff" : C.primary} /> : icon}
      {!loading && children}
      {loading && <span>Please wait…</span>}
    </button>
  );
};

const Input = ({ label, placeholder, type = "text", value, onChange, prefix, suffix, hint, error, maxLength }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, marginBottom: 6, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora" }}>{label}</div>}
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && <div style={{ position: "absolute", left: 14, color: C.textMuted, fontSize: 14, fontWeight: 600, pointerEvents: "none", zIndex: 1 }}>{prefix}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} style={{
        width: "100%", background: C.surface, border: `1.5px solid ${error ? C.danger : C.border}`, borderRadius: 12,
        padding: prefix ? "13px 14px 13px 38px" : suffix ? "13px 48px 13px 14px" : "13px 14px",
        color: C.text, fontSize: 15, fontFamily: "Sora", fontWeight: 500, transition: "border-color 0.2s",
      }} />
      {suffix && <div style={{ position: "absolute", right: 14, color: C.textMuted }}>{suffix}</div>}
    </div>
    {(hint || error) && <div style={{ fontSize: 11, color: error ? C.danger : C.textMuted, marginTop: 5, fontFamily: "Sora" }}>{error || hint}</div>}
  </div>
);

const ProgressTrack = ({ steps, current }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
    {steps.map((s, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: i < current ? C.success : i === current ? C.primary : C.borderLight,
            border: `2px solid ${i < current ? C.success : i === current ? C.primary : C.border}`,
            fontSize: 11, fontWeight: 700, color: i <= current ? "#fff" : C.textMuted, fontFamily: "Sora",
            transition: "all 0.3s",
          }}>
            {i < current ? "✓" : i + 1}
          </div>
          <span style={{ fontSize: 9, color: i === current ? C.primary : C.textMuted, fontWeight: i === current ? 700 : 400, whiteSpace: "nowrap", fontFamily: "Sora" }}>{s}</span>
        </div>
        {i < steps.length - 1 && (
          <div style={{ flex: 1, height: 2, background: i < current ? C.success : C.border, margin: "-16px 4px 0", transition: "background 0.3s" }} />
        )}
      </div>
    ))}
  </div>
);

const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
    <div style={{ flex: 1, height: 1, background: C.border }} />
    {label && <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "Sora" }}>{label}</span>}
    <div style={{ flex: 1, height: 1, background: C.border }} />
  </div>
);

/* ═══════════════════════════════════════════════════════════
   SVG ICONS
═══════════════════════════════════════════════════════════ */
const Icon = ({ n, s = 20, c = C.textSub }) => {
  const d = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    loans: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
    apply: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    repay: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    profile: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    chevR: <polyline points="9 18 15 12 9 6"/>,
    chevL: <polyline points="15 18 9 12 15 6"/>,
    check: <polyline points="20 6 9 17 4 12"/>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    warn: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    bank: <><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {d[n]}
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: SPLASH
═══════════════════════════════════════════════════════════ */
const SplashScreen = ({ onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(160deg, ${C.gradA} 0%, #4A2AB0 60%, #6B3AC0 100%)`, minHeight: 700 }}>
      <div className="scale-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 32 }}>💳</span>
        </div>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: "#fff", letterSpacing: -1, textAlign: "center", margin: 0 }}>NexCredit</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textAlign: "center", fontFamily: "Sora", marginTop: 4 }}>Smart lending. Honest terms.</p>
        </div>
        <Spinner size={24} color="rgba(255,255,255,0.6)" />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: LOGIN
═══════════════════════════════════════════════════════════ */
const LoginScreen = ({ onLogin }) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [loading, setLoading] = useState(false);

  const sendOTP = () => {
    if (phone.length < 10) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("otp"); }, 1500);
  };
  const verify = () => {
    if (otp.length < 4) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1800);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${C.gradA} 0%, #4A2AB0 100%)`, padding: "48px 28px 40px", borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <div className="fade-up" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18 }}>💳</span>
          </div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#fff" }}>NexCredit</span>
        </div>
        <div className="fade-up delay-1">
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#fff", lineHeight: 1.25, margin: 0 }}>
            Welcome back,<br /><em>let's get you in</em>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 8, fontFamily: "Sora" }}>You're currently signed out.</p>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column" }}>
        {step === "phone" ? (
          <div className="fade-up delay-2">
            <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 20, fontFamily: "Sora" }}>Enter your phone number</p>
            <Input label="Phone / Email" placeholder="e.g. 0812 345 6789" value={phone} onChange={e => setPhone(e.target.value)} prefix={<Icon n="phone" s={14} c={C.textMuted} />} />
            <div style={{ marginTop: 8 }} />
            <Btn loading={loading} onClick={sendOTP} disabled={phone.length < 10}>Send verification code</Btn>
            <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 16, fontFamily: "Sora", lineHeight: 1.6 }}>
              We'll send a one-time code via SMS. Standard rates may apply.
            </p>
            <Divider label="Don't have an account?" />
            <Btn variant="ghost" onClick={onLogin}>Create new account</Btn>
          </div>
        ) : (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div onClick={() => setStep("phone")} style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon n="chevL" s={16} c={C.text} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "Sora" }}>Enter OTP</p>
            </div>
            <p style={{ fontSize: 13, color: C.textSub, marginBottom: 20, fontFamily: "Sora", lineHeight: 1.6 }}>
              We sent a 6-digit code to <strong style={{ color: C.text }}>{phone}</strong>. Enter it below.
            </p>
            <Input label="Verification code" placeholder="e.g. 123456" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} hint="Code expires in 5 minutes" />
            <div style={{ marginTop: 8 }} />
            <Btn loading={loading} onClick={verify} disabled={otp.length < 4}>Verify & Sign In</Btn>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <span onClick={() => setStep("phone")} style={{ fontSize: 13, color: C.primary, fontWeight: 600, cursor: "pointer", fontFamily: "Sora" }}>Resend code</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: ONBOARDING / CONSENT
═══════════════════════════════════════════════════════════ */
const OnboardingScreen = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);

  const slides = [
    {
      emoji: "🔒",
      title: "Your data is yours",
      body: "We only collect what we need to process your loan: BVN/NIN for identity, bank data for affordability. We never access your contacts or location.",
    },
    {
      emoji: "📋",
      title: "Credit checks & NDPC consent",
      body: "By proceeding, you authorise NexCredit to run credit bureau checks (CRC, First Central) and store your data in line with NDPC regulations.",
    },
    {
      emoji: "💸",
      title: "Repayment rules you should know",
      body: "Loans must be repaid within the agreed tenor. Late payments attract daily penalties clearly shown before you borrow. There are no hidden fees.",
    },
  ];

  const last = step === slides.length - 1;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
          {slides.map((_, i) => (
            <div key={i} style={{ height: 4, width: i === step ? 24 : 8, borderRadius: 4, background: i <= step ? C.primary : C.border, transition: "all 0.3s" }} />
          ))}
        </div>

        <div key={step} className="scale-in" style={{ textAlign: "center", maxWidth: 300 }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>{slides[step].emoji}</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: C.text, marginBottom: 14, lineHeight: 1.3 }}>{slides[step].title}</h2>
          <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, fontFamily: "Sora" }}>{slides[step].body}</p>
        </div>

        {last && (
          <div className="fade-up" style={{ marginTop: 32, width: "100%", maxWidth: 340 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 20 }}>
              <div onClick={() => setChecked(!checked)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? C.primary : C.border}`, background: checked ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.2s" }}>
                {checked && <Icon n="check" s={12} c="#fff" />}
              </div>
              <span style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.6 }}>
                I have read and agree to the <span style={{ color: C.primary, fontWeight: 600 }}>Terms & Conditions</span>, <span style={{ color: C.primary, fontWeight: 600 }}>Privacy Policy</span>, and NDPC data consent.
              </span>
            </label>
          </div>
        )}
      </div>

      <div style={{ padding: "0 28px 36px", display: "flex", flexDirection: "column", gap: 12 }}>
        {!last ? (
          <>
            <Btn onClick={() => setStep(s => s + 1)}>Continue</Btn>
            <Btn variant="ghost" onClick={onDone}>Skip intro</Btn>
          </>
        ) : (
          <>
            <Btn disabled={!checked} onClick={onDone}>Agree & Continue</Btn>
            <Btn variant="ghost" onClick={() => {}}>View full terms</Btn>
          </>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: KYC
═══════════════════════════════════════════════════════════ */
const KYCScreen = ({ onDone }) => {
  const [kstep, setKstep] = useState(0);
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [selfieState, setSelfieState] = useState("idle");
  const [kycStatus, setKycStatus] = useState("pending");

  const steps = ["Identity", "Selfie", "Review"];

  const submitBVN = () => {
    if (bvn.length < 11) return;
    setKstep(1);
  };

  const captureSelfie = () => {
    setSelfieState("capturing");
    setTimeout(() => setSelfieState("done"), 2500);
  };

  const submitForReview = () => {
    setKstep(2);
    setTimeout(() => setKycStatus("needs_review"), 1000);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "20px 24px 0", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: C.text, marginBottom: 4 }}>Identity Verification</h2>
        <p style={{ fontSize: 13, color: C.textSub, marginBottom: 16, fontFamily: "Sora" }}>Complete KYC to access loans</p>
        <ProgressTrack steps={steps} current={kstep} />
      </div>

      <div style={{ flex: 1, padding: "24px 24px" }}>
        {kstep === 0 && (
          <div className="fade-up">
            <Card style={{ padding: 20, marginBottom: 20, background: C.primaryLight }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Icon n="shield" s={20} c={C.primary} />
                <p style={{ fontSize: 13, color: C.primary, fontFamily: "Sora", lineHeight: 1.6 }}>Your BVN/NIN is used only for identity verification. It is not stored or shared beyond what's required by CBN regulations.</p>
              </div>
            </Card>
            <Input label="BVN (Bank Verification Number)" placeholder="Enter your 11-digit BVN" value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, ""))} maxLength={11} hint="Your 11-digit BVN from your bank" />
            <Input label="NIN (Optional but recommended)" placeholder="Enter your NIN" value={nin} onChange={e => setNin(e.target.value.replace(/\D/g, ""))} maxLength={11} hint="Increases your credit limit" />
            <Btn onClick={submitBVN} disabled={bvn.length < 11}>Continue</Btn>
          </div>
        )}

        {kstep === 1 && (
          <div className="fade-up">
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "Sora" }}>Liveness check</p>
            <p style={{ fontSize: 13, color: C.textSub, marginBottom: 24, fontFamily: "Sora", lineHeight: 1.6 }}>Take a clear selfie in good lighting. Look directly at the camera and blink when prompted.</p>
            <div style={{ background: selfieState === "done" ? C.successLight : C.surfaceAlt, borderRadius: 20, aspectRatio: "4/3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24, border: `2px dashed ${selfieState === "done" ? C.success : C.border}` }}>
              {selfieState === "idle" && <><Icon n="camera" s={36} c={C.textMuted} /><span style={{ color: C.textMuted, fontSize: 13, fontFamily: "Sora" }}>Camera preview</span></>}
              {selfieState === "capturing" && <><Spinner size={32} color={C.primary} /><span style={{ color: C.primary, fontSize: 13, fontFamily: "Sora", animation: "pulse 1.5s infinite" }}>Analysing liveness…</span></>}
              {selfieState === "done" && <><div style={{ width: 56, height: 56, borderRadius: "50%", background: C.success, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="check" s={24} c="#fff" /></div><span style={{ color: C.success, fontSize: 14, fontWeight: 700, fontFamily: "Sora" }}>Selfie captured!</span></>}
            </div>
            {selfieState === "idle" && <Btn icon={<Icon n="camera" s={16} c="#fff" />} onClick={captureSelfie}>Take selfie</Btn>}
            {selfieState === "done" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Btn onClick={submitForReview}>Submit for verification</Btn>
                <Btn variant="ghost" onClick={() => setSelfieState("idle")}>Retake</Btn>
              </div>
            )}
          </div>
        )}

        {kstep === 2 && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {kycStatus === "pending" ? (
              <>
                <Spinner size={48} color={C.primary} />
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: "20px 0 8px" }}>Running checks…</h3>
                <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.6, maxWidth: 280 }}>We're verifying your identity with bureau data. This usually takes under 2 minutes.</p>
              </>
            ) : (
              <>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.warningLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Icon n="clock" s={28} c={C.warning} />
                </div>
                <Badge color={C.warning} dot>Needs Manual Review</Badge>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, margin: "16px 0 8px" }}>Under review</h3>
                <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.6, maxWidth: 280, marginBottom: 28 }}>
                  Our compliance team will review your submission. <strong style={{ color: C.text }}>We'll notify you via SMS within 24 hours.</strong>
                </p>
                <Card style={{ padding: 16, width: "100%", textAlign: "left" }}>
                  {[["BVN check", "✓ Matched"], ["NIN check", "✓ Matched"], ["Selfie liveness", "✓ Passed"], ["Deduplication", "⏳ Pending"]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, fontFamily: "Sora" }}>
                      <span style={{ color: C.textSub }}>{k}</span>
                      <span style={{ fontWeight: 600, color: v.includes("✓") ? C.success : v.includes("⏳") ? C.warning : C.text }}>{v}</span>
                    </div>
                  ))}
                </Card>
                <div style={{ marginTop: 24, width: "100%" }}>
                  <Btn onClick={onDone}>Got it, notify me</Btn>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: BANK LINK
═══════════════════════════════════════════════════════════ */
const BankLinkScreen = ({ onDone }) => {
  const [linked, setLinked] = useState(false);
  const [linking, setLinking] = useState(false);

  const doLink = () => {
    setLinking(true);
    setTimeout(() => { setLinking(false); setLinked(true); }, 2200);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "24px 24px 20px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: C.text, marginBottom: 4 }}>Link Bank Account</h2>
        <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora" }}>Securely connect for repayment</p>
      </div>

      <div style={{ flex: 1, padding: 24 }}>
        <Card style={{ padding: 20, background: C.primaryLight, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Icon n="info" s={18} c={C.primary} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 4, fontFamily: "Sora" }}>Why we need this</p>
              <p style={{ fontSize: 12, color: C.primary, fontFamily: "Sora", lineHeight: 1.7, opacity: 0.8 }}>
                Bank linkage via Mono lets us confirm your income and set up repayment. We never access your contacts or location. You can unlink anytime.
              </p>
            </div>
          </div>
        </Card>

        {!linked ? (
          <div className="fade-up">
            <Card style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F0F0FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏦</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "Sora" }}>Connect via Mono</p>
                  <p style={{ fontSize: 12, color: C.textSub, fontFamily: "Sora" }}>GTBank, Access, Zenith, First Bank + 20 more</p>
                </div>
              </div>
            </Card>
            <Card style={{ padding: 20, marginBottom: 24, opacity: 0.5 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FFF0EC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📄</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "Sora" }}>Upload Bank Statement</p>
                  <p style={{ fontSize: 12, color: C.textSub, fontFamily: "Sora" }}>PDF (last 3 months) — coming soon</p>
                </div>
              </div>
            </Card>
            <Btn loading={linking} onClick={doLink} icon={!linking && <Icon n="link" s={16} c="#fff" />}>Link with Mono</Btn>
          </div>
        ) : (
          <div className="fade-up scale-in">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.successLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Icon n="check" s={28} c={C.success} />
              </div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 6 }}>Bank linked successfully</h3>
              <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora" }}>Last synced: just now</p>
            </div>
            <Card style={{ padding: 20, marginBottom: 24 }}>
              {[["Bank", "GTBank"], ["Account", "013•••••78"], ["Type", "Savings"], ["Status", "Active"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, fontFamily: "Sora" }}>
                  <span style={{ color: C.textSub }}>{k}</span>
                  <span style={{ fontWeight: 700, color: k === "Status" ? C.success : C.text }}>{v}</span>
                </div>
              ))}
            </Card>
            <Btn onClick={onDone}>Continue to Dashboard</Btn>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: HOME DASHBOARD
═══════════════════════════════════════════════════════════ */
const HomeScreen = ({ onNav, loanState }) => {
  const hasLoan = loanState && loanState !== "none";
  const isOverdue = loanState === "overdue";

  return (
    <div style={{ background: C.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${C.gradA} 0%, #4A2AB0 100%)`, padding: "28px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: 20, left: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,92,56,0.12)" }} />
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Sora" }}>Good morning,</p>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#fff", marginTop: 2 }}>Chidi Okeke 👋</h2>
          </div>
          <div style={{ position: "relative", cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="bell" s={18} c="#fff" />
            </div>
            <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: C.accent, borderRadius: "50%", border: "2px solid #2D1B69" }} />
          </div>
        </div>
      </div>

      {/* Balance Card — overlaps header */}
      <div style={{ padding: "0 20px", marginTop: -56, position: "relative", zIndex: 10 }}>
        <Card className="fade-up delay-1" style={{ padding: 22, boxShadow: "0 8px 32px rgba(45,27,105,0.18)" }}>
          {isOverdue && (
            <div style={{ background: C.dangerLight, border: `1px solid ${C.danger}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon n="warn" s={16} c={C.danger} />
              <span style={{ fontSize: 12, color: C.danger, fontWeight: 600, fontFamily: "Sora" }}>Payment overdue · 3 days past due</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora" }}>Outstanding Balance</p>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: isOverdue ? C.danger : C.text, margin: "4px 0 0" }}>
                {hasLoan ? "₦23,450" : "₦0.00"}
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora" }}>Credit Tier</p>
              <Badge color={C.gold}>Tier 2</Badge>
            </div>
          </div>
          {hasLoan && (
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <div>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "Sora" }}>Next due</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: isOverdue ? C.danger : C.text, fontFamily: "Sora" }}>May 10, 2025</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "Sora" }}>Status</p>
                <Badge color={isOverdue ? C.danger : C.success} dot>{isOverdue ? "Overdue" : "Active"}</Badge>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: "20px 20px 0" }}>
        <div className="fade-up delay-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Apply Loan", icon: "apply", color: C.primary, bg: C.primaryLight, page: "apply" },
            { label: "Repay Now", icon: "repay", color: C.accent, bg: C.accentLight, page: "repay" },
            { label: "My Loans", icon: "loans", color: C.success, bg: C.successLight, page: "loans" },
            { label: "Statements", icon: "doc", color: C.gold, bg: C.goldLight, page: "loans" },
          ].map(a => (
            <div key={a.label} onClick={() => onNav(a.page)} style={{
              background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "16px 14px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon n={a.icon} s={18} c={a.color} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "Sora" }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loan Status Banner */}
      {hasLoan && (
        <div style={{ padding: "20px 20px 0" }}>
          <Card className="fade-up delay-3" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "Sora" }}>Personal Loan</p>
              <Badge color={isOverdue ? C.danger : C.success} dot>{isOverdue ? "Overdue" : "Active"}</Badge>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontFamily: "Sora" }}>
              <span style={{ color: C.textSub }}>₦1,550 repaid</span>
              <span style={{ color: C.primary, fontWeight: 700 }}>6% cleared</span>
            </div>
            <div style={{ height: 6, background: C.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ width: "6%", height: "100%", background: `linear-gradient(90deg, ${C.primary}, #6B3AC0)`, borderRadius: 10 }} />
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <Btn size="sm" onClick={() => onNav("repay")} style={{ flex: 1 }}>Pay ₦23,450</Btn>
              <Btn variant="ghost" size="sm" onClick={() => onNav("loans")} style={{ flex: 1 }}>Details</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Credit info */}
      <div style={{ padding: "16px 20px 12px" }}>
        <Card className="fade-up delay-4" style={{ padding: 18, background: `linear-gradient(135deg, #F8F7FF, #F0EDFF)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora" }}>Available Credit</p>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: C.primary, margin: "4px 0 2px" }}>₦25,000</p>
              <p style={{ fontSize: 11, color: C.textSub, fontFamily: "Sora" }}>Phase 1 limit · Max 30 days tenor</p>
            </div>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.primaryLight, border: `3px solid ${C.primary}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="star" s={22} c={C.primary} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: APPLY LOAN
═══════════════════════════════════════════════════════════ */
const ApplyScreen = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("15000");
  const [tenor, setTenor] = useState("30");
  const [purpose, setPurpose] = useState("Personal");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loanStatus, setLoanStatus] = useState("submitted");

  const steps = ["Amount", "Terms", "Submit"];
  const purposes = ["Personal", "Business", "Education", "Medical", "Emergency"];
  const dailyRate = 0.002;
  const interest = Math.round(parseFloat(amount || 0) * dailyRate * parseFloat(tenor || 0));
  const total = parseInt(amount || 0) + interest;
  const fee = 500;

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      let seq = ["submitted", "bureau_pending", "scoring", "pending_review"];
      seq.forEach((s, i) => setTimeout(() => setLoanStatus(s), i * 1200));
    }, 1800);
  };

  const statusLabel = { submitted: "Submitted", bureau_pending: "Bureau Check", scoring: "Scoring", pending_review: "Pending Review" };
  const statusColor = { submitted: C.primary, bureau_pending: C.warning, scoring: C.warning, pending_review: C.gold };

  if (submitted) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, padding: 24 }}>
        <div className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Icon n="clock" s={32} c={C.primary} />
          </div>
          <Badge color={statusColor[loanStatus]} dot>{statusLabel[loanStatus]}</Badge>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, margin: "16px 0 8px" }}>Application submitted</h2>
          <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.7, maxWidth: 280, marginBottom: 28 }}>
            Your application is being processed. We never promise instant approval — a human will review your file.
          </p>

          {/* Timeline */}
          <Card style={{ padding: 20, width: "100%", textAlign: "left", marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.textSub, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora", marginBottom: 14 }}>Application timeline</p>
            {[
              { label: "Submitted", done: ["submitted", "bureau_pending", "scoring", "pending_review"].includes(loanStatus) },
              { label: "Bureau check", done: ["bureau_pending", "scoring", "pending_review"].includes(loanStatus) },
              { label: "Risk scoring", done: ["scoring", "pending_review"].includes(loanStatus) },
              { label: "Underwriter review", done: loanStatus === "pending_review" },
              { label: "Decision", done: false },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 4 ? 14 : 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: s.done ? C.success : C.borderLight, border: `2px solid ${s.done ? C.success : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {s.done ? <Icon n="check" s={11} c="#fff" /> : <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.border }} />}
                </div>
                <span style={{ fontSize: 13, color: s.done ? C.text : C.textMuted, fontWeight: s.done ? 600 : 400, fontFamily: "Sora" }}>{s.label}</span>
                {!s.done && i === ["submitted", "bureau_pending", "scoring", "pending_review"].indexOf(loanStatus) + 1 && (
                  <Spinner size={14} color={C.warning} />
                )}
              </div>
            ))}
          </Card>
          <Btn onClick={onDone}>Back to Home</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "20px 24px 16px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: C.text, marginBottom: 4 }}>Apply for a Loan</h2>
        <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", marginBottom: 16 }}>Phase 1: up to ₦25,000 · max 30 days</p>
        <ProgressTrack steps={steps} current={step} />
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {step === 0 && (
          <div className="fade-up">
            <Input label="Loan Amount (₦)" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} prefix="₦" hint="Min ₦1,000 · Max ₦25,000" error={parseFloat(amount) > 25000 ? "Maximum loan is ₦25,000" : ""} />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora" }}>Tenor (days)</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["7", "14", "21", "30"].map(d => (
                  <div key={d} onClick={() => setTenor(d)} style={{
                    flex: 1, padding: "11px 6px", textAlign: "center", borderRadius: 12,
                    border: `1.5px solid ${tenor === d ? C.primary : C.border}`,
                    background: tenor === d ? C.primaryLight : C.surface,
                    color: tenor === d ? C.primary : C.textSub, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "Sora", transition: "all 0.2s",
                  }}>{d}d</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora" }}>Purpose</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {purposes.map(p => (
                  <div key={p} onClick={() => setPurpose(p)} style={{
                    padding: "8px 14px", borderRadius: 20, fontSize: 13, fontFamily: "Sora", fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
                    border: `1.5px solid ${purpose === p ? C.primary : C.border}`,
                    background: purpose === p ? C.primaryLight : C.surface,
                    color: purpose === p ? C.primary : C.textSub,
                  }}>{p}</div>
                ))}
              </div>
            </div>

            <Btn onClick={() => setStep(1)} disabled={!amount || parseFloat(amount) < 1000 || parseFloat(amount) > 25000}>Review Terms</Btn>
          </div>
        )}

        {step === 1 && (
          <div className="fade-up">
            <Card style={{ padding: 20, marginBottom: 20, background: C.accentLight, border: `1px solid ${C.accent}30` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora", marginBottom: 14 }}>Read carefully before proceeding</p>
              {[
                ["Loan Amount", `₦${parseFloat(amount).toLocaleString()}`],
                ["Tenor", `${tenor} days`],
                ["Daily Rate", "0.2% per day"],
                ["Interest", `₦${interest.toLocaleString()}`],
                ["Processing Fee", `₦${fee.toLocaleString()}`],
                ["Total Repayable", `₦${(total + fee).toLocaleString()}`],
                ["Due Date", `May ${10 + parseInt(tenor)}, 2025`],
                ["Late Penalty", "1% per overdue day"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, fontFamily: "Sora" }}>
                  <span style={{ color: C.textSub }}>{k}</span>
                  <span style={{ fontWeight: k === "Total Repayable" ? 800 : 700, color: k === "Total Repayable" ? C.text : C.textSub, fontSize: k === "Total Repayable" ? 15 : 13 }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 16, marginBottom: 20, background: C.dangerLight, border: `1px solid ${C.danger}20` }}>
              <div style={{ display: "flex", gap: 10 }}>
                <Icon n="warn" s={16} c={C.danger} />
                <p style={{ fontSize: 12, color: C.danger, fontFamily: "Sora", lineHeight: 1.7 }}>Missing a repayment incurs <strong>1% daily penalty</strong> and may be reported to credit bureaus. There are no hidden fees beyond what is shown.</p>
              </div>
            </Card>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="ghost" onClick={() => setStep(0)} style={{ flex: 1 }}>Edit</Btn>
              <Btn onClick={() => setStep(2)} style={{ flex: 2 }}>Accept Terms</Btn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-up">
            <Card style={{ padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14, fontFamily: "Sora" }}>Confirm & Submit</p>
              {[["Amount", `₦${parseFloat(amount).toLocaleString()}`], ["Total Repayable", `₦${(total + fee).toLocaleString()}`], ["Due", `May ${10 + parseInt(tenor)}, 2025`]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, fontFamily: "Sora" }}>
                  <span style={{ color: C.textSub }}>{k}</span>
                  <span style={{ fontWeight: 700, color: C.text }}>{v}</span>
                </div>
              ))}
            </Card>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 24 }}>
              <div onClick={() => setAgreed(!agreed)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${agreed ? C.primary : C.border}`, background: agreed ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.2s" }}>
                {agreed && <Icon n="check" s={11} c="#fff" />}
              </div>
              <span style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.6 }}>
                I confirm I have read and understood the loan terms, fees, and penalties shown above.
              </span>
            </label>

            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</Btn>
              <Btn loading={submitting} disabled={!agreed} onClick={submit} style={{ flex: 2 }}>Submit Application</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: LOANS LIST + AGREEMENT
═══════════════════════════════════════════════════════════ */
const LoansScreen = ({ onNav }) => {
  const [showAgreement, setShowAgreement] = useState(false);
  const [eSigned, setESigned] = useState(false);
  const [signing, setSigning] = useState(false);

  const sign = () => {
    setSigning(true);
    setTimeout(() => { setSigning(false); setESigned(true); }, 1500);
  };

  if (showAgreement) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
        <div style={{ padding: "20px 24px 16px", background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 14, alignItems: "center" }}>
          <div onClick={() => setShowAgreement(false)} style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon n="chevL" s={16} c={C.text} />
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: C.text }}>Loan Agreement</h2>
        </div>
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          <Card style={{ padding: 16, marginBottom: 16, background: C.primaryLight }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Icon n="doc" s={16} c={C.primary} />
              <p style={{ fontSize: 13, color: C.primary, fontFamily: "Sora", fontWeight: 600 }}>Agreement #NEX-2025-00487</p>
            </div>
          </Card>

          <Card style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.8 }}>
              This Loan Agreement ("Agreement") is entered into on <strong>May 7, 2025</strong> between <strong>NexCredit Ltd</strong> ("Lender") and <strong>Chidi Okeke</strong> ("Borrower").<br /><br />
              The Lender agrees to disburse <strong>₦15,000</strong> to the Borrower's linked GTBank account ending <strong>••78</strong>. The Borrower agrees to repay <strong>₦15,900</strong> (principal + interest + processing fee) by <strong>June 6, 2025</strong>.<br /><br />
              Late payment: 1% per calendar day on outstanding. The Borrower acknowledges these terms were shown prior to submission and signing.
            </p>
          </Card>

          <Btn variant="ghost" style={{ marginBottom: 16 }} icon={<Icon n="eye" s={15} c={C.primary} />}>
            <span style={{ color: C.primary }}>View Full Agreement PDF</span>
          </Btn>

          {!eSigned ? (
            <>
              <Card style={{ padding: 16, marginBottom: 20, background: C.dangerLight, border: `1px solid ${C.danger}20` }}>
                <p style={{ fontSize: 12, color: C.danger, fontFamily: "Sora", lineHeight: 1.6 }}>
                  You must read the full agreement above before signing. By signing, you accept all terms including repayment obligations and late penalties.
                </p>
              </Card>
              <Btn loading={signing} onClick={sign} icon={!signing && <Icon n="check" s={16} c="#fff" />}>I agree & Sign</Btn>
            </>
          ) : (
            <div className="scale-in" style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.successLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Icon n="check" s={24} c={C.success} />
              </div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 6 }}>Agreement signed</p>
              <Badge color={C.success} dot>E-Signed · May 7, 2025</Badge>
              <div style={{ marginTop: 24 }}>
                <Btn onClick={() => setShowAgreement(false)}>Track Disbursement</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const loans = [
    { id: "NEX-0487", name: "Personal Loan", amount: "₦15,000", total: "₦15,900", status: "Approved", statusColor: C.success, due: "Jun 6, 2025", progress: 0, needsSign: true },
    { id: "NEX-0391", name: "Emergency Loan", amount: "₦8,000", total: "₦8,400", status: "Fully Repaid", statusColor: C.gold, due: "Completed", progress: 100, needsSign: false },
    { id: "NEX-0310", name: "Personal Loan", amount: "₦5,000", total: "₦5,200", status: "Rejected", statusColor: C.danger, due: "—", progress: 0, needsSign: false },
  ];

  return (
    <div style={{ flex: 1, background: C.bg, padding: 24 }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: C.text, marginBottom: 4 }}>My Loans</h2>
      <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", marginBottom: 24 }}>Your full loan history</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {loans.map((l, i) => (
          <Card key={l.id} className={`fade-up delay-${i + 1}`} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "Sora", marginBottom: 3 }}>{l.name}</p>
                <p style={{ fontSize: 11, color: C.textMuted, fontFamily: "Sora" }}>Ref: {l.id}</p>
              </div>
              <Badge color={l.statusColor} dot>{l.status}</Badge>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: l.progress > 0 ? 10 : 14, fontSize: 13, fontFamily: "Sora" }}>
              <span style={{ color: C.textSub }}>Principal: <strong style={{ color: C.text }}>{l.amount}</strong></span>
              <span style={{ color: C.textSub }}>Total: <strong style={{ color: C.text }}>{l.total}</strong></span>
            </div>
            {l.progress > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ height: 5, background: C.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ width: `${l.progress}%`, height: "100%", background: `linear-gradient(90deg, ${C.success}, #1FC88A)`, borderRadius: 10 }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontFamily: "Sora" }}>Due: {l.due}</span>
              {l.needsSign && (
                <div onClick={() => setShowAgreement(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.primaryLight, padding: "7px 12px", borderRadius: 20, cursor: "pointer" }}>
                  <Icon n="doc" s={13} c={C.primary} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: "Sora" }}>Sign Agreement</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <Btn variant="outline" onClick={() => onNav("apply")} icon={<Icon n="apply" s={15} c={C.primary} />}>Apply for New Loan</Btn>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: REPAY
═══════════════════════════════════════════════════════════ */
const RepayScreen = () => {
  const [amount, setAmount] = useState("15900");
  const [method, setMethod] = useState("bank");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  const [disburseStatus, setDisburseStatus] = useState("pending");

  useEffect(() => {
    setDisbursing(true);
    const t = setTimeout(() => { setDisburseStatus("disbursed"); setDisbursing(false); }, 3000);
    return () => clearTimeout(t);
  }, []);

  const pay = () => {
    setPaying(true);
    setTimeout(() => { setPaying(false); setDone(true); }, 2000);
  };

  if (done) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, background: C.bg }}>
        <div className="scale-in" style={{ textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.successLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Icon n="check" s={36} c={C.success} />
          </div>
          <Badge color={C.success} dot>Payment Successful</Badge>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, margin: "14px 0 8px" }}>₦{parseFloat(amount).toLocaleString()} paid</h2>
          <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.6, marginBottom: 28 }}>Your loan has been fully repaid. Your credit tier will be reviewed in 24 hours.</p>
          <Card style={{ padding: 18, textAlign: "left", width: "100%", marginBottom: 24 }}>
            {[["Reference", `TXN-${Date.now().toString().slice(-8)}`], ["Amount", `₦${parseFloat(amount).toLocaleString()}`], ["Date", "May 7, 2025 · 14:32"], ["Status", "Confirmed"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, fontFamily: "Sora" }}>
                <span style={{ color: C.textSub }}>{k}</span>
                <span style={{ fontWeight: 700, color: k === "Status" ? C.success : C.text }}>{v}</span>
              </div>
            ))}
          </Card>
          <Btn onClick={() => setDone(false)}>Done</Btn>
        </div>
      </div>
    );
  }

  const methods = [
    { id: "bank", label: "Virtual Account", sub: "Monnify · GTBank 0123456789", icon: "🏦" },
    { id: "card", label: "Debit Card", sub: "Paystack · **** 4521", icon: "💳" },
    { id: "ussd", label: "USSD", sub: "*737# (GTBank)", icon: "📱" },
  ];

  return (
    <div style={{ flex: 1, background: C.bg, padding: 24 }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: C.text, marginBottom: 4 }}>Repay Loan</h2>
      <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", marginBottom: 20 }}>Stay ahead of your due date</p>

      {/* Disbursement status */}
      <Card className="fade-up" style={{ padding: 16, marginBottom: 16, background: disburseStatus === "disbursed" ? C.successLight : C.primaryLight, border: `1px solid ${disburseStatus === "disbursed" ? C.success : C.primary}20` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {disbursing ? <Spinner size={16} color={C.primary} /> : <Icon n="check" s={16} c={C.success} />}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: disburseStatus === "disbursed" ? C.success : C.primary, fontFamily: "Sora" }}>
              {disburseStatus === "disbursed" ? "Disbursed · GTBank ••78" : "Disbursement pending…"}
            </p>
            {disburseStatus === "disbursed" && <p style={{ fontSize: 11, color: C.textSub, fontFamily: "Sora" }}>Ref: DIS-20250507-00487 · May 7, 2025 11:14</p>}
          </div>
        </div>
      </Card>

      {/* Overdue banner */}
      <Card className="fade-up delay-1" style={{ padding: 16, marginBottom: 20, background: C.warningLight, border: `1px solid ${C.warning}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora" }}>Due June 6, 2025</p>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: C.text, margin: "4px 0" }}>₦15,900</p>
            <p style={{ fontSize: 12, color: C.textSub, fontFamily: "Sora" }}>₦15,000 principal + ₦900 interest & fees</p>
          </div>
          <Badge color={C.success} dot>On time</Badge>
        </div>
      </Card>

      <Input label="Amount to Pay (₦)" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} prefix="₦" hint="Partial payment allowed" />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, marginTop: -6 }}>
        {[["Min due", "15900"], ["Full balance", "15900"]].map(([l, v]) => (
          <div key={l} onClick={() => setAmount(v)} style={{ flex: 1, padding: "8px 10px", background: amount === v ? C.primaryLight : C.surface, border: `1.5px solid ${amount === v ? C.primary : C.border}`, borderRadius: 10, textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}>
            <p style={{ fontSize: 10, color: amount === v ? C.primary : C.textMuted, fontFamily: "Sora", fontWeight: 600, textTransform: "uppercase" }}>{l}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: amount === v ? C.primary : C.text, fontFamily: "Sora" }}>₦{parseFloat(v).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora", marginBottom: 10 }}>Payment Method</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {methods.map(m => (
          <div key={m.id} onClick={() => setMethod(m.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: C.surface, borderRadius: 14, border: `1.5px solid ${method === m.id ? C.primary : C.border}`, cursor: "pointer", transition: "border-color 0.2s" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 22 }}>{m.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "Sora" }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.textMuted, fontFamily: "Sora" }}>{m.sub}</p>
              </div>
            </div>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${method === m.id ? C.primary : C.border}`, background: method === m.id ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
              {method === m.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
            </div>
          </div>
        ))}
      </div>

      <Btn loading={paying} onClick={pay} variant="accent" icon={!paying && <Icon n="check" s={16} c="#fff" />}>
        Pay ₦{parseFloat(amount || 0).toLocaleString()}
      </Btn>
      <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 12, fontFamily: "Sora" }}>Need help? <span style={{ color: C.primary, fontWeight: 600, cursor: "pointer" }}>Contact support</span></p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCREEN: OVERDUE
═══════════════════════════════════════════════════════════ */
const OverdueScreen = ({ onPay }) => (
  <div style={{ flex: 1, background: C.bg, padding: 24 }}>
    <div className="fade-in" style={{ background: `linear-gradient(135deg, #FEF2F2, #FFF5F5)`, borderRadius: 20, padding: 24, border: `1.5px solid ${C.danger}30`, marginBottom: 20, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.dangerLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Icon n="warn" s={26} c={C.danger} />
      </div>
      <Badge color={C.danger} dot>3 Days Overdue</Badge>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: C.danger, margin: "12px 0 6px" }}>₦16,350 due</h2>
      <p style={{ fontSize: 13, color: C.textSub, fontFamily: "Sora", lineHeight: 1.7 }}>
        Original: ₦15,900 + ₦450 penalty (3 × 1%/day).<br />Penalties grow daily until paid.
      </p>
    </div>

    <Card style={{ padding: 20, marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, fontFamily: "Sora" }}>What happens next?</p>
      {[
        { icon: "clock", label: "Day 1–7", detail: "Daily 1% penalty. We'll try to reach you." },
        { icon: "warn", label: "Day 8–30", detail: "Reported to CRC & First Central credit bureaus." },
        { icon: "shield", label: "Day 30+", detail: "Debt may be referred to collections." },
      ].map(r => (
        <div key={r.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <Icon n={r.icon} s={16} c={C.danger} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "Sora" }}>{r.label}</p>
            <p style={{ fontSize: 12, color: C.textSub, fontFamily: "Sora" }}>{r.detail}</p>
          </div>
        </div>
      ))}
    </Card>

    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Btn variant="accent" onClick={onPay} icon={<Icon n="repay" s={15} c="#fff" />}>Pay ₦16,350 now</Btn>
      <Btn variant="ghost" icon={<Icon n="phone" s={15} c={C.textSub} />}>Need help? Contact support</Btn>
    </div>
    <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 14, fontFamily: "Sora", lineHeight: 1.6 }}>
      We do not contact third parties or access your contacts. All communication is through registered channels only.
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   SCREEN: PROFILE
═══════════════════════════════════════════════════════════ */
const ProfileScreen = ({ onLogout }) => {
  const sections = [
    { title: "Account", items: [{ icon: "profile", label: "Personal Information", sub: "Read-only · KYC verified" }, { icon: "shield", label: "KYC Status", sub: "Verified · BVN + Selfie", badge: { label: "Verified", color: C.success } }, { icon: "bank", label: "Bank Connections", sub: "GTBank ••78 · Linked via Mono" }] },
    { title: "Repayment", items: [{ icon: "loans", label: "Repayment Methods", sub: "Monnify virtual account" }, { icon: "doc", label: "Loan Documents", sub: "Agreements, statements" }] },
    { title: "Preferences", items: [{ icon: "bell", label: "Notifications", sub: "SMS & in-app enabled" }, { icon: "settings", label: "App Settings", sub: "Theme, language" }] },
    { title: "Legal", items: [{ icon: "doc", label: "Terms & Conditions" }, { icon: "shield", label: "Privacy Policy" }, { icon: "info", label: "NDPC Data Rights" }] },
  ];

  return (
    <div style={{ background: C.bg, padding: 24 }}>
      {/* Avatar */}
      <div className="fade-up" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 60, height: 60, borderRadius: 20, background: `linear-gradient(135deg, ${C.gradA}, #6B3AC0)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#fff" }}>C</span>
        </div>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: C.text, marginBottom: 4 }}>Chidi Okeke</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge color={C.success} dot>Verified</Badge>
            <Badge color={C.gold}>Tier 2</Badge>
          </div>
        </div>
      </div>

      {sections.map(sec => (
        <div key={sec.title} className="fade-up" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "Sora", margin: "0 0 10px" }}>{sec.title}</p>
          <Card>
            {sec.items.map((item, i) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < sec.items.length - 1 ? `1px solid ${C.borderLight}` : "none", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon n={item.icon} s={15} c={C.primary} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "Sora" }}>{item.label}</p>
                    {item.sub && <p style={{ margin: 0, fontSize: 11, color: C.textMuted, fontFamily: "Sora" }}>{item.sub}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {item.badge && <Badge color={item.badge.color} dot>{item.badge.label}</Badge>}
                  <Icon n="chevR" s={14} c={C.textMuted} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}

      <Btn variant="danger" onClick={onLogout} icon={<Icon n="logout" s={15} c={C.danger} />} style={{ marginTop: 8 }}>Sign Out</Btn>
      <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 16, fontFamily: "Sora" }}>NexCredit v1.0.0 · Borrower portal</p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════════════════ */
const NavBar = ({ page, onNav }) => {
  const items = [
    { id: "home", label: "Home", icon: "home" },
    { id: "loans", label: "Loans", icon: "loans" },
    { id: "apply", label: "Apply", icon: "apply" },
    { id: "repay", label: "Repay", icon: "repay" },
    { id: "profile", label: "Profile", icon: "profile" },
  ];
  return (
    <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, height: 70, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px 6px", zIndex: 200, boxShadow: "0 -4px 20px rgba(45,27,105,0.08)", flexShrink: 0 }}>
      {items.map(n => (
        <div key={n.id} onClick={() => onNav(n.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 14px", borderRadius: 14, cursor: "pointer", transition: "all 0.2s", background: page === n.id ? C.primaryLight : "transparent", minWidth: 52 }}>
          {n.id === "apply" ? (
            <div style={{ width: 40, height: 40, borderRadius: 14, background: page === n.id ? C.primary : `linear-gradient(135deg, ${C.gradA}, #6B3AC0)`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -20, boxShadow: "0 4px 14px rgba(45,27,105,0.3)", transition: "all 0.2s" }}>
              <Icon n="apply" s={18} c="#fff" />
            </div>
          ) : (
            <Icon n={n.icon} s={20} c={page === n.id ? C.primary : C.textMuted} />
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: page === n.id ? C.primary : C.textMuted, fontFamily: "Sora", letterSpacing: 0.2, marginTop: n.id === "apply" ? 6 : 0 }}>{n.label}</span>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [flow, setFlow] = useState("splash"); // splash | login | onboarding | kyc | bank | app
  const [page, setPage] = useState("home");
  const [loanState, setLoanState] = useState("active"); // none | active | overdue

  const nav = (p) => setPage(p);

  const renderAppPage = () => {
    switch (page) {
      case "home": return <HomeScreen onNav={nav} loanState={loanState} />;
      case "loans": return <LoansScreen onNav={nav} />;
      case "apply": return <ApplyScreen onDone={() => { setLoanState("active"); setPage("home"); }} />;
      case "repay": return loanState === "overdue" ? <OverdueScreen onPay={() => setPage("repay_pay")} /> : <RepayScreen />;
      case "repay_pay": return <RepayScreen />;
      case "profile": return <ProfileScreen onLogout={() => setFlow("login")} />;
      default: return <HomeScreen onNav={nav} loanState={loanState} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E8E3DC", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Sora" }}>
      <style>{G}</style>
      {/* Phone shell */}
      <div style={{ width: 390, maxHeight: "92vh", background: C.bg, borderRadius: 44, overflow: "hidden", boxShadow: "0 30px 80px rgba(45,27,105,0.22), 0 8px 32px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,255,255,0.6)", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Status bar */}
        <div style={{ height: 44, background: flow === "splash" ? "transparent" : flow === "login" ? C.gradA : C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, transition: "background 0.3s", zIndex: 10, borderBottom: flow !== "splash" && flow !== "login" ? `1px solid ${C.borderLight}` : "none" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: flow === "splash" || flow === "login" ? "rgba(255,255,255,0.9)" : C.text, fontFamily: "Sora" }}>9:41</span>
          <div style={{ fontSize: 11, color: flow === "splash" || flow === "login" ? "rgba(255,255,255,0.8)" : C.textSub, fontFamily: "Sora", display: "flex", gap: 6 }}>
            <span>●●●●</span><span>5G</span><span>100%</span>
          </div>
        </div>

        {/* Screen */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {flow === "splash" && <SplashScreen onDone={() => setFlow("login")} />}
          {flow === "login" && <LoginScreen onLogin={() => setFlow("onboarding")} />}
          {flow === "onboarding" && <OnboardingScreen onDone={() => setFlow("kyc")} />}
          {flow === "kyc" && <KYCScreen onDone={() => setFlow("bank")} />}
          {flow === "bank" && <BankLinkScreen onDone={() => setFlow("app")} />}
          {flow === "app" && renderAppPage()}
        </div>

        {/* Nav bar — only in app */}
        {flow === "app" && <NavBar page={page} onNav={nav} />}

        {/* Dev flow switcher — small pill at bottom */}
        <div style={{ position: "absolute", bottom: flow === "app" ? 78 : 14, right: 12, display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 160, zIndex: 300 }}>
          {[
            { label: "🌐 Login", f: "login" },
            { label: "📋 Terms", f: "onboarding" },
            { label: "🪪 KYC", f: "kyc" },
            { label: "🏦 Bank", f: "bank" },
            { label: "🏠 Home", f: "app", p: "home" },
            { label: "💸 Apply", f: "app", p: "apply" },
            { label: "📄 Loans", f: "app", p: "loans" },
            { label: "⚠️ Overdue", f: "app", p: "repay", l: "overdue" },
            { label: "👤 Profile", f: "app", p: "profile" },
          ].map(x => (
            <div key={x.label} onClick={() => { setFlow(x.f); if (x.p) setPage(x.p); if (x.l) setLoanState(x.l); else if (x.f === "app") setLoanState("active"); }} style={{ background: "rgba(45,27,105,0.85)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 9, padding: "4px 7px", borderRadius: 8, cursor: "pointer", fontFamily: "Sora", fontWeight: 600, letterSpacing: 0.2, whiteSpace: "nowrap" }}>{x.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
