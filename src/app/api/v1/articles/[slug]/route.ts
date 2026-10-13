import { apiRoute } from "@/server/http";
import { getArticle } from "@/server/services/content";

export const GET = apiRoute({ auth: "public" }, async ({ params }) => ({ article: await getArticle(params.slug!) }));
