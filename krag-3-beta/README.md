# TRZEWIA — Krąg Trzeci (beta, komputer)

Wersja próbna na bazie **Alphy 1**: gra przeniesiona do **trzeciego kręgu piekła Dantego** — kręgu żarłoków
(Piekło, pieśń VI). Zrobiona szybko, „bez przykładania gigantycznej wagi do szczegółów” (polecenie użytkownika
15.11). `alpha-1/` zostaje bez zmian. Zapisy, ustawienia, atlas i osiągnięcia są tu osobne (klucze `trzewia-krag-3-beta:`).

Uruchomienie: `npm ci`, potem `npm run dev` (podgląd) albo `npm run pack` (jeden plik `trzewia.html`).

## Fabuła (2. podejście, po uwagach użytkownika 15.11)
Piekło to lej wbity w ziemię aż po jej środek. Trzeci krąg należy do żarłoków: leżą tysiącami w błocie, pod wiecznym
deszczem z gradem, a nad nimi stoi Cerber, szarpie ich i obdziera ze skóry (Piekło, pieśń VI). Przeszedł tędy żywy
człowiek z przewodnikiem. Przewodnik rzucił Cerberowi garść ziemi w paszcze i obaj zeszli niżej. Sześciu żarłoków
to widziało i wstało z błota:
- trzech **grabarzy**: za życia kopali groby, więc kopią i teraz;
- dwóch **mnichów**: modlili się z pełnymi ustami, ale pamiętają modlitwy;
- **rycerz**: przejadł majątek, ale nie zapomniał miecza.

Gracz jest **trzewiami kręgu**, czyli ziemią, która trawi żarłoków. Szóstka schodzi w nią, żeby dokopać się do
zapieczętowanego zejścia do kręgu czwartego. Kosz resztek spuszczają im inni potępieni. Gdy mnisi skruszą modlitwą
pieczęć, Cerber zeskakuje za nimi. Wygrana to „Zejście do kręgu czwartego”.

## Wstęp: film i scena wejścia (`src/app/film-kregu.ts`, `src/app/wstep-kregu.ts`)
- **Film (ok. 75 s)**: jeden ciągły przerywnik jak w grach (po uwadze z 15.11 „to nie jest komiks, tylko dość brutalna
  opowieść”): kamera jedzie, najeżdża i trzęsie się przy uderzeniach, cięcia między ujęciami, kinowe napisy (narrator
  kursywą, kwestie z myślnikiem), ziarno, zimna gradacja i winieta. Bez dymków, ramek i wyrazów dźwiękonaśladowczych.
  Kolejne ujęcia:
  1. zjazd z nieba na krąg w deszczu;
  2. dwóch żarłoków bije się o ochłap;
  3. ziemia drży i za wzgórzem wyrastają trzy łby;
  4. rzeź: Cerber patroszy jednego i ciska trupem, drugiego rozrywa na pół (kamera najeżdża, trzewia wypadają, fontanna
     krwi), trzeciego miażdży łapą (głowa odskakuje) i połyka, czwartemu odrywa rękę;
  5. pojawiają się Dante i Wergiliusz (ciemne sylwetki w deszczu), Cerber ryczy z zakrwawionymi paszczami;
  6. trzy ujęcia: Wergiliusz schyla się, prostuje z garściami błota i ciska je w trzy gardła;
  7. pies żre, a wędrowcy schodzą w dół;
  8. żarłocy leżą twarzą w błocie — jeden unosi głowę: „Ktoś to widział”;
  9. trzy ujęcia: grabarz wyciąga łopatę, mnich się modli, rycerz wyciąga miecz;
  10. szóstka razem: „Zejdziemy i my”;
  11. kamera schodzi w trzewia: warstwy mułu, kości, wciągane ciała, żyły ziemi, pieczęć z płaskorzeźbą Cerbera;
  12. Cerber podnosi łby znad trupa, na koniec pojawia się tytuł.

  Esc pomija film.
- **Scena wejścia bez sterowania**: szóstka wstaje z błota, idzie przez krąg i schodzi po linie do sali. Dopiero po
  „Teraz ty.” gracz przejmuje kontrolę.
- **Potępieni** w filmie i w grze to ten sam nagi, obrzmiały żarłok z modelu 3D (`src/render/czlowiek3d.ts`), składany
  z wypieczonych części na stawach z `src/render/ludzik.ts` (`src/render/zarlok-sprite.ts`, obrazki w `obrazy/zarlok/`).
  Leży, czołga się, wyje, żre, błąka się i bije o ochłap, a da się go też trzymać w paszczy, rozerwać i zjeść. Rany są
  dosłowne: rozerwanie w pasie z poszarpanym przekrojem (tłuszcz, mięso, kręgosłup) i wywleczonymi jelitami, rozpruty
  brzuch, oderwana głowa, kikuty, kupa trzewi.

## Krąg (`src/render/krag-swiat.ts`, `src/render/potepieni.ts`)
- **Kształt leja:** nad powierzchnią widać wnętrze leja, czyli tarasy wyższych kręgów jak rzędy amfiteatru. Na kręgu
  drugim wicher niesie dusze, na pierwszym jest blask zamku Otchłani. Po prawej taras kończy się przepaścią do
  kręgu czwartego, z której bije łuna. Kamera sięga wysoko nad taras.
- **Potępieni wszędzie:** ok. 200 żarłoków na tarasie i w pustkach pod nim (jaskinie, ruiny, sala, krypta przy pieczęci).
  Mają wzrost naszych postaci; to ten sam żarłok z modelu 3D co w filmie (blada, brudna, mokra skóra). Każdy ma swoją
  czynność i rytm: leży i drga w błocie, klęczy i wyje w deszcz, żre błoto, grzebie
  w nim, błąka się, dwóch szarpie się o resztki. W ścianach wykutych korytarzy tkwią twarze i ręce wciąganych przez
  ziemię żarłoków.
