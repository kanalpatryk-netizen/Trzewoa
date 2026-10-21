# Trzewia — Alpha 0.3 (komputer) — wersja połączona i dwie wizje do porównania

Dalszy ciąg Alphy 0.2 w folderze `alpha-0.3/`. Alpha 0.2 zostaje bez zmian w [`../alpha-0.2/`](../alpha-0.2). Z jednego kodu
budują się **dwie wersje** — dwa pomysły zespołu na to, jak przywiązać gracza do drużyny:

**[⬇️ trzewia-alpha-0.3-patryk.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.3-patryk.html)** — wizja Patryka ·
**[⬇️ trzewia-alpha-0.3-pawel.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.3-pawel.html)** — wizja Pawła ·
obserwatoria: [Patryk](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.3-patryk-obserwatorium.html), [Paweł](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.3-pawel-obserwatorium.html).
Zapisy, ustawienia, atlas i osiągnięcia Alphy 0.3 są osobne (klucze `trzewia-alpha-0.3:`). Wersja robocza — wygląd jest szkicem.

## Wersja połączona (od 21.10) — `trzewia-alpha-0.3.html`
Na polecenie użytkownika („połącz te pomysły, zostaje wszystko, czego chciał Paweł; po lewej stronie ekranu są 3 opcje:
cud, nakarm i szepnij — chwilowo je usuń i tam daj poziome kwadraty z jednostkami”) obie wizje są w jednej grze:
- **Od Pawła — wszystko:** ślub drużyny po „Nowa gra”, pod płytą medaliony ról, talia tarota i karty na stole; lore tylko jako
  historia świata (Kronika góry w atlasie) — **bez życiorysów** (zdanie „kim była” nie pojawia się na kafelkach ani w szczegółach).
- **Od Patryka:** stała drużyna z imionami, perkami i wadami — jako **poziome kafelki w lewej kolumnie** (portret, imię, rola
  i stan, perk ze znakiem, paski życia, głodu i wiary). Dotknięcie zaznacza (kolejne dokładają), drugie wiezie kamerę;
  najechanie albo przytrzymanie — szczegóły obok kafelka; poległy zostaje zgaszony z krzyżem. Ponad 6 osób — kafelki się
  zwężają do 8, potem „+N”.
- **Ryty schowane** (Nakarm, Szepnij, Cud — także pod klawiszami): przełącznik `RYTY` w `src/nastawy/wariant.ts`. Kod rytów
  zostaje (bot dalej ich używa), samouczek pomija lekcje rytów (14 lekcji). Wiadro z jedzeniem dalej zjeżdża samo.
- Układ: lewy margines poszerzony pod kafelki (`PAS.kolumna*`, `poziomLewo`, `pionLewo` w `src/nastawy/ekran.ts`); znak menu
  w lewym górnym rogu ekranu; na telefonie pionowo przyciski poleceń w drugim rzędzie górnego marginesu.
Wersje „wizja Patryka” i „wizja Pawła” zostają do porównania (`trzewia-alpha-0.3-patryk.html`, `-pawel.html`).

## Nowe w 0.3
- **Wizja Patryka — imienna drużyna.** Zamiast dolnego panelu leży pas 6 kart postaci. Postacie są stałe — te same w każdej
  partii: Radost (pobożna, *Żarliwy*, wada *Wątły*), Dobromir (pobożny, *Ręka kapłana*), Bogdan „Kret” (robotnik, *Ciężka ręka*,
  wada *Łakomy*), Mszczuj (robotnik, *Nos do żył*), Jarosta (robotnica, *Wytrwały*, wada *Kulawy*), Wojsław (rycerz, *Nie do
  zdarcia*); kolejnych 8 przychodzi po kolei z darem ludzi. Każda karta: portret, imię i rola, paski życia, głodu i wiary, perk
  ze znakiem, stan (kopie, modli się, walczy, w dłoni, ogłuszony, ranny, w szale, poległy). Dotknięcie zaznacza (kolejne dokładają),
  drugie dotknięcie wiezie kamerę; najechanie myszą albo przytrzymanie palcem — szczegóły: perk, wada, kim była, fragment
  historii. Poległy zostaje na karcie — zgaszony, przekreślony, z przyczyną śmierci; wskrzeszenie przywraca tę samą osobę.
  Działający perk: rozbłysk karty, znak nad postacią na mapie, a przy ważnych zdarzeniach wpis w kronice. Po „Nowa gra” —
  ekran „Twoja drużyna”. Perki: `src/nastawy/perki.ts`, obsada: `src/nastawy/druzyna.ts`, logika: `src/sim/druzyna.ts`,
  karty: `src/render/karty.ts`.
