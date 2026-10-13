import { z } from "zod";
import { apiRoute } from "@/server/http";
import { listArticles } from "@/server/services/content";

export const GET = apiRoute(
  { auth: "public", query: z.object({ interest: z.string().max(40).optional(), month: z.coerce.number().int().min(1).max(12).optional(), q: z.string().max(80).optional() }) },
  async ({ query }) => ({ articles: await listArticles(query) }),
);
