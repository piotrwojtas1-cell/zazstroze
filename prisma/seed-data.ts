/**
 * Przykładowe dane referencyjne i treści. Wszystkie dane są fikcyjne.
 * Wartości programu (przelicznik, progi, ceny nagród) są WYŁĄCZNIE demonstracyjne.
 */

export const INTERESTS = [
  { key: "warzywnik", name: "Warzywnik", emoji: "🥕" },
  { key: "ziola", name: "Zioła", emoji: "🌿" },
  { key: "rosliny-domowe", name: "Rośliny domowe", emoji: "🪴" },
  { key: "kwiaty", name: "Kwiaty ogrodowe", emoji: "🌷" },
  { key: "trawnik", name: "Trawnik", emoji: "🌱" },
  { key: "drzewa-owocowe", name: "Drzewa i krzewy owocowe", emoji: "🍎" },
  { key: "balkon", name: "Balkon i taras", emoji: "🏡" },
  { key: "eko", name: "Kompost i ogród eko", emoji: "♻️" },
];

export const TIERS = [
  {
    key: "SADZONKA",
    name: "Sadzonka",
    description: "Poziom startowy dla każdego nowego członka programu.",
    minPoints: 0,
    multiplierBp: 10000,
    sortOrder: 1,
    color: "#6B8F4E",
    benefits: ["1 pkt za każdą złotówkę*", "Dostęp do katalogu nagród", "Kalendarz prac ogrodniczych"],
  },
  {
    key: "KRZEW",
    name: "Krzew",
    description: "Dla regularnie odwiedzających — od 800 pkt zdobytych w ciągu 12 miesięcy.",
    minPoints: 800,
    multiplierBp: 11000,
    sortOrder: 2,
    color: "#2F6B4F",
    benefits: ["+10% punktów za zakupy", "Nagrody dostępne od poziomu Krzew", "Wcześniejszy dostęp do ofert sezonowych"],
  },
  {
    key: "DAB",
    name: "Dąb",
    description: "Najwyższy poziom — od 2500 pkt zdobytych w ciągu 12 miesięcy.",
    minPoints: 2500,
    multiplierBp: 12500,
    sortOrder: 3,
    color: "#7A5230",
    benefits: ["+25% punktów za zakupy", "Ekskluzywne nagrody", "Zaproszenia na warsztaty ogrodnicze"],
  },
];

export const CATEGORIES: Record<string, string> = {
  rosliny: "Rośliny",
  nasiona: "Nasiona i cebulki",
  nawozy: "Nawozy",
  podloza: "Podłoża i ziemia",
  narzedzia: "Narzędzia",
  donice: "Donice i osłonki",
  "ochrona-roslin": "Ochrona roślin",
  nawadnianie: "Nawadnianie",
  dekoracje: "Dekoracje",
  "karty-podarunkowe": "Karty podarunkowe",
  kaucje: "Kaucje i opakowania zwrotne",
};

