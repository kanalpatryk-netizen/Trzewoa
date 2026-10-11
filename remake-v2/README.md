# Trzewia — Remake v2 (komputer)

Dalszy ciąg Remake v1 — ten sam lud, ta sama góra, nowe rzeczy i obserwatorium z botami.
Remake v1 zostaje bez zmian w [`../remake-v1/`](../remake-v1) (punkt odniesienia).

**[⬇️ Pobierz trzewia-remake-v2.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-remake-v2.html)** — gra ·
**[⬇️ Pobierz trzewia-remake-v2-obserwatorium.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-remake-v2-obserwatorium.html)** — obserwatorium.
Otwórz w przeglądarce (jeden plik, bez instalacji, działa bez internetu).

## Co nowego w v2
- **Obserwatorium** — cztery okna gry naraz, w każdym gra bot (opis niżej).
- **Bot w grze** — gra sam w oknach obserwatorium (`src/app/bot.ts`).
- **Tylko Koszmar** — nie ma już wyboru trudności (łaskawa / surowa): każda nowa gra to Koszmar — 80 krwi na start,
  skorupa pęka wolniej (×0,7), dług u głębi boli bardziej, a z otchłani może przyjść dłoń. „Nowa gra” zaczyna się od razu.
- **Bez świata dnia** — z menu, osiągnięć i ekranu końcowego zniknął „Świat dnia”.
- **Samouczek, atlas i osiągnięcia od nowa** — 14 lekcji o tym, co jest w tej wersji (wiadra i Nakarm, ze skały,
  pauza, zawał i hełmy, ciemność i dłoń, Strażnicy, droga do wolności); atlas bez ras, których tu nie ma
  (Żużlowcy, Trole, Prządki, Grzybnia) i bez ludzi z powierzchni, bez proroka i cech nacji, z tablicami wiadra, zawału, hełmów i trupów;
  14 nowych osiągnięć (m.in. „Ostatkiem sił”, „Kilofy zamiast mieczy”, „Bez powrotu”, „Wyrwani z dłoni”).
- **Rycerz to krzyżowiec po bitwie** — kolczuga, brudny wapenrok z krwawym krzyżem, podarty płaszcz, hełm „głowa cukru”
  albo otwarty z blizną na twarzy, wyszczerbiona tarcza ze strzałami, krew na mieczu; miękkie cieniowanie zamiast kanciastego.
- **Zawał od góry** — gdy przez 20 s nikogo z ludu nie ma wysoko, góra nad nim zawala się (razem z gniazdami
  rycerzy, które tam spały). Kamera nie wjeżdża ponad gruz, mapa się skraca, a lud nie ucieknie w górę — musi walczyć.
- **Wiadro z jedzeniem zamiast grzyba i spiżarni** — co 40 s z góry, na linie, zjeżdża wiadro pełne jedzenia
  do pierwszego odkrytego, pustego miejsca przy najbardziej głodnych; każdy może z niego jeść. Kto umiera z głodu,
  wspina się po linie do zjeżdżającego wiadra i je w drodze w dół. Ryt „Nakarm” spuszcza dodatkowe wiadro (30 krwi).
- **Hełmy robotników** — gdy nie zostanie ani jeden rycerz, robotnicy zakładają hełmy i walczą zamiast nich.
- **Trupy zostają** — zmarli leżą tam, gdzie padli (najstarsze rozsypują się w kości).
- **Kamera nie jeździ sama do wydarzeń** — karta i ostrzeżenie tylko zaznaczają miejsce (poza ekranem: strzałka
  przy krawędzi); dotknięcie strzałki albo „pokaż miejsce ›” na karcie wiezie tam kamerę. Dawne zachowanie:
  ustawienia → „Kamera do wydarzeń”.
- Gra wychodzi od najnowszego stanu Remake v1 — z **dłonią z otchłani** (rzadko; klatki z modelu 3D,
  zawsze wznosi się z dołu, z otchłani pod ofiarą), mroczniejszym interfejsem, zwykłym czasem i linami przy ścianie.
  Odtąd nowe rzeczy trafiają do v2.

