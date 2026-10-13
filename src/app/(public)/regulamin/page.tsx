import { LegalPage } from "@/components/app/legal-page";

export const metadata = { title: "Regulamin programu" };

export default function TermsPage() {
  return (
    <LegalPage title="Regulamin programu lojalnościowego" updated="1 października 2026">
      <h2>1. Organizator</h2>
      <p>Organizatorem programu „Zielony Zakątek — Klub Stałego Klienta” jest operator sklepu Zielony Zakątek (dane rejestrowe do uzupełnienia).</p>
      <h2>2. Uczestnictwo</h2>
      <ul>
        <li>W programie mogą uczestniczyć pełnoletnie osoby fizyczne dokonujące zakupów jako konsumenci.</li>
        <li>Udział jest bezpłatny i dobrowolny. Każdy uczestnik może posiadać jedną kartę.</li>
        <li>Karta ma postać cyfrową w aplikacji. Kod QR karty odświeża się automatycznie.</li>
      </ul>
      <h2>3. Punkty</h2>
      <ul>
        <li>Punkty są przyznawane za zakupy zarejestrowane w systemie kasowym sklepu po okazaniu karty, według zasad opublikowanych w aplikacji.</li>
        <li>Punktów nie przyznaje się za zakup kart podarunkowych, kaucji oraz innych kategorii wskazanych w aplikacji.</li>
        <li>Podstawą naliczenia jest kwota faktycznie zapłacona (po rabatach). Wynik zaokrągla się w dół do pełnego punktu.</li>
        <li>Zakupy niezarejestrowane z kartą można zgłosić w zakładce „Pomoc” w ciągu 14 dni, przedstawiając paragon.</li>
        <li>W przypadku zwrotu towaru punkty naliczone za zwrócone produkty są odejmowane. Może to spowodować ujemne saldo, które blokuje wymianę punktów do czasu jego wyrównania.</li>
        <li>Punkty nie podlegają wymianie na gotówkę ani przeniesieniu na inną osobę.</li>
      </ul>
      <h2>4. Nagrody i kupony</h2>
      <ul>
        <li>Punkty można wymienić na nagrody z katalogu dostępnego w aplikacji. Wymiana generuje kupon z unikalnym kodem i datą ważności.</li>
        <li>Kupon jest jednorazowy, nie łączy się z innymi kuponami w jednej transakcji, chyba że opis stanowi inaczej.</li>
        <li>Po upływie terminu ważności kupon wygasa, a wydane punkty nie są zwracane.</li>
        <li>Zwrot towaru kupionego z kuponem nie przywraca kuponu.</li>
      </ul>
      <h2>5. Poziomy członkostwa i kampanie</h2>
      <p>Poziom członkostwa zależy od liczby punktów zdobytych w ciągu ostatnich 12 miesięcy. Bonusy kampanii nie sumują się — stosowany jest najkorzystniejszy bonus.</p>
      <h2>6. Reklamacje</h2>
      <p>Reklamacje dotyczące programu można składać w aplikacji (Pomoc → Zgłoś problem) lub w sklepie. Odpowiedź udzielana jest w ciągu 14 dni.</p>
      <h2>7. Zmiany regulaminu i zakończenie programu</h2>
      <p>O zmianach regulaminu uczestnicy są informowani z co najmniej 14-dniowym wyprzedzeniem. Uczestnik może w każdej chwili zrezygnować z udziału, usuwając konto w aplikacji.</p>
    </LegalPage>
  );
}
