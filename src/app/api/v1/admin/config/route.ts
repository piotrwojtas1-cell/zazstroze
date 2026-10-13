import { apiRoute } from "@/server/http";
import { configSchema } from "@/server/services/admin-schemas";
import { listConfigVersions, updateConfig } from "@/server/services/admin";
import { getTiers } from "@/server/loyalty/tiers";
import { prisma } from "@/server/db";

export const GET = apiRoute({ auth: { permission: "config.manage" } }, async () => ({ versions: await listConfigVersions(), tiers: await getTiers(prisma) }));
export const PUT = apiRoute({ auth: { permission: "config.manage" }, body: configSchema }, async ({ user, body, ipHash }) => ({
  config: await updateConfig(user!, body, ipHash),
}));
