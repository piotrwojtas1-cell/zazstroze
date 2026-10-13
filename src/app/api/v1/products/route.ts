import { z } from "zod";
import { apiRoute } from "@/server/http";
import { listProducts } from "@/server/services/shopping";

export const GET = apiRoute({ auth: "public", query: z.object({ q: z.string().max(80).optional() }) }, async ({ query }) => ({
  products: await listProducts(query.q),
}));
