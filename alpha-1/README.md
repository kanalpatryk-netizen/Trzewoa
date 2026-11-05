# TRZEWIA — Alpha 1 (komputer)

Nowa wersja: **oficjalna Alpha 0.2** (z nowym menu i ustawieniami) **+ wszystkie funkcje gry spoza oficjalnego
builda** — propozycje Pawła z 24.10 (wcześniej osobno w `propozycja-1/`) i nowy dół ekranu z księgą z pliku
`trzewia6.html` (5.11, źródło odtworzone z builda). `alpha-0.2/` i `propozycja-1/` zostają bez zmian.
Zapisy, ustawienia, atlas i osiągnięcia są tu osobne (klucze `trzewia-alpha-1:`). Tylko komputer — bez prac pod telefon.

Gra: [`trzewia.html`](trzewia.html) — pobierz i otwórz w przeglądarce (jeden plik, działa bez internetu).

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
