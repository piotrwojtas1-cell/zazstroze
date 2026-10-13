# Integracja z systemem kasowym (POS)

> Projekt **nie zawiera integracji z żadnym konkretnym systemem kasowym** — nie zakładamy znajomości API
> dostawcy. Zawiera: stabilny kontrakt API, warstwę bezpieczeństwa (HMAC, idempotencja, limity, dziennik),
> interfejs adaptera, **adapter demonstracyjny** (kanoniczny format JSON) oraz **symulator kasy**.

## 1. Zasady

1. **Punkty nalicza wyłącznie serwer** na podstawie transakcji przesłanej przez uwierzytelnioną integrację POS.
   Klient nie może przesłać salda ani „zgłosić” zakupu z przeglądarki (brak takiego endpointu).
2. Identyfikacja klienta: **dynamiczny kod QR** (`ZZ1.<numer>.<okno>.<HMAC>`, okno 30 s, ważność 5 min) lub numer karty
   (16 cyfr, suma Luhna) wpisany przez kasjera. Kasa w żądaniu `transactions` przekazuje numer karty otrzymany z `identify`.
3. **Brak połączenia z serwerem** → kasa nie nalicza punktów lokalnie. Może zbuforować transakcję i wysłać ją
   później (do 14 dni) — serwer i tak zweryfikuje kartę, sumy i idempotencję. Kasa nie może zastosować kuponu
   bez potwierdzenia `coupons/redeem` (ochrona przed podwójnym użyciem offline).
4. Każda transakcja ma unikalny `externalId` (numer paragonu) w obrębie integracji — ponowne przesłanie nie nalicza punktów drugi raz.

## 2. Uwierzytelnienie i podpis

Nagłówki każdego żądania:

| Nagłówek | Wartość |
|---|---|
| `X-ZZ-Key-Id` | publiczny identyfikator integracji (`pos_…`) |
| `X-ZZ-Timestamp` | czas UNIX w sekundach (dopuszczalne odchylenie ±300 s — ochrona przed powtórzeniem) |
| `X-ZZ-Signature` | `v1=` + hex(HMAC-SHA256(sekret, ciąg kanoniczny)) |
| `Idempotency-Key` | unikalny klucz operacji (8–128 znaków), np. UUID |
| `Content-Type` | `application/json` |

Ciąg kanoniczny (znaki nowej linii `\n`):

```
<timestamp>
<METODA HTTP>
<ścieżka, np. /api/pos/v1/transactions>
<sha256 hex surowego ciała żądania>
```

Przykład (Node.js) — ten sam kod używa `scripts/pos-simulator.ts` (`src/server/pos/signature.ts`):

```ts
const ts = String(Math.floor(Date.now() / 1000));
const bodyHash = createHash("sha256").update(rawBody).digest("hex");
const signature = "v1=" + createHmac("sha256", secret).update(`${ts}\nPOST\n${path}\n${bodyHash}`).digest("hex");
```

Sekret integracji jest pokazywany **jednorazowo** przy tworzeniu (panel → Integracje POS lub `npm run pos:create`),
w bazie przechowywany wyłącznie zaszyfrowany (AES-256-GCM, klucz `ENCRYPTION_KEY`). Integrację można wyłączyć jednym kliknięciem.

## 3. Idempotencja i ponowienia

- Ten sam `Idempotency-Key` + to samo ciało → zapamiętana odpowiedź (nagłówek `Idempotent-Replayed: true`).
- Ten sam klucz + inne ciało → `422 IDEMPOTENCY_KEY_REUSED`.
- Odpowiedzi `5xx` nie są zapamiętywane — ponów z tym samym kluczem (zalecany backoff wykładniczy: 1 s, 2 s, 4 s, 8 s…).
- Niezależnie od klucza: `externalId` sprzedaży/zwrotu jest unikalny (drugi raz → `duplicate: true`, bez zmiany salda);
  realizacja kuponu w tej samej transakcji POS jest idempotentna.

