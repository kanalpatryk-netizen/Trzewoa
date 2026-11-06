# TRZEWIA — Alpha 1 (komputer)

Nowa wersja: **oficjalna Alpha 0.2** (z nowym menu i ustawieniami) **+ wszystkie funkcje gry spoza oficjalnego
builda** — propozycje Pawła z 24.10 (wcześniej osobno w `propozycja-1/`) i nowy dół ekranu z księgą z pliku
`trzewia6.html` (5.11, źródło odtworzone z builda). `alpha-0.2/` i `propozycja-1/` zostają bez zmian.
Zapisy, ustawienia, atlas i osiągnięcia są tu osobne (klucze `trzewia-alpha-1:`). Tylko komputer — bez prac pod telefon.

**[⬇️ Pobierz trzewia-alpha-1.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-1.html)** — gra ·
**[⬇️ Pobierz trzewia-alpha-1-obserwatorium.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-1-obserwatorium.html)** — obserwatorium.
Otwórz w przeglądarce (jeden plik, bez instalacji, działa bez internetu). Plik jest też w repozytorium: [`trzewia.html`](trzewia.html).

## Nowy Wielki Pomnik i boss (5.11, wzór grafika)
- Pomnik według wzoru grafika (`render/demon-wzor.ts`): kamienny demon **stojący z rękami wzniesionymi**, z płomienną
  aureolą, naszyjnikiem z czaszek i twarzą na przepasce, zakuty w łańcuchy. Z dwóch rysunków (cały i pęknięty)
  powstały trzy warstwy w `obrazy/pomnik/`: sylwetka, kontur i same rysy.
- Stany: 1 — rysy na twarzy i barku, 2 — rysy do pasa i odłupane czubki aureoli, palce i stopa, 3 — rysy żarzą się,
  oczy się tlą. Rozpad w gruz jak dawniej.
- Inny wzór = podmienione pliki w `obrazy/pomnik/` (punkty: `WZOR` w `src/render/demon-wzor.ts`). Dawna rycina
  (`rysujDemonaRycina` w `src/render/demon.ts`) rysuje tylko, póki obrazki się wczytują.

## Boss — kukiełka z rysunku pomnika (5.11)
Użytkownik: „popraw drastycznie wygląd i wszelkie animacje bossa… animacji ma być dużo i mają być kompletne, sam
wygląd bossa ma być choć podobny do pomnika”. Boss to teraz **ten sam rysunek co posąg**, pocięty na ruchome części.
- **Cięcie i tekstury** (`scripts/pomnik/czesci.py`, z folderu `alpha-1`: `python3 scripts/pomnik/czesci.py [podgląd.png]`):
  rysunek dzieli się po narysowanych liniach na 18 części — aureola, łydki, stopy, uda, ramiona, przedramiona, dłonie,
  tułów, przepaska, naszyjnik z czaszek, głowa, szczęka (bez cokołu i płyt pod stopami). Każda część dostaje schowane
  zakładki pod sąsiadem z przodu (ruch nie odsłania dziur) i dwie skóry wypieczone z rysunku: **żywą** (ciemny bazalt
  z płaskorzeźbą kreski, kontra z płonącej aureoli zza pleców, żar w zagłębieniach) i **kamienną** (posąg). Do tego
  mapa świecenia: żyły żaru w kresce, **pęknięcia ran w 4 stopniach** (rysy wzoru + losowe pęknięcia) i oczy.
  Wynik: `obrazy/pomnik/kukla-zywy.webp`, `kukla-kamien.webp`, `kukla-zar.png` i `src/render/demon-czesci.ts`.
- **Szkielet** (`src/render/demon-kukla.ts`): miednica → tułów → głowa → szczęka, aureola, naszyjnik, ręce; ręce
  i nogi z IK (cel nadgarstka i kostki, łokcie i kolana na zewnątrz — przysiad to opuszczona miednica, stopy zostają
  na ziemi); przepaska marszczy się w przysiadzie. Ogień na brzegu aureoli (44 języki), oczy, wnętrze ust przy
  opadającej szczęce, żar w dłoniach, kajdany na nadgarstkach i kostkach, zerwane łańcuchy kołyszą się (fizyka).
