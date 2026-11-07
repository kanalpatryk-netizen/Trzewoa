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

## Schody kręcone w szybie drogi wiernych (6.11)
Użytkownik o dawnych schodach (zygzak biegów z poręczą na słupkach): „po pierwsze budują się nierealistycznie, a po
drugie (właściwie to najważniejsze) są obrzydliwe i wyglądają nowocześnie”. Potem: „każda postać, która będzie schodzić
i wchodzić po schodach, ma również mieć odpowiednią animację stawiania nóg na kolejnych schodkach i […] z racji, że
schody są kręcone, ma się również normalnie obracać”.
- **Wygląd** (`src/render/schody.ts`; liczby — `SCHODY` w `src/nastawy/loch.ts`):
  - w każdym odcinku szybu są schody kręcone jak w wieży zamku: kamienne stopnie wokół słupa z bębnów, 12 stopni na
    obrót co 5 kafli (stopień ok. 0,4 kafla wysoki);
  - w okrągłej klatce z ciosów; lina na żelaznych pierścieniach w ścianie;
  - ujęcie odrobinę z góry, malowane od tyłu do przodu: stopnice jasne, boki w półcieniu, nos stopnia z cieniem pod
    spodem, wytarty środek stopni;
  - barwa kamienia idzie za warstwą skały (płytka cieplejsza, głęboka chłodniejsza); z tyłu spirali ciemniej;
  - przód ściany szybu jest ścięty (przekrój), jak wszędzie w grze.
- **Budowa:** schody się stawia — patrz „Budowa schodów: wykop, drabina, rusztowanie, kołowrót” niżej. Dawniej
  wykuty kafel odsłaniał kawałek gotowych stopni. Użytkownik: „to mało realistyczne”. Przy kopaniu zostały okruchy
  i pył z wykutego kafla.
- **Chód po schodach:**
  - postać idzie po spirali (`naSchodach` w `schody.ts` → `rozstep.ts`): w poziomie po linii stopni, w pionie stopień po
    stopniu;
  - stoi na stopnicy, nad którą jest, a na następny stopień przenosi się przy jego nosie (`stopyNaStopniu`);
  - krok jest w takt stopni: jedna stopa na jeden stopień, pięta uderza przy nosie stopnia, gdy ciało przenosi się
    na następny (`figury.ts`: faza z numeru stopnia, pod górę też do przodu);
  - pod górę kolano unosi się wysoko nad krawędź stopnia, a tułów pochyla. W dół noga z przodu sięga niżej, ta,
    na której stoi, ugina się pod ciężarem, a głowa patrzy pod nogi (`chodPoSchodach` w `src/render/lud/ruch.ts`);
  - pod stopami leży cień na stopnicy, przycięty do niej, a słabszy na następnej niższej (`stopniePodStopami`);
  - postać obraca się z biegiem spirali: zwrot w stronę marszu, a przy ścianach szybu (gdzie idzie w głąb albo ku
    widzowi) sylwetka się zwęża jak obracająca się postać;
  - **zasłanianie** (`zaslonNaSchodach`): po narysowaniu postaci to, co na spirali leży bliżej widza, rysuje się na
    niej z powrotem:
    - słup, gdy postać jest za nim — znika za nim;
    - stopnie po drugiej stronie spirali;
    - nie zasłania stopień pod stopami ani oba sąsiednie.

    Ten rysunek jest w przybliżeniu i siatce pikseli płótna odcinka, przycięty do obrysu postaci i do wykutych kafli,
    przyciemniony warstwą mroku tej klatki (`warstwaMroku` w `src/render/mrok.ts`). Postacie z tyłu spirali rysują się
    przed innymi. Z tyłu spirali postać jest tylko lekko ciemniejsza (cień słupa i ścian);
  - kopacze przy czole szybu i stojący na posadzce rysują się po staremu.
  - Wcześniej, z uwagi użytkownika („on nie schodzi, tylko lewituje”):
    - ciało opadało na niższy stopień w połowie stopnicy, więc stopy zapadały się w płytę, na której stała postać;
    - cienia na schodach nie było;
    - postać sunęła po wierzchu całych schodów, a za słupem była tylko przygaszona;
    - pod górę faza kroku szła wstecz (nogi „wchodziły tyłem”).
