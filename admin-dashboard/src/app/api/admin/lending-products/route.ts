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

  try {
    const baseUrl = process.env.LENDING_ENGINE_URL ?? "http://lending_engine:8000/api/v1";
    const resp = await fetch(`${baseUrl}/admin/products/`, {
      headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
      cache: "no-store",
    });
    const json = (await resp.json().catch(() => null)) as any;
    return NextResponse.json(
      json ?? { success: false, error: { code: "UPSTREAM_ERROR", message: "Upstream error", field: null } },
      { status: resp.status },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "Lending engine unreachable. Please retry.", field: null } },
      { status: 502 },
    );
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

  const body = (await req.json().catch(() => null)) as any;
  if (!body) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body", field: null } },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    name: String(body.name || ""),
    min_amount: String(body.min_amount || ""),
    max_amount: String(body.max_amount || ""),
    min_tenor: String(body.min_tenor || ""),
    max_tenor: String(body.max_tenor || ""),
    interest_rate: String(body.interest_rate || ""),
  });
  if (body.description) params.set("description", String(body.description));

  try {
    const baseUrl = process.env.LENDING_ENGINE_URL ?? "http://lending_engine:8000/api/v1";
    const resp = await fetch(`${baseUrl}/admin/products/?${params.toString()}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
      cache: "no-store",
    });
    const json = (await resp.json().catch(() => null)) as any;
    return NextResponse.json(
      json ?? { success: false, error: { code: "UPSTREAM_ERROR", message: "Upstream error", field: null } },
      { status: resp.status },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "Lending engine unreachable. Please retry.", field: null } },
      { status: 502 },
    );
  }
}