- **Wizja Pawła — ślub i tarot.** Postacie mają imiona (losowane ziarnem partii), ale bez perków. Po „Nowa gra” drużyna
  składa jeden z trzech ślubów, który działa na każdą rolę przez całą partię: *Ślub ciszy* (+10% kopania, modlitwy, ciosów),
  *Ślub ognia* (szybkość i życie), *Ślub głodu* (−20% głodu). Pod płytą: medaliony ról jak dawniej, talia tarota i 6 miejsc na
  karty. Karta kosztuje wiarę (15, każda następna o 5 więcej), pada prosto (buff dla całej kompanii) albo odwrócona (nerf, co
  trzecia), działa 90 s, potem gaśnie i wraca do talii. 22 wielkie arkana, każde z animacją: zjazd z talii, odwrócenie,
  rozbłysk, świeca czasu. Nastawy: `src/nastawy/tarot.ts`, logika: `src/sim/tarot.ts`, pas: `src/render/tarot.ts`.
- **Kronika góry** (obie wersje): 14 ukrytych kart historii świata — gród na grzbiecie góry, demon zwany Trzewiem, umowa
  biskupa, zakonnicy, którzy skamienieli w Strażników… Odsłaniają się zdarzeniem w grze (zejście w głąb, krypta, złoto,
  rytuał, pokonany Strażnik, śmierć…) i trafiają do atlasu (grupa „Kronika góry”). U Patryka każdy fragment pamięta jedna osoba.
- **Dolny panel zastąpiony pasem kart** (`src/render/pas.ts`). Nic nie zniknęło: rozkazy (wyznacz pomieszczenie, kop drogę,
  odwołaj, odznacz, napraw linę) w kolumnie z lewej strony pasa — na telefonie pod tabliczką „rozkazy”; oddanie i relikwiarz
  krwi z prawej (telefon poziomo: w górnym pasku, pionowo: w dolnym rzędzie); przyciski poleceń w górnym marginesie
  (telefon pionowo: w lewej kolumnie pod rytami, poziomo: jak dawniej w prawej); kronika w górnym marginesie (telefon: pod
  przyciskiem „zapiski”). Klawisze bez zmian (A/S/D, G, V, B, Esc).
- **Zapis** w wersji 5 (`src/core/save.ts`): imiona, perki, polegli, odsłonięta historia, ślub i karty na stole. Zapis z wersji 4
  wczytuje się — drużyna dostaje imiona przy wczytaniu.
- **Kronika z imionami**: „Bogdan „Kret”, robotnik, poległ — z ręki Strażnika Snu.” Numery `#id` tylko w trybie deweloperskim.
- **Samouczek**: lekcja „Twoja drużyna” (Patryk) albo „Ślub i tarot” (Paweł); 16 lekcji.

## Budowa
`npm run pack` buduje trzy wersje: `trzewia-razem.html` (połączona), `trzewia-patryk.html` i `trzewia-pawel.html`;
`npm run obserwatorium` — także `obserwatorium-*.html`. Serwer deweloperski: `npx vite` (połączona), `WARIANT=patryk npx vite`
albo `WARIANT=pawel npx vite`.
Testy: `npm test` (światy i Wielki Pomnik w obu wersjach). Próby botów: `WARIANT=pawel node scripts/proby-graczy.mjs . <ziarno> <styl> <minut> <plik.log>`
(`BEZ_PERKOW=1` — imiona bez skutków perków, `BEZ=lakomy,kulawy` — wybrane perki zdjęte; do porównań balansu).

## Z Alphy 0.2 (bez zmian, poza dolnym panelem)

- **Intro:** film `filmy/intro.mp4` rusza od razu po otwarciu gry (bez klikania; góra ładuje się pod nim), po nim menu. Na dole
  przez cały film stoi mały znaczek „spacja – pomiń” — spacja (albo Esc) pomija intro.
- **Kursor:** stalowa rękawica z `obrazy/kursor1.png` — jedyny kursor gry, na każdym ekranie; póki przycisk myszy jest
  wciśnięty — `obrazy/kursor2.png` (palec wciska). Rękawicę (40 px) rysuje sama gra pod myszką; klika czubek palca. Kod: `src/core/kursor.ts`, liczby: `KURSOR`
  w `src/nastawy/ekran.ts` — inny kursor to podmieniony plik (najwyżej trzeba poprawić `czubek`). Ekran: `src/app/screens/intro.ts`, liczby: `INTRO` w `src/nastawy/ekran.ts`.
