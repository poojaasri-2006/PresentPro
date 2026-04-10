/**
 * middleware.ts  (project root)
 * ------------------------------
 * Runs before every matching request to:
 *   1. Refresh the Supabase session cookie (keeps the user logged in).
 *   2. Redirect unauthenticated users away from protected routes.
 *
 * Protected routes: /dashboard, /practice
 * Public routes:    /, /login, /signup
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // We start with the default response and may modify it below.
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Build a Supabase client that can read/write cookies in the middleware layer.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies to both the request and the response so they propagate.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — this is required to keep the JWT alive.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Route protection ──────────────────────────────────────────
  const protectedPaths = ["/dashboard", "/practice"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    // Not logged in → send to login page
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and visiting login/signup, redirect to dashboard
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

// Only run middleware on page routes (not on _next/static, images, api routes, etc.)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
