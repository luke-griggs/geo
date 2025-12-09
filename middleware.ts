import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = ["/", "/sign-in", "/sign-up", "/onboarding"];

// Auth API routes - should always be accessible
const authApiRoutes = ["/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth API routes
  if (authApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get the session token from cookies
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  // Check if user is authenticated
  const isAuthenticated = !!sessionToken;

  // Check if current route is public
  const isPublicRoute = publicRoutes.includes(pathname);

  // If user is not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicRoute && !pathname.startsWith("/api/")) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated and on auth pages, redirect to dashboard
  if (
    isAuthenticated &&
    (pathname === "/sign-in" ||
      pathname === "/sign-up" ||
      pathname === "/onboarding")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is authenticated and on landing page, redirect to dashboard
  if (isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
