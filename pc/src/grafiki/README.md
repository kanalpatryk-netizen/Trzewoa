# Własne grafiki

Wrzuć obrazek (PNG, WEBP, JPG albo SVG) do folderu [`pliki/`](pliki) i nazwij go jak w tabeli.
Gra użyje go zamiast swojego rysunku. Bez obrazka zostaje rycina z gry.

| Co | Nazwa pliku | Uwagi |
|---|---|---|
| postać rasy | `postac-<rasa>.png` | rasy: `slepy-lud`, `zuzlowcy`, `trole`, `przadki`, `ludzie`; stopy na dole obrazka, twarzą w prawo |
| postać przy czynności | `postac-<rasa>-<czynność>.png` | czynności: `stoi`, `idzie`, `biegnie`, `wspina`, `spada`, `kopie`, `modli`, `je`, `walczy`, `spi`, `buduje`, `wysysa` |
| ryt (lewy margines) | `ryt-<nazwa>.png` | `ksztaltuj`, `zasiej`, `szept`, `znak`, `skaz` |
| przycisk | `przycisk-<nazwa>.png` | `pauza`, `wolniej`, `szybciej`, `kamera`, `zapiski`, `atlas`, `legenda`, `zapis` |

**Animacja:** dopisz `@liczba klatek`, a obrazek to klatki ułożone obok siebie w poziomie,
np. `postac-slepy-lud-idzie@4.png`.

Najlepiej przezroczyste tło i kwadratowe ryty/przyciski. Po dodaniu: `npm run dev` (podgląd) albo `npm run pack`.

**Nowe miejsce na grafikę w kodzie:** `rysujGrafike(ctx, 'klucz', x, y, wysokość)` z [`grafiki.ts`](grafiki.ts)
— zwraca `false`, gdy pliku nie ma, więc wystarczy `if (!rysujGrafike(...)) stareRysowanie()`.
