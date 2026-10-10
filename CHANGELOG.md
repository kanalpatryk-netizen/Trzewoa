# Zmiany

## Remake v1 (komputer) — poprawki po etapie 4
- **Interfejs mroczniejszy i bardziej tajemniczy, z lekkimi animacjami** (`src/render/nastroj.ts`, liczby w `src/nastawy/wyglad/nastroj.ts`). Ściana krypty prawie czarna, rama płyty w kolorze zaschniętej krwi z przygasłym złotem, krążki rytów i przycisków jak kamień w cieniu — wycinki fresków są w spoczynku przyciemnione i odbarwione, a pod kursorem płynnie wracają do światła (ciepła poświata, po obrzeżu krąży błysk; ryty po lewej też reagują na kursor). W świetle lampki unosi się pył; przy brzegu ekranu niewidzialna ręka co kilka sekund wydrapuje w tynku znaki nieznanego pisma, które żarzą się chwilę i gasną; pismo na ramie płyty żarzy się jak węgle. Oko w ramie wodzi źrenicą za kursorem i mruga nieregularnie. Nowa linijka kroniki pisze się od lewej z żarem na końcu pióra, a wiara, krew i jedzenie przy zmianie żarzą się chwilę (złotem, gdy rosną, krwią, gdy maleją). Wstęga ludu i przełącznik „ze skały” przygaszone, po wstędze powoli przesuwa się blask lampki. Wszystko staje przy „ogranicz ruch”
- **Świat bez wody i lawy — rozległe jaskinie zamiast nich** (`src/sim/world.ts`, liczby w `src/nastawy/swiat.ts`). Nie ma już jezior, kieszeni magmy ani spływania płynów (w starych zapisach woda i magma znikają przy wczytaniu). Zamiast nich góra jest pełna jaskiń: 13 wielkich sal z płaską podłogą, zębatym stropem, naciekami i kamiennymi filarami, kręte galerie łączące sale (część rozwidla się), pionowe kominy i niskie groty w głębi, przy rdzeniu; pustki jest mniej więcej tyle co dawniej (27–33% świata). Z talii zniknęły „Powódź” i „Woda nad obozem”, z atlasu i legendy — woda i magma; w menu w miejscu kieszeni magmy czarna grota z naciekami. Bot: 8/8 wygranych na starym i nowym świecie, długość partii bez zmian (średnio ok. 8,5 min); testy światów 12/12
- **Rozgrywka: mrok i Ten, który patrzy** (`src/sim/mrok.ts`, nastawy w `src/nastawy/mrok.ts`). Góra jest ciemna: świat widać w pełni tylko w świetle — lampki robotników, aureole pobożnych (jaśniejsze przy modlitwie), siedziba, obozy, rdzeń i Cud; poza nim to, co lud zna, tonie w mroku (suwak jasności rozjaśnia też mrok). A w ciemności coś jest: po 3 minutach zaczyna krążyć w skale wokół siedziby i wypatruje kogoś, kto został sam — nikt z ludu bliżej niż 5 kafli, daleko od obozów i rdzenia (rycerzy nie rusza, przy ludzie mniejszym niż 7 nie poluje). Wtedy podchodzi i patrzy: samotny staje jak wryty, w skale świecą oczy, lampka samotnego przygasa, płyną ku niemu znaki nieznanego pisma, wokół niego zamyka się czerwone koło, a w tle majaczy cień diabła z fresku; słychać szept z jednej strony. Gra staje (kryzys) i mówi, co możesz: Cud tuż przy nim przegania Patrzącego na 3 minuty, a ktoś z ludu, kto podejdzie do samotnego, płoszy go na 2 minuty. Po 15 sekundach zabiera samotnego („poszedł w ciemność i nie wrócił”) — krew zostaje dla ciebie — i cichnie na 4 minuty. Na karcie postaci stan „patrzy na niego coś z ciemności” z odliczaniem; nowa tablica atlasu „Ten, który patrzy” (z diabłem z fresku); muzyka gęstnieje, gdy podchodzi i gdy patrzy
- Freski w grze (makiety z wcześniejszej rozmowy): karta wydarzenia to jasna tablica tynku z fryzem tancerzy i zwierząt (Arlanza) u góry i wycinkiem malowidła po lewej, dobranym do wydarzenia (diabeł przy „Głębia proponuje układ” i spisku, lew przy „Śnie o kamiennych rycerzach”, smok przy wodzie i zawale, wielbłąd przy najeździe, święci przy głodzie i proroku, archanioł przy znaku i warcie); na wąskiej karcie bez wycinka, na niskiej płycie bez fryzu. Karta mieszkańca: postać stoi w łukowej niszy na złocie z perełkami, jak na ikonie. Atlas: 16 tablic ma fresk na jasnym tynku zamiast ryciny (biskup przy Pobożnych, ryty z wycinków, święci przy Proroku i Oddaniu, wielbłąd przy Pielgrzymce, lew przy Strażnikach Snu, smok przy Śniącym Kamieniu, archanioł przy Kamiennych rycerzach, diabły przy Krwi, Wydarzeniach i Tym, który patrzy, św. Anna przy Piśmie w skale). Osiągnięcia: medaliony z fresków zamiast gwiazdek (niezdobyte szare i wyblakłe). Koniec gry: smutny święty przy przegranej, archanioł Michał z kulą przy wygranej — pod wyrokiem, obok kroniki albo blado za tytułem, zależnie od miejsca. Wszystko (ok. 330 kB) siedzi w jednym pliku gry; co gdzie stoi — `src/nastawy/wyglad/freski.ts`
- Grafiki z fresków w pobieranej grze: tynk, złoto i wycinki fresków na rytach i przyciskach nie trafiały do jednego pliku HTML (Vite wydawał je jako osobne pliki obok, więc po pobraniu samej gry znikały — zostawały puste krążki). Teraz każdy obrazek jest w środku pliku, a `npm run pack` przerywa budowę, jeśli jakiś obrazek wyszedłby osobno
- Oddanie: zamiast kwadratu, który się wypełniał — złożone do modlitwy dłonie, które napełniają się złotem od rękawów po czubki palców; kreska w poprzek to próg pielgrzymki, a gdy wierni idą pod rdzeń, za dłońmi tli się blask
- Telefon pionowo: wiersz „ze skały” (robotnik / pobożny, odliczanie i cena) wchodził na rysę krwi i na oddanie — dolny margines ma jeden wiersz więcej; test nakładania sprawdza też ten wiersz
- Interfejs jak ściana krypty (`src/render/fresk.ts`): zamiast czarnego tła i cienkich linii ryciny — ciemny tynk w świetle lampki (faktura ze zdjęcia fresku z Faras), ciemność w kątach oddycha z rdzeniem i drga z płomieniem; ramy malowane pasami czerwieni ziemi, bieli wapiennej i ugru, z perełkami, a z czerwonego pasa co jakiś czas wychodzi nieznane pismo i gaśnie; w lewej ramie płyty namalowane oko, które oddycha i mruga. Ryty i przyciski to krążki tynku z wycinkami fresków (palec na ustach św. Anny, kula archanioła, kiełkująca roślina, oko, greckie litery, księga biskupa); karty i okna to tablice tynku; wstęga ludu w pigmentach (biel wapienna, ugier, lapis); rycina świata w ugrze. Menu: bez podtytułu, tytuł malowany bielą z cieniem sinopii, a zamiast szkicu góry z dawnymi pojęciami (kuźnia, jezioro) góra malowana jak na ikonie: siedziba ludu z lampką, spiżarnia z grzybem, zamurowane gniazdo kamiennego rycerza (czasem otwiera oczy), droga wiernych z pielgrzymami, Strażnicy Snu w skale i czarna jaskinia rdzenia w skorupie. Muzyka: pod akordami pomruk góry (dwa dudniące niskie tony), oddech z głębi, odległe trzaski skały, chór bez słów z jednym fałszującym głosem, a przy dużym napięciu ciche dzwonienie w uszach — wszystko gęstnieje z napięciem
- Lud zaprojektowany od nowa w stylu fresków z krypt (`src/render/lud/`). Robotnik to fossor — kopacz katakumb w krótkiej, przepasanej tunice z ciemnymi pasami (clavi), z dolabrą na ramieniu i glinianą lampką oliwną w dłoni (przy pracy stawia ją na ziemi). Pobożny to diakon w jasnej szacie z czerwoną stułą wyszywaną złotymi krzyżykami, z tonsurą i krzyżem procesyjnym; modli się jak orant ze złotym nimbem, w walce kieruje krzyż ku wrogowi. Rycerz to święty wojownik z ikon: zbroja łuskowa, skórzane pteryges, czerwona chlamida ze złotą fibulą, stożkowy hełm z nosalem i kolczym czepcem, długa migdałowa tarcza z krzyżem, spatha; zdrajca ma poczerniałą zbroję i żarzący się czerwony znak. Malowane jak fresk: matowe tony z twardo odciętym światłem i barwnym cieniem (skóra cieniowana zielonkawo jak verdaccio), kontur sinopią, jasna aura tynku wokół sylwetki, faktura tynku; twarze jak na portretach fajumskich (duże migdałowe oczy), wydłużone proporcje ikon. Mrok daje otoczenie, nie stroje: światło lampek, strach (drżenie, skulenie), szaleństwo z głębokości (puste oczy, szarpnięcia głową), krew na bandażu
- Próby z dwoma graczami (budowniczy i speedrunner, `scripts/proby-graczy.mjs`) — poprawione to, co wyszło w logach:
  - postać „stojąca” przy obozie na linie bez podłogi trzyma chwyt — jeździła w górę i w dół po kilkaset kafli na minutę; zgubiona droga liczy się od nowa zamiast iść na przełaj
  - tunel ku gniazdu najpierw dochodzi zwykłą drogą jak najbliżej celu, potem kopie wyliczoną trasą — tunele odbijały się od pierwszej jaskini (30 „przemyśl i kop” dało jedno gniazdo); napis „ogień zagrodził” tylko przy ogniu
  - głodny rycerz nie jest ciągnięty do walki ze Strażnikiem w skale — dziesięciu rycerzy umarło z głodu przy pełnej spiżarni
  - przy pustych spiżarniach robotnicy idą po grzyb poza strefę pracy, zamiast odpoczywać przy pustej spiżarni
  - omijanie stojącego czoła liczy tylko kopacza tuż przy czole i nie bierze objazdu dużo dłuższego (plan skakał z 16 na 146 kafli)
  - kronika podaje prawdziwą przyczynę śmierci (utonął, ze starości, z głodu, przysypany…) zamiast zawsze „z wycieńczenia”
