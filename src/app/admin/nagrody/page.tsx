import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { listRewardsAdmin, } from "@/server/services/admin";
import { rewardValueLabel } from "@/server/loyalty/rewards";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { formatNumber, formatPLN } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Nagrody" };

export default async function AdminRewardsPage() {
  await requireStaffPage("rewards.manage");
  const rewards = await listRewardsAdmin();
  return (
    <>
      <AdminHeader title="Katalog nagród" description="Ceny w punktach i wartości są konfiguracją demonstracyjną — do zatwierdzenia przez właściciela programu." actions={<ButtonLink href="/admin/nagrody/nowa">Dodaj nagrodę</ButtonLink>} />
      <Table>
        <thead><tr><th>Nagroda</th><th>Wartość</th><th className="text-right">Koszt</th><th>Warunki</th><th className="text-right">Wymiany</th><th>Status</th></tr></thead>
        <tbody>
          {rewards.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/nagrody/${r.id}`} className="font-medium text-forest-800 hover:underline"><span aria-hidden className="mr-1.5">{r.imageEmoji}</span>{r.name}</Link></td>
              <td className="text-sm">{rewardValueLabel(r)}</td>
              <td className="text-right font-semibold tabular-nums">{formatNumber(r.pointsCost)} pkt</td>
              <td className="text-xs text-muted">
                {r.minBasketGrosze > 0 && <>od {formatPLN(r.minBasketGrosze)} · </>}ważny {r.validDays} dni
                {r.stock != null && <> · zapas {r.stock}</>}
                {r.perCustomerLimit != null && <> · limit {r.perCustomerLimit}/klient</>}
                {r.requiredTier && <> · poziom {r.requiredTier.name}+</>}
                {r.endsAt && <> · do {formatDate(r.endsAt)}</>}
              </td>
              <td className="text-right tabular-nums">{r._count.coupons}</td>
              <td>{r.active ? <Badge>Aktywna</Badge> : <Badge tone="gray">Ukryta</Badge>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