- **Stała drużyna:** 3 robotników, 2 pobożnych, 1 rycerz — na całą partię (i nikt się nie starzeje). Skała nie
  wydaje nowych postaci, nie ma gniazd kamiennych rycerzy (ani szeptów „przemyśl i kop” i „kop losowo”), kart
  spisku rycerzy i snu o kamiennych rycerzach. Rycerz jest jeden, ale dużo silniejszy (życie ×12, siła ×11)
  i na bossa idzie sam; boss nie zasypia w ścianie. Przegrywasz, gdy zginie ostatni pobożny. Rycerz zaczyna w kolczudze,
  z mieczem i w płaszczu; resztę zbroi wykuwa kuźnia (3f).
- **Wielki Pomnik i demon (5a):** na dnie, w komorze pod kryptą — tam, gdzie dawniej był rdzeń — kuca kamienny demon
  zakuty w łańcuchy. Modlitwa pobożnych w krypcie go kruszy, w trzech stanach (rysy → odpadające kawałki → czerwony żar
  z wnętrza); przy każdym wychodzi fala Strażników Snu. Przy 100% pomnik rozpada się w gruz, a z gruzu wstaje demon —
  boss. Wygrywasz, gdy rycerz go pokona: przy ostatnim uderzeniu czas zwalnia, kamera jedzie do demona, złote światło
  rozsadza go od środka i rozsypuje się w popiół. Wstęgi „Droga do wolności” już nie ma (decyzja użytkownika).
- **Dłoń z otchłani pomaga demonowi (5b):** w walce co kilka sekund — rzut rycerzem (obejmuje go palcami, ciska w górę,
  rycerz koziołkuje, uderza o strop, spada ranny i ogłuszony), tarcza (otwarta dłoń przed demonem, ciosy się od niej
  odbijają) albo zawał (szpony drą strop, ściana gruzu odcina demona na 15 s; robotnicy mogą ją rozkuć).
  Dłoń ma teraz prawdziwe wnętrze (linie, poduszki, zgięcia palców, jaśniejsza skóra) i grzbiet (sine żyły, kostki).
- **Rozkazy:** (Alpha 0.3: u Patryka karty postaci, u Pawła medaliony obok talii — patrz wyżej). Dotknięcie karty, medalionu albo postaci zaznacza,
  dotknięcie mapy to „idź tam” — pobożny i rycerz idą tylko tam, dokąd prowadzi droga, inaczej odmawiają (kręcą
  głową, a w dymku mówią dlaczego); robotnik przekopuje się sam, wskazana skała to „kop tam”. „Kop drogę wiernych”
  — robotnicy kopią złotą kreskę do krypty; bez rozkazu nie kopią, tylko noszą jedzenie. Klawisze: A/S/D — role,
  G — kop drogę, V — odwołaj, Esc i prawy przycisk — odznacz.
- **Bez zawału od góry:** mapa się nie skraca, góra nie zamyka się za ludem.
- **Bez wspinania po ścianach.** Lud wchodzi najwyżej o jeden stopień (kafel) i to tylko z miejsca, na którym stoi. Wyżej nie wejdzie —
  wykuwa sobie schody w skale albo wchodzi po linie, którą powiesisz (jedyny warunek: górny koniec uczepiony skały — strop, krawędź
  półki albo ściana; lina spada z haka do podłogi; 5 lin za darmo, potem po 10 krwi). W dół zsuwa się po
  ścianie albo skacze, ale nie z dużej wysokości.
- **Góra według szkicu:** z powierzchni dwa otwory do jasnej sali na środku u góry — szerszy, przez który pada światło
  dzienne na ołtarz, i węższy obok, którym zjeżdża jedzenie (pod nim siedziba); niżej trzy warstwy — płytka (miękka skała, żelazo), środkowa (małe jaskinie, pod nimi złoto), głęboka
  (twarda skała); dookoła rama nie do ruszenia; na dole, na środku, Wielki Pomnik pod szeroką kryptą. Drogę w dół trzeba
  wykuć, a kucie trwa (skała pęka pod kilofem coraz mocniej).
