# Dokumentacja API

Wszystkie odpowiedzi to JSON (`Cache-Control: no-store`). Kwoty w **groszach** (liczby całkowite), daty w ISO 8601 (UTC).

## Konwencje

**Uwierzytelnienie (API `/api/v1`)** — ciasteczko sesji `zz_session` (HttpOnly, SameSite=Lax, Secure przy HTTPS),
ustawiane przez rejestrację/logowanie. Sesja klienta: 30 dni, pracownika: 12 h. Zmiana hasła unieważnia pozostałe sesje.

**CSRF** — żądania `POST/PUT/PATCH/DELETE` muszą mieć nagłówek `Origin` równy originowi aplikacji (lub `Sec-Fetch-Site: same-origin`).

**Idempotencja** — operacje wymiany punktów i korekt wymagają `Idempotency-Key` (8–100 znaków `[A-Za-z0-9_-]`).
Powtórzenie z tym samym kluczem zwraca wynik pierwszego wywołania.

**Limity żądań** — 300/min na użytkownika; logowanie 30/15 min na IP + blokada konta po 5 nieudanych próbach (15 min);
rejestracja 10/h/IP; odzyskiwanie hasła 10/h/IP i 3/h/e-mail; wymiany 20/10 min. Przekroczenie → `429` z `Retry-After`.

**Format błędu**

```json
{ "error": { "code": "INSUFFICIENT_POINTS", "message": "Brakuje Ci 120 pkt do tej nagrody.", "details": { "balance": 160, "required": 280 } } }
```

