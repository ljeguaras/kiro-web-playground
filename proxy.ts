import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getEncodedKey(): Uint8Array | null {
  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey) {
    return null;
  }
  return new TextEncoder().encode(secretKey);
}

async function decryptSession(session: string | undefined = "") {
  const encodedKey = getEncodedKey();
  if (!encodedKey) {
    return undefined;
  }
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as { userId: string; expiresAt: string };
  } catch {
    return undefined;
  }
}

const publicRoutes = ["/login", "/signup", "/"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = path.startsWith("/dashboard");
  const isPublicRoute = publicRoutes.includes(path);

  const encodedKey = getEncodedKey();
  if (!encodedKey) {
    // No secret configured - redirect protected routes to login
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
    return NextResponse.next();
  }

  const cookie = request.cookies.get("session")?.value;
  const session = await decryptSession(cookie);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (
    isPublicRoute &&
    session?.userId &&
    !request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
