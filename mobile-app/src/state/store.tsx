import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import api from "../lib/api";
import { getIdentityStartCandidates, getResolvedApiBaseUrl } from "../lib/api";
import { getCheckpoint, isCheckpointAtOrBeyond, mapBackendWorkflowStatusToCheckpoint, setCheckpoint } from "../lib/onboarding";

export type KycStatus = "unverified" | "pending" | "verified";
export type LoanStatus = "DRAFT" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "DISBURSED" | "ACTIVE" | "OVERDUE" | "FULLY_REPAID" | "REJECTED";

export type BorrowerProfile = {
  id: string;
  fullName: string;
  phoneOrEmail: string;
  tierLabel: string;
  creditScore: number;
  kycStatus: KycStatus;
  kycSubmittedAt?: number;
  consentAccepted: boolean;
  bankLinked: boolean;
};

export type LoanAccount = {
  id: string;
  name: string;
  principal: number;
  totalRepayable: number;
  outstanding: number;
  dueDateISO: string;
  status: LoanStatus;
};

export type DashboardData = {
  activeLoan: LoanAccount | null;
  limit: number;
  news: Array<{ title: string; body: string }>;
};

export type Transaction = {
  id: string;
  label: string;
  amount: number;
  dateLabel: string;
};

type State = {
  hydrated: boolean;
  session: { signedIn: boolean; token?: string };
  ui: { introCompleted: boolean };
  borrower: BorrowerProfile;
  dashboard: DashboardData;
  loans: LoanAccount[];
  txns: Transaction[];
};

type Action =
  | { type: "HYDRATE"; state: Omit<State, "hydrated"> }
  | { type: "SIGN_IN"; token: string; profile: any }
  | { type: "SIGN_OUT" }
  | { type: "SET_LOANS"; loans: LoanAccount[] }
  | { type: "SET_DASHBOARD"; dashboard: DashboardData }
  | { type: "REPAY"; loanId: string; amount: number }
  | { type: "SET_KYC_STATUS"; status: KycStatus }
  | { type: "SET_CONSENT"; accepted: boolean }
  | { type: "SET_BANK_LINKED"; linked: boolean }
  | { type: "SET_INTRO_COMPLETED"; completed: boolean };

const STORAGE_KEY = "nexcredit_app_state_v2";

const initialState: State = {
  hydrated: false,
  session: { signedIn: false },
  ui: { introCompleted: false },
  borrower: {
    id: "",
    fullName: "Guest",
    phoneOrEmail: "",
    tierLabel: "New Borrower",
    creditScore: 0,
    kycStatus: "unverified",
    consentAccepted: false,
    bankLinked: false,
  },
  dashboard: {
    activeLoan: null,
    limit: 0,
    news: [],
  },
  loans: [],
  txns: [],
};

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...initialState,
        ...action.state,
        ui: action.state.ui ?? { introCompleted: false },
        borrower: action.state.borrower ?? initialState.borrower,
        dashboard: action.state.dashboard ?? initialState.dashboard,
        loans: action.state.loans ?? initialState.loans,
        txns: action.state.txns ?? initialState.txns,
        session: action.state.session ?? initialState.session,
        hydrated: true,
      };
    case "SIGN_IN":
      return {
        ...state,
        session: { signedIn: true, token: action.token },
        ui: { ...state.ui, introCompleted: true },
        borrower: {
          ...state.borrower,
          id: action.profile.id,
          fullName: action.profile.full_name,
          phoneOrEmail: action.profile.phone || action.profile.email || "",
          kycStatus: action.profile.is_verified ? "verified" : "unverified",
        },
      };
    case "SIGN_OUT":
      return {
        ...initialState,
        hydrated: true,
        ui: state.ui,
        borrower: {
          ...initialState.borrower,
          consentAccepted: state.borrower.consentAccepted,
          kycStatus: state.borrower.kycStatus,
          bankLinked: state.borrower.bankLinked,
        },
      };
    case "SET_LOANS":
      return { ...state, loans: action.loans };
    case "SET_DASHBOARD":
      return { ...state, dashboard: action.dashboard };
    case "REPAY":
      return {
        ...state,
        loans: state.loans.map((loan) =>
          loan.id === action.loanId
            ? { ...loan, outstanding: Math.max(0, loan.outstanding - action.amount) }
            : loan,
        ),
      };
    case "SET_KYC_STATUS":
      return { ...state, borrower: { ...state.borrower, kycStatus: action.status } };
    case "SET_CONSENT":
      return { ...state, borrower: { ...state.borrower, consentAccepted: action.accepted } };
    case "SET_BANK_LINKED":
      return { ...state, borrower: { ...state.borrower, bankLinked: action.linked } };
    case "SET_INTRO_COMPLETED":
      return { ...state, ui: { ...state.ui, introCompleted: action.completed } };
    default:
      return state;
  }
}

