import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { AdminHeader } from "@/components/admin/ui";
import { ArticleForm } from "@/components/admin/forms";

export const metadata = { title: "Porada" };

export default async function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("content.manage");
  const { id } = await params;
  const a = id === "nowa" ? null : await prisma.article.findUnique({ where: { id } });
  if (id !== "nowa" && !a) notFound();
  const interests = await prisma.interest.findMany({ orderBy: { sort: "asc" } });
  return (
    <>
      <AdminHeader title={a ? `Edycja: ${a.title}` : "Nowa porada"} actions={<Link href="/admin/tresci" className="text-sm font-medium text-forest-700">← Treści</Link>} />
      <ArticleForm id={a?.id ?? null} initial={a} interests={interests.map((i) => ({ key: i.key, label: `${i.emoji} ${i.name}` }))} />
    </>
  );
}
