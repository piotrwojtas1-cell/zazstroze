import { apiRoute } from "@/server/http";
import { getCustomerDetail } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "customers.view" } }, async ({ params }) => {
  const { user, consents } = await getCustomerDetail(params.id!);
  const { passwordHash: _p, ...safe } = user;
  return { customer: safe, consents };
});
