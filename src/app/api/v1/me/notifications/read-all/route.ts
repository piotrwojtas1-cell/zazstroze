import { apiRoute } from "@/server/http";
import { markAllRead } from "@/server/services/notifications";

export const POST = apiRoute({ auth: "user" }, async ({ user }) => {
  const r = await markAllRead(user!.id);
  return { updated: r.count };
});
