# Plan: oprawa walki z Cerberem („Trzewia”)

Plan od użytkownika (16.11), zapisany na gałęzi pracy i odhaczany etapami. Raport po każdym etapie, dalej dopiero po „dalej”.

## Stan

- [x] Etap 0 — rozpoznanie i narzędzia
- [x] Etap 1 — światło i kontrast (system ogólny, na walce z demonem); błyski do dostrojenia później (decyzja 16.11)
- [x] Etap P — przeniesienie kręgu trzeciego (Cerber) z `krag-3-beta/` do C# (czeka na „dalej”)
- [x] Etap 2 — czytelność (na Kręgu Trzecim; czeka na „dalej”)
- [ ] Etap 3 — „uderzenie”
- [ ] Etap 4 — cutscenki
- [ ] Etap 5 — jeden styl („rycina”)
- [ ] Etap 6 — mechanika bossa (opcjonalnie, dopiero po „tak” użytkownika i po skończonym porcie)

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

- [ ] Zatrzymanie trafień (symulacja stoi, rysunek działa): zwykłe ciosy 0; mocny cios 60 ms; ścięcie głowy 140 ms;
      ostatni cios 200 ms. Czas symulacji oddzielony od rzeczywistego (UI, kamera, cząsteczki na rzeczywistym).
- [ ] Błysk trafienia: boss biały na 60–80 ms (`source-atop`, krycie do zera).
- [ ] Wstrząs kamery „trauma”: 0–1, siła = trauma², przesunięcie najwyżej 10 px przy 1080p, obrót najwyżej 1,5°, gładki
      szum, zanik ok. 1,5/s; trauma: mocny cios 0,2, przewrócenie 0,25, lądowanie bossa 0,35, ścięcie głowy 0,5,
      pęknięcie pieczęci 0,8, śmierć bossa 0,9; całość × suwak z ustawień (0–100%).
- [ ] Cząsteczki z puli (bez alokacji, najwyżej ok. 500): iskry (addytywnie), krople krwi (spadają, plamy), pył
      (przewrócenie, lądowanie), popiół.
- [ ] Ścięta głowa leci: w bok 120–220 px/s, w górę 350 px/s, grawitacja 900 px/s², obrót 6–10 rad/s; jedno odbicie
      (0,3), potem leży; smuga krwi, plama rośnie 0 → pełna w 400 ms.
- [ ] Przewracanie: obrót do 90° w 140 ms (ease-out), odbicie 4 px, pył; wstawanie 220 ms; zamiast gwiazdek 2–3 kreski
      krążące nad głową.
- [ ] Zapowiedź ataku (tylko wizualna): jeśli atak ma osobny start i trafienie — odchylenie do tyłu, w trafieniu wyrzut
      do przodu z rozciągnięciem; jeśli nie — w raporcie, że zapowiedź wymaga zmiany logiki.
- [ ] „Oddech” bossa w spoczynku: skala w pionie ±1,5%, ok. 0,5 Hz.
- [ ] Zasoby: zmiana ze źródłem w świecie — ikonka po łuku (Bézier, 0,7 s) do licznika; licznik pulsuje
      (1,0 → 1,2 → 1,0 w 200 ms) i pokazuje „+N” / „−N”; wydatki lecą z księgi do celu.
- [ ] Gdy cel znika, postacie wracają do spoczynku w najwyżej 0,3 s (jeśli to błąd AI — naprawić jako błąd, opisać).

Gotowe, gdy: każde trafienie i ścięcie czuć bez dźwięku; F9 przełącza przed/po; przy maksimum cząsteczek 60 fps.

## Etap 4 — cutscenki

- [ ] `CutsceneDirector`: kolejka kroków z czasem i krzywą (`Wait`, `CameraTo`, `Letterbox`, `HideHud/ShowHud`,
      `Shake`, `Flash`, `Light`, `PlayAnim`, `Caption`, `NameCard`, `TimeScale`); symulacja stoi, reżyser na czasie
      rzeczywistym; pomijanie spacją / Esc / kliknięciem do stanu końcowego zgodnego z logiką; po pierwszym obejrzeniu
      wersja skrócona.
- [ ] Wejście bossa (ok. 5 s): pasy kinowe 10% (0,4 s), HUD chowa się, kamera na piec 1,4× (0,8 s); drżenie (trauma do
      0,3), pieczęć pęka w 3 krokach po 0,3 s, iskry; błysk biały → czerwony (120 ms), trauma 0,8, gruz, 0,4 s ciszy;
      wyjście z pieca (łapa, głowy, ryk, czerwona fala światła); karta z imieniem 1,5 s; powrót kamery, pasy znikają,
      HUD wraca, walka i dymek samouczka.
