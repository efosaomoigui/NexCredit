import { NextResponse } from "next/server";

function getTokenCookie(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.slice("token=".length);
}

export async function POST(
  req: Request,
  { params }: { params: { version: string; action: string } },
) {
  const token = getTokenCookie(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing token", field: null } },
      { status: 401 },
    );
  }

  const action = params.action;
  if (action !== "publish" && action !== "activate") {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid action", field: "action" } },
      { status: 400 },
    );
  }

  try {
    const baseUrl = process.env.LENDING_ENGINE_URL ?? "http://lending_engine:8000/api/v1";
    const resp = await fetch(
      `${baseUrl}/admin/pricing-policy/${encodeURIComponent(params.version)}/${action}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
        cache: "no-store",
      },
    );
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
