"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { parsePLN } from "@/lib/money";
import { MONTHS } from "@/lib/dates";
import { cn } from "@/lib/cn";

const toPLN = (g: number | null | undefined) => (g == null ? "" : (g / 100).toFixed(2).replace(".", ","));
const intOrNull = (v: string) => (v.trim() === "" ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : NaN);

function useSave() {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save(url: string, method: "POST" | "PUT", body: unknown, after: string | null, message = "Zapisano.") {
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      await api(url, { method, body });
      toast(message);
      if (after) router.push(after);
      router.refresh();
      return true;
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors());
        setError(e.message);
      } else setError("Nie udało się zapisać.");
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { save, errors, error, saving, setError };
}

export function MultiCheck({ label, options, value, onChange, hint }: { label: string; options: { key: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== o.key) : [...value, o.key])}
              className={cn("rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition", on ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/15 hover:bg-forest-50")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// ───────── Nagroda ─────────

interface RewardInitial {
  name: string;
  description: string;
  type: "AMOUNT_OFF" | "PERCENT_OFF" | "FREE_PRODUCT";
  pointsCost: number;
  valueGrosze: number | null;
  percentBp: number | null;
  minBasketGrosze: number;
  maxDiscountGrosze: number | null;
  excludedCategories: string[];
  validDays: number;
  stock: number | null;
  perCustomerLimit: number | null;
  requiredTierId: string | null;
  imageEmoji: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
}

export function RewardForm({ id, initial, tiers, categories }: { id: string | null; initial: RewardInitial | null; tiers: { id: string; name: string }[]; categories: { key: string; label: string }[] }) {
  const { save, errors, error, saving, setError } = useSave();
  const [f, setF] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    type: initial?.type ?? "AMOUNT_OFF",
    pointsCost: String(initial?.pointsCost ?? 100),
    value: toPLN(initial?.valueGrosze ?? 500),
    percent: initial?.percentBp ? String(initial.percentBp / 100) : "10",
    minBasket: toPLN(initial?.minBasketGrosze ?? 0),
    maxDiscount: toPLN(initial?.maxDiscountGrosze),
    excludedCategories: initial?.excludedCategories ?? ["karty-podarunkowe", "kaucje"],
    validDays: String(initial?.validDays ?? 30),
    stock: initial?.stock == null ? "" : String(initial.stock),
    perCustomerLimit: initial?.perCustomerLimit == null ? "" : String(initial.perCustomerLimit),
    requiredTierId: initial?.requiredTierId ?? "",
    imageEmoji: initial?.imageEmoji ?? "🎁",
    active: initial?.active ?? true,
    startsAt: initial?.startsAt ?? "",
    endsAt: initial?.endsAt ?? "",
    sortOrder: String(initial?.sortOrder ?? 0),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valueGrosze = parsePLN(f.value);
    const minBasketGrosze = f.minBasket ? parsePLN(f.minBasket) : 0;
    const maxDiscountGrosze = f.maxDiscount ? parsePLN(f.maxDiscount) : null;
    if (f.type !== "PERCENT_OFF" && valueGrosze == null) return setError("Nieprawidłowa wartość nagrody (np. 15,00).");
    if (minBasketGrosze == null) return setError("Nieprawidłowa minimalna wartość koszyka.");
    const percentBp = Math.round(Number(f.percent.replace(",", ".")) * 100);
    await save(
      id ? `/api/v1/admin/rewards/${id}` : "/api/v1/admin/rewards",
      id ? "PUT" : "POST",
      {
        name: f.name,
        description: f.description,
        type: f.type,
        pointsCost: Number(f.pointsCost),
        valueGrosze: f.type === "PERCENT_OFF" ? null : valueGrosze,
        percentBp: f.type === "PERCENT_OFF" ? percentBp : null,
        minBasketGrosze,
        maxDiscountGrosze: f.type === "PERCENT_OFF" ? maxDiscountGrosze : null,
        excludedCategories: f.excludedCategories,
        validDays: Number(f.validDays),
        stock: intOrNull(f.stock),
        perCustomerLimit: intOrNull(f.perCustomerLimit),
        requiredTierId: f.requiredTierId || null,
        imageEmoji: f.imageEmoji,
        active: f.active,
        startsAt: f.startsAt || null,
        endsAt: f.endsAt || null,
        sortOrder: Number(f.sortOrder) || 0,
      },
      "/admin/nagrody",
      "Nagroda zapisana.",
    );
  }

  return (
    <form onSubmit={submit} className="card max-w-3xl space-y-5 p-6" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <TextField label="Nazwa" value={f.name} onChange={(e) => set("name", e.target.value)} error={errors.name} required />
        <TextField label="Ikona (emoji)" value={f.imageEmoji} onChange={(e) => set("imageEmoji", e.target.value)} error={errors.imageEmoji} />
      </div>
      <TextAreaField label="Opis dla klienta" value={f.description} onChange={(e) => set("description", e.target.value)} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Rodzaj" value={f.type} onChange={(e) => set("type", e.target.value as typeof f.type)}>
          <option value="AMOUNT_OFF">Rabat kwotowy</option>
          <option value="PERCENT_OFF">Rabat procentowy</option>
          <option value="FREE_PRODUCT">Produkt gratis (do kwoty)</option>
        </SelectField>
        {f.type === "PERCENT_OFF" ? (
          <TextField label="Rabat (%)" inputMode="decimal" value={f.percent} onChange={(e) => set("percent", e.target.value)} error={errors.percentBp} />
        ) : (
          <TextField label="Wartość (zł)" inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} error={errors.valueGrosze} />
        )}
        <TextField label="Koszt (pkt)" inputMode="numeric" value={f.pointsCost} onChange={(e) => set("pointsCost", e.target.value)} error={errors.pointsCost} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Min. koszyk (zł)" inputMode="decimal" value={f.minBasket} onChange={(e) => set("minBasket", e.target.value)} error={errors.minBasketGrosze} />
        {f.type === "PERCENT_OFF" && <TextField label="Maks. rabat (zł)" optional inputMode="decimal" value={f.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} error={errors.maxDiscountGrosze} />}
        <TextField label="Ważność kuponu (dni)" inputMode="numeric" value={f.validDays} onChange={(e) => set("validDays", e.target.value)} error={errors.validDays} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Zapas" optional inputMode="numeric" placeholder="bez limitu" value={f.stock} onChange={(e) => set("stock", e.target.value)} error={errors.stock} />
        <TextField label="Limit na klienta" optional inputMode="numeric" placeholder="bez limitu" value={f.perCustomerLimit} onChange={(e) => set("perCustomerLimit", e.target.value)} error={errors.perCustomerLimit} />
        <SelectField label="Wymagany poziom" value={f.requiredTierId} onChange={(e) => set("requiredTierId", e.target.value)}>
          <option value="">— każdy —</option>
          {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Dostępna od" optional type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        <TextField label="Dostępna do" optional type="date" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} />
        <TextField label="Kolejność" inputMode="numeric" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
      </div>
      <MultiCheck label="Kategorie wykluczone z rabatu" options={categories} value={f.excludedCategories} onChange={(v) => set("excludedCategories", v)} />
      <Checkbox checked={f.active} onChange={(e) => set("active", e.target.checked)} label="Widoczna w katalogu" />
      <Button type="submit" loading={saving}>Zapisz nagrodę</Button>
    </form>
  );
}

// ───────── Kampania ─────────

interface CampaignInitial {
  name: string;
  description: string;
  type: "POINTS_MULTIPLIER" | "BONUS_POINTS" | "SEASONAL_OFFER";
  multiplierBp: number | null;
  bonusPoints: number | null;
  minBasketGrosze: number;
  categories: string[];
  tierKeys: string[];
  interestKeys: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
  showInApp: boolean;
  imageEmoji: string;
  ctaLabel: string | null;
}

export function CampaignForm({
  id,
  initial,
  categories,
  tiers,
  interests,
}: {
  id: string | null;
  initial: CampaignInitial | null;
  categories: { key: string; label: string }[];
  tiers: { key: string; label: string }[];
  interests: { key: string; label: string }[];
}) {
  const { save, errors, error, saving, setError } = useSave();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    type: initial?.type ?? "POINTS_MULTIPLIER",
    multiplier: initial?.multiplierBp ? String(initial.multiplierBp / 10000).replace(".", ",") : "2",
    bonusPoints: String(initial?.bonusPoints ?? 50),
    minBasket: toPLN(initial?.minBasketGrosze ?? 0),
    categories: initial?.categories ?? [],
    tierKeys: initial?.tierKeys ?? [],
    interestKeys: initial?.interestKeys ?? [],
    startsAt: initial?.startsAt ?? today,
    endsAt: initial?.endsAt ?? "",
    active: initial?.active ?? true,
    showInApp: initial?.showInApp ?? true,
    imageEmoji: initial?.imageEmoji ?? "🌱",
    ctaLabel: initial?.ctaLabel ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const minBasketGrosze = f.minBasket ? parsePLN(f.minBasket) : 0;
    if (minBasketGrosze == null) return setError("Nieprawidłowa minimalna wartość koszyka.");
    if (!f.endsAt) return setError("Podaj datę zakończenia kampanii.");
    await save(
      id ? `/api/v1/admin/campaigns/${id}` : "/api/v1/admin/campaigns",
      id ? "PUT" : "POST",
      {
        name: f.name,
        description: f.description,
        type: f.type,
        multiplierBp: f.type === "POINTS_MULTIPLIER" ? Math.round(Number(f.multiplier.replace(",", ".")) * 10000) : null,
        bonusPoints: f.type === "BONUS_POINTS" ? Number(f.bonusPoints) : null,
        minBasketGrosze,
        categories: f.categories,
        tierKeys: f.tierKeys,
        interestKeys: f.interestKeys,
        // Daty kampanii: od początku dnia startu do końca dnia zakończenia (czas lokalny przeglądarki).
        startsAt: new Date(`${f.startsAt}T00:00:00`).toISOString(),
        endsAt: new Date(`${f.endsAt}T23:59:59`).toISOString(),
        active: f.active,
        showInApp: f.showInApp,
        imageEmoji: f.imageEmoji,
        ctaLabel: f.ctaLabel || null,
      },
      "/admin/kampanie",
      "Kampania zapisana.",
    );
  }

  return (
    <form onSubmit={submit} className="card max-w-3xl space-y-5 p-6" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <TextField label="Nazwa" value={f.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
        <TextField label="Ikona (emoji)" value={f.imageEmoji} onChange={(e) => set("imageEmoji", e.target.value)} />
      </div>
      <TextAreaField label="Opis (widoczny w aplikacji)" value={f.description} onChange={(e) => set("description", e.target.value)} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Rodzaj" value={f.type} onChange={(e) => set("type", e.target.value as typeof f.type)}>
          <option value="POINTS_MULTIPLIER">Mnożnik punktów</option>
          <option value="BONUS_POINTS">Bonus punktowy</option>
          <option value="SEASONAL_OFFER">Oferta sezonowa (treść)</option>
        </SelectField>
        {f.type === "POINTS_MULTIPLIER" && <TextField label="Mnożnik (np. 2 lub 1,5)" inputMode="decimal" value={f.multiplier} onChange={(e) => set("multiplier", e.target.value)} error={errors.multiplierBp} />}
        {f.type === "BONUS_POINTS" && <TextField label="Bonus (pkt)" inputMode="numeric" value={f.bonusPoints} onChange={(e) => set("bonusPoints", e.target.value)} error={errors.bonusPoints} />}
        {f.type !== "SEASONAL_OFFER" && <TextField label="Min. koszyk (zł)" inputMode="decimal" value={f.minBasket} onChange={(e) => set("minBasket", e.target.value)} />}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Start" type="date" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} error={errors.startsAt} />
        <TextField label="Koniec" type="date" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} />
        <TextField label="Etykieta przycisku" optional value={f.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} />
      </div>
      {f.type === "POINTS_MULTIPLIER" && <MultiCheck label="Kategorie objęte mnożnikiem" hint="Brak wyboru = wszystkie kwalifikujące się kategorie." options={categories} value={f.categories} onChange={(v) => set("categories", v)} />}
      {f.type !== "SEASONAL_OFFER" && <MultiCheck label="Poziomy członkostwa" hint="Brak wyboru = wszyscy klienci." options={tiers} value={f.tierKeys} onChange={(v) => set("tierKeys", v)} />}
      <MultiCheck label="Zainteresowania (personalizacja)" hint="Oferta wyżej na liście u klientów o tych zainteresowaniach; powiadomienia tylko przy zgodzie na personalizację." options={interests} value={f.interestKeys} onChange={(v) => set("interestKeys", v)} />
      <div className="flex flex-wrap gap-6">
        <Checkbox checked={f.active} onChange={(e) => set("active", e.target.checked)} label="Aktywna" />
        <Checkbox checked={f.showInApp} onChange={(e) => set("showInApp", e.target.checked)} label="Pokazuj w aplikacji" />
      </div>
      <Alert tone="info">Kampanie punktowe nie sumują się: dla transakcji stosowany jest jeden najkorzystniejszy mnożnik i jeden najwyższy bonus.</Alert>
      <Button type="submit" loading={saving}>Zapisz kampanię</Button>
    </form>
  );
}