- **Cienie postaci** (uwaga użytkownika „dodaj cienie do postaci”): cień kontaktowy pod stopami wszystkich postaci
  (`cienKontaktowy` w `figury.ts`) jest ciemniejszy i szerszy. Dawny ginął na jasnej posadzce sali.
- **Symulacja:** po schodach ruch w pionie jest wolniejszy niż dawniej szybem (`SCHODY.wGore` 0,5, `wDol` 0,55
  prędkości chodu; dawniej 0,6 w górę i 1,2 w dół). Przy dawnych liczbach postać zrobiłaby na spirali ponad 3 obroty
  i 40 stopni na sekundę, więc nogi migałyby, zamiast stawać na stopniach. Teraz to ok. 1,4 obrotu i 17 stopni na
  sekundę gry: żwawy chód, trochę szybszy niż po płaskim. Pierwszy odcinek (46 rzędów) w dół trwa ok. 6 s.
  - Wybór sprawdzony pełnymi partiami bota (styl „rozsądny”, ziarna 1–64):
    - dawne liczby: 64 wygrane z 64, średnio 14,0 min;
    - te liczby: 63 z 64, średnio 14,9 min;
    - chód zupełnie „po płaskiemu” (0,42 / 0,46): tylko 26 z 32, bo każda droga z jedzeniem do lochu trwała dłużej.
  - Przy tym pomiarze wyszły na jaw błędy lochu, poprawione niżej w „Droga wiernych z zakrętem…”: jedzenie przez kratę,
    gruz w lochu i bot przy kotle.
- **Wydajność:** cały odcinek rysuje się raz na płótno (na nowo po wykuciu kafla albo zmianie przybliżenia o ~19%).
  W klatce idzie tylko jego kawałek w kadrze, plus okruchy i świeży kamień.

## Budowa schodów: wykop, drabina, rusztowanie, kołowrót (6.11)
Użytkownik: „Stwórz pełny system tworzenia tych schodów, czyli rusztowania, liny, drabiny itp., nie kopanie blok po
bloku — to mało realistyczne”. Każdy odcinek szybu drogi wiernych powstaje teraz w dwóch etapach
(`src/sim/budowa-schodow.ts`; liczby — `BUDOWA_SCHODOW` w `src/nastawy/loch.ts`; rysunek —
`src/render/budowa-schodow.ts` i `src/render/schody.ts`).
- **Wykop:**
  - robotnicy kują szyb od góry, jak dotąd (rozkaz „Kop drogę wiernych”);
  - w wykutym szybie nie ma jeszcze stopni — to surowa studnia;
  - do dna schodzi się po drabinie opartej o tylną ścianę. Drabina ma dwie żerdzie i szczeble, a jej odcinki co
    ~6 kafli są nadstawiane i wiązane liną. Rośnie za kopaczami i wystaje nad posadzkę przy wylocie;
  - przy wylocie stoi kołowrót: słup na posadzce, wysięgnik z blokiem nad środkiem szybu i wał z korbą;
  - jeśli ktoś przy nim kręci, kubeł jeździ: w dół pusty, w górę pełny urobku, a u góry wysypuje się na hałdę, która
    rośnie z wykopem.
- **Budowa** (gdy odcinek jest wykopany do dna; kronika to notuje):
  - schody stawia się od dołu, stopień po stopniu, każdy na poprzednim. Każdy ciosany stopień niesie kawałek słupa,
    jak w prawdziwych schodach kręconych;
  - kołowrót opuszcza paletę z 4 stopniami powoli, przez drugą połowę osadzania poprzedniej, i stawia ją na pomoście
    rusztowania;
  - murarze biorą z palety kamienie po kolei, przenoszą na miejsce i osadzają na zaprawie (młotki). W tym czasie pusty
    hak wraca w górę;
  - rusztowanie stoi nad najwyższym stopniem: stojaki przy ścianie, rygle, zastrzały na krzyż i pomost z desek.
    Przestawia się je w górę co 2 kafle, a drabina sięga do pomostu;
  - mur klatki rośnie rząd ciosów nad najwyższy stopień (wierzch nierówny). Słup kończy się bębnem widzianym z wierzchu;
  - po ostatnim stopniu rusztowanie, drabina i kołowrót znikają (kronika), a na górze staje głowica słupa.
