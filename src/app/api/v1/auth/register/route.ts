import { NextResponse } from "next/server";
import { apiRoute } from "@/server/http";
import { registerSchema } from "@/server/services/validation";
import { register } from "@/server/services/auth";
import { sessionCookie } from "@/server/auth/session";

export const POST = apiRoute({ auth: "public", body: registerSchema }, async ({ body, ipHash, req }) => {
  const { user, session } = await register(body, { ipHash, userAgent: req.headers.get("user-agent") ?? undefined });
  const res = NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  res.cookies.set(sessionCookie(session.token, session.expiresAt));
  return res;
});
