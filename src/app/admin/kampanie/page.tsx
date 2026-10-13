import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { listCampaignsAdmin } from "@/server/services/admin";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { NotifyCampaignButton } from "@/components/admin/notify-campaign";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Kampanie" };

const TYPE = { POINTS_MULTIPLIER: "Mnożnik punktów", BONUS_POINTS: "Bonus punktowy", SEASONAL_OFFER: "Oferta sezonowa" };

export default async function CampaignsPage() {
  await requireStaffPage("campaigns.manage");
  const list = await listCampaignsAdmin();
  const now = new Date();
  return (
    <>
      <AdminHeader title="Kampanie i oferty" description="Bonusy punktowe i treści sezonowe w aplikacji" actions={<ButtonLink href="/admin/kampanie/nowa">Nowa kampania</ButtonLink>} />
      <Table>
        <thead><tr><th>Kampania</th><th>Rodzaj</th><th>Okres</th><th>Status</th><th className="text-right">Powiadomienie</th></tr></thead>
        <tbody>
          {list.map((c) => {
            const live = c.active && c.startsAt <= now && c.endsAt > now;
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/kampanie/${c.id}`} className="font-medium text-forest-800 hover:underline"><span className="mr-1.5" aria-hidden>{c.imageEmoji}</span>{c.name}</Link>
                  <p className="max-w-md truncate text-xs text-muted">{c.description}</p>
                </td>
                <td className="text-sm">
                  {TYPE[c.type]}
                  {c.multiplierBp && <span className="ml-1 text-muted">x{c.multiplierBp / 10000}</span>}
                  {c.bonusPoints && <span className="ml-1 text-muted">+{c.bonusPoints} pkt</span>}
                </td>
                <td className="whitespace-nowrap text-xs">{formatDate(c.startsAt)} – {formatDate(c.endsAt)}</td>
                <td>{live ? <Badge>Trwa</Badge> : !c.active ? <Badge tone="gray">Wyłączona</Badge> : c.startsAt > now ? <Badge tone="amber">Zaplanowana</Badge> : <Badge tone="gray">Zakończona</Badge>}</td>
                <td className="text-right">{live && <NotifyCampaignButton id={c.id} />}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
