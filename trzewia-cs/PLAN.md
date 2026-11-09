# Trzewia w C# — plan przeniesienia (etap 0)

Stan na 9.11.2026. Plan do akceptacji użytkownika: **przed etapem 1 nic nie kodujemy**.
Zadanie: przepisać grę z `alpha-1/` (TypeScript, Canvas 2D, Electron) na C# (.NET 10 LTS) z SkiaSharp,
wiernie, jako program na Windows w folderze jak gry na Steamie.

## W skrócie

- **Wzorzec:** `alpha-1/` z gałęzi `claude/zealous-brown-e2160u` (commit `5a9b7a7`, 8.11 — licznik F3, rycina
  w osobnym wątku, Ustawienia → Wydajność). Ta gałąź nie jest jeszcze na `main`. Symulacja jest tam taka sama jak
  na `main` (commit `5a9b7a7` jej nie rusza). Moja gałąź `claude/trzewia-cs` wyrasta z niej.
- **Biblioteki:** SkiaSharp (rysunek na karcie), **SDL3** (okno, mysz, klawiatura, wyjście dźwięku, kursor) zamiast
  Silk.NET, **ANGLE** (OpenGL ES na Direct3D 11 — ta sama droga do karty, z której dziś korzysta Electron),
  NLayer (MP3), HarfBuzzSharp (składanie tekstu). Wszystko na licencjach MIT/BSD/zlib, bez instalacji.
- **Rysunek:** cienka warstwa „płótno” w C#, która ma te same polecenia co Canvas 2D (`save`, `fillStyle`,
  `globalCompositeOperation`, `ellipse`…), ale rysuje Skią na karcie. Pliki z `src/render/` przenoszą się wtedy
  linijka w linijkę. Chrome też rysuje Canvas 2D Skią, więc obraz będzie bardzo bliski. Rycina świata, najdroższa
  część klatki, idzie do shadera (SkSL) w pełnej rozdzielczości.
- **Symulacja:** przeniesiona 1:1 i deterministyczna. Testy złote (ziarna 1–20, skrót stanu co 1000 tików do 60 000)
  muszą dać te same skróty w TS i w C#. Do tego trzeba odtworzyć kilka zachowań silnika JavaScript (sortowanie,
  `Math.hypot`, `Math.sin`, `| 0`) — opisane w punkcie 3.5.
- **Czas:** ok. 22–33 długich sesji pracy (szczegóły w punkcie 4). Pierwszą grywalną wersję widać po etapie 5.
- **Blokada teraz:** w tym środowisku nie ma sieci do NuGet, .NET ani npm. Bez niej nie zacznę etapu 1
  (punkt 7).

---

## 0. Wzorzec i gałąź

| | |
|---|---|
| Wzorzec | `alpha-1/` w commicie `5a9b7a7` (gałąź `claude/zealous-brown-e2160u`, 8.11) |
| Dlaczego nie `main` | zadanie każe przenieść licznik F3 jak w `src/render/licznik-wydajnosci.ts` i kategorię „Wydajność” — są tylko na tej gałęzi |
| Moja gałąź | `claude/trzewia-cs` (od `5a9b7a7`); kod C# tylko w `trzewia-cs/` |
| `alpha-1/` | bez zmian; jedyny wyjątek — skrypt testów złotych w `alpha-1/scripts/` (zgłaszany w commicie) |
| Zmiany w `alpha-1/` w trakcie | jeśli gra TS będzie się dalej zmieniać, przenoszę do konkretnego commitu, a potem doganiam różnicę (`git diff 5a9b7a7..`) |

---

## 1. Co jest w grze TS

60 907 linii w 232 plikach `.ts` (z gałęzi wzorca; zadanie podawało ok. 60 tys. w 224 — doszły pliki wątku ryciny
i licznika F3).

| Moduł | Linie | Pliki | Co to jest | Dokąd w C# | Etap |
|---|---:|---:|---|---|---|
| `render/` | 30 230 | 96 | rycina świata, postacie, interfejs, efekty | `Trzewia/Rysunek/` | 3, 4, 5 |
| `sim/` | 12 747 | 34 | symulacja (120 tików/s) | `Trzewia.Symulacja/Symulacja/` | 2 |
| `app/` | 7 212 | 19 | pętla, ekrany, bot, wejście | `Trzewia/Aplikacja/`, bot → `Trzewia.Symulacja/Bot/` | 1, 2, 5 |
| `nastawy/` | 3 972 | 43 | wszystkie liczby gry | `Trzewia.Symulacja/Nastawy/` | 2 (+ przy rysunku) |
| `core/` | 2 405 | 16 | dźwięk, zapis, klawisze, ustawienia, RNG, kursor | `Trzewia/Rdzen/`, `Trzewia/Dzwiek/` | 1, 2, 6 |
| `atlas/` | 1 680 | 3 | atlas (tablice) | `Trzewia/Atlas/` | 5 |
| `cutscene/` | 1 544 | 16 | przerywniki | `Trzewia/Przerywniki/` | 5 |
| `ui/` | 611 | 1 | podpisy i dymki interfejsu | `Trzewia/Interfejs/` | 5 |
| `powers/` | 320 | 2 | ryty: Nakarm, Szepnij, Cud | `Trzewia.Symulacja/Moce/` | 2 |
| `grafiki/`, `main.ts` | 186 | 2 | wczytywanie obrazków, start | `Trzewia/Zasoby/`, `Program.cs` | 1, 3 |

**Zasoby:** `obrazy/` (12 plików: kursor, menu, pomnik), `src/grafiki/` (freski, ikony, dłonie, tekstury — 41 plików),
`filmy/intro.mp4` (9,1 s, 1920×1080, 30 kl/s, H.264, **bez dźwięku**, 340 KB), `gra222/dzwieki/` (69 nagrań .mp3,
7,7 MB), 4 kroje pisma wpisane w `render/fonts.ts` jako WOFF2 w base64 („Trzewia Tekst” zwykły i kursywa, „Trzewia
Tytul”, „Trzewia Pismo”), ikona `electron/zasoby/ikona.ico`.

**Czego nie przenoszę:** kod tylko pod telefon (`core/android.ts`, układy `TELEFON`, `plate.waski`, `niski` —
69 miejsc), maszyneria wątku ryciny (`render/rycina*.ts` — zastępuje ją shader), wybór karty z Electrona
(`core/karta.ts`, `electron/`). **Do decyzji użytkownika:** okienko dewelopera (`app/devpanel.ts`, DOM) i tryb
obserwatorium (`app/obserwowany.ts`, `scripts/obserwatorium/`). Bota przenoszę zawsze — jest potrzebny do testów.

Pełna mapa plik po pliku jest w **Dodatku A** na końcu.

---

## 2. Biblioteki

Wersje sprawdzone 9.11.2026; w etapie 1 biorę najnowsze stabilne.