- **Cerber nie siedzi w lochu.** Krąży po tarasie i przy każdym postoju (co ok. 6 s gry) zabija żarłoka jednym
  z pięciu sposobów (`src/render/zabijanie.ts`): szarpie i ciska trupem, rozrywa dwiema głowami na pół, połyka w całości,
  miażdży łapą i żre we trzy łby, podrzuca i chwyta w paszczę (głowa odpada). Zostają szczątki i kałuże krwi, a po
  ok. minucie cień znów leży w błocie (`zabiciaCerbera` w `src/sim/krag.ts`).
  Gdy jest blisko szybu, kiedy kosz rusza w dół, pożera 25% porcji. W lochu na dnie jest **pieczęć zejścia**:
  kamienne koło z wyrytym trójgłowym psem, skute łańcuchami. Modlitwa ją kruszy (rysy świecą łuną kręgu czwartego),
  a gdy pęknie, Cerber zeskakuje z góry, ląduje i wyje na trzy gardła.
- Wóz z resztkami ciągną zaprzęgnięci potępieni zamiast koni. Role w księdze to grabarze, mnisi i rycerz.

## Mechaniki (`src/sim/krag.ts`, liczby: `src/nastawy/krag.ts`)
- **Obżarstwo.** Gdy w koszu jest jedzenia w bród, szóstka je ponad głód. Obżarty jest wolniejszy, słabiej kuje
  i bije (zielonkawe smugi smrodu nad głową), a przejedzony pada twarzą w błoto i leży ok. 10 s.
- **Ulewa.** Leje zawsze, a co jakiś czas przychodzi ulewa z gradem, śniegiem i błyskawicami. Zimno przyspiesza
  głód (×1,15), a błoto spowalnia krok (×0,9). Ze stropów tuneli kapie woda.
- **Okup dla Cerbera.** W walce ktoś z szóstki (najczęściej rycerz) rzuca Cerberowi garść jedzenia w paszcze, jak
  przewodnik w pieśni VI. Głowy żrą i przez 2,5 s nie gryzą. Kosztuje to 2 porcje.
- **Cerber podjada kosz** na tarasie (patrz wyżej).

## Cerber (`src/render/cerber3d.ts`, `src/render/cerber-sprite.ts`, `src/render/cerber-boss.ts`)
Model 3D według obrazka referencyjnego (muskularny pies, krótka lśniąca sierść, kudły na piersi, kolce na grzbiecie,
wężowy ogon w łuskach, łapy z pazurami) i trzy różne głowy: doberman z przyciętymi uszami, wilk z kryzą, pitbull
z szeroką czaszką — z fałdami warg, dziąsłami, pełnym uzębieniem, językiem, śliną i krwią. Bryły zlewają się w jedno
ciało (pola odległości, shader WebGL2 w `src/render/gl3d.ts`: sierść z połyskiem wzdłuż włosa, krótki włos na
krawędziach, cienie, zacienienie, krew w zaciekach, przekroje ran).

Render jest za wolny, by liczyć go w grze, więc model **wypieka się raz do obrazków** (`obrazy/cerber/`, położenia
w `src/render/cerber-wypiek.ts`): klatki chodu, stania dęba, przysiadu, leżenia, odrzutu i kamienia, ogon, trzy szyje
i głowy w 4 kątach × 5 rozwarciach paszczy × 2 stopniach krwi. Gra składa z nich Cerbera według szkieletu
(`src/render/cerber-rig.ts`) — na kręgu, przy zabijaniu, na pieczęci (płaskorzeźba i posąg), w skoku, w walce
i przy konaniu. W walce odgrywa ruchy dawnego demona:
- ciosy to kłapnięcia jednej głowy;
- tupnięcie to stanięcie dęba;
- tchnienie to ogień ze środkowej paszczy;
- bicz to smagnięcie ogonem;
- ryk to wycie trzech gardeł.

Przy okupie głowy żrą, a na koniec Cerber kona w złotym świetle i rozpada się na bryły. Dawny rysunek 2D
(`src/render/cerber.ts`) zostaje tylko na chwilę wczytywania obrazków.

**Nowy wypiek** (po zmianie modelu): `npm run dev`, potem
`node scripts/wypiek-cerbera.mjs http://localhost:5180` (Cerber) albo `... --zarlok` (żarłok i rany); drugi argument
zawęża do części o danym przedrostku (np. `glowa-1`). Podgląd części: `narzedzia/wypiek-cerbera.html`.

## Próby bota (`node scripts/proby-graczy.mjs $PWD <ziarno> rozsadny 40 plik.log`)
Ziarna 3, 5, 11 i 13 kończą się wygraną w ok. 15 minut gry, ziarno 7 przegrywa z głodu (po zmianach z 2. podejścia, z Cerberem podjadającym kosz). W Alphie 1 bot wygrywa na tych
ziarnach w 14–16 minut. Pierwsze, ostrzejsze liczby ulewy i obżarstwa przegrywały 2 z 2 partii, stąd obecne łagodniejsze.

## Czego nie ruszano (do zrobienia, jeśli wersja się przyjmie)
Ikony i ryciny w księdze, freski w atlasie, menu i samouczek mają jeszcze motywy z Alphy 1. Stary film intro
(`filmy/intro.mp4`) leci przed menu, a plansze kręgu dopiero po „Nowej grze”.
