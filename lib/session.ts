import { cookies } from "next/headers";
export const ANON_USER_COOKIE = "young_entrepreneurs_user_id";
export const HANDLE_COOKIE = "young_entrepreneurs_handle";
export const anonymousCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 };
export async function getAnonymousSessionUserId() { return (await cookies()).get(ANON_USER_COOKIE)?.value; }
export async function getAuthenticatedSessionUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(ANON_USER_COOKIE)?.value && cookieStore.get(HANDLE_COOKIE)?.value
    ? cookieStore.get(ANON_USER_COOKIE)?.value
    : undefined;
}
