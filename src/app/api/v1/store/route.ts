import { apiRoute } from "@/server/http";
import { getMainStore } from "@/server/services/content";

export const GET = apiRoute({ auth: "public" }, async () => ({ store: await getMainStore() }));
