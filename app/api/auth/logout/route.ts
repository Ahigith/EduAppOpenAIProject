import { NextResponse } from "next/server";

import { ANON_USER_COOKIE, anonymousCookieOptions, HANDLE_COOKIE } from "../../../../lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ANON_USER_COOKIE, "", { ...anonymousCookieOptions, maxAge: 0 });
  response.cookies.set(HANDLE_COOKIE, "", { ...anonymousCookieOptions, maxAge: 0 });
  return response;
}
