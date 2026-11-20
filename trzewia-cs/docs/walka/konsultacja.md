# Walka w Kręgu Trzecim — 100 wariantów liczb (do konsultacji)

Wygenerowane przez `tools/walka/balans.py`. Pełna lista: `docs/walka/warianty.csv` (średnik, UTF-8).

## Jak oceniane

- **Zgodność z dzisiejszym tempem (waga 1,0)** — dla każdego starcia średni czas walki SC (Twój wzór) porównany z dzisiejszym; liczy się stosunek (2× dłużej i 2× krócej to ta sama kara). Najważniejsze starcia: rycerz → głowa Cerbera (waga 3), Cerber → rycerz (2), Cień → grabarz (2).
- **Czas a animacje (0,35)** — tylko rycerz i Cerber (jedyni z animacją związaną z ciosem): jak bardzo nowy „czas” odbiega od miejsca, w którym dziś trafia cios w ich ruchach (im bliżej, tym mniej trzeba ruch rozciągać, żeby trafienie wypadło na jego końcu). Cień, grabarz i mnich dziś biją bez animacji ciosu — dorobię ją pod nowy „czas”, więc ich czas jest dowolny.
- min/max dobierane przeszukaniem: dla każdego tempa i rozrzutu szukam średniej siły, przy której SC we wszystkich starciach tej broni jest najbliżej dziś (liczba ciosów to schodki — zgrubny rachunek chybiał o cały cios).
- **Rozrzut (0,5)** — kara za bardzo płaski (poniżej ±15%, czyli max/min 1,35) i bardzo szeroki (ponad 2,0).
- Liczby min/max zaokrąglone tak, jak się je wpisuje ręcznie: od 10 całe, poniżej co 0,5. Życie (hp) bez zmian.

## Dziś (punkt odniesienia)

| atakujący | średnia rana na cios | czas do trafienia | przerwa | rozrzut |
|---|---|---|---|---|
| rycerz | 55.8 | 0.52 s | 0.55 s | ×1.35 |
| Cerber | 11.6 | 0.66 s | 1.08 s | ×1.35 |
| Cień | 2.6 | 0.00 s | 1.00 s | ×1.35 |
| grabarz | 2.4 | 0.00 s | 0.50 s | ×1.50 |
| mnich (księga) | 2.0 | 0.00 s | 1.25 s | ×1.00 |

## Ranking — 10 najlepszych

| miejsce | nr | opis | kara | p Cienia | p Cerbera | rycerz | Cerber | Cień | grabarz | mnich |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 3 | pancerne Cienie (p 20) | 0.053 | 20 | 0 | 45–67, 0,5+0,6 s | 9,5–14, 0,7+1 s | 2–3,5, 0,3+0,7 s | 2,5–3,5, 0,25+0,25 s | 2–3, 0,5+0,75 s |
| 2 | 1 | jak dziś (tempo i rozrzut ±15%, bez pancerzy) | 0.058 | 0 | 0 | 48–64, 0,5+0,6 s | 9,5–13, 0,7+1 s | 2,5–3, 0,3+0,7 s | 2–3, 0,25+0,25 s | 1,5–2,5, 0,5+0,75 s |
| 3 | 18 | losowy | 0.066 | 30 | 25 | 56–83, 0,5+0,6 s | 7,5–12, 0,6+0,8 s | 3–4, 0,5+0,7 s | 4–6,5, 0,4+0,4 s | 3–4, 0,8+0,8 s |
| 4 | 2 | jak przykład z kartki (rozrzut 2,0 — „10–20”) | 0.066 | 0 | 0 | 37–75, 0,5+0,6 s | 7,5–15, 0,7+1 s | 2–3,5, 0,3+0,7 s | 1,5–3,5, 0,25+0,25 s | 1,5–2,5, 0,5+0,75 s |
| 5 | 100 | losowy | 0.080 | 0 | 0 | 45–67, 0,5+0,6 s | 7,5–12, 0,6+0,8 s | 2–3,5, 0,5+0,5 s | 2–3,5, 0,3+0,2 s | 2–2,5, 0,8+0,5 s |
| 6 | 8 | losowy | 0.085 | 20 | 15 | 51–77, 0,5+0,6 s | 8,5–13, 0,8+0,8 s | 2–3,5, 0,5+0,5 s | 2,5–4, 0,3+0,2 s | 2,5–4, 0,8+0,8 s |
| 7 | 55 | losowy | 0.089 | 10 | 0 | 41–71, 0,5+0,6 s | 8,5–15, 0,8+1 s | 2–3,5, 0,4+0,6 s | 2,5–4,5, 0,3+0,3 s | 2–4, 0,8+0,8 s |
| 8 | 88 | losowy | 0.090 | 30 | 25 | 56–83, 0,5+0,5 s | 8,5–13, 0,8+0,8 s | 2–3,5, 0,3+0,7 s | 3–5, 0,3+0,3 s | 2,5–3,5, 0,8+0,5 s |
| 9 | 14 | losowy | 0.098 | 10 | 0 | 41–71, 0,5+0,5 s | 7,5–14, 0,8+0,8 s | 2–3,5, 0,5+0,5 s | 2,5–4,5, 0,3+0,3 s | 2–3, 0,8+0,5 s |
| 10 | 72 | losowy | 0.099 | 30 | 25 | 59–80, 0,6+0,5 s | 9,5–13, 0,7+1 s | 2,5–3, 0,5+0,5 s | 3,5–4,5, 0,4+0,2 s | 2,5–3,5, 0,8+0,5 s |

