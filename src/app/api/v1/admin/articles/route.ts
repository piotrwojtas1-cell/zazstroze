import { apiRoute } from "@/server/http";
import { articleSchema } from "@/server/services/admin-schemas";
import { listArticlesAdmin, saveArticle } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "content.manage" } }, async () => ({ articles: await listArticlesAdmin() }));
export const POST = apiRoute({ auth: { permission: "content.manage" }, body: articleSchema }, async ({ user, body, ipHash }) => ({
  article: await saveArticle(user!, null, body, ipHash),
}));
