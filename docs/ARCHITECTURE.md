# Architektura

## 1. Wybór stosu

| Element | Wybór | Uzasadnienie |
|---|---|---|
| Aplikacja | **Next.js 15 (App Router) + React 19 + TypeScript (strict)** | jeden projekt dla PWA klienta, panelu i API; renderowanie po stronie serwera (szybki pierwszy widok karty, mniej JS), route handlers jako REST API, middleware dla CSP z nonce |
| Baza | **PostgreSQL 16** | transakcje ACID, `SELECT … FOR UPDATE`, ograniczenia `CHECK`, indeksy częściowe, triggery — potrzebne do spójności salda i niezmienności rejestru |
| ORM / migracje | **Prisma 6** | typowany dostęp do danych, migracje SQL w repozytorium; surowe zapytania tam, gdzie potrzebne (blokady, agregaty) |
| Walidacja | **Zod 3** | te same schematy dla API i formularzy, czytelne komunikaty po polsku |
| Hasła | **argon2id** (`@node-rs/argon2`, parametry OWASP) | odporność na ataki GPU |
| Style | **Tailwind CSS 4** + własne tokeny (zieleń, mech, glina, krem) | spójny system wizualny bez ciężkich bibliotek UI |
| Testy | **Vitest** (jednostkowe + integracyjne na prawdziwej bazie), **Playwright** + **axe-core** (E2E, dostępność) | testy logiki finansowej muszą działać na prawdziwym PostgreSQL (blokady, unikalność) |

Wersje są przypięte w `package.json` / `package-lock.json`.

## 2. Struktura katalogów

```
prisma/
  schema.prisma                 model danych
  migrations/                   migracje SQL (w tym triggery i CHECK w *_integrity)
  seed.ts, seed-data.ts         dane referencyjne i demonstracyjne
src/
  app/
    (public)/                   witaj, logowanie, rejestracja, odzyskiwanie hasła, regulamin, polityka
    (app)/                      aplikacja klienta (layout z dolną nawigacją): /, karta, nagrody, kupony,
                                porady, historia, profil/*, lista-zakupow, ulubione, powiadomienia, sklep, pomoc
    admin/                      panel (layout z menu bocznym filtrowanym uprawnieniami)
    api/v1/                     REST API sesyjne (klient + admin)
    api/pos/v1/                 API dla systemów kasowych (HMAC)
    api/health/                 sonda zdrowia
  middleware.ts                 CSP z nonce
  components/{ui,app,admin,auth}
  lib/                          funkcje współdzielone klient/serwer (kwoty, daty, Luhn, klient API)
  server/                       kod wyłącznie serwerowy (import "server-only")
    auth/                       hasła, sesje, uprawnienia, strażnicy
    loyalty/                    kalkulator (czysty), rejestr, poziomy, nagrody, kupony, transakcje, korekty
    pos/                        podpisy, QR karty, adaptery, serwis kasowy, handler HTTP
    services/                   auth, profil/RODO, treści, lista zakupów, reklamacje, raporty, panel
    http.ts                     fabryka handlerów API (authz, CSRF, Zod, limity, błędy)
scripts/                        create-admin, create-pos-integration, pos-simulator, run-jobs
tests/                          unit/, integration/, helpers/
e2e/                            testy Playwright
```

## 3. Model danych (skrót)

Pełny schemat: `prisma/schema.prisma`. Kwoty — `Int` w groszach; punkty — `Int`.

| Obszar | Tabele |
|---|---|
| Tożsamość | `User` (CUSTOMER/STAFF, status, blokada po nieudanych logowaniach), `Profile`, `Session` (SHA-256 tokenu), `PasswordResetToken` (hash), `RateLimitBucket` |
| Uprawnienia | `Role`, `Permission`, `RolePermission`, `UserRole` |
| Program | `LoyaltyCard` (numer z Luhnem, saldo, poziom), `Tier`, `ProgramConfig` (wersjonowana), `PointsLedger` (**tylko INSERT**, `balanceAfter`, unikalny `idempotencyKey`) |
| Transakcje | `Transaction` (unikalne `integrationId+externalId`, SALE/RETURN, COMPLETED/VOIDED, `calculation` JSON), `TransactionItem` (`returnedQuantity`), `Store` |
| Nagrody | `Reward`, `Coupon` (statusy), `CouponRedemption` (częściowy indeks unikalny: jedna aktywna realizacja na kupon), `Campaign` |
| POS | `PosIntegration` (sekret zaszyfrowany AES-GCM), `PosRequestLog` (idempotencja + monitoring) |
| Klient | `Interest`, `UserInterest`, `ConsentRecord` (historia zgód, bez UPDATE), `CommunicationPreference`, `Notification`, `EmailOutbox`, `Product`, `FavoriteProduct`, `ShoppingListItem` |
| Obsługa | `Complaint`, `DataRequest`, `AuditLog` (**tylko INSERT**), `Article`, `GardenTask` |

Integralność: klucze obce z `onDelete: Restrict` dla danych finansowych, `CHECK` (kwoty ≥ 0, punkty ≠ 0, powód ≥ 3 znaki,
daty kampanii, zakresy mnożników), indeksy pod zapytania (karta+data, status+data, typ operacji).

## 4. Role i uprawnienia

| Uprawnienie | Administrator | Kierownik | Pracownik obsługi |
|---|:-:|:-:|:-:|
| dashboard.view, customers.view, transactions.view, complaints.manage, pos.operate | ✓ | ✓ | ✓ |
| customers.manage, points.adjust (do limitu), coupons.manage, rewards.manage, campaigns.manage, content.manage, reports.view, audit.view | ✓ | ✓ | — |
| points.adjust.large, config.manage, integrations.manage, roles.manage | ✓ | — | — |

