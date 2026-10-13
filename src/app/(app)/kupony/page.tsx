import { requireCustomerPage } from "@/server/auth/current";
import { listCustomerCoupons } from "@/server/loyalty/coupons";
import { PageHeader } from "@/components/ui/misc";
import { RewardsTabs } from "@/components/app/rewards-tabs";
import { CouponList } from "@/components/app/coupon-list";

export const metadata = { title: "Moje kupony" };

export default async function CouponsPage() {
  const user = await requireCustomerPage();
  const coupons = await listCustomerCoupons(user.id);
  const map = (list: typeof coupons.active) =>
    list.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      type: c.type,
      valueGrosze: c.valueGrosze,
      percentBp: c.percentBp,
      minBasketGrosze: c.minBasketGrosze,
      status: c.status,
      expiresAt: c.expiresAt.toISOString(),
      usedAt: c.usedAt?.toISOString() ?? null,
    }));
  return (
    <div className="animate-fade-in">
      <PageHeader title="Nagrody" subtitle="Kupony odebrane za punkty i z kampanii" />
      <RewardsTabs active="kupony" />
      <CouponList active={map(coupons.active)} used={map(coupons.used)} expired={map(coupons.expired)} />
    </div>
  );
}
