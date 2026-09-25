# Trzewia

Sandbox boga osadzony w podziemiu, w całości 2D, w konwencji XIX-wiecznej ryciny.

**Nie grasz bogiem, który rządzi podziemiem — grasz podziemiem, a ono jest głodne.**

## Co jest w grze

| Warstwa | Zawartość |
|---|---|
| **Menu** | powrót do trwającej gry, nowa góra, samouczek, bestiariusz, ustawienia — wszystko rysowane tą samą kreską, co świat |
| **Samouczek** | 10 krótkich rozdziałów z listą czynności do odhaczenia; palec wskazuje dokładnie ryt, słowo, przycisk albo miejsce na płycie |
| **Bestiariusz** | stała karta wiedzy: pięć czasowników z kosztami, sześć ras ze sposobem istnienia, trzy zasoby, przypływy i zakończenia. Liczby brane wprost z kodu, więc nie zdezaktualizują się |
| **Ustawienia** | dźwięk, obraz, świat oraz **pełna lista sterowania z przypisywaniem klawiszy** |
| **Rozgrywka** | przekrój góry 176×240, sześć sposobów istnienia, pięć czasowników, trzy zasoby, przypływy, zapis stanu |
| **Kronika** | ekran końcowy ze spisaną legendą tego, czym byłeś |
| **Dźwięk** | rezonans świata (kucie, modlitwa, ton zależny od głębokości) i osobna warstwa muzyki — powolne akordy frygijskie i uderzenia w metal, wszystko syntezowane w locie |

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
  core/           rng, audio (rezonans), music, save, settings-store, keybinds
  render/         engrave (sitodruk kreskowania), plate (rama i organy),
                  overlay (sylwetki, cząsteczki), bloom, shafts, ink, palette, camera
  sim/            world, sim, creatures, races, tiles
  powers/         pięć czasowników
  ui/             ryty, karta bestiariusza w grze
```

### Obraz

- **Rycina, nie pixel art.** Kreskowanie liczone per piksel; ton nigdy nie przekracza 0,62, a kąt kreski to **pole ciągłe** interpolowane między kaflami, więc materiały przechodzą jeden w drugi bez szwów.
- **Ciemność to nie mgła wojny, tylko to, o czym nikt nie myśli.** Żywe — pamiętane — nieznane (czysta ciemność).
- **Jaskinia ma tył**: pustka dostaje własną, rzadszą kreskę zależną od wolnego szumu, więc komora czyta się jak wnętrze, nie jak dziura.
- **Poświata** liczona z osobnego bufora emisji — świecą wyłącznie ogień, kuźnie, glify i kryształ, papier zostaje papierem.
- **Smugi światła** wpadają tylko tam, gdzie ktoś przebił się do nieba, i kończą się tam, gdzie kończy się pamięć.
- Woda ma jasne lustro, sylwetki mają cień kontaktowy i są kreskowane tym samym rastrem co skała.

### Świat

Ekologia zamiast balansu: pojemność każdej rasy wynika z jej sposobu istnienia (grzyb i padlina, liczba kuźni, liczba cudzych dzieci, szaleństwo głębi), a jej przekroczenie bije w głód kwadratem nadmiaru. Dzięki temu Ślepy Lud faluje w cyklu boomu i załamania zamiast rosnąć w nieskończoność, a dominacja trzyma się przedziału 0,34–0,66 przez 40 tysięcy tików.

## Uruchomienie

```bash
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
```

## Czego świadomie nie ma

Drzewka technologii, bezpośredniej kontroli jednostek, pasków zdrowia, ikon nad głowami,
liczb w interfejsie gry, „poprawnej" rasy i Cichych pokazanych wprost.
