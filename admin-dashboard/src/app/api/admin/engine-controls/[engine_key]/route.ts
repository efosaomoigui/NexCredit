import { NextResponse } from "next/server";

function getTokenCookie(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.slice("token=".length);
}

export async function PUT(req: Request, ctx: { params: { engine_key: string } }) {
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

  const baseUrl = process.env.IDENTITY_ENGINE_URL ?? "http://identity_engine:8000/api/v1";
  const resp = await fetch(`${baseUrl}/admin/engine-controls/${encodeURIComponent(ctx.params.engine_key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${decodeURIComponent(token)}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await resp.json().catch(() => null)) as any;
  return NextResponse.json(
    json ?? { success: false, error: { code: "UPSTREAM_ERROR", message: "Upstream error", field: null } },
    { status: resp.status },
  );
}

