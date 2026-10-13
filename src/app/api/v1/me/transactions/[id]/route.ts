import { apiRoute } from "@/server/http";
import { getTransactionForUser } from "@/server/services/customer";

export const GET = apiRoute({ auth: "customer" }, async ({ user, params }) => ({ transaction: await getTransactionForUser(user!.id, params.id!) }));