export const PRODUCTS = [
  { sku: "ROS-001", name: "Lawenda wąskolistna 'Hidcote', don. 1,5 l", category: "rosliny", priceGrosze: 1899, emoji: "💜" },
  { sku: "ROS-002", name: "Hortensja bukietowa 'Vanille Fraise', 3 l", category: "rosliny", priceGrosze: 5999, emoji: "🌸" },
  { sku: "ROS-003", name: "Borówka amerykańska 'Bluecrop', 2 l", category: "rosliny", priceGrosze: 2999, emoji: "🫐" },
  { sku: "ROS-004", name: "Monstera dziurawa, don. 17 cm", category: "rosliny", priceGrosze: 7999, emoji: "🪴" },
  { sku: "ROS-005", name: "Wrzos ogrodowy, don. 11 cm", category: "rosliny", priceGrosze: 799, emoji: "🌺" },
  { sku: "NAS-001", name: "Cebulki tulipanów mix, 20 szt.", category: "nasiona", priceGrosze: 2499, emoji: "🌷" },
  { sku: "NAS-002", name: "Nasiona pomidora 'Malinowy Ożarowski'", category: "nasiona", priceGrosze: 549, emoji: "🍅" },
  { sku: "NAS-003", name: "Mieszanka traw 'Sportowa', 5 kg", category: "nasiona", priceGrosze: 8999, emoji: "🌱" },
  { sku: "NAS-004", name: "Czosnek ozimy do sadzenia, 250 g", category: "nasiona", priceGrosze: 1299, emoji: "🧄" },
  { sku: "NAW-001", name: "Nawóz jesienny do trawnika, 5 kg", category: "nawozy", priceGrosze: 4999, emoji: "🧪" },
  { sku: "NAW-002", name: "Biohumus płynny uniwersalny, 1 l", category: "nawozy", priceGrosze: 2299, emoji: "🪱" },
  { sku: "POD-001", name: "Ziemia uniwersalna, 50 l", category: "podloza", priceGrosze: 2499, emoji: "🟫" },
  { sku: "POD-002", name: "Kora sosnowa, 80 l", category: "podloza", priceGrosze: 3299, emoji: "🪵" },
  { sku: "NAR-001", name: "Sekator nożycowy, 20 cm", category: "narzedzia", priceGrosze: 8900, emoji: "✂️" },
  { sku: "NAR-002", name: "Grabie do liści, wachlarzowe", category: "narzedzia", priceGrosze: 4599, emoji: "🍂" },
  { sku: "DON-001", name: "Donica ceramiczna, terakota, 30 cm", category: "donice", priceGrosze: 6999, emoji: "🏺" },
  { sku: "OCH-001", name: "Agrowłóknina zimowa, 1,6 × 10 m", category: "ochrona-roslin", priceGrosze: 3499, emoji: "🧣" },
  { sku: "NAW-010", name: "Wąż ogrodowy 1/2\", 20 m", category: "nawadnianie", priceGrosze: 7999, emoji: "💧" },
  { sku: "DEK-001", name: "Lampion ogrodowy solarny", category: "dekoracje", priceGrosze: 3999, emoji: "🏮" },
  { sku: "KAR-050", name: "Karta podarunkowa 50 zł", category: "karty-podarunkowe", priceGrosze: 5000, emoji: "🎁" },
  { sku: "KAU-001", name: "Kaucja za paletę/skrzynkę", category: "kaucje", priceGrosze: 1000, emoji: "📦" },
];

export const REWARDS = [
  {
    name: "Rabat 5 zł",
    description: "Kupon rabatowy 5 zł na zakupy od 20 zł. Nie dotyczy kart podarunkowych.",
    type: "AMOUNT_OFF" as const,
    pointsCost: 100,
    valueGrosze: 500,
    minBasketGrosze: 2000,
    validDays: 30,
    imageEmoji: "🌱",
    sortOrder: 1,
    excludedCategories: ["karty-podarunkowe", "kaucje"],
  },
  {
    name: "Rabat 15 zł",
    description: "Kupon 15 zł na zakupy od 60 zł. Idealny na sezonowe nasadzenia.",
    type: "AMOUNT_OFF" as const,
    pointsCost: 280,
    valueGrosze: 1500,
    minBasketGrosze: 6000,
    validDays: 30,
    imageEmoji: "🌿",
    sortOrder: 2,
    excludedCategories: ["karty-podarunkowe", "kaucje"],
  },
  {
    name: "Rabat 30 zł",
    description: "Kupon 30 zł na zakupy od 120 zł.",
    type: "AMOUNT_OFF" as const,
    pointsCost: 520,
    valueGrosze: 3000,
    minBasketGrosze: 12000,
    validDays: 45,
    imageEmoji: "🌳",
    sortOrder: 3,
    excludedCategories: ["karty-podarunkowe", "kaucje"],
  },
  {
    name: "Ziemia uniwersalna 50 l gratis",
    description: "Worek ziemi uniwersalnej 50 l bez opłat (do wartości 24,99 zł). Limit 2 na klienta.",
    type: "FREE_PRODUCT" as const,
    pointsCost: 350,
    valueGrosze: 2499,
    minBasketGrosze: 0,
    validDays: 30,
    stock: 50,
    perCustomerLimit: 2,
    imageEmoji: "🟫",
    sortOrder: 4,
    excludedCategories: ["karty-podarunkowe", "kaucje"],
  },
  {
    name: "−15% na cały koszyk",
    description: "Rabat 15% (maks. 40 zł) na jednorazowe zakupy. Dla poziomu Krzew i wyższych.",
    type: "PERCENT_OFF" as const,
    pointsCost: 450,
    percentBp: 1500,
    maxDiscountGrosze: 4000,
    minBasketGrosze: 5000,
    validDays: 21,
    tierKey: "KRZEW",
    imageEmoji: "🏷️",
    sortOrder: 5,
    excludedCategories: ["karty-podarunkowe", "kaucje"],
  },
  {
    name: "Sekator nożycowy gratis",
    description: "Profesjonalny sekator 20 cm (do wartości 89 zł). Nagroda dla poziomu Dąb.",
    type: "FREE_PRODUCT" as const,
    pointsCost: 1200,
    valueGrosze: 8900,
    minBasketGrosze: 0,
    validDays: 60,
    stock: 20,
    perCustomerLimit: 1,
    tierKey: "DAB",
    imageEmoji: "✂️",
    sortOrder: 6,
    excludedCategories: ["karty-podarunkowe", "kaucje"],
  },
];