## Obserwatorium (`trzewia-remake-v2-obserwatorium.html`)
Cztery okna gry na jednej stronie. W każdym gra bot, a ty patrzysz na żywo.
- **Każde okno osobno:** tempo (×¼ … ×20), pauza, styl bota (*rozsądny*, *budowniczy*, *speedrun*, *bierny* — nic nie
  robi), ziarno świata (puste — losowe), „nowa partia”, „sama następna partia”
  (po końcu za 6 s zaczyna się następna) i dźwięk (tylko z jednego okna naraz). Nad oknem: czas gry, numer partii,
  ziarno i wynik; pod nim: lud (pobożni, robotnicy, rycerze), wiara, krew, jedzenie, ostatni wpis kroniki
  i historia partii (✓ uwolnienie / ✗ porażka, po ilu minutach).
- **Kliknij okno** — powiększa się na cały ekran, a pozostałe trzy grają dalej w miniaturach z boku
  (kliknięcie miniatury przełącza). **Esc** albo „⟵ Wszystkie okna” — powrót do czterech; klawisze **1–4** — przełącz.
  W powiększonym oknie możesz też sam klikać w grę — bot gra dalej.
- **U góry dla wszystkich naraz:** tempo, zatrzymaj, puść, nowe partie.
- Okna obserwatorium **niczego nie zapisują** w przeglądarce — twoje zapisy, ustawienia i atlas zostają nietknięte.
  Obserwatorium pamięta tylko swoje ustawienia okien.
- Bot (`src/app/bot.ts`) gra jak próbni gracze z testów: odpowiada na karty, wybiera, kogo wydaje skała, karmi głodnych,
  szepcze „przemyśl i kop” ku gniazdom rycerzy, stawia Cud i posyła pobożnych pod rdzeń. Tryb okna:
  `src/app/obserwowany.ts`, strona: `scripts/obserwatorium/szablon.html`, budowa: `npm run obserwatorium`
  (gra + `obserwatorium.html` obok).

## Co jest inaczej (od 4.2 beta)
- **Jeden lud — Pobożni** — zamiast wielu ras. Trzy role:
  - **pobożni** — modlą się i schodzą pod rdzeń,
  - **robotnicy** — kopią i donoszą jedzenie z wiader (v2; dawniej znosili je do spiżarni w siedzibie),
  - **rycerze** — miecz, dużo życia i obrażeń, wolni, prawie się nie modlą, nie uciekają.
- **Nikt się nie rodzi.** Co 15 s skała wydaje nową postać tej roli, którą wybierzesz u góry ekranu
  (*ze skały: robotnik / pobożny*). Kosztuje **krew**, a nowy przez minutę jest osłabiony (−60%).
- **Krew** to zasób: zapas na start, + za każdą śmierć, + ofiara (szept „ofiaruj”),
  + samookaleczenie pobożnego (szept „okalecz się” — krew teraz, on słabszy na zawsze).
- **Jedzenie** (v2: w wiadrach, które zjeżdżają z góry — patrz wyżej; poniżej opis z v1) leży w spiżarniach — w siedzibie i w każdym obozie. Robotnicy donoszą je pobożnym
  i rycerzom tam, gdzie stoją (z najbliższego obozu z jedzeniem, a gdy tam pusto — z poprzedniego),
  a sami jedzą z najbliższej spiżarni. Rudy nie ma.
- **Porządek pod rdzeniem:** pobożni modlą się w szeregu, rycerze stoją na warcie po bokach,
  robotnicy kopią daleko od rdzenia. Szept „przerwij modlitwę” zawraca pobożnego.
- **Wędrowna siedziba** — gdy większość ludu nie może do niej wrócić (najwyżej co 2,5 min),
  przenosi się tam, gdzie jest ich najwięcej; robotnicy przenoszą jedzenie ze starej spiżarni.
  Odcięte grupki zakładają obozy (znaczniki na mapie).
