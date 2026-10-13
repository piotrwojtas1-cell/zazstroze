import { apiRoute } from "@/server/http";
import { sendCampaignNotification } from "@/server/services/admin";

export const POST = apiRoute({ auth: { permission: "campaigns.manage" } }, async ({ user, params, ipHash }) => sendCampaignNotification(user!, params.id!, ipHash));
