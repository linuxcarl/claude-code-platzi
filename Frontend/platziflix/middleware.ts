import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/profile", "/admin"];
const AUTH_ONLY = ["/login", "/register"]; // redirect away if already logged in

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value
    || req.headers.get("authorization")?.replace("Bearer ", "");

  // Check localStorage-based auth via a client cookie we can set
  const hasSession = req.cookies.get("has_session")?.value === "1";

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*"],
};
