import { z } from "zod";
import { apiRoute } from "@/server/http";
import { listTransactions } from "@/server/services/admin";

export const GET = apiRoute(
  {
    auth: { permission: "transactions.view" },
    query: z.object({ type: z.enum(["SALE", "RETURN"]).optional(), status: z.enum(["COMPLETED", "VOIDED"]).optional(), q: z.string().max(80).optional() }),
  },
  async ({ query }) => ({ transactions: await listTransactions(query) }),
);
