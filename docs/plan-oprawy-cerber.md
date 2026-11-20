# Plan: oprawa walki z Cerberem („Trzewia”)

Plan od użytkownika (16.11), zapisany na gałęzi pracy i odhaczany etapami. Raport po każdym etapie, dalej dopiero po „dalej”.

## Stan

- [x] Etap 0 — rozpoznanie i narzędzia
- [x] Etap 1 — światło i kontrast (system ogólny, na walce z demonem); błyski do dostrojenia później (decyzja 16.11)
- [x] Etap P — przeniesienie kręgu trzeciego (Cerber) z `krag-3-beta/` do C# (czeka na „dalej”)
- [x] Etap 2 — czytelność (na Kręgu Trzecim; czeka na „dalej”)
- [x] Etap 3 — „uderzenie” (na Kręgu Trzecim; czeka na „dalej”)
- [x] Etap 4 — cutscenki (na Kręgu Trzecim; czeka na „dalej”)
- [x] Etap 5 — jeden styl („rycina”; czeka na „dalej”)
- [x] Etap 6a — walka i obrażenia według wzorów użytkownika (20.11; w Kręgu, za flagą; czeka na „dalej”)
- [x] Etap 6b — Krąg bez Cieni, ruchy wieloetapowe, naprawy błędów, przełączniki, zamach ludu (20.11; czeka na „dalej”)
- [x] Etap 6 — mechanika bossa (20.11, „Kontynuuj ze wszystkim innym”; za flagą; liczby do akceptacji; czeka na „dalej”)

## Decyzje użytkownika (16.11, po raporcie etapu 0)

1. **Gałąź:** nowa gałąź `oprawa/cerber`, założona od `claude/friendly-mayer-7sx7tn` (tam jest port C#).
2. **Cerber:** kolejność dowolna, ale na końcu wszystko — bez wyjątku — ma być w C#. Przyjęta kolejność: etap 1
   (światło) jako system ogólny na walce z demonem; potem **etap P**: krąg trzeci z `krag-3-beta/` przeniesiony do C#
   tak jak reszta portu (ta sama logika i liczby, testy zgodności z TS); etapy 2–5 już na Cerberze, bo większość z nich
   dotyczy właśnie jego (trzy głowy, ścinanie, pieczęć w piecu, dłoń).
3. **Dłoń:** „zrobić tak, żeby wyglądało jak najlepiej”. W logice dłoń jest tarczą bossa (ciosy się od niej odbijają),
   więc obraz ma to mówić, a nie udawać, że go trzyma: wyrasta ze światłem od dołu, przy każdym odbitym ciosie iskry
   i drgnięcie, nad nią pierścień, który pokazuje, jak długo jeszcze stoi, na koniec rozpada się w iskry. „Dłoń jako cud
   za wiarę, która trzyma bossa” to zmiana mechaniki — zostaje w etapie 6.
4. **Nagranie było z obserwatorium (gra bota).** To tłumaczy zamrożony obraz po końcu gry (rycerz „celuje w pustkę”):
   w obserwatorium świat stoi do restartu partii. Spadek wiary o 30 przy dłoni to Cud rzucony przez bota.

## Decyzje użytkownika (17.11, po raporcie etapu P)

1. Przełącznik trybu jako ostatnia pozycja menu — zostaje.
2. Ustawienia i klawisze — wspólne dla Alphy 1 i Kręgu Trzeciego.
3. **Zawsze pracujemy na najnowszej wersji gry.** Najnowsza to Krąg Trzeci (Cerber), więc etapy 2–5 robimy na nim
   (w trybie kręgu); Alpha 1 zostaje, jaka jest.

## Decyzje po raporcie etapu 2 (19.11 — użytkownik: „na pytania odpowiedz sam według siebie”)

1. Księga zwinięta w walce — zostaje wyłączona (flaga do próby): księga jest wzorem stylu i trzyma akcje (pieczęć
   „Nakarm”, zasoby); 16% wyższa płyta tego nie równoważy.
2. Dymek z instrukcją — treść zostaje.
3. Pasek bossa przy 720p — ciaśniejszy (mniejszy tytuł i odstępy): zamiast ok. 19% wysokości płyty ok. 15%.

## Ustalenia z etapu 0, które zmieniają plan

- **Walki z Cerberem nie ma w `trzewia-cs/`.** Cerber jest tylko w `krag-3-beta/` (TypeScript, gałąź
  `claude/youthful-wozniak-dqa6s9`). `trzewia-cs/` to port `alpha-1/`, a tam bossem jest demon z Wielkiego Pomnika.
  Zgodnie z planem etapy 1–3 robią systemy ogólne w C# na walce z demonem (te same fazy: stoi → rozpada → wychodzi →
  walka → kona). Podpięcie pod Cerbera czeka, aż krąg trzeci będzie w C#.
- **`trzewia-cs/` nie ma na `main`.** Port jest tylko na gałęzi `claude/friendly-mayer-7sx7tn`, więc gałąź oprawy
  `oprawa/cerber` stoi na niej.
- **Gra rysuje przez `IPlotno` (polecenia Canvas 2D), nie przez SkiaSharp.** Warstwa `Trzewia.Gra` nie zna Skii
  (żeby dało się ją przenieść do Unity/Godota). Efekty z planu idą przez `IPlotno`: `globalCompositeOperation`
  (`multiply`, `screen`, `lighter`, `source-atop`), `createRadialGradient`, płótna poza ekranem (`Plotno.Nowe`),
  `filter` (`brightness`, `contrast`, `saturate`, `grayscale`, `blur`). To odpowiedniki `SKBlendMode`, `SKShader`,
  `SKSurface` i `SKColorFilter` z planu. Brakujące rzeczy (np. macierz koloru) dopisuje się w `Trzewia.Skia/PlotnoSkia.cs`.
- **Mrok już jest mapą świateł** (`Rysunek/Swiat/Mrok.cs`): świat widać tylko w świetle lampek, obozów, rdzenia
  i Cudu. Etap 1 rozbudowuje go, a nie stawia drugiej, równoległej mapy.
- **Loty zasobów już są** (`urobki.rysujLoty`): okruchy rudy lecą do liczników w księdze. Etap 3 rozszerza ten
  mechanizm na krew, jedzenie i wiarę.

## Zasady pracy (obowiązkowe)

1. Nowa gałąź. Nic do `main` bez wyraźnej zgody. PR tylko na prośbę.
2. Małe commity z opisem: co i po co. W commitach żadnych identyfikatorów modelu (ani nazw, ani wersji, ani stopek typu
   Co-Authored-By z modelem).
3. Praca etapami. Po każdym etapie raport (wzór na końcu) i czekanie na „dalej”.
4. Etapy 0–5 NIE zmieniają mechaniki ani balansu: obrażeń, HP, kosztów, czasów logiki, AI. Tylko wygląd. Jeśli coś
   wymaga zmiany logiki — nie robić, opisać w raporcie.
