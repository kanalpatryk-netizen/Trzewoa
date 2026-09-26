# Nastawy — pokrętła gry

Wszystkie liczby, które decydują o tym, jak gra się gra, wygląda i brzmi, są tutaj.
Kod gry ich nie powtarza — odwołuje się do nich po nazwie. Każda wartość ma nad sobą
komentarz: co robi, w jakich jednostkach i w którą stronę działa.

## Gdzie czego szukać

| Chcę zmienić… | Plik | Obiekt |
|---|---|---|
| jak szybko da się wygrać, ilu wiernych trzeba pod skorupą | `rytual.ts` | `RYTUAL` |
| kiedy nacja rusza na pielgrzymkę, ilu idzie, jak długo wytrzyma | `rytual.ts` | `PIELGRZYMKA` |
| jak szybko przychodzi sen (przegrana), zasoby na start, ofiary, modlitwy | `gora.ts` | `GORA` |
| nacje: limity, oddanie, rozłamy, kuźnie, prorok, sekty | `gora.ts` | `LUDY` |
| kto i gdzie mieszka na starcie | `gora.ts` | `ZASIEDLENIE` |
| najazdy ludzi, powodzie, zarazy, nowe plemiona | `gora.ts` | `PRZYPLYWY` |
| głód, strach, szaleństwo, walka, ruch, praca pojedynczego stworzenia | `stworzenia.ts` | `STWORZENIA` |
| statystyki ras (szybkość, siła, płodność, życie) | `../sim/races.ts` | `RACES` |
| koszty rytów gracza | `moce.ts` | `KOSZTY` |
| zasięgi i siła rytów, działanie skaz | `moce.ts` | `MOCE`, `SKAZY` |
| wymiary góry, jaskinie, rudy, woda, magma | `swiat.ts` | `SWIAT` |
| rozmiar skorupy, komory, przedsionka | `swiat.ts` | `RDZEN` |
| kamera, przybliżenie, najwyższe tempo | `sterowanie.ts` | `KAMERA`, `TEMPO` |
| muzyka, pogłos, głośność gestów | `dzwiek.ts` | `MUZYKA`, `MIKSER`, `GESTY`, `REZONANS` |
| kolory całej gry | `barwy.ts` | `BARWA` |
| napisy i układ menu | `wyglad/menu.ts` | `MENU` |
| przekrój góry w menu (komory, rdzeń, podpisy a–f) | `wyglad/frontyspis.ts` | `FRONTYSPIS` |
| rama, tytuł-wstęga, przerywniki, nagłówki działów | `wyglad/ozdoby.ts` | `RAMA`, `KARTUSZ`… |
| ekran ustawień | `wyglad/ustawienia.ts` | `EKRAN_USTAWIEN` |
| atlas, miniatury, pełna tablica | `wyglad/atlas.ts` | `ATLAS`, `MINIATURA`, `TABLICA` |
| rdzeń w grze: tętno, poświata, wieniec pęknięć, podpis | `wyglad/rdzen.ts` | `RDZEN_WYGLAD` |
| kreskowanie materiałów na płycie | `wyglad/rycina.ts` | `MATERIALY`, `MASA` |
| sylwetki postaci | `wyglad/postacie.ts` | `BUDOWA` |

Treści (opisy tablic atlasu, plansze samouczka, nazwy rytów) są przy swoich danych:
`src/atlas/tablice.ts`, `src/cutscene/scenes.ts`, `src/powers/powers.ts` (`TOOLS`).

## Jak zmieniać

1. Zmień liczbę i zapisz — `npm run dev` przeładuje grę sam.
2. Na żywo, bez przeładowania: w konsoli przeglądarki (tylko `npm run dev`)
   `__trzewia.nastawy.RYTUAL.tempo = 0.001`. Działa od następnej klatki.
   Wyjątki, które wymagają przeładowania albo nowej gry: wymiary świata (`SWIAT.szerokosc`,
   `wysokosc`, `powierzchnia`), `SWIAT.pamiecTikow`, `GORA.otchlanNaKafel`, `LUDY.sufitRasy`,
   `TON_MAX`, `MAKS_KROKOW_NA_SEKUNDE`, `MENU.pylkow`, głośności `MUZYKA.glosnosc`/`akordy`,
   `REZONANS.glosnosc`, `GESTY.kaskada` oraz cały przepis na generowanie góry (liczy się raz, przy nowej grze).
3. Po zmianie balansu: `npm test` (świat i skorupa) i `npm run test:balans`.

## Skale, które się powtarzają

- **0..1** — głód, strach, oddanie, szaleństwo, głębokość (0 = pod trawą, 1 = dno).
- **tiki** — krok symulacji; 7200 tików = minuta gry (`czas.ts`).
- **kafle** — odległości w świecie.
- **„× rozmiar”, „× z”** — w wyglądzie: wielokrotność rozmiaru czcionki albo przybliżenia.
- **„min / max / część”** — rozmiar = część szerokości ekranu, obcięta do min–max pikseli.