## 4. Przebieg transakcji

```
Kasa                                   Serwer
 │ POST /identify {cardCode}            │ weryfikacja QR/Luhn, karta aktywna
 │◄──── klient, saldo, kupony ──────────│ (tylko imię + inicjał nazwiska)
 │ POST /coupons/redeem (opcjonalnie)   │ atomowe AVAILABLE/ACTIVATED → USED
 │◄──── rabat ──────────────────────────│
 │ … płatność …                         │
 │ POST /transactions {items po rabacie}│ suma pozycji = totalGrosze, naliczenie, poziom
 │◄──── pointsAwarded, saldo ───────────│
 │ (przerwana sprzedaż)                 │
 │ POST /coupons/release                │ kupon wraca do puli
 │ (zwrot) POST /returns                │ korekta kumulatywna
 │ (storno) POST /transactions/void     │ cofnięcie punktów, zwolnienie kuponów
```

Rabaty z kuponów kasa rozkłada na pozycje (`discountGrosze`) — punkty liczone są od kwot po rabatach.
Kod referencyjny rozkładu: `src/lib/allocate.ts` (metoda największych reszt).

## 5. Monitoring

- Każde uwierzytelnione żądanie trafia do `PosRequestLog` (endpoint, status, kod błędu, czas). Panel → Integracje POS
  pokazuje dziennik z filtrem „Tylko błędy”; pulpit — liczbę błędów POS z 30 dni.
- Odrzucone podpisy i błędy 5xx są logowane po stronie serwera z prefiksem `[pos]`.
- Retencja dziennika: 90 dni (`npm run jobs:run`).
- Limit: 1200 żądań/min na integrację.

## 6. Podłączenie prawdziwego systemu kasowego

1. Zaimplementuj `PosAdapter` (`src/server/pos/adapter.ts`) mapujący format dostawcy na `NormalizedSale/Return/…`.
2. Dodaj wartość do `enum PosAdapterType` (migracja) i zarejestruj adapter w `getAdapter()` (`src/server/pos/integrations.ts`).
3. Jeśli dostawca wysyła **webhooki** z własnym schematem podpisu, dodaj trasę (np. `/api/pos/v1/webhooks/<dostawca>`)
   weryfikującą jego podpis, a następnie wywołującą te same funkcje z `src/server/pos/service.ts`.
4. Uzupełnij mapowanie kategorii towarowych (`category`) — od niego zależą wykluczenia i kampanie.
5. Testy: rozszerz `tests/integration/pos-api.test.ts` o przykładowe ładunki dostawcy.

### Checklista informacji od dostawcy kasy

- [ ] Dokumentacja API/SDK lub webhooków (format sprzedaży, zwrotu, storna, korekty), środowisko testowe (sandbox)
- [ ] Czy kasa może wywołać zewnętrzne API w trakcie paragonu (identyfikacja, kupon) — czy tylko po zamknięciu?
- [ ] Sposób odczytu kodu karty (skaner 2D jako klawiatura? pole „karta lojalnościowa”?)
- [ ] Unikalny identyfikator paragonu i jego zakres (per sklep? per kasa?) — mapowanie na `externalId`
- [ ] Jak przekazywane są rabaty (na pozycję / na paragon), VAT, kaucje, karty podarunkowe
- [ ] Kody kategorii i SKU (kartoteka towarowa), kody sklepów
- [ ] Obsługa trybu offline i kolejkowania, polityka ponowień, limity czasowe
- [ ] Mechanizm uwierzytelnienia po stronie dostawcy (czy obsłuży HMAC, mTLS, OAuth2?) i rotacja kluczy
- [ ] Adresy IP / allowlista, wymagania sieciowe, strefa czasowa znaczników czasu
- [ ] Umowa powierzenia przetwarzania danych (RODO), SLA, kontakt techniczny