5. Stan wizualny oddzielony od logicznego: efekty mogą przesuwać miejsce rysowania, ale nie pozycję logiczną.
6. Każdy nowy efekt za flagą w jednym pliku konfiguracji (`src/Trzewia.Gra/Visual/VisualConfig.cs`); tam też wszystkie
   liczby do strojenia. Klawisz F9 włącza i wyłącza wszystkie nowe efekty naraz. Z wyłączonymi gra wygląda i działa 1:1
   jak teraz.
7. Wydajność: stałe 60 fps. Bez alokacji w każdej klatce w gorących miejscach (ponowne użycie pędzli, ścieżek,
   gradientów; cząsteczki z puli). Mapa świateł w połowie rozdzielczości.
8. Bez nowych pakietów NuGet bez pytania.
9. Dostępność: w ustawieniach suwak siły wstrząsu (0–100%) i opcja „mniej błysków”.
10. Po każdym etapie gra się buduje i działa, testy przechodzą. Jeśli czegoś nie da się sprawdzić tutaj — napisać wprost
    i podać kroki do sprawdzenia u siebie.
11. Nie zgadywać. Czego nie ma w kodzie — napisać w raporcie.
12. Ten plan leży na gałęzi jako `docs/plan-oprawy-cerber.md`; etapy są tu odhaczane.

## Diagnoza: co jest źle teraz (z 70-sekundowego nagrania walki z Cerberem, fala „Cienie żarłoków 4/4”)

- Pomieszane style: Cerber to błyszczący render 3D, dłoń wygląda jak zdjęcie, ludzie jak wycinanki z białą obwódką,
  dusze w tle to płaskie manekiny, złoty trójkąt na korytarzu to ikonka z UI, a w napisach jest systemowe emoji (⏩).
  Spójna jest tylko księga (HUD) i to ona jest wzorem.
- Za ciemno i płasko: średnia jasność kadru przez całą walkę 34–38 (skala wideo 0–255), między klatkami zmiana
  najwyżej ok. 1,6. Żadne zdarzenie nie rozbłyska.
- Czytelność: przy 720p ludzie ok. 45 px, Cerber ok. 190 px. Ciemne postacie giną na ciemnym bossie. Trzy głowy zlewają
  się w jedną bryłę. Kikuty jak różowa wata, rany jak czerwone zygzaki markerem.
- Etykiety nad ludźmi małe, ciemne, kursywą. Nachodzą na siebie („mnisi” na „na miejscu”), „garść jedzenia
  w paszczę!” ginie na ciele bossa.
- Pasek bossa to całe zdanie. Paski głów nie są połączone z głowami na modelu.
- Samouczek „pieczęć pęka — Cerber ma trzy paski życia…” to czarny pas przez środek ekranu; przez ok. 3 s zakrywa piec
  i połowę pękającej pieczęci.
- Wejście bossa: Cerber pojawia się nad ekranem i spada przez podłogę korytarza do pieca, choć pieczęć pęka w piecu.
- Dłoń pojawia się ok. 0,7 s po spadku wiary z 48 do 18, stoi prawie nieruchomo ok. 6 s i znika. Nie chwyta, boss się
  nie szarpie.
- Teleport: Cerber w jednej klatce przeskakuje z wnętrza pieca na szczyt łuku.
- Ruch: kilka póz, ataki bez zapowiedzi. Przewrócony rycerz to ten sam obrazek obrócony o 90°, z kreskówkowymi
  gwiazdkami.
- Ścięcie głowy to tylko podmiana modelu: bez błysku, zatrzymania, wstrząsu.
- Śmierć: trup i kałuża krwi znikają w jednej klatce. Krew w księdze rośnie 41 → 47 bez sygnału. Napis „droga w dół
  stoi otworem”, ale nic się nie otwiera. Po zniknięciu trupa rycerz przez ok. 8 s celuje mieczem w pustkę.
- Zasoby zmieniają się po cichu, tylko w księdze (jedzenie 40 → 16, krew 59 → 65 → 41 → 47).

## Etap 0 — rozpoznanie i narzędzia (bez zmian w wyglądzie)

- [x] Mapa kodu w raporcie: pętla gry i czas (dt), kamera, kolejność warstw, sprite'y i animacje, walka z bossem
      (pojawienie, wejście, dłoń, ścinanie głów, śmierć, usuwanie trupa), napisy (samouczek, etykiety, pasek bossa),
      księga/HUD i zmiany zasobów.
- [x] Ustalić: czym jest dłoń (cud za wiarę czy skrypt); skąd i dlaczego Cerber spada z góry; czy rycerz w pozie ataku po
      śmierci bossa to błąd AI czy animacji; co oznacza ⏩.
- [x] Sprawdzić, czy walka z Cerberem jest w `trzewia-cs/` (nie ma — patrz „Ustalenia”).
- [x] `VisualConfig` i klawisz F9 (bez efektów).
- [x] Tryb bez okna: `Trzewia --zrzuty-walki KATALOG [--ziarno N] [--oprawa wl|wyl]` — deterministyczna partia bota
      do walki z bossem, zapis wybranych klatek do PNG i `klatki.json`.
- [x] Skrypt jasności: `narzedzia/oprawa/jasnosc.py` — średnia jasność pola gry, pasa akcji i tła, porównanie przed/po.
- [x] Zrzuty „przed” (ziarno 3, 1920×1080): w walce pole gry 25,8–27,4 (cały kadr z interfejsem średnio 37,0),
      pęknięcie pomnika i trafienia bez rozbłysku; `--oprawa wl` i `wyl` dają pole gry identyczne bit w bit.

Gotowe, gdy: raport z mapą kodu i odpowiedziami, klawisz debug działa, zrzuty „przed” z pomiarem jasności.

## Etap 1 — światło i kontrast

Zrobione w `src/Trzewia.Gra/Visual/SwiatloOprawy.cs` (warstwa), `Visual/LightEvents.cs` (błyski), liczby
w `Visual/VisualConfig.cs` (`VisualConfig.Swiatla`). Wszystko za F9 (`VisualConfig.Swiatlo`).

- [x] Trzy plany: tło (rycina — skała, ściany, korytarze) rysowane z filtrem `FiltrTla` (ciemniej, mniej koloru,
      trochę kontrastu); plan akcji rozjaśnia mapa świateł; interfejs leży poza płytą świata i światło go nie dotyka.
      (Dusze w tle są dopiero w kręgu trzecim — w etapie P pójdą do planu tła.)
