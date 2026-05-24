import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { email?: string; password?: string };
  const email = body?.email?.trim() ?? "";
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Email and password are required", field: null } },
      { status: 400 },
    );
  }

  const baseUrl = process.env.IDENTITY_ENGINE_URL ?? "http://identity_engine:8000/api/v1";
  const resp = await fetch(`${baseUrl}/auth/staff/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const json = (await resp.json().catch(() => null)) as any;
  if (!resp.ok || !json?.success) {
    return NextResponse.json(
      json ?? { success: false, error: { code: "LOGIN_FAILED", message: "Login failed", field: null } },
      { status: resp.status || 401 },
    );
  }

  const token = json.data?.access_token as string | undefined;
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "LOGIN_FAILED", message: "Missing access token", field: null } },
      { status: 502 },
    );
  }

  const res = NextResponse.json({
    success: true,
    data: { user: json.data?.user },
    message: "Operation successful",
  });
  res.cookies.set("token", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