- **Zachowanie** (`src/render/demon-boss.ts`, wg stanu gry — bez zmian w symulacji):
  - oddech (szybszy u rannego i w szale), mrugnięcia, warczenie, głowa śledzi cel albo się rozgląda;
  - ciężki chód z tupnięciami (pył, fala), lot w pionie i w skale (nogi zwisają; w skale prześwituje i sypie żwirem),
    postawa do walki przy celu;
  - **3 ciosy** (z góry; zamach pazurami ze smugą ognia; podcięcie od dołu) — zamach zaczyna się przed uderzeniem,
    uderzenie trafia w tik ciosu (`ciosT`), iskry i krąg w miejscu trafienia;
  - **uderzenie w ziemię** (zasypanie drogi, `zasypT`): ręce w górę z rykiem, przysiad, pięści w ziemię — fala,
    pył, gruz ze stropu, żarzące się pęknięcia podłogi;
  - **ryk** (po wstaniu, przy wejściu w szał, po zabiciu celu, co jakiś czas w ciszy): głowa w tył, szczęka
    otwarta, ręce szeroko, kręgi z ust, iskry;
  - **rozkazy dla dłoni z otchłani**: wskazuje rycerza, zaciska dłoń, unosi i ciska (rzut); krzyżuje ręce
    i się śmieje (tarcza); drze strop pazurami i ściąga go w dół (zawał); za ścianą gruzu wali się w pierś;
  - **modlitwa**: kuli się, zasłania twarz, drży, żyły złote, złoty pył i para; **zrastanie**: iskry wpływają
    w pierś, żar pulsuje jak serce; **rany**: pęknięcia w 4 stopniach, garbi się, kuleje, dymi; **szał** (< ¼ życia):
    drży, oczy ze smugą, aureola bucha; **oberwanie**: wstrząs, błysk, odpryski.
  - **Wstawanie z gruzu**: żar spod gruzu, przebija się prawa ręka, lewa, kamienna głowa z zapalającymi się oczami,
    wspiera się o podłogę i wstaje, kamień ożywa od piersi (odpryski), aureola bucha ogniem, ryk.
  - **Konanie**: odrzut i złote światło z piersi, zatacza się z dłonią na piersi, złote pęknięcia, gaśnie aureola,
    pada na kolana, kamienieje od stóp, rozpada się na kawałki → pył, popiół, kupka kamieni.
- Podgląd wszystkich ruchów (narzędzie dewelopera): `podgladRuchu(ctx, h, ruch, u, czas)` w `demon-boss.ts`.
  Póki obrazki kukły się wczytują, boss rysuje się po staremu (`demon-wzor.ts`).

## Walka: 25 ruchów rycerza i 19 ruchów demona (6.11)
Użytkownik: „każdy atak, każdy ruch w walce ma być konkretną animacją (rycerz ma mieć łącznie 25 zaawansowanych animacji
walk), a boss 20; animacje mają być długie i dobrze oddawać zadane obrażenia; niech niektóre ataki będą możliwe tylko, gdy
rycerz jest weteranem, a niektóre tylko, gdy ma konkretne części zbroi”. Animacje wysłane do zatwierdzenia jako GIF-y;
potem: „usuń animację skoku dla bossa” — skok z uderzeniem usunięty (demon ma 19 ruchów).
- **Ruchy są w symulacji** (`src/nastawy/walka.ts`, `src/sim/walka.ts`): każdy ma długość, chwile trafień i mnożniki siły,
  a w trakcie ruchu postać nic innego nie robi (cios idzie do końca). Rysunek odgrywa ten sam ruch od tego samego tiku
  (`c.ruch`), więc rana pada wtedy, gdy na ekranie spada ostrze. Siła średnio jak dawniej (rycerz ≈ cios co 60 tików,
  demon ≈ co 160): zwykły rycerz zadaje demonowi 0,32 rany na tik (dawniej 0,37), weteran w pełnej zbroi 0,52, a dostaje
  0,05 i 0,02 na tik (dawniej 0,0625).
- **Rycerz (25)** — `src/render/lud/walka-rycerza.ts`:
  - zawsze: cięcie z góry, pchnięcie, cięcie z boku, cięcie odwrotne, seria trzech cięć, cięcie od dołu;
  - tylko weteran: cięcie z obrotu (piruet), cios z wyskoku (z dwóch kafli), młynek (4 cięcia), finta i pchnięcie
    (demon nie zasłoni się ręką), cios dobijający (oburącz, na wroga poniżej 35% życia, klęka);
  - tylko w zbroi: uderzenie tarczą (tarcza; ogłusza), szarża z tarczą (tarcza + nakolanniki; z prawie 4 kafli), taran
    barkiem (naramienniki), cios kolanem (nakolanniki), uderzenie hełmem (hełm), kontra na napierśniku (napierśnik:
    przyjmuje cios na blachę i od razu tnie);
  - obrona i reakcje: blok tarczą (zostaje 30% rany), parowanie (weteran, bez rany, kontra), unik (nakolanniki), lekkie
    trafienie (walczy dalej), mocne trafienie (przerywa atak, zatacza się), powalenie (pada na plecy i wstaje, podpierając
    się mieczem);
  - garda między ciosami i podejście w gardzie.
  Efekty (iskry, odpryski, krąg, krew, pył) rosną z raną, którą cios naprawdę zadał (`c.ruch.zadane`); Strażnik odskakuje
  i sypie odpryskami tym mocniej, im większą ranę dostał. Kombinacje: po cięciu z boku częściej idzie odwrotne itd.