- [x] Mapa świateł w połowie rozdzielczości: czyszczona barwą otoczenia, światła jako gotowe plamki z gradientu
      promienistego (rysowane raz) dodawane `lighter`, nakładana `multiply`; poświata ognia, pieca i aury dodatkowo
      `screen`. „Scena przed mnożeniem rozjaśniona” zrobiona jako druga mapa nakładana `color-dodge` (jasność /
      (1 − blask)): to samo mnożenie jasności co macierz koloru, ale bez kopii całej klatki, a tam, gdzie świeci, mocniej.
- [x] Źródła: pochodnie, kosze ognia, kocioł i świece lochu (migotanie ±6,5%, gładki szum z sinusów 6,3 / 8,1 /
      9,7 Hz), piec (komora bossa — żar rośnie z każdym stanem pękania, najmocniejszy przy rozpadzie), aura modlących się
      mnichów; do tego lampki ludu, siedziba, obozy, rdzeń, ołtarz, pomieszczenia (te same co w mroku) i żar ciała bossa.
- [x] Jasna krawędź od najbliższego światła: gra już ją miała (`Duszek.Krawedz` — sylwetka w barwie światła,
      przesunięta ku niemu, pod duszkiem); z oprawą łapie też ogień, piec i aurę i jest mocniejsza. Tylko lud — boss
      i Cienie rysują się inaczej (kukiełka), dla nich krawędź w etapie P/2.
- [x] Winieta (wpisana w mapę świateł, bez osobnego przejścia). Kontrast: `contrast(1.1)` w filtrze tła; osobnej
      krzywej kontrastu na całą klatkę nie ma — wymagałaby kopii klatki w każdej klatce.
- [x] Światło reaguje na zdarzenia: `LightEvents.Flash(barwa, siła, ms)` (+ wersja z miejscem i promieniem):
      pęknięcie pieczęci — czerwony błysk z pieca (i słabszy na całą płytę), każdy wcześniejszy stan pękania — mniejszy;
      ostatni cios — krótki biały (w kręgu trzecim podepnie się pod ścięcie głowy); konanie bossa — wszystko poza nim
      przygasa do 50% (otwór światła wokół bossa), po końcu gry wraca.
- [x] „Mniej błysków” w ustawieniach (Obraz): każdy błysk × 0,3.

Pomiar (ziarno 3, 1920×1080, `jasnosc.py`, „akcja” = pas walki ±16 kafli wokół bossa): w walce akcja 32,2 → 42,4
(+32%), tło 26,0 → 17,7 (−32%); błysk pęknięcia +15 przez ~150 ms, ostatni cios +62 przez ~220 ms (biały 130 ms +
złota eksplozja konania z Alphy 1); z oprawą wyłączoną pole gry identyczne z etapem 0 (228/228 klatek).

## Etap P — krąg trzeci (Cerber) w C#

Przeniesienie z `krag-3-beta/` (TS) do `trzewia-cs/` tak jak reszta portu: te same nazwy, ta sama logika i liczby,
symulacja bit w bit (testy złote z TS), rysunek porównany z TS. To nie zmienia balansu — to ta sama gra, tylko w C#.
- [x] Krąg trzeci stoi w C# **obok** Alphy 1, jako osobny tryb (decyzja użytkownika 16.11).
- [x] Symulacja kręgu (obżarstwo, ulewa, okup, Cerber podjada kosz, zabijanie żarłoków), Cerber jako boss: trzy paski
      głów, ścinanie, dłoń przy Cerberze. `Symulacja/Krag.cs`, `Nastawy/Krag.cs`, `KragNadpisy.cs`; przełącznik
      `Krag.Ustaw(bool)`. Bit w bit z TS: 20 partii bota do 60 000 tików, test pieczęci dla 12 ziaren, pełne partie
      ziaren 3 i 5 (`KragTesty`).
- [x] Rysunek: krąg (lej z tarasami wyższych kręgów, przepaść do Dis, deszcz z gradem i błyskawicami, błoto z kośćmi
      i szczątkami, potępieni na tarasie i w trzewiach, krople, ciała w ścianach), loch kręgu (krew na murach,
      wisielcy, kopce czaszek), pieczęć zejścia, Cerber składany z wypieczonych obrazków (`Rysunek/Krag/Cerber.cs`:
      szkielet, części, poza z ruchów walki), pięć sposobów zabijania, żarłok z obrazków, trzy paski głów,
      ścięte głowy na posadzce. Duszki: `straznik-krag` (Cienie Żarłoków) i `rycerz-6-zK-sciecie` (ruch „Ścięcie głowy”).
- [x] Wstęp: film kręgu (75 s, 12 ujęć) i scena wejścia bez sterowania (`Aplikacja/FilmKregu.cs`, `WstepKregu.cs`).
- [x] Menu: pozycja „Krąg Trzeci” / „Alpha 1” przełącza tryb (zapamiętany w ustawieniach); osobne pliki zapisu,
      osiągnięć i atlasu; teksty interfejsu, samouczka, atlasu i kroniki kręgu.
- [x] Zrzuty bez okna (`--zrzuty-walki … --krag`) już na Cerberze.
- [x] Porównanie z TS (`narzedzia/ekrany/porownaj-krag.mjs`, test `PorownanieEkranowKregu`): ta sama partia bota,
      ta sama kamera i zegar — średnia różnica 2,4–2,6/255 w scenach gry (0,4–0,9% pikseli różnych o > 24).
- [x] Unity: kopia kodu i danych (`trzewia-unity/narzedzia/kopiuj_z_trzewia_cs.py`).

Świadome różnice od TS (do decyzji, jeśli coś ma być inaczej):
- Teksty kręgu w TS powstały automatyczną zamianą słów i miały błędy odmiany („pieczęć zejścia zaczął pękać”) —
  w C# poprawione. Opisy tablic atlasu „Pieczęć zejścia”, „Cerber” i „Ostatnie uderzenie” napisane od nowa (w TS
  zostały zdania o kamiennym demonie z aureolą); tablica „Walka Cerbera” odgrywa ruchy psem (w TS — dawnym demonem).
- Film i scena wejścia nie ruszają w samouczku i w grze obserwowanej (w TS samouczek też dostawał film).
- Ustawienia i klawisze są wspólne dla obu trybów (w TS — osobne, bo to była osobna gra).
- Rysunek 2D Cerbera i żarłoka (zastępczy w TS, póki obrazki się wczytują) nie jest przeniesiony — w C# obrazki
  są zawsze wczytane.

## Etap 2 — czytelność

Zrobione na Kręgu Trzecim (Cerber), zgodnie z decyzją 17.11. Kod: `src/Trzewia.Gra/Visual/Czytelnosc.cs` (znaki głów,
postacie przy bossie, etykiety), `Visual/PasekBossa.cs`, `Visual/KameraBossa.cs`, `Visual/Glify.cs`; liczby
w `VisualConfig.Czytelne`. Wszystko za flagą `VisualConfig.Czytelnosc` i F9 (księga zwinięta — osobna flaga
`ZwinietaKsiega`, domyślnie wyłączona).

