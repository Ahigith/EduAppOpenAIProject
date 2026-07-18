import { cookies } from "next/headers";
export const ANON_USER_COOKIE = "young_entrepreneurs_user_id";
export const anonymousCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 };
export async function getAnonymousSessionUserId() { return (await cookies()).get(ANON_USER_COOKIE)?.value; }
