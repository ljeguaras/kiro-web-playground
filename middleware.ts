import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PATHS = ["/dashboard", "/scan", "/transactions", "/budgets", "/settings"];
const AUTH_PATHS = ["/login", "/signup"];

async function verifySession(request: NextRequest): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const sessionCookie = request.cookies.get("session");
  if (!sessionCookie?.value) return false;

  try {
    const secretKey = new TextEncoder().encode(secret);
    await jwtVerify(sessionCookie.value, secretKey);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (!isProtected && !isAuthPath) {
    return NextResponse.next();
  }

  const isAuthenticated = await verifySession(request);

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthPath && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
