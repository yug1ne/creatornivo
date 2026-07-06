/** Публичные маршруты — доступны без авторизации */
export const publicRoutes = [
  "/",
  "/pricing",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

/** Маршруты, требующие авторизации */
export const protectedRoutes = [
  "/dashboard",
  "/templates",
  "/library",
  "/generate",
  "/settings",
] as const;

/** Маршруты только для Pro-пользователей */
export const proRoutes = [
  "/generate/advanced",
] as const;

/** Маршруты администратора */
export const adminRoutes = ["/admin"] as const;

/** Префиксы API, не требующие сессии */
export const publicApiPrefixes = [
  "/api/auth",
  "/api/health",
  "/api/stripe/webhook",
  "/api/paddle/webhook",
] as const;

export type PublicRoute = (typeof publicRoutes)[number];
export type ProtectedRoute = (typeof protectedRoutes)[number];
export type ProRoute = (typeof proRoutes)[number];
export type AdminRoute = (typeof adminRoutes)[number];

export function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isProRoute(pathname: string): boolean {
  return proRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}