- [x] Postać za bossem, która na niego nachodzi: po bossie jeszcze raz jako sylwetka w pergaminie, 35% krycia. Postać
      przed bossem, która na niego nachodzi: jasny obrys (pergamin, 1,6 px). Rozpoznanie: prostokąt postaci × obrys
      ciała bossa z tej klatki (z poprzedniej, dopóki boss się nie narysuje); klatka duszka z `Duszek.Rysuj`.
- [x] Głowy bossa: punkty głów nie są ręcznie wpisane w klatki — Cerber jest składany ze szkieletu (`RigCerbera`)
      w każdej klatce, więc punkty (ślepia trzech głów) bierzemy prosto z niego, dokładnie tam, gdzie głowa jest
      narysowana. Nad Cerberem rząd znaków I / II / III (krążek pergaminu, cyfra atramentem, krój tytułów) w kolejności
      głów od lewej, każdy z kreską do swojej głowy; głowa do ścięcia pulsuje (złoty pierścień i poświata, a gdy jej
      pasek jest pusty — czerwień, szybciej). Ten sam znak przy jej pasku.
- [x] Pasek bossa: tytuł „C E R B E R”, mały wskaźnik fali („fala 4/4 · 2 cienie”), cel jedną linijką przez 5 s
      (potem gaśnie i rząd się zwija), trzy paski ze znakami I/II/III; pasek ściętej głowy pęka (biały błysk, rysa
      z góry na dół), połówki rozchodzą się wzdłuż rysy i gasną. Przy konaniu: „Cerber kona — droga w dół stoi otworem”.
- [x] Samouczek: czarnego pasa z nagrania w kodzie nie ma (pochodził z późniejszej wersji TS); instrukcja walki w małym
      dymku na pergaminie pod paskiem bossa (2 linijki, znika po 6 s albo po kliknięciu). Karta z pauzą przy wejściu
      Cerbera (zwykła gra) została, jak była — to przebieg gry, nie wygląd. Zdanie fabularne — etap 4.
- [x] Bez systemowych glifów: płótno (rysunek i pomiar tekstu) zamienia znaki spoza krojów gry na » « · – albo słowa
      („w górę”, „w dół”). Emoji ⏩ z nagrania w C# nie ma.
- [x] Etykiety nad postaciami: krój księgi (pismo), 18 px przy 1080p (najmniej 14), pergamin z ciemnym obrysem 3 px
      (najpierw obrys), 150 ms pojawiania i znikania; rysowane po mapie świateł.
- [x] Układ etykiet bez nachodzenia: sortowanie (szept gracza przed myślami postaci, starsze przed młodszymi),
      młodsze wypychane w górę, przycięcie do kadru; na ciele bossa ciemna podkładka. Test: `CzytelnoscTesty`.
- [x] Kamera w walce z bossem płynnie do 1,25× przybliżenia sprzed walki (wokół środka między bossem a 3 najbliższymi
      postaciami), po walce wraca. Gdy gracz albo gra sami zmienią przybliżenie (kółko, przelot przy konaniu) —
      kamera oddana bez powrotu.
- [x] Za flagą, domyślnie wyłączone: księga zwinięta do paska (role i wiara, krew, jedzenie), płyta wyższa
      (`--zwinieta-ksiega` w zrzutach).
- [x] Minimapa: jaśniejszy zarys i pamiętane miejsca, ramka widoku z ciemnym brzegiem, podpis w pergaminie
      z obrysem, czerwony punkt bossa w walce.

Gotowe, gdy: żadne dwie etykiety nie nachodzą na siebie; postać przy bossie zawsze widać; na każdym zrzucie z walki widać,
która głowa jest którą i którą teraz ścinamy; na ekranie nie ma emoji.

Sprawdzenie (ziarno 3, `--zrzuty-walki … --krag`): z oprawą wyłączoną (F9) każda klatka identyczna z grą sprzed etapu 2
poza dwoma miejscami, które już wcześniej pulsowały według zegara komputera (napis „zetnij!” na pasku i przycisk atlasu —
różnią się też między dwoma uruchomieniami tej samej wersji). Jasność (720p, przed = etap P z oprawą, po = etap 2): pole
gry średnio 23,9 → 24,9, akcja 42,1 → 41,5 — etap 2 nie zmienia światła, różnice to bliższa kamera. Koszt (rysunek
procesorem 720p, ta sama walka, `--czytelnosc wl` / `wyl`): 482–505 ms / 469–479 ms na klatkę, ok. +3–5% (w tym kamera
bliżej). Testy: `CzytelnoscTesty` (etykiety nie nachodzą na siebie ani na pasek bossa i dymek; glify tylko z oprawą).

## Etap 3 — „uderzenie”

Zrobione na Kręgu Trzecim (Cerber). Kod: `src/Trzewia.Gra/Visual/Uderzenie.cs` (zdarzenia, zatrzymanie, wstrząs, lot
głowy, przewrócenie, zapowiedź i oddech, spoczynek), `Visual/Czasteczki.cs`, `Visual/LotyZasobow.cs`; liczby
w `VisualConfig.Uderzenia`. Wszystko za flagą `VisualConfig.Uderzenie` i F9; suwak „Siła wstrząsu” w ustawieniach (Obraz).

- [x] Zatrzymanie trafień: zwykłe ciosy 0; mocny cios (jednym trafieniem ≥ 6% życia albo boss się chwieje) 60 ms;
      ścięcie głowy 140 ms; ostatni cios 200 ms. Ekran gry nie robi wtedy tików i nie nadrabia ich potem; rysunek,
      kamera, interfejs i cząsteczki idą zegarem ekranu. Zdarzenia wykrywane po każdym tiku z różnicy stanu.
- [x] Błysk trafienia: Cerber biały ok. 70 ms (krycie 0,75 → 0): każda część rysuje się drugi raz z białej sylwetki
      (zamiast `source-atop`, które na wspólnym płótnie bieliłoby też tło) — sylwetki liczone raz na obrazek.
- [x] Wstrząs „trauma”: siła = trauma², do 10 px przy 1080p i 1,5°, gładki szum, zanik 1,5/s; trauma: mocny cios 0,2,
      przewrócenie 0,25, lądowanie bossa 0,35 (tupnięcie, cios z góry, szarża — w chwili trafienia), ścięcie 0,5,
      pęknięcie pieczęci 0,8, śmierć bossa 0,9 (i rysa pieczęci 0,2); × suwak 0–100%, nic przy „Ogranicz ruch”.
      Płyta lekko powiększona na czas wstrząsu, żeby brzegi nie odsłaniały tła.
