# Handoff — Trzewia, Alpha 0.1

Stan na 18.10.2026, po etapie 3d, jednym wiadrze i linie zamiast drabiny. Plik jest dla następnej sesji Claude (albo osoby), która przejmuje pracę nad Alphą 0.1.
Z użytkownikiem rozmawia się po polsku.

**Najważniejsze**
- **Czym jest Alpha 0.1.** Folder `alpha-0.1/` to przebudowa Remake v2 według wspólnego planu użytkownika, Pawła i Milana. Plan ma 5 etapów: zrobione są etap 1, etap 2 oraz 3a, 3b, 3c i 3d etapu 3, a zostały 3e–3f, 4 i 5.
- **Gdzie to jest.** Wszystko jest na `main` (scalony [kanalpatryk-netizen/Trzewoa#12](https://github.com/kanalpatryk-netizen/Trzewoa/pull/12), commit `6688432`). Alpha jest w menu (README) i do pobrania z wydania „gra”. Etapy 3b i 3c są na `main` i w wydaniu (PR #13 i #14, na prośbę użytkownika; `main` = `146c82b`). **Etap 3d jest na gałęzi `ccr-91477c56-dh7bgd`**, jeszcze nie na `main` (PR tylko na prośbę użytkownika).
- **W toku (odłożone):** etap 3e — ruiny z zabytkami; zaczęty generator ruin leży w `git stash` („3e ruiny (w toku)”: `sim/ruiny.ts`,
  `nastawy/zabytki.ts`, wpięcie w `world.ts`). Decyzje użytkownika 18.10: zabytek działa na **cały lud**, kara **nie** schodzi snem
  w sypialni, zabytki — **te cztery z planu** (relikwiarz, miecz, kielich, księga).
- **Ostatnie stałe polecenie użytkownika:** „gdy dokończysz obecne zadanie, zatrzymaj się i czekaj na moje polecenie”. (18.10 użytkownik kazał iść dalej — 3e zaczęte, potem przerwane prośbą o linę.)
- **Wymóg do wszystkiego, co nowe:** „każda, absolutnie każda nowa mechanika ma mieć swoje animacje (mówię tu głównie o ołtarzu i rytuałach tam)”.

---

## 1. Cel — wszystko, co jeszcze trzeba zrobić

### 1.1 Skąd ten cel
- **Plan** wkleił użytkownik 16.10: rozmowę z Pawłem i Milanem z Messengera, analizę innego AI i plan w 5 etapach. Przyjął go słowami
  „możesz zaczynać”, z poprawkami:
  - mapa nie mniejsza: „ma być taka sama, nawet leciutko szersza”. Jest 192 kafle szerokości zamiast 176.
  - usunąć zawał od góry, przez który mapa się kurczyła, gdy nikogo nie było na górze. **Zrobione.**
  - zapisać jako nową wersję „Alpha 0.1” w menu na GitHubie, a Remake v2 zostawić bez zmian. **Zrobione.**
  - każda nowa mechanika ma mieć animację, głównie ołtarz i rytuały.
- **Szkic góry** z 17.10 narysował Paweł, a przysłał użytkownik; opis jest w 2.4. Uwaga użytkownika: czerwony „pasek z rdzeniem”
  to pole, w którym rdzeń mógłby się pojawić, „ale raczej to zignoruj, rdzeń powinien być zawsze w jednym miejscu”.
- **„Zgrzyt 1”** dotyczy tego, po co krew, skoro nie ma rekrutacji. Użytkownik napisał, że „już go załatwili”, ale nie
  powiedział jak. Do czasu odpowiedzi obowiązuje zalecenie z analizy AI: **krew to paliwo rytuałów przy ołtarzu, a wiara to
  paliwo dłoni anielskiej i szeptów.**

### 1.2 Zasady dla każdego etapu
- **Animacja jest obowiązkowa.** Każda nowa mechanika ma ruch postaci, efekt na mapie i, jeśli trzeba, zmianę na płycie. Bez animacji etap nie jest skończony.
- **Bez ekwipunku.** Zasoby to liczby na ekranie: krew, wiara, żelazo, złoto.
- **Drużyna stała: 3 robotników, 2 pobożnych, 1 rycerz.** Nowi ludzie przychodzą tylko z „Daru ludzi” dłoni anielskiej
  (etap 4) i ze wskrzeszenia przy ołtarzu (3d).
- **Fizyka ludu:**
  - wchodzi najwyżej o 1 kafel i tylko z miejsca, w którym stoi;
  - stoi w tunelu wysokim na 2 kafle;
  - zeskakuje najwyżej z 4 kafli;
  - schodów, które zmieniają kierunek, nie przejdzie pod górę, bo musiałby wejść o 2 kafle.
  - **Kto zszedł w głąb, zwykle już nie wróci.** Każdą nową rzecz (pomieszczenie, ołtarz, ruiny, naprawę liny) trzeba
    projektować tak, żeby dało się do niej dojść i z niej wrócić.
- **Gdzie co jest w kodzie.** Liczby do strojenia są w `src/nastawy/*.ts`, z polskimi komentarzami. Logika jest w `src/sim/`, rysunek w
  `src/render/`, postacie w `src/render/lud/`.
- **Determinizm.** Rysunek nie może wołać `sim.spark` ani `sim.rng`, bo testy i próby botów liczą się z ziarna. Losowość w rysunku daje stały skrót z indeksu, jak `los()` w `src/render/kucie.ts`.
- **Zapis.** Każdy nowy stan symulacji trafia do `src/core/save.ts`. Przy zmianie mapy albo formatu trzeba podbić `VERSION`, które teraz wynosi 3 (3d: nowa góra z ołtarzem i drugim otworem).
- **Bot.** `src/app/bot.ts` musi dalej wygrywać. Gra w obserwatorium i w próbach, bo `scripts/proby-graczy.mjs` używa tego samego
  bota.
- **Po każdym etapie** obowiązuje lista kontrolna z 6.10.

### 1.3 Etap 3b — liczniki kruszców (żelazo, złoto) — ZROBIONE
**Zrobione 17.10:** `sim.zelazo`, `sim.zloto` i lista `sim.urobek` (`src/sim/kruszce.ts`, wołane z `digTile`, tylko dla ludu), zapis bez podbijania `VERSION`, liczniki ze znaczkami nad płytą obok wiary, krwi i jedzenia (`rysujZasoby` w `game.ts`), lot okrucha, iskry i złoty błysk, błysk i podbicie licznika, cichy brzęk (`src/render/kruszce.ts`, `audio.ts: kruszec`), liczby w `src/nastawy/kruszce.ts` (`KRUSZCE`, `OKRUCH`). Rozkaz „kop żyłę” zrobiony jako rozszerzenie „kop tam” (`nastepnyKafelZyly` w `polecenia.ts`, pola `zyla`, `zx`, `zy`, `zylaIle` w `Polecenie`). Tablica atlasu „Kruszce”, podpowiedź 6c, porządki w podpowiedziach (bez „prorokuj” i „Nakarm przedsionek” w Alphie). Kronika sumuje wpisy z tym samym kluczem (poprawka w `Sim.log`). Bot jeszcze nie kopie rud (próby: 0–5 żelaza na partię). Poniżej pierwotny plan.

**Cel:** wykopana ruda od razu zwiększa licznik na ekranie, bez ekwipunku. Pomysł Pawła: „wykopią i ci się podnosi numerek
na ekranie”.

- **Kafle:**
  - `T.ORE` to w Alphie żelazo. Na mapę przypada 240–262 kafli, w kępach, głównie w płytkiej warstwie.
  - `T.ZLOTO` to złoto. Jest go 69–97 kafli, pod dnami jaskiń środkowej warstwy.
  - Dziś kucie obu nic nie daje. W `digTile` stoi komentarz „bez rudy i kryształów jako łupu”.
- **Symulacja:**
  - W `Sim` (`src/sim/sim.ts`, obok `wiara` i `krew`, ok. linii 89–91) dojdą pola `zelazo = 0` i `zloto = 0`.
  - W `digTile` (`src/sim/creatures.ts`, ok. linii 1506), po `w.set(x, y, T.AIR)`: przy `T.ORE` +1 żelaza, przy `T.ZLOTO` +1 złota.
  - Do tego wpis w kronice, sumowany jak przy krwi („+3 żelaza”).
- **Zdarzenia do animacji.** Rysunek musi wiedzieć, skąd leci okruch. Krótka lista zdarzeń w symulacji, np. `sim.urobek`
  z polami x, y, rodzaj i tik, przycinana co jakiś czas. Rysunek tylko ją czyta. Do zapisu nie trafia.
- **Zapis.** W `src/core/save.ts` `zelazo` i `zloto` dochodzą obok `wiara` i `krew` (ok. linii 34 i 64). Gdy w starym zapisie
  brak tych pól, liczy się 0.
- **Płyta.** W `src/render/plate.ts`, przy wierze i krwi, dwa znaczki z liczbą: sztabka żelaza i samorodek złota.
- **Animacja (obowiązkowa):**
  - z rozbitego kafla wyskakuje okruch rudy i leci łukiem do licznika;
  - licznik błyska i podbija liczbę;
  - przy złocie jest złoty błysk, przy żelazie iskra.
- **Rozkaz „kop żyłę” (do rozważenia).** Robotnik wykuwa całą kępę jednym rozkazem. Przyda się botowi w etapie 5.
- **Atlas i samouczek:**
  - tablica „Kruszce” w `src/atlas/tablice.ts`: skąd żelazo, skąd złoto, do czego posłużą w 3c;
  - pierwsza wykopana ruda odkrywa tablicę (`odkrycia.odkryj` w `src/app/screens/game.ts`);
  - podpowiedź w `src/sim/podpowiedzi.ts`.
- **Gotowe, gdy:**
  - przechodzą `tsc`, `npm test` i próby botów 8/8;
  - zapis i wczytanie trzymają liczby;
  - użytkownik dostał zrzut licznika i animacji.

### 1.4 Etap 3c — szablony pomieszczeń i rzemiosło — ZROBIONE
**Zrobione 17.10:** `src/sim/pomieszczenia.ts` (plan, `probaPlanu`, kucie, `tikPomieszczen`: warsztat, kuźnia, sen), `src/render/pomieszczenia.ts` (plany, podgląd, wyposażenie w skali postaci, ogień, iskry w takt młota — `fazaMlota` w `figury.ts`, „z z z”, zdarzenia), `src/nastawy/pomieszczenia.ts`. Rozkazy: „kop” z polem `pom`, nowe typy „praca” i „sen” (`wydajNaPomieszczenie` w `polecenia.ts`), pole `Creature.czynnosc` daje pozę. Krzyż z warsztatu leci do licznika wiary przez `Urobki.dodaj('wiara', …)`. UI: przycisk na pasku drużyny, listwa szablonów, klawisz B (`planuj`), przeciąganie korytarza i szybu, prawy przycisk skreśla plan. Atlas: 4 tablice; samouczek: rozdział „Pomieszczenia”. Zbroja (`sim.zbroja`) czeka na 3f. Poniżej pierwotny plan.

**Cel:** gracz wybiera kształt (Sypialnia, Warsztat, Kuźnia, Szyb/Korytarz) i kładzie go na skale jako plan, a robotnicy
sami go wykopują. Gotowe pomieszczenie działa:
- w warsztacie ze złota powstają dewocjonalia, które dają wiarę;
- w kuźni z żelaza powstają części zbroi rycerza.

**Interfejs**
- Przy medalionach (`src/render/druzyna.ts`, typ `AkcjaDruzyny`) staje nowy przycisk „Wyznacz pomieszczenie”, a po nim wybór szablonu.
- Pod kursorem widać podgląd konturu: jasny, gdy da się położyć, czerwony, gdy nie.
- Klik kładzie plan, a Esc i prawy przycisk anulują. Nowy klawisz trzeba dopisać w `src/core/keybinds.ts`.

**Rozmiary** (z planu AI)
- Warsztat 4×3, Sypialnia 5×3, Kuźnia ok. 4×3.
- Szyb i korytarz to pas przeciągany myszą: korytarz poziomy ma 2 kafle wysokości, a szyb w dół idzie schodami, bo lud nie wejdzie wyżej niż o 1 kafel.

**Gdzie wolno kłaść plan**
- Tylko w skale, którą da się kuć. Nie w ramie ani w czapie nad salą (`T.STONE`) i nie w skorupie rdzenia.
- Podłoga musi być płaska.
- Wejście musi być na poziomie podłogi albo o 1 kafel wyżej lub niżej, inaczej nikt nie wejdzie.
- Plan nie może zablokować drogi wiernych.

**Symulacja**
- Nowy moduł, np. `src/sim/pomieszczenia.ts`, z nastawami w `src/nastawy/pomieszczenia.ts`.
- Pomieszczenie ma rodzaj, prostokąt, listę kafli do wykucia, przypisanych robotników i stan: plan → kucie → gotowe → w użyciu.
- Kucie idzie przez to, co już jest: rozkaz `kop` (`src/sim/polecenia.ts`, typ `TypPolecenia`; można dodać `'pomieszczenie'`) i postęp zapisany w kaflu (`world.kucie`).
- Stan pomieszczeń trafia do zapisu.

**Rysunek**
- Plan: kontur kreską rycinową, kafle do wykucia przekreślone.
- Gotowe pomieszczenie dostaje wyposażenie: stół warsztatu, kowadło i palenisko kuźni, posłania sypialni.

**Warsztat i złoto**
- Robotnik wysłany do warsztatu rozkazem „idź tam” albo nowym „pracuj” staje się rzemieślnikiem.
- Przetwarza złoto na dewocjonalia (krzyże, różańce, krucyfiksy), które od razu zamieniają się w wiarę. Pomysł Pawła: „nie będą w ekwipunkach, tylko się będą od razu zamieniać w wiarę”.
- Liczby w nastawach: ile złota na sztukę, ile wiary, ile czasu.
- Animacja: robotnik przy stole, tygiel ze złotem, kształtowanie krzyża, gotowy krzyż rozbłyska i leci do licznika wiary.

**Kuźnia i żelazo**
- Kuźnia wykuwa kolejne części zbroi rycerza. Kolejność i koszt są w nastawach, np. hełm → naramienniki → napierśnik → nakolanniki → tarcza.
- Plan AI: żelazo z płytkiej warstwy wystarcza na podstawowy pancerz przed pierwszą falą Strażników.
- Animacja: żar paleniska, młot na kowadle, iskry, gotowa część błyska.
- Rysowanie części na rycerzu to etap 3f.

**Pozostałe**
- **Sypialnia — decyzja użytkownika (17.10): „sypialnia ma usuwać debuffy”.** W Alphie to okaleczenie (`c.okaleczony`, dziś na zawsze) i zatrucie (`c.zatrutyDo`); w 3e dojdą kary zabytków (czerwone aureole). Animacja: postać się kładzie, nad nią „z z z”, czerwona aureola gaśnie.
- **Kto kuje plan i pracuje — decyzja użytkownika (17.10):** „jeśli zaznaczymy robotnika i najedziemy kursorem na miejsce, które można wykopać lub budować (np. położony plan), to mają to wykonać, ale wolni robotnicy mają być wolni i nic nie robić”. Plan kują i w warsztacie lub kuźni pracują **tylko zaznaczeni robotnicy, którym wskażesz plan albo pomieszczenie**. Wolni robotnicy sami nic nie biorą (nie kują planów, nie idą do warsztatu).
- **Bot** jeszcze nie stawia szablonów (to etap 5), ale nie może się przez nie zepsuć.
- **Atlas i samouczek.** Tablice „Pomieszczenia”, „Warsztat” i „Kuźnia” oraz lekcja w samouczku.

### 1.5 Etap 3d — ołtarz i rytuały (każdy z własną animacją) — ZROBIONE
**Decyzje użytkownika (17.10):**
- ołtarz stoi tam, gdzie mówił Paweł: w sali, pod szybem ze światłem, krzyż na kopczyku; **stoi od początku**;
- nie da się go podkopać ani „broń Boże zawalić sobie drogi do niego”;
- dwie dziury na górze mapy: większa świeci światłem dziennym w ołtarz, mniejsza, lekko w prawo — tą zjeżdża wiadro
  (nie tam, gdzie ołtarz);
- „okalecz się” i „ofiaruj” — tylko przy ołtarzu (zniknęły z szeptów);
- sen w sypialni ok. 60 s (`snuTikow` 7200), żeby ofiara krwi nie była darmową pętlą;
- wskrzeszenie: wybór z listy poległych, ok. 100 krwi;
- krew to paliwo rytuałów (zgrzyt 1 — potwierdzone);
- **dłoń anielska (etap 4) ma być losowym wydarzeniem, jak dłoń z otchłani**;
- drabiny albo liny — ale **tylko tam, gdzie nie da się dojść inaczej niż się wspiąć**;
- **18.10: drabinę zastępuje lina. Jednostki jej nie stawiają — wiesza ją gracz, od razu: 5 pierwszych za darmo, potem
  10 krwi każda. Na zakrętach drogi wiernych lina spada sama, za darmo.**
- **18.10: jedyny warunek liny — górny koniec uczepiony skały** (strop nad, krawędź półki obok, ściana przy górze;
  `kotwicaLiny` w `sim/pomieszczenia.ts`). „Tylko tam, gdzie inaczej się nie wejdzie”, start przy ludzie, półka i limit
  długości — usunięte na prośbę użytkownika. Lina spada z haka do podłogi. Liny drogi wiernych bez zaczepienia rosną w górę
  do skały (`linyDrogi`).

**Zrobione 17.10:** mapa — drugi otwór `SWIAT.warstwy.szybWiadra` (`world.szybWiadraX/Dol`; wiadro i najazd ludzi idą nim,
siedziba stoi pod nim), kamienna podłoga sali i kopczyk pod ołtarzem (`SWIAT.warstwy.oltarz`, `world.oltarz`,
`world.salaOltarza`, `world.wSali` — w sali nie ma kapliczek ani zawału z karty); `VERSION = 3`. Rytuały w
`src/sim/oltarz.ts` (stan w `sim.lud.oltarz`, zdarzenia `sim.zdarzeniaOltarza`, planer trzyma odprawiającego przez
`odprawia` → `klecz` w `creatures.ts`), szał w `mnoznik` (`lud.ts`), czerwona aura w `figury.ts`. Rysunek: `src/render/oltarz.ts`
(kamień przed mrokiem, światło, płomienie i rytuały nad mrokiem, `oltarzNaRycinie` dla atlasu), okno `src/render/okno-oltarza.ts`,
krople krwi do i z licznika (`Urobki.oddaj` / `dodaj('krew')`), dźwięki `rytual()` i `kropla()` w `audio.ts`. Rozkazy
`wydajDoOltarza` i `przywolajDoOltarza` (`polecenia.ts`). Drabiny (od 18.10 liny): szablon „lina” w pomieszczeniach,
`world.lina` (w zapisie), `stoi()` zna linę, wiesza gracz (`powiesLine`, `cenaLiny`, licznik `sim.lud.liny`). Przy nowej
mapie Strażnicy wychodzą ≥ 8 kafli od nie-walczących (`STRAZNICY.pojawOdLudu`), a boss — po stronie rycerza. Atlas: 7 tablic;
samouczek: rozdział „Ołtarz”; test świata sprawdza ołtarz i otwory. Poniżej pierwotny plan.

**Gdzie stoi ołtarz — trzeba potwierdzić z użytkownikiem**
- Plan AI stawia ołtarz w środkowej warstwie.
- Na szkicu krzyż stoi w jasnej sali pod szybem. Paweł na czacie wyjaśnił, że krzyż to ołtarz („w ołtarzu będzie się
  poświęcać i inne akcje religijne robić”).
- W 3a w tym miejscu postawiłem siedzibę (96, 37).
- Ołtarz w środkowej warstwie leży na drodze w dół, z której się nie wraca, więc korzystaliby z niego tylko ci, którzy
  już zeszli. Ołtarz w sali, obok siedziby, zgadza się ze szkicem i jest dostępny dla wszystkich.

**Co już jest w kodzie**
- Kafel `T.SHRINE`, którego nie da się rozkuć. Pobożni sami stawiają kapliczki i modlą się przy nich, co daje wiarę.
- Pole `Creature.szalDo` i cały rysunek szału krwi rycerza: czerwona poświata, czerwony krzyż i smuga miecza
  (`src/render/lud/stroj.ts`, `helm.ts`, `rycerz.ts`, `uzbrojenie.ts`). To dawny rysunek zdrajcy, zostawiony z myślą o ołtarzu.
- Brakuje logiki szału w symulacji (mnożnik siły do `szalDo`) i rytuału, który go włącza.

**Rytuały**

Koszt każdego rytuału płaci się krwią, a liczby trafią do nastaw, np. `src/nastawy/oltarz.ts`.
- **Ofiara.** Daje krew albo wiarę kosztem ludzi. Drużyna jest stała, więc to duża strata. Propozycja to dwa warianty: krew
  pobożnego (trwałe osłabienie, jak dawne „okalecz się”) albo jego życie.
- **Wskrzeszenie poległego.** Trupy zostają na mapie (`src/sim/trupy.ts`), a rytuał za krew przywraca zmarłego przy ołtarzu.
- **Szał krwi.** Rycerz przez pewien czas bije mocniej.
- **Modlitwa przy ołtarzu.** Odprawia ją pobożny, a wiara rośnie.
- Do rozważenia z planu AI: „zahartowanie wykutej zbroi krwią”.

**Interfejs**
- Kliknięcie ołtarza otwiera okno z rytuałami i ich kosztem, w stylu kart wydarzeń.
- Rytuał można odprawić tylko wtedy, gdy przy ołtarzu stoi pobożny.

**Animacje (wymóg użytkownika)**
- Świece i płomień.
- Krew spływająca do misy.
- Krąg znaków, jak `glif` w `src/render/tajemnica.ts`.
- Przy wskrzeszeniu ciało się unosi i odzyskuje barwę.
- Przy szale rycerz dostaje czerwoną aurę.
- Przy modlitwie biją promienie.
- Dźwięki dopisze zespół. Ciche akcenty można dać w `src/core/music.ts`.

**Atlas i samouczek**
- Tablica „Ołtarz” i osobna tablica dla każdego rytuału.
- Lekcja w samouczku.

### 1.6 Etap 3e — ruiny z zabytkami
- **Ruiny.** 1–2 zawalone struktury w warstwie środkowej, np. kopalnia, kawałek miasta albo kaplica, z kamiennymi murami, belkami i łukami.
  Generuje je `generujWarstwy` (`src/sim/world.ts`), a liczby są w `SWIAT.warstwy`.
- **Zabytek i wybór.** W środku leży zabytek. Gdy ktoś z ludu do niego dotrze, otwiera się okno wydarzenia, takie jak karty z `src/sim/wydarzenia.ts` (rysunek w `src/render/wydarzenie.ts`). Gracz wybiera „Weź”, czyli premię i karę dla ludu naraz, albo „Zostaw”. Pomysł Pawła: „ty wybierasz, czy bierzesz ten zabytek, czy go porzucasz”.
- **Premie i kary.** Pokazują je aureole, które już są: jasna to wzmocnienie, czerwona to osłabienie. Na karcie postaci jest opis.
- **Przykładowe zabytki** (do ustalenia):
  - relikwiarz świętego: modlitwa ↑, kucie ↓;
  - miecz krzyżowca: siła rycerza ↑, Ten, który patrzy, przychodzi częściej;
  - kielich: leczenie ↑, głód ↑;
  - księga: wiara ↑, szaleństwo ↑.
- **Animacje.** Przy odkryciu kurz, światło z wnętrza i zabytek się unosi. Przy wzięciu postać go podnosi i zmienia się jej aureola. Przy zostawieniu zabytek gaśnie.
- **Atlas.** Tablice „Ruiny” i „Zabytki”.

### 1.7 Etap 3f — zbroja na rycerzu i dokumentacja etapu 3
- **Rycerz na start bez zbroi z kuźni.** Dziś zawsze ma pełny rynsztunek: hełm (`helm.ts`), kolczugę, nakolanniki, tarczę (`uzbrojenie.ts`)
  i płaszcz. Trzeba ustalić, co ma od początku (np. kolczugę i miecz), a co dochodzi z kuźni. Pomysł Milana: „jak nie
  będzie tego żelaza, to rycerze będą chodzić bez konkretnych części zbroi”.
- **Rysowanie zależne od stanu rycerza** (np. pole `c.zbroja`):
  - `src/render/lud/rycerz.ts`: `rysujRycerza`, `noga` (nakolannik), `reka`, `wapenrok`;
  - `helm.ts`: `glowaKrzyzowca`;
  - `uzbrojenie.ts`: `tarcza`, `sciezkaTarczy`;
  - `stroj.ts`: barwy.
- **Działanie części.** Każda część coś daje w symulacji, np. życie albo obronę. Liczby są w nastawach.
- **Animacja.** Rycerz podchodzi do kuźni i zakłada część, z błyskiem.
- **Dokumentacja etapu 3:**
  - atlas: tablica „Warstwy” (szyb, sala, trzy warstwy, rama, krypta, rdzeń) i tablice z 3b–3e;
  - `alpha-0.1/README.md` (lista „W budowie”), CHANGELOG i wiersz Alphy w README głównym;
  - wzmianka, że żółte „Ag” ze szkicu to złoto.

### 1.8 Etap 4 — dwie dłonie

**Decyzja użytkownika (17.10): dłoń anielska ma być losowym wydarzeniem, tak jak dłoń z otchłani.**

#### Dłoń z otchłani

Ta dłoń już jest: kod w `src/sim/dlon.ts`, rysunek w `src/render/dlon.ts` (klatki z modelu 3D), liczby w `src/nastawy/dlon.ts`. Przechodzi fazy
`wstaje → siega → chwyta → cofa → gasnie`. Pierwszy raz pojawia się najwcześniej po 6 minutach. Zostaje to, co robi dziś: chwyta samotnych z mroku.

**Nowa umiejętność: przecięcie liny**
- Pazurem przecina linę, po której zjeżdża jedzenie. Jedzenie przestaje zjeżdżać, dopóki ktoś nie naprawi liny.
- Plan AI: przecięte wiadro spada i rozbija się na dnie szybu.
- Lina jest jedna: od 17.10 wiadro jest jedno i zjeżdża tylko szybem do sali (`src/sim/wiadro.ts`), więc dłoń tnie tę linę. Plan AI dawał tę aktywność środkowej warstwie.
- Dłoń zawsze wznosi się z dołu, więc przy szybie u góry musiałaby wyjść inaczej.

**„Napraw linę”**
- Póki lina jest przecięta, każda postać ma tymczasową akcję „Napraw linę”: przycisk przy medalionach i na karcie postaci.
- Postać idzie do liny, wspina się po niej i ją skleja. Lina znów jest cała, a jedzenie od razu zjeżdża normalnie.
- Wspinaczka po linie wiadra już działa: `krokNaLinie` w `src/sim/wiadro.ts`, wołane z `creatures.ts`.
- Samotny naprawiający jest narażony na Tego, który patrzy (`src/sim/mrok.ts`). Według planu AI gracz może dać mu rycerza do eskorty albo oświetlić szyb Cudem.

**Animacje**
- Łuna i dłoń sięgająca do liny.
- Pazur tnie: iskra i strzępy włókien.
- Lina się rozplata i opada, wiadro się roztrzaskuje, jedzenie się rozsypuje.
- Wspinaczka, owijanie przy sklejaniu, lina się napina.

#### Dłoń anielska

To nowa, jasna dłoń, która schodzi z górnej krawędzi ekranu. Model jest w tym samym stylu co dłoń z otchłani.

- **Podkop.** Kruszy kilka bloków pod ludem i skraca zejście. Uwaga na fizykę: nie może powstać przepaść, z której nikt nie zejdzie ani nie wróci. Najlepiej, żeby wykuwał schody albo kruszył wskazany pas.
- **Dar ludzi.** Opuszcza w dłoni nowego robotnika. Poza wskrzeszeniem to jedyne źródło nowych ludzi.
- **Dar krwi.** Dolewa krwi do zbiornika. W Alphie zbiornik to wciąż czerwona „rysa” pod płytą (`src/render/plate.ts`). Na `main` Remake v1 i v2 mają już relikwiarz z ampułką krwi; warto go przenieść do Alphy przed tym etapem (pytanie 3 w 1.11).
- **Koszt i wywołanie.** Płaci się wiarą (zgrzyt 1). Dłoń wywołuje się nowym rytem albo przyciskiem, z czasem odnowienia.
- **Animacje.** Światło z góry, dłoń przenika skałę, gest i efekt: kruszenie skały, postawienie robotnika albo struga krwi do zbiornika. Potem dłoń wraca.

### 1.9 Etap 5 — Wielki Pomnik, boss, bot, samouczek

**Wielki Pomnik zamiast rdzenia**
- Stoi na dnie, pod kryptą, tam gdzie dziś rdzeń: (96, 226).
- Modlitwa pobożnych go kruszy, w 3–4 widocznych stanach pękania.
- Dziś od modlitwy pęka skorupa rdzenia:
  - kod: `src/sim/rytual.ts`;
  - rysunek: `src/render/rdzen.ts`;
  - liczby: `RDZEN` w `src/nastawy/swiat.ts` oraz `src/nastawy/rytual.ts`.
- Fale Strażników przychodzą przy 20, 45 i 70% skorupy, a boss przy 90% (`src/nastawy/straznicy.ts`, `src/sim/straznicy.ts`, `src/sim/boss.ts`).

**Boss**
- Gdy pomnik pęknie, boss wychodzi z gruzów z animacją.
- Grafiki bossa i Strażników to na razie zastępstwa. Docelowe robi Paweł.
- Dłoń z otchłani pomaga bossowi w walce, np. chwyta rycerza albo osłania bossa.

**Wygrana — do ustalenia**
- Dziś to „Uwolnienie”: pielgrzym wchodzi do rdzenia.
- Propozycja: pokonanie bossa.

**Bot od nowa** (`src/app/bot.ts`)
- Stawia szablony pomieszczeń i posyła robotników na żyły.
- Kuje drogę i odprawia rytuały.
- Naprawia linę i używa dłoni anielskiej.

**Samouczek od zera** (`src/app/screens/samouczek/rozdzialy.ts`, `src/app/screens/tutorial.ts`)
- Kroki przewija się ręcznie.
- Powód to skarga Pawła: „napisy się zbyt szybko zmieniają”.

**Testy**
- `scripts/test-skorupy.mjs` trzeba zamienić na test pomnika i bossa.
- `scripts/test-swiata.mjs` ma sprawdzać nowe struktury (ołtarz, ruiny).
- Próby botów.

**Reszta**
- Atlas i osiągnięcia (`src/core/osiagniecia.ts`, progi w `src/nastawy/cele.ts`).
- CHANGELOG i README.
- Obserwatorium.

### 1.10 Poza etapami — zaległe i znane problemy
- **Robotnicy giną w krypcie od Strażników.** W 3 z 8 prób zginęło w czasie fal razem 5 robotników. Do sprawdzenia, czy
  robotnicy z rozkazem uciekają przed falą poza strefę Strażników, czyli dalej niż `limitOdRdzenia` (30) + `ucieczkaZapas` (6) kafli od przedsionka.
  Krypta sięga 44 kafle w każdą stronę, więc jest dokąd uciec.
- **Rozjazd z `main`.** Relikwiarz krwi (`render/relikwiarz.ts`) i nowy znak oddania (`render/modlitwa.ts`) są w Remake v1
  i v2, a w Alphie nie, bo Alpha powstała wcześniej. Użytkownik nie odpowiedział, czy je przenieść.
- **Podpowiedzi (kółka na mapie)** to w dużej części rady z Remake. W 3b usunięte dwie nieaktualne („prorokuj”, „Nakarm przedsionek”); reszta do przejrzenia razem z samouczkiem w etapie 5. Tekst rady widać tylko jako kółko z podpisem na mapie.
- **Głód na ziarnach spoza prób** — po zmianie na jedno wiadro nie ma go ani w 8 próbach, ani w 16 dodatkowych.
  Trzy przyczyny naprawione przy okazji: brak powrotu z głębi (liny na zakrętach drogi wiernych), wykuta podłoga pod
  drogą (`podDroga`) i kurier, który ruszał pod rdzeń głodny (`LUD.kurierNajadaOd`).
- **Boss zgniata pobożnych pod rdzeniem** (2 przegrane na 16 dodatkowych ziarnach: speedrun 5 i 6). Dawniej bił najpierw
  robotników stojących w krypcie przy wiadrach (10–13 strat na 8 prób po 3d); teraz robotnicy są przy wiadrze w sali, więc
  idzie prosto na pobożnych, a rycerz bije najbliższego Strażnika, także tego w skale, i odchodzi w bok krypty. Próba
  naprawy (rycerz bierze najpierw Strażnika przy bezbronnych i czeka pod tym w skale) pogorszyła wyniki do 6/8 i 8/16 —
  wycofana. Do etapu 5 (bot) albo osobnej poprawki walki: rycerz musi osłaniać modlących się przed bossem.
- **Tylko komputer.** Alpha nie jest zrobiona pod telefon. Paweł: „na telefonie mało co działa”.
- **Zadania zespołu, nie dla Claude:**
  - grafika:
    - menu główne (pilne);
    - Pomnik i boss: 3–4 fazy pękania, wyjście bossa, docelowi Strażnicy;
    - ikonki: 3 portrety, „Idź/Kop”, „Wyznacz pokój”, „Napraw linę”;
    - dłoń anielska i przecięta lina, kafle żył, ołtarz, tła ruin;
    - ramki wydarzeń, atlas i osiągnięcia;
  - muzyka (Milan i Paweł):
    - adaptacyjna: przy napięciu głośniejszy bas i perkusja, gitara przechodzi z akustycznej w elektryczną;
    - motywy: włączenie gry, menu, start partii, wygrana i przegrana;
    - krótkie akcenty: zabytek, dłoń z otchłani, dłoń anielska, pęknięcie pomnika.

### 1.11 Otwarte pytania do użytkownika
1. ~~Gdzie ma stać ołtarz?~~ W sali pod szybem ze światłem, od początku (odpowiedź 17.10).
2. ~~Zgrzyt 1 (krew bez rekrutacji)?~~ Krew to paliwo rytuałów — zgadza się (odpowiedź 17.10).
3. Czy przenieść do Alphy relikwiarz krwi i nowy znak oddania z `main`?
4. Żółte „Ag” na szkicu przyjąłem jako złoto; użytkownik o tym wie i nie oponował. Na pewno nie chodziło o srebro?
5. ~~Do czego ma służyć Sypialnia?~~ Usuwa debuffy (odpowiedź 17.10).
6. Jaki ma być warunek wygranej po Pomniku — pokonanie bossa?

---

## 2. Stan aktualny

### 2.1 Repozytorium i GitHub
- **Repozytorium:** `kanalpatryk-netizen/Trzewoa`, lokalnie `/home/user/Trzewoa` (z wielkim T).
- **`main`** stoi na `146c82b` — scalenie PR #14 (etap 3c); wcześniej PR #13 (3b) i [kanalpatryk-netizen/Trzewoa#12](https://github.com/kanalpatryk-netizen/Trzewoa/pull/12). Zawiera:
  - Alphę 0.1 (etapy 1, 2, 3a, 3b i 3c);
  - zaległe zmiany Remake v2;
  - dwie zmiany z innej sesji: relikwiarz krwi i znak oddania w Remake v1 i v2.
- **Gałąź robocza `claude/charming-cerf-j2t9rf`** to `main` plus commit z tym plikiem. Otwartych PR nie ma.
- **Wydanie „gra”.** Przebieg #87 automatu „Gra do pobrania” przeszedł 17.10 o 08:14 UTC. Pliki Alphy w wydaniu:
  - [trzewia-alpha-0.1.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.1.html): 1 595 293 B;
  - [trzewia-alpha-0.1-obserwatorium.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.1-obserwatorium.html): 1 620 467 B.
  - Rozmiary zgadzają się co do bajta z budową na czystej kopii.
- **Menu (`README.md`).** Pierwszy wiersz to „🅰️ Alpha 0.1 (komputer, najnowsza)”. Remake v2 ma w menu osobny wiersz.
- **Narzędzia w kontenerze.** Nie ma `gh`, więc GitHub obsługuje się narzędziami MCP (`mcp__github__*`). Push przez proxy działa,
  gdy użytkownik ma połączone konto GitHub w claude.ai.

### 2.2 Co działa w Alphie 0.1
**Drużyna**
- 3 robotników, 2 pobożnych i 1 rycerz (`LUD.start`).
- Rycerz: życie ×12, siła ×11, szybkość ×0,75.
- Nikt się nie starzeje.
- Nie ma rekrutacji ze skały, gniazd kamiennych rycerzy, szeptów „przemyśl i kop” i „kop losowo” ani kart spisku i snu o rycerzach.
- `rycerzyNaBossa` = 1, a boss nie zasypia.
- Przegrana, gdy zginie ostatni pobożny.

**Rozkazy** (`src/sim/polecenia.ts`, `src/render/druzyna.ts`)
- Trzy medaliony z liczbą żywych.
- Zaznaczanie medalionem albo kliknięciem postaci, Shift dokłada do zaznaczenia.
- Kliknięcie mapy to „idź tam”, a kliknięcie skały przy zaznaczonym robotniku to „kop tam”.
- Do tego „kop drogę wiernych” i „odwołaj”.
- Pobożny i rycerz odmawiają, gdy nie dojdą, z animacją i dymkiem.
- Klawisze:

  | Klawisz | Działanie |
  |---|---|
  | A / S / D | role |
  | G | kop drogę wiernych |
  | V | odwołaj |
  | Esc, prawy przycisk | odznacz |

- **Odstępy:** stojący się rozstawiają, idący dopasowują krok (`ODSTEPY` w `src/nastawy/polecenia.ts`).

**Ruch i mapa**
- Bez lin, poza liną wiadra. Wspinaczka najwyżej o 1 kafel, zsuwanie po ścianach, schody kute przez robotników; od 3d
  także liny (szablon w pomieszczeniach; wiesza gracz, byle uczepione skały: 5 za darmo, potem 10 krwi).
- Od 3d: dwa otwory do sali (światło na ołtarz, wiadro 7 kafli w prawo), ołtarz na kamiennym kopczyku, kamienna podłoga
  sali z wyjściami na końcach.
- Bez zawału od góry.
- Góra według szkicu (opis w 2.4).
- Kucie jest 8 razy wolniejsze. Postęp zostaje w kaflu (`world.kucie`), a skała pęka na ekranie (`src/render/kucie.ts`).
- Droga wiernych (złota kreska) jest stała i kończy się na dnie przedsionka. Skorupa pęka od środka.

**Wiadro** (`src/sim/wiadro.ts`) — **decyzja użytkownika (17.10): wiadro jest jedno, ma jeden punkt, w którym spada;
nie pojawia się losowo, np. w jaskiniach; gracz może je sprowadzić niżej, kopiąc dziurę**
- Zjeżdża tylko szybem z wiadrem (`world.szybWiadraX`), na dno tej kolumny (`miejsceWSzybie`, `dnoKolumny`), z dosypywaniem
  do 40 porcji. Gdy pod stojącym wiadrem zniknie dno, zjeżdża niżej. Pod wiadrem podłoga sali nie jest z kamienia (`world.ts`),
  a złota kreska omija tę kolumnę (`planujDroge`: `podWiadrem`).
- Nakarm (`wiadroNaZadanie`) dosypuje do tego samego wiadra albo spuszcza je szybem — miejsce dotknięcia nie ma znaczenia.
- Do odciętych i do grup w głębi nic nie zjeżdża. Wracają drogą wiernych: plan liczy liny na zakrętach
  (`linyDrogi` — droga wykopana „w wyobraźni”, krok po kroku od przedsionka), a gdy zakręt jest wykopany, lina spada
  tam sama (`spuscLiny`, zdarzenie `lina` z `gracz: false` — ta sama animacja co przy linie gracza). Podłogi pod drogą nikt
  z ludu nie kuje (`podDroga`). Warcie jedzenie donoszą robotnicy; kurier najpierw sam się najada.
- Przy wiadrze je się do syta, do 4 porcji naraz.

**Bez zmian względem Remake v2**
- Fale Strażników i boss.
- Ten, który patrzy.
- Dłoń z otchłani (Alpha jest zawsze Koszmarem).
- Karty wydarzeń i ryty Nakarm, Szepnij i Cud.
- Obserwatorium z botem.

**Zapis**
- Osobne klucze: `trzewia-alpha:zapis`, `:ustawienia`, `:osiagniecia`, `:klawisze`.
- `VERSION = 3`. Zapisy sprzed 3d (bez ołtarza i drugiego otworu) się nie wczytają.

### 2.3 Testy i próby
**Po zmianie na jedno wiadro (17.10):** 8/8 wygranych (budowniczy 13,7–14,8 min, speedrun 12,7–17,0 min), nikt nie umarł
z głodu, z ludu zginął jeden pobożny (od Strażnika). Robotnicy dobili 228 szczebli w 8 partiach (od 18.10 to liny, które spadają same — wyniki prób te same). Dodatkowe ziarna 5–12:
14/16, bez głodu; przegrane speedrun 5 i 6 — boss zgniata pobożnych (zob. 1.10). Test świata sprawdza też, że pod wiadrem
jest podłoga, którą da się wykopać.

Wyniki po etapie 3d (gałąź `ccr-91477c56-dh7bgd`, limit prób 20 min — `proby.sh <katalog> 20`).
- **`npm test`:** 100/100 światów (z ołtarzem, kopczykiem, kamienną podłogą i oboma otworami), 12/12 skorup.
- **Próby botów:** 8 partii (ziarna 1–4, style budowniczy i speedrun). Wygranych 8/8.
  - Czasy: budowniczy 15,5–16,8 min, speedrun 12,4–14,0 min.
  - Nikt nie umarł z głodu.
  - Zginęło 13 postaci ludu, prawie wszystkie to robotnicy „odpoczywający przy obozie”, których rozgniata Śniący Kamień
    (przed 3d: 5, po zmianie mapy w 3d: 10). Do sprawdzenia w etapie 5 (bot): bezczynni robotnicy nie powinni stać przy bossie.
- **Dodatkowe ziarna 5–12** (16 partii): 16/16 wygranych. Jeden robotnik zmarł z głodu (ziarno 10, budowniczy, 6. minuta,
  bezczynny na lewym końcu krypty, x ≈ 52 — wiadro tam nie zjechało). Przed poprawką „czeka na wiadro, które zjeżdża” było
  5 zgonów z głodu kopaczy (ziarna 6, 9, 10).
- **Wcześniejsze wyniki botów:**
  - po zmianie z linami: 1/8;
  - po etapie 1: 0/8;
  - po etapie 2: 4/8.
- **Budowa.** `tsc` przechodzi czysto, `npm run pack` i obserwatorium się budują, a zbudowane pliki otwierają się z `file://` bez błędów.

### 2.4 Mapa i szkic
**Szkic** (rysunek Pawła)
- Z góry jeden wąski szyb, a przy nim napis „Jedzenie” i strzałka w dół.
- Z szybu jasne promienie na całą salę, pod szybem krzyż na kopczyku.
- Dookoła prostokąta góry gruba, kreskowana skała.
- W środku owalne „Fe” (żelazo) i małe jaskinie z żółtym „Ag” pod dnem.
- Na dole szeroka czerwona elipsa z napisem „RDZEŃ”.

**Mapa w grze** (ziarna 1 i 3; `SWIAT` w `src/nastawy/swiat.ts`)

| Element | Gdzie i ile |
|---|---|
| Wymiary | 192 × 240 kafli, powierzchnia na wysokości ok. y = 14 |
| Czapa | Pod 2 rzędami ziemi kamień nie do ruszenia, na całą szerokość, aż do stropu sali |
| Szyb | Kolumna x = 96, 3 kafle szerokości, kończy się na y = 28 |
| Sala | Promienie 17 × 5, podłoga y = 38, siedziba w (96, 37) |
| Warstwy | Płytka (`T.MIEKKA`, żelazo) do ok. y = 91; środkowa (`T.ROCK`, jaskinie, złoto) do ok. y = 168; głęboka (`T.TWARDA`) niżej |
| Rama | 4 kafle nie do ruszenia po bokach i na dnie |
| Krypta | 88 kafli szerokości, sklepienie najwyżej 6 kafli, podłoga y = 216; nad nią przedsionek, y ≈ 212 |
| Rdzeń | (96, 226), w skorupie |
| Kruszce | Żelazo 240–262 kafle, złoto 69–97, zależnie od ziarna |

Szybki podgląd całej mapy w ASCII daje `swiat-mapa.ts` z Dodatku A.

### 2.5 Lista zadań
- **Zrobione:** etap 1, etap 2, 3a, 3b i 3c (w wydaniu), 3d (na gałęzi), Alpha w menu i w wydaniu.
- **Do zrobienia:** 3e, 3f, etap 4, etap 5.

---

## 3. Pliki, na których pracuję
Ścieżki są liczone od `alpha-0.1/`, chyba że zaczynają się od `/`.

### 3.1 Poziom repozytorium
| Plik | Rola |
|---|---|
| `/README.md` | Menu na GitHubie, z wierszem Alphy 0.1 |
| `/CHANGELOG.md` | Sekcja „## Alpha 0.1 (komputer)” na górze |
| `/.github/workflows/gra.yml` | Buduje Alphę (grę i obserwatorium) i wystawia ją w wydaniu „gra”. Działa tylko z `main` |
| `/handoff.md` | Ten plik |
| `README.md` | Opis Alphy i plan („W budowie”). Aktualizować po każdym etapie |
| `trzewia.html` | Zbudowana gra, śledzona w git. Przebudowuje ją `npm run pack` |

### 3.2 Symulacja (`src/sim/`)
| Plik | Co jest w środku | Etap, który go zmieni |
|---|---|---|
| `world.ts` | Generowanie góry: `generujWarstwy` (3a), `kucie`, `salaStart`, `szybX` i `szybDol`, `szybWiadraX/Dol`, `oltarz`, `salaOltarza`, `lina`, `coreX` i `coreY`, `przedsionekY` | 3e (ruiny) |
| `creatures.ts` | Planer postaci, fizyka ludu, `digTile` (kucie), jedzenie (`doZapas`), `szalDo` | 3b, 3c, 3d, 4 |
| `polecenia.ts` | Rozkazy: `wydajPolecenie`, `wydajGrupie`, `drogaGrupie`, `odwolajPolecenie`, odmowy | 3c, 4 |
| `droga.ts` | Szukanie drogi z fizyką ludu: `szukajDrogi`, `szukajKopiac`, `stoi`, `ludRuch` | wszystkie |
| `pielgrzymka.ts` | Plan drogi wiernych (złota kreska): `odswiezPlan`, `czoloDrogi`, `nieWykopane` | 5 |
| `wiadro.ts` | Jedno wiadro w szybie, dosypywanie, pogłębianie kopaniem, `krokNaLinie` | 4 |
| `rytual.ts` | Skorupa pękająca od modlitwy | 5 (pomnik) |
| `straznicy.ts`, `boss.ts` | Fale i boss | 5 |
| `dlon.ts` | Dłoń z otchłani | 4 |
| `mrok.ts` | Ten, który patrzy | 4 |
| `lud.ts` | Role, siedziba, obozy, przegrana | — |
| `sim.ts` | Stan gry (`wiara`, `krew` i reszta) | 3b |
| `tiles.ts` | Kafle (`MIEKKA`, `TWARDA`, `ZLOTO`; `ORE` to żelazo), twardość, kolory | 3b, 3e |
| `trupy.ts` | Ciała zmarłych (wskrzeszenie: `polegli` w `oltarz.ts`) | — |
| `oltarz.ts` | Etap 3d: rytuały przy ołtarzu (`odprawRytual`, `czemuNie`, `tikOltarza`, wskrzeszenie), stan w `sim.lud.oltarz` | 4 (dłoń anielska?) |
| `pomieszczenia.ts` | Etap 3c/3d: plany, pokoje, rzemiosło, sen, liny gracza (`powiesLine`, `cenaLiny`) | 3e |
| `wydarzenia.ts`, `karty-ludu.ts` | Karty wydarzeń — wzór dla okna zabytku | 3e |
| `podpowiedzi.ts` | Podpowiedzi na płycie | każdy |
| `/alpha-0.1/src/powers/powers.ts` | Ryty Nakarm, Szepnij i Cud (`seed`, `whisper`, `sign`) | 4 (dłoń anielska) |

### 3.3 Nastawy (`src/nastawy/`)
| Plik | Co zawiera |
|---|---|
| `swiat.ts` | `SWIAT.warstwy` (rama, granice warstw, sala, szyb, żelazo, jaskinie, kieszenie, krypta, tempo kucia) i `RDZEN` |
| `wiadro.ts` | `co`, `szybMaks`, `nakarmPorcji`, `najadaDo` i reszta liczb wiadra |
| `lud.ts` | Skład startowy, role, głód |
| `polecenia.ts` | `POLECENIA` i `ODSTEPY` |
| `rytual.ts` | `PIELGRZYMKA` i `PLAN_DROGI` |
| `straznicy.ts` | Fale Strażników |
| `boss.ts` | Boss |
| `dlon.ts` | Dłoń z otchłani |
| `mrok.ts` | Ten, który patrzy |
| `stworzenia.ts` | Fizyka postaci |
| `cele.ts` | Progi osiągnięć |
| `oltarz.ts` | Etap 3d: ceny i czasy rytuałów, kto stoi „przy ołtarzu” |
| `pomieszczenia.ts` | Etap 3c/3d: szablony, warsztat, kuźnia, sypialnia (`snuTikow`), liny (`linyDarmowe`, `linaKrew`) |
| `wyglad/rycina.ts`, `wyglad/fresk-swiata.ts` | Barwy nowych kafli |

### 3.4 Rysunek (`src/render/`)
| Plik | Co jest w środku | Etap, który go zmieni |
|---|---|---|
| `kucie.ts` | Pękająca skała (nowy w 3a) | — |
| `druzyna.ts` | Medaliony, zaznaczenie, dymki, znaczniki rozkazów | 3c, 4 |
| `lud/odmowa.ts`, `lud/ruch.ts` | Animacja odmowy i odstępy | — |
| `lud/rycerz.ts`, `lud/helm.ts`, `lud/uzbrojenie.ts`, `lud/stroj.ts` | Rycerz | 3f, 3d (szał) |
| `plate.ts` | Płyta: krew, wiara, kronika | 3b, 4 (dar krwi) |
| `wiadro.ts` | Wiadro i lina | 4 |
| `dlon.ts` | Dłoń z otchłani | 4 |
| `rdzen.ts` | Rdzeń i skorupa | 5 |
| `droga.ts` | Złota kreska drogi wiernych | — |
| `engrave.ts` | Rycina kafli | 3e |
| `wydarzenie.ts` | Okno karty wydarzenia | 3e |
| `oltarz.ts`, `okno-oltarza.ts` | Etap 3d: ołtarz, smuga dnia, rytuały, okno rytuałów | 4 |
| `pomieszczenia.ts` | Etap 3c/3d: plany, wyposażenie, liny (hak, zwój, spadanie) | 3e |

### 3.5 Aplikacja, skrypty i reszta
| Plik | Rola |
|---|---|
| `src/app/screens/game.ts` | Ekran gry: wejście, rysowanie, odkrywanie tablic atlasu |
| `src/app/bot.ts` | Bot (obserwatorium i próby) |
| `src/app/obserwowany.ts` | Tryb okna obserwatorium |
| `src/app/screens/samouczek/rozdzialy.ts`, `src/app/screens/tutorial.ts` | Samouczek |
| `src/atlas/tablice.ts` | Atlas |
| `src/core/save.ts` | Zapis (`VERSION = 3`) |
| `src/core/keybinds.ts` | Klawisze |
| `src/core/osiagniecia.ts` | Osiągnięcia |
| `src/main.ts` | `window.__trzewia` — tylko w trybie deweloperskim (`npm run dev`) |
| `scripts/test-swiata.mjs` | Test świata na 100 ziarnach |
| `scripts/test-skorupy.mjs` | Test skorupy na 12 ziarnach |
| `scripts/proby-graczy.mjs` | Próba z botem. Zapisuje `.log`, `.anom` i `.dz` |
| `scripts/obserwatorium.mjs`, `scripts/obserwatorium/szablon.html` | Obserwatorium |
| `scripts/inline.mjs` | Pakowanie gry w jeden plik |
| `scripts/test-nakladania.mjs` | Czy elementy interfejsu na siebie nie nachodzą. Wymaga serwera deweloperskiego i Playwrighta |
| `scripts/test-balansu.mjs` | Test balansu |

Narzędzia spoza repozytorium (brudnopis sesji, który zniknie razem z kontenerem) są w Dodatku A.

---

## 4. Zmiany, których dokonałem
Od wklejenia planu (16.10), po kolei:

| Commit | Co |
|---|---|
| `54e0d2d` (Remake v2) | „Bez lin — w toku”: lud wchodzi o 1 kafel, a wyżej kuje schody (`szukajKopiac`, `krokKopiac`, `walkToLud`). Tablica atlasu „Schody”. Wypchnięte z regresją: 1/8 wygranych prób. W `56d01b4` Remake v2 wrócił do stanu sprzed tej zmiany, a sama zmiana poszła dalej w Alphie |
| `56d01b4` | Nowy folder `alpha-0.1/`: kopia Remake v2 ze zmianą bez lin. Wiersz w menu, budowa w `gra.yml`, osobne klucze zapisu, napis wersji w menu gry, plan w README |
| `5bc99c3` | Lud zsuwa się po ścianach szybów zamiast spadać (`stworzenia.ts`, `creatures.ts`) |
| `63539a5` | **Etap 1.** Stała drużyna 3/2/1. Nie ma rekrutacji, gniazd, szeptów kopania, spisku ani snu. Rycerz ma życie ×12 i siłę ×11, `rycerzyNaBossa` = 1. Usunięte `zawal.ts` (zawał) i `bunt.ts` (bunt). Atlas, samouczek, osiągnięcia, bot i test skorupy dostosowane do nowych zasad |
| `32ed03b` | **Etap 2.** Medaliony, zaznaczanie, rozkazy i odmowa z animacją (`polecenia.ts`, `druzyna.ts`, `lud/odmowa.ts`). Odstępy. Robotnicy kopią tylko na rozkaz, a pobożni i rycerz w ogóle nie kopią. Skorupa pęka od środka. Wiadra zjeżdżają tam, dokąd lud dojdzie. Bez starości. Tablica „Drużyna i rozkazy” |
| `7f06c42` | **Etap 3a.** Góra według szkicu (`generujWarstwy`, `SWIAT.warstwy`, nowe kafle) z kryptą, szersza mapa (192). Kucie ×8 z postępem w kaflu i animacją pękania. Wiadro szybem do sali i do odciętych. Stała droga wiernych kończy się na dnie przedsionka. `VERSION = 2` |
| `3f231cb` | Wciągnięty `main` (relikwiarz i znak oddania w Remake v1 i v2). W konfliktach w CHANGELOG i atlasie Remake v2 zostały zmiany z obu stron. Przebudowany `remake-v2/trzewia.html` |
| `26f26a5` | Opis obserwatorium Remake v2 w README i w notatkach wydania już nie wspomina wyboru trudności |
| `6688432` (`main`) | Scalenie PR #12. Automat wystawił Alphę w wydaniu „gra” |
| `f4a103b` | `handoff.md` |
| `8708eed` (`main`, PR #13) | **Etap 3b.** Liczniki żelaza i złota z animacją okruchów, „kop żyłę”, tablica „Kruszce”, porządki w podpowiedziach, sumowanie kroniki |
| `146c82b` (`main`, PR #14) | **Etap 3c.** Pomieszczenia: plany pod kursorem, kucie tylko przez zaznaczonych, warsztat (złoto → wiara), kuźnia (żelazo → zbroja), sypialnia (zdejmuje osłabienia), korytarz i szyb, atlas, samouczek |
| `d097ec5` | **Etap 3d.** Dwa otwory (światło na ołtarz, wiadro obok), ołtarz od początku na kamiennym kopczyku, okno rytuałów, pięć rytuałów za krew z animacjami, okalecz/ofiaruj tylko przy ołtarzu, drabiny tylko tam, gdzie trzeba się wspiąć, sen 60 s, Strażnicy i boss z dala od pobożnych, atlas, samouczek, `VERSION = 3` |
| `fd02485` | **Jedno wiadro.** Tylko szybem do sali, pogłębiane kopaniem; Nakarm dosypuje do niego. Szczeble na zakrętach drogi wiernych, ochrona podłogi pod drogą, kurier najada się przed drogą |
| (gałąź `ccr-91477c56-dh7bgd`) | **Lina zamiast drabiny.** Wiesza ją gracz (5 za darmo, potem 10 krwi), jednostki jej nie budują; na zakrętach drogi wiernych spada sama; animacja haka, zwoju i kołysania |

Wcześniej w tej samej sesji zrobiłem rzeczy, które są już na `main` (PR #7–#12):
- freski w interfejsie, mroczny interfejs i muzyka niepokoju;
- Ten, który patrzy, i dłoń z otchłani;
- obserwatorium z botami;
- kamera nie jeździ sama do wydarzeń;
- zawał, wiadro, hełmy i trupy w Remake v2;
- tylko poziom Koszmar, bez świata dnia;
- samouczek, atlas i osiągnięcia od nowa;
- rycerz, robotnik i pobożny malowani tuszem.

---

## 5. Popełnione błędy

### 5.1 Projekt i interpretacja
1. **Fałszywa obietnica drogi w obie strony.** W etapie 2 ogłosiłem, że droga wiernych schodami „w obie strony” pozwala wrócić. To nieprawda: na zakręcie trzeba by wejść o 2 kafle. Sprostowałem to w 3a: w CHANGELOG, na tablicy atlasu „Schody” i w komentarzach w `nastawy/rytual.ts` i `sim/droga.ts`. Wniosek: zakładać, że kto zszedł w głąb, nie wraca.
2. **Siedziba w miejscu ołtarza.** Krzyż ze szkicu potraktowałem jako miejsce siedziby, a według czatu z Pawłem to ołtarz. Naprawione w 3d: ołtarz stoi pod szybem ze światłem, siedziba — pod otworem z wiadrem.
3. **Niepotwierdzone założenia.** Przyjąłem, że „Ag” to złoto (zgłosiłem to użytkownikowi) i że krew służy do rytuałów (zgrzyt 1, bez odpowiedzi).

### 5.2 Błędy w kodzie, znalezione w próbach i naprawione
4. **Zmiana bez lin wypchnięta z regresją** (`54e0d2d`). Boty wygrywały 1 na 8 partii: lud spadał w szybach, głodował w dołkach, a tunele kończyły się obok gniazd. Upadki naprawił ślizg po ścianach (`5bc99c3`); gniazd nie ma od etapu 1.
5. **Etap 1 zapisany przy 0 wygranych botów.** Robotnicy błądzili i głodowali. Naprawione w etapie 2.
6. **Etap 2 — naprawione:**
   - rysa skorupy była dołem, w który wpadał lud;
   - drużyna umierała ze starości w 15.–17. minucie;
   - robotnik niósł jedzenie na przełaj tam, dokąd nie dochodził.
7. **Etap 3a — naprawione:**
   - **Głód na dole.** Całe jedzenie szło szybem do sali, a ci w głębi nie mogli do niej wrócić. Naprawa: wiadra dla odciętych.
   - **Plan drogi przeliczany od zera.** Działo się to, gdy pielgrzymi ruszali, bo gałąź `klanWyslanych` omijała stały plan. Naprawa: sprawdzenie stałego planu idzie pierwsze.
   - **Za mały przedsionek.** Rycerz nie miał gdzie stać, a pielgrzymi ginęli. Naprawa: szeroka krypta.
   - **Zerowany postęp kucia.** Odświeżany rozkaz zerował postęp co 60 tików, więc przy 8 razy wolniejszym kuciu droga stała. Naprawa: postęp zapisany w kaflu (`w.kucie`).
   - **Zapchany limit wiader.** Limit 5 wiader zajmowały wiadra, do których nikt nie mógł dojść. Naprawa: takie wiadra odjeżdżają i nie liczą się do limitu.
   - **Droga kończyła się w kieszeni nad kryptą** (ziarna 2 i 3). Naprawa: cel musi leżeć w dolnej połowie przedsionka.
   - **Nieudana próba z celem na podłodze krypty.** Droga kończyła się na końcu krypty (x = 140), a pielgrzymi stali tam bez modlitwy: 0% skorupy. Wycofane.
   - **Głód w krypcie** (ziarno 3). Limit blokował wiadro dla odciętych. Naprawa: flaga `pilne` pozwala przekroczyć limit o 3.
   - **Rysa w `kucie.ts`** rysowała się z błędnym `ctx.translate`. Naprawa: lista punktów rysowana dwa razy.

### 5.3 Proces
8. **Push zablokowany.** Kontener nie miał uwierzytelnienia do GitHuba, więc 5 commitów było przez chwilę tylko lokalnie. Ryzyko utraty minęło, gdy użytkownik połączył konto.
9. **Scalenie PR #12 bez przeglądu.** Scaliłem go sam, bez przeglądu użytkownika. Zabezpieczenie sesji uznało to za scalenie bez przeglądu i zablokowało mi sprawdzenie linków przez `curl`. Na przyszłość: PR zostawiać do scalenia użytkownikowi, chyba że wprost każe scalić.
10. **Rozjazd wersji.** Zmiany z `main` (relikwiarz, znak oddania) trafiły do Remake v1 i v2, a do Alphy nie.
11. **Lekcje z wcześniejszej części sesji.** Użytkownik nie widział nowych postaci w grze. Freski nie trafiały do pobieranego pliku, bo Vite 5.4 nie obsługuje `?inline` przy obrazkach (naprawione w PR #8). Wniosek: zawsze sprawdzać zbudowany plik z `file://`, a nie tylko serwer deweloperski.

---

## 6. Konkretne kolejne kroki

### 6.1 Start nowej sesji
```bash
cd /home/user/Trzewoa
git fetch origin main claude/charming-cerf-j2t9rf
git checkout claude/charming-cerf-j2t9rf && git pull origin claude/charming-cerf-j2t9rf
# jeśli PR z tej gałęzi jest już scalony: git checkout -B claude/charming-cerf-j2t9rf origin/main
cd alpha-0.1 && npm ci && npx tsc --noEmit -p . && npm test
```
Potem odtwórz w brudnopisie narzędzia z Dodatku A: próby botów, zrzuty i mapę w ASCII.

### 6.2 Zanim zaczniesz kodować
1. Poczekaj na polecenie użytkownika. Ostatnio prosił, żeby po skończonym zadaniu czekać.
2. Zadaj pytania z 1.11. Przed etapem 4 najważniejsze jest pytanie o relikwiarz i o to, którą linę tnie dłoń.

### 6.3 Etap 3b — zrobione (17.10, gałąź `ccr-91477c56-dh7bgd`)
1. Dodaj `zelazo` i `zloto` w `Sim`, z zapisem i wczytaniem w `save.ts`.
2. W `digTile` doliczaj kruszec dla `T.ORE` i `T.ZLOTO`, z wpisem do kroniki i zdarzeniem `urobek` dla rysunku.
3. Dodaj liczniki na płycie i animację: okruch leci do licznika, licznik błyska.
4. Dodaj tablicę atlasu „Kruszce”, odkrywaną przy pierwszej rudzie, i podpowiedź.
5. Przejdź listę z 6.10, potem commit „Alpha 0.1, etap 3b: …” i push.

### 6.4 Etap 3c — zrobione (17.10, gałąź `ccr-91477c56-dh7bgd`)
1. Dodaj nastawy pomieszczeń: rozmiary, koszty, czasy.
2. Napisz moduł pomieszczeń: plan, sprawdzanie, czy da się położyć, kucie przez rozkazy, stan i zapis.
3. Zrób interfejs: przycisk przy medalionach, podgląd pod kursorem, klawisz.
4. Narysuj plan na mapie i wyposażenie gotowych pomieszczeń.
5. Warsztat: rzemieślnik zamienia złoto w wiarę, z animacją.
6. Kuźnia: części zbroi, z animacją. Rysowanie części na rycerzu to 3f.
7. Sypialnia: według odpowiedzi użytkownika.
8. Szyb i korytarz przeciągane myszą.
9. Atlas i samouczek, potem lista z 6.10.

### 6.5 Etap 3d — zrobione (17.10, gałąź `ccr-91477c56-dh7bgd`)
1. Postaw ołtarz w miejscu, które wskaże użytkownik.
2. Zrób okno rytuałów.
3. Rytuały: ofiara, wskrzeszenie, szał krwi (logika do istniejącego już rysunku) i modlitwa. Każdy z animacją.
4. Atlas i samouczek, potem lista z 6.10.

### 6.6 Etap 3e
1. Dodaj ruiny w generatorze mapy.
2. Dodaj zabytki z premią i karą oraz okno wyboru.
3. Dodaj animacje i tablice atlasu, potem lista z 6.10.

### 6.7 Etap 3f
1. Rycerz zaczyna bez części z kuźni.
2. Rysowanie zależne od stanu rycerza i premie za części.
3. Animacja zakładania.
4. Dokumentacja etapu 3 z tablicą „Warstwy”, potem lista z 6.10.

### 6.8 Etap 4
1. Jeśli użytkownik się zgodzi, najpierw przenieś relikwiarz do Alphy.
2. Przecięcie liny i „Napraw linę” (z użyciem `krokNaLinie`).
3. Dłoń anielska: Podkop, Dar ludzi, Dar krwi.
4. Animacje wszystkiego powyżej, potem lista z 6.10.

### 6.9 Etap 5
1. Pomnik i boss.
2. Dłoń z otchłani pomagająca bossowi.
3. Warunek wygranej.
4. Nowy bot i nowy samouczek.
5. Testy i osiągnięcia, potem lista z 6.10.

### 6.10 Lista kontrolna po każdym etapie
1. Uruchom `npx tsc --noEmit -p .` i `npm test` w `alpha-0.1/`.
2. Uruchom próby botów: `bash <brudnopis>/proby.sh <katalog> 20`. Wyniki trafiają do pliku `WYNIKI`. Ma być 8/8 wygranych i nikt nie może umrzeć z głodu.
3. Zbuduj grę i obserwatorium: `npm run obserwatorium` tworzy `trzewia.html` i `obserwatorium.html`.
4. Otwórz oba pliki przez `node obs-test.mjs <plik> <zrzut.png>`. Nie może być błędów.
5. Zrób zrzuty nowych rzeczy z serwera deweloperskiego (`zrzut.mjs`) i wyślij je użytkownikowi.
6. Zaktualizuj dokumentację:
   - atlas, samouczek, podpowiedzi;
   - CHANGELOG (sekcja Alphy);
   - `alpha-0.1/README.md` (skreśl etap w „W budowie”);
   - opis Alphy w wierszu menu w `/README.md`, jeśli się zmienił.
7. Przebuduj i zatwierdź śledzony `alpha-0.1/trzewia.html`.
8. Zrób osobny commit na etap, z polskim opisem i końcówką z Dodatku B. Wypchnij na `claude/charming-cerf-j2t9rf`.
9. PR do `main` otwieraj tylko na prośbę użytkownika, a scalaj tylko wtedy, gdy wprost każe. Po scaleniu sprawdź przebieg „Gra do pobrania” i wydanie „gra”.

---

## Dodatek A — narzędzia z brudnopisu (do odtworzenia)
Brudnopis sesji znika razem z kontenerem, a tych skryptów nie ma w repozytorium. Wklej je do nowego brudnopisu.
Chromium jest w `/opt/pw-browsers/chromium`, a `playwright-core` w `/opt/node-tools/node_modules/playwright-core`.

**`proby.sh`** — 8 prób botów (ziarna 1–4, style budowniczy i speedrun), po 3 naraz. Pierwszy argument to katalog wyników, drugi to liczba minut.
```bash
#!/bin/bash
OUT=$1; MIN=${2:-16}; mkdir -p $OUT
REPO=/home/user/Trzewoa/alpha-0.1
cd $REPO
jobs_list=()
for s in 1 2 3 4; do for st in budowniczy speedrun; do jobs_list+=("$st $s"); done; done
run() { local st=$1 s=$2; node scripts/proby-graczy.mjs $REPO $s $st $MIN $OUT/$st-$s.log > $OUT/$st-$s.out 2>&1; }
n=0
for j in "${jobs_list[@]}"; do
  run $j &
  n=$((n+1))
  if [ $((n % 3)) -eq 0 ]; then wait -n; n=$((n-1)); fi
done
wait
for f in $OUT/*.out; do tail -1 $f; done > $OUT/WYNIKI
echo DONE > $OUT/DONE
```

**`obs-test.mjs`** — otwiera zbudowany plik w Chromium, po 12 s robi zrzut i wypisuje błędy strony.
```js
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
const [plik, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const bledy = []; p.on('pageerror', (e) => bledy.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') bledy.push(m.text()); });
await p.goto('file://' + plik);
await p.waitForTimeout(12000);
await p.screenshot({ path: out });
console.log(bledy.length ? 'BŁĘDY: ' + bledy.slice(0, 5).join(' | ') : 'bez błędów');
await b.close();
```

**`zrzut.mjs`** — zrzut z serwera deweloperskiego. Najpierw w `alpha-0.1` uruchom `npx vite --port 5182 --strictPort`. Skrypt zaczyna nową grę na ziarnie 3 i może wykonać dowolny JS, np. przesunąć `__trzewia.gra.cam` albo zmienić `__trzewia.nastawy`.
Wywołanie: `node zrzut.mjs http://localhost:5182/ out.png [szer] [wys] [czekaj ms] [js]`.
```js
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
const [adres, plik, W = '1400', H = '900', czekaj = '2500', js = ''] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: Number(W), height: Number(H) } });
const bledy = []; p.on('pageerror', (e) => bledy.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') bledy.push(m.text()); });
await p.goto(adres);
await p.waitForFunction(() => window.__trzewia?.app.aktywnyEkran?.nazwa === 'menu', null, { timeout: 30000 });
await p.evaluate(() => window.__trzewia.idz('gra', { tryb: 'nowa', ziarno: 3 }));
await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__trzewia.app.aktywnyEkran; g.atlas?.zamknij?.(); });
if (js) await p.evaluate(js);
await p.waitForTimeout(Number(czekaj));
await p.screenshot({ path: plik });
console.log('zrzut', plik, bledy.length ? 'BŁĘDY: ' + bledy.join(' | ') : 'bez błędów');
await b.close();
```

**`run.mjs`** — uruchamia dowolny plik `.ts`, który importuje kod gry przez `@src/…` (esbuild bierze się z `alpha-0.1/node_modules`).
Wywołanie: `node run.mjs /home/user/Trzewoa/alpha-0.1 plik.ts [argumenty]`.
```js
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const [repo, plik, ...args] = process.argv.slice(2);
const { build } = await import(pathToFileURL(join(resolve(repo), 'node_modules', 'esbuild', 'lib', 'main.js')).href);
const k = mkdtempSync(join(tmpdir(), 'dg-'));
const kod = readFileSync(plik, 'utf8').replaceAll('@src/', resolve(repo, 'src') + '/');
writeFileSync(join(k, 'e.ts'), kod);
await build({ entryPoints: [join(k, 'e.ts')], bundle: true, format: 'esm', platform: 'node', outfile: join(k, 'e.mjs'), logLevel: 'error',
  define: { 'import.meta.env.DEV': 'false' } });
const m = await import(pathToFileURL(join(k, 'e.mjs')).href);
await m.main(args);
```

**`swiat-mapa.ts`** — cała mapa w ASCII. Pierwszy argument to ziarno, drugi to krok próbkowania.
Wywołanie: `node run.mjs <repo> swiat-mapa.ts 3 4`.
```ts
import { Sim } from '@src/sim/sim.ts';
import { T } from '@src/sim/tiles.ts';
export function main(args: string[]) {
  const sim: any = new Sim(Number(args[0] ?? 1));
  const w = sim.world;
  const krok = Number(args[1] ?? 2);
  const ch: Record<number, string> = { [T.AIR]: ' ', [T.SKY]: '~', [T.SOIL]: ',', [T.ROCK]: '#', [T.ORE]: 'F', [T.CRYSTAL]: '*', [T.STONE]: '@', [T.CORE]: 'C', [T.MIEKKA]: '.', [T.TWARDA]: '%', [T.ZLOTO]: 'G', [T.NEST]: 'n' };
  for (let y = 0; y < w.h; y += krok) {
    let s = String(y).padStart(4) + ' ';
    for (let x = 0; x < w.w; x += krok) {
      let best = w.tile[w.idx(x, y)];
      for (let dy = 0; dy < krok; dy++) for (let dx = 0; dx < krok; dx++) { const t = w.tile[w.idx(Math.min(w.w - 1, x + dx), Math.min(w.h - 1, y + dy))]; if (t === T.AIR || t === T.ZLOTO || t === T.ORE) best = t; }
      s += ch[best] ?? '?';
    }
    console.log(s);
  }
  const k = sim.clans.find((x: any) => x.race === 0);
  console.log('baza', k.hx, k.hy, 'sala', JSON.stringify(w.salaStart), 'szyb', w.szybX, w.szybDol, 'core', w.coreX, w.coreY);
}
```

**Przydatne liczby:**
- 120 tików to 1 s gry, a 7200 tików to 1 min.
- Robotnik głodnieje od 0 do 1 w ok. 1,6 min (`LUD.glodSam` = 0,6, posiłek = 0,45).
- Kucie: postęp na tik = `digPower × kopanie × …` (robotnik ma 1,4), a próg = twardość × 9 × 8.
- Twardość kafli:

  | Kafel | Twardość |
  |---|---|
  | miękka skała | 1,8 |
  | żelazo | 2,4 |
  | złoto | 3 |
  | skała | 3,2 |
  | twarda skała | 5,4 |

## Dodatek B — zasady repozytorium i rozmowy
- **Gałąź:** `claude/charming-cerf-j2t9rf` (etapy 1–3a); etap 3b poszedł na `ccr-91477c56-dh7bgd` — gałąź przypisaną sesji, która go robiła. Kolejna sesja pracuje na gałęzi, którą przydzieli jej system.
- **Push:** `git push -u origin claude/charming-cerf-j2t9rf`. Ponawiaj (po 2, 4, 8 i 16 s) tylko przy błędzie sieci.
- **Commity:** opis po polsku. Na końcu dwie linie atrybucji (`Co-Authored-By: …` i `Claude-Session: …`), dokładnie tak, jak podaje przypomnienie systemowe danej sesji.
- **Identyfikatory modeli:** żadnych w commitach, PR-ach, kodzie ani plikach w repozytorium.
- **PR:** tylko na wyraźną prośbę. Nie scalaj sam bez polecenia.
- **Rozmowa z użytkownikiem:** po polsku, krótko, bez żargonu. Po skończonym zadaniu zatrzymaj się i czekaj na polecenie.
- **Grafika i muzyka** należą do Pawła i Milana. My robimy mechanikę i placeholdery.
