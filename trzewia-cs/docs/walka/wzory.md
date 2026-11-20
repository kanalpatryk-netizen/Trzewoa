# Wzory walki i obrażeń (od użytkownika, 20.11)

Obowiązują w Kręgu Trzecim, za flagą — domyślnie włączoną (wyłączona: walka jak dotąd, jak w wersji TS; tak liczą
też testy zgodności z TS). Alpha 1 bez zmian. Liczby dla postaci i broni:
`docs/walka/konsultacja.md` (100 wariantów z narzędzia `tools/walka/balans.py`, wybór do zatwierdzenia).

## Zmienne

Ustawiane ręcznie dla postaci / broni:
- **min, max** — dolny i górny pułap ataku,
- **a** — losowa liczba z przedziału 1–2 (np. 1,37),
- **p** — pancerz celu,
- **hp** — życie celu,
- **czas** — czas samej animacji ataku w sekundach (obrażenia wchodzą na jej końcu),
- **przerwa** — odpoczynek między kolejnymi atakami w sekundach.

Wyniki: **L** — siła jednego ataku, **O** — obrażenia po pancerzu, **d** — liczba uderzeń do zabicia, **f** — czas
walki do śmierci celu, **S** — średnie obrażenia na cios, **SC** — średni czas walki.

## W grze (przy każdym ciosie)

- **L = min + (max − min) · (a − 1)** — na początku każdego ataku (a = 1 → min, a = 2 → max).
- **O = L · 100 / (100 + p)** — w chwili trafienia, na końcu czasu ataku; potem **hp = hp − O**.

Gra nie liczy z góry d ani f — powtarza te dwa kroki, aż hp spadnie do 0 albo niżej.

## Do balansu (poza walką — narzędzie, arkusz)

- **d = ⌈hp / O⌉** — ile identycznych ciosów zbija całe hp (zaokrąglenie w górę; 8,1 → 9, równe 4,0 → 4).
- **f = d · czas + (d − 1) · przerwa** — po ostatnim, śmiertelnym ciosie nie ma już przerwy.
- **S = (O_min + O_max) / 2** — O_min dla L = min, O_max dla L = max.
- **SC = d_śr · czas + (d_śr − 1) · przerwa**, gdzie **d_śr = ⌈hp / S⌉** — główny wskaźnik balansu.

## Przykład z kartki

Miecz 10–20, czas 3 s, przerwa 1 s; wróg hp 100, p 25:
O_min = 10 · 100/125 = 8, O_max = 20 · 100/125 = 16, S = 12, d_śr = ⌈100/12⌉ = 9, SC = 9·3 + 8·1 = 35 s
(same maksymalne trafienia: ⌈100/16⌉ = 7 ciosów, 7·3 + 6·1 = 27 s).
