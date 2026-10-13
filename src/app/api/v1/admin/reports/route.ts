import { apiRoute } from "@/server/http";
import { reportRangeSchema } from "@/server/services/admin-schemas";
import { programReport } from "@/server/services/reports";

export const GET = apiRoute({ auth: { permission: "reports.view" }, query: reportRangeSchema }, async ({ query }) => {
  const to = query.to ?? new Date();
  const from = query.from ?? new Date(to.getTime() - 90 * 86_400_000);
  return programReport({ from, to });
});
