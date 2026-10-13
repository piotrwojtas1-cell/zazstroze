import { apiRoute } from "@/server/http";
import { getPurchases } from "@/server/services/customer";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => ({ transactions: await getPurchases(user!.id) }));
