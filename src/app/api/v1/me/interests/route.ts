import { z } from "zod";
import { apiRoute } from "@/server/http";
import { setInterests } from "@/server/services/profile";

export const PUT = apiRoute({ auth: "customer", body: z.object({ interests: z.array(z.string().max(40)).max(20) }) }, async ({ user, body }) => ({
  interests: await setInterests(user!.id, body.interests),
}));
