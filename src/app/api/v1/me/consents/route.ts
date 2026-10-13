import { apiRoute } from "@/server/http";
import { consentsSchema } from "@/server/services/validation";
import { setConsents } from "@/server/services/profile";
import { consentHistory } from "@/server/services/consents";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => ({
  history: (await consentHistory(user!.id)).map(({ ipHash: _ip, ...r }) => r),
}));

export const PUT = apiRoute({ auth: "customer", body: consentsSchema }, async ({ user, body, ipHash }) => ({
  consents: await setConsents(user!.id, body, ipHash),
}));
