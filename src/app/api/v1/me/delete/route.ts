import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/server/http";
import { deleteAccount } from "@/server/services/profile";
import { clearedSessionCookie } from "@/server/auth/session";

const schema = z.object({ password: z.string().min(1).max(128), confirm: z.literal("USUŃ", { errorMap: () => ({ message: "Wpisz USUŃ, aby potwierdzić." }) }) });

export const POST = apiRoute({ auth: "customer", body: schema }, async ({ user, body, ipHash }) => {
  await deleteAccount(user!.id, body.password, ipHash);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearedSessionCookie());
  return res;
});
