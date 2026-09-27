# Trzewia — wersja na Androida

Ta sama gra co w [`pc/`](../pc), dopasowywana do telefonu: dotyk zamiast myszy i klawiatury,
mały ekran trzymany pionowo albo poziomo. Symulacja (świat, ludy, rytuał) jest taka sama —
zmienia się tylko to, jak gra wygląda i jak się jej dotyka.

## Co jest inaczej niż na komputerze

| Obszar | Na telefonie |
|---|---|
| **Skala** | obraz 1:1 z ekranem telefonu — na komputerze mały ekran był ściskany (poziomo do 64%) |
| **Układ w pionie** | przyciski pod płytą, a nie na niej; mniejszy dolny margines; wstęga drogi na dole płyty — u góry mieszkają ludy |
| **Układ w poziomie** | własny, zwarty: ryty z lewej, przyciski w kolumnie z prawej, pod płytą jeden cienki pasek (spis, Otchłań, krew) |
| **Narzędzia** | duże pola nad płytą zamiast drobnych słów; opis narzędzia na dole płyty |
| **Karta mieszkańca** | większe pola myśli do szeptu |
| **Przytrzymanie** | przytrzymanie palca na rycie otwiera jego tablicę (zamiast prawego przycisku) |
| **Opis rytu** | pokazuje się na chwilę po wybraniu rytu (palec nie „najeżdża” jak mysz) |
| **Podpowiedzi** | bez klawiszy, „esc”, „kółka myszy” i prawego przycisku; „kliknij” → „dotknij” |
| **Ustawienia** | przewijanie palcem, przycisk „‹ menu”, przełącznik „Pełny ekran”, dział „Dotyk”; bez listy klawiszy |
| **Wstęp samouczka** | „pomiń wstęp ›” w rogu zamiast „P albo esc” |
| **Pełny ekran** | włącza się przy „dotknij, aby się obudzić” (można wyłączyć w ustawieniach) |
| **Przycisk „wstecz”** | działa jak Esc: odkłada ryt, zamyka kartę, zapiski, atlas, wraca do menu — dopiero w menu wychodzi |
| **Ekran** | nie gaśnie w trakcie partii i samouczka |
| **Kronika i minimapa** | schowane — kronika jest pod przyciskiem zapisków, płytę przesuwa się palcem |

## Prostsza mechanika

Na telefonie gra ma mniej rzeczy do ogarnięcia, a droga do wygranej przez wiarę jest łatwiejsza
i wytłumaczona wprost:

| Co | Na komputerze | Na telefonie |
|---|---|---|
| **Ryty** | pięć: Kształtuj, Zasiej, Szepcz, Znak, Skaź | cztery — bez **Skaź** (zmiany krwi gatunku) |
| **Zasoby** | Krew, Wiara, Otchłań | Krew i Wiara; w miejscu Otchłani **studnia oddania** |
| **Zasiew** | ruda, grzyb, kości, trucizna | ruda, grzyb, kości |
| **Szept** | kop w dół, zabij swoich, prorokuj, uciekaj | **módl się**, prorokuj, uciekaj |
| **Módl się** | — | wysyła wiernego od razu pod rdzeń; trzech z jednej nacji kruszy skorupę |
| **Pielgrzymka** | od 60% oddania nacji | od 50% |
| **Objawienie** | 45 Wiary | 30 Wiary, +20% oddania nacji (raz na nację, nie za każdego widza) |
| **Wejście do rdzenia** | nacja ponad 55% albo wierny ponad 70% | nacja ponad 45% albo wierny ponad 60% |
| **Stygnięcie oddania** | 0.004 | 0.002 — wiara wolniej gaśnie sama |
| **Samouczek** | rozdział „Zmień im krew” | rozdziały „Poślij wiernego” i „Wiara i modlitwa” |
| **Atlas** | — | tablica „Oddanie i modlitwa”, wyskakuje przy pierwszej modlitwie |

Studnia oddania (dolna rama) pokazuje oddanie najwierniejszej nacji, a kreska na niej — próg,
od którego nacja sama wysyła wartę pod rdzeń.

## Gdzie to jest w kodzie

- nastawy telefonu: [`src/nastawy/ekran.ts`](src/nastawy/ekran.ts) (`EKRAN`, `TELEFON`) i
  [`src/nastawy/sterowanie.ts`](src/nastawy/sterowanie.ts) (`STEROWANIE`: podpowiedzi klawiszy,
  czas przytrzymania, próg przewijania);
- układ płyty i marginesów: [`src/render/plate.ts`](src/render/plate.ts) (`computePlate`, `Plate.niski`),
  [`src/render/przyciski.ts`](src/render/przyciski.ts);
- system telefonu (pełny ekran, „wstecz”, blokada wygaszania): [`src/core/android.ts`](src/core/android.ts).

## Uruchomienie i testy

```bash
npm install
npm run dev              # http://localhost:5180 — w przeglądarce włącz widok telefonu
npm run pack             # trzewia.html — jeden plik do wgrania na telefon
npm test                 # testy symulacji
npm run test:nakladanie  # przy działającym npm run dev: 11 rozmiarów telefonów i tabletów
```
