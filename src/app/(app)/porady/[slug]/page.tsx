import { notFound } from "next/navigation";
import { requireCustomerPage } from "@/server/auth/current";
import { getArticle } from "@/server/services/content";
import { AppError } from "@/server/errors";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/dates";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireCustomerPage();
  const { slug } = await params;
  const article = await getArticle(slug).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  return (
    <article className="animate-fade-in">
      <PageHeader title={article.title} back="/porady" subtitle={`${article.category} · ${article.readMinutes} min czytania${article.publishedAt ? ` · ${formatDate(article.publishedAt)}` : ""}`} />
      <div className="mb-6 flex h-40 items-center justify-center rounded-3xl bg-gradient-to-br from-forest-50 to-moss-100 text-7xl" aria-hidden>
        {article.emoji}
      </div>
      <p className="text-lg font-medium leading-relaxed text-forest-900">{article.excerpt}</p>
      <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-ink">
        {article.body.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
