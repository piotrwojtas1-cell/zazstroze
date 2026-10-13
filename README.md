# Zielony Zakątek — aplikacja lojalnościowa sklepu ogrodniczego

Cyfrowa karta stałego klienta z programem punktowym, katalogiem nagród, kuponami, poradami ogrodniczymi,
panelem administracyjnym i warstwą integracji z systemem kasowym (POS).

> **Ważne:** przelicznik punktów (1 pkt za 1 zł), ceny nagród (np. rabat 5 zł za 100 pkt), progi poziomów
> i treści regulaminu/polityki prywatności to **konfiguracja demonstracyjna**. Nie są zatwierdzoną polityką
> biznesową ani dokumentami zweryfikowanymi prawnie. Wszystkie wartości programu zmienisz w panelu
> (Reguły programu, Nagrody, Kampanie) bez zmian w kodzie.

## Spis treści

1. [Co zawiera projekt](#co-zawiera-projekt)
2. [Wymagania](#wymagania)
3. [Szybki start (lokalnie)](#szybki-start-lokalnie)
4. [Zmienne środowiskowe](#zmienne-środowiskowe)
5. [Baza danych: migracje i dane demonstracyjne](#baza-danych-migracje-i-dane-demonstracyjne)
6. [Pierwszy administrator](#pierwszy-administrator)
7. [Testy, lint, build](#testy-lint-build)
8. [Wdrożenie produkcyjne](#wdrożenie-produkcyjne)
9. [Kopia zapasowa i odtwarzanie bazy](#kopia-zapasowa-i-odtwarzanie-bazy)
10. [Integracje wymagające danych zewnętrznych](#integracje-wymagające-danych-zewnętrznych)
11. [Dokumentacja szczegółowa](#dokumentacja-szczegółowa)

## Co zawiera projekt

| Obszar | Zakres |
|---|---|
| Aplikacja klienta (PWA, mobile-first) | Start, Karta (dynamiczny kod QR), Nagrody i kupony, Porady + kalendarz prac, Profil; historia punktów i zakupów, lista zakupów, ulubione, powiadomienia, sklep i kontakt, pomoc i reklamacje, prywatność i zgody, eksport i usunięcie danych |
| Program lojalnościowy (serwer) | konfigurowalny przelicznik, niezmienny rejestr punktów, poziomy członkostwa, kampanie (mnożniki/bonusy), wymiana na nagrody, kupony (dostępny/aktywowany/wykorzystany/wygasły/anulowany), zwroty, anulowania, korekty z powodem, idempotencja, blokady wierszy |
| Panel administracyjny | pulpit KPI, klienci, korekty punktów, kasa demonstracyjna, transakcje/zwroty, reklamacje, nagrody, kampanie, porady i kalendarz, raporty, reguły programu i poziomy, zespół/role/uprawnienia, integracje POS, dziennik audytu |
| Integracja POS | API `/api/pos/v1/*` z podpisami HMAC-SHA256, ochroną przed powtórzeniem, `Idempotency-Key`, dziennikiem żądań; adapter demonstracyjny + interfejs adaptera dla dostawców |
| Jakość | 35 testów jednostkowych, 41 integracyjnych (prawdziwa baza PostgreSQL), 10 E2E (Playwright, w tym axe/WCAG i responsywność) |

Stos: **Next.js 15 (App Router) + TypeScript + PostgreSQL 16 + Prisma 6 + Zod + Tailwind CSS 4**, testy **Vitest** i **Playwright**.
Uzasadnienie i architektura: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Wymagania

- Node.js ≥ 20.11 (testowane na 22.x), npm ≥ 10
- PostgreSQL ≥ 14 (testowane na 16)
- (testy E2E) przeglądarka Chromium dla Playwright: `npx playwright install chromium`

## Szybki start (lokalnie)

```bash
# 1. Zależności (postinstall generuje klienta Prisma)
npm install

# 2. Baza danych (przykład dla lokalnego PostgreSQL)
createuser -P loyalty            # ustaw hasło
createdb -O loyalty loyalty

# 3. Konfiguracja
cp .env.example .env
#   uzupełnij DATABASE_URL i wygeneruj sekrety:
node -e "for (const k of ['ENCRYPTION_KEY','CARD_QR_SECRET','HASH_PEPPER']) console.log(k + '=\"' + require('crypto').randomBytes(32).toString('base64') + '\"')"

# 4. Migracje + dane demonstracyjne (gdy DEMO_MODE="true")
npm run db:migrate
npm run db:seed

# 5. Uruchomienie
npm run dev            # http://localhost:3000
```

Konta demonstracyjne (tworzone tylko przy `DEMO_MODE="true"` lub `SEED_DEMO="true"`; **nie używaj na produkcji**):

| Rola | E-mail | Hasło |
|---|---|---|
| Klient | `anna.demo@example.com` (oraz `klient01…34@example.com`) | `Ogrodnik2026` |
| Administrator | `admin@zielonyzakatek.example` | `AdminDemo2026` |
| Kierownik | `kierownik@zielonyzakatek.example` | `KierownikDemo2026` |
| Pracownik obsługi | `obsluga@zielonyzakatek.example` | `ObslugaDemo2026` |

### Demonstracyjny przepływ kasowy

1. Zaloguj się jako klient → zakładka **Karta** (kod QR odświeża się co 30 s, numer karty jest pod kodem).
2. W drugim oknie zaloguj się jako pracownik → **Panel → Kasa demo**.
3. Wklej treść kodu QR (atrybut `data-payload` lub zeskanuj czytnikiem/aparatem) albo wpisz 16-cyfrowy numer karty.
4. Dodaj produkty, opcjonalnie zastosuj kupon klienta, kliknij **Zakończ sprzedaż** — punkty są naliczane na serwerze.
5. Zwrot/anulowanie: **Transakcje → szczegóły paragonu** (dla paragonów z kasy demo).

Ten sam przepływ przez API POS z podpisami HMAC:

```bash
npm run pos:simulate -- --card 2900XXXXXXXXXXXX
```

## Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DATABASE_URL` | tak | Połączenie PostgreSQL (`postgresql://user:pass@host:5432/db?schema=public`) |
| `APP_URL` | tak | Publiczny adres aplikacji (linki w e-mailach, kontrola nagłówka `Origin`, flaga `Secure` ciasteczek gdy `https://`) |
| `ENCRYPTION_KEY` | tak | 32 bajty w base64 — AES-256-GCM do szyfrowania sekretów integracji POS |
| `CARD_QR_SECRET` | tak | ≥ 32 znaki — HMAC dynamicznych kodów QR |
| `HASH_PEPPER` | tak | ≥ 32 znaki — pieprz do haszowania adresów IP (limity, logi) |
| `DEMO_MODE` | nie (`false`) | `true`: dane logowania demo na ekranie logowania, seed danych demo |
| `MAIL_PROVIDER` | nie (`console`) | Dostawca e-mail; obecnie tylko `console` (patrz niżej) |
| `TRUST_PROXY` | nie (`false`) | `true` tylko za zaufanym reverse proxy ustawiającym `X-Forwarded-For` (limity żądań per IP) |
| `SEED_DEMO` | nie | `true` wymusza dane demo w seedzie niezależnie od `DEMO_MODE` |
| `ADMIN_PASSWORD` | nie | Hasło dla `npm run admin:create` (inaczej generowane losowo) |

Sekrety trafiają wyłącznie do zmiennych środowiskowych serwera — nie ma ich w kodzie klienta ani w repozytorium
(`.env*` poza `.env.example` jest w `.gitignore`).

## Baza danych: migracje i dane demonstracyjne

| Polecenie | Działanie |
|---|---|
| `npm run db:migrate` | `prisma migrate deploy` — stosuje migracje (produkcja/CI) |
| `npm run db:migrate:dev` | tworzy nową migrację w trakcie rozwoju (zob. uwaga niżej) |
| `npm run db:seed` | dane referencyjne (role, uprawnienia, poziomy, konfiguracja v1, produkty, porady, kalendarz, przykładowe nagrody i kampanie) + dane demo przy `DEMO_MODE=true` |
| `npm run jobs:run` | zadania cykliczne: wygaszanie kuponów, czyszczenie sesji/tokenów, przypomnienia o wygasających kuponach, retencja logów POS |

Migracja `20261013090000_integrity` dodaje elementy, których Prisma nie wyraża w schemacie: triggery
blokujące `UPDATE/DELETE` w `PointsLedger` i `AuditLog`, ograniczenia `CHECK`, częściowy indeks unikalny
(jedna aktywna realizacja kuponu, jedna aktywna konfiguracja). Tworząc kolejne migracje przez
`prisma migrate dev --create-only`, **przejrzyj wygenerowany SQL** i usuń ewentualne polecenia
`DROP INDEX` dla tych indeksów.

Seed jest idempotentny dla danych referencyjnych; dane demo dodaje tylko raz. Nie zawiera prawdziwych danych
osobowych (adresy w domenach `example.com` / `.example`).

## Pierwszy administrator

Na produkcji (`DEMO_MODE=false`) seed nie tworzy kont. Utwórz administratora:

```bash
ADMIN_PASSWORD='Silne-Haslo-2026' npm run admin:create -- --email admin@twojsklep.pl --name "Jan"
# bez ADMIN_PASSWORD hasło tymczasowe zostanie wygenerowane i wypisane jednorazowo
```

Kolejnych pracowników i role nadajesz w panelu: **Zespół i role**. Uprawnienia ról są edytowalne
(macierz uprawnień); system pilnuje, by zawsze istniał co najmniej jeden aktywny administrator.

## Testy, lint, build

```bash
npm run lint          # ESLint (next/core-web-vitals + typescript), 0 ostrzeżeń
npm run typecheck     # tsc --noEmit
npm test              # Vitest: testy jednostkowe + integracyjne (wymaga bazy testowej)
npm run build         # build produkcyjny Next.js
npm run test:e2e      # Playwright: buduje się osobno — uruchom najpierw `npm run build`
```

Testy integracyjne używają **osobnej bazy** z pliku `.env.test` (`DATABASE_URL` musi zawierać `test`,
inaczej testy odmówią startu). Przykład:

```bash
createdb -O loyalty loyalty_test
createdb -O loyalty loyalty_e2e          # baza dla E2E (czyszczona przy każdym uruchomieniu)
sed 's#/loyalty?#/loyalty_test?#; s#APP_URL=.*#APP_URL="http://localhost:3100"#' .env > .env.test
```

E2E uruchamia `next start` na porcie 3100 z bazą `loyalty_e2e` (seed demo przy każdym starcie).
Jeśli Playwright wymaga innej wersji przeglądarki, wskaż ją: `PW_CHROMIUM_PATH=/ścieżka/do/chrome`.

## Wdrożenie produkcyjne

1. PostgreSQL z kopiami zapasowymi (zob. niżej), użytkownik aplikacji bez uprawnień superużytkownika.
2. Zmienne środowiskowe jak w tabeli; `DEMO_MODE=false`, `APP_URL=https://…` (ciasteczka `Secure`, nagłówek HSTS).
3. Build i migracje (np. w kroku release): `npm ci && npm run build && npm run db:migrate && npm run db:seed`.
4. Start: `npm start` (port przez `PORT` lub `-p`). Za reverse proxy (nginx/Caddy/platforma) z TLS;
   ustaw `TRUST_PROXY=true` tylko gdy proxy nadpisuje `X-Forwarded-For`.
5. Harmonogram: `npm run jobs:run` co godzinę (cron, Kubernetes CronJob, scheduler platformy).
6. Monitoring: sonda `GET /api/health` (sprawdza połączenie z bazą); błędy POS widoczne w panelu → Integracje
   (dziennik żądań, filtr „Tylko błędy”) i w logach serwera (`[pos]`, `[api]`).
7. Utwórz administratora (`npm run admin:create`) i integracje POS (panel lub `npm run pos:create`).

Aplikacja jest bezstanowa (sesje, limity żądań i idempotencja w PostgreSQL) — można uruchomić wiele instancji.

## Kopia zapasowa i odtwarzanie bazy

```bash
# Kopia (format custom, kompresja) — uruchamiaj codziennie, przechowuj poza serwerem, szyfruj
pg_dump --format=custom --no-owner --file=backups/loyalty-$(date +%F).dump "$DATABASE_URL"

# Weryfikacja kopii
pg_restore --list backups/loyalty-2026-10-13.dump | head

# Odtworzenie do NOWEJ, pustej bazy (nie nadpisuj produkcji bez decyzji!)
createdb -O loyalty loyalty_restore
pg_restore --no-owner --dbname="postgresql://loyalty:…@localhost:5432/loyalty_restore" backups/loyalty-2026-10-13.dump

# Kontrola spójności po odtworzeniu: saldo każdej karty = suma rejestru (oczekiwany wynik: 0 wierszy)
psql "$RESTORED_URL" -c 'SELECT c.id FROM "LoyaltyCard" c LEFT JOIN "PointsLedger" l ON l."cardId"=c.id GROUP BY c.id HAVING c."pointsBalance" <> COALESCE(SUM(l.points),0);'
```

Zalecenia: kopie codzienne + archiwizacja WAL (PITR) u dostawcy bazy, retencja zgodna z polityką firmy,
regularny test odtworzenia (np. raz w miesiącu). Kopie zawierają dane osobowe — szyfruj je i ograniczaj dostęp.
Triggery niezmienności nie blokują `pg_restore` (dotyczą tylko `UPDATE`/`DELETE`).

## Integracje wymagające danych zewnętrznych

| Integracja | Stan | Co jest potrzebne |
|---|---|---|
| System kasowy (POS) | adapter **demonstracyjny** + API z HMAC; kasa demo w panelu | dokumentacja API/webhooków dostawcy, środowisko testowe, mapowanie kategorii i SKU, sposób przekazywania kodu karty — szczegóły w [`docs/POS_INTEGRATION.md`](docs/POS_INTEGRATION.md) |
| Wysyłka e-mail | kolejka `EmailOutbox` + dostawca `console` (zapis i log — **wiadomości nie są wysyłane**) | konto SMTP/API (np. dostawcy transakcyjnego), domena z SPF/DKIM/DMARC; implementacja adaptera w `src/server/services/mail.ts` |
| SMS / push | zgody i preferencje są zbierane; brak wysyłki | dostawca SMS, klucze Web Push (VAPID) / FCM |
| Mapy | link do OpenStreetMap | opcjonalnie klucz dostawcy map |
| Dokumenty prawne | szablony regulaminu i polityki prywatności | weryfikacja prawnika, dane administratora, okresy retencji |

## Dokumentacja szczegółowa

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stos, struktura katalogów, model danych, role, przepływy, reguły programu
- [`docs/API.md`](docs/API.md) — dokumentacja API (klient, admin, POS), format błędów
- [`docs/POS_INTEGRATION.md`](docs/POS_INTEGRATION.md) — integracja z kasą: podpisy, idempotencja, adaptery, checklista dla dostawcy
- [`docs/SECURITY_PRIVACY.md`](docs/SECURITY_PRIVACY.md) — bezpieczeństwo, prywatność, RODO (zakres techniczny), dostępność
- [`docs/TESTING.md`](docs/TESTING.md) — zakres testów i wyniki
