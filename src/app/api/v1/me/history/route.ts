import { z } from "zod";
import { apiRoute } from "@/server/http";
import { getHistory } from "@/server/services/customer";

export const GET = apiRoute(
  { auth: "customer", query: z.object({ cursor: z.string().max(64).optional(), take: z.coerce.number().int().min(1).max(100).optional() }) },
  async ({ user, query }) => getHistory(user!.id, query),
);
