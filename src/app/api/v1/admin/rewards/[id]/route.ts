import { apiRoute } from "@/server/http";
import { rewardSchema } from "@/server/services/admin-schemas";
import { saveReward } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "rewards.manage" }, body: rewardSchema }, async ({ user, params, body, ipHash }) => ({
  reward: await saveReward(user!, params.id!, body, ipHash),
}));
