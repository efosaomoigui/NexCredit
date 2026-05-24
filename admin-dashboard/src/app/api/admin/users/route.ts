import { NextResponse } from "next/server";

function getTokenCookie(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.slice("token=".length);
}

export async function GET(req: Request) {
  const token = getTokenCookie(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing token", field: null } },
      { status: 401 },
    );
  }

  const baseUrl = process.env.IDENTITY_ENGINE_URL ?? "http://identity_engine:8000/api/v1";
  try {
    const resp = await fetch(`${baseUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
      cache: "no-store",
    });

    if (!resp.ok) {
      console.error(`Identity Engine error: ${resp.status} ${resp.statusText} at ${baseUrl}/admin/users`);
    }

    const json = (await resp.json().catch(() => null)) as any;
    return NextResponse.json(json ?? { success: false, error: { code: "UPSTREAM_ERROR", message: "Upstream error", field: null } }, { status: resp.status });
  } catch (err: any) {
    console.error(`Fetch error to ${baseUrl}/admin/users:`, err.message);
    return NextResponse.json({ success: false, error: { code: "CONNECTION_FAILED", message: `Could not connect to Identity Engine at ${baseUrl}`, field: null } }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const token = getTokenCookie(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing token", field: null } },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body", field: null } },
      { status: 400 },
    );
  }

  const baseUrl = process.env.IDENTITY_ENGINE_URL ?? "http://localhost:8001/api/v1";
  const resp = await fetch(`${baseUrl}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${decodeURIComponent(token)}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await resp.json().catch(() => null)) as any;
  return NextResponse.json(json ?? { success: false, error: { code: "UPSTREAM_ERROR", message: "Upstream error", field: null } }, { status: resp.status });
}