| Do czego | Wybór | Dlaczego | Odrzucone |
|---|---|---|---|
| Środowisko | .NET 10 LTS, C# 14 | decyzja użytkownika; wsparcie do 2028 | — |
| Rysunek 2D | **SkiaSharp** 4.155 (MIT) + `GRContext` na OpenGL | Chrome rysuje Canvas 2D tą samą Skią — te same ścieżki, gradienty, tryby mieszania, rozmycia; do tego shadery SkSL (`SKRuntimeEffect`) | — |
| Okno, wejście, pętla | **SDL3** przez `ppy.SDL3-CS` (SDL — zlib, wiązania — MIT; wersja 2026.1002.1) | jedna biblioteka natywna (ok. 2 MB) daje okno, kontekst GL/GLES, mysz z płynnym kółkiem, klawiaturę z układem klawiszy, **wyjście dźwięku**, kursor z obrazka, pełny ekran, skalowanie DPI; wiązania utrzymuje ppy dla osu! | **Silk.NET**: potrzebuje GLFW **i** OpenAL Soft (dwie biblioteki natywne), wersja 3.0 wciąż w przygotowaniu |
| Droga do karty na Windows | **ANGLE** (`Avalonia.Angle.Windows.Natives`, BSD; libEGL + libGLESv2) — OpenGL ES na Direct3D 11 | tak rysuje dziś Electron/Chrome, więc zachowanie na kartach Intel/AMD/NVIDIA będzie takie jak w obecnym .exe; omija słabe sterowniki OpenGL na laptopach; tego samego używa Avalonia ze SkiaSharp | — |
| Zapasowa droga | zwykły OpenGL (WGL) przez SDL3 | gdy ANGLE nie wstanie; przełącznik w Ustawieniach → Wydajność i w F3 | Direct3D w SkiaSharp — brak publicznego API |
| Składanie tekstu | **HarfBuzzSharp** + `SkiaSharp.HarfBuzz` (MIT) | Chrome składa tekst HarfBuzzem (kerning, ligatury) — te same odstępy liter | samo `SKCanvas.DrawText` (bez kerningu) |
| Dekodowanie MP3 | **NLayer** (MIT, w całości w C#) | bez bibliotek natywnych; 69 krótkich nagrań dekoduje się raz, przy ładowaniu | NAudio (wyjście tylko na Windows), FFmpeg (ciężki) |
| Dźwięk — synteza | **własny silnik węzłów** w C# (oscylator, wzmacniacz z automatyką, filtr dwubiegunowy, splot, kompresor, kształtowanie fali, panorama, odtwarzacz bufora) | Web Audio ma dokładnie opisane wzory; przeniesione wiernie brzmią tak samo; wyjście przez SDL3 | gotowe biblioteki — inne algorytmy, inne brzmienie |
| Film intro | **klatki JPEG/WebP dekodowane Skią** (w osobnym wątku) | zero dodatkowych bibliotek, działa na Windows i Linuksie; film nie ma dźwięku; 9 s × 30 kl/s = 274 klatki | LibVLCSharp (ok. 100+ MB), FFmpeg (dziesiątki MB DLL), Media Foundation (brak w Windows N, nie da się sprawdzić na Linuksie) |
| Testy | xUnit (Apache 2.0), `dotnet test` | standard; długie partie bota w osobnej kategorii | — |

---

## 3. Architektura

### 3.1 Foldery i projekty

```
trzewia-cs/
├── PLAN.md, README.md
├── Trzewia.sln
├── src/
│   ├── Trzewia.Symulacja/      bez grafiki i dźwięku: Js (zgodność z JavaScriptem), Rdzen/Rng, Nastawy/, Symulacja/,
│   │                           Moce/, Bot/, zapis do JSON — testy chodzą bez okna i karty
│   └── Trzewia/                Trzewia.exe: Program.cs, Okno/ (SDL3, GL, pętla), Plotno/ (Canvas 2D na Skii),
│                               Rysunek/ (jak src/render), Aplikacja/ (jak src/app), Atlas/, Przerywniki/,
│                               Interfejs/, Dzwiek/, Rdzen/ (ustawienia, klawisze, osiągnięcia, kursor, F3), Zasoby/
├── testy/
│   ├── Trzewia.Testy/          test świata (100), test pomnika (12), testy złote, zgodność Js, balans bota (długi)
│   └── zlote/                  skróty stanu wypisane przez wersję TS
├── dane/                       grafika/ dzwieki/ filmy/ czcionki/ (nastawy/ — opcjonalnie)
├── narzedzia/                  konwersja krojów (WOFF2 → TTF) i filmu (mp4 → klatki)
└── buduj.ps1, buduj.sh
```

Nazwy plików C# idą za plikami TS (`budowa-schodow.ts` → `BudowaSchodow.cs`, `lud/walka-rycerza.ts` →
`Lud/WalkaRycerza.cs`), nazwy klas, pól i komentarze po polsku jak w TS. Duże pliki (`app/screens/game.ts`,
`sim/creatures.ts`) zostają jedną klasą, ewentualnie podzieloną na części `partial` w tym samym folderze.

### 3.2 Okno, pętla, karta graficzna

- SDL3 otwiera okno z kontekstem OpenGL ES 3 przez ANGLE (Windows) albo zwykłym OpenGL (Linux, zapas na Windows).
  Na nim `GRContext` SkiaSharp i `SKSurface` z ramki okna. Synchronizacja z odświeżaniem ekranu (vsync) domyślnie;
  „Limit klatek” z Ustawień → Wydajność jak w TS.
- **F11** — pełny ekran bez ramki (przełączany szybko, bez zmiany trybu monitora).
- **Skalowanie** jak `app/app.ts` i `nastawy/ekran.ts`: z rozmiaru okna i skali ekranu Windows (SDL podaje ją jak
  `devicePixelRatio`) liczę `ekran.skala`, logiczny rozmiar ekranu i rozmiar płótna; „Rozdzielczość obrazu”
  100/85/75/60% rysuje do mniejszej powierzchni i rozciąga ją na okno.
- **Pętla** jak w `app/screens/game.ts`: 120 tików świata na sekundę z akumulatorem czasu, najwyżej
  `TEMPO.maxNaKlatke` tików i `TEMPO.budzetKlatkiMs` ms symulacji na klatkę, bot po każdym tiku jak w grze.
  Rysunek dostaje tik z ułamkiem (`render/zegar-gry.ts`).
- **Wejście:** zdarzenia SDL zamienione na to samo, co dziś dostaje gra z przeglądarki (wciśnięcie, ruch, puszczenie,
  kółko, klawisz). Kółko skalibruję tak, by jeden ząbek przybliżał tyle co w wersji Electron (Chrome na Windows
  podaje 100 jednostek na ząbek). Klawisze zapisuję tymi samymi nazwami co `KeyboardEvent.key` w
  `core/keybinds.ts` (`'Escape'`, `' '`, `'+'`), więc plik klawiszy ma ten sam format.

### 3.3 Warstwa „płótno” — Canvas 2D na Skii

Klasa `Plotno` z tymi samymi poleceniami i stanem co `CanvasRenderingContext2D`, rysująca na `SKCanvas`:

- stos stanu (`save`/`restore`), przekształcenia (`translate`, `rotate`, `scale`, `setTransform`);
- `fillStyle`/`strokeStyle` jako barwa, gradient liniowy i kołowy (172 + 127 miejsc), wzór (`createPattern`, 8);
- ścieżki (`beginPath`, `moveTo`, `quadraticCurveTo` — 316, `bezierCurveTo`, `ellipse` — 212, `arc`, `roundRect`,
  `Path2D` — 239) na `SKPath`;
- linie (`lineWidth`, `lineCap`, `lineJoin`, `setLineDash` — 61);
- `globalAlpha` i `globalCompositeOperation` → `SKBlendMode` (`lighter` — 78 razy, `multiply`, `source-atop`,
  `soft-light`, `destination-out`, `source-in`, `screen`, `saturation`);
- cień (`shadowBlur` — 55; rozmycie o sigmie `shadowBlur/2`, jak liczy Chrome) i `filter` (`blur`, `brightness`,
  `contrast`, `grayscale` — 12) jako filtry obrazu Skii;
- tekst (`font`, `textAlign`, `textBaseline`, `fillText` — 201, `measureText` — 102) z HarfBuzzem;
- płótna pomocnicze (`OffscreenCanvas` — 10) jako powierzchnie na karcie, `drawImage` (71) z tą samą jakością
  wygładzania (`imageSmoothingQuality`);
- odczyt pikseli (`getImageData`, 2 miejsca: atlas kukły demona, obrys kursora) — tylko raz przy ładowaniu, na
  powierzchni w pamięci, nie na karcie.

Dzięki temu pliki z `src/render/` przenoszą się prawie mechanicznie, z tym samym podziałem na pliki. Wydajność:
`Plotno` nie tworzy obiektów w każdej klatce (pędzle, ścieżki i gradienty z puli), a rysunki, które rzadko się
zmieniają (oprawa księgi, ramy, tablice), nagrywa raz jako `SKPicture` i odtwarza.

### 3.4 Rycina świata jako shader (oraz mrok i poświata)

`render/engrave.ts` (1 959 linii) liczy obraz piksel po pikselu na procesorze. Układ jest już „shaderowy”:

