import { NextResponse } from "next/server";

function getTokenCookie(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.slice("token=".length);
}

export async function PATCH(req: Request) {
  const token = getTokenCookie(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing token", field: null } },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as any;
  if (!body?.id) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Product id is required", field: "id" } },
      { status: 400 },
    );
  }

  try {
    const { id, ...payload } = body;
    const baseUrl = process.env.LENDING_ENGINE_URL ?? "http://lending_engine:8000/api/v1";
    const resp = await fetch(`${baseUrl}/admin/products/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${decodeURIComponent(token)}`,
      },
      body: JSON.stringify(payload),
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
