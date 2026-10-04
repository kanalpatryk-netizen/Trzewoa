# Trzewia — Remake v1 (komputer) · etap 4

Nowa gra na fundamencie 4.2 beta. Wszystkie wcześniejsze wersje zostają bez zmian (punkt odniesienia).

**[⬇️ Pobierz trzewia-remake-v1.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-remake-v1.html)**
i otwórz w przeglądarce.

## Co jest inaczej
- **Jeden lud — Pobożni** — zamiast wielu ras. Trzy role:
  - **pobożni** — modlą się i schodzą pod rdzeń,
  - **robotnicy** — kopią i znoszą jedzenie do spiżarni w siedzibie,
  - **rycerze** — miecz, dużo życia i obrażeń, wolni, prawie się nie modlą, nie uciekają.
- **Nikt się nie rodzi.** Co 15 s skała wydaje nową postać tej roli, którą wybierzesz u góry ekranu
  (*ze skały: robotnik / pobożny*). Kosztuje **krew**, a nowy przez minutę jest osłabiony (−60%).
- **Krew** to zasób: zapas na start, + za każdą śmierć, + ofiara (szept „ofiaruj”),
  + samookaleczenie pobożnego (szept „okalecz się” — krew teraz, on słabszy na zawsze).
- **Jedzenie** leży w spiżarniach — w siedzibie i w każdym obozie. Robotnicy donoszą je pobożnym
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
  głębokościach, z dala od magmy). Gdy ktoś z ludu jest blisko, gniazdo słabo się żarzy. Kto się do
  niego dokopie, budzi rycerzy — od razu weteranów. Ze skały rycerzy się nie przywołuje.
- **Szept „Przemyśl i kop”** (robotnik, 6 wiary): klęka, prosi o znak, potem powoli kopie tunel ku
  najbliższemu gniazdu. Znak jest niedokładny — gniazdo leży na jednym z trzech torów; każdy kopacz
  bierze tor jeszcze niesprawdzony. Jeden trafia mniej więcej raz na trzy, trzech — na pewno.
  W gniazdo **pokazane** (karta snu albo uśpiony boss) trafia bez zgadywania: robotnik dochodzi jak
  najbliżej i kopie wyliczoną trasą. Gdy ogień lub woda zagrodzi tunel tuż przy gnieździe (≤6 kafli),
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
  i bije lud; wierni rycerze ruszają na nich sami), zatrute plony, woda nad obozem, zawał nad drogą
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
- **Bez snu góry.** Przegrywasz dopiero, gdy nie da się już wygrać: nie ma pobożnych,
  a nawet ofiara ze wszystkich nie da krwi na nowego.

## Dalsze etapy (plan)
Wszystkie cztery etapy zrobione — dalej: poprawki po testach.

Film z rozgrywki: `film/remake-v1-etap4.webm`.

Stan po poprawkach (bot na 64 światach): 64 wygrane, 0 porażek, ~65 zgonów, średnio 10,4 min partii.

Znane braki: gdy wszystkie gniazda są odkopane, a rycerze zginęli, bossa nie da się pokonać (zasypia
i wraca w kółko); karta spisku często zabiera rycerzy; stare tablice atlasu o dawnych rasach zostały
jako punkt odniesienia.
