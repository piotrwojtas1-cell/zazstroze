import { apiRoute } from "@/server/http";
import { rewardSchema } from "@/server/services/admin-schemas";
import { listRewardsAdmin, saveReward } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "rewards.manage" } }, async () => ({ rewards: await listRewardsAdmin() }));
export const POST = apiRoute({ auth: { permission: "rewards.manage" }, body: rewardSchema }, async ({ user, body, ipHash }) => ({
  reward: await saveReward(user!, null, body, ipHash),
}));
