# Nastawy — pokrętła gry

Wszystkie liczby gry. Każda ma komentarz: co robi i w którą stronę działa.

| Co | Plik |
|---|---|
| rytuał, pielgrzymka, warta pod rdzeniem | `rytual.ts` |
| sen, zasoby, nacje, zasiedlenie, przypływy | `gora.ts` |
| głód, walka, ruch stworzeń | `stworzenia.ts` |
| koszty i siła rytów | `moce.ts` |
| świat i rdzeń | `swiat.ts` |
| kamera, tempo, ekran | `sterowanie.ts, ekran.ts` |
| dźwięk, kolory | `dzwiek.ts, barwy.ts` |
| wygląd ekranów | `wyglad/` |

Zmień liczbę i zapisz — `npm run dev` przeładuje grę. Na żywo w konsoli: `__trzewia.nastawy.RYTUAL.tempo = 0.001`.
Po zmianie balansu: `npm test`.
