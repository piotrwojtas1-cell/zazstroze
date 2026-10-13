import { apiRoute } from "@/server/http";
import { campaignSchema } from "@/server/services/admin-schemas";
import { saveCampaign } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "campaigns.manage" }, body: campaignSchema }, async ({ user, params, body, ipHash }) => ({
  campaign: await saveCampaign(user!, params.id!, body, ipHash),
}));
