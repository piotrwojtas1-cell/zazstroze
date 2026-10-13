import { apiRoute } from "@/server/http";
import { dashboardKpis } from "@/server/services/reports";

export const GET = apiRoute({ auth: { permission: "dashboard.view" } }, async () => dashboardKpis());
