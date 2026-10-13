import { z } from "zod";
import { apiRoute } from "@/server/http";
import { listAudit } from "@/server/services/admin";

export const GET = apiRoute(
  { auth: { permission: "audit.view" }, query: z.object({ action: z.string().max(60).optional(), entityId: z.string().max(64).optional() }) },
  async ({ query }) => ({ entries: await listAudit(query) }),
);
