import { apiRoute } from "@/server/http";
import { resetSchema } from "@/server/services/validation";
import { resetPassword } from "@/server/services/auth";

export const POST = apiRoute({ auth: "public", body: resetSchema }, async ({ body, ipHash }) => {
  await resetPassword(body.token, body.password, { ipHash });
  return { ok: true };
});
