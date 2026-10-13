import { apiRoute } from "@/server/http";
import { listFavorites } from "@/server/services/shopping";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => ({ favorites: await listFavorites(user!.id) }));