- [ ] „Pieczęć pęka.” jako podpis w dolnym pasie kinowym, nigdy na akcji.
- [ ] Bez zmiany logiki wejścia: jeśli logika każe czekać w piecu — półmrok (dym, oczy); usunąć spadanie przez podłogę
      (punkt pojawienia w piecu, jeśli to nie zmienia mechaniki, albo pozycja rysowania oddzielona od logicznej);
      w razie wątpliwości pytać.
- [ ] Teleport z pieca na łuk → skok: przysiad 150 ms (0,92 w pionie), lot po łuku 0,5–0,6 s, lądowanie ze
      spłaszczeniem, pyłem i traumą 0,35.
- [ ] Dłoń (cud za wiarę albo skrypt — patrz raport etapu 0): wyłania się ze światłem od dołu, spłaszcza się przy
      kontakcie, pierścień i łańcuchy światła, boss szarpie się co 0,5–0,8 s, na koniec rozpada się w iskry; przy cudzie
      także lecąca wiara i wskaźnik czasu.
- [ ] Śmierć bossa: hit-stop 200 ms, potem 0,3× przez 0,8 s i powrót w 0,3 s; przechył 200 ms, lądowanie, trauma 0,9,
      reszta przygasa do ok. 50%; trup nie znika od razu (obiekt tylko-wizualny rozsypuje się w popiół 1,2 s, krew leci
      do księgi); kamera do pieca: zapada się gruz, otwiera się ciemne przejście z poświatą (proceduralnie, jeśli brak
      grafiki — pozycja na liście „potrzebna grafika”); dopiero potem „Droga w dół stoi otworem.” w pasie kinowym,
      powrót kamery, postacie w spoczynku.

Gotowe, gdy: od pęknięcia pieczęci do śmierci bossa nic nie teleportuje się ani nie znika w jednej klatce; obie sceny da
się pominąć; stan gry po pominięciu jest taki sam jak po obejrzeniu.

## Etap 5 — jeden styl („rycina”)

Kierunek: ryciny Gustave'a Doré do „Piekła” (domena publiczna). Kolory: czerń, pergamin, czerwień krwi, ogień.
Kreskowanie zamiast miękkich cieni. Wzorem jest księga.

- [ ] `Palette.cs` z jedną paletą (start: tusz `#0F0B0A`, cień `#1E1613`, kamień `#3A2C26`, pergamin `#E9DDC2`, kość
      `#CFC2A6`, krew `#8C1C13`, jasna krew `#B8321F`, ogień `#E07A2C`, żar `#F2B35A`, złoto `#C9A25B`).
- [ ] Narzędzie offline `tools/ink-pipeline/` (Python + Pillow): wersje „rycina” do nowego folderu (oryginały nietknięte);
      odbarwienie → 4–6 tonów z palety → kreskowanie w ciemnych tonach (ukośne, w najciemniejszych krzyżowe) → ciemny
      kontur 2 px zamiast białej obwódki; arkusz przed/po dla każdego sprite'a; zestaw grafik przełączany flagą.
- [ ] Ludzie: ciemny kontur i jasna krawędź od światła z etapu 1 zamiast białej obwódki.
- [ ] Boss: jeśli jest źródło 3D — render płaski, bez połysku, przez narzędzie; jeśli nie — klatki animacji przez
      narzędzie i ocena w raporcie.
- [ ] Kikuty i rany: kolory z palety, rany jako kreskowane nacięcia.
- [ ] `docs/art-brief-cerber.md`: zlecenie dla grafika (Cerber, dłoń w 3 klatkach, otwarte przejście w dół; styl,
      rozmiary, klatki, kierunek światła).
- [ ] Złoty trójkąt na korytarzu i dusze-manekiny: opisać, czym są w kodzie, zaproponować wersję w stylu świata — bez
      zmian bez zgody.
- [ ] Nazwy głów (Pitbull, Wilk, Doberman): zostają; pytanie w raporcie.

Gotowe, gdy: arkusze przed/po dla wszystkich sprite'ów z walki; w grze da się przełączać stary i nowy zestaw grafik; jest
brief dla grafika.

## Etap 6 — mechanika bossa (opcjonalnie: dopiero po „tak” i po skończonym porcie)

Wszystko za flagą, liczby balansu w konfiguracji do akceptacji.
- [ ] Każda głowa ma swój atak z zapowiedzią: gryzienie (czerwony łuk 0,5 s wcześniej), plucie ogniem (linia 0,7 s),
      wycie (pierścień 0,8 s, ogłusza). Ścięta głowa nie atakuje, pozostałe przyspieszają.
- [ ] Karmienie jako decyzja gracza: „garść w paszczę” usypia jedną głowę na kilka sekund; koszt w jedzeniu widoczny.
- [ ] Dłoń jako cud z księgi: widoczny koszt, trzyma bossa przez określony czas.
- [ ] Gracz wskazuje, którą głowę atakować.

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
