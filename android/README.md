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