- **Kto i jak szybko:**
  - przy czole budowy mieści się 2 murarzy, przy kołowrocie 1;
  - stopień to 140 tików pracy jednego murarza, czyli przy pełnej obsadzie ~0,6 s. Pierwszy odcinek trwa ok. 1 min,
    drugi ok. 3 min;
  - bez nikogo przy kołowrocie murarze sami opuszczają kamienie: ×0,6.
- **Kto buduje:**
  - rozkaz „Buduj schody drogi wiernych” (ten sam przycisk co „Kop drogę wiernych”, gdy kopać już nie ma czego) posyła
    zaznaczonych do budowy: najpierw murarze, potem kołowrót;
  - robotnik, który od 30 s nie ma co robić, idzie pomóc sam — ale tylko wtedy, gdy przy obozie zostaje inny wolny,
    który nosi jedzenie (także w trakcie pracy). Jedzenie ma pierwszeństwo: co sekundę sprawdza, czy ktoś nie głoduje;
  - przy kopaniu taki robotnik staje przy kołowrocie i wyciąga kubłem urobek;
  - rozkaz kopania kończy się z ostatnim wykutym kaflem, jak dawniej.
- **Przejście:**
  - szybem chodzi się od razu po wykopaniu: po drabinie, w obie strony, w tym samym tempie co po schodach. Budowa nie
    wstrzymuje więc pielgrzymki;
  - na drabinie postać wisi na rękach i wspina się szczebel po szczeblu, twarzą do ściany;
  - przy pomoście nad najwyższym stopniem płynnie przechodzi z drabiny na stopnie.
- **Poprawki przy okazji:**
  - wykrywanie zakleszczeń kasowało zajęcie każdemu, kto stał w miejscu. Kręcący kołowrotem tracił robotę po ~2 s;
    teraz praca na posterunku się nie liczy;
  - dół schodów pierwszego odcinka stoi w komnacie z kotłem. Komnata rysowała się po schodach i zasłaniała je, więc
    teraz schody i budowa rysują się po lochu;
  - płótno schodów rysuje się kawałkami po 12 rzędów. Nowy stopień przerysowuje tylko swój kawałek, a całe płótno
    drugiego odcinka (ponad 3000 px) kosztowało kilkadziesiąt ms.
- **Balans** (bot, styl „rozsądny”, 96 partii): z budową 92 wygrane, bez niej 90; partia trwa tyle samo (~15 min).
  W partiach bota schody rosną w tle — pierwszy odcinek zwykle staje cały.
- **Atlas:** tablica „Schody” opisuje drabinę, kołowrót i budowę od dołu.

## Droga wiernych z zakrętem, komnata z kotłem, loch za stalową bramą, modlitwa za innych (6.11)
Użytkownik: droga wiernych „ma być zakręcona” — w dół, w bok przez „stare pomieszczenie z pajęczynami” z kotłem, znowu
w dół; na dole „inny” loch z bossem, do którego wchodzi się przez stalową bramę. Bramę podnoszą zaklęcia dwóch pobożnych
przy kotle (pełne otwarcie po 40 s), potem krata powoli opada; przy połowie da się tylko przeczołgać. Pobożni mają się
modlić za innych w swoim kręgu — leczyć i dawać dary. Styl: „ekstremalnie mroczny, ale przyjazny dla oka”.
- **Układ** (`ukladDrogi`, `wykujLoch`, `wykujDroge` w `src/sim/world.ts`; liczby — `src/nastawy/loch.ts`, `LOCH`):
  - pierwszy odcinek szybu: od wnęki przy sali 46 rzędów w dół, do dna starej komnaty;
  - komnata z kotłem (41 × 7, mur nie do ruszenia): idzie się nią 30 kafli w bok;
  - drugi odcinek: z posadzki komnaty w dół na przedproże;
  - z przedproża przez bramę do lochu.
  Do wykucia jest razem ok. 835 kafli (dawny prosty szyb miał ok. 890). `world.odcinkiDrogi`, `komnata`, `kociol`,
  `przedproze`, `brama`, `loch`; `szybDrogi` to prostokąt, który obejmuje oba odcinki.
- **Loch** zamiast niskiej krypty: wnętrze 85 kafli szerokie, sklepione łukami co 12 kafli (9–12 kafli wysokości),
  nad przedsionkiem wysoka nawa (15). Mur i posadzka są nie do ruszenia, więc do środka wchodzi się tylko przez bramę.
  Pomnik, przedsionek, strefa Strażników i miejsca ucieczki przed falą zostały tam, gdzie były.
