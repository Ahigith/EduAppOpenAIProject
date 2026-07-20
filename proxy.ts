import { NextResponse, type NextRequest } from "next/server";

import { ANON_USER_COOKIE } from "./lib/session";

export function proxy(request: NextRequest) {
  const userId = request.cookies.get(ANON_USER_COOKIE)?.value;
  if (!userId) return NextResponse.redirect(new URL("/login", request.url));

  const headers = new Headers(request.headers);
  headers.set("x-user-id", userId);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/map/:path*", "/play/:path*"] };