- Postacie ludu narysowane od nowa (`src/render/lud/`): zamiast „kapsułek” — kończyny z mięśniami, dłonie, buty, głowy z profilu; dużo więcej detali stroju (lampka ze snopem światła, chusta, kamizelka, łata; szkaplerz z haftem, sznur z frędzlem, krzyżyk, wstążka przy lasce; hełm z nitami i wizjerem, naramiennik, nakolanniki, kolczuga, tarcza z okuciem, pochwa), warianty wyglądu (skóra, włosy, brody, koszule, chusty). Nowe animacje z klatek kluczowych: kopanie ma wreszcie prawdziwy zamach (dawniej ręce opadały powoli i podskakiwały przed ciosem), uderzenie z odpryskami w chwili trafienia, rycerz przeplata cięcie i pchnięcie ze smugą ostrza, chód z przetaczaniem stopy i krokiem dopasowanym do drogi (stopy nie ślizgają się), bieg z fazą lotu, lądowanie po upadku, wzdrygnięcie przy trafieniu, drobne gesty w miejscu; przejścia między czynnościami płynne, a ciosy ostre (dawniej poza „goniła” cel z opóźnieniem). Kilof na plecach robotnika wisi za plecami (dawniej obuch sterczał przed twarzą), tarcza przy wspinaczce idzie na plecy. Cieńsza obwódka; szczegółowość zależy od przybliżenia i jakości
- Rycerze przy bossie: gdy jest ich za mało, nie uciekają już do dalekiej spiżarni jak pobożni — stają tuż za skrajem strefy i bronią się przed Strażnikiem albo bossem, który podejdzie bliżej niż 4 kafle; na karcie „czeka na skraju (2/3)”
- Nowy szept tylko dla rycerza: „kop losowo” (4 wiary) — wykopuje ~10 połączonych kafli skały obok siebie (w bok i w dół, tempem robotnika); trafi blisko śpiącego gniazda, to je budzi. Kafel, do którego nie da się podejść albo który nie daje się ruszyć, odpada
- Kopacz drogi przy czole na linie albo przy ścianie trzyma chwyt, dopóki kuje — zsuwał się po chwili poza zasięg, wspinał z powrotem i kuł ułamek sekundy (pętla w górę i w dół po linie pod czołem drogi)
- Menu główne: wersja gry („Remake v1”) małym drukiem w prawym dolnym rogu
- Droga do rdzenia: czoło przy samej magmie (robotnicy tam nie kopią — wszyscy „odpoczywali przy spiżarni”) albo takie, które stoi 2 minuty mimo wysłanych kopaczy (wisiało nad szybem bez podłogi — zjeżdżali po linie i wracali w kółko), plan drogi omija przez 6 minut i liczy trasę od nowa; kopacz wybiera miejsce z podłogą albo ścianą. Bot na 64 światach: postoje drogi ponad 3 min z 5 światów (do 14 min) do 1 (3,5 min), 64/64 wygranych, średnio 10,4 min. Na ekranie liny tylko w pustce, jedną kreską (bez klamer przy ścianach). (Wcześniejsza próba — mniej lin w symulacji, zakaz przepaści, zakaz pól bez oparcia — odcinała lud od jedzenia i została cofnięta)
- Nowe postacie ludu (`src/render/postacie.ts`): cieniowane bryły, twarze (mrugają), jasna obwódka roli; robotnik w czapce z lampką i kamizelce, pobożny w szacie z kapturem, laską i krzyżem, rycerz w zbroi z tuniką, peleryną, pióropuszem, tarczą i mieczem. Animacje: cykl chodu i biegu z kołysaniem, zamach kilofem z wyczekaniem i odpryskami, klęczenie w modlitwie (co jakiś czas wznosi ręce, iskry z dłoni), cięcie mieczem ze śladem, wspinaczka ręka za ręką, spadanie, jedzenie, księga, worek na plecach tragarza; peleryna, pióropusz, kaptur i szata mają bezwładność, a zmiana czynności przechodzi płynnie. Dawny rysunek zostaje — przełącznik „Nowe postacie” w ustawieniach
- Rycerze ruszają na bossa dopiero we trzech: mniej czeka z dala od rdzenia (boss tymczasem zasypia i zdradza kolejne gniazdo); gdy gniazd już nie ma, idą, ilu jest — pojedynczo ginęli od razu i partia stała w miejscu. Wstęga drogi mówi, ilu rycerzy brakuje
- Robotnik zbiera grzyb i „wraca do siedziby” także przy spiżarni obozu — przy siedzibie na jałowej półce wszyscy robotnicy (również kopacze drogi) wracali do pustej siedziby, utykali na jej skraju, a rycerze pod rdzeniem umierali z głodu
- Tunel ku gniazdu w górę: kopacz trzyma się ścian szybu i nie zsuwa się co chwilę; zsunięcie się i powrót na ten sam kafel nie zużywa limitu kroków — tory do pokazanych gniazd kończyły się „ogień zagrodził” kilkanaście kafli przed celem, choć ognia nie było (boss usypiał po kilka razy, a gniazdo zostawało w skale)
- Spisek rycerzy rzadszy: mniejsza waga w losowaniu i najwyżej jeden na 5 minut
- Pobożni z księgą: gdy w ostatniej fali nie ma już gniazd ani rycerzy, pobożni unoszą księgi i razią Strażników z dystansu (cofają się, gdy wróg podejdzie); boss i słudzy biją ich — boss nie zasypia w tej sytuacji
- Uprawa: przy spiżarni, przy której pracuje robotnik, grzyb sam odrasta (do 8 sztuk) — grzyb wokół
  siedziby kończył się po kilku minutach i lud wymierał z głodu