- **Brama** (`src/sim/brama.ts`, `BRAMA`):
  - podnosi się, póki przy kotle zaklina co najmniej 2 pobożnych z rozkazu „Do kotła”: pełne otwarcie po 40 s;
  - bez zaklinania opada przez 110 s;
  - od 20% otwarcia przejście jest pustką i da się przeczołgać (szybkość ×0,35, poza na czworakach);
  - od 60% przechodzi się wyprostowanym: 40 s zaklinania wpuszcza każdego, 20 s (połowa) — tylko na czworakach;
  - kto leży w przejściu, gdy krata opada, zostaje wypchnięty na stronę, w którą szedł; nikogo nie miażdży;
  - pielgrzymi i rycerze na warcie czekają pod zamkniętą bramą na przedprożu;
  - kronika notuje drgnięcie, czołganie, przejście wyprostowanym, pełne otwarcie i zamknięcie;
  - podpowiedź przy czekających pod bramą: wyślij dwóch pobożnych do kotła;
  - bot obserwatorium (`brama` w `src/app/bot.ts`) wysyła dwóch pobożnych do kotła, a rycerzy pod bramę. Przy pełnym
    otwarciu pobożni schodzą pod pomnik, a rycerze wchodzą do lochu.
- **Modlitwa za innych** (`src/sim/blogoslawienstwo.ts`, `BLOGOSLAWIENSTWO`):
  - w oknie pobożnego nowa możliwość „Módl się za innych”: pobożny zostaje, gdzie stoi, i modli się;
  - błogosławi też pobożny, który modli się przy obozie, przy ołtarzu albo w krypcie (nie ten, który zaklina przy kotle);
  - każdy z ludu w promieniu 8 kafli leczy się (1,1 życia/s) i dostaje dar swojej roli na 20 s po wyjściu z kręgu:
    - rycerz: +15% siły, +10% szybkości;
    - robotnik: +25% kopania, +10% szybkości;
    - pobożny: +25% modlitwy;
    - każdy głodnieje o 15% wolniej;
  - na karcie postaci widać stan „błogosławiony”.
- **Okno pobożnego**: „Do kotła — podnieś bramę” (z ikoną kotła; aktywne, gdy pierwszy odcinek dosięga komnaty)
  i „Módl się za innych”.
- **Rysunek** (`src/render/loch.ts`):
  - mury z ciosów i tylne ściany w ciepłych, ciemnych barwach kamienia (bez czystej czerni), filary i łuki sklepienia,
    łańcuchy z kajdanami, karmazynowe chorągwie, kosze ognia, mgła przy posadzce;
  - w komnacie: nisze z półkami (słoje, czaszki, księgi), ogarki świec, złamane filary, pajęczyny w rogach (z pająkiem),
    kocioł na trójnogu nad paleniskiem i pulpit z księgą zaklęć;
  - nad mrokiem: turkusowy wywar z bańkami i parą; przy zaklinaniu runy krążą nad kotłem, a nici światła biegną od rąk
    pobożnych do wywaru;
  - na przedprożu pochodnie i krata ze stali, uniesiona o tyle, ile brama otwarta (pod nią widać szparę). Na nadprożu
    pięć run zapala się kolejno z otwarciem: turkusowo przy zaklinaniu, gasnące, gdy krata opada;
  - krąg modlitwy za innych (ciepła elipsa na posadzce, słup światła) i nici do błogosławionych, złote drobiny nad
    leczonymi;
  - w lochu, komnacie i na przedprożu mrok jest gęstszy (`MROK.gesty`, rozmyta krawędź w kształcie sklepienia). Światło
    daje tylko ogień: kocioł, świece, pochodnie, kosze ognia.
- **Atlas**: tablice „Kocioł i stalowa brama” (rycina: zaklinanie, krata rośnie i opada, progi „przejdzie” i „przeczołga
  się”) oraz „Modlitwa za innych”. Samouczek („Droga do wolności”) ma etap o bramie i kotle.
