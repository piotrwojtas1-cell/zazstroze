import { z } from "zod";
import { apiRoute } from "@/server/http";
import { addShoppingItem, listShoppingItems } from "@/server/services/shopping";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => ({ items: await listShoppingItems(user!.id) }));

export const POST = apiRoute(
  {
    auth: "customer",
    body: z.object({
      text: z.string().trim().max(120).optional(),
      productId: z.string().max(64).optional(),
      quantity: z.number().int().min(1).max(999).optional(),
    }),
  },
  async ({ user, body }) => ({ item: await addShoppingItem(user!.id, body) }),
);
