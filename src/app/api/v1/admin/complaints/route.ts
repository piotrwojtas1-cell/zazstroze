import { z } from "zod";
import { apiRoute } from "@/server/http";
import { listComplaintsAdmin } from "@/server/services/admin";

export const GET = apiRoute(
  { auth: { permission: "complaints.manage" }, query: z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]).optional() }) },
  async ({ query }) => ({ complaints: await listComplaintsAdmin(query.status) }),
);
