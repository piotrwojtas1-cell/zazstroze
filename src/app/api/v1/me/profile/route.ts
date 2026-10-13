import { apiRoute } from "@/server/http";
import { profileSchema } from "@/server/services/validation";
import { getProfile } from "@/server/services/customer";
import { updateProfile } from "@/server/services/profile";
import { currentConsents } from "@/server/services/consents";
import { prisma } from "@/server/db";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => {
  const u = await getProfile(user!.id);
  return {
    email: u.email,
    profile: u.profile,
    interests: u.interests.map((i) => i.interestKey),
    consents: await currentConsents(prisma, user!.id),
  };
});

export const PATCH = apiRoute({ auth: "customer", body: profileSchema }, async ({ user, body }) => ({
  profile: await updateProfile(user!.id, body),
}));
