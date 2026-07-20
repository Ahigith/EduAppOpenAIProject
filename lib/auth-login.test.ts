import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { createLoginPostHandler } from "../app/api/auth/login/route";
import { proxy } from "../proxy";
function request(handle: string) { return new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ handle }) }); }
test("login creates a new handle", async () => { const handler = createLoginPostHandler({ getOrCreateUser: async (handle) => ({ user: { id: "user-new", handle, created_at: "2026-07-20" }, isNew: true }) }); const response = await handler(request("judge1")); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { userId: "user-new", isNew: true }); assert.match(response.headers.get("set-cookie") ?? "", /young_entrepreneurs_user_id=user-new/); assert.match(response.headers.get("set-cookie") ?? "", /young_entrepreneurs_handle=judge1/); });
test("login returns an existing handle", async () => { const handler = createLoginPostHandler({ getOrCreateUser: async (handle) => ({ user: { id: "user-existing", handle, created_at: "2026-07-20" }, isNew: false }) }); const response = await handler(request("judge1")); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { userId: "user-existing", isNew: false }); });
test("proxy redirects map access without a complete authenticated session", () => { const response = proxy(new NextRequest("http://localhost/map", { headers: { cookie: "young_entrepreneurs_user_id=old-anonymous-user" } })); assert.equal(response.status, 307); assert.equal(response.headers.get("location"), "http://localhost/login"); });
