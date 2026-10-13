import { apiRoute } from "@/server/http";
import { markRead } from "@/server/services/notifications";

export const POST = apiRoute({ auth: "user" }, async ({ user, params }) => {
  await markRead(user!.id, params.id!);
  return { ok: true };
});
