import { NextResponse, type NextRequest } from "next/server";

import { ANON_USER_COOKIE, HANDLE_COOKIE } from "./lib/session";

export function proxy(request: NextRequest) {
  const userId = request.cookies.get(ANON_USER_COOKIE)?.value;
  const handle = request.cookies.get(HANDLE_COOKIE)?.value;
  if (!userId || !handle) return NextResponse.redirect(new URL("/login", request.url));

  const headers = new Headers(request.headers);
  headers.set("x-user-id", userId);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/map/:path*", "/play/:path*"] };