- [x] Cząsteczki z jednej puli (500): iskry (addytywnie, po świetle), krople krwi (spadają, na posadzce plamy gasnące
      przez 9 s), pył (przewrócenie, lądowanie, pęknięcie), popiół (pęknięcie, Cienie, konanie).
- [x] Ścięta głowa: w górę 350 px/s, grawitacja 900 px/s², obrót 6–10 rad/s (całe obroty — legnie w tej samej pozie),
      jedno odbicie (0,3), kałuża 0 → pełna w 400 ms, smuga krwi w locie. Odstępstwo: prędkość w bok nie 120–220 px/s,
      tylko taka, by głowa legła dokładnie tam, gdzie kładzie ją symulacja (półtora–dwa kafle od psa) — inaczej
      obraz rozjechałby się z pozycją logiczną.
- [x] Przewracanie: rycerz ma w C# własne klatki upadku, leżenia i wstawania (nie obrócony obrazek), więc zamiast
      obrotu — odbicie 4 px tuż po upadku, pył spod ciała, wstawanie w ostatnich 220 ms ogłuszenia; nad ogłuszonym
      (dłoń przy bossie) zamiast gwiazdek trzy krążące kreski rytownika.
- [x] Zapowiedź ataku: każdy atak Cerbera ma w danych osobny początek i trafienie (`RuchBossa.traf`) — przed trafieniem
      odchylenie do tyłu, w trafieniu wyrzut z rozciągnięciem 7%. Logiki nie trzeba było zmieniać.
- [x] Oddech bossa w spoczynku: skala w pionie ±1,5%, 0,5 Hz.
- [x] Zasoby: jedzenie, wiara z modlitwy i za Cud, krew z zabijania lecą łukiem (Bézier, 0,7 s) ze źródła do
      licznika (licznik rośnie, gdy doleci) albo z licznika do celu; ruda, krzyż i krew z ołtarza latały już wcześniej.
      Licznik pulsuje (1,0 → 1,2 → 1,0 w 200 ms) i pokazuje „+N” / „–N”.
- [x] Spoczynek: konający Cerber dalej jest celem walki (to nie błąd AI), a po końcu gry świat stoi — garda wraca do
      spoczynku po 0,3 s; ruch w toku (np. ścięcie ostatniej głowy) dogrywa się do końca.

Gotowe, gdy: każde trafienie i ścięcie czuć bez dźwięku; F9 przełącza przed/po; przy maksimum cząsteczek 60 fps.

Sprawdzenie (ziarno 3): z oprawą wyłączoną każda klatka identyczna z grą sprzed etapu 2 (poza dwoma miejscami pulsującymi
zegarem komputera). Pełna pula (ok. 460 cząsteczek) rysuje się procesorem w 2,6 ms przy 1080p. Koszt etapu (rysunek
procesorem 720p, `--uderzenie wl` / `wyl`): 351–360 / 336–346 ms na klatkę, ok. +4%. W 60 s walki zatrzymania trafień
zajęły razem ok. 1 s. Testy: `UderzenieTesty`.

## Etap 4 — cutscenki

Zrobione na Kręgu Trzecim (Cerber). Kod: `src/Trzewia.Gra/Visual/Cutscena.cs` (CutsceneDirector, obie sceny, pasy,
napisy, trup); liczby w `VisualConfig.Przerywnikowe`; wpięcie w `EkranGry.Krok.cs` / `EkranGry.Rysuj.cs` /
`EkranGry.Wejscie.cs`. Wszystko za flagą `VisualConfig.Przerywniki` i F9.

- [x] `CutsceneDirector` (uproszczony względem listy rodzajów kroków z planu — tyle, ile realnie potrzebują te dwie
      sceny, reszta rodzajów jak `Shake`/`Flash` to gotowe, już istniejące systemy z etapów 1 i 3, nie nowy kod tutaj):
      kamera jedzie do celu, pasy kinowe wjeżdżają/zjeżdżają, napisy i karta tytułu — wszystko z zegara ekranu
      i bieżącej fazy pomnika (`sim.lud.pomnik`), nigdy z własnego czasu. **Symulacja się nie zatrzymuje** — pieczęć
      pęka i Cerber wychodzi w tych samych tikach co zawsze; to czysto ekranowa nakładka (patrz niżej, „decyzja”).
      Pomijanie: spacja / Esc / klik (`Wejscie.cs`) — chowa pasy, oddaje kamerę i HUD od razu; skoro gra nigdy nie
      stała, stan po pominięciu jest identyczny z obejrzeniem do końca. Po pierwszym obejrzeniu w tej partii — krótszy
      przebieg (karta tytułu i progi czasu × `SkrocenieDrugiRaz`).
- [x] Wejście bossa: pasy kinowe (10% wysokości płyty, 0,4 s), HUD znika, kamera jedzie do pieca ×1,4 (0,8 s,
      łagodnym dojazdem); pieczęć pęka i rysuje się jak dotąd (błyski, wstrząs i iskry z etapów 1 i 3 już tam są —
      nic nowego nie trzeba było dla nich pisać, bo już reagują na `pomnik.faza/stan`); wyjście z pieca — też jak
      dotąd (łapa unosząca się, głowy, ryk, czerwona fala), tylko teraz widziane bez przeszkadzającego HUD-u i z bliska;
      karta z imieniem „CERBER” 1,5 s pod koniec wychodzenia; potem pasy znikają, HUD i kamera wracają, zaczyna się
      walka z dymkiem samouczka (ten już istniał z etapu 2).
- [x] „Pieczęć pęka.” (potem „Cerber wychodzi z pieca.”) w dolnym pasie kinowym — nigdy na akcji, bo akcja jest
      w środku kadru, między pasami.
- [x] **Poprawka logiki wejścia (bez zmiany logiki gry):** Cerber przy wyjściu z pieca spadał z ok. 5× własnej
      wysokości nad korytarzem — w praktyce zza górnej krawędzi ekranu, przebijając sufit i podłogę, mimo że pieczęć
      pęka tu, na miejscu. To tylko pozycja RYSOWANIA (ta sama liczba tików, ten sam `s.od`, ten sam punkt
      końcowy) — zmniejszona do skromnego skoku znad już otwartego zejścia (`WejscieSkokWysokosc`, za flagą).
- [ ] **Teleport z pieca na łuk → skok: nie dotyczy tego portu.** To był opis błyszczącego zastępczego renderu 3D
      ze starego nagrania (zanim obrazki Cerbera się wczytały — patrz „Ustalenia z etapu 0”); w `trzewia-cs` Cerber
      zawsze rysuje się z wypieczonych obrazków, bez takiego trybu zastępczego, więc nie ma czego naprawiać.
