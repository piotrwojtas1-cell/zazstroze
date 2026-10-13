import { apiRoute } from "@/server/http";
import { integrationCreateSchema } from "@/server/services/admin-schemas";
import { createPosIntegration, listIntegrations } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "integrations.manage" } }, async () => ({ integrations: await listIntegrations() }));
/** Zwraca sekret JEDNORAZOWO — nie da się go później odczytać. */
export const POST = apiRoute({ auth: { permission: "integrations.manage" }, body: integrationCreateSchema }, async ({ user, body, ipHash }) =>
  createPosIntegration(user!, body.name, ipHash),
);
