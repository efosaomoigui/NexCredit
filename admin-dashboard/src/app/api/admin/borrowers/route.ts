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

  const baseUrl = process.env.IDENTITY_ENGINE_URL ?? "http://localhost:8001/api/v1";
  const resp = await fetch(`${baseUrl}/admin/borrowers`, {
    headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
    cache: "no-store",
  });

  const json = (await resp.json().catch(() => null)) as any;
  return NextResponse.json(
    json ?? { success: false, error: { code: "UPSTREAM_ERROR", message: "Upstream error", field: null } },
    { status: resp.status },
  );
}

