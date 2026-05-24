import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.slice("token=".length);

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing token", field: null } },
      { status: 401 },
    );
  }

  const baseUrl = process.env.IDENTITY_ENGINE_URL ?? "http://localhost:8001/api/v1";
  const resp = await fetch(`${baseUrl}/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${decodeURIComponent(token)}` },
    cache: "no-store",
  });

  const json = (await resp.json().catch(() => null)) as any;
  if (!resp.ok || !json?.success) {
    return NextResponse.json(
      json ?? { success: false, error: { code: "UNAUTHENTICATED", message: "Unauthenticated", field: null } },
      { status: resp.status || 401 },
    );
  }

  return NextResponse.json({ success: true, data: { user: json.data?.user }, message: "Operation successful" });
}

