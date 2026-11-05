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
- **Boss** to ta sama postać ożywiona: ciemna, rozżarzona skóra, płonące oczy, ogień w aureoli, żar w piersi; oddycha,
  wstaje z gruzu, zamachuje się, przy konaniu świeci złotem i rozsypuje się w popiół. Ryciny w atlasie też.
- Inny wzór = podmienione pliki w `obrazy/pomnik/` (punkty: `WZOR` w `src/render/demon-wzor.ts`). Dawna rycina
  (`rysujDemonaRycina` w `src/render/demon.ts`) rysuje tylko, póki obrazki się wczytują.

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
