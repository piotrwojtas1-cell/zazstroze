import { apiRoute } from "@/server/http";
import { forgotSchema } from "@/server/services/validation";
import { requestPasswordReset } from "@/server/services/auth";

export const POST = apiRoute({ auth: "public", body: forgotSchema }, async ({ body, ipHash }) => {
  await requestPasswordReset(body.email, { ipHash });
  return { ok: true, message: "Jeśli konto istnieje, wysłaliśmy wiadomość z linkiem do zmiany hasła." };
});
