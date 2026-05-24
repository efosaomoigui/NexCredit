import * as SecureStore from "expo-secure-store";
import api from "./api";

export const ONBOARDING_STEP_KEY = "onboarding_step";

export type OnboardingCheckpoint =
  | "loan_intent"
  | "otp_pending"
  | "otp_verified"
  | "kyc_bvn_face"
  | "employment"
  | "consent"
  | "bank_match"
  | "eligibility"
  | "offer_ready"
  | "offer_accepted"
  | "disbursement_status"
  | "complete";

export type ResumeRouteName =
  | "LoanIntent"
  | "PhoneEntry"
  | "KYC"
  | "ProfileSetup"
  | "BankLinking"
  | "ApprovalStatus"
  | "LoanConfiguration"
  | "ReviewTerms"
  | "DisbursementStatus"
  | "Main";

const CHECKPOINT_ROUTE_MAP: Record<OnboardingCheckpoint, ResumeRouteName> = {
  loan_intent: "PhoneEntry",
  otp_pending: "PhoneEntry",
  otp_verified: "KYC",
  kyc_bvn_face: "ProfileSetup",
  employment: "ApprovalStatus",
  consent: "ApprovalStatus",
  bank_match: "ApprovalStatus",
  eligibility: "LoanConfiguration",
  offer_ready: "ReviewTerms",
  offer_accepted: "DisbursementStatus",
  disbursement_status: "DisbursementStatus",
  complete: "Main",
};

const CHECKPOINT_ORDER: OnboardingCheckpoint[] = [
  "loan_intent",
  "otp_pending",
  "otp_verified",
  "kyc_bvn_face",
  "employment",
  "consent",
  "bank_match",
  "eligibility",
  "offer_ready",
  "offer_accepted",
  "disbursement_status",
  "complete",
];

const LEGACY_MAP: Record<string, OnboardingCheckpoint> = {
  otp: "otp_pending",
  set_pin: "otp_verified",
  profile_setup: "kyc_bvn_face",
  personal_info: "kyc_bvn_face",
  employment: "employment",
  consent: "consent",
  bank_linking: "bank_match",
  review_terms: "offer_ready",
};

export async function setCheckpoint(step: OnboardingCheckpoint): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_STEP_KEY, step);
}

export async function getCheckpoint(): Promise<OnboardingCheckpoint | null> {
  const raw = await SecureStore.getItemAsync(ONBOARDING_STEP_KEY);
  if (!raw) return null;
  if (raw in CHECKPOINT_ROUTE_MAP) return raw as OnboardingCheckpoint;
  return LEGACY_MAP[raw] || null;
}

export async function getResumeRouteFromCheckpoint(): Promise<ResumeRouteName> {
  const step = await getCheckpoint();
  if (!step) return "PhoneEntry";
  return CHECKPOINT_ROUTE_MAP[step];
}

export function getResumeRouteFromStep(step: OnboardingCheckpoint): ResumeRouteName {
  return CHECKPOINT_ROUTE_MAP[step];
}

export function mapBackendWorkflowStatusToCheckpoint(status?: string | null): OnboardingCheckpoint | null {
  if (!status) return null;
  const normalized = status.toLowerCase();
  const map: Record<string, OnboardingCheckpoint> = {
    agreement_pending: "offer_ready",
    agreement_signed: "offer_accepted",
    disburse_pending: "disbursement_status",
    disbursed: "disbursement_status",
    active: "complete",
    partially_repaid: "complete",
    fully_repaid: "complete",
    overdue: "complete",
  };
  return map[normalized] || null;
}

export function isCheckpointAtOrBeyond(current: OnboardingCheckpoint, minimum: OnboardingCheckpoint): boolean {
  return CHECKPOINT_ORDER.indexOf(current) >= CHECKPOINT_ORDER.indexOf(minimum);
}

export async function getBackendCheckpoint(timeout = 8000): Promise<OnboardingCheckpoint | null> {
  try {
    const res = await api.get("/lending/loans/workflow-state", { timeout });
    if (!res.data?.success) return null;
    const raw = String(res.data?.data?.checkpoint || "");
    if (!(raw in CHECKPOINT_ROUTE_MAP)) return null;
    const checkpoint = raw as OnboardingCheckpoint;
    await setCheckpoint(checkpoint);
    return checkpoint;
  } catch {
    return null;
  }
}

export async function getAuthoritativeResumeRoute(timeout = 8000): Promise<ResumeRouteName> {
  const backendCheckpoint = await getBackendCheckpoint(timeout);
  if (backendCheckpoint) {
    return getResumeRouteFromStep(backendCheckpoint);
  }
  return getResumeRouteFromCheckpoint();
}
