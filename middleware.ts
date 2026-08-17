import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Prefix match, so "/login" also covers "/login/reset". "/" is deliberately not
// in here: every pathname starts with "/", so a startsWith check against it
// matches everything and waves the whole app through. That was the bug.
const PUBLIC_PREFIXES = ["/login", "/register", "/verify-email"];

function isPublicPath(pathname: string): boolean {
  // The landing page is public, but only as an exact match.
  if (pathname === "/") return true;

  // API routes are never redirected. They enforce their own auth and must answer
  // with a status code — tRPC returns a proper 401, which a redirect to an HTML
  // login page would replace with a response the client can't even parse.
  if (pathname.startsWith("/api/")) return true;

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Redirects signed-out visitors away from the app shell.
 *
 * This is a presentation guard, not the security boundary: it only checks that a
 * session cookie is present, never that it's valid. Real enforcement lives in
 * `protectedProcedure`, which validates the session against the database on every
 * call. Better Auth recommends exactly this split — validating here would mean a
 * database round trip on every navigation, including static asset misses.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  if (!getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    // So the user lands back where they were headed after signing in.
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
