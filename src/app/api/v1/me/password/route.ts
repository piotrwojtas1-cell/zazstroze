import { NextResponse } from "next/server";
import { apiRoute } from "@/server/http";
import { changePasswordSchema } from "@/server/services/validation";
import { changePassword } from "@/server/services/auth";
import { sessionCookie } from "@/server/auth/session";

export const POST = apiRoute({ auth: "user", body: changePasswordSchema }, async ({ user, body, ipHash, req }) => {
  const session = await changePassword(user!.id, body.currentPassword, body.newPassword, { ipHash, userAgent: req.headers.get("user-agent") ?? undefined });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(session.token, session.expiresAt));
  return res;
});
