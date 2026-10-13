import { apiRoute } from "@/server/http";
import { articleSchema } from "@/server/services/admin-schemas";
import { saveArticle } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "content.manage" }, body: articleSchema }, async ({ user, params, body, ipHash }) => ({
  article: await saveArticle(user!, params.id!, body, ipHash),
}));
