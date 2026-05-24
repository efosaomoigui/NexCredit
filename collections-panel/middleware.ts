import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set<string>(["/login"]);
const ALLOWED_ROLES = new Set<string>(["agent", "admin", "superadmin"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const verifyPromise = (async () => {
    try {
      const { verifySessionToken } = await import("./src/lib/auth");
      const payload = await verifySessionToken(token);
      const role = payload.role ?? "";
      if (!ALLOWED_ROLES.has(role)) throw new Error("forbidden");
      return NextResponse.next();
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  })();

  return verifyPromise;
}

export const config = {
  matcher: ["/((?!api).*)"],
};