- [~] **Dłoń: tylko wstrząs przy jej zdarzeniach, reszta już istniała.** Pierścień, łańcuchy światła, spłaszczenie przy
      kontakcie, szarpanie się co 0,5–0,8 s i rozpad w iskry są już w pełni zrobione w `Rysunek/DlonDemona.cs`
      (wierny port z TS, nie dotykany w tym etapie) — także w Kręgu Trzecim, bo to ten sam ruch bossa
      (`rozkazRzut`/`rozkazTarcza`/`rozkazZawal`), tylko wywołany przez Cerbera zamiast dawnego demona. Lecąca wiara
      przy Cudzie już leci (etap 3, `LotyZasobow`). Dodane tu: te same zdarzenia, którymi dłoń już mówi dźwiękiem
      (wyrasta, rzuca, odbija się od tarczy, wali w strop, ląduje rzucony), teraz dokładają też wstrząs kamery.
- [x] Śmierć bossa: hit-stop ostatniego ciosu (200 ms) i zwolnienie tempa po nim **już istniały w grze bazowej**
      (`POMNIK.zwolnienie/zwolnienieTempo`, nie część oprawy) — etap 3 dołożył do tego wstrząs (trauma 0,9) i białe
      błyski; etap 1 — przygaszenie reszty obrazu do ok. 50% w czasie konania. Tu nowe: **trup nie znika w jednej
      klatce** — symulacja usuwa Cerbera (`sim.kill`) dopiero po konaniu, w tej samej klatce, w której gra się
      kończy; łapiemy go wtedy (`RozpocznijSmierc`) i dorysowujemy jeszcze przez 1,2 s, gasnącego, z iskrami popiołu
      (`Cutscena.RysujTrupa`, osobno od symulacji — martwego stworzenia ona już nie rysuje). Potem kamera (0,9 s)
      jedzie do otworu zejścia (ten stoi otworem od pęknięcia pieczęci — w Kręgu Trzecim, inaczej niż przy Wielkim
      Pomniku, nie trzeba niczego dodatkowo „otwierać” proceduralnie), napis „Droga w dół stoi otworem.” w pasie
      kinowym (2,2 s), pasy znikają, HUD i kamera wracają. **Przejście do kroniki czeka**, aż ta scena się skończy
      albo zostanie pominięta (`EkranGry.Krok.cs`) — jedyna zmiana w logice EKRANU (kiedy zmienić widok), nie w grze:
      `sim.ending` ustawia się w tym samym tiku co zawsze.
- [x] Krew bossa (ostatni cios) leci teraz do księgi z miejsca trupa, nie od ołtarza: `Sim.kill` zgłasza dla
      Strażników i bossa efekt „zawal”, nie „smierc” — `LotyZasobow` szukał tylko tego drugiego (drobna poprawka
      przy okazji, etap 3).

Gotowe, gdy: od pęknięcia pieczęci do śmierci bossa nic nie teleportuje się ani nie znika w jednej klatce; obie sceny da
się pominąć; stan gry po pominięciu jest taki sam jak po obejrzeniu.

**Decyzja (bez pytania, uzasadniona regułą „etapy 0–5 nie zmieniają logiki/czasów”):** `CutsceneDirector` NIE
zatrzymuje symulacji, wbrew pierwotnemu opisowi „symulacja stoi”. Oba przerywniki to czysto wizualna nakładka
(kamera, pasy, HUD) nad grą, która tyka dokładnie tak jak bez oprawy — bo fazy pomnika (`rozpada`/`wychodzi`/`kona`)
już są w grze bazowej zdarzeniami rozciągniętymi w czasie (odpowiednio 2,5 s / 3,5 s / 3,5 s przy 120 tik/s), a nie
jednoklatkowymi przełącznikami. Zatrzymanie symulacji na te ~5 s wymagałoby albo zamrożenia całego świata (also
walczących w tle, modlących się mnichów — realna, choć drobna, zmiana przebiegu gry), albo podrabiania fazy
pomnika własnym zegarem reżysera (dwa źródła prawdy o tym samym stanie — ryzykowne). Pominięcie dzięki temu jest
całkiem bezpieczne: nic w grze nie czekało na przerywnik, więc nie ma czego „domykać”.

## Etap 5 — jeden styl („rycina”)

Kierunek: ryciny Gustave'a Doré do „Piekła” (domena publiczna). Kolory: czerń, pergamin, czerwień krwi, ogień.
Kreskowanie zamiast miękkich cieni. Wzorem jest księga. Kod: `src/Trzewia.Gra/Visual/Palette.cs`,
`tools/ink-pipeline/rycina.py`; wpięcie w `Rysunek/Krag/Cerber.cs` i `Rysunek/Duszki/Duszek.cs`. Za flagą
`VisualConfig.Rycina` i F9.

- [x] **`Palette.cs` — inaczej niż w planie.** Zamiast nowych barw (tusz `#0F0B0A` itd.) — role z planu jako aliasy
      do już istniejącej, jedynej palety gry (`NastawyBarwy.BARWA`/`.FRESK`, wygenerowane z TS, „barwy całej gry…
      żeby nic nie świeciło kolorem, którego nie ma w świecie”). Druga paleta obok tamtej złamałaby właśnie tę
      zasadę. Ta sama lista (co do hex) w `tools/ink-pipeline/paleta.json`, bo Python do C# nie sięga.
- [x] Narzędzie offline `tools/ink-pipeline/rycina.py` (Python + Pillow + numpy): odbarwienie → tony z palety (osobna
      rampa dla krwi i dla żaru/ognia — żeby nie zgasły do szarości, reszta prawie monochromatyczna) → kreskowanie
      (ukośne, krzyżowe w najciemniejszych) jako AKCENT cienia nad tonem, nie jedyny jego nośnik — inaczej płasko
      cieniowany sprite wychodzi jednym szumem → ciemny kontur 2 px z maski kształtu (nie z tego, co tam wcześniej
      narysowano) zamiast jasnej/białej obwódki. Dwa tryby progów kreskowania: `--render` (mocniejsze — błyszczące
      rendery 3D bez własnej kreski, np. Cerber) i domyślny (łagodniejsze — gotowe, płasko cieniowane sprite'y, np.
      ludzie). Wyjście jako WebP bezstratny (jak oryginały Cerbera) — ten sam PNG spuchał na kresce 3–4×.
- [x] Ludzie: dostają z narzędzia ciemny kontur zamiast białej/jasnej obwódki (była upieczona w sprite'ach —
      `narzedzia/duszki`, TS nietknięty). Jasna krawędź od światła już istniała (etap 1, `Duszek.Krawedz`) i działa
      bez zmian na nowych sprite'ach też — nowego kodu nie trzeba było pisać, tylko podmienić, co się wczytuje.
