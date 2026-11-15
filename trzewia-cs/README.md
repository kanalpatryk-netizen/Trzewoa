# Trzewia w C# (.NET 10 + SkiaSharp)

Przeniesienie gry z [`alpha-1/`](../alpha-1/) (TypeScript, Canvas 2D, Electron) na C# — szybki program na Windows
w folderze jak gry ze Steama. Plan, etapy, decyzje i ryzyka: [`PLAN.md`](PLAN.md). `alpha-1/` zostaje bez zmian jako wzorzec.

**Stan (15.11):** przeniesione wszystko, z dźwiękiem — cały dźwięk to pliki MP3 w `dane/dzwieki/` (spis: `SPIS.md`),
nagrane kodem gry TS, a gra C# je odtwarza (`src/Trzewia.Gra/Dzwiek/`, `src/Trzewia.Gra/Aplikacja/Dzwiek.cs`):
film intro, ekran ładowania, menu, gra (świat, lud, księga, okno postaci, budowa, ołtarz, karty wydarzeń, alarmy,
zapiski, atlas, panel dewelopera), samouczek (15 rozdziałów), ustawienia, osiągnięcia, atlas z menu, kronika końca,
zapis do plików gracza i kursor-rękawica. Symulacja jest bit w bit taka sama jak w TS (testy złote), a ekrany —
w końcowym porównaniu z grą TS (`narzedzia/ekrany`, test `PorownanieEkranow`) różnią się o najwyżej 1,3% pikseli.
Postacie to duszki (sprite'y) z arkuszy PNG (`dane/grafika/duszki/`), a dłonie (z otchłani, demona, anielska) —
model 3D (`dane/grafika/modele/*.glb`). Świadome różnice względem TS: `PLAN.md`, część 5.

Duszki i model dłoni nadają się też do Unity i Godota — opis i importer: [`unity/README.md`](unity/README.md).

## Warstwy (żeby dało się potem przenieść grę do Unity albo Godota)

| Projekt | Co | Cel |
|---|---|---|
| `src/Trzewia.Symulacja` | symulacja, nastawy, bot | netstandard2.1, C# 9, bez bibliotek |
| `src/Trzewia.Gra` | rysunek, ekrany, interfejs, dźwięk, ustawienia — rysuje tylko przez `IPlotno` (Canvas 2D) | netstandard2.1, C# 9 |
| `src/Trzewia.Skia` | `IPlotno` na SkiaSharp, kroje, shadery | netstandard2.1, C# 9 |
| `src/Trzewia` | Trzewia.exe: okno SDL3, karta, dźwięk, pliki | .NET 10 |

Szczegóły i zasady pisania warstw przenośnych: `PLAN.md`, punkt 3.0. Kod przeniesiony z TS ma te same nazwy co w TS
(pola, nastawy, polecenia płótna `ctx.fillStyle`, `ctx.arc`…), żeby porównanie z wzorcem było linijka w linijkę;
nowy kod C# (okno, gospodarz) ma zwykłe nazwy C#.

## Budowa

Potrzebny .NET 10 SDK.

```bash
./buduj.sh                      # publikacja/win-x64/Trzewia/ i publikacja/Trzewia-win-x64.zip
./buduj.sh win-x64 jeden-plik   # jeden Trzewia.exe na testy
./buduj.sh linux-x64            # wersja na Linuksa: publikacja/Trzewia-linux-x64.tar.gz
dotnet test                     # testy
```

Na Windows: `.\buduj.ps1` (albo `.\buduj.ps1 -JedenPlik`).

Folder gry:

```
Trzewia/
├── Trzewia.exe
├── *.dll          (gra, .NET, SkiaSharp, SDL3, ANGLE, HarfBuzz)
└── dane/
    ├── czcionki/  (kroje pisma, TTF)
    ├── dzwieki/   (cały dźwięk gry w MP3 i spis — SPIS.md)
    ├── grafika/   (duszki, freski, tekstury, ikony, modele dłoni, menu, kursor)
    └── filmy/     (intro.klatki — film intro jako klatki WebP)
```

Zapis, ustawienia, klawisze i dziennik (`dziennik.txt` — karta graficzna i błędy) trafiają do
`Dokumenty\My Games\Trzewia\` (Windows) albo `~/.local/share/Trzewia/` (Linux).

Na Linuksie (np. Mint): `tar -xzf Trzewia-linux-x64.tar.gz`, potem `./Trzewia/Trzewia` (albo dwuklik na pliku
`Trzewia` w folderze). Grafika idzie przez OpenGL — sterownik karty jak do innych gier.

## Przełączniki (dla twórców i testów)

`Trzewia.exe --pomoc` wypisuje wszystkie. Najważniejsze: `--dev` (tryb deweloperski), `--opengl` / `--angle` (droga do
karty), `--okno`, `--rozmiar 1920x1080`, `--licznik` (F3 od startu), `--po 10 --pomiar` (po 10 s wypisz wynik licznika),
`--zrzut plik.png`, `--ekran gra` (bez intro, po ładowaniu od razu nowa partia; też `samouczek`, `ustawienia`…).

## Porównanie z grą TS

Narzędzia w `narzedzia/` rysują to samo oryginalnym kodem TS w Chromium (esbuild + Playwright), a testy C# kładą obrazy
obok siebie (`testy/wyniki/*.png`: TS | C# | różnica ×4):

```bash
node narzedzia/ekrany/porownaj.mjs             # ekrany 1366×820 → testy/zlote/ekrany/
node narzedzia/ekrany/porownaj.mjs 1920x1080   # to samo w Full HD (skala ≈ 1,32)
node narzedzia/plyta/porownaj.mjs              # sama płyta świata, 6 scen
dotnet test --filter PorownanieEkranow         # C#: miary różnicy i obrazy porównania
```

Film intro: `node narzedzia/intro/spakuj.mjs` (ffmpeg) składa `alpha-1/filmy/intro.mp4` w `dane/filmy/intro.klatki`.

Dźwięk: `node narzedzia/dzwieki/nagraj.mjs` (ffmpeg z LAME) nagrywa od nowa cały dźwięk gry TS do `dane/dzwieki/` —
nadpisuje pliki, więc podmienione ręcznie dźwięki trzeba potem włożyć jeszcze raz. Podmiana jednego dźwięku: wystarczy
położyć nowy MP3 (48 kHz, stereo) pod tą samą nazwą; nowe warianty (`-5`, `-6`…) trzeba też dopisać do `spis.json`.

## Kroje pisma

`dane/czcionki/*.ttf` to te same kroje co w `alpha-1/src/render/fonts.ts` (tam WOFF2 w base64), rozpakowane do TTF:
`python3 narzedzia/kroje.py` (potrzebuje `pip install fonttools brotli`); skrypt sprawdza polskie znaki.
