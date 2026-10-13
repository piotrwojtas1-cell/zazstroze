import { z } from "zod";
import { apiRoute } from "@/server/http";
import { listPosRequests } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "integrations.manage" }, query: z.object({ errors: z.enum(["1", "0"]).optional() }) }, async ({ query }) => ({
  requests: await listPosRequests(query.errors === "1"),
}));
