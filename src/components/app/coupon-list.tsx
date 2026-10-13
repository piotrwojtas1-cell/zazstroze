"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDate, daysUntil } from "@/lib/dates";
import { formatPLN, plural } from "@/lib/money";
import { COUPON_STATUS_LABELS, valueLabel, type RewardTypeName } from "@/lib/loyalty-format";

interface CouponItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: RewardTypeName;
  valueGrosze: number | null;
  percentBp: number | null;
  minBasketGrosze: number;
  status: string;
  expiresAt: string;
  usedAt: string | null;
}

const TABS = [
  { key: "active", label: "Aktywne" },
  { key: "used", label: "Wykorzystane" },
  { key: "expired", label: "Wygasłe" },
] as const;

export function CouponList(props: { active: CouponItem[]; used: CouponItem[]; expired: CouponItem[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const list = props[tab];

  async function toggle(c: CouponItem, on: boolean) {
    setBusy(c.id);
    try {
      await api(`/api/v1/me/coupons/${c.id}/activate`, { method: on ? "POST" : "DELETE" });
      toast(on ? "Kupon aktywowany — kasa zastosuje go automatycznie." : "Kupon dezaktywowany.");
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nie udało się zmienić kuponu.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Status kuponów" className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            id={`tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={cn("rounded-full px-4 py-2 text-sm font-medium ring-1 transition", tab === t.key ? "bg-forest-700 text-white ring-forest-700" : "bg-white text-ink ring-forest-900/10 hover:bg-forest-50")}
          >
            {t.label} <span className="ml-1 opacity-70">{props[t.key].length}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {list.length === 0 ? (
          <EmptyState
            icon={<Ticket className="size-7" />}
            title={tab === "active" ? "Brak aktywnych kuponów" : tab === "used" ? "Nie wykorzystano jeszcze kuponów" : "Brak wygasłych kuponów"}
            description={tab === "active" ? "Wymień punkty na nagrodę, a kupon pojawi się tutaj." : undefined}
            action={tab === "active" ? <ButtonLink href="/nagrody">Zobacz nagrody</ButtonLink> : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {list.map((c) => {
              const days = daysUntil(new Date(c.expiresAt));
              const usable = c.status === "AVAILABLE" || c.status === "ACTIVATED";
              return (
                <li key={c.id} className={cn("card relative overflow-hidden", !usable && "opacity-75")}>
                  <div className="flex">
                    <div className={cn("flex w-24 shrink-0 flex-col items-center justify-center border-r border-dashed border-forest-900/15 p-3 text-center", usable ? "bg-forest-50" : "bg-sand")}>
                      <span className="font-display text-xl font-semibold text-forest-800">{valueLabel(c.type, c.valueGrosze, c.percentBp)}</span>
                    </div>
                    <div className="min-w-0 flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-sans text-[15px] font-semibold text-ink">{c.title}</h3>
                        <Badge tone={c.status === "ACTIVATED" ? "green" : c.status === "AVAILABLE" ? "moss" : c.status === "USED" ? "gray" : "red"}>{COUPON_STATUS_LABELS[c.status]}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-sm tracking-wide text-forest-900">{c.code}</p>
                      <p className="mt-1 text-xs text-muted">
                        {c.status === "USED" && c.usedAt
                          ? `Wykorzystany ${formatDate(c.usedAt)}`
                          : usable
                            ? days <= 3
                              ? `Wygasa za ${days} ${plural(days, "dzień", "dni", "dni")}!`
                              : `Ważny do ${formatDate(c.expiresAt)}`
                            : `Ważność do ${formatDate(c.expiresAt)}`}
                        {c.minBasketGrosze > 0 && ` · zakupy od ${formatPLN(c.minBasketGrosze)}`}
                      </p>
                      {usable && (
                        <div className="-mb-3 mt-1 border-t border-forest-900/5">
                          <Switch
                            checked={c.status === "ACTIVATED"}
                            disabled={busy === c.id}
                            onChange={(v) => toggle(c, v)}
                            label="Zastosuj przy najbliższych zakupach"
                            description="Kasa automatycznie użyje kuponu po zeskanowaniu karty."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
