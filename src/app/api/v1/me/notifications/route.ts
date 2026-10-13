import { apiRoute } from "@/server/http";
import { listNotifications } from "@/server/services/notifications";

export const GET = apiRoute({ auth: "user" }, async ({ user }) => listNotifications(user!.id));
