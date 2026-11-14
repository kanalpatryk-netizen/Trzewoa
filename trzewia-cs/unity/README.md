# Trzewia w Unity — duszki postaci i model 3D dłoni

Grafika postaci i dłoni z portu C# jest przygotowana tak, żeby dało się jej użyć także w Unity (i w Godocie).
**Uwaga:** skrypty z tego folderu powstały bez dostępu do Unity — nie były uruchamiane. Format danych jest ten sam,
z którego korzysta gra C# (tam jest sprawdzony testami), ale sam import w Unity może wymagać drobnych poprawek.

## 1. Duszki (sprite'y) postaci

Pliki: `trzewia-cs/dane/grafika/duszki/` — na każdą postać `<nazwa>.json` (opis) i strony PNG z przezroczystością
`<nazwa>-h<wysokość>-<nr>.png` w pięciu poziomach wielkości (21, 28, 40, 56, 80 px wysokości postaci ludu).
Podglądy w JPG (do oglądania, nie do gry): `trzewia-cs/duszki-podglad/`.

Postacie: `robotnik-3/4/5/7/8` (i warianty `-helm`), `pobozny-1/2`, `rycerz-6-z0…z5` (z0 — bez zbroi, z5 — pełna:
hełm, naramienniki, napierśnik, nakolanniki, tarcza), `straznik`, `demon`.

Import:

1. Skopiuj folder `Assets/Trzewia` z tego katalogu do swojego projektu Unity.
2. Skopiuj `trzewia-cs/dane/grafika/duszki` do projektu, np. jako `Assets/Trzewia/Arkusze`.
3. Zaznacz ten folder w oknie Project i wybierz z menu **Trzewia → Importuj duszki z zaznaczonego folderu**
   (największy poziom — 80 px, albo poziom 40 px).
4. Dla każdej postaci powstaje folder `<nazwa>_unity` z zasobem `DuszekDane` (klatki jako Sprite'y w kolejności
   arkusza, animacje ze sterownikami, światła klatek), klipami `.anim` i kontrolerem Animatora.

Użycie: obiekt ze `SpriteRenderer` + składnik `Duszek` (pole `dane`, `Graj("idzie")`) albo Animator z gotowym
kontrolerem. Gra wybiera klatkę sterownikiem, nie zegarem — np. krok z przebytej drogi; tak samo w Unity:
`renderer.sprite = dane.Klatka("idzie", faza)`. Sterowniki (`ster` w opisie animacji):

| ster | czym jest `u` |
|---|---|
| `faza` | faza kroku 0..1 z przebytej drogi (pętla) |
| `fazaPion` | to samo dla wspinaczki |
| `zegar` | `frac(zegarCzynności[s] · mnoz + id · przes)` |
| `czas` | `frac(czasEkranu[ms] · mnoz + id · przes)` |
| `postep` | postęp ruchu 0..1 (np. cios, upadek) |

Punkt zaczepienia każdej klatki to środek stóp; postać ludu ma 1 jednostkę wysokości (rycerz 1,3; Strażnik 2).
Postać patrzy w prawo — w lewo: `flipX` albo skala −1. Światła (lampka, świeca) nie są wypalone w klatkach —
są w `DuszekDane.swiatla` (położenie i promień w ułamkach wysokości postaci, barwa, siła) do narysowania addytywnie.

Arkusze piecze `trzewia-cs/narzedzia/duszki/piecz.mjs` z oryginalnego rysunku gry TS (opis: `trzewia-cs/PLAN.md`, punkt 9).

## 2. Dłoń z otchłani i dłoń anielska — modele 3D

Pliki: `trzewia-cs/dane/grafika/modele/dlon-z-otchlani.glb` i `dlon-anielska.glb` (glTF 2.0, jeden plik).
W środku: siatka ze skórą (wagi do kości), szkielet (`dlon` + pięć palców po trzy kości: `kciuk1…3`,
`wskazujacy1…3`, `srodkowy1…3`, `serdeczny1…3`, `maly1…3`; w dłoni z otchłani dodatkowo `piesc` — wnętrze
zaciśniętej pięści) i animacje:

- `zacisk` — od otwartej dłoni do pięści (1 s; czas animacji = zacisk 0…1),
- `rzut`, `tarcza`, `zawal` (tylko dłoń z otchłani) — akcje dłoni demona, po 10 póz kluczowych w 1 s.

Import do Unity: glTF nie jest czytany przez Unity „z pudełka” — trzeba doinstalować oficjalny pakiet
**glTFast** (Package Manager → Add package by name → `com.unity.cloud.gltfast`), potem wystarczy wrzucić plik `.glb`
do `Assets`. Godot czyta `.glb` bez dodatków.

Co warto wiedzieć:

- jednostki to jednostki modelu (nadgarstek w (0,0,0), palce w +x, grzbiet dłoni w +y); cała dłoń ma ok. 45 jednostek —
  skalę ustaw przy imporcie albo na obiekcie;
- barwa skóry jest w barwach wierzchołków (`COLOR_0`, liniowo — skóra dłoni z otchłani jest celowo bardzo ciemna,
  jasność daje światło); kanał A to zanik ramienia ku łokciowi (materiał w pliku jest nieprzezroczysty — zanik trzeba
  włączyć we własnym shaderze); `TEXCOORD_0` = (okluzja, wklęsłość), `TEXCOORD_1.x` = wnętrze dłoni / miejsce na szponie;
- pliki `*.swiatlo.gz` obok modeli to zapieczone cienie póz dla gry C# (rysuje dłoń programowo) — w silniku niepotrzebne,
  cienie policzy silnik.

Modele buduje `trzewia-cs/narzedzia/dlon3d/buduj.mjs` z oryginalnego modelu brył gry TS
(`alpha-1/scripts/dlon/model.html`).