export const ARTICLES: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  interestKeys: string[];
  months: number[];
  readMinutes: number;
  emoji: string;
  body: string;
}[] = [
  {
    slug: "sadzenie-cebul-tulipanow-jesienia",
    title: "Sadzenie cebul tulipanów jesienią — krok po kroku",
    excerpt: "Październik to najlepszy moment na sadzenie tulipanów. Podpowiadamy, jak głęboko sadzić i jak chronić cebule przed gryzoniami.",
    category: "Kwiaty",
    interestKeys: ["kwiaty", "balkon"],
    months: [9, 10, 11],
    readMinutes: 4,
    emoji: "🌷",
    body: `Tulipany sadzimy, gdy temperatura gleby spadnie poniżej 10°C — w większości regionów Polski to druga połowa września i październik. Zbyt wczesne sadzenie sprzyja chorobom grzybowym, zbyt późne utrudnia ukorzenienie przed mrozami.

Wybierz miejsce słoneczne, o przepuszczalnej glebie. Tulipany nie lubią stojącej wody — na glebach ciężkich dosyp na dno dołka warstwę piasku lub drobnego żwiru.

Zasada głębokości jest prosta: cebulę sadzimy na głębokość równą jej trzykrotnej wysokości. Dla typowej cebuli tulipana to około 10–15 cm. Odstępy między cebulami to 8–10 cm.

Jeśli w ogrodzie są nornice, posadź cebule w ażurowych koszykach. Po posadzeniu podlej rabatę, a przed nadejściem silnych mrozów okryj ją warstwą kory lub stroiszu.`,
  },
  {
    slug: "przygotowanie-trawnika-do-zimy",
    title: "Jak przygotować trawnik do zimy",
    excerpt: "Ostatnie koszenie, nawóz jesienny i grabienie liści — trzy kroki, dzięki którym trawnik wiosną szybko się zazieleni.",
    category: "Trawnik",
    interestKeys: ["trawnik"],
    months: [9, 10, 11],
    readMinutes: 3,
    emoji: "🌱",
    body: `Jesienią trawa wciąż rośnie, choć wolniej. Ostatnie koszenie wykonaj, gdy dzienne temperatury spadną poniżej 10°C — zostaw źdźbła na wysokości ok. 5–6 cm.

Nawóz jesienny ma niską zawartość azotu i podwyższoną potasu oraz fosforu. Potas wzmacnia ściany komórkowe i zwiększa odporność na mróz, dlatego warto go zastosować we wrześniu lub październiku.

Regularnie usuwaj opadłe liście. Pozostawione na trawniku ograniczają dostęp światła i sprzyjają pleśni śniegowej. Liście możesz przekompostować — to świetny materiał na próchnicę.`,
  },
  {
    slug: "zimowanie-roslin-balkonowych",
    title: "Zimowanie roślin balkonowych i tarasowych",
    excerpt: "Pelargonie, oleandry i zioła w donicach — co zabrać do domu, a co wystarczy okryć agrowłókniną?",
    category: "Balkon",
    interestKeys: ["balkon", "ziola"],
    months: [10, 11],
    readMinutes: 5,
    emoji: "🏡",
    body: `Rośliny w donicach są bardziej narażone na przemarzanie niż te rosnące w gruncie, bo mróz ma dostęp do bryły korzeniowej z każdej strony.

Pelargonie i fuksje przenieś do jasnego, chłodnego pomieszczenia (5–10°C). Przytnij pędy o jedną trzecią i ogranicz podlewanie.

Byliny i krzewy odporne na mróz mogą zimować na zewnątrz. Owiń donice matą kokosową lub folią bąbelkową, ustaw je na styropianie i okryj część nadziemną agrowłókniną.

Zioła wieloletnie, jak tymianek czy szałwia, zniosą zimę na osłoniętym balkonie. Rozmaryn lepiej przezimować w domu, w jasnym miejscu.`,
  },
  {
    slug: "kompostownik-od-podstaw",
    title: "Kompostownik od podstaw",
    excerpt: "Co wrzucać do kompostu, a czego unikać? Prosty przewodnik po domowym kompostowaniu.",
    category: "Ogród eko",
    interestKeys: ["eko", "warzywnik"],
    months: [],
    readMinutes: 4,
    emoji: "♻️",
    body: `Kompost to najlepszy, darmowy nawóz. Dobrze prowadzony kompostownik nie wydziela przykrego zapachu.

Zasada równowagi: łącz materiały „zielone” (resztki warzyw, skoszona trawa) z „brązowymi” (suche liście, gałązki, tektura). Proporcja około 1:2 zapewnia prawidłowy rozkład.

Nie kompostuj mięsa, nabiału, tłuszczu ani chorych roślin. Unikaj też chwastów z nasionami.

Przerzucaj pryzmę co kilka tygodni i dbaj o umiarkowaną wilgotność — kompost powinien przypominać wyciśniętą gąbkę. Dojrzały kompost jest gotowy po 6–12 miesiącach.`,
  },
  {
    slug: "pomidory-z-rozsady",
    title: "Pomidory z własnej rozsady",
    excerpt: "Kiedy wysiewać nasiona, jak hartować rozsadę i kiedy wysadzić pomidory do gruntu.",
    category: "Warzywnik",
    interestKeys: ["warzywnik"],
    months: [2, 3, 4, 5],
    readMinutes: 5,
    emoji: "🍅",
    body: `Nasiona pomidorów wysiewamy w marcu do skrzynek z lekkim podłożem do wysiewu. Optymalna temperatura kiełkowania to 22–25°C.

Po pojawieniu się pierwszego liścia właściwego rozsadę pikujemy do osobnych doniczek. Rośliny potrzebują dużo światła — przy jego braku wyciągają się i słabną.

Na 10–14 dni przed wysadzeniem zacznij hartowanie: wystawiaj rozsadę na zewnątrz na kilka godzin dziennie, stopniowo wydłużając ten czas.

Do gruntu sadzimy po 15 maja, gdy minie ryzyko przymrozków. Pomidory sadź głębiej niż rosły w doniczce — z zakopanej części łodygi wyrosną dodatkowe korzenie.`,
  },
  {
    slug: "monstera-pielegnacja",
    title: "Monstera — pielęgnacja w domu",
    excerpt: "Światło, podlewanie i przesadzanie. Jak sprawić, by monstera wypuszczała duże, dziurawe liście.",
    category: "Rośliny domowe",
    interestKeys: ["rosliny-domowe"],
    months: [],
    readMinutes: 3,
    emoji: "🪴",
    body: `Monstera lubi jasne stanowisko z rozproszonym światłem. Bezpośrednie, ostre słońce może poparzyć liście, a zbyt ciemne miejsce sprawi, że nowe liście będą małe i bez charakterystycznych otworów.

Podlewaj, gdy wierzchnia warstwa podłoża przeschnie na głębokość 2–3 cm. Zimą ogranicz podlewanie.

Przesadzaj co 2–3 lata wiosną, do donicy większej o kilka centymetrów. Zapewnij podporę — np. tyczkę z mchu — po której roślina może się wspinać.`,
  },
  {
    slug: "ciecie-drzew-owocowych",
    title: "Cięcie drzew owocowych — kiedy i jak",
    excerpt: "Cięcie zimowe i letnie jabłoni, grusz i śliw. Podstawowe zasady dla początkujących.",
    category: "Drzewa owocowe",
    interestKeys: ["drzewa-owocowe"],
    months: [2, 3, 7, 8],
    readMinutes: 6,
    emoji: "🍎",
    body: `Jabłonie i grusze tniemy przede wszystkim pod koniec zimy (luty–marzec), w bezmroźne dni. Cięcie zimowe pobudza wzrost i pozwala ukształtować koronę.

Śliwy i wiśnie lepiej ciąć latem, po zbiorach — zmniejsza to ryzyko chorób kory i wycieku gumy.

Zawsze zaczynaj od usunięcia pędów chorych, uszkodzonych i krzyżujących się. Następnie prześwietl wnętrze korony, by światło docierało do owoców.

Używaj ostrego, czystego sekatora. Większe rany zabezpiecz maścią ogrodniczą.`,
  },
  {
    slug: "ziola-na-parapecie",
    title: "Zioła na parapecie przez cały rok",
    excerpt: "Bazylia, pietruszka i szczypiorek w kuchni — jak uprawiać zioła w doniczkach zimą.",
    category: "Zioła",
    interestKeys: ["ziola", "rosliny-domowe"],
    months: [10, 11, 12, 1, 2],
    readMinutes: 3,
    emoji: "🌿",
    body: `Zimą zioła potrzebują przede wszystkim światła. Najlepszy będzie parapet okna południowego lub doświetlanie lampą do roślin.

Bazylia lubi ciepło (powyżej 18°C) i umiarkowaną wilgotność. Szczypiorek i pietruszka zniosą chłodniejsze miejsce.

Nie przelewaj — w doniczkach bez otworów woda gromadzi się na dnie i powoduje gnicie korzeni. Zbieraj liście regularnie, uszczykując wierzchołki — rośliny lepiej się zagęszczą.`,
  },
  {
    slug: "nawadnianie-oszczednie",
    title: "Jak podlewać ogród oszczędnie",
    excerpt: "Podlewanie rano, ściółkowanie i deszczówka — sprawdzone sposoby na mniejsze zużycie wody.",
    category: "Ogród eko",
    interestKeys: ["eko", "warzywnik", "kwiaty"],
    months: [5, 6, 7, 8],
    readMinutes: 4,
    emoji: "💧",
    body: `Podlewaj wcześnie rano — woda nie odparowuje tak szybko jak w południe, a liście zdążą obeschnąć przed nocą.

Lepiej podlewać rzadziej, ale obficie. Głębokie nawilżenie gleby zachęca korzenie do wzrostu w głąb.

Ściółka z kory, zrębków lub skoszonej trawy ogranicza parowanie nawet o połowę. Zbieraj deszczówkę — rośliny ją lubią, a Ty oszczędzasz wodę wodociągową.`,
  },
  {
    slug: "borowki-w-ogrodzie",
    title: "Borówka amerykańska w ogrodzie",
    excerpt: "Kwaśne podłoże to podstawa. Jak posadzić borówkę, by obficie owocowała.",
    category: "Drzewa owocowe",
    interestKeys: ["drzewa-owocowe", "warzywnik"],
    months: [3, 4, 9, 10],
    readMinutes: 4,
    emoji: "🫐",
    body: `Borówka wymaga kwaśnej gleby o pH 4–5. W większości ogrodów trzeba przygotować dla niej specjalne stanowisko z kwaśnego torfu i kory sosnowej.

Sadź jesienią lub wczesną wiosną w słonecznym miejscu. Dla lepszego zapylenia posadź co najmniej dwie odmiany.

Podlewaj deszczówką — twarda woda wodociągowa podnosi pH podłoża. Nawoź nawozami przeznaczonymi do roślin kwasolubnych.`,
  },
];

