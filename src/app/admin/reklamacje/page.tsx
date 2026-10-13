import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { listComplaintsAdmin } from "@/server/services/admin";
import { STATUS_LABELS } from "@/server/services/complaints";
import { AdminHeader } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ComplaintHandler } from "@/components/admin/complaint-handler";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";

export const metadata = { title: "Reklamacje" };

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const staff = await requireStaffPage("complaints.manage");
  const { status } = await searchParams;
  const valid = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"].includes(status ?? "") ? status : undefined;
  const list = await listComplaintsAdmin(valid);
  return (
    <>
      <AdminHeader title="Reklamacje i zgłoszenia" description="Zgłoszenia klientów dotyczące punktów, kuponów i transakcji" />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filtr statusu">
        {[undefined, "OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"].map((s) => (
          <Link key={s ?? "all"} href={s ? `/admin/reklamacje?status=${s}` : "/admin/reklamacje"} aria-current={valid === s ? "page" : undefined}
            className={cn("rounded-full px-3 py-1.5 text-sm font-medium ring-1", valid === s ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/10")}>
            {s ? STATUS_LABELS[s as keyof typeof STATUS_LABELS] : "Wszystkie"}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? <EmptyState icon="✅" title="Brak zgłoszeń" /> : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.subject}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(c.createdAt)} ·{" "}
                    {staff.permissions.has("customers.view") ? <Link href={`/admin/klienci/${c.user.id}`} className="text-forest-700 hover:underline">{[c.user.profile?.firstName, c.user.profile?.lastName].filter(Boolean).join(" ")}</Link> : c.user.profile?.firstName}
                    {c.transaction && <> · paragon {staff.permissions.has("transactions.view") ? <Link href={`/admin/transakcje/${c.transaction.id}`} className="font-mono text-forest-700 hover:underline">{c.transaction.externalId}</Link> : c.transaction.externalId}</>}
                    {c.handledBy && <> · obsługuje {c.handledBy.email}</>}
                  </p>
                </div>
                <Badge tone={c.status === "RESOLVED" ? "green" : c.status === "REJECTED" ? "red" : "amber"}>{STATUS_LABELS[c.status]}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{c.description}</p>
              <ComplaintHandler id={c.id} status={c.status} resolution={c.resolution ?? ""} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