type StoreApi = {
  state: State;
  actions: {
    requestOtp: (identifier: string, otpChannel: "sms" | "email" | "whatsapp") => Promise<{ sentVia: "sms" | "email" | "whatsapp"; normalizedIdentifier: string; isNewUser: boolean; debugOtp?: string }>;
    verifyOtp: (identifier: string, code: string) => Promise<{ accessToken: string; refreshToken?: string; user: any }>;
    completeSignIn: (payload: { accessToken: string; refreshToken?: string; user: any }) => Promise<void>;
    repay: (payload: { loanId: string; amount: number }) => Promise<void>;
    setConsentAccepted: (accepted: boolean) => void;
    setBankLinked: (linked: boolean) => void;
    setKycStatus: (status: KycStatus) => void;
    setIntroCompleted: (completed: boolean) => void;
    signOut: () => Promise<void>;
    fetchLoans: () => Promise<void>;
    fetchDashboard: () => Promise<void>;
    fetchEligibility: () => Promise<{ maxLimit: number; interestRate: number; processingFee: number }>;
    fetchKycStatus: () => Promise<{ canApply: boolean; steps?: Record<string, string> }>;
    submitApplication: (payload: { amount: number; tenorDays: number; purpose: string }) => Promise<string>;
    acceptOffer: (applicationId: string) => Promise<{ applicationStatus?: string }>;
    updatePersonalInfo: (payload: {
      fullName: string;
      dob: string;
      gender: string;
      address: string;
      marital: string;
      nextOfKin?: Array<{
        firstName: string;
        lastName: string;
        phone: string;
        relationship: string;
      }>;
    }) => Promise<void>;
    updateEmploymentInfo: (payload: { empType: string; employer: string; income: string; salaryDate: string }) => Promise<void>;
    verifyBankAccount: (payload: { bankCode: string; accountNumber: string; bankName: string }) => Promise<{ accountName: string }>;
  };
};

const Ctx = createContext<StoreApi | null>(null);

function isUnauthorizedError(error: any): boolean {
  return Number(error?.response?.status) === 401;
}

