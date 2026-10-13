import { apiRoute } from "@/server/http";
import { campaignSchema } from "@/server/services/admin-schemas";
import { listCampaignsAdmin, saveCampaign } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "campaigns.manage" } }, async () => ({ campaigns: await listCampaignsAdmin() }));
export const POST = apiRoute({ auth: { permission: "campaigns.manage" }, body: campaignSchema }, async ({ user, body, ipHash }) => ({
  campaign: await saveCampaign(user!, null, body, ipHash),
}));
