# Testy i jakość

Stan na 13.10.2026 (Node 22, PostgreSQL 16, Chromium dla Playwright 1.56). Wszystkie wyniki poniżej pochodzą z faktycznych uruchomień.

| Kontrola | Polecenie | Wynik |
|---|---|---|
| Lint | `npm run lint` | 0 błędów, 0 ostrzeżeń |
| Typy | `npm run typecheck` | 0 błędów (TypeScript strict + `noUncheckedIndexedAccess`) |
| Jednostkowe + integracyjne | `npm test` | **76/76** (7 plików) |
| Build produkcyjny | `npm run build` | sukces |
| E2E (Playwright, build produkcyjny z CSP) | `npm run test:e2e` | **10/10** (projekty: mobile — Pixel 7, desktop 1366×900) |
| API POS przez HTTP (ręcznie) | `npm run pos:simulate -- --card …` | identyfikacja, sprzedaż, ponowienie z pamięci idempotencji, zwrot — OK |

## Co jest testowane

**Jednostkowe** (`tests/unit`, 35): przelicznik i zaokrąglenia (BigInt, brak błędów float), kategorie wykluczone, minimalny koszyk,
bonus poziomu, niesumowanie kampanii, kumulatywna korekta zwrotów (suma = punkty naliczone), rabaty kuponów (kwotowy, procentowy
z limitem, nie więcej niż koszyk), Luhn, parsowanie kwot, odmiana liczebników, rozkład rabatu na pozycje, polityka haseł,
podpis HMAC (poprawny, zmienione ciało, inna ścieżka, przeterminowany znacznik, brak nagłówków), dynamiczny QR (świeży,
podrobiony, przeterminowany, ręczny numer), regresja schematu dat nagrody.

**Integracyjne** (`tests/integration`, 41 — prawdziwa baza PostgreSQL `*_test`):
- rejestracja (karta, zgody marketingowe domyślnie odrzucone, argon2id, ciasteczko HttpOnly), walidacja, duplikat konta;
- logowanie, jednolity komunikat błędu, wylogowanie, blokada po 5 próbach, odzyskiwanie hasła (jednorazowy token, unieważnienie sesji);
- autoryzacja: 401 bez sesji, 403 klient w panelu, izolacja transakcji między klientami, brak możliwości naliczenia punktów przez klienta;
- role: obsługa bez korekt, kierownik do limitu, administrator powyżej limitu; kierownik bez konfiguracji programu; obsługa bez nagród;
- CSRF (obcy `Origin`, brak `Origin`), wymagany `Idempotency-Key`, przewidywalne błędy walidacji;
- naliczanie punktów, **brak podwójnego naliczenia** (sekwencyjnie i 6 równoległych żądań), kampanie, awans poziomu;
- wymiana na nagrodę: brak punktów, sukces, idempotencja (3 równoległe z tym samym kluczem → 1 kupon), **4 równoległe wymiany** przy saldzie na jedną → 1 sukces, zapas, limit na klienta;
- kupony: **8 równoległych prób użycia** → dokładnie 1 sukces, cudza karta, za mały koszyk, ponowne użycie, zwolnienie, **wygasanie**, aktywacja;
- zwroty częściowe/pełne (suma korekt = naliczone), duplikat zwrotu, saldo ujemne po zwrocie wydanych punktów, anulowanie ze zwolnieniem kuponu;
- spójność salda po serii równoległych operacji; triggery blokujące `UPDATE/DELETE` rejestru i audytu;
- API POS przez handlery HTTP: QR, błędny podpis/ciało/czas/nieaktywna integracja, idempotencja (powtórka, nowy klucz, klucz z innym ciałem), walidacja i dziennik błędów, kupon i zwrot;
- raporty (rejestracje, sprzedaż, średni koszyk, częstotliwość, punkty, nagrody, koszt kuponów, KPI pulpitu) na znanym zbiorze danych;
- powiadomienia marketingowe tylko do osób ze zgodą; prywatność: historia zgód, eksport bez hasła, anonimizacja konta.

**E2E** (`e2e`, 10):
- pełna ścieżka: rejestracja → karta z QR → kasa demo (identyfikacja kodem QR) → +263 pkt (z kampanią) → saldo i historia →
  wymiana na kupon → kupon zastosowany w kasie → ponowne użycie odrzucone → zwrot jednej pozycji (−109 pkt);
- administrator tworzy nagrodę widoczną w katalogu klienta; pracownik obsługi bez dostępu do nagród i konfiguracji (UI i API);
  klient bez dostępu do panelu; korekta punktów z powodem widoczna w audycie; raporty i kontrola spójności;
- **dostępność** (axe-core, WCAG 2.0/2.1 A/AA, 0 naruszeń serious/critical) i **responsywność** (brak poziomego przewijania)
  na 17 ekranach — w widoku mobilnym i desktopowym.

## Czego nie przetestowano (i dlaczego)

- **Integracja z prawdziwym systemem POS** — brak dokumentacji i środowiska dostawcy; testowany jest adapter demonstracyjny i kontrakt API.
- **Wysyłka e-mail/SMS/push** — brak dostawców; testowany jest zapis do kolejki `EmailOutbox` (link resetu hasła).
- **Skanowanie aparatem** (BarcodeDetector) — wymaga fizycznej kamery; testowane jest wpisanie treści QR/numeru (jak czytnik-klawiatura).
- **Service worker/offline** — rejestrowany tylko w produkcji; nie ma testu automatycznego trybu offline.
- **Ręczny audyt czytnikiem ekranu** i testy na fizycznych urządzeniach iOS/Android — poza zakresem automatyzacji.
- **Testy obciążeniowe** — nie wykonano; poprawność współbieżna weryfikowana testami równoległymi na jednej instancji bazy.

## Znane uwagi z `npm audit`

Zgłoszenia dotyczą zależności narzędziowych/deweloperskich (Vitest/tinypool, eslint-config-next, Prisma CLI) oraz
PostCSS wbudowanego w Next.js 15 (używany przy budowaniu CSS). Proponowane „poprawki” to skoki do wersji
głównych (Next 16, Vitest 5) — do zaplanowania jako osobna aktualizacja z ponownym przejściem testów.
