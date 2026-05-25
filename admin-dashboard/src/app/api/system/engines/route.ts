import { NextResponse } from "next/server";

function getTokenCookie(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.slice("token=".length);
}

function healthUrlFromServiceUrl(serviceUrl: string) {
  const withoutApiV1 = serviceUrl.replace(/\/api\/v1\/?$/i, "");
  return `${withoutApiV1}/health`;
}

type EngineKey =
  | "identity_engine"
  | "risk_engine"
  | "lending_engine"
  | "payment_engine"
  | "collections_engine"
  | "notification_engine"
  | "ai_engine"
  | "compliance_engine"
  | "crm_engine";

const engines: Array<{ key: EngineKey; envVar: string; fallback: string }> = [
  { key: "identity_engine", envVar: "IDENTITY_ENGINE_URL", fallback: "http://identity_engine:8000/api/v1" },
  { key: "risk_engine", envVar: "RISK_ENGINE_URL", fallback: "http://risk_engine:8000/api/v1" },
  { key: "lending_engine", envVar: "LENDING_ENGINE_URL", fallback: "http://lending_engine:8000/api/v1" },
  { key: "payment_engine", envVar: "PAYMENT_ENGINE_URL", fallback: "http://payment_engine:8000/api/v1" },
  { key: "collections_engine", envVar: "COLLECTIONS_ENGINE_URL", fallback: "http://collections_engine:8000/api/v1" },
  { key: "notification_engine", envVar: "NOTIFICATION_ENGINE_URL", fallback: "http://notification_engine:8000/api/v1" },
  { key: "ai_engine", envVar: "AI_ENGINE_URL", fallback: "http://ai_engine:8000/api/v1" },
  { key: "compliance_engine", envVar: "COMPLIANCE_ENGINE_URL", fallback: "http://compliance_engine:8000/api/v1" },
  { key: "crm_engine", envVar: "CRM_ENGINE_URL", fallback: "http://crm_engine:8000/api/v1" },
];
const ENGINE_HEALTH_TIMEOUT_MS = 700;

export async function GET(req: Request) {
  const token = getTokenCookie(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing token", field: null } },
      { status: 401 },
    );
  }

  const results = await Promise.all(
    engines.map(async (e) => {
      const serviceUrl = process.env[e.envVar] ?? e.fallback;
      const url = healthUrlFromServiceUrl(serviceUrl);
      const startedAt = Date.now();
      try {
        const resp = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(ENGINE_HEALTH_TIMEOUT_MS),
        });
        const latencyMs = Date.now() - startedAt;
        const json = (await resp.json().catch(() => null)) as any;
        return {
          engine_key: e.key,
          ok: resp.ok,
          status_code: resp.status,
          latency_ms: latencyMs,
          url,
          response: json,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startedAt;
        return {
          engine_key: e.key,
          ok: false,
          status_code: 0,
          latency_ms: latencyMs,
          url,
          error: err?.message ?? "Request failed",
        };
      }
    }),
  );

  return NextResponse.json({ success: true, data: { engines: results }, message: "OK" });
}