Nazwane warianty dla porównania (gdzie wypadły w rankingu):

- nr 1 „jak dziś (tempo i rozrzut ±15%, bez pancerzy)” — miejsce 2, kara 0.058
- nr 2 „jak przykład z kartki (rozrzut 2,0 — „10–20”)” — miejsce 4, kara 0.066
- nr 3 „pancerne Cienie (p 20)” — miejsce 1, kara 0.053
- nr 4 „pancerny Cerber (p 25)” — miejsce 13, kara 0.117
- nr 5 „szybkie i słabe ciosy” — miejsce 20, kara 0.160
- nr 6 „wolne i mocne ciosy” — miejsce 91, kara 0.318

## Propozycja: wariant nr 3 (miejsce 1)

**Zatwierdzony przez użytkownika 20.11** — w grze: `src/Trzewia.Symulacja/Symulacja/WalkaWzor.cs`.

| atakujący | min | max | czas | przerwa |
|---|---|---|---|---|
| rycerz | 45 | 67 | 0,5 s | 0,6 s |
| Cerber | 9,5 | 14 | 0,7 s | 1 s |
| Cień | 2 | 3,5 | 0,3 s | 0,7 s |
| grabarz | 2,5 | 3,5 | 0,25 s | 0,25 s |
| mnich (księga) | 2 | 3 | 0,5 s | 0,75 s |

Pancerz p: Cień 20, głowa Cerbera 0, rycerz z tarczą 25 (tarcza dziś zmniejsza rany o 20% — w Twoim wzorze to dokładnie p = 25), reszta 0.

Każde starcie (Twoje wzory, jak w przykładzie z kartki):

| starcie | O_min | O_max | S | d_śr | SC (nowe) | najgorzej / najlepiej | dziś |
|---|---|---|---|---|---|---|---|
| rycerz → głowa Cerbera | 45.0 | 67.0 | 56.0 | 3 | 2.7 s | 3.8 / 2.7 s | 2.7 s |
| rycerz → Cień (fala 1) | 37.5 | 55.8 | 46.7 | 1 | 0.5 s | 0.5 / 0.5 s | 0.5 s |
| rycerz → Cień (fala 4) | 37.5 | 55.8 | 46.7 | 2 | 1.6 s | 1.6 / 1.6 s | 1.6 s |
| grabarz → Cień (fala 1) | 2.1 | 2.9 | 2.5 | 15 | 7.2 s | 8.8 / 6.2 s | 7.0 s |
| mnich (księga) → Cień (fala 1) | 1.7 | 2.5 | 2.1 | 18 | 21.8 s | 26.8 / 18.0 s | 21.2 s |
| Cień → rycerz | 2.0 | 3.5 | 2.8 | 44 | 43.3 s | 59.3 / 34.3 s | 46.0 s |
| Cień → rycerz z tarczą | 1.6 | 2.8 | 2.2 | 55 | 54.3 s | 74.3 / 42.3 s | 57.0 s |
| Cień → grabarz | 2.0 | 3.5 | 2.8 | 5 | 4.3 s | 6.3 / 3.3 s | 4.0 s |
| Cień → mnich | 2.0 | 3.5 | 2.8 | 4 | 3.3 s | 4.3 / 2.3 s | 3.0 s |
| Cerber → rycerz | 9.5 | 14.0 | 11.8 | 11 | 17.7 s | 21.1 / 14.3 s | 18.0 s |
| Cerber → rycerz z tarczą | 7.6 | 11.2 | 9.4 | 13 | 21.1 s | 26.2 / 17.7 s | 21.4 s |
| Cerber → grabarz | 9.5 | 14.0 | 11.8 | 2 | 2.4 s | 2.4 / 0.7 s | 2.4 s |