- **Jedzenie za kratą** (`podKrata`, `miejsceKosza`, `zaKrata`, `podajPrzezKrate` w `src/sim/brama.ts`; źródło jedzenia
  w `zrodlaJedzenia`, `src/sim/wiadro.ts`):
  - przy kracie, od strony lochu, stoi kosz. Robotnik niesie jedzenie zamkniętemu w lochu pod kratę i podaje porcje
    przez pręty, a zamknięty je z kosza;
  - póki w koszu leżą 2 porcje, nikt nie niesie więcej;
  - miejsce pod kratą leży poza strefą Strażników, więc w czasie fali też się tam niesie.
  - Wcześniej rycerz zamknięty w lochu umierał z głodu, z dwóch powodów:
    - robotnik szukał drogi do samego głodnego, której za kratą nie ma. Odnosił więc porcje do wiadra i brał je od
      nowa, w kółko;
    - w czasie fali głodny stał w strefie Strażników, więc robotnicy w ogóle nie brali dostawy.
- **Gruz w lochu** (`poGruzie` w `src/sim/creatures.ts`):
  - uderzenie demona w ziemię (`zasypDroge`) zasypuje kawałek kreski drogi. W lochu kreska biegnie po posadzce, więc
    gruz jest garbem na jeden kafel;
  - idący drogą przechodzi po nim jak po stopniu, do pierwszego wolnego kafla kreski za nim. Cel trzyma do końca
    przejścia;
  - wcześniej czekał, aż robotnicy go odkopią. Za zamkniętą kratą robotnicy nie wejdą: rycerz wracający od kosza stał
    przed garbem do końca gry, a demon czekał nietknięty.
- **Bot** (`brama`, `walka` w `src/app/bot.ts`):
  - gdy przy kotle zaklina tylko jeden pobożny (drugiego zabrał rytuał przy ołtarzu), bot dosyła wolnego. Wcześniej
    jeden zaklinał do końca gry, a drugi czekał pod bramą;
  - gdy demon wychodzi z pomnika, a krata jest opadła, bezbronni w lochu odchodzą na drugi koniec lochu, z dala od
    demona. Wcześniej rozkaz „do sali” był odrzucany, a pobożni modlili się dalej pod pomnikiem.
- **Testy**: `test-swiata` sprawdza w 100 światach dwa odcinki drogi, puste wnętrze komnaty za szczelnym murem, kocioł
  na posadzce i zamkniętą bramę na starcie. Sprawdza też, że do przedsionka nie da się dojść z przedproża obok bramy,
  a przez bramę — tak. Pełne partie bota (seed 3 i 4) kończą się Uwolnieniem po 14 minutach gry: bot podnosi bramę,
  pobożni i rycerze wchodzą do lochu, zanim krata opadnie.

## Ramka do wykucia bez limitu, w kaflach (6.11)
Użytkownik: „zaznaczanie terenu do kopania przez robotników nie ma mieć limitu […] teren do wykopania nie ma tworzyć losowego
kwadratu, tylko ma się zaznaczać według wielkości bloków, żeby było wiadomo, co konkretnie będziemy kopać”.
- Bez limitu kafli (`STEROWANIE.ramkaMaks` usunięte).
- Ramka trzyma się siatki: rogi na krawędziach bloków (`kafleRamki` w `src/render/druzyna.ts`). Przy ciągnięciu widać
  siatkę bloków i każdy kafel, który pójdzie do wykucia (ciepłe wypełnienie, obrys bloku). Przy rogu jest podpis:
  wymiary w blokach i „do wykucia: N” (albo „zaznaczy: N”, gdy ramka zaznaczy postacie). Podgląd i puszczenie liczą
  to samo (`wynikRamki` w `game.ts`).
- Ramka, w której stoją tylko ci sami zaznaczeni robotnicy, oznacza skałę (zaznaczenie ich na nowo nic by nie zmieniło).
  Inne postacie w ramce dalej się zaznaczają.
- Robotnicy rozchodzą się po różnych kaflach (`kafleObszaru`, `POLECENIA.ramkaZajety`). Nieosiągalny kafel pomijają
  i biorą następny (`pominKafelObszaru`). Ramkę porzucają dopiero po `POLECENIA.ramkaPomin` takich kaflach z rzędu.
  Wcześniej cała trójka stała nad jednym kaflem, a gdy był nieosiągalny, porzucali całą ramkę.
- Wydajność: wybór kafli bez sortowania całego obszaru; kreda na tysiącach kafli rysuje się jedną ścieżką i tylko
  w widoku.

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
- **Droga wiernych jako szyb ze schodami** (od 6.11 schody kręcone — „Schody kręcone w szybie drogi wiernych” wyżej):
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
