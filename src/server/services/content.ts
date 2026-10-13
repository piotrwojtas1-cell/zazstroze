import "server-only";
import { prisma } from "../db";
import { notFound } from "../errors";

export async function listArticles(opts: { interest?: string; month?: number; q?: string } = {}) {
  return prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      ...(opts.interest ? { interestKeys: { has: opts.interest } } : {}),
      ...(opts.month ? { OR: [{ months: { has: opts.month } }, { months: { isEmpty: true } }] } : {}),
      ...(opts.q
        ? { AND: [{ OR: [{ title: { contains: opts.q, mode: "insensitive" as const } }, { excerpt: { contains: opts.q, mode: "insensitive" as const } }] }] }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 60,
  });
}

export async function getArticle(slug: string) {
  const a = await prisma.article.findUnique({ where: { slug } });
  if (!a || a.status !== "PUBLISHED") throw notFound("Porada");
  return a;
}

export const listInterests = () => prisma.interest.findMany({ orderBy: { sort: "asc" } });

export const listGardenTasks = () => prisma.gardenTask.findMany({ orderBy: [{ month: "asc" }, { sort: "asc" }] });

export const getMainStore = () => prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
