# Trzewia w C# (.NET 10 + SkiaSharp)

Przeniesienie gry z [`alpha-1/`](../alpha-1/) (TypeScript, Canvas 2D, Electron) na C# — szybki program na Windows
w folderze jak gry ze Steama. Plan, etapy, decyzje i ryzyka: [`PLAN.md`](PLAN.md). `alpha-1/` zostaje bez zmian jako wzorzec.

**Stan (13.11):** etap 1 (okno, pętla, wejście, publikacja) i etap 2 (symulacja — bit w bit jak w TS, testy złote,
zapis, bot) są gotowe. Z etapu 3 zrobione są **postacie**: nie rysuje ich już kod gry, tylko gotowe duszki (sprite'y)
z arkuszy PNG (`dane/grafika/duszki/`, podglądy JPG w `duszki-podglad/`), a **dłoń** (z otchłani, demona, anielska)
jest modelem 3D (`dane/grafika/modele/*.glb`) rysowanym na żywo. Na ekranie jest ekran próbny: prawdziwa góra z botem,
postacie z duszków i dłonie (spacja — pauza, + − tempo, N — następna góra, L — kropki zamiast duszków). Świat
(rycina skały, mrok, budowle, interfejs) — dalsza część etapu 3 i kolejne etapy.

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
    └── czcionki/  (dalej: grafika/, dzwieki/, filmy/, nastawy/)
```

Zapis, ustawienia, klawisze i dziennik (`dziennik.txt` — karta graficzna i błędy) trafiają do
`Dokumenty\My Games\Trzewia\` (Windows) albo `~/.local/share/Trzewia/` (Linux).

Na Linuksie (np. Mint): `tar -xzf Trzewia-linux-x64.tar.gz`, potem `./Trzewia/Trzewia` (albo dwuklik na pliku
`Trzewia` w folderze). Grafika idzie przez OpenGL — sterownik karty jak do innych gier.

## Przełączniki (dla twórców i testów)

`Trzewia.exe --pomoc` wypisuje wszystkie. Najważniejsze: `--dev` (tryb deweloperski), `--opengl` / `--angle` (droga do
karty), `--okno`, `--rozmiar 1920x1080`, `--licznik` (F3 od startu), `--po 10 --pomiar` (po 10 s wypisz wynik licznika),
`--zrzut plik.png`.

## Kroje pisma

`dane/czcionki/*.ttf` to te same kroje co w `alpha-1/src/render/fonts.ts` (tam WOFF2 w base64), rozpakowane do TTF:
`python3 narzedzia/kroje.py` (potrzebuje `pip install fonttools brotli`); skrypt sprawdza polskie znaki.