1. **Na kafel** (`computeLight`, `swiatloLudu`, otoczenie 3×3): światło, pamięć (blaknięcie), kąt kreskowania,
   bliskość, odległość, otwartość, strop, magma, woda, „sól” (twardość), rodzaj kafla, miękkość, ślad, kucie. To liczy
   procesor, tylko gdy coś się zmieni, i wysyła jako tekstury (świat ma 192 × 240 = 46 080 kafli, więc całe pola to
   ok. 1–2 MB). Część pól już w TS jest skwantowana (np. kąt — tablica 257 wartości), więc wystarczą tekstury
   8‑bitowe; reszta w 16‑bitowych zmiennoprzecinkowych.
2. **Stałe z ziarna** (`losowe`, `noise`, `smooth`, `ziarno`, `szkic` 256×256, płaty Woronoja 4096 punktów,
   tablice cos/sin) — tekstury liczone raz przy starcie, tym samym kodem co w TS.
3. **Na piksel** — jeden shader SkSL rysowany na całej płycie: współrzędne świata z kamery, interpolacja wartości
   z rogów kafla, kreskowanie, płaty, rysy, kontury, granice warstw, szkic sinopii, ciecze, rdzeń. Ten sam kod co
   pętla `rytujRycine`, przepisany na arytmetykę zmiennoprzecinkową (SkSL nie ma operacji bitowych ani pętli
   o zmiennej długości; `& 255` na indeksie tablicy to w shaderze zawijanie tekstury).
4. **Pamięć obrazu:** gdy kamera stoi i nic się nie zmienia, płyta idzie z gotowej tekstury; przerysowanie tylko po
   ruchu kamery, zmianie pól albo w miejscach, które płyną (magma, woda, tętno rdzenia).

Skutek: rycina zawsze w pełnej rozdzielczości ekranu, bez zgrubnej odbitki i bez opóźnienia przy kółku; procesor
liczy tylko pola kafli. Ustawienie „Jakość: szybka” (dziś rycina w połowie rozdzielczości) zostaje — rysuje shader
do mniejszej tekstury.

**Mrok** (`render/mrok.ts`) i **poświata** (`render/bloom.ts`) to w TS rozmycie płótna i nałożenie trybem
mieszania. Na karcie Skia robi rozmycie shaderem, więc przenoszę je wiernie na `Plotno`; jeśli F3 pokaże, że
kosztują, przepiszę je na własny SkSL.

**Plan B**, gdyby SkSL okazał się za ciasny (limit instrukcji, brak potrzebnej funkcji): ten sam shader w GLSL ES 3.0
rysowany bezpośrednio w kontekście GL do tekstury, którą Skia bierze jako obraz (`GRBackendTexture`).

### 3.5 Symulacja deterministyczna

Symulacja (`sim/`, `nastawy/`, `powers/`, `core/rng.ts`, bot) idzie do osobnej biblioteki bez grafiki. Żeby C# dawał
**dokładnie** te same liczby co JavaScript (V8), trzymam się zasad:

| Co w TS | Pułapka w C# | Co robię |
|---|---|---|
| `number` (64‑bit) | `float` liczy w 32 bitach | wszędzie `double`; `+ − × ÷ √` dają w obu identyczne wyniki (IEEE 754) |
| `Float32Array` (`world.kucie`, szum) | odczyt w JS daje `double`, w C# `float × float` zostaje 32‑bitowe | tablice `float[]`, ale przy odczycie rzutowanie na `double` przed rachunkiem (`Math.fround` przy zapisie) |
| `Math.sin`, `cos`, `atan2` (13 miejsc w symulacji) | .NET woła bibliotekę C systemu — wynik może różnić się o ostatni bit | port implementacji z V8 (fdlibm, `ieee754.cc`) jako `Js.Sin` itd. |
| `Math.hypot` (116 miejsc) | V8 ma własny algorytm (dzielenie przez największą, sumowanie z kompensacją Kahana) | wierny port jako `Js.Hypot` |
| `Math.round` | C# domyślnie zaokrągla „do parzystej” | `Js.Round` = zaokrąglenie połówek w górę, jak JS |
| `x \| 0`, `>>> 0`, `Math.imul` | rzut `(int)` w C# nie zawija | `Js.ToInt32`, `Js.ToUint32`, `Js.Imul` (zawijanie modulo 2³²) |
| `Array.prototype.sort` | `List.Sort` jest niestabilne i inaczej woła porównanie; **w `sim/ruiny.ts` sortuje się z losowym porównaniem** (`() => rng.next() - 0.5`), więc wynik zależy od algorytmu | port sortowania z V8 (TimSort z wstawianiem binarnym dla krótkich tablic) jako `Js.Sort` — ta sama kolejność wywołań porównania; używany wszędzie zamiast `Sort` |
| `Map`, `Set`, `Object.keys` | `Dictionary` nie gwarantuje kolejności po usunięciach | kolekcje z kolejnością wstawiania (`JsMap`); przy obiektach — kolejność kluczy jak w JS (najpierw klucze liczbowe rosnąco) |
| liczba → tekst (zapis, kronika) | .NET pisze `1E+21`, JS `1e+21` | `Js.NumberToString` zgodne z JS |

Symulacja w TS nie używa `Math.random`, `Date.now` ani `performance.now` (sprawdzone), a budżet szukania drogi
(`sim/droga.ts`, `nowyTik`) jest liczbą prób, nie czasem — więc da się ją odtworzyć bit w bit.

**Testy złote:**
- Skrypt TS `alpha-1/scripts/test-zloty.mjs` (esbuild, jak pozostałe testy): ziarna 1–20, bot jak w grze (po
  każdym tiku karta, co `BOT_CO` = 60 tików ruch), co 1000 tików do 60 000 skrót stanu (FNV‑1a 64 po bajtach:
  kafle, kucie, postacie po kolei — położenie i liczby jako dokładne bity `double`, zasoby, stan RNG). Wynik:
  `trzewia-cs/testy/zlote/*.json` (1 200 skrótów).
- Test C# liczy to samo i porównuje. Przy pierwszej różnicy oba programy zrzucają pełny stan z tego tiku (JSON)
  — porównanie pól pokazuje, która wartość się rozjechała.
- Do tego przeniesione `scripts/test-swiata.mjs` (100 światów) i `scripts/test-pomnika.mjs` (12) oraz balans:
  96 partii bota w stylu „rozsądny” — w TS 92 wygrane (`alpha-1/README.md`); C# ma dać to samo, partia po partii.

**Nastawy:** klasy statyczne w C#, pole w pole jak obiekty w `src/nastawy/` (te same nazwy i komentarze).
Opcjonalnie: plik `dane/nastawy/<nazwa>.json` nadpisuje liczby przy starcie (bez niego — wartości z kodu).

### 3.6 Dźwięk

Inwentarz Web Audio w `core/`: 52 wzmacniacze (z automatyką `setValueAtTime`, `linearRampToValueAtTime`,
`exponentialRampToValueAtTime`, `setTargetAtTime`, `cancelScheduledValues`), 21 oscylatorów (sinus, piła, kwadrat, trójkąt), 16 filtrów
(pasmowy, dolnoprzepustowy), 8 odtwarzaczy bufora, 4 panoramy, splot (pogłos), kompresor, kształtowanie fali.

- Własny graf węzłów w C# liczący próbki w wątku dźwięku (48 kHz, float, stereo), wyjście przez strumień SDL3.
- Wzory jak w specyfikacji Web Audio i w Chromium: filtry z „Audio EQ Cookbook”, automatyka parametrów wg
  specyfikacji, oscylatory z ograniczonym pasmem (tablice fal jak w Chromium — bez trzasków aliasingu), kompresor —
  port `DynamicsCompressorKernel` z Chromium, splot w blokach (FFT).
