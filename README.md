# Trzewia

Sandbox boga osadzony w podziemiu, w całości 2D, w konwencji XIX-wiecznej ryciny.

**Nie grasz bogiem, który rządzi podziemiem — grasz podziemiem, a ono jest głodne.**

## ⬇️ Zagraj

### [**Pobierz grę — `trzewia.html`**](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia.html)

1. Kliknij link wyżej — pobierze się jeden plik (ok. 440 kB).
2. Otwórz go w przeglądarce (Chrome, Firefox, Edge, Safari) — zwykle wystarczy dwuklik.
3. Graj. Bez instalacji, bez konta, działa też bez internetu. Postęp zapisuje się w przeglądarce.

Link zawsze daje najnowszą wersję: po każdej zmianie w gałęzi `main` automat
([`.github/workflows/gra.yml`](.github/workflows/gra.yml)) buduje grę od nowa i podmienia plik
w [wydaniach](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest).
Gdyby link jeszcze nie działał, otwórz [`trzewia.html` w repozytorium](https://github.com/kanalpatryk-netizen/Trzewoa/blob/main/trzewia.html)
i kliknij przycisk **Download raw file** (strzałka w dół nad plikiem).

> Plik `artifact.html` to starsza wersja — do grania służy `trzewia.html`.

Kod źródłowy i uruchomienie dla programistów: sekcja [Uruchomienie](#uruchomienie) niżej.

## Co jest w grze

| Warstwa | Zawartość |
|---|---|
| **Menu** | powrót do trwającej gry, nowa góra, samouczek, bestiariusz, ustawienia — wszystko rysowane tą samą kreską, co świat |
| **Samouczek** | 10 krótkich rozdziałów z listą czynności do odhaczenia; palec wskazuje dokładnie ryt, słowo, przycisk albo miejsce na płycie |
| **Atlas** | 24 tablice z ryciną i opisem: sześć ras, pięć rytów, trzy zasoby i dziesięć praw góry — odkrywanych w trakcie gry |
| **Ustawienia** | dźwięk, obraz, świat oraz **pełna lista sterowania z przypisywaniem klawiszy** |
| **Rozgrywka** | przekrój góry 176×240, sześć sposobów istnienia, pięć czasowników, trzy zasoby, przypływy, zapis stanu |
| **Kronika** | ekran końcowy ze spisaną legendą tego, czym byłeś — i wyrokiem: dlaczego tak się skończyło, jak daleko zaszła droga do wolności i jedna rada na następny raz |
| **Rycina** | brzegi płyty gęstnieją rytowaną kreską i oddychają razem z rdzeniem (tym samym rytmem, którym dudni skała); patyna starej odbitki, zwoje w rogach ramy i pionowe oko; skala głębokości w nieznanym piśmie; w skale, do której nikt nie zajrzał, żarzą się znaki — gasną, gdy dojdzie do nich światło, a w pauzie widać je wyraźniej. W menu obraca się astrolabium podziemia |
| **Dźwięk** | rezonans świata (kucie, modlitwa, ton zależny od głębokości), muzyka — powolne akordy frygijskie i uderzenia w metal — oraz dźwięki gestów: rylec szkicu rozkazu, kamień pauzy, kaskada wykonanego planu, dzwony ostrzeżeń, szelest kart atlasu. Wszystko syntezowane w locie, przez wspólny pogłos jaskini; w pauzie góra brzmi jak zza ściany |

## Jak się wygrywa

Wygrywasz, gdy wierni przebiją skorupę rdzenia i uklękną przy nim (**Uwolnienie**). W lewym górnym rogu
płyty stoi plakietka **Droga do wolności** z pięcioma krokami — bieżący się żarzy, zrobione są przekreślone,
kliknięcie otwiera tablicę z całą drogą (otwiera się też sama na początku pierwszej partii):

1. **wiara** — ktoś się do ciebie modli (ruda przy Ślepym Ludzie → ołtarz);
2. **oddanie** — jedna nacja wierzy mocno (Znak przy jej gnieździe);
3. **droga** — przy przedsionku pod rdzeniem rośnie grzyb: wtedy najwyżej pięciu wiernych schodzi na wartę
   i przeżyje na dole. Jeśli spod rdzenia nie ma drogi do gniazda, gra rysuje złotą kreską korytarz,
   który można wydrążyć — nie trzeba;
4. **skorupa** — warta modli się, aż kamień pęknie (licznik pęknięć przy kroku);
5. **wolność**.

Przegrywasz, gdy góra zaśnie: z pustki albo gdy jedna krew zje resztę. **Łaskawa góra** (domyślna,
Ustawienia → Świat → Góra) zasypia wolniej, daje więcej krwi na start i szybszy rytuał — na pierwsze
partie. Po przegranej kronika mówi, dlaczego, jak daleko zaszła droga i co zrobić następnym razem.

## Pauza taktyczna

Jak w Baldur's Gate: czas można zatrzymać (spacja, klepsydra albo przycisk pod płytą) i w zatrzymanym
świecie wydawać rozkazy. Każdy rysuje się jako **szkic rylcem** i rezerwuje koszt; wszystkie dzieją się
naraz, gdy puścisz czas. Szkic skreśla dotknięcie bez rytu w ręku albo „cofnij" na banerze pauzy.

**Auto-pauza** zatrzymuje świat w chwilach, w których trzeba decydować: nacja wymiera, jedna krew bierze
górę, zaczyna się sen, pęka skorupa rdzenia albo przychodzi przypływ. Kamera jedzie na miejsce, a karta
sytuacji mówi, co się stało i **co możesz z tym zrobić**. Poziom (kryzysy / wszystko / wyłączona) w ustawieniach.

## Atlas tablic

Każda rasa, ryt, zasób i prawo góry ma swoją **tablicę** jak plansza z dawnego atlasu: u góry rycina,
pod nią nazwa, łaciński podpis, opis i jedno zdanie — **kiedy tego użyć**. Tablice odkrywa się, grając
(rasę, gdy pierwszy raz stanie w kadrze; prawo, gdy pierwszy raz zadziała), a ważne otwierają się same
przy pierwszym spotkaniu. Atlas jest pod przyciskiem z księgą, w menu, na karcie sytuacji („tablica")
i pod prawym przyciskiem na rycie. Odkrycia pamiętane są między partiami.

## Samouczek — robisz, nie czytasz

Jedna krótka scena na wejście, potem dziesięć rozdziałów. Każdy ma **listę czynności
z odhaczaniem**, a bieżąca czynność jest **wskazana palcem**: reszta ekranu przygasa,
od karty biegnie strzałka do rytu, słowa u góry, przycisku albo miejsca na płycie.
Przy każdej czynności stoi też jej klawisz.

1. **Rozejrzyj się** — przeciągnij płytę, przybliż, wróć do swoich
2. **Czym płacisz** — Krew, Wiara i Otchłań wskazane w ramie obrazu
3. **Nakarm ich** — ryt Zasiej → słowo „grzyb" → przeciągnij po zaznaczonym miejscu
4. **Otwórz drogę** — ryt Kształtuj → „drąż" → przeciągnij po skale
5. **Szepnij** — ryt Szepcz → kliknij goblina → „prorokuj" na jego karcie (czas stoi)
6. **Zrób cud** — ryt Znak → „objawienie" → klik przy gnieździe
7. **Zmień im krew** — ryt Skaź → „ślepota" → klik w goblina (czas stoi)
8. **Czas** — pauza, wznowienie, przyspieszenie
9. **Jak to się kończy** — wstęga warstw, zasypianie i rdzeń
10. **Kronika** — otwórz i zamknij zapiski

Odznaczenie rytu cofa do odpowiedniej czynności, a kto zrobi coś szybciej, niż
kazano, ma to zaliczone. Rozdział można pominąć albo wrócić do poprzedniego.
Na końcu jednym kliknięciem zaczyna się prawdziwa gra.

W zwykłej rozgrywce nad płytą stoi **jedno zdanie podpowiedzi** czytane ze stanu świata
(„Żużlowcy są o krok od wygaśnięcia — otwórz im żar"), a miejsce, o którym mówi,
dostaje pierścień celownika albo strzałkę przy krawędzi.

## Sterowanie

| Co | Jak |
|---|---|
| Kamera | przeciągnięcie (także prawym przyciskiem, gdy trzymasz czasownik); kółko lub szczypanie przybliża; `C` wraca do mieszkańców |
| Czasownik | ryt na lewym marginesie albo klawisze `1`–`5` |
| Narzędzie | słowo w górnym marginesie albo `Q`, `W`, `E`, `R` |
| Użycie | Kształtuj i Zasiej malują przeciągnięciem, Znak dotknięciem miejsca, Szepcz i Skaź dotknięciem stworzenia |
| Czas | sączy się na ćwierć tempa, dopóki trzymasz czasownik; `spacja` pauzuje, `+` / `-` zmienia tempo |
| Zapis | `Z` zapisuje, `X` wczytuje; autozapis co minutę |
| Zapiski | `K` — cała kronika z datami; kliknięcie we wpis przenosi tam wzrok |
| Klucz do ryciny | `L` |
| Bez klawiatury | pasek nacięć przy dolnej krawędzi: pauza, tempo, powrót kamery, zapiski, klucz, zapis |
| Menu | `esc`, `P` albo trzy nacięcia w lewym górnym rogu płyty |

Wszystkie klawisze da się przypisać na nowo w Ustawieniach.

### Jak się to kończy

Rdzeń leży w kamieniu, którego nie rozkuje żaden kilof — ani twój. Skorupa pęka
wyłącznie pod modlitwą: nacja z wysokim oddaniem trzyma pod przedsionkiem wartę
(trzej wierni naraz to minimum, pięciu to pełna zmiana), a **postęp zapisuje się na
nacji, nie na ludziach** — pielgrzymi mogą zgłodnieć, wrócić i umrzeć, wykuta robota
zostaje. Twoja rola to utrzymać drogę: siać grzyb przy przedsionku, zawalać tunele
przed intruzami, nie wpuszczać tam wody ani żaru (gra ci na to nie pozwoli).
Drugi koniec to sen: gdy jedna krew zje resztę, przestajesz być komukolwiek potrzebny.

## Jak to jest zrobione

Czysty TypeScript, Canvas 2D, zero zależności w runtime. Kod rozbity na małe moduły:

```
src/
  app/            szkielet: pętla, ekrany, kontekst
    screens/      menu, gra, samouczek, ustawienia, bestiariusz, kronika
  cutscene/       odtwarzacz scen + scenariusz
    art/          jedna rycina na plik (gora, pamiec, zyly, ziarno, szept,
                  znak, krew, spis, kronika, organy, rasy, przyplyw)
  core/           rng, audio (rezonans), music, gesty, mikser, save, settings-store, keybinds
  render/         engrave (sitodruk kreskowania), plate (rama i organy),
                  overlay (sylwetki, cząsteczki), bloom, shafts, ink, palette, camera
  sim/            world, sim, creatures, races, tiles
  powers/         pięć czasowników
  ui/             ryty, karta bestiariusza w grze
  nastawy/        WSZYSTKIE pokrętła gry: balans, rytuał, stworzenia, moce, świat,
                  dźwięk, kamera, kolory i wygląd ekranów — z opisem każdej wartości
```

**Chcesz coś zmienić w balansie, wyglądzie albo dźwięku?** Zacznij od
[`src/nastawy/README.md`](src/nastawy/README.md) — tabela „chcę zmienić… → plik → obiekt”.
Kod gry nie trzyma własnych liczb, tylko odwołuje się do nastaw po nazwie. W `npm run dev`
można je zmieniać na żywo z konsoli: `__trzewia.nastawy.RYTUAL.tempo = 0.001`.

### Obraz

- **Rycina, nie pixel art.** Kreskowanie liczone per piksel; ton nigdy nie przekracza 0,62, a kąt kreski to **pole ciągłe** interpolowane między kaflami, więc materiały przechodzą jeden w drugi bez szwów.
- **Ciemność to nie mgła wojny, tylko to, o czym nikt nie myśli.** Żywe — pamiętane — nieznane (czysta ciemność).
- **Jaskinia ma tył**: pustka dostaje własną, rzadszą kreskę zależną od wolnego szumu, więc komora czyta się jak wnętrze, nie jak dziura.
- **Poświata** liczona z osobnego bufora emisji — świecą wyłącznie ogień, kuźnie, glify i kryształ, papier zostaje papierem.
- **Smugi światła** wpadają tylko tam, gdzie ktoś przebił się do nieba, i kończą się tam, gdzie kończy się pamięć.
- Woda ma jasne lustro, sylwetki mają cień kontaktowy i są kreskowane tym samym rastrem co skała.

### Świat

Ekologia zamiast balansu: pojemność każdej rasy wynika z jej sposobu istnienia (grzyb i padlina, liczba kuźni, liczba cudzych dzieci, szaleństwo głębi), a jej przekroczenie bije w głód kwadratem nadmiaru. Dzięki temu Ślepy Lud faluje w cyklu boomu i załamania zamiast rosnąć w nieskończoność, a dominacja trzyma się przedziału 0,34–0,66 przez 40 tysięcy tików.

**Sen** przychodzi z monokultury albo z pustki. Budzi z niego tylko wojna, którą sam rozpętałeś: każda śmierć w walce z udziałem nacji założonej przez twojego proroka cofa powiekę — także gdy obie strony są tej samej krwi. Wojny toczone bez ciebie nie budzą.

Pielgrzymi schodzą pod rdzeń tylko wtedy, gdy spod niego da się wrócić do gniazda; zeskok do wielkiej jaskini byłby drogą w jedną stronę. Wąski szyb wydrążony przez gracza wystarczy — po jego ścianach da się wspiąć.

## Uruchomienie

Potrzebny [Node.js](https://nodejs.org) 18 lub nowszy.

```bash
git clone https://github.com/kanalpatryk-netizen/Trzewoa.git
cd Trzewoa
npm install
npm run dev     # http://localhost:5180
npm run pack    # trzewia.html — jeden plik, działa z file://
```

## Testy

```bash
npm test               # świat + skorupa (szybkie, kończą się błędem, gdy coś pękło)
npm run test:swiat     # 100 gór: przedsionek pod rdzeniem ma być suchy
npm run test:skorupa   # 12 gór z wymuszoną wartą: droga po ≤8 pęknięciach i Uwolnienie
npm run test:balans    # pomiar długości partii bez gracza i z automatem (kilka minut)
npm run test:nakladanie  # przy działającym npm run dev: czy interfejs nie nachodzi na siebie na 8 rozmiarach ekranu
```

## Czego świadomie nie ma

Drzewka technologii, bezpośredniej kontroli jednostek, pasków zdrowia, ikon nad głowami,
liczb w interfejsie gry, „poprawnej" rasy i Cichych pokazanych wprost.