- [x] **Boss: nie ma źródła 3D w tym porcie — klatki (wypieczone obrazki) przez narzędzie, tryb `--render`.**
      Wszystkie 181 części (`dane/grafika/krag/cerber-rycina/`, w tym kikuty szyi i ścięte głowy — to też tylko
      obrazki, osobnego kodu na „kikuty i rany” nie trzeba było pisać, patrz niżej). Ocena: dobre jako łatka na
      starym materiale (patrz raport), nie zastępuje grafika od nowa — stąd `docs/art-brief-cerber.md`.
- [x] **Kikuty i rany: nie ma osobnego kodu — to też obrazki Cerbera** (`glowa-N-odcieta`, `szyja-N-kikut`), przez
      ten sam `--render`; cząsteczki krwi z kikuta (fontanna, etap 3) to osobny, już gotowy system cząsteczek, nie
      ruszany tutaj.
- [x] `docs/art-brief-cerber.md`: zlecenie dla grafika — Cerber od nowa (pipeline to łatka, nie cel), dłoń w 3
      kluczowych klatkach (rzut/tarcza/zawał — materiał do oceny, czy wracać do klatek z obrazków zamiast modelu
      3D), otwarte przejście w dół (dziś goła dziura w geometrii, bez własnej grafiki); styl, paleta, kierunek
      światła, rozmiary.
- [x] **Dłoń: poza zakresem tego narzędzia.** To model 3D rysowany na żywo (`Rysunek/Model3D/Dlon3D.cs`, świadoma
      decyzja użytkownika 12.11, zmiana wobec TS) — nie gotowy obrazek, więc offline pipeline go nie dotyczy.
      Materiał na decyzję (spłaszczyć render 3D czy wrócić do pieczonych klatek) — w art-briefie, nie tu.
- [x] Złoty trójkąt i dusze-manekiny: opisane w raporcie etapu 5 (czym są w kodzie — `Znaczniki.podswietlCel`
      strzałka celu i `Potepieni`/`Ludzik` tłum w tle) i zaproponowane — **nie wdrożone, czeka na zgodę.**
- [x] Nazwy głów (Pitbull, Wilk, Doberman): zostają (pytanie w raporcie — odpowiedź: nie ruszać bez prośby).

Gotowe, gdy: arkusze przed/po dla wszystkich sprite'ów z walki; w grze da się przełączać stary i nowy zestaw grafik; jest
brief dla grafika.

Sprawdzenie (ziarno 3, 720p): z `--oprawa wyl` każda klatka bit w bit identyczna z gałęzią sprzed etapu 5 (worktree
z commita `4bf4793`) poza tymi samymi dwoma miejscami pulsującymi zegarem komputera, co w poprzednich etapach.
Koszt (`--rycina wl` / `wyl`, ten sam fragment walki): 427 / 439 ms na klatkę — różnica w granicach szumu pomiaru
(inny plik tekstury, te same polecenia rysunku). Testy: zestaw istniejący (181/181) bez zmian — etap 5 nie dodaje
nowej logiki do testowania, tylko podmienia, co się wczytuje.

## Etap 6a — walka i obrażenia według wzorów użytkownika (20.11)

Wzory od użytkownika (opis: `trzewia-cs/docs/walka/wzory.md`): **L = min + (max − min)·(a − 1)**, a losowe z 1–2;
**O = L·100/(100 + p)**, odjęte od hp na końcu „czasu” ataku; do balansu d, f, S, SC. Kod:
`src/Trzewia.Symulacja/Symulacja/WalkaWzor.cs`, wpięcie w `Walka.cs`, `Straznicy.cs`, `Stworzenia7.cs` (bójka
ogólna); rysunek: `Rysunek/Duszki/DuszkiLudu.cs`, `Rysunek/Krag/Cerber.cs`, `Visual/Uderzenie.cs`.

Decyzje użytkownika:
1. **Zakres:** każda walka w Kręgu Trzecim (rycerz, Cerber, Cienie, grabarze, mnisi z księgą, bójka ogólna).
   Alpha 1 bez zmian (test `Alpha1BezZmian`).
2. **Liczby:** 100 wariantów z `tools/walka/balans.py` → `docs/walka/konsultacja.md` i `warianty.csv`;
   zatwierdzony **nr 3** („pancerne Cienie”, p 20): rycerz 45–67, 0,5 + 0,6 s; Cerber 9,5–14, 0,7 + 1 s;
   Cień 2–3,5, 0,3 + 0,7 s; grabarz 2,5–3,5, 0,25 + 0,25 s; mnich (księga) 2–3, 0,5 + 0,75 s. Pancerz: Cień 20,
   tarcza rycerza 25 (dzisiejsze rany × 0,8 to dokładnie p = 25), reszta 0. Życie (hp) bez zmian.
3. **Ruchy:** jedno trafienie na końcu „czasu”; kombinacje (ruchy z kilkoma trafieniami) wypadają z losowania.
   Każdy ruch rycerza i Cerbera jest równo przyspieszony/zwolniony tak, żeby trafienie z animacji wypadło dokładnie
   po „czasie”; długość ruchu najwyżej czas + przerwa; przerwa liczona od trafienia.
4. **Flaga:** `WalkaWzor.Wlaczony`, domyślnie włączona; testy zgodności z TS liczą starą walkę.
5. **Obrona:** blok = chwilowy pancerz na ten jeden cios (p' = (100 + p)/rany − 100 — ten sam ułamek rany co
   dotąd); parowanie i unik — pudło.

Modyfikatory, które już były (siła roli i zbroi, wzrost Cieni co falę, słabsze kły Cerbera po ściętej głowie,
modlitwa), skalują min i max względem siły, przy której liczby były liczone. Cień, grabarz, mnich i bójka ogólna
dostały „zamach”: cel w zasięgu i przerwa minęła → po „czasie” trafienie (zamach przerwany, gdy cel ucieknie).

- [x] Rdzeń wzorów, rytm ruchów, wpięcie we wszystkie walki Kręgu.
- [x] Rysunek: poza uderzenia rycerza i Cerbera w chwili trafienia (zrzuty: klatki 1335 i 1860 na ziarnie 3).
- [x] Testy: `WalkaWzorTesty` (wzory z kartki, nr 3, blok, rytm, pełne partie, Alpha 1 bez zmian).
- [x] Animacja zamachu dla grabarza i mnicha — zrobiona w etapie 6b (Cieni już nie ma).

Pomiar (20 ziaren, bot „rozsadny”, Krąg):

| | wygrane | przegrane | utknięte | walka z Cerberem: mediana (zakres) |
|---|---|---|---|---|
| stara walka | 12 | 5 | 3 | 53 s (39–72) |
| nowa walka | 12 | 5 | 3 | 54 s (50–73) |

