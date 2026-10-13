import { apiRoute } from "@/server/http";
import { gardenTaskSchema } from "@/server/services/admin-schemas";
import { saveGardenTask } from "@/server/services/admin";

export const POST = apiRoute({ auth: { permission: "content.manage" }, body: gardenTaskSchema }, async ({ user, body, ipHash }) => ({
  task: await saveGardenTask(user!, null, body, ipHash),
}));
