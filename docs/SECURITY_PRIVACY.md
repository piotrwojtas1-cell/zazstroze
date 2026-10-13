# Bezpieczeństwo, prywatność i dostępność

> Opisane mechanizmy to zabezpieczenia techniczne. **Nie stanowią deklaracji pełnej zgodności z RODO** —
> zgodność wymaga analizy prawnej (podstawy przetwarzania, rejestr czynności, DPIA dla profilowania, umowy powierzenia,
> okresy retencji, treść klauzul). Treści regulaminu i polityki prywatności w aplikacji są szablonami do weryfikacji.

## Uwierzytelnianie i sesje

- Hasła: argon2id (m = 19 MiB, t = 2, p = 1). Polityka: ≥ 10 znaków, litera + cyfra, lista popularnych haseł.
- Brute force: limit 30 prób logowania / 15 min / IP oraz blokada konta na 15 min po 5 błędnych hasłach;
  wyrównanie czasu odpowiedzi dla nieistniejących kont; jednolity komunikat błędu.
- Sesje: losowy token 256-bit w ciasteczku `HttpOnly`, `SameSite=Lax`, `Secure` (HTTPS); w bazie tylko SHA-256 tokenu.
  Klient 30 dni, pracownik 12 h. Zmiana/reset hasła unieważnia wszystkie wcześniejsze sesje; blokada konta pracownika usuwa jego sesje.
- Reset hasła: token 256-bit, w bazie tylko hash, ważny 30 min, jednorazowy, odpowiedź nie ujawnia istnienia konta.

## Autoryzacja

- Każdy endpoint deklaruje tryb (`public`/`customer`/`staff`/uprawnienie) — weryfikacja w `src/server/http.ts` po stronie serwera.
- Zasoby klienta filtrowane po `userId` z sesji; cudze zasoby → `404` (bez ujawniania istnienia).
- Panel: role i macierz uprawnień w bazie, zasada minimalnych uprawnień; ochrona przed usunięciem ostatniego administratora.
- Operacje zmieniające saldo: tylko przez rejestr w transakcji z blokadą; korekty z obowiązkowym powodem, limitem i audytem.

## Ochrona żądań

- CSRF: kontrola `Origin` dla żądań modyfikujących + `SameSite=Lax`.
- Walidacja wejścia: Zod na każdym endpoincie, limit rozmiaru ciała (100 kB API, 256 kB POS).
- Limity żądań w PostgreSQL (działają przy wielu instancjach), nagłówek `Retry-After`.
- Nagłówki: CSP z nonce i `strict-dynamic`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy` (kamera tylko dla własnego originu), HSTS przy HTTPS, brak `X-Powered-By`.
- POS: HMAC-SHA256 z czasem (±300 s), porównanie w stałym czasie, sekrety szyfrowane AES-256-GCM, idempotencja, dziennik.
- Dynamiczny QR karty z HMAC — zrzut ekranu traci ważność po 5 min.
- Błędy 500 nie ujawniają szczegółów (identyfikator `requestId` w logu serwera).

## Sekrety

Wyłącznie w zmiennych środowiskowych serwera (walidowane przy starcie, `src/server/env.ts`). Kod serwerowy oznaczony
`import "server-only"` — nie może trafić do paczki przeglądarki. Repozytorium zawiera tylko `.env.example`.

## Integralność danych

- `PointsLedger` i `AuditLog` — triggery bazodanowe blokują `UPDATE` i `DELETE`; historia zgód — blokada `UPDATE`.
- `CHECK` na kwotach/punktach/datach; unikalności zapobiegające podwójnemu przetworzeniu.
- Kontrola spójności salda w pulpicie i raportach.

## Prywatność (zakres techniczny)

| Wymaganie | Realizacja |
|---|---|
| Minimalizacja | wymagane tylko e-mail, imię i hasło; reszta opcjonalna (miesiąc urodzin zamiast daty); IP przechowywane jako hash z pieprzem; kasa widzi tylko imię i inicjał |
| Zgody | oddzielne, dobrowolne, **domyślnie niezaznaczone** (e-mail, SMS, w aplikacji, personalizacja); historia udzielenia i wycofania z wersją dokumentu i źródłem; wycofanie w Profil → Prywatność |
| Rozdział komunikacji | kategorie powiadomień `TRANSACTIONAL`/`SYSTEM` vs `MARKETING`; wysyłka marketingowa wyłącznie do osób ze zgodą `MARKETING_PUSH`, targetowanie po zainteresowaniach tylko przy zgodzie na personalizację |
| Prawo dostępu / przenoszenia | eksport JSON (Profil → Prywatność → Pobierz moje dane), rejestrowany w `DataRequest` |
| Usunięcie | samoobsługowa anonimizacja konta (e-mail, dane profilu, sesje, zainteresowania, lista zakupów, powiadomienia; karta zamknięta, kupony anulowane, zgody marketingowe wycofane); transakcje i rejestr punktów zachowane bez danych identyfikujących (wymogi rachunkowe — **okres do potwierdzenia przez prawnika**) |
| Retencja techniczna | sesje i tokeny usuwane po wygaśnięciu, dziennik POS 90 dni, liczniki limitów 1 dzień (`npm run jobs:run`) |
| Audyt | operacje pracowników na danych klientów i saldach w niezmiennym dzienniku |

Do decyzji biznesowo-prawnej: okresy przechowywania danych transakcyjnych i nieaktywnych kont, wygasanie punktów,
DPIA dla personalizacji, procedura obsługi żądań złożonych poza aplikacją (np. e-mailem), informacja o profilowaniu.

## Dostępność (WCAG 2.1 AA — zakres zweryfikowany automatycznie)

- Semantyczne nagłówki, etykiety pól, komunikaty błędów powiązane z polami (`aria-describedby`, `role="alert"`).
- Kontrast tekstu ≥ 4,5:1 (paleta dobrana pod kremowe/białe tła), widoczny fokus, link „Przejdź do treści”.
- Pola dotyku ≥ 44–48 px, dolna nawigacja z `aria-current`, przełączniki `role="switch"`, zakładki `role="tab"`.
- Okna modalne na natywnym `<dialog>` (fokus, Esc), komunikaty toast w `aria-live`.
- `prefers-reduced-motion` wyłącza animacje; kod QR ma opis tekstowy i numer karty jako alternatywę.
- Testy: axe-core (reguły WCAG 2.0/2.1 A/AA) na 17 ekranach w widoku mobilnym — 0 naruszeń „serious/critical”.
  Testy automatyczne nie zastępują audytu z czytnikiem ekranu (NVDA/VoiceOver) — zalecany przed wdrożeniem.