// ───────── Porada ─────────

interface ArticleInitial {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  interestKeys: string[];
  months: number[];
  readMinutes: number;
  emoji: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export function ArticleForm({ id, initial, interests }: { id: string | null; initial: ArticleInitial | null; interests: { key: string; label: string }[] }) {
  const { save, errors, error, saving } = useSave();
  const [f, setF] = useState<ArticleInitial>(
    initial ?? { slug: "", title: "", excerpt: "", body: "", category: "", interestKeys: [], months: [], readMinutes: 3, emoji: "🌿", status: "DRAFT" },
  );
  const set = <K extends keyof ArticleInitial>(k: K, v: ArticleInitial[K]) => setF((x) => ({ ...x, [k]: v }));
  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(id ? `/api/v1/admin/articles/${id}` : "/api/v1/admin/articles", id ? "PUT" : "POST", { ...f, readMinutes: Number(f.readMinutes) }, "/admin/tresci", "Porada zapisana.");
      }}
      className="card max-w-3xl space-y-5 p-6"
      noValidate
    >
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <TextField label="Tytuł" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value, slug: id ? x.slug : slugify(e.target.value) }))} error={errors.title} />
        <TextField label="Ikona" value={f.emoji} onChange={(e) => set("emoji", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Adres (slug)" value={f.slug} onChange={(e) => set("slug", e.target.value)} error={errors.slug} className="sm:col-span-2" />
        <TextField label="Kategoria" value={f.category} onChange={(e) => set("category", e.target.value)} error={errors.category} />
      </div>
      <TextAreaField label="Zajawka" value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} error={errors.excerpt} />
      <TextAreaField label="Treść" value={f.body} onChange={(e) => set("body", e.target.value)} error={errors.body} hint="Akapity oddzielaj pustą linią." className="[&_textarea]:min-h-64" />
      <MultiCheck label="Zainteresowania" options={interests} value={f.interestKeys} onChange={(v) => set("interestKeys", v)} />
      <MultiCheck
        label="Miesiące (sezonowość)"
        hint="Brak wyboru = porada całoroczna."
        options={MONTHS.map((m, i) => ({ key: String(i + 1), label: m }))}
        value={f.months.map(String)}
        onChange={(v) => set("months", v.map(Number).sort((a, b) => a - b))}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Czas czytania (min)" inputMode="numeric" value={String(f.readMinutes)} onChange={(e) => set("readMinutes", Number(e.target.value) || 1)} />
        <SelectField label="Status" value={f.status} onChange={(e) => set("status", e.target.value as ArticleInitial["status"])}>
          <option value="DRAFT">Szkic</option>
          <option value="PUBLISHED">Opublikowana</option>
          <option value="ARCHIVED">Archiwalna</option>
        </SelectField>
      </div>
      <Button type="submit" loading={saving}>Zapisz poradę</Button>
    </form>
  );
}