| HTTP | Kody |
|---|---|
| 400 | `BAD_REQUEST`, `INVALID_TOKEN` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `INVALID_SIGNATURE` |
| 403 | `FORBIDDEN`, `TIER_REQUIRED` |
| 404 | `NOT_FOUND`, `CARD_NOT_FOUND`, `TRANSACTION_NOT_FOUND` (także dla cudzych zasobów — bez ujawniania ich istnienia) |
| 409 | `CONFLICT`, `INSUFFICIENT_POINTS`, `REWARD_UNAVAILABLE`, `OUT_OF_STOCK`, `LIMIT_REACHED`, `COUPON_INVALID`, `COUPON_ALREADY_USED`, `COUPON_EXPIRED`, `BASKET_TOO_SMALL`, `CARD_INACTIVE`, `QR_EXPIRED` |
| 422 | `VALIDATION_ERROR` (`details`: lista `{ path, message }`), `TRANSACTION_MISMATCH`, `RETURN_EXCEEDS_SALE`, `IDEMPOTENCY_KEY_REUSED` |
| 423 | `ACCOUNT_LOCKED` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` (z `requestId` do korelacji z logiem) |

## Uwierzytelnianie

| Metoda i ścieżka | Ciało | Opis |
|---|---|---|
| `POST /api/v1/auth/register` | `{ email, password, firstName, acceptTerms: true, acknowledgePrivacy: true, marketingEmail?, marketingSms?, marketingPush?, personalization?, interests?: string[] }` | `201`, ustawia sesję. Zgody marketingowe domyślnie `false` |
| `POST /api/v1/auth/login` | `{ email, password }` | `{ user, redirectTo }`, ustawia sesję |
| `POST /api/v1/auth/logout` | — | usuwa sesję |
| `POST /api/v1/auth/forgot-password` | `{ email }` | zawsze `200` (bez ujawniania istnienia konta); link ważny 30 min |
| `POST /api/v1/auth/reset-password` | `{ token, password }` | jednorazowy token; usuwa wszystkie sesje |
| `GET /api/v1/auth/me` | — | bieżący użytkownik, role, uprawnienia |

## Klient (`auth: customer`)

| Metoda i ścieżka | Opis |
|---|---|
| `GET /api/v1/me/card` | numer, status, saldo, poziom, postęp do następnego poziomu |
| `GET /api/v1/me/card/qr` | `{ payload, svg, expiresInSec }` — świeży podpisany kod QR |
| `GET /api/v1/me/history?cursor=&take=` | rejestr punktów (paginacja kursorem) |
| `GET /api/v1/me/transactions`, `GET /api/v1/me/transactions/:id` | zakupy i zwroty; szczegóły z kalkulacją punktów |
| `GET /api/v1/me/coupons` | `{ active, used, expired }` |
| `POST /api/v1/me/coupons/:id/activate` · `DELETE …` | aktywacja (kasa zastosuje automatycznie) / dezaktywacja |
| `GET /api/v1/rewards` *(public)* | katalog nagród |
| `POST /api/v1/rewards/:id/redeem` + `Idempotency-Key` | wymiana punktów → `{ coupon, pointsBalance, replayed }` |
| `GET /api/v1/me/profile` · `PATCH` | profil `{ firstName, lastName?, phone?, postalCode?, birthMonth? }` |
| `GET /api/v1/me/consents` · `PUT` | historia zgód / ustawienie `{ marketingEmail, marketingSms, marketingPush, personalization }` |
| `PUT /api/v1/me/interests` | `{ interests: string[] }` |
| `POST /api/v1/me/password` | `{ currentPassword, newPassword }` |
| `GET /api/v1/me/export` | eksport danych (plik JSON) |
| `POST /api/v1/me/delete` | `{ password, confirm: "USUŃ" }` — anonimizacja konta |
| `GET /api/v1/me/notifications`, `POST …/:id/read`, `POST …/read-all` | centrum powiadomień |
| `GET/POST /api/v1/me/shopping-list`, `PATCH/DELETE …/:id`, `POST …/clear-done` | lista zakupów |
| `GET /api/v1/me/favorites`, `PUT/DELETE …/:productId` | ulubione produkty |
| `GET/POST /api/v1/me/complaints` | reklamacje `{ subject, description, transactionId? }` |

Publiczne: `GET /api/v1/articles?interest=&month=&q=`, `GET /api/v1/articles/:slug`, `GET /api/v1/campaigns`,
`GET /api/v1/products?q=`, `GET /api/v1/garden-calendar`, `GET /api/v1/store`, `GET /api/health`.

## Panel administracyjny (`auth: staff` + uprawnienie)

| Metoda i ścieżka | Uprawnienie |
|---|---|
| `GET /api/v1/admin/dashboard` | dashboard.view |
| `GET /api/v1/admin/customers?q=`, `GET …/customers/:id` | customers.view |
| `POST /api/v1/admin/cards/:id/adjust` + `Idempotency-Key` — `{ points, reason }` | points.adjust (+ points.adjust.large powyżej limitu) |
| `PUT /api/v1/admin/cards/:id/status` — `{ status: ACTIVE\|BLOCKED, reason }` | customers.manage |
| `POST /api/v1/admin/coupons/:id/cancel` — `{ refundPoints, reason }` | coupons.manage (+ points.adjust przy zwrocie punktów) |
| `GET/POST /api/v1/admin/rewards`, `PUT …/:id` | rewards.manage |
| `GET/POST /api/v1/admin/campaigns`, `PUT …/:id`, `POST …/:id/notify` | campaigns.manage |
| `GET/POST /api/v1/admin/articles`, `PUT …/:id`; `POST /api/v1/admin/garden-tasks`, `PUT/DELETE …/:id` | content.manage |
| `GET/PUT /api/v1/admin/config`, `PUT /api/v1/admin/tiers/:id` | config.manage |
| `GET /api/v1/admin/transactions?type=&status=&q=`, `GET …/:id` | transactions.view |
| `GET /api/v1/admin/complaints?status=`, `PATCH …/:id` | complaints.manage |
| `GET /api/v1/admin/reports?from=&to=`, `GET …/reports/integrity` | reports.view |
| `GET/POST /api/v1/admin/staff`, `PUT …/:id`; `GET /api/v1/admin/roles`, `PUT …/:id` | roles.manage |
| `GET/POST /api/v1/admin/integrations`, `PATCH …/:id`, `GET …/requests?errors=1` | integrations.manage |
| `GET /api/v1/admin/audit?action=&entityId=` | audit.view |
| `POST /api/v1/admin/pos/{identify,coupons/validate,coupons/redeem,coupons/release,sale,return,void}` | pos.operate (kasa demonstracyjna; te same ciała co API POS) |

Operacje zmieniające dane w panelu zapisują wpis w niezmiennym `AuditLog` (kto, co, kiedy, przed/po, powód).

## API POS (`/api/pos/v1`)

Szczegóły podpisu, idempotencji i adapterów: [`POS_INTEGRATION.md`](POS_INTEGRATION.md).

| Ścieżka | Ciało (format DEMO) | Odpowiedź |
|---|---|---|
| `POST /identify` | `{ cardCode }` (treść QR lub numer karty) | `{ cardNumber, method, customerName, tier, pointsBalance, coupons[] }` |
| `POST /coupons/validate` | `{ couponCode, cardCode, externalTransactionId, basketGrosze, items?[{category,totalGrosze}] }` | `{ valid, discountGrosze }` |
| `POST /coupons/redeem` | jw. | `{ redemptionId, couponCode, discountGrosze }` |
| `POST /coupons/release` | `{ couponCode, externalTransactionId, reason? }` | `{ released: true }` |
| `POST /transactions` | `{ externalId, cardCode, storeCode?, occurredAt, totalGrosze, items[{ sku, name, category, quantity, unitPriceGrosze, discountGrosze }] }` | `{ transactionId, pointsAwarded, pointsBalance, duplicate }` |
| `POST /returns` | `{ externalId, originalExternalId, occurredAt, items[{ sku, quantity }], reason? }` | `{ refundGrosze, pointsReversed, pointsBalance, duplicate }` |
| `POST /transactions/void` | `{ externalId, reason }` | `{ status: "VOIDED", pointsReversed }` |