- **Jedno wiadro:** jedzenie zjeżdża tylko węższym otworem, do sali — nigdzie indziej. Kopiąc pod wiadrem, sprowadzasz
  je niżej; Nakarm dosypuje do tego samego wiadra. Z głębi wraca się po jedzenie drogą wiernych: na jej zakrętach
  lina spada sama, a podłogi pod nią nikt nie kuje; warcie jedzenie donoszą robotnicy.
- **Zbroja rycerza (3f):** kuźnia wykuwa z żelaza hełm, naramienniki, napierśnik, nakolanniki i tarczę i odkłada je
  na wieszak. Gdy coś tam wisi, nie ma fali ani rozkazu, a rycerz jest syty, sam idzie do kuźni (albo go tam poślesz:
  zaznacz rycerza i wskaż kuźnię): zdejmuje część z wieszaka, przykłada na miejsce i dopina — błysk i podpis, co daje.
  Każda noszona część daje swoje: hełm — życie +15%, naramienniki — siła +15%, napierśnik — życie +25%, nakolanniki —
  szybkość +10%, tarcza — rany −20%. Część widać na rycerzu; bez hełmu chodzi w kolczym kapturze z odsłoniętą twarzą.
- **Dwie dłonie (4):** w Koszmarze (w Alphie zawsze) dłoń z otchłani wznosi się spod podłogi sali i jednym zamachem
  przecina pazurem linę wiadra — wiadro w drodze się roztrzaskuje, nic nie zjeżdża, póki ktoś liny nie sklei („napraw
  linę wiadra” pod płytą albo na karcie postaci: idzie, wspina się, wiąże, lina się napina). Dłoń anielska przychodzi
  sama w słupie złotego światła i daje dar za darmo: podkop (kruszy kawałek drogi wiernych), nowego robotnika albo strugę
  krwi do relikwiarza. Krew pokazuje relikwiarz z ampułką (z Remake v2).
- **Ruiny z zabytkami (3e):** w środkowej warstwie 1–2 zawalone budowle (kaplica, kopalnia, kawałek miasta); kto z ludu
  dojdzie do zabytku, odkrywa go — karta „Weź” (premia i kara dla całego ludu, na zawsze) albo „Zostaw”. Relikwiarz,
  miecz krzyżowca, kielich i księga — każdy z animacją odkrycia, wzięcia (fala światła, aureole) i zgaśnięcia.
- **Pomieszczenia:** „wyznacz pomieszczenie” (B) i szablon — sypialnia, warsztat, kuźnia, korytarz, szyb, lina; kują
  je tylko zaznaczeni robotnicy (linę wieszasz sam, od razu), którym plan wskażesz. W warsztacie złoto staje się wiarą (krzyż leci do licznika), w kuźni żelazo
  — kolejnymi częściami zbroi rycerza, a minuta snu w sypialni zdejmuje osłabienia. Wszystko z animacją.
- **Ołtarz:** stoi od początku na środku sali, na kamiennym kopczyku, w smudze światła; podkopać go ani zasypać drogi do
  niego się nie da. Dotknięcie otwiera okno rytuałów płaconych krwią — modlitwa, szał krwi rycerza, wskrzeszenie
  poległego, ofiara krwi i ofiara życia; odprawia je pobożny stojący przy ołtarzu, każdy z własną animacją.
  „Okalecz się” i „ofiaruj” są już tylko tutaj, nie w szeptach.
- **Kruszce:** nad płytą liczniki żelaza i złota. Bez ekwipunku: robotnik rozbija kafel rudy, a okruch sam leci
  łukiem do licznika, który podbija liczbę i błyska. Wskazana robotnikowi ruda to „kop żyłę” — wykuwa całą kępę.

## W budowie (plan)
1. ~~**Sprzątanie i stały start**~~ — zrobione (wyżej).
2. ~~**Sterowanie i odstępy**~~ — zrobione (wyżej): medaliony, zaznaczanie, rozkazy, odmowa z animacją i dymkiem,
   robotnicy kopią tylko na rozkaz, postacie rozstawiają się i dopasowują krok. Przy okazji: pobożni i rycerz nie
   kopią, skorupa pęka od środka (rysa nie jest już pułapką), wiadra zjeżdżają tam, dokąd lud dojdzie, a droga
   wiernych liczy się schodami (bez zeskoków; pod górę nie przejdzie się tylko na zakrętach).
