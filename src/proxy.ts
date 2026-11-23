import { NextResponse, type NextRequest } from "next/server";

// Sends signed-out visitors to the login screen before any page is built.
// This only checks that a session cookie exists; the back end still validates the token on every call,
// and the session guard in the app signs the user out if the cookie turns out to be stale.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has("bo_rt") || request.cookies.has("bo_at");
  const onLogin = pathname === "/login" || pathname.startsWith("/login/");

  if (!signedIn && !onLogin) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // A "reason" means we just signed them out, so show the login screen instead of bouncing them back.
  if (signedIn && onLogin && !request.nextUrl.searchParams.has("reason")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except the API routes, Next.js internals and static files.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
