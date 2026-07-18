import { NextResponse } from "next/server";
import { getOrCreateAnonUser } from "../../../lib/db";
import { ANON_USER_COOKIE, anonymousCookieOptions } from "../../../lib/session";
export async function GET(request: Request) { const user = await getOrCreateAnonUser(); const response = NextResponse.redirect(new URL("/", request.url)); response.cookies.set(ANON_USER_COOKIE, user.id, anonymousCookieOptions); return response; }
