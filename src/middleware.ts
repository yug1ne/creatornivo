import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import {
  isAdminRoute,
  isProRoute,
  isProtectedRoute,
  publicApiPrefixes,
} from "@/config/routes";
import { PLANS } from "@/config/plans";
import { isAdminSession } from "@/lib/admin/is-admin-session";

const { auth } = NextAuth(authConfig);
export const CANONICAL_HOST = "www.creatornivo.com";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const isAuthenticated = Boolean(session?.user);

  if (
    publicApiPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  if (
    request.nextUrl.hostname === "creatornivo.com" &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = CANONICAL_HOST;
    canonicalUrl.protocol = "https";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isProRoute(pathname) &&
    isAuthenticated &&
    session?.user?.plan !== PLANS.PRO &&
    !isAdminSession(session?.user)
  ) {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  if (isAdminRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isAdminSession(session?.user)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (
    isAuthenticated &&
    (pathname === "/login" || pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