3. **Mapa, pomieszczenia, rzemiosło**
   - ~~3a. Mapa według szkicu~~ — zrobione (wyżej): szyb z jedzeniem do sali, trzy warstwy, żelazo i złoto, krypta
     nad rdzeniem, wolniejsze kucie z pękającą skałą, wiadra dla tych, którzy zeszli w głąb.
   - ~~3b. Liczniki kruszców na ekranie (żelazo, złoto)~~ — zrobione (wyżej): bez ekwipunku, okruch leci do
     licznika, „kop żyłę”, tablica atlasu „Kruszce”.
   - ~~3c. Szablony pomieszczeń do wykopania (sypialnia, warsztat, kuźnia, korytarz, szyb)~~ — zrobione (wyżej):
     złoto w warsztacie — dewocjonalia i wiara; żelazo w kuźni — części zbroi rycerza; sypialnia zdejmuje osłabienia.
   - ~~3d. Ołtarz z rytuałami — każdy z własną animacją~~ — zrobione (wyżej): ołtarz w sali pod światłem (decyzja
     użytkownika — nie w środkowej warstwie), drugi otwór na wiadro, okno rytuałów, pięć rytuałów za krew, drabiny (od 18.10 — liny),
     sen 60 s.
   - ~~3e. Ruiny z zabytkami~~ — zrobione (wyżej): kaplica, kopalnia, kawałek miasta; cztery zabytki, karta „weź/zostaw”,
     premia i kara dla całego ludu (sen kary nie zdejmuje), animacje odkrycia, wzięcia i zgaśnięcia.
   - ~~3f. Części zbroi widoczne na rycerzu~~ — zrobione (wyżej): rycerz zaczyna w kolczudze, z mieczem i w płaszczu;
     części z kuźni zakłada sam, gdy nie ma fali (albo na rozkaz), z animacją i błyskiem; każda coś daje. Atlas:
     tablice „Zbroja rycerza” i „Warstwy góry” (przekrój: szyb, sala, trzy warstwy, rama, krypta, rdzeń). Złoto
     to także żółte znaczki „Ag” ze szkicu Pawła. **Etap 3 jest skończony.**
4. ~~**Dwie dłonie**~~ — zrobione (wyżej): dłoń z otchłani przecina pazurem linę wiadra, „napraw linę wiadra”
   (wspina się i skleja); dłoń anielska z góry — podkop, dar ludzi, dar krwi; relikwiarz krwi z Remake v2.
5. **Finał, bot, samouczek**
   - ~~5a. Wielki Pomnik demona i wygrana po pokonaniu demona~~ — zrobione (wyżej): trzy stany pękania, rozpad, demon
     z gruzów, ostatnie uderzenie z animacją; bez wstęgi „Droga do wolności”.
   - ~~5b. Dłoń z otchłani pomaga demonowi~~ — zrobione: rzut rycerzem (obejmuje i ciska w górę — lot, uderzenie
     o strop, ogłuszenie), tarcza (otwarta dłoń przed demonem — ciosy się odbijają), zawał (szpony drą strop — ściana
     gruzu odcina demona); każda akcja z własnymi klatkami z modelu 3D, żadna nie jest zaciskaniem pięści.
   - 5c. Bot pod nowe zasady. 5d. Nowy samouczek, w którym kroki przewija się samemu. 5e. Testy, atlas, osiągnięcia.

Grafika (menu, boss i Strażnicy, ikonki) i muzyka adaptacyjna — zadania zespołu (Paweł, Milan).

## Obserwatorium (`trzewia-alpha-0.3-patryk-obserwatorium.html`, `trzewia-alpha-0.3-pawel-obserwatorium.html`)
Cztery okna gry na jednej stronie. W każdym gra bot, a ty patrzysz na żywo. Każde okno osobno: tempo (×¼ … ×20),
pauza, styl bota (*rozsądny*, *budowniczy*, *speedrun*, *bierny*), ziarno świata, „nowa partia”, „sama następna partia”
i dźwięk. Kliknij okno — powiększa się na cały ekran; **Esc** wraca, klawisze **1–4** przełączają. Okna obserwatorium
niczego nie zapisują w przeglądarce. Bot: `src/app/bot.ts`, tryb okna: `src/app/obserwowany.ts`, strona:
`scripts/obserwatorium/szablon.html`, budowa: `npm run obserwatorium`.

## Kod
TypeScript + Vite, jeden plik HTML (`npm run pack`). Symulacja w `src/sim/`, liczby do strojenia w `src/nastawy/`,
rysunek w `src/render/` (postacie ludu w `src/render/lud/`), ekrany w `src/app/screens/`.
Testy: `npm test` (światy i Wielki Pomnik), próby botów: `node scripts/proby-graczy.mjs`.