- **Zamiary:** każdy ma cel na ~10 s (widać go na karcie postaci), zamiast co chwilę losować zajęcie.
- **Aureole:** jasna — wzmocnienie, czerwona — osłabienie; karta mówi, co to i kiedy minie.
- **Kamienni rycerze** śpią w gniazdach zamurowanych w skale (5 gniazd, po 2–3 rycerzy, na różnych
  głębokościach, w litej skale). Gdy ktoś z ludu jest blisko, gniazdo słabo się żarzy. Kto się do
  niego dokopie, budzi rycerzy — od razu weteranów. Ze skały rycerzy się nie przywołuje.
- **Szept „Przemyśl i kop”** (robotnik, 6 wiary): klęka, prosi o znak, potem powoli kopie tunel ku
  najbliższemu gniazdu. Znak jest niedokładny — gniazdo leży na jednym z trzech torów; każdy kopacz
  bierze tor jeszcze niesprawdzony. Jeden trafia mniej więcej raz na trzy, trzech — na pewno.
  W gniazdo **pokazane** (karta snu albo uśpiony boss) trafia bez zgadywania: robotnik dochodzi jak
  najbliżej i kopie wyliczoną trasą. Gdy coś zagrodzi tunel tuż przy gnieździe (≤6 kafli),
  rycerze słyszą kopanie i przebijają się sami.
- **Szept „kop losowo”** (tylko rycerz, 4 wiary): wykopuje ~10 połączonych kafli skały obok siebie (w bok i w dół), kopiąc jak robotnik — na chybił trafił; trafi blisko śpiącego gniazda, to je budzi.
- **Weterani:** po 4 minutach w ludzie, póki najedzony, a lud wierny — +30% siły, szybkości, kopania
  i modlitwy, jasna aureola. Na karcie widać też „weteran bez premii” i dlaczego.
- **Strażnicy Snu** wychodzą spod skorupy przy 20, 45 i 70% jej skruszenia; przy 90% przychodzi boss.
  Dopóki fala trwa, skorupa nie pęka i nikt nie wejdzie do rdzenia. Walczą rycerze (Strażnicy biorą
  ich na cel najpierw); pobożni i robotnicy odchodzą spod rdzenia. Za pokonaną falę: wiara.
- **Boss — Śniący Kamień:** rani go tylko rycerz, a rycerze ruszają na niego dopiero we trzech (mniej czeka na skraju strefy i broni się, gdy coś podejdzie, aż przyjdą nowi z gniazd; gdy gniazd już nie ma, idą, ilu jest — `rycerzyNaBossa` w `src/nastawy/straznicy.ts`); co jakiś czas zasypuje kawałek drogi wiernych
  (robotnicy muszą ją odkopać); słabnie, gdy pod rdzeniem modli się trzech pobożnych, a bez modlitwy
  się zrasta. Bossa łatwo podmienić: nastawy w `src/nastawy/boss.ts`, zachowanie w `src/sim/boss.ts`
  (rejestr `BOSSOWIE` i `AKTYWNY_BOSS`). Fale: `src/nastawy/straznicy.ts`.
  Gdy przez 2 minuty nie ma przed nim żadnego rycerza, zapada w ścianę na 4 minuty (skorupa wtedy nie
  pęka, pasek pokazuje odliczanie) i zdradza jedno gniazdo — lud może odżyć i zebrać rycerzy.
  Gdy wszystkie gniazda są już rozkopane, a rycerzy brak, boss nie zasypia: pobożni unoszą księgi
  i razią Strażników z dystansu (9 kafli, cofają się, gdy wróg podejdzie), a boss i jego słudzy biją ich.
- **Nowa talia kart:** spisek rycerzy (rzadki — najwyżej raz na 5 min; zostawiony po 2 min wybucha buntem — część rycerzy zmienia barwy
  i bije lud; wierni rycerze ruszają na nich sami), zatrute plony, zawał nad drogą
  wiernych, sen o kamiennych rycerzach (pokazuje gniazdo). Liczby: `src/nastawy/karty-ludu.ts`.
