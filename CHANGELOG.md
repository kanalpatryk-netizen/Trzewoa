# Zmiany

## Remake v1 (komputer) — poprawki po etapie 4
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
- Pasek „Śniący Kamień śpi w ścianie · wróci za m:ss · zbierz rycerzy” i wskazówka „teraz:” prowadząca do świecącego gniazda; w czasie fali wstęga mówi, że skorupa nie pęka
- Uprawa przy spiżarni liczy tylko grzyb na podłodze w swoim pasie (wiszący nad siedzibą grzyb blokował ją i siedziba głodowała)
- Nawrócony buntownik przestaje być celem — rycerze gonili go dalej i dobijali wiernych towarzyszy z warty; lud nie bije swoich (poza buntem)
- Uprawa: gdy przy spiżarni nie ma podłogi (siedziba w pustej jaskini), sadzi szerzej (±14 kafli w bok, ±6 w pionie)
- „Przemyśl i kop” do pokazanego gniazda: robotnik dochodzi zwykłą drogą jak najbliżej gniazda i stamtąd kopie wyliczoną trasą (BFS przez skałę z ominięciem ognia, wody i przepaści; gdy coś ją zagrodzi — liczy od nowa). Wcześniej w niektórych światach żadne gniazdo nie dawało się odkopać i rycerzy nie było wcale
- Bot: przy pokazanym gnieździe wysyła jednego robotnika (wystarczy 6 wiary)
- Najazd ludzi wraca na powierzchnię po 1,5 min (wcześniej błąkał się, aż trafił na siedzibę)
- Karta „Woda nad obozem” → „Odwróć wodę”: woda naprawdę spływa daleko od siedziby i obozów (losowa powódź potrafiła trafić prosto nad obóz i utopić kilku)
- Ołtarzy nie stawia się przy rdzeniu ani na drodze wiernych, a ołtarz w szybie pęknięcia kamień wypycha (zagrodzone jedyne wejście: skorupa pękała 8 razy i wygranej nie było)
- W czasie fali głodny nie-rycerz nie idzie jeść do spiżarni w strefie Strażników (boss wybijał ich tam po kolei)
- Wynik bota (ostatni pomiar, 64 światy): 58 wygranych, 0 porażek, 6 partii trwa po 25 min; mediana partii ok. 9 min.
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