// ───────── Konfiguracja programu ─────────

export interface ConfigInitial {
  earnRateBp: number;
  rounding: "FLOOR" | "HALF_UP";
  minQualifyingGrosze: number;
  excludedCategories: string[];
  tierWindowDays: number;
  maxManualAdjustment: number;
  allowNegativeBalance: boolean;
  couponDefaultValidDays: number;
  pointValueGroszeInfo: number;
}

export function ConfigForm({ initial, categories }: { initial: ConfigInitial; categories: { key: string; label: string }[] }) {
  const { save, errors, error, saving, setError } = useSave();
  const [f, setF] = useState({
    earnRate: String(initial.earnRateBp / 10000).replace(".", ","),
    rounding: initial.rounding,
    minQualifying: toPLN(initial.minQualifyingGrosze),
    excludedCategories: initial.excludedCategories,
    tierWindowDays: String(initial.tierWindowDays),
    maxManualAdjustment: String(initial.maxManualAdjustment),
    allowNegativeBalance: initial.allowNegativeBalance,
    couponDefaultValidDays: String(initial.couponDefaultValidDays),
    pointValue: toPLN(initial.pointValueGroszeInfo),
    note: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const minQualifyingGrosze = parsePLN(f.minQualifying || "0");
        const pointValueGroszeInfo = parsePLN(f.pointValue || "0");
        const earnRateBp = Math.round(Number(f.earnRate.replace(",", ".")) * 10000);
        if (minQualifyingGrosze == null || pointValueGroszeInfo == null || !Number.isFinite(earnRateBp)) return setError("Sprawdź wartości liczbowe.");
        void save(
          "/api/v1/admin/config",
          "PUT",
          {
            earnRateBp,
            rounding: f.rounding,
            minQualifyingGrosze,
            excludedCategories: f.excludedCategories,
            tierWindowDays: Number(f.tierWindowDays),
            maxManualAdjustment: Number(f.maxManualAdjustment),
            allowNegativeBalance: f.allowNegativeBalance,
            couponDefaultValidDays: Number(f.couponDefaultValidDays),
            pointValueGroszeInfo,
            note: f.note,
          },
          null,
          "Zapisano nową wersję konfiguracji.",
        ).then((ok) => ok && set("note", ""));
      }}
      className="space-y-5"
      noValidate
    >
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Punkty za 1 zł" inputMode="decimal" value={f.earnRate} onChange={(e) => set("earnRate", e.target.value)} error={errors.earnRateBp} hint="np. 1 = 1 pkt/zł; 0,5 = 1 pkt/2 zł" />
        <SelectField label="Zaokrąglanie" value={f.rounding} onChange={(e) => set("rounding", e.target.value as "FLOOR" | "HALF_UP")}>
          <option value="FLOOR">W dół (zalecane)</option>
          <option value="HALF_UP">Matematyczne</option>
        </SelectField>
        <TextField label="Min. kwota do naliczenia (zł)" inputMode="decimal" value={f.minQualifying} onChange={(e) => set("minQualifying", e.target.value)} error={errors.minQualifyingGrosze} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Okno poziomów (dni)" inputMode="numeric" value={f.tierWindowDays} onChange={(e) => set("tierWindowDays", e.target.value)} error={errors.tierWindowDays} />
        <TextField label="Limit korekty bez admina (pkt)" inputMode="numeric" value={f.maxManualAdjustment} onChange={(e) => set("maxManualAdjustment", e.target.value)} error={errors.maxManualAdjustment} />
        <TextField label="Domyślna ważność kuponów (dni)" inputMode="numeric" value={f.couponDefaultValidDays} onChange={(e) => set("couponDefaultValidDays", e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Orientacyjna wartość 1 pkt (zł)" inputMode="decimal" value={f.pointValue} onChange={(e) => set("pointValue", e.target.value)} hint="Tylko do raportu kosztów." />
      </div>
      <MultiCheck label="Kategorie bez punktów" options={categories} value={f.excludedCategories} onChange={(v) => set("excludedCategories", v)} />
      <Checkbox checked={f.allowNegativeBalance} onChange={(e) => set("allowNegativeBalance", e.target.checked)} label="Zwrot może dać saldo ujemne" description="Gdy wyłączone, korekta po zwrocie jest ograniczana do bieżącego salda (różnica zapisywana w metadanych)." />
      <TextField label="Powód zmiany (wymagany)" value={f.note} onChange={(e) => set("note", e.target.value)} error={errors.note} />
      <Button type="submit" loading={saving}>Zapisz nową wersję</Button>
    </form>
  );
}

export function TierForm({ tier }: { tier: { id: string; name: string; description: string; minPoints: number; multiplierBp: number; benefits: string[]; color: string } }) {
  const { save, errors, error, saving } = useSave();
  const [f, setF] = useState({
    name: tier.name,
    description: tier.description,
    minPoints: String(tier.minPoints),
    multiplier: String(tier.multiplierBp / 10000).replace(".", ","),
    benefits: tier.benefits.join("\n"),
    color: tier.color,
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(`/api/v1/admin/tiers/${tier.id}`, "PUT", {
          name: f.name,
          description: f.description,
          minPoints: Number(f.minPoints),
          multiplierBp: Math.round(Number(f.multiplier.replace(",", ".")) * 10000),
          benefits: f.benefits.split("\n").map((b) => b.trim()).filter(Boolean),
          color: f.color,
        }, null, `Zapisano poziom ${f.name}.`);
      }}
      className="space-y-3 rounded-xl p-4 ring-1 ring-forest-900/10"
      noValidate
    >
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px_70px]">
        <TextField label="Nazwa" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errors.name} />
        <TextField label="Próg (pkt)" inputMode="numeric" value={f.minPoints} onChange={(e) => setF({ ...f, minPoints: e.target.value })} error={errors.minPoints} />
        <TextField label="Mnożnik" inputMode="decimal" value={f.multiplier} onChange={(e) => setF({ ...f, multiplier: e.target.value })} error={errors.multiplierBp} />
        <TextField label="Kolor" type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className="[&_input]:h-11 [&_input]:p-1" />
      </div>
      <TextField label="Opis" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <TextAreaField label="Korzyści (jedna w linii)" value={f.benefits} onChange={(e) => setF({ ...f, benefits: e.target.value })} className="[&_textarea]:min-h-20" />
      <Button type="submit" size="sm" loading={saving}>Zapisz poziom</Button>
    </form>
  );
}

export function GardenTaskForm({ interests }: { interests: { key: string; label: string }[] }) {
  const { save, errors, error, saving } = useSave();
  const [f, setF] = useState({ month: "1", title: "", description: "", interestKey: "" });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save("/api/v1/admin/garden-tasks", "POST", { month: Number(f.month), title: f.title, description: f.description, interestKey: f.interestKey || null }, null, "Dodano zadanie do kalendarza.").then(
          (ok) => ok && setF({ ...f, title: "", description: "" }),
        );
      }}
      className="space-y-3"
      noValidate
    >
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Miesiąc" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </SelectField>
        <TextField label="Tytuł" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} error={errors.title} className="sm:col-span-2" />
      </div>
      <TextField label="Opis" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} error={errors.description} />
      <SelectField label="Zainteresowanie" value={f.interestKey} onChange={(e) => setF({ ...f, interestKey: e.target.value })}>
        <option value="">— ogólne —</option>
        {interests.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
      </SelectField>
      <Button type="submit" size="sm" loading={saving}>Dodaj zadanie</Button>
    </form>
  );
}