Utknięte partie (ziarna 37, 100, 114) są takie same przy starej walce: rycerz nie ma drogi do Cerbera, a Cerber nie
odchodzi dalej niż 30 kratek od rdzenia — błąd mapy/ścieżek sprzed tego etapu, nie wzorów. Koszt symulacji
(ziarna 3, 5, 13): 22–30 µs na tik przy obu wersjach — różnica w szumie pomiaru.

## Etap 6b — Krąg bez Cieni, ruchy wieloetapowe, naprawy (20.11)

Prośba użytkownika: „Usuń innych przeciwników oprócz bossa (tych kamiennych), przywróć różnorodne animacje. Jeśli są
kilkuetapowe (np. podwójne machnięcie mieczem), to licz to jako jedno zwykłe obrażenie, napraw wszystkie błędy, w tym
punkt 2. Kontynuuj ze wszystkim innym.” Kod: `Symulacja/ZmianyKregu.cs` (główny wyłącznik zmian Kręgu po porcie;
wyłączony — Krąg liczy się bit w bit jak w TS, tak liczą testy zgodności).

- [x] **Bez Cieni Żarłoków** (kamienni Strażnicy): fale bez bossa przepadają, z Cerberem nie wychodzi nikt; pieczęć
      pęka bez przerw. Napisy (pasek, alarmy, atlas, samouczek) mówią tylko o Cerberze.
- [x] **Ruchy wieloetapowe wracają** (seria trzech cięć, młynek, dwie paszcze, łapa na piersi): jedno zwykłe obrażenie
      na ostatnim cięciu; rytm wzoru liczy się do niego.
- [x] **Naprawy błędów** (każdy znaleziony na partiach bota, z ziarnem):
  - krata lochu w walce z Cerberem wyrwana — rycerz nie zostaje za nią, mnisi w środku nie głodują (ziarno 12),
  - rycerz poza kreską drogi szuka drogi do jej najbliższego kafla, nie prze w ścianę komory (ziarno 56),
  - kurier z jedzeniem dla rycerza nie zawraca z krypty (ziarno 47),
  - mnich z księgą wstrzymuje zrastanie Cerbera; bot posyła mnichów, gdy walczących brak; głodny mnich najpierw je
    (ziarna 35, 109),
  - bez grabarzy zasypana droga osypuje się sama, a Cerber jej dalej nie zasypuje (ziarno 109),
  - zdarzenia „leczące do pełna” nie zbijają życia Cerberowi (500 → 83) ani rycerzowi (ziarno 35),
  - **Cerber był niewidoczny przy włączonej rycinie** (błąd z etapu 5: loader szukał .png, a pliki są WebP).
- [x] Przełączniki: `--walka stara|wzory`, `--krag-zmiany wl|wyl`.
- [x] Zamach grabarza (kilof w górę przez „czas”, cios w klatce trafienia) i mnicha (blask księgi narasta).

## Etap 6 — mechanika bossa (20.11)

Kod: `Symulacja/GlowyCerbera.cs` (liczby — sekcja „liczby”, do akceptacji), rysunek `Visual/ZapowiedzGlow.cs`,
`Visual/PasekBossa.cs` (wybór głowy, przyciski), `Rysunek/DlonDemona.cs` (dłoń trzyma), `Rysunek/Krag/Cerber.cs`.
Za ZmianyKregu.

- [x] Każda głowa ma swój atak z zapowiedzią: pitbull gryzie (czerwony łuk 0,5 s), wilk wyje (pierścień 0,8 s,
      ogłusza na 1,5 s każdego w promieniu 4 kafli), doberman zieje ogniem (linia 0,7 s). „Czas” broni głowy = czas
      zapowiedzi. Ścięta, śpiąca albo zwisająca głowa nie atakuje; pozostałe przyspieszają (przerwa −20% za każdą
      ściętą). Ataki głów mają w losowaniu podwójną wagę.
- [x] Karmienie jako decyzja gracza: przycisk „Nakarm głowę · 2 jedzenia” na pasku — najgroźniejsza głowa, która nie
      śpi (wilk, potem doberman, potem pitbull), żre i śpi 6 s. Dawny okup co 5 s wyłączony.
- [x] Dłoń jako cud: przycisk „Dłoń z otchłani · 40 wiary” — wyrasta pod Cerberem i trzyma go 5 s (nie chodzi, nie
      gryzie, nie zrasta się). Dłoń sama już Cerberowi nie pomaga (rzut, tarcza, zawał wyłączone). (Plan mówił „z
      księgi”; przycisk stoi przy pasku Cerbera, bo tam gracz patrzy w walce.)
- [x] Gracz wskazuje głowę: klik w jej pasek. Każda głowa ma własne życie; rany idą w pasek wskazanej, ją rycerz
      zetnie. Bez wskazania — kolejność jak dotąd (pitbull, wilk, doberman).

Pomiar (bot „rozsadny”, Krąg, ziarna 1–120; „przed” — Krąg jak w TS, `--krag-zmiany wyl`, ziarna 1–20):

| | wygrane | przegrane | bez końca | walka z Cerberem: mediana (90% krótszych niż) |
|---|---|---|---|---|
| przed (ziarna 1–20) | 16 | 3 | 1 | 53 s |
| po etapach 6b i 6 (ziarna 1–120) | 118 | 2 | 0 | 55 s (89 s) |

Przegrane po zmianach (ziarna 35 i 109): rycerz ginie przed walką, grabarze w walce, zostają sami mnisi z księgami —
uczciwa przegrana, partia się kończy. Na partię bot karmi średnio 2,7 razy i wzywa dłoń 1,1 razy; ataki głów są
rzadkie (gryzienie 0,5, ogień 0,55, wycie 0,3 na walkę), bo Cerber większość walki chwieje się pod ciosami rycerza
(dawny próg zachwiania z TS). Testy: 204/204.

## Wzór raportu po każdym etapie

- Co zrobione (krótko, w punktach).
- Pliki i klasy.
- Jak sprawdzić: flagi, klawisze, miejsce w grze.
- Przed/po: zrzuty (jeśli są) i pomiar jasności z narzędzia.
- Wydajność: fps, liczba cząsteczek, czas klatki.
- Ryzyka oraz rzeczy niezrobione, z powodem.
- Pytania.

## Odpowiedniki w Canvas 2D (gra C# rysuje przez `IPlotno`, czyli Canvas 2D; to samo w `alpha-1/`)

- `SKBlendMode.Multiply / Screen / Plus / SrcATop` → `globalCompositeOperation = 'multiply' / 'screen' / 'lighter' / 'source-atop'`
- `SKShader.CreateRadialGradient` → `createRadialGradient`
- osobna `SKSurface` → `Plotno.Nowe(w, h)` (w TS: `OffscreenCanvas`)
- filtr koloru → `ctx.filter` albo rysowanie z `source-atop`
