# Trzewia

Sandbox boga osadzony w podziemiu, w całości 2D, w konwencji XIX-wiecznej ryciny.

**Nie grasz bogiem, który rządzi podziemiem — grasz podziemiem, a ono jest głodne.**

## Co jest w grze

| Warstwa | Zawartość |
|---|---|
| **Menu** | powrót do trwającej gry, nowa góra, samouczek, bestiariusz, ustawienia — wszystko rysowane tą samą kreską, co świat |
| **Samouczek** | 13 kroków i 12 scen: przerywnik z własną ryciną, po nim jedno konkretne zadanie na tę samą mechanikę |
| **Bestiariusz** | stała karta wiedzy: pięć czasowników z kosztami, sześć ras ze sposobem istnienia, trzy zasoby, przypływy i zakończenia. Liczby brane wprost z kodu, więc nie zdezaktualizują się |
| **Ustawienia** | dźwięk, obraz, świat oraz **pełna lista sterowania z przypisywaniem klawiszy** |
| **Rozgrywka** | przekrój góry 176×240, sześć sposobów istnienia, pięć czasowników, trzy zasoby, przypływy, zapis stanu |
| **Kronika** | ekran końcowy ze spisaną legendą tego, czym byłeś |
| **Dźwięk** | rezonans świata (kucie, modlitwa, ton zależny od głębokości) i osobna warstwa muzyki — powolne akordy frygijskie i uderzenia w metal, wszystko syntezowane w locie |

## Samouczek — sześć poleceń, nie wykład

Każdy krok to jedna rzecz do zrobienia, z **podświetlonym miejscem na planszy**,
gotowym narzędziem w ręku i zdaniem o tym, co się właśnie stało:

1. **Znajdź swoich mieszkańców** — kamera dowozi do gniazda, przy nim stoi imię nacji
2. **Popatrz, jak rysunek sam się dopisuje** — pamięć i ciemność
3. **Trzy organy w ramie obrazu** — Krew, Wiara, Otchłań
4. **Nakarm ich** — zasiej grzyb w zaznaczonym miejscu
5. **Otwórz im drogę** — wydrąż korytarz w zaznaczonej skale
6. **Kto jeszcze w tobie mieszka** — sześć sposobów istnienia
7. **Zrób proroka** — dotknij zaznaczonego stworzenia i wybierz myśl (czas stoi)
8. **Zrób jawny cud** — Znak przy gnieździe
9. **Zmień im krew** — Skaź na zaznaczonym stworzeniu (czas stoi)
10. **Przetrzymaj przypływ** — z powierzchni schodzą ludzie
11. **To jest twój rdzeń** — skorupa, rytuał i oba zakończenia
12. **Popatrz na wstęgę warstw** — spis ras i zasypianie
13. **Otwórz zapiski** — cała kronika pod `K`

Nic nie przełącza się samo: krok kończy dopiero **„Dalej →"**. Dwa kroki z celowaniem
zatrzymują czas, żeby stworzenie nie uciekło spod pierścienia.

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

## Czego świadomie nie ma

Drzewka technologii, bezpośredniej kontroli jednostek, pasków zdrowia, ikon nad głowami,
liczb w interfejsie gry, „poprawnej" rasy i Cichych pokazanych wprost.
