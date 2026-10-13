import { apiRoute } from "@/server/http";
import { getTransactionAdmin } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "transactions.view" } }, async ({ params }) => ({ transaction: await getTransactionAdmin(params.id!) }));