- **Demon (19)** — `src/render/demon-boss.ts`: cios z góry, zamach pazurami, podcięcie od dołu, podwójny zamach, zgniecenie
  oburącz (ogłusza), przygniecenie dłonią (rycerz leży pod dłonią), odepchnięcie (odrzuca), tupnięcie (obszar), ogniste
  tchnienie (stożek ognia, poniżej 65% życia), wybuch aureoli (pierścień ognia, poniżej 50%), bicz z łańcucha (5 kafli),
  szarża, uderzenie w ziemię, ryk, rozkazy dla dłoni (rzut, tarcza, zawał), blok
  przedramieniem i zachwianie / klęknięcie (po ciężkim ciosie; przy 50% i 25% życia pada na kolano, potem ryczy).
  Ciosy z góry, podcięcie, szarża i wybuch aureoli mogą powalić rycerza.
- Atlas: „Walka rycerza” (ruchy i wymagania, rycina z ruchami po kolei) i „Walka demona”.
- Przy demonie rycerz bierze Strażnika na cel tylko z bliska (do `rycerzBroniSieOd` kafli) — gonił Strażników krążących
  w skale nad przedsionkiem, a demon czekał na dnie nietknięty (ziarno 3: walka bez końca). Bot wygrywa na ziarnach 3, 4
  i 5 w 13–14 minut; rycerzowi zostaje 109–118 życia.
- Podgląd ruchów do GIF-ów i arkuszy: generatory w scratchpadzie sesji (rycerz: klony rycerza i Strażnika, demon: klony
  demona z rycerzem; czas gry przesuwany tik po tiku) — `podgladWalkiDemona` w `demon-boss.ts` rysuje pozę ruchu.

## Poprawki walki z demonem (5.11)
- Rycerz **zawsze widzi demona** (o ile nie jest głodny) — przy drodze wiernych jako głębokim szybie demon wstawał
  ponad 40 kafli pod rycerzem w sali i walka nigdy się nie zaczynała (demon 500/500 bez końca).
  Do dalekiego wroga (ponad 10 kafli, `STWORZENIA.walkaDrogaOd`) lud idzie **drogą** — schodami szybu i po linach —
  a nie na przełaj: prosto w dół z sali jest lity strop i rycerz tylko dreptał po sali.
- Dłoń z otchłani robi **zawał tylko przy demonie** (rycerz najwyżej 4 kafle wyżej/niżej) i nigdy w szybie drogi
  wiernych — wcześniej ściana gruzu stawała w sali i zamurowywała drogę w dół.

## Obserwatorium — jeden bot
`trzewia-alpha-1-obserwatorium.html` (`npm run obserwatorium`, szablon `scripts/obserwatorium/szablon.html`): duże okno
gry, w nim gra bot, a obok panel w stylu menu.
- **Partia:** czas, ziarno, styl bota, stan (w trakcie, fala, walka z demonem, wynik).
- **Sterowanie:** pauza, tempo ×¼–×20, styl bota, ziarno, „nowa partia”, „ta sama góra”, dźwięk,
  sama następna partia, a także **zatrzymaj czas, gdy:** fala Strażników, pomnik pęka, wstaje demon, ktoś ginie, koniec partii.
- **Postęp:** paski drogi wiernych, pęknięcia Wielkiego Pomnika, oddania, fal Strażników i życia demona.
- **Lud** (role, zgony), **wykres zasobów** przez całą partię (wiara, krew, jedzenie, oddanie; kreski przy falach i pęknięciach),
  **dziennik decyzji bota**, **przebieg partii** (oś zdarzeń), **kronika** (6 ostatnich wpisów).
- **Statystyki** wszystkich partii (wygrane %, średni czas wygranej, tabela — klik w wiersz gra tę górę jeszcze raz,
  eksport CSV), zapamiętywane w przeglądarce.
- Klawisze: spacja — pauza, +/− — tempo, N — nowa partia, M — dźwięk, H — schowaj panel.
Gra dosyła do panelu więcej stanu: `wyslijStan` w `src/app/obserwowany.ts`.

## Menu i ustawienia — jak w Alphie 0.2
Czarne menu według szkicu grafika (logo z bijącym sercem, znaki zespołu jako przyciski) i ustawienia w stylu menu
(4 kategorie-ikonki, najwyżej 5 ustawień w każdej) — opis w [`../alpha-0.2/README.md`](../alpha-0.2/README.md).

