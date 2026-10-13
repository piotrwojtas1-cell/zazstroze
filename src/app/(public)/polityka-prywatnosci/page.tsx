import { LegalPage } from "@/components/app/legal-page";

export const metadata = { title: "Polityka prywatności" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Polityka prywatności" updated="1 października 2026">
      <h2>1. Administrator danych</h2>
      <p>Administratorem danych osobowych jest operator sklepu Zielony Zakątek (dane kontaktowe i dane inspektora ochrony danych — do uzupełnienia).</p>
      <h2>2. Jakie dane przetwarzamy</h2>
      <ul>
        <li>Dane konta: adres e-mail, imię, opcjonalnie nazwisko, telefon, kod pocztowy i miesiąc urodzenia.</li>
        <li>Dane programu: numer karty, historia zakupów zarejestrowanych z kartą, punkty, kupony.</li>
        <li>Dobrowolnie wybrane zainteresowania ogrodnicze i preferencje komunikacji.</li>
        <li>Dane techniczne: skróty (hasze) adresów IP używane do ochrony przed nadużyciami — bez przechowywania surowego adresu.</li>
      </ul>
      <h2>3. Cele i podstawy przetwarzania</h2>
      <ul>
        <li>Prowadzenie programu lojalnościowego (wykonanie umowy — regulaminu).</li>
        <li>Rozliczenia i obowiązki księgowe (obowiązek prawny).</li>
        <li>Bezpieczeństwo i przeciwdziałanie nadużyciom (prawnie uzasadniony interes).</li>
        <li>Marketing oraz personalizacja ofert — wyłącznie na podstawie odrębnej, dobrowolnej zgody, którą można w każdej chwili wycofać.</li>
      </ul>
      <h2>4. Komunikaty transakcyjne i marketingowe</h2>
      <p>Komunikaty transakcyjne (np. o naliczeniu punktów, zmianie hasła, wygasaniu kuponu) są częścią usługi. Komunikaty marketingowe wysyłamy tylko po wyrażeniu zgody na dany kanał.</p>
      <h2>5. Okres przechowywania</h2>
      <p>Dane konta przechowujemy do czasu jego usunięcia. Dane transakcyjne mogą być przechowywane dłużej, w zakresie wymaganym przepisami (okresy do potwierdzenia przez prawnika). Po usunięciu konta dane identyfikujące są anonimizowane.</p>
      <h2>6. Twoje prawa</h2>
      <ul>
        <li>Dostęp do danych i ich eksport (Profil → Prywatność → Pobierz moje dane).</li>
        <li>Sprostowanie danych (Profil → Moje dane).</li>
        <li>Usunięcie konta (Profil → Prywatność → Usuń konto).</li>
        <li>Wycofanie zgód w dowolnym momencie, bez wpływu na zgodność z prawem wcześniejszego przetwarzania.</li>
        <li>Skarga do Prezesa Urzędu Ochrony Danych Osobowych.</li>
      </ul>
      <h2>7. Odbiorcy danych</h2>
      <p>Dostawcy usług IT (hosting, wysyłka wiadomości) na podstawie umów powierzenia. Nie sprzedajemy danych.</p>
    </LegalPage>
  );
}
