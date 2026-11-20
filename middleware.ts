import { NextResponse, type NextRequest } from "next/server";

/**
 * Device identity is minted at the edge so a page render never needs to write a cookie
 * (only Route Handlers and Server Actions may set cookies in Next 15).
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get("volud_guest")) {
    response.cookies.set("volud_guest", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|dishes|brand).*)"],
};