- **Postacie ludu** (`src/render/postacie.ts`, kod w `src/render/lud/`): kończyny z mięśniami, dłonie z kciukiem,
  buty z podeszwą, głowy z profilu (oczy, brwi, usta, uszy, brody); robotnik — czapka z lampką i snopem światła, chusta,
  kamizelka, łata na kolanie, kilof przez plecy, worek z grzybami; pobożny — kaptur ze szpicem, szkaplerz z haftem,
  sznur z frędzlem, krzyżyk, laska z krzyżem i wstążką, księga; rycerz — hełm z nitami i świecącym wizjerem, pióropusz,
  naramiennik, nakolanniki, kolczuga, tarcza z okuciem, pochwa miecza. Animacje z klatek kluczowych (`lud/ruch.ts`):
  chód z przetaczaniem stopy (krok dopasowany do drogi — stopy się nie ślizgają), bieg z fazą lotu, kopanie (zamach
  z zatrzymaniem, uderzenie z odpryskami, powrót), cięcie i pchnięcie mieczem na przemian ze smugą ostrza, modlitwa,
  wspinaczka, upadek i lądowanie, wzdrygnięcie przy trafieniu, drobne gesty, gdy stoi. Peleryna, pióra, kaptur, szata,
  worek i wstążki mają bezwładność, a zmiana czynności przechodzi płynnie. Szczegółowość rośnie z przybliżeniem;
  przy jakości „szybka” (albo gdy auto tnie jakość) bez najdrobniejszych detali. Dawny rysunek: ustawienia → „Nowe postacie”.
- **Klamry** widać przy ścianach szybów (zaczepy) i w pustce (liny).
- **Mrok i Ten, który patrzy** (`src/sim/mrok.ts`, nastawy w `src/nastawy/mrok.ts`): świat widać w pełni tylko w świetle
  lampek, aureol, obozów, rdzenia i Cudu. W ciemności krąży coś, co wypatruje samotnych daleko od obozu (nie rycerzy)
  i po 15 s patrzenia zabiera ich (stoją wtedy jak wryci); gra staje i ostrzega. Odpędza je Cud tuż obok albo ktoś z ludu, kto podejdzie.
- **Dłoń z otchłani (rzadko; w v2 każda góra to Koszmar)** (`src/sim/dlon.ts`, rysunek `src/render/dlon.ts`, nastawy `src/nastawy/dlon.ts`):
  gdy ktoś z ludu stoi daleko od obozu, a pod nim zaczyna się nieznane, pod jego stopami żarzy się czerwona łuna i z głębi,
  zawsze od dołu, wznosi się ogromna dłoń, chwyta jedną albo dwie postacie i zapada się z nimi w dół (bez kości). Gra staje
  i ostrzega; Cud przy nich przed chwytem spycha ją z powrotem w otchłań. Najwcześniej po 6 min, najwyżej 2 razy na partię.
- **Bez snu góry.** Przegrywasz dopiero, gdy nie da się już wygrać: nie ma pobożnych,
  a nawet ofiara ze wszystkich nie da krwi na nowego.

## Dalsze etapy (plan)
Wszystkie cztery etapy zrobione — dalej: poprawki po testach.

Film z rozgrywki (etap 4, jeszcze z v1): [`../remake-v1/film/remake-v1-etap4.webm`](../remake-v1/film/remake-v1-etap4.webm).

Stan po poprawkach (bot na 64 światach): 64 wygrane, 0 porażek, ~65 zgonów, średnio 10,4 min partii.

Znane braki: gdy wszystkie gniazda są odkopane, a rycerze zginęli, bossa nie da się pokonać (zasypia
i wraca w kółko); karta spisku często zabiera rycerzy. (v2: tablice atlasu o dawnych rasach usunięte;
bez rycerzy walczą robotnicy w hełmach, a pobożni razią bossa księgami.)
