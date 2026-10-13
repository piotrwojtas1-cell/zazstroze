import { z } from "zod";
import { apiRoute } from "@/server/http";
import { deleteShoppingItem, updateShoppingItem } from "@/server/services/shopping";

export const PATCH = apiRoute(
  { auth: "customer", body: z.object({ done: z.boolean().optional(), quantity: z.number().int().min(1).max(999).optional() }) },
  async ({ user, params, body }) => {
    await updateShoppingItem(user!.id, params.id!, body);
    return { ok: true };
  },
);

export const DELETE = apiRoute({ auth: "customer" }, async ({ user, params }) => {
  await deleteShoppingItem(user!.id, params.id!);
  return { ok: true };
});