/** Kalendarz prac ogrodniczych — po 3 zadania na miesiąc. */
export const GARDEN_TASKS: { month: number; title: string; description: string; interestKey?: string; articleSlug?: string }[] = [
  { month: 1, title: "Planowanie sezonu", description: "Zaplanuj rozmieszczenie warzyw i zamów nasiona na nowy sezon.", interestKey: "warzywnik" },
  { month: 1, title: "Strząsanie śniegu", description: "Strząsaj mokry śnieg z iglaków i krzewów, by nie łamał gałęzi." },
  { month: 1, title: "Zioła na parapecie", description: "Doświetlaj zioła w doniczkach i podlewaj je oszczędnie.", interestKey: "ziola", articleSlug: "ziola-na-parapecie" },
  { month: 2, title: "Cięcie jabłoni i grusz", description: "W bezmroźne dni wykonaj cięcie zimowe drzew ziarnkowych.", interestKey: "drzewa-owocowe", articleSlug: "ciecie-drzew-owocowych" },
  { month: 2, title: "Pierwsze wysiewy", description: "Wysiej papryki i bakłażany na rozsadę.", interestKey: "warzywnik" },
  { month: 2, title: "Przegląd narzędzi", description: "Naostrz sekator i nasmaruj narzędzia przed sezonem." },
  { month: 3, title: "Wysiew pomidorów", description: "Wysiej pomidory na rozsadę w ciepłym, jasnym miejscu.", interestKey: "warzywnik", articleSlug: "pomidory-z-rozsady" },
  { month: 3, title: "Wertykulacja trawnika", description: "Pod koniec miesiąca wygrab filc i mech z trawnika.", interestKey: "trawnik" },
  { month: 3, title: "Przesadzanie roślin domowych", description: "To dobry moment na przesadzenie roślin doniczkowych.", interestKey: "rosliny-domowe", articleSlug: "monstera-pielegnacja" },
  { month: 4, title: "Siew trawy", description: "Dosiej trawę w miejscach przerzedzonych.", interestKey: "trawnik" },
  { month: 4, title: "Sadzenie krzewów owocowych", description: "Posadź borówki, porzeczki i maliny.", interestKey: "drzewa-owocowe", articleSlug: "borowki-w-ogrodzie" },
  { month: 4, title: "Hartowanie rozsady", description: "Wystawiaj rozsadę na zewnątrz na coraz dłużej.", interestKey: "warzywnik" },
  { month: 5, title: "Sadzenie po zimnych ogrodnikach", description: "Po 15 maja wysadź pomidory i rośliny balkonowe.", interestKey: "balkon" },
  { month: 5, title: "Ściółkowanie rabat", description: "Wyściółkuj rabaty korą, by ograniczyć chwasty i parowanie.", interestKey: "eko" },
  { month: 5, title: "Nawożenie trawnika", description: "Zastosuj nawóz wiosenny z większą zawartością azotu.", interestKey: "trawnik" },
  { month: 6, title: "Regularne podlewanie", description: "Podlewaj rano, rzadziej, ale obficie.", interestKey: "eko", articleSlug: "nawadnianie-oszczednie" },
  { month: 6, title: "Zbiór ziół", description: "Zbieraj zioła przed kwitnieniem — mają wtedy najwięcej aromatu.", interestKey: "ziola" },
  { month: 6, title: "Usuwanie przekwitłych kwiatów", description: "Regularnie usuwaj przekwitłe kwiaty, by przedłużyć kwitnienie.", interestKey: "kwiaty" },
  { month: 7, title: "Cięcie letnie śliw i wiśni", description: "Po zbiorach przytnij drzewa pestkowe.", interestKey: "drzewa-owocowe", articleSlug: "ciecie-drzew-owocowych" },
  { month: 7, title: "Ochrona przed suszą", description: "Ściółkuj i podlewaj młode nasadzenia.", interestKey: "eko" },
  { month: 7, title: "Rośliny balkonowe", description: "Nawoź rośliny balkonowe co 1–2 tygodnie.", interestKey: "balkon" },
  { month: 8, title: "Zakładanie truskawek", description: "Posadź nowe sadzonki truskawek.", interestKey: "warzywnik" },
  { month: 8, title: "Zbiór i przetwory", description: "Zbieraj warzywa i owoce na bieżąco.", interestKey: "warzywnik" },
  { month: 8, title: "Zamówienie cebul", description: "Wybierz cebule kwiatów do jesiennego sadzenia.", interestKey: "kwiaty" },
  { month: 9, title: "Nawóz jesienny na trawnik", description: "Zastosuj nawóz z przewagą potasu.", interestKey: "trawnik", articleSlug: "przygotowanie-trawnika-do-zimy" },
  { month: 9, title: "Sadzenie czosnku ozimego", description: "Pod koniec miesiąca posadź czosnek ozimy.", interestKey: "warzywnik" },
  { month: 9, title: "Sadzenie bylin", description: "Wrzesień to dobry czas na sadzenie bylin i krzewów.", interestKey: "kwiaty" },
  { month: 10, title: "Sadzenie tulipanów", description: "Posadź cebule tulipanów, narcyzów i krokusów.", interestKey: "kwiaty", articleSlug: "sadzenie-cebul-tulipanow-jesienia" },
  { month: 10, title: "Grabienie liści", description: "Usuwaj liście z trawnika i przekompostuj je.", interestKey: "trawnik", articleSlug: "kompostownik-od-podstaw" },
  { month: 10, title: "Zimowanie roślin w donicach", description: "Przenieś wrażliwe rośliny do chłodnego, jasnego pomieszczenia.", interestKey: "balkon", articleSlug: "zimowanie-roslin-balkonowych" },
  { month: 11, title: "Okrywanie róż", description: "Usyp kopczyki z ziemi lub kory u podstawy róż.", interestKey: "kwiaty" },
  { month: 11, title: "Opróżnienie węży i instalacji", description: "Spuść wodę z węży i zakręć zewnętrzny zawór.", interestKey: "eko" },
  { month: 11, title: "Agrowłóknina dla wrażliwych roślin", description: "Okryj młode i wrażliwe krzewy agrowłókniną.", interestKey: "balkon" },
  { month: 12, title: "Choinka i stroiki", description: "Wybierz żywą choinkę w donicy — wiosną posadzisz ją w ogrodzie." },
  { month: 12, title: "Dokarmianie ptaków", description: "Zawieś karmnik — ptaki pomogą zwalczać szkodniki wiosną.", interestKey: "eko" },
  { month: 12, title: "Rośliny domowe zimą", description: "Zwiększ wilgotność powietrza przy roślinach domowych.", interestKey: "rosliny-domowe" },
];

/** Fikcyjne imiona/nazwiska do danych demonstracyjnych (adresy e-mail w domenie example.com). */
export const DEMO_FIRST_NAMES = ["Anna", "Piotr", "Katarzyna", "Tomasz", "Magdalena", "Marek", "Agnieszka", "Paweł", "Ewa", "Michał", "Joanna", "Krzysztof", "Barbara", "Jan", "Zofia", "Adam", "Natalia", "Łukasz", "Helena", "Wojciech"];
export const DEMO_LAST_NAMES = ["Zielińska", "Ogrodnik", "Kwiatkowska", "Sadowski", "Lipińska", "Dębski", "Jabłońska", "Wiśniewski", "Leśna", "Polny", "Różańska", "Krzewiński", "Brzozowska", "Lasota", "Makowska", "Gajewski", "Trawińska", "Bukowski", "Klonowska", "Jaworski"];
