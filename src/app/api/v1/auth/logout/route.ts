import { NextResponse } from "next/server";
import { apiRoute } from "@/server/http";
import { clearedSessionCookie, revokeSession, SESSION_COOKIE } from "@/server/auth/session";

export const POST = apiRoute({ auth: "public" }, async ({ req }) => {
  await revokeSession(req.cookies.get(SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearedSessionCookie());
  return res;
});