Uprawnienia są sprawdzane **na serwerze** przy każdym żądaniu (`apiRoute({ auth: { permission } })` i `requireStaffPage`).
Menu panelu tylko odzwierciedla te uprawnienia. Klient (CUSTOMER) nie ma dostępu do żadnego endpointu `/api/v1/admin/*`.

## 5. Reguły programu (konfiguracja demonstracyjna)

| Reguła | Zachowanie |
|---|---|
| Przelicznik | `earnRateBp` (10000 = 1 pkt / 1 zł). Arytmetyka na BigInt, bez float |
| Zaokrąglenie | domyślnie w dół (`FLOOR`); opcja `HALF_UP` |
| Kwalifikowalność | wartość pozycji **po rabatach** (w tym kuponach rozłożonych na pozycje), z pominięciem kategorii wykluczonych (domyślnie karty podarunkowe, kaucje) |
| Minimum | brak punktów, gdy kwalifikująca się kwota < `minQualifyingGrosze` |
| Poziomy | wg punktów zdobytych w oknie `tierWindowDays` (365); awans natychmiast; spadek, gdy zwrot obniży punkty w oknie. Bonus poziomu = floor(bazowe × (mnożnik − 1)) |
| Kampanie | **nie sumują się**: jeden najlepszy mnożnik (od wartości pozycji z kategorii kampanii) + jeden najwyższy bonus kwotowy; mnożnik kampanii nie jest mnożony przez mnożnik poziomu |
| Zwroty | korekta proporcjonalna, liczona **kumulatywnie** (suma korekt przy pełnym zwrocie = punkty naliczone). Obejmuje proporcjonalnie bonusy. Saldo może być ujemne (`allowNegativeBalance`); ujemne saldo blokuje wymiany |
| Anulowanie | tylko sprzedaż bez zwrotów; cofa wszystkie punkty, zwalnia kupony (wracają do puli, jeśli ważne) |
| Kupony | jednorazowe; wygasłe nie zwracają punktów; zwrot towaru kupionego z kuponem nie przywraca kuponu; kategoria wykluczona nie liczy się do minimalnego koszyka |
| Wymiana | wymaga aktywnej karty, salda ≥ koszt, poziomu (jeśli wymagany), zapasu i limitu na klienta |
| Korekty ręczne | powód ≥ 10 znaków, limit `maxManualAdjustment` (powyżej — administrator), wpis w rejestrze + audyt + powiadomienie klienta |
| Opóźnione transakcje | POS może przesłać transakcję do 14 dni wstecz (np. po awarii łącza); starsze — korekta ręczna |

## 6. Spójność salda i współbieżność

- Każda zmiana salda przechodzi przez `postLedgerEntry` w transakcji bazodanowej: `SELECT … FOR UPDATE` na wierszu karty →
  walidacja → `UPDATE pointsBalance` → `INSERT` do rejestru z `balanceAfter`.
- Unikalność: `Transaction(integrationId, externalId)`, `PointsLedger.idempotencyKey`, `PosRequestLog(integrationId, idempotencyKey)`,
  częściowy indeks na aktywną realizację kuponu.
- Kupon: atomowe `UPDATE … WHERE status IN ('AVAILABLE','ACTIVATED') AND expiresAt > now()`; liczba zmienionych wierszy musi wynosić 1.
- Zapas nagrody: `UPDATE … SET stock = stock - 1 WHERE stock > 0`.
- Zwroty do jednego paragonu serializowane blokadą wiersza sprzedaży.
- Kontrola: `balanceIntegrityCheck()` (pulpit, raporty, test) — saldo = suma rejestru.

## 7. Przepływy

**Rejestracja:** formularz → `POST /api/v1/auth/register` → użytkownik + profil + karta (numer z Luhnem) + zgody
(wymagane: regulamin, polityka; marketingowe domyślnie „nie”) → sesja (ciasteczko HttpOnly) → ekran karty.

**Zakup:** klient pokazuje QR (`ZZ1.<karta>.<okno 30 s>.<HMAC>`, ważny 5 min) → kasa `identify` → opcjonalnie `coupons/redeem`
→ po płatności `transactions` → serwer liczy punkty z danych POS (nigdy z danych od klienta) → rejestr + poziom + powiadomienie.

**Wymiana:** `POST /api/v1/rewards/:id/redeem` z `Idempotency-Key` → blokada karty → kontrole → kupon + wpis REDEEM.

**Zwrot:** `returns` (POS lub panel) → walidacja ilości → korekta kumulatywna → wpis RETURN_REVERSAL.

## 8. Ekrany

Klient: Witaj, Logowanie, Rejestracja, Odzyskiwanie hasła, Nowe hasło, Start, Karta, Nagrody, Moje kupony, Porady, Porada,
Kalendarz, Profil, Moje dane, Zainteresowania, Prywatność i zgody, Zmiana hasła, Historia (punkty/zakupy), Szczegóły transakcji,
Lista zakupów, Ulubione, Powiadomienia, Sklep i kontakt, Pomoc i reklamacje, Regulamin, Polityka prywatności.

Panel: Pulpit, Kasa demo, Klienci, Klient, Transakcje, Transakcja (zwrot/anulowanie), Reklamacje, Nagrody (+ formularz),
Kampanie (+ formularz, wysyłka powiadomień), Porady i kalendarz (+ formularz), Raporty, Reguły programu (wersje, poziomy),
Zespół i role (pracownicy, macierz uprawnień), Integracje POS (klucze, dziennik żądań), Dziennik audytu.
