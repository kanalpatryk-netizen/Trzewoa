# LOCH ASCII — mała gra do Unity

Osobna, mała gra (nie część Trzewi): loch widziany **z trzeciej osoby**, w „3D”, narysowany **w całości znakami
ASCII**. Wędrowiec z pochodnią szuka trzech kryształów i bramy; duchy przenikają przez ściany.
Jedna partia trwa 1–3 minuty, loch jest za każdym razem inny.

Cała gra to jeden plik C#: [`LochAscii/Assets/LochAscii.cs`](LochAscii/Assets/LochAscii.cs). Nie ma obrazków,
czcionek ani dźwięków w plikach — czcionka 5×7 i dźwięki powstają w kodzie.

## Jak uruchomić

**Sposób 1 — gotowy projekt.** W Unity Hub: *Add → Add project from disk* i wskaż folder `unity-ascii/LochAscii`.
Hub zapyta o wersję edytora — wybierz tę, którą masz (projekt nie jest przypisany do żadnej konkretnej, Unity samo
dorobi resztę ustawień). Po otwarciu wciśnij **Play**.

**Sposób 2 — jeden plik.** Przeciągnij `LochAscii.cs` do folderu *Assets* dowolnego projektu Unity i wciśnij **Play**.

Niczego nie trzeba podpinać ani ustawiać: gra sama tworzy swój obiekt po wciśnięciu Play (i kamerę, jeśli w scenie
jej nie ma). Żeby się jej pozbyć, wystarczy usunąć plik.

## Jak grać

- **Cel:** zbierz 3 kryształy (`*`), wtedy brama (`E`) się otworzy — wyjdź nią.
- **Duchy** (`G`) błąkają się po lochu i przenikają przez ściany. Gdy wyczują postać, lecą prosto na nią.
  Dotknięcie zabiera jedno z trzech żyć.
- **Błysk pochodni** odpędza duchy, które są blisko — ale błysków jest tylko kilka na loch.
- Mapa na panelu pokazuje to, co postać już widziała, i zawsze pokazuje duchy.

| Klawisz | Co robi |
|---|---|
| W / S albo strzałki góra / dół | naprzód / w tył |
| A / D albo strzałki lewo / prawo | obrót |
| Q / E | krok w bok |
| Spacja | błysk pochodni |
| 1 / 2 / 3 | poziom trudności (na ekranie tytułowym i po partii) — od razu zaczyna grę |
| Enter | start / nowy loch |
| R | nowy loch w trakcie gry |
| Esc | ekran tytułowy |

### Poziomy trudności

| Poziom | Duchy | Błyski | Duch leci | Wyczuwa postać z |
|---|---|---|---|---|
| 1 — łatwy | 1 | 4 | wolno | 4 kafli |
| 2 — normalny | 2 | 3 | średnio | 5 kafli |
| 3 — trudny | 3 | 2 | szybko | 6,5 kafla |

Liczby są na górze pliku gry, w tablicach `P_DUCHY`, `P_FLARY`, `P_PED`, `P_WECH`. Każdy zebrany kryształ
przyspiesza duchy.

## Jak to jest zrobione

- Ekran to siatka 106×45 znaków: z lewej widok 3D (80 kolumn), z prawej panel z mapą.
- Widok 3D: z kamery, która stoi za plecami postaci, idzie po jednym promieniu na kolumnę znaków, aż trafi w mur.
  Stąd wysokość ściany w tej kolumnie; cegły, podłoga w szachownicę i światło pochodni liczą się z miejsca trafienia.
- Znaki są malowane własną czcionką na teksturze i pokazywane na cały ekran, więc gra wygląda tak samo na każdym
  komputerze.
- Działa ze starym i z nowym systemem wejścia Unity (plik sam wybiera przy kompilacji).

## Próby bez Unity (`proba~/`)

Gra **nie była uruchamiana w edytorze Unity** — w środowisku, w którym powstała, Unity nie ma. Zamiast tego plik gry
kompiluje się prawdziwym kompilatorem C# z namiastką Unity (`proba~/Namiastka.cs`) i gra w niego bot:

```bash
cd unity-ascii/proba~
dotnet run -c Release -- bot 40             # bot przechodzi 40 lochów na każdym poziomie
dotnet run -c Release -- losowo 60          # losowe klawisze — szukanie błędów
dotnet run -c Release -- klatki 7 klatki    # zapisuje obrazy wybranych chwil gry (PPM) i ich tekst
dotnet build -c Release -p:Wejscie=ENABLE_INPUT_SYSTEM   # to samo z nowym systemem wejścia
```

Folder kończy się znakiem `~`, żeby Unity go pomijało, gdyby ktoś wrzucił do *Assets* cały folder `unity-ascii`.