async function requireSessionToken(): Promise<void> {
  const token = await SecureStore.getItemAsync("token");
  if (!token) {
    throw new Error("Session expired. Please sign in again.");
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reduce, initialState);

  useEffect(() => {
    (async () => {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch({ type: "HYDRATE", state: parsed });
        if (parsed.session?.token) {
          await SecureStore.setItemAsync("token", parsed.session.token);
        }
      } else {
        dispatch({ type: "HYDRATE", state: initialState });
      }
    })();
  }, []);

  useEffect(() => {
    if (state.hydrated) {
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({
        session: state.session,
        ui: state.ui,
        borrower: state.borrower,
        loans: state.loans,
        txns: state.txns
      })).catch(() => null);
    }
  }, [state]);

  const api_actions = useMemo<StoreApi>(
    () => ({
      state,
      actions: {
        async requestOtp(identifier, otpChannel) {
          const isEmail = identifier.includes("@");
          const body = isEmail
            ? { email: identifier.trim().toLowerCase(), otp_channel: otpChannel }
            : { phone: identifier.trim(), otp_channel: otpChannel };

          let lastError: any = null;
          const candidates = getIdentityStartCandidates().slice(0, 2);
          for (const endpoint of candidates) {
            try {
              const token = await SecureStore.getItemAsync("token");
              const res = await axios.post(endpoint, body, {
                timeout: 10000,
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });
              if (res.data.success) {
                return {
                  sentVia: (res.data.data?.sent_via || otpChannel) as "sms" | "email" | "whatsapp",
                  normalizedIdentifier: (res.data.data?.identifier || identifier) as string,
                  isNewUser: Boolean(res.data.data?.is_new_user),
                  debugOtp: typeof res.data.data?.debug_otp === "string" ? res.data.data.debug_otp : undefined,
                };
              }
              lastError = new Error(res.data.error?.message || "Failed to send OTP");
            } catch (error: any) {
              lastError = error;
            }
          }

          const isNetwork = !lastError?.response;
          const isTimeout = String(lastError?.code || "").toUpperCase() === "ECONNABORTED";
          if (isTimeout) {
            throw new Error("Request timed out. Please tap Continue again.");
          }
          if (isNetwork) {
            const base = getResolvedApiBaseUrl();
            const attempted = candidates.slice(0, 2).join(" or ");
            throw new Error(
              `Unable to reach identity service from this device. ` +
              `Current API base: ${base}. ` +
              `Tried: ${attempted}. ` +
              `If using a physical phone, set EXPO_PUBLIC_API_BASE_URL to your computer LAN IP (example: http://192.168.x.x:8888/api/v1).`
            );
          }
          throw new Error(lastError?.response?.data?.error?.message || lastError?.message || "Failed to send OTP");
        },
        async verifyOtp(identifier, code) {
          const res = await api.post("/identity/auth/otp/verify", { identifier, otp_code: code }, { timeout: 10000 });
          if (res.data.success) {
            const { access_token, refresh_token, user } = res.data.data;
            return { accessToken: access_token, refreshToken: refresh_token, user };
          } else {
            throw new Error(res.data.error?.message || "OTP verification failed");
          }
        },
        async completeSignIn(payload) {
          await SecureStore.setItemAsync("token", payload.accessToken);
          if (payload.refreshToken) {
            await SecureStore.setItemAsync("refresh_token", payload.refreshToken);
          }
          dispatch({ type: "SIGN_IN", token: payload.accessToken, profile: payload.user });
        },
        async repay(payload) {
          const res = await api.post("/payment/repayments/initiate", {
            loan_id: payload.loanId,
            amount: payload.amount,
            payment_method: "bank_transfer",
          });
          if (!res.data.success) {
            throw new Error(res.data.error?.message || "Repayment initiation failed");
          }
          const mode = res.data.data?.mode;
          const reference = res.data.data?.reference;
          if (mode === "manual_fallback") {
            throw new Error(
              `Payment provider unavailable. Use reference ${reference} to complete transfer and retry confirmation shortly.`
            );
          }
          dispatch({ type: "REPAY", loanId: payload.loanId, amount: payload.amount });
        },
        setConsentAccepted(accepted) {
          dispatch({ type: "SET_CONSENT", accepted });
        },
        setBankLinked(linked) {
          dispatch({ type: "SET_BANK_LINKED", linked });
        },
        setKycStatus(status) {
          dispatch({ type: "SET_KYC_STATUS", status });
        },
        setIntroCompleted(completed) {
          dispatch({ type: "SET_INTRO_COMPLETED", completed });
        },
        async signOut() {
          await SecureStore.deleteItemAsync(STORAGE_KEY);
          await SecureStore.deleteItemAsync("token");
          await SecureStore.deleteItemAsync("refresh_token");
          dispatch({ type: "SIGN_OUT" });
        },
        async fetchLoans() {
          const res = await api.get("/lending/loans");
          if (res.data.success) {
            const mapped = res.data.data.map((l: any) => ({
              id: l.id,
              name: "Personal Loan",
              principal: l.requested_amount,
              totalRepayable: l.total_repayable,
              outstanding: l.balance,
              dueDateISO: l.due_date || "",
              status: l.status,
            }));
            dispatch({ type: "SET_LOANS", loans: mapped });
            const latestLoan = mapped[0];
            if (latestLoan?.status) {
              const derived = mapBackendWorkflowStatusToCheckpoint(String(latestLoan.status));
              if (derived) await setCheckpoint(derived);
            }
          }
        },
        async fetchDashboard() {
          const res = await api.get("/lending/user/dashboard");
          if (!res.data.success) return;
          const active = res.data.data?.active_loan;
          const mapped = active
            ? {
                id: active.id,
                name: "Personal Loan",
                principal: active.principal,
                totalRepayable: active.total_repayable,
                outstanding: active.balance,
                dueDateISO: active.due_date || "",
                status: active.status,
              }
            : null;
          dispatch({
            type: "SET_DASHBOARD",
            dashboard: {
              activeLoan: mapped,
              limit: Number(res.data.data?.limit || 0),
              news: Array.isArray(res.data.data?.news) ? res.data.data.news : [],
            },
          });
          if (active?.status) {
            const derived = mapBackendWorkflowStatusToCheckpoint(String(active.status));
            if (derived) await setCheckpoint(derived);
          }
        },
        async fetchEligibility() {
          const res = await api.get("/lending/loans/eligibility");
          if (!res.data.success) throw new Error(res.data.error?.message || "Unable to fetch eligibility");
          return {
            maxLimit: Number(res.data.data.max_limit || 0),
            interestRate: Number(res.data.data.interest_rate || 0),
            processingFee: Number(res.data.data.processing_fee || 0),
          };
        },
        async fetchKycStatus() {
          const res = await api.get("/identity/kyc/status");
          if (!res.data.success) throw new Error(res.data.error?.message || "Unable to fetch KYC status");
          return {
            canApply: Boolean(res.data.data?.can_apply),
            steps: res.data.data?.steps || {},
          };
        },
        async submitApplication(payload) {
          await requireSessionToken();
          try {
            const res = await api.post("/lending/loans/apply", {
              requested_amount: payload.amount,
              product_id: null,
              tenor: payload.tenorDays || 30,
              purpose: payload.purpose || "Personal Loan",
            }, { timeout: 15000 });
            if (res.data.success) {
              await this.fetchLoans();
              return res.data.data.id;
            }
            throw new Error(
              res.data.error?.message ||
              res.data.message ||
              "Application failed"
            );
          } catch (error: any) {
            if (isUnauthorizedError(error)) {
              throw new Error("Session expired. Please sign in again.");
            }
            const backendMessage =
              error?.response?.data?.error?.message ||
              error?.response?.data?.message ||
              null;
            if (backendMessage) {
              throw new Error(backendMessage);
            }
            throw error;
          }
        },
        async acceptOffer(applicationId) {
          await requireSessionToken();
          let res: any;
          try {
            res = await api.post(
              `/lending/loans/accept/${applicationId}`,
              { signature_payload: "User Signed", timestamp: new Date().toISOString() },
              { timeout: 15000 }
            );
          } catch (error: any) {
            if (isUnauthorizedError(error)) {
              throw new Error("Session expired. Please sign in again.");
            }
            const isTimeout = String(error?.code || "").toUpperCase() === "ECONNABORTED";
            const isNetwork = !error?.response;
            if (isTimeout || isNetwork) {
              try {
                await this.fetchLoans();
                await this.fetchDashboard();
                const checkpoint = await getCheckpoint();
                if (checkpoint && isCheckpointAtOrBeyond(checkpoint, "offer_accepted")) {
                  return { applicationStatus: "agreement_signed" };
                }
              } catch {
                // Ignore verification read failure and return retryable state below.
              }
              throw new Error("We could not confirm acceptance yet due to network instability. Please tap Accept Offer again to safely retry.");
            }
            throw new Error(error?.response?.data?.error?.message || "Failed to accept offer");
          }
          if (!res.data.success) throw new Error(res.data.error?.message || "Failed to accept offer");
          const loanId = res.data.data?.loan_id;
          if (loanId) {
            try {
              const disburse = await api.post(`/payment/disburse/${loanId}`);
              if (!disburse.data.success) {
                // Acceptance is already persisted; disbursement trigger can retry server-side.
                console.warn("disbursement_trigger_failed", disburse.data.error?.message || "unknown");
              }
            } catch (e) {
              // Network failure here should not invalidate accepted agreement state.
              console.warn("disbursement_trigger_network_error", e);
            }
          }
          await this.fetchLoans();
          await this.fetchDashboard();
          return { applicationStatus: res.data.data?.application_status };
        },
        async updatePersonalInfo(payload) {
          const res = await api.post("/identity/kyc/personal-info", payload);
          if (!res.data.success) throw new Error(res.data.error?.message || "Failed to update profile");
        },
        async updateEmploymentInfo(payload) {
          const res = await api.post("/identity/kyc/employment-info", payload);
          if (!res.data.success) throw new Error(res.data.error?.message || "Failed to update employment");
        },
        async verifyBankAccount(payload) {
          const res = await api.post("/identity/kyc/bank-account", {
            account_number: payload.accountNumber,
            bank_code: payload.bankCode,
          });
          if (!res.data.success) throw new Error(res.data.error?.message || "Bank verification failed");
          return { accountName: res.data.data.account_name };
        },
      },
    }),
    [state],
  );

  return <Ctx.Provider value={api_actions}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("StoreProvider missing");
  return ctx;
}
