import { apiRoute } from "@/server/http";
import { gardenTaskSchema } from "@/server/services/admin-schemas";
import { deleteGardenTask, saveGardenTask } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "content.manage" }, body: gardenTaskSchema }, async ({ user, params, body, ipHash }) => ({
  task: await saveGardenTask(user!, params.id!, body, ipHash),
}));
export const DELETE = apiRoute({ auth: { permission: "content.manage" } }, async ({ user, params, ipHash }) => {
  await deleteGardenTask(user!, params.id!, ipHash);
  return { ok: true };
});
