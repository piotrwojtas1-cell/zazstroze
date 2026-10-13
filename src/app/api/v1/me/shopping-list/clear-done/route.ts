import { apiRoute } from "@/server/http";
import { clearDoneItems } from "@/server/services/shopping";

export const POST = apiRoute({ auth: "customer" }, async ({ user }) => ({ deleted: (await clearDoneItems(user!.id)).count }));
