import { NextResponse } from "next/server";
import { apiRoute } from "@/server/http";
import { loginSchema } from "@/server/services/validation";
import { login } from "@/server/services/auth";
import { sessionCookie } from "@/server/auth/session";

export const POST = apiRoute({ auth: "public", body: loginSchema }, async ({ body, ipHash, req }) => {
  const { user, session } = await login(body, { ipHash, userAgent: req.headers.get("user-agent") ?? undefined });
  const res = NextResponse.json({ user: { id: user.id, email: user.email, kind: user.kind }, redirectTo: user.kind === "STAFF" ? "/admin" : "/" });
  res.cookies.set(sessionCookie(session.token, session.expiresAt));
  return res;
});
