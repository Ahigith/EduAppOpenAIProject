import { NextResponse } from "next/server";

import { getOrCreateUserByHandle } from "../../../../lib/db";
import { ANON_USER_COOKIE, anonymousCookieOptions } from "../../../../lib/session";

export const runtime = "nodejs";

type LoginDependencies = {
  getOrCreateUser: typeof getOrCreateUserByHandle;
};

const defaultDependencies: LoginDependencies = { getOrCreateUser: getOrCreateUserByHandle };

function normalizeHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const handle = value.trim();
  return /^[a-zA-Z0-9_-]{2,32}$/.test(handle) ? handle : null;
}

export function createLoginPostHandler(dependencies: LoginDependencies = defaultDependencies) {
  return async function POST(request: Request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid login request" }, { status: 400 });
    }

    const handle = normalizeHandle((body as { handle?: unknown } | null)?.handle);
    if (!handle) return NextResponse.json({ error: "Use 2–32 letters, numbers, hyphens, or underscores." }, { status: 400 });

    try {
      const { user, isNew } = await dependencies.getOrCreateUser(handle);
      const response = NextResponse.json({ userId: user.id, isNew });
      response.cookies.set(ANON_USER_COOKIE, user.id, anonymousCookieOptions);
      return response;
    } catch {
      return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 });
    }
  };
}

export const POST = createLoginPostHandler();