- Przy małej liczbie robotników mniej z nich kopie drogę do rdzenia (zawsze ktoś zbiera jedzenie)
- Siedziba nie przenosi się pod rdzeń (w strefę Strażników); stojący tam nie ciągną jej za sobą
- Karta buntownika pokazuje jego zamiar
- Posterunki wart i miejsca przy obozie omijają magmę (wolni rycerze płonęli); stacjonujący jedzą sami od 60% głodu
- Magma przy drodze wiernych zastyga w kamień (wlewała się do korytarza i paliła kopaczy); robotnicy nie kopią czoła drogi tuż przy ogniu
- Ucieczka od ognia prawdziwą drogą do bezpiecznego miejsca (lud utykał w kieszeni przy magmie)
- Lud nie przebija się do magmy nawet w obłędzie (pięciu robotników otworzyło kieszeń magmy nad szybem)
- „Wraca do siedziby” idzie wyliczoną drogą — wcześniej na przełaj wpadał w ślepy szyb i ginął z głodu
- Najazd ludzi schodzi ≥55 kafli od siedziby; bez „poprowadź ich na” własny lud; bot zawala wejście, gdy ma krew
- Naprawiony skrypt testu balansu (znak ` w szablonie)
- Tragarz, który słabnie z głodu, zjada niesione jedzenie (sześciu padło z pełnymi rękami)
- Lud nad samą magmą wisi na klamrze zamiast zjeżdżać w ogień
- Głodny przerywa długi spacer i najpierw szuka jedzenia
- Pod rdzeniem szaleństwo głębi nie łapie nikogo z ludu (warta rycerzy głodowała przez nie o połowę szybciej)
- Głodny uwięziony w odciętej kieszeni (żadna droga do spiżarni) wkopuje się do najbliższej spiżarni
- Woda wsiąka w pęknięcia skorupy — zalany szyb nad rdzeniem blokował wygraną mimo 12 pęknięć
- Śniący Kamień bez rycerzy przez 2 min wraca do ściany na 4 min (skorupa wtedy nie pęka) i zdradza jedno gniazdo — koniec pata, w którym lud wymierał z głodu
- Karta „Pobożni chcą zejść pod rdzeń” wysyła tylko pobożnych (zabierała robotnika z torem ku gniazdu — tor nie kończył się nigdy i blokował nowe próby); idący się modlić porzuca tor
- Gniazdo pokazane (karta snu, uśpiony boss): „Przemyśl i kop” trafia w nie bez zgadywania
- Głodny w płytkiej wodzie najpierw idzie jeść; głodny „czekający z dala od ognia” w odciętej kieszeni wkopuje się do spiżarni
- Głodny, do którego żaden Strażnik nie jest blisko (12 kafli), nie ucieka przed falą, tylko idzie jeść (na skraju strefy uciekali w kółko i umierali z głodu)
- Idący wyliczoną drogą przechodzi obok magmy bez ucieczki, jeśli następny kafel jest wolny od ognia (droga szybem przy magmie była przerywana co sekundę i robotnicy dreptali w kółko do śmierci)
- Samouczek i README opisują sen bossa i trafianie w pokazane gniazdo
- Wskazówka przy śpiącym bossie nie odsyła do „Przemyśl i kop”, gdy wszystkie gniazda są już odkopane
- Pasek „Śniący Kamień śpi w ścianie · wróci za m:ss · zbierz rycerzy” i wskazówka „teraz:” prowadząca do świecącego gniazda; w czasie fali wstęga mówi, że skorupa nie pęka
- Uprawa przy spiżarni liczy tylko grzyb na podłodze w swoim pasie (wiszący nad siedzibą grzyb blokował ją i siedziba głodowała)
- Nawrócony buntownik przestaje być celem — rycerze gonili go dalej i dobijali wiernych towarzyszy z warty; lud nie bije swoich (poza buntem)
- Uprawa: gdy przy spiżarni nie ma podłogi (siedziba w pustej jaskini), sadzi szerzej (±14 kafli w bok, ±6 w pionie)
- „Przemyśl i kop” do pokazanego gniazda: robotnik dochodzi zwykłą drogą jak najbliżej gniazda i stamtąd kopie wyliczoną trasą (BFS przez skałę z ominięciem ognia, wody i przepaści; gdy coś ją zagrodzi — liczy od nowa). Wcześniej w niektórych światach żadne gniazdo nie dawało się odkopać i rycerzy nie było wcale
- Skrajnie głodny w drodze do spiżarni zjada grzyb rosnący tuż przy nim (padali z głodu kilka kafli od grzybni)
- Tunel zagrodzony (ogień, woda) najdalej 6 kafli od gniazda: rycerze słyszą kopanie, przebijają się sami i wychodzą przy kopaczu — gniazda przy magmie nie dawały się odkopać wcale
- Bot: przy pokazanym gnieździe wysyła jednego robotnika (wystarczy 6 wiary)
- Najazd ludzi wraca na powierzchnię po 1,5 min (wcześniej błąkał się, aż trafił na siedzibę)
- Karta „Woda nad obozem” → „Odwróć wodę”: woda naprawdę spływa daleko od siedziby i obozów (losowa powódź potrafiła trafić prosto nad obóz i utopić kilku)
- Ołtarzy nie stawia się przy rdzeniu ani na drodze wiernych, a ołtarz w szybie pęknięcia kamień wypycha (zagrodzone jedyne wejście: skorupa pękała 8 razy i wygranej nie było)
- W czasie fali głodny nie-rycerz nie idzie jeść do spiżarni ani po grzyb w strefie Strażników (boss wybijał ich tam po kolei)
- Wynik bota (ostatni pomiar, 64 światy): 61 wygranych, 0 porażek, 3 partie trwają po 25 min; mediana partii ok. 9 min.
  Przebiegi są chaotyczne — jedna inna karta zmienia całą partię; wersja tuż przed ostatnią poprawką miała 61/64.
  Zgonów z głodu na 16 pierwszych światach: z ~37 na początku poprawek do kilku; w magmie 0

## Remake v1 (komputer) — etap 4
- Nowa talia kart ludu: spisek rycerzy → bunt (zbuntowani rycerze w czerwonym obrysie, osobny klan,
  wierni rycerze walczą z nimi sami), zatrute plony (zatrucie: czerwona aureola, −40% na minutę),
  woda nad obozem, zawał nad drogą wiernych, sen o kamiennych rycerzach (gniazdo świeci na stałe)
- Klamry rysowane w grze; Strażnicy z głową i nogami, boss z koroną
- Samouczek i atlas pod nowe zasady: role ludu, rycerze w skale, weterani i aureole, Strażnicy Snu,
  Śniący Kamień, klamry, nowa przegrana; nowe tablice odkrywają się w grze
- Balans: obóz frontowy zaopatruje do 3 nosicieli po 12 jedzenia; grzyb przy obozie zbierany także
  pod rdzeniem; w czasie fali robotnicy nie biorą zadań w strefie Strażników, uciekający i czekający idą
  do spiżarni poza strefą, nowi ze skały wychodzą przy siedzibie; Strażnicy nie gonią uciekających;
  zwykła fala bez walki przez 3 min wraca do snu (skorupa się zrasta); przy bossie bez rycerzy lud się
  wycofuje; po wygranej fali rycerze wracają do pełni sił; Strażnicy nieco słabsi
- Film z rozgrywki: remake-v1/film/remake-v1-etap4.webm

## Remake v1 (komputer) — etap 3
- Strażnicy Snu: fale przy 20/45/70% skorupy (2/3/4 Strażników, każda fala silniejsza), przy 90% boss
  z dwoma Strażnikami; podczas fali skorupa nie pęka i nikt nie wchodzi do rdzenia; za falę +15 wiary
- Strażnicy przenikają skałę, nie odchodzą dalej niż 30 kafli od rdzenia, biją najpierw rycerzy;
  rycerze w zasięgu ruszają do walki (cios co pół sekundy), reszta ludu oddaje słaby cios
- Podczas zwykłej fali pobożni i robotnicy odchodzą spod rdzenia, wysłani pobożni czekają z dala;
  przy fali z bossem pobożni modlą się dalej — ich modlitwa osłabia bossa
- Boss Śniący Kamień (src/nastawy/boss.ts + src/sim/boss.ts, wymienny przez AKTYWNY_BOSS): rani go
  tylko rycerz, zasypuje drogę wiernych, słabnie od modlitwy trzech pobożnych, bez niej się zrasta
- Pasek fali nad polem gry (która fala, ilu zostało, życie bossa), alarm z radą przy każdej fali,
  kamienne sylwetki Strażników i bossa (widoczne także w skale), karta Strażnika
- Fale i boss przeżywają zapis gry

## Remake v1 (komputer) — etap 2
- Kamienni rycerze w 5 gniazdach w skale (po 2–3, z boku osi siedziba–rdzeń, z dala od magmy i wody);
  słaby żar, gdy ktoś jest blisko; dokopanie budzi ich jako weteranów (najedzonych), z przejściem do tunelu
- Szept „Przemyśl i kop” (robotnik, 6 wiary): klęczy i prosi o znak, potem kopie tunel ku gniazdu
  wzdłuż prostej, obchodzi ogień, wodę i przepaści; trzy tory — jeden kopacz trafia ~1/3, trzech na pewno
  (w testach 19/20 światów); kopacz ku znakowi czeka na dostawę jedzenia jak kopacze drogi
- Weterani: po 4 min, póki najedzeni i lud wierny — +30% siły, szybkości, kopania, modlitwy; jasna aureola;
  na karcie „póki najedzony” albo „weteran bez premii” z powodem
- Rycerze poza wartą pilnują obozu z jedzeniem (stały posterunek); wartę pod rdzeniem trzymają, gdy jest
  tam obóz z jedzeniem; głodnieją wolniej (×0,35)
- Poprawka ruchu: po klamrach w bok postać się trzyma (wcześniej zjeżdżała szybem i wspinała się w kółko)
- Pobożni wysłani pod rdzeń czekają przy obozie frontowym (modląc się), aż robotnicy dokopią drogę —
  nie stoją już przy czole między kopaczami; gdy droga gotowa, schodzą razem
- Rycerze idą z wyprawą: do obozu frontowego, a gdy pobożni modlą się pod rdzeniem — na wartę

## Remake v1 (komputer) — etap 1
- Jeden lud: pobożni, robotnicy, rycerze (zamiast wielu ras)
- Bez narodzin: co 15 s skała wydaje wybraną rolę za krew (osłabiony przez minutę)
- Krew jako zasób: zapas, śmierci, ofiara, samookaleczenie pobożnego
- Spiżarnia w siedzibie; robotnicy znoszą jedzenie; bez rudy
- Wędrowna siedziba i obozy odciętych; ołtarz nie zamurowuje już nikogo
- Bez snu góry: przegrana, gdy nie da się już wygrać
- Poprawki po grze: mniej postaci (start 3/3/1, limit 14, skała co 20 s); nowi wychodzą przy największej grupie
- Robotnicy kopią w poziomie wokół siedziby, nie przebijają się do jaskiń i trzymają się z dala od rdzenia
- Lud nie wchodzi w przepaści, a tam, którędy przeszedł, wbija klamry — każdą drogą w dół da się wrócić
- Spiżarnia w każdym obozie; robotnicy donoszą jedzenie pobożnym i rycerzom tam, gdzie stoją
  (z najbliższego obozu z jedzeniem, a gdy tam pusto — z poprzedniego), sami jedzą z najbliższej spiżarni
- Pod rdzeniem porządek: pobożni w szeregu co dwa kafle, rycerze na warcie po bokach przedsionka
- Szept „przerwij modlitwę” (za darmo, na minutę); czytelne podpisy siedziby i obozów
- Zamiary: każda postać ma cel (np. „przekopuje korytarz na wschód”, „niesie jedzenie: pobożny #4”,
  „modli się przy obozie”, „pilnuje obozu”) i trzyma się go ~10 s albo do osiągnięcia — zamiast
  losować zajęcie co ułamek sekundy; zamiar widać na karcie postaci
- Pielgrzym wysłany pod rdzeń wraca do wyprawy po każdym przerwaniu, idzie drogą wiernych
  i nie spada z niej w magmę
- Aureola: jasna przy wzmocnieniu, czerwona przy osłabieniu; na karcie nazwa stanu, skutek i kiedy minie
- Drogę do rdzenia kopią robotnicy (do 3 naraz) — góra tylko osusza kreskę i drąży sama, gdy nikt nie kopie;
  pielgrzymi idą wykopaną drogą, nie kują jej sami; modlitwa już nie karmi — karmią dostawy
- Lud nie spada: nad pustką schodzi po klamrach, a którędy zszedł, tamtędy wróci (koniec z uwięzieniem na półce)
- Pobożni i rycerze stacjonują przy obozie frontowym (najbliżej rdzenia); nowi idą za postępem
- Grzyb posadzony przy obozie robotnicy znoszą do jego spiżarni; podpis obozu pokazuje też grzyb obok
- Ucieczka przed wodą, zalana siedziba przenosi się na suche miejsce
- Obozy i siedziba (także na starcie) stają na płaskich półkach szerokich na ≥5 kafli i wysokich na ≥3 (najchętniej przy grzybie); bez takiego miejsca obóz nie powstaje; nowy obóz najwyżej co minutę
- Koniec lewitowania: schodzący po klamrach nie zatrzymuje się w powietrzu
- Głodny przy pełnej spiżarni: pobożni i rycerze z jedzeniem w zasięgu ~10 kafli jedzą sami, nie czekają na dostawę;
  kopacze drogi przerywają pracę, by nakarmić pilnie głodnych; robotnicy zaopatrują obóz frontowy;
  kurier bez jedzenia nie blokuje już dostawy

## v4.2 beta (komputer)
- Płatny wybór na karcie drożeje o 50% za każde wcześniejsze kupno w tej partii (karta to pokazuje)
- Limit krwi 150 zamiast 250; karty „pierwszej krwi” rzadziej
- Ustawienie „Jasność świata” (domyślnie 125%) — korytarze i mieszkańców widać od razu
- Balans (automat, 16 światów, surowa): 16/16 wygranych, mediana 9,8 min, partie 6–19 min

## v4.1 beta (komputer)
- Cechy nacji: pobożni, płodni, wojowniczy, kopacze, długowieczni, skromni — zaleta i wada
- Łańcuchy kart: heretyk, proroctwo, wdzięczni, ozdrowieńcy, pomsta — wybory wracają po czasie
- Świat dnia: ta sama góra dla każdego przez cały dzień, najlepszy czas zapamiętany
- Osiągnięcia: 11 celów dodatkowych, lista w menu i nowe zdobycze na ekranie końcowym
- Skutki odroczone przeżywają zapis gry
- „Nowa gra” otwiera okno wyboru trudności: łaskawa, surowa, koszmar (też z ekranu końcowego i po samouczku)

## v3 — poprawka
- Płynniej przy dużej liczbie jednostek (APK i v3 remake)

## v4 beta (komputer)
- Tryb deweloperski: okienko z logami świata i narzędziami
- Karty z odroczonym skutkiem: układ z głębią, przysięga dwóch nacji
- Trudność „Koszmar”
- Statystyki partii na ekranie końcowym
- Dziennik: inspektor postaci i kafla, pauza z krokami, wyszukiwarka, zapis do .txt, ziarno świata, licznik klatek
- Płynniej przy tłumie: postacie rysowane z gotowych szkiców (3–6× szybciej przy setkach jednostek)

## Android v3
- Karty wydarzeń z wyborem — główny sposób grania
- Tylko 3 ryty: Nakarm, Szepnij, Cud
- Wierni sami docierają pod rdzeń — wygrana w ok. 10 minut
- Wiara, krew, oddanie i sen jako liczby u góry ekranu
- Zawsze poziomo

## Android v2
- Bez Skazy, Otchłani i trucizny
- Szept „módl się” posyła wiernego pod rdzeń
- Łatwiejsza i lepiej wytłumaczona wiara

## Android v1
- Osobna wersja na telefon: dotyk, pełny ekran, przycisk „wstecz”
- Aplikacja APK do pobrania

## PC
- Grywalna partia, samouczek, atlas, pauza z planem