## Nowy dół ekranu: księga (z `trzewia6.html`)
- **Płyta prawie do krawędzi ekranu** — bez paska zasobów u góry, bez rytów po lewej, bez kroniki na dole
  (wpisy są w zapiskach), bez rady nad płytą, przycisku menu (Esc) i klepsydry (pauza — spacja).
- **Księga pod płytą** (`src/render/ksiega.ts`): otwarta księga w czerwonej oprawie, pisana odręcznym pismem
  (nowy krój „Trzewia Pismo”). Lewa karta **„Twój lud”** — trzy medaliony (robotnicy, pobożni, rycerze) z miniaturą
  postaci, liczbą i złotym łukiem zaznaczonych; dotknięcie zaznacza rolę. Prawa karta **„Zasoby”** — wiara, krew
  (ampułka, dymek po najechaniu), jedzenie, żelazo, złoto i oddanie; przy jedzeniu czerwona pieczęć **„+” — Nakarm**.
- **Okno postaci** (`src/render/okno-postaci.ts`): po zaznaczeniu w lewym dolnym rogu płyty kamienna tablica —
  imię i rola, portret w złotej niszy (dla grupy — cały oddział), paski życia i sytości, zamiar i stany, a pod spodem
  **możliwości**: Cud, Módl się / Przerwij modlitwę, Do ołtarza, Kop drogę wiernych, Pracuj w warsztacie / kuźni,
  Załóż zbroję, Idź spać, Napraw linę wiadra (miga, gdy pilne). Klawisze: Nakarm — od razu, Cud i Szept — przez okno.
- **„Budowa”** obok księgi (`src/render/budowa.ts`): płyta z kilofem otwiera menu kafli z pomieszczeniami (opis
  „co daje” i „jak postawić”), pod nią **„odwołaj rozkaz”**. Z lewej strony księgi okrągły przycisk **atlasu**,
  z prawej rząd przycisków (kamera, zapiski, zapis).
- **Cud jako objawienie** (`objawienie()` w `src/render/efekty.ts`): ciemność wokół, iskry nad głową pobożnego,
  aureola, krąg glifów, słup światła z góry, uderzenie o posadzkę, krąg na ziemi, pióra, smugi od wiernych (dłużej: 540 tików).
- **Samouczek** pod nowy interfejs (etapy `tylko: 'komputer' | 'telefon'`).
- Układ dołu: `ukladDolu` / `ukladKsiegi` w `src/render/przyciski.ts`, liczby: `ramaPlyty`, `dolMin/dolMax/dolCzesc`
  w `EKRAN` (`src/nastawy/ekran.ts`). Ikony: `src/render/ikony-hud.ts`. Wszystko rysowane w kodzie — placeholdery do podmiany przez grafika.

## Z Propozycji 1 (propozycje Pawła z 24.10)
- **Blok pod wiadrem:** robotnicy nie kopią przez blok, na którym stoi wiadro. Szukają drogi obok, a gdy jej
  nie ma, odmawiają. Rozkaz „kop” wskazany wprost na ten blok (albo ramka, która go obejmuje) odblokowuje kolumnę
  szybu wiadra do końca partii. Pobożny i rycerz nie kopią, idąc na przełaj.
- **Droga wiernych jako szyb ze schodami:**
  - szyb szeroki na 5 kafli przy lewej ścianie sali, prosto w dół do krypty;
  - we wnęce na start stoi rama z lampką, kilof i strzałka;
  - w każdym wykutym kaflu same pojawiają się schody, którymi chodzi się w obie strony;
  - plan widać zawsze;
  - pomnik pęka dopiero przy wykopanej drodze.
- **Ramka jak w Twierdzy:** lewy przycisk myszy przeciągnięty po mapie zaznacza postacie. Gdy w ramce nikogo nie
  ma, a zaznaczeni są robotnicy, oznacza skałę do wykucia. Widok myszą przesuwa się prawym albo środkowym przyciskiem.
- **Pomieszczenia gdziekolwiek:** także w litej skale i nad pustką. Robotnicy się do nich przekopują, a brakującą
  podłogę lud układa sam.
- (Interfejs z Propozycji 1 — ramki zasobów nad płytą, kamienne tła, kronika jako księga — na komputerze zastąpiła
  księga pod płytą; panele zostają na telefonie.)

Szczegóły propozycji Pawła: [`../handoff.md`](../handoff.md), sekcja 0. Uruchamianie i testy:
`npm install`, `npm run dev`, `npm test`, `npm run pack`.