- Nagrania .mp3 bez zmian, dekodowane NLayerem przy ładowaniu.
- **Sprawdzenie:** te same dźwięki nagrane offline w obu wersjach (TS przez `OfflineAudioContext` w Chromium
  bez okna, C# — ten sam graf do pliku WAV) i porównane widmem i na ucho.

### 3.7 Film intro

`filmy/intro.mp4` zamieniam raz (narzędzie `ffmpeg`) na 274 klatki JPEG albo WebP spakowane w jeden plik
`dane/filmy/intro.klatki` (spis + klatki). Gra dekoduje je Skią w osobnym wątku, kilka klatek do przodu, i pokazuje
co 1/30 s, z tym samym znaczkiem „spacja – pomiń”, wygaszeniem i bezpiecznikiem co `intro.ts`. Obraz ten sam, inna
kompresja; plik ok. 5–15 MB zamiast 340 KB (dokładnie — po próbie jakości w etapie 6).

### 3.8 Kroje pisma

Cztery kroje z `render/fonts.ts` (base64 WOFF2, przycięte do znaków gry) wypisuję do plików i zamieniam na TTF
(Skia na Windows nie czyta WOFF2). Kształty liter bez zmian. Sprawdzenie: wszystkie znaki z tekstów gry (także
ą ć ę ł ń ó ś ź ż i wielkie) są w krojach — test przechodzi po wszystkich napisach z kodu.

### 3.9 Zapis i pliki gracza

`Dokumenty\My Games\Trzewia\`: `zapis.json` (format z `core/save.ts`, z `v` = wersja, te same klucze i to samo
kodowanie base64 tablic), `ustawienia.json`, `klawisze.json`, `osiagniecia.json`, `atlas.json` (odkryte tablice).
Zapis atomowy (plik tymczasowy, potem podmiana) — gdy Dokumenty są w OneDrive, plik nigdy nie zostaje w połowie.
Ponieważ format jest ten sam, można później dodać wczytanie zapisu z wersji przeglądarkowej (wklejony tekst
z `localStorage`).

### 3.10 Licznik F3

Jak `render/licznik-wydajnosci.ts` i `core/wydajnosc.ts`: kl/s, czas klatki średni i najdłuższy, czas procesora na
klatkę z częściami (logika gry, pola ryciny, świat, mrok, poświata, postacie i efekty, interfejs, reszta) z paskami
(pełny pasek — 16,7 ms), **czas karty graficznej** (zapytania czasu GL, gdy karta je obsługuje), nazwa karty i droga
(ANGLE/Direct3D 11 albo OpenGL), rozmiar powierzchni, skala, limit klatek, a dodatkowo liczba sprzątań pamięci
(GC) — każde może szarpnąć klatką. Na czerwono progi jak w TS. Od etapu 1.

### 3.11 Wydanie

- `buduj.ps1` / `buduj.sh`: `dotnet publish -c Release -r win-x64 --self-contained` z ReadyToRun (bez rozgrzewania
  kodu przy pierwszych klatkach), potem kopia `dane/`. Wynik:
  ```
  Trzewia/
  ├── Trzewia.exe          (ikona z alpha-1/electron/zasoby/ikona.ico, opis pliku, wersja)
  ├── *.dll                (gra, .NET, SkiaSharp, SDL3, ANGLE, HarfBuzz)
  └── dane/grafika/ dzwieki/ filmy/ czcionki/ (nastawy/)
  ```
  Szacunkowo 60–110 MB (zależnie od przycięcia .NET), plus zip.
- Jeden plik na testy: ten sam kod z `-p:JedenPlik=true` — `PublishSingleFile`, biblioteki natywne rozpakowują się
  same, `dane/` wchodzi do środka jako zasoby (klasa `Zasoby` czyta z folderu albo z pliku).
- Workflow GitHub Actions na `windows-latest` buduje zip jako artefakt (nowy plik w `.github/workflows/`, `gra.yml`
  bez zmian).
- Sprawdzę też Native AOT (szybszy start, brak kompilacji w locie); wybór po pomiarze w etapie 1.

---

## 4. Etapy — kolejność, sprawdzanie, czas

„Sesja” to jedna długa sesja pracy, jak ta. Liczby to oszacowanie; najmniej pewne są etapy 2 (szukanie rozjazdów
w testach złotych) i 3 (wygląd ryciny w shaderze).

| Etap | Co | Jak sprawdzam | Sesje |
|---|---|---|---:|
| 0 | audyt i plan (ten plik) | akceptacja użytkownika | 1 |
| 1 | szkielet: okno, F11, skalowanie, pętla, Skia na karcie, ANGLE/GL, wejście, klawisze, F3, publikacja do folderu i jeden plik | `dotnet publish -r win-x64` daje działający folder; pod Xvfb okno z F3; zip do użytkownika — zrzut F3 z jego Windows | 1–2 |
| 2 | symulacja, nastawy, ryty, RNG, bot, zapis do JSON; testy świata i pomnika; testy złote; balans bota | 100/100 i 12/12; **1 200 identycznych skrótów**; 96 partii — te same wyniki co TS | 4–6 |
| 3 | świat: kamera, rycina w shaderze, mrok, poświata, rdzeń, żyły, kucie, pomieszczenia, ołtarz, ruiny, katedra, konwój, wiadra, loch, schody i ich budowa, pomnik, efekty | zrzuty obu wersji w tych samych scenach; czas klatki w F3 | 4–6 |
| 4 | postacie: figury, lud, demon i kukła bossa, walka (25 + 19 ruchów), strażnicy, dłonie, anioł | zrzuty i krótkie nagrania ruchów obok siebie | 3–5 |
| 5 | interfejs: płyta i rama, księga, okno postaci, Budowa, przyciski, minimapa, karty i alarmy, zapiski, legenda, menu, ustawienia, atlas, kronika, osiągnięcia, bestiariusz, samouczek, przerywniki | zrzuty; test nakładania elementów jak `test-nakladania.mjs` | 4–6 |
| 6 | dźwięk, intro, zapis do Dokumentów, kursor (rękawica jako kursor systemowy z `obrazy/kursor1.png` i `kursor2.png`) | porównanie offline WAV; zapis–wczytanie w trakcie partii | 2–3 |
| 7 | wydanie: `buduj.ps1`/`.sh`, ikona, opis i wersja pliku, jeden plik, GitHub Actions | zip z Actions uruchomiony u użytkownika | 1 |
| 8 | zgodność obrazu (ziarno 3, bot 60 000 tików, przybliżenia 6, 12, 14, 26, zamrożony zegar) i wydajność (1920×1080, 2560×1440; stoi / jedzie / kółko / walka z demonem) vs Electron; README, CHANGELOG, handoff | raport z liczbami i zrzutami | 2–3 |
| **Razem** | | | **22–33** |

Przy 1–2 sesjach dziennie to około 3–5 tygodni. Po każdym etapie krótki raport: co działa, co zmierzone, co dalej.
Grywalną całość widać po etapie 5; wcześniej — okno z F3 (1), testy (2), świat z placeholderami postaci (3).

---

## 5. Świadome różnice (wstępna lista — każdą zgłaszam, gdy się pojawi)

1. Rycina liczona shaderem w pełnej rozdzielczości: ostrzejsza przy dużym przybliżeniu i bez zgrubnej odbitki.
   Możliwe drobne różnice jasności (karta liczy w 32 bitach, JS w 64).
2. Znika ustawienie „Rycina w osobnym wątku” — w shaderze nie ma czego przenosić do wątku. Zamiast wymuszania karty
   z Electrona (`karta.json`) — wybór „ANGLE / OpenGL” z automatycznym powrotem, gdy jeden nie wstanie.
3. Film intro jako klatki JPEG/WebP zamiast H.264 — ten sam obraz, inna kompresja, większy plik.
4. Kroje te same, ale w TTF; tekst składa HarfBuzz w Skii zamiast silnika Chrome — możliwe różnice o piksel
   w odstępach.
5. Zapisy, ustawienia, klawisze i osiągnięcia w plikach w `Dokumenty\My Games\Trzewia\` zamiast pamięci
   przeglądarki; format ten sam.
6. Rękawica jako kursor systemowy z tych samych obrazków — rusza się bez opóźnienia klatki (w TS to warstwa strony
   przesuwana za myszą).
7. Bez kodu pod telefon; bez okienka dewelopera i obserwatorium (jeśli użytkownik się zgodzi).

---

## 6. Ryzyka

| Ryzyko | Skutek | Co z tym robię |
|---|---|---|
| Rozjazd symulacji (funkcje matematyczne, sortowanie, kolejność kolekcji, `float`) | testy złote nie przechodzą, balans się zmienia | zasady z 3.5 od pierwszej linii; testy złote w etapie 2, zanim powstanie rysunek; zrzut stanu przy pierwszej różnicy |
| SkSL za ciasny albo shader ryciny wygląda inaczej | dłuższy etap 3 | najpierw mały wycinek (kafel skały, pustka, nieznane) i porównanie ze zrzutem TS; plan B — GLSL bezpośrednio w GL |
| Słabe sterowniki OpenGL na laptopach z Intelem | czarny ekran albo błędy | ANGLE (Direct3D 11) domyślnie, OpenGL jako zapas, powrót automatyczny |
| Tekst inaczej złożony | przesunięte napisy, nakładanie | HarfBuzz; test nakładania; zrzuty |
| Brzmienie syntezy (kompresor, oscylatory) | inny dźwięk | wierne wzory z Chromium; porównanie offline |
| Szarpnięcia od sprzątania pamięci (GC) | pojedyncze długie klatki | brak przydziałów w klatce (pule), tryb `SustainedLowLatency`, licznik GC w F3 |
| Skala: 60 tys. linii | długi czas, błędy przy przepisywaniu | warstwa `Plotno` (przepisywanie prawie mechaniczne), ten sam podział plików, testy i zrzuty po każdym etapie |
| Gra TS zmienia się w trakcie | dwie wersje się rozjeżdżają | wzorzec przypięty do commitu; zmiany doganiane różnicą |
| Brak karty graficznej w moim środowisku | kl/s zmierzę tylko u użytkownika | tu mierzę czas procesora na klatkę (llvmpipe); kl/s — zrzut F3 z Windows |
| Windows: niepodpisany .exe | ostrzeżenie SmartScreen, czasem antywirus (zwłaszcza jeden plik, który się rozpakowuje) | jak dziś przy Electronie; wersja folderowa jest bezpieczniejsza |

---

## 7. Środowisko — czego brakuje

Sprawdzone 9.11 w tej sesji (Linux, 2 rdzenie, 7 GB, bez karty graficznej; jest Mesa/llvmpipe, Xvfb, Node 22,
ffmpeg, Python):

- **Brak sieci do pakietów:** `api.nuget.org`, `builds.dotnet.microsoft.com` i `dot.net` — połączenie odrzucone;
  `registry.npmjs.org` — brak połączenia. Bez tego nie zainstaluję .NET 10 SDK ani bibliotek (etap 1) i nie zbuduję
  testów TS (esbuild, etap 2) ani zrzutów (Playwright, etapy 3–8).
- **Co trzeba zrobić:** w claude.ai w przeglądarce, Ustawienia → Capabilities: zezwolić na menedżery pakietów
  i domeny `api.nuget.org`, `builds.dotnet.microsoft.com`, `dot.net`, `dotnet.microsoft.com`, `registry.npmjs.org`
  (oraz `playwright.azureedge.net` / `cdn.playwright.dev` na przeglądarkę do zrzutów). Nowe ustawienia łapie nowa
  rozmowa.
- **Kl/s** mierzę u użytkownika: wysyłam zip, proszę o zrzut F3.

---

## 8. Pytania do użytkownika

1. Wzorzec: `alpha-1/` z gałęzi `claude/zealous-brown-e2160u` (8.11, z licznikiem F3) — zgoda?
2. Okienko dewelopera i obserwatorium — pomijam (to narzędzia, nie gra), czy przenieść później?
3. Film intro jako klatki obrazków (kilka–kilkanaście MB zamiast 340 KB) — zgoda?
4. Liczby gry: tylko w kodzie C#, czy od razu z możliwością nadpisania plikami `.json` w `dane/nastawy/`?
5. Czy `alpha-1/` będzie się jeszcze zmieniać w czasie przenoszenia?

---

## Dodatek A — mapa plików TS → C#

Ścieżki C# względem `trzewia-cs/src/`. Etap „3–5 (z rysunkiem)” — nastawy wyglądu przenoszę razem z plikiem,
który z nich korzysta.

### `src/` (plik główny)

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `main.ts` | 113 | `Trzewia/Program.cs` | 1 |

### `src/app/` — 7212 linii, 19 plików

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `app/alarmy.ts` | 167 | `Trzewia/Aplikacja/Alarmy.cs` | 5 |
| `app/app.ts` | 213 | `Trzewia/Aplikacja/App.cs` | 1 |
| `app/bot.ts` | 762 | `Trzewia.Symulacja/Bot/Bot.cs` | 2 |
| `app/context.ts` | 18 | `Trzewia/Aplikacja/Context.cs` | 1 |
| `app/devpanel.ts` | 511 | — | pytanie (narzędzie dewelopera) |
| `app/obserwowany.ts` | 146 | — | pytanie (obserwatorium) |
| `app/obszary-hud.ts` | 59 | `Trzewia/Aplikacja/ObszaryHud.cs` | 5 |
| `app/screen.ts` | 14 | `Trzewia/Aplikacja/Screen.cs` | 1 |
| `app/screens/bestiariusz.ts` | 66 | `Trzewia/Aplikacja/Screens/Bestiariusz.cs` | 5 |
| `app/screens/game.ts` | 2539 | `Trzewia/Aplikacja/Screens/Game.cs` | 1 (wejście), 3–5 |
| `app/screens/intro.ts` | 73 | `Trzewia/Aplikacja/Screens/Intro.cs` | 6 |
| `app/screens/kronika.ts` | 260 | `Trzewia/Aplikacja/Screens/Kronika.cs` | 5 |
| `app/screens/ladowanie.ts` | 157 | `Trzewia/Aplikacja/Screens/Ladowanie.cs` | 5 |
| `app/screens/menu.ts` | 335 | `Trzewia/Aplikacja/Screens/Menu.cs` | 5 |
| `app/screens/osiagniecia.ts` | 112 | `Trzewia/Aplikacja/Screens/Osiagniecia.cs` | 5 |
| `app/screens/samouczek/rozdzialy.ts` | 416 | `Trzewia/Aplikacja/Screens/Samouczek/Rozdzialy.cs` | 5 |
| `app/screens/settings.ts` | 424 | `Trzewia/Aplikacja/Screens/Settings.cs` | 5 |
| `app/screens/tutorial.ts` | 861 | `Trzewia/Aplikacja/Screens/Tutorial.cs` | 5 |
| `app/wyrok.ts` | 79 | `Trzewia/Aplikacja/Wyrok.cs` | 5 |

### `src/atlas/` — 1680 linii, 3 pliki

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `atlas/odkrycia.ts` | 42 | `Trzewia/Atlas/Odkrycia.cs` | 5 |
| `atlas/okno.ts` | 162 | `Trzewia/Atlas/Okno.cs` | 5 |
| `atlas/tablice.ts` | 1476 | `Trzewia/Atlas/Tablice.cs` | 5 |

### `src/core/` — 2405 linii, 16 plików

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `core/android.ts` | 82 | — | pominięte (telefon) |
| `core/audio.ts` | 268 | `Trzewia/Rdzen/Audio.cs` | 6 |
| `core/gesty.ts` | 423 | `Trzewia/Rdzen/Gesty.cs` | 6 |
| `core/glos-odmowy.ts` | 36 | `Trzewia/Rdzen/GlosOdmowy.cs` | 6 |
| `core/glosy-ludu.ts` | 58 | `Trzewia/Rdzen/GlosyLudu.cs` | 6 |
| `core/karta.ts` | 69 | `Trzewia/Rdzen/Karta.cs` | 1 — zastąpione (nazwa karty z GL) |
| `core/keybinds.ts` | 100 | `Trzewia/Rdzen/Keybinds.cs` | 1 |
| `core/kursor.ts` | 119 | `Trzewia/Rdzen/Kursor.cs` | 6 |
| `core/mikser.ts` | 134 | `Trzewia/Rdzen/Mikser.cs` | 6 |
| `core/music.ts` | 433 | `Trzewia/Rdzen/Music.cs` | 6 |
| `core/nagrania.ts` | 155 | `Trzewia/Rdzen/Nagrania.cs` | 6 |
| `core/osiagniecia.ts` | 72 | `Trzewia/Rdzen/Osiagniecia.cs` | 5 |
| `core/rng.ts` | 54 | `Trzewia.Symulacja/Rdzen/Rng.cs` | 2 |
| `core/save.ts` | 155 | `Trzewia/Rdzen/Save.cs` | 6 (zapis do JSON już w 2, do testów) |
| `core/settings-store.ts` | 133 | `Trzewia/Rdzen/SettingsStore.cs` | 1 (część), 5 |
| `core/wydajnosc.ts` | 114 | `Trzewia/Rdzen/Wydajnosc.cs` | 1 |

### `src/cutscene/` — 1544 linie, 16 plików

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `cutscene/art/cel.ts` | 156 | `Trzewia/Przerywniki/Art/Cel.cs` | 5 |
| `cutscene/art/common.ts` | 136 | `Trzewia/Przerywniki/Art/Common.cs` | 5 |
| `cutscene/art/gora.ts` | 169 | `Trzewia/Przerywniki/Art/Gora.cs` | 5 |
| `cutscene/art/krew.ts` | 48 | `Trzewia/Przerywniki/Art/Krew.cs` | 5 |
| `cutscene/art/kronika.ts` | 41 | `Trzewia/Przerywniki/Art/Kronika.cs` | 5 |
| `cutscene/art/organy.ts` | 123 | `Trzewia/Przerywniki/Art/Organy.cs` | 5 |
| `cutscene/art/pamiec.ts` | 100 | `Trzewia/Przerywniki/Art/Pamiec.cs` | 5 |
| `cutscene/art/przyplyw.ts` | 36 | `Trzewia/Przerywniki/Art/Przyplyw.cs` | 5 |
| `cutscene/art/rasy.ts` | 58 | `Trzewia/Przerywniki/Art/Rasy.cs` | 5 |
| `cutscene/art/spis.ts` | 49 | `Trzewia/Przerywniki/Art/Spis.cs` | 5 |
| `cutscene/art/szept.ts` | 50 | `Trzewia/Przerywniki/Art/Szept.cs` | 5 |
| `cutscene/art/ziarno.ts` | 63 | `Trzewia/Przerywniki/Art/Ziarno.cs` | 5 |
| `cutscene/art/znak.ts` | 56 | `Trzewia/Przerywniki/Art/Znak.cs` | 5 |
| `cutscene/art/zyly.ts` | 55 | `Trzewia/Przerywniki/Art/Zyly.cs` | 5 |
| `cutscene/cutscene.ts` | 222 | `Trzewia/Przerywniki/Cutscene.cs` | 5 |
| `cutscene/scenes.ts` | 182 | `Trzewia/Przerywniki/Scenes.cs` | 5 |

### `src/grafiki/` — 73 linie, 1 plik

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `grafiki/grafiki.ts` | 73 | `Trzewia/Zasoby/Grafiki.cs` | 3 (wczytywanie z dane/grafika) |

### `src/nastawy/` — 3972 linie, 43 plików

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `nastawy/aniol.ts` | 43 | `Trzewia.Symulacja/Nastawy/Aniol.cs` | 2 |
| `nastawy/barwy.ts` | 63 | `Trzewia.Symulacja/Nastawy/Barwy.cs` | 3 |
| `nastawy/boss.ts` | 44 | `Trzewia.Symulacja/Nastawy/Boss.cs` | 2 |
| `nastawy/cechy.ts` | 49 | `Trzewia.Symulacja/Nastawy/Cechy.cs` | 2 |
| `nastawy/cele.ts` | 14 | `Trzewia.Symulacja/Nastawy/Cele.cs` | 2 |
| `nastawy/czas.ts` | 10 | `Trzewia.Symulacja/Nastawy/Czas.cs` | 2 |
| `nastawy/dlon.ts` | 96 | `Trzewia.Symulacja/Nastawy/Dlon.cs` | 2 |
| `nastawy/dzwiek.ts` | 274 | `Trzewia.Symulacja/Nastawy/Dzwiek.cs` | 6 |
| `nastawy/ekran.ts` | 115 | `Trzewia.Symulacja/Nastawy/Ekran.cs` | 1 |
| `nastawy/gora.ts` | 286 | `Trzewia.Symulacja/Nastawy/Gora.cs` | 2 |
| `nastawy/index.ts` | 33 | `Trzewia.Symulacja/Nastawy/Index.cs` | 2 |
| `nastawy/karty-ludu.ts` | 17 | `Trzewia.Symulacja/Nastawy/KartyLudu.cs` | 2 |
| `nastawy/katedra.ts` | 54 | `Trzewia.Symulacja/Nastawy/Katedra.cs` | 2 |
| `nastawy/kruszce.ts` | 33 | `Trzewia.Symulacja/Nastawy/Kruszce.cs` | 2 |
| `nastawy/loch.ts` | 126 | `Trzewia.Symulacja/Nastawy/Loch.cs` | 2 |
| `nastawy/lud.ts` | 147 | `Trzewia.Symulacja/Nastawy/Lud.cs` | 2 |
| `nastawy/moce.ts` | 52 | `Trzewia.Symulacja/Nastawy/Moce.cs` | 2 |
| `nastawy/mrok.ts` | 47 | `Trzewia.Symulacja/Nastawy/Mrok.cs` | 2 |
| `nastawy/oltarz.ts` | 35 | `Trzewia.Symulacja/Nastawy/Oltarz.cs` | 2 |
| `nastawy/polecenia.ts` | 43 | `Trzewia.Symulacja/Nastawy/Polecenia.cs` | 2 |
| `nastawy/pomieszczenia.ts` | 74 | `Trzewia.Symulacja/Nastawy/Pomieszczenia.cs` | 2 |
| `nastawy/pomnik.ts` | 40 | `Trzewia.Symulacja/Nastawy/Pomnik.cs` | 2 |
| `nastawy/rytual.ts` | 197 | `Trzewia.Symulacja/Nastawy/Rytual.cs` | 2 |
| `nastawy/sterowanie.ts` | 66 | `Trzewia.Symulacja/Nastawy/Sterowanie.cs` | 1 |
| `nastawy/straznicy.ts` | 70 | `Trzewia.Symulacja/Nastawy/Straznicy.cs` | 2 |
| `nastawy/stworzenia.ts` | 344 | `Trzewia.Symulacja/Nastawy/Stworzenia.cs` | 2 |
| `nastawy/swiat.ts` | 196 | `Trzewia.Symulacja/Nastawy/Swiat.cs` | 2 |
| `nastawy/walka.ts` | 315 | `Trzewia.Symulacja/Nastawy/Walka.cs` | 2 |
| `nastawy/wiadro.ts` | 65 | `Trzewia.Symulacja/Nastawy/Wiadro.cs` | 2 |
| `nastawy/wydarzenia.ts` | 98 | `Trzewia.Symulacja/Nastawy/Wydarzenia.cs` | 2 |
| `nastawy/wyglad/atlas.ts` | 69 | `Trzewia.Symulacja/Nastawy/Wyglad/Atlas.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/fresk-swiata.ts` | 82 | `Trzewia.Symulacja/Nastawy/Wyglad/FreskSwiata.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/freski.ts` | 65 | `Trzewia.Symulacja/Nastawy/Wyglad/Freski.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/frontyspis.ts` | 69 | `Trzewia.Symulacja/Nastawy/Wyglad/Frontyspis.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/menu.ts` | 100 | `Trzewia.Symulacja/Nastawy/Wyglad/Menu.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/nastroj.ts` | 31 | `Trzewia.Symulacja/Nastawy/Wyglad/Nastroj.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/ozdoby.ts` | 84 | `Trzewia.Symulacja/Nastawy/Wyglad/Ozdoby.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/postacie.ts` | 23 | `Trzewia.Symulacja/Nastawy/Wyglad/Postacie.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/rdzen.ts` | 61 | `Trzewia.Symulacja/Nastawy/Wyglad/Rdzen.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/rycina.ts` | 159 | `Trzewia.Symulacja/Nastawy/Wyglad/Rycina.cs` | 3–5 (z rysunkiem) |
| `nastawy/wyglad/ustawienia.ts` | 53 | `Trzewia.Symulacja/Nastawy/Wyglad/Ustawienia.cs` | 3–5 (z rysunkiem) |
| `nastawy/zabytki.ts` | 89 | `Trzewia.Symulacja/Nastawy/Zabytki.cs` | 2 |
| `nastawy/zbroja.ts` | 41 | `Trzewia.Symulacja/Nastawy/Zbroja.cs` | 2 |

### `src/powers/` — 320 linii, 2 pliki

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `powers/powers.ts` | 193 | `Trzewia.Symulacja/Moce/Powers.cs` | 2 |
| `powers/rozkazy.ts` | 127 | `Trzewia.Symulacja/Moce/Rozkazy.cs` | 2 |

### `src/render/` — 30230 linii, 96 plików

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `render/alarm.ts` | 114 | `Trzewia/Rysunek/Alarm.cs` | 5 |
| `render/aniol.ts` | 244 | `Trzewia/Rysunek/Aniol.cs` | 4 |
| `render/bloom.ts` | 46 | `Trzewia/Rysunek/Bloom.cs` | 3 |
| `render/budowa-schodow.ts` | 386 | `Trzewia/Rysunek/BudowaSchodow.cs` | 3 |
| `render/budowa.ts` | 129 | `Trzewia/Rysunek/Budowa.cs` | 5 |
| `render/camera.ts` | 27 | `Trzewia/Rysunek/Camera.cs` | 3 |
| `render/demon-boss.ts` | 1307 | `Trzewia/Rysunek/DemonBoss.cs` | 4 |
| `render/demon-czesci.ts` | 19 | `Trzewia/Rysunek/DemonCzesci.cs` | 4 |
| `render/demon-kukla.ts` | 604 | `Trzewia/Rysunek/DemonKukla.cs` | 4 |
| `render/demon-wzor.ts` | 214 | `Trzewia/Rysunek/DemonWzor.cs` | 3 |
| `render/demon.ts` | 413 | `Trzewia/Rysunek/Demon.cs` | 3 |
| `render/dev.ts` | 75 | `Trzewia/Rysunek/Dev.cs` | 8 (tryb deweloperski, jeśli zostaje) |
| `render/dlon-demona.ts` | 698 | `Trzewia/Rysunek/DlonDemona.cs` | 4 |
| `render/dlon.ts` | 392 | `Trzewia/Rysunek/Dlon.cs` | 4 |
| `render/druzyna.ts` | 537 | `Trzewia/Rysunek/Druzyna.cs` | 5 |
| `render/efekty.ts` | 404 | `Trzewia/Rysunek/Efekty.cs` | 3 |
| `render/engrave.ts` | 1959 | `Trzewia/Rysunek/Engrave.cs` | 3 |
| `render/figury.ts` | 1350 | `Trzewia/Rysunek/Figury.cs` | 4 |
| `render/fonts.ts` | 37 | `Trzewia/Rysunek/Fonts.cs` | 1 |
| `render/fresk.ts` | 428 | `Trzewia/Rysunek/Fresk.cs` | 5 |
| `render/freski.ts` | 162 | `Trzewia/Rysunek/Freski.cs` | 5 |
| `render/frontyspis.ts` | 457 | `Trzewia/Rysunek/Frontyspis.cs` | 5 |
| `render/grzbiet-wzor.ts` | 33 | `Trzewia/Rysunek/GrzbietWzor.cs` | 3 |
| `render/grzbiet.ts` | 38 | `Trzewia/Rysunek/Grzbiet.cs` | 3 |
| `render/ikony-hud.ts` | 200 | `Trzewia/Rysunek/IkonyHud.cs` | 5 |
| `render/ink.ts` | 108 | `Trzewia/Rysunek/Ink.cs` | 5 |
| `render/katedra.ts` | 544 | `Trzewia/Rysunek/Katedra.cs` | 3 |
| `render/konwoj.ts` | 562 | `Trzewia/Rysunek/Konwoj.cs` | 3 |
| `render/kruszce.ts` | 325 | `Trzewia/Rysunek/Kruszce.cs` | 5 |
| `render/ksiega.ts` | 515 | `Trzewia/Rysunek/Ksiega.cs` | 5 |
| `render/kucie.ts` | 84 | `Trzewia/Rysunek/Kucie.cs` | 3 |
| `render/legenda.ts` | 66 | `Trzewia/Rysunek/Legenda.cs` | 5 |
| `render/licznik-wydajnosci.ts` | 75 | `Trzewia/Rysunek/LicznikWydajnosci.cs` | 1 |
| `render/loch.ts` | 664 | `Trzewia/Rysunek/Loch.cs` | 3 |
| `render/lud.ts` | 24 | `Trzewia/Rysunek/Lud.cs` | 4 |
| `render/lud/helm.ts` | 225 | `Trzewia/Rysunek/Lud/Helm.cs` | 4 |
| `render/lud/malarz.ts` | 354 | `Trzewia/Rysunek/Lud/Malarz.cs` | 4 |
| `render/lud/matma.ts` | 97 | `Trzewia/Rysunek/Lud/Matma.cs` | 4 |
| `render/lud/odmowa.ts` | 27 | `Trzewia/Rysunek/Lud/Odmowa.cs` | 4 |
| `render/lud/oswietlenie.ts` | 67 | `Trzewia/Rysunek/Lud/Oswietlenie.cs` | 4 |
| `render/lud/pamiec.ts` | 146 | `Trzewia/Rysunek/Lud/Pamiec.cs` | 4 |
| `render/lud/pobozny.ts` | 965 | `Trzewia/Rysunek/Lud/Pobozny.cs` | 4 |
| `render/lud/poza.ts` | 133 | `Trzewia/Rysunek/Lud/Poza.cs` | 4 |
| `render/lud/robotnik.ts` | 666 | `Trzewia/Rysunek/Lud/Robotnik.cs` | 4 |
| `render/lud/rozstep.ts` | 265 | `Trzewia/Rysunek/Lud/Rozstep.cs` | 4 |
| `render/lud/ruch.ts` | 460 | `Trzewia/Rysunek/Lud/Ruch.cs` | 4 |
| `render/lud/rycerz.ts` | 688 | `Trzewia/Rysunek/Lud/Rycerz.cs` | 4 |
| `render/lud/stroj.ts` | 97 | `Trzewia/Rysunek/Lud/Stroj.cs` | 4 |
| `render/lud/szkielet.ts` | 97 | `Trzewia/Rysunek/Lud/Szkielet.cs` | 4 |
| `render/lud/tusz.ts` | 433 | `Trzewia/Rysunek/Lud/Tusz.cs` | 4 |
| `render/lud/twarz.ts` | 273 | `Trzewia/Rysunek/Lud/Twarz.cs` | 4 |
| `render/lud/uzbrojenie.ts` | 360 | `Trzewia/Rysunek/Lud/Uzbrojenie.cs` | 4 |
| `render/lud/walka-rycerza.ts` | 539 | `Trzewia/Rysunek/Lud/WalkaRycerza.cs` | 4 |
| `render/lud/wspolne.ts` | 394 | `Trzewia/Rysunek/Lud/Wspolne.cs` | 4 |
| `render/minimapa.ts` | 102 | `Trzewia/Rysunek/Minimapa.cs` | 5 |
| `render/mrok.ts` | 179 | `Trzewia/Rysunek/Mrok.cs` | 3 |
| `render/nastroj.ts` | 106 | `Trzewia/Rysunek/Nastroj.cs` | 5 |
| `render/okno-oltarza.ts` | 178 | `Trzewia/Rysunek/OknoOltarza.cs` | 5 |
| `render/okno-postaci.ts` | 223 | `Trzewia/Rysunek/OknoPostaci.cs` | 5 |
| `render/oltarz.ts` | 750 | `Trzewia/Rysunek/Oltarz.cs` | 3 |
| `render/overlay.ts` | 48 | `Trzewia/Rysunek/Overlay.cs` | 3 |
| `render/ozdobnik.ts` | 50 | `Trzewia/Rysunek/Ozdobnik.cs` | 5 |
| `render/ozdoby.ts` | 322 | `Trzewia/Rysunek/Ozdoby.cs` | 5 |
| `render/palette.ts` | 16 | `Trzewia/Rysunek/Palette.cs` | 1 |
| `render/panele.ts` | 108 | `Trzewia/Rysunek/Panele.cs` | 5 (sprawdzić: może tylko telefon) |
| `render/pielgrzymka.ts` | 159 | `Trzewia/Rysunek/Pielgrzymka.cs` | 3 |
| `render/plate.ts` | 584 | `Trzewia/Rysunek/Plate.cs` | 5 |
| `render/pomieszczenia.ts` | 895 | `Trzewia/Rysunek/Pomieszczenia.cs` | 3 |
| `render/pomnik.ts` | 565 | `Trzewia/Rysunek/Pomnik.cs` | 3 |
| `render/postacie.ts` | 130 | `Trzewia/Rysunek/Postacie.cs` | 4 |
| `render/promien.ts` | 198 | `Trzewia/Rysunek/Promien.cs` | 3 |
| `render/przyciski.ts` | 273 | `Trzewia/Rysunek/Przyciski.cs` | 5 |
| `render/rdzen.ts` | 452 | `Trzewia/Rysunek/Rdzen.cs` | 3 |
| `render/relikwiarz.ts` | 565 | `Trzewia/Rysunek/Relikwiarz.cs` | 5 |
| `render/rozkazy.ts` | 182 | `Trzewia/Rysunek/Rozkazy.cs` | 5 |
| `render/ruiny.ts` | 446 | `Trzewia/Rysunek/Ruiny.cs` | 3 |
| `render/rycina-watek.ts` | 97 | `Trzewia/Rysunek/RycinaWatek.cs` | 3 — zastąpione shaderem |
| `render/rycina-wspolne.ts` | 96 | `Trzewia/Rysunek/RycinaWspolne.cs` | 3 — zastąpione shaderem |
| `render/rycina-zrodla.ts` | 31 | `Trzewia/Rysunek/RycinaZrodla.cs` | 3 |
| `render/rycina.ts` | 285 | `Trzewia/Rysunek/Rycina.cs` | 3 — zastąpione shaderem |
| `render/schody.ts` | 694 | `Trzewia/Rysunek/Schody.cs` | 3 |
| `render/shafts.ts` | 88 | `Trzewia/Rysunek/Shafts.cs` | 3 |
| `render/stany.ts` | 61 | `Trzewia/Rysunek/Stany.cs` | 4 |
| `render/straz-klatek.ts` | 28 | `Trzewia/Rysunek/StrazKlatek.cs` | 1 |
| `render/straznicy.ts` | 201 | `Trzewia/Rysunek/Straznicy.cs` | 4 |
| `render/tablica.ts` | 300 | `Trzewia/Rysunek/Tablica.cs` | 5 |
| `render/tajemnica.ts` | 389 | `Trzewia/Rysunek/Tajemnica.cs` | 3 |
| `render/tempo.ts` | 54 | `Trzewia/Rysunek/Tempo.cs` | 5 (sprawdzić: może tylko telefon) |
| `render/trupy.ts` | 83 | `Trzewia/Rysunek/Trupy.cs` | 4 |
| `render/wiadro.ts` | 380 | `Trzewia/Rysunek/Wiadro.cs` | 3 |
| `render/wydarzenie.ts` | 160 | `Trzewia/Rysunek/Wydarzenie.cs` | 5 |
| `render/zapiski.ts` | 120 | `Trzewia/Rysunek/Zapiski.cs` | 5 |
| `render/zarys.ts` | 53 | `Trzewia/Rysunek/Zarys.cs` | 3 |
| `render/zegar-gry.ts` | 18 | `Trzewia/Rysunek/ZegarGry.cs` | 3 |
| `render/znaczniki.ts` | 78 | `Trzewia/Rysunek/Znaczniki.cs` | 5 |
| `render/zyly.ts` | 957 | `Trzewia/Rysunek/Zyly.cs` | 3 |

### `src/sim/` — 12747 linii, 34 plików

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `sim/aniol.ts` | 162 | `Trzewia.Symulacja/Symulacja/Aniol.cs` | 2 |
| `sim/blogoslawienstwo.ts` | 46 | `Trzewia.Symulacja/Symulacja/Blogoslawienstwo.cs` | 2 |
| `sim/boss.ts` | 159 | `Trzewia.Symulacja/Symulacja/Boss.cs` | 2 |
| `sim/brama.ts` | 136 | `Trzewia.Symulacja/Symulacja/Brama.cs` | 2 |
| `sim/budowa-schodow.ts` | 283 | `Trzewia.Symulacja/Symulacja/BudowaSchodow.cs` | 2 |
| `sim/cechy.ts` | 18 | `Trzewia.Symulacja/Symulacja/Cechy.cs` | 2 |
| `sim/creatures.ts` | 2476 | `Trzewia.Symulacja/Symulacja/Creatures.cs` | 2 |
| `sim/dlon-demona.ts` | 372 | `Trzewia.Symulacja/Symulacja/DlonDemona.cs` | 2 |
| `sim/dlon.ts` | 338 | `Trzewia.Symulacja/Symulacja/Dlon.cs` | 2 |
| `sim/droga.ts` | 413 | `Trzewia.Symulacja/Symulacja/Droga.cs` | 2 |
| `sim/dziennik.ts` | 65 | `Trzewia.Symulacja/Symulacja/Dziennik.cs` | 2 |
| `sim/karty-ludu.ts` | 139 | `Trzewia.Symulacja/Symulacja/KartyLudu.cs` | 2 |
| `sim/kruszce.ts` | 35 | `Trzewia.Symulacja/Symulacja/Kruszce.cs` | 2 |
| `sim/lina-wiadra.ts` | 148 | `Trzewia.Symulacja/Symulacja/LinaWiadra.cs` | 2 |
| `sim/lud.ts` | 548 | `Trzewia.Symulacja/Symulacja/Lud.cs` | 2 |
| `sim/oltarz.ts` | 277 | `Trzewia.Symulacja/Symulacja/Oltarz.cs` | 2 |
| `sim/pielgrzymka.ts` | 469 | `Trzewia.Symulacja/Symulacja/Pielgrzymka.cs` | 2 |
| `sim/podpowiedzi.ts` | 195 | `Trzewia.Symulacja/Symulacja/Podpowiedzi.cs` | 2 |
| `sim/polecenia.ts` | 583 | `Trzewia.Symulacja/Symulacja/Polecenia.cs` | 2 |
| `sim/pomieszczenia.ts` | 368 | `Trzewia.Symulacja/Symulacja/Pomieszczenia.cs` | 2 |
| `sim/pomnik.ts` | 145 | `Trzewia.Symulacja/Symulacja/Pomnik.cs` | 2 |
| `sim/races.ts` | 94 | `Trzewia.Symulacja/Symulacja/Races.cs` | 2 |
| `sim/ruiny.ts` | 221 | `Trzewia.Symulacja/Symulacja/Ruiny.cs` | 2 |
| `sim/rytual.ts` | 400 | `Trzewia.Symulacja/Symulacja/Rytual.cs` | 2 |
| `sim/sim.ts` | 1358 | `Trzewia.Symulacja/Symulacja/Sim.cs` | 2 |
| `sim/straznicy.ts` | 409 | `Trzewia.Symulacja/Symulacja/Straznicy.cs` | 2 |
| `sim/tiles.ts` | 64 | `Trzewia.Symulacja/Symulacja/Tiles.cs` | 2 |
| `sim/trupy.ts` | 67 | `Trzewia.Symulacja/Symulacja/Trupy.cs` | 2 |
| `sim/walka.ts` | 490 | `Trzewia.Symulacja/Symulacja/Walka.cs` | 2 |
| `sim/wiadro.ts` | 367 | `Trzewia.Symulacja/Symulacja/Wiadro.cs` | 2 |
| `sim/world.ts` | 779 | `Trzewia.Symulacja/Symulacja/World.cs` | 2 |
| `sim/wydarzenia.ts` | 843 | `Trzewia.Symulacja/Symulacja/Wydarzenia.cs` | 2 |
| `sim/zabytki.ts` | 131 | `Trzewia.Symulacja/Symulacja/Zabytki.cs` | 2 |
| `sim/zbroja.ts` | 149 | `Trzewia.Symulacja/Symulacja/Zbroja.cs` | 2 |

### `src/ui/` — 611 linii, 1 plik

| Plik TS | Linie | Plik C# | Etap |
|---|---:|---|---|
| `ui/ui.ts` | 611 | `Trzewia/Interfejs/Ui.cs` | 5 |
