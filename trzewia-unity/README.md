# Trzewia — projekt Unity

Gotowy projekt Unity z całą grą C# z `trzewia-cs/`: te same pliki gry, te same dane, ten sam zapis gracza.
Unity daje okno, mysz, klawiaturę, dźwięk, kursor i budowanie gry, a gra rysuje się tak samo jak w Trzewia.exe —
Skią na karcie graficznej.

## Jak otworzyć

1. **Unity Hub → Add → Add project from disk** → wybierz folder `trzewia-unity`.
2. Wersja: **Unity 6** (6000.0 LTS albo nowsza). Projekt jest zapisany pod 6000.0.23f1 — gdy masz inną wersję
   Unity 6, Hub zapyta, czym otworzyć; wybierz swoją i zgódź się na aktualizację projektu.
3. Pierwsze otwarcie trwa kilka minut (Unity buduje sobie folder `Library/`).
4. Otwórz scenę **`Assets/Scenes/Trzewia.unity`** i naciśnij **Play**. Gra rusza też w każdej innej scenie
   (składnik `GraTrzewia` stawia się sam, gdy go nie ma).

Gra w edytorze czyta i zapisuje te same pliki gracza co Trzewia.exe: `Dokumenty\My Games\Trzewia\` (Linux:
`~/.local/share/Trzewia`) — zapis, ustawienia, klawisze, osiągnięcia, atlas i `dziennik.txt`.

## Co gdzie jest

```
trzewia-unity/
├── Assets/
│   ├── Scenes/Trzewia.unity          scena: jeden obiekt „Trzewia” (kamera, słuchacz dźwięku, GraTrzewia)
│   ├── Trzewia/
│   │   ├── Kod/
│   │   │   ├── Symulacja/            gra: świat, lud, ryty, nastawy (kopia trzewia-cs/src/Trzewia.Symulacja)
│   │   │   ├── Gra/                  gra: ekrany, rysunek, interfejs, dźwięk (kopia trzewia-cs/src/Trzewia.Gra)
│   │   │   ├── Skia/                 rysunek na SkiaSharp (kopia trzewia-cs/src/Trzewia.Skia)
│   │   │   ├── Most/                 gra w wątku: karta (EGL/ANGLE), obraz, pliki, dźwięk — bez Unity
│   │   │   └── Unity/                GraTrzewia (MonoBehaviour), mysz i klawiatura, kursor-rękawica
│   │   ├── Duszki/, Editor/          postacie jako sprite'y Unity + importer (opis: Duszki/README-duszki-i-dlon.md)
│   │   └── Menu/Przyciski/           odręczne przyciski menu
│   ├── Plugins/Trzewia/              SkiaSharp, HarfBuzz, NLayer (MP3), ANGLE — Windows i Linux x64
│   └── StreamingAssets/dane/         dane gry: grafika, dźwięki (SPIS.md), filmy, kroje, nastawy
├── Packages/manifest.json
├── ProjectSettings/
└── narzedzia/kopiuj_z_trzewia_cs.py  ponowne przeniesienie kodu i danych z trzewia-cs (nadpisuje!)
```

Każdy folder w `Kod/` to osobne assembly (`.asmdef`) — tak jak projekty w `trzewia-cs`: Symulacja ← Gra ← Skia ←
Most ← Unity. Symulacja, Gra, Skia i Most nie znają Unity (`noEngineReferences`), więc da się je wziąć także do Godota.

## Jak to działa

- `GraTrzewia` (na obiekcie „Trzewia”) uruchamia grę we własnym wątku (`Most/WatekGry.cs`).
- Wątek gry otwiera **swój** kontekst karty graficznej: na Windows przez ANGLE (Direct3D 11 — ta sama droga co
  Trzewia.exe i Chrome), na Linuksie przez systemowy EGL. Nie dotyka grafiki Unity, więc Unity może rysować czym chce
  (Direct3D, Vulkan, OpenGL).
- Co klatkę Unity prosi o obraz, gra liczy świat i rysuje klatkę Skią na karcie, obraz wraca do pamięci, a `GraTrzewia`
  wkłada go do tekstury, którą kamera pokazuje na cały ekran (`OnRenderImage`). Gra chodzi w rytmie monitora; limit
  klatek z ustawień gry działa jak w Trzewia.exe.
- Mysz i klawiatura idą z Unity do gry jak zdarzenia przeglądarki w TS (piksele CSS, `key`/`code`). F11 — pełny ekran.
- Dźwięk: mikser gry (48 kHz, stereo) dokłada się do dźwięku Unity w `OnAudioFilterRead`
  (`ProjectSettings/AudioManager.asset`: 48000 Hz; przy innej częstotliwości gra przelicza sama).
- Bez karty (np. sterownik nie da EGL) gra rysuje procesorem — działa, ale bardzo wolno; w dzienniku jest powód.

Ustawienia w Inspectorze (obiekt „Trzewia”, składnik `GraTrzewia`):

| pole | co robi |
|---|---|
| `ekranStartowy` | jak `--ekran` w Trzewia.exe: puste — intro i menu; `gra`, `samouczek`, `menu`, `ustawienia`, `osiagniecia`, `bestiariusz`; `proba` — ekran próbny |
| `trybDeweloperski` | jak `--dev`: okienko dewelopera, przyspieszanie czasu |
| `licznik` | licznik wydajności (F3) od startu |
| `dziennikWKonsoli` | wpisy dziennika gry także w konsoli Unity |

## Budowanie gry

**File → Build Profiles** (w starszym Unity: Build Settings) → **Windows** albo **Linux** (x86_64) → Build.
Scena `Trzewia` jest już na liście. Zostaw **Mono** jako Scripting Backend (Player → Other Settings) — tak było
sprawdzane. Dane jadą same (StreamingAssets), biblioteki też (Plugins).

## Rozwijanie

- Kod gry to zwykłe pliki C# w `Assets/Trzewia/Kod/` — zmiana i powrót do Unity, Unity kompiluje sam.
  C# 9, .NET Standard 2.1, `#nullable` włączone (`csc.rsp` w każdym folderze) — jak w `trzewia-cs`.
- Liczby gry: `Assets/StreamingAssets/dane/nastawy/*.json` (zastępują te z kodu, jak w Trzewia.exe).
- Grafika i dźwięki: `Assets/StreamingAssets/dane/` — podmiana pliku pod tą samą nazwą wystarczy.
- Unity nie widzi świata gry jako obiektów (scen, prefabów) — gra rysuje się sama, Unity pokazuje gotowy obraz.
  Przechodzenie na obiekty Unity (np. postacie z duszków — `Duszki/`) można robić stopniowo.
- `narzedzia/kopiuj_z_trzewia_cs.py` przenosi kod i dane z `trzewia-cs` jeszcze raz — **nadpisuje** `Kod/Symulacja`,
  `Kod/Gra`, `Kod/Skia`, `StreamingAssets/dane` i `Plugins/Trzewia`. Po rozpoczęciu pracy w Unity nie używać.

## Co było sprawdzone, a co nie

Projekt powstał bez Unity (nie ma go na maszynie, na której był robiony). Sprawdzone:
- kompilacja wszystkich assembly z bibliotekami Unity (UnityEngine/UnityEditor), C# 9, .NET Standard 2.1 — bez błędów;
- wątek gry z kartą przez EGL (Linux, Mesa): ekran gry rysowany na karcie, odczytany obraz zgodny z Trzewia.exe.

Niesprawdzone (pierwsze uruchomienie u Ciebie): sam edytor Unity, ANGLE w procesie Unity na Windows, wejście, dźwięk
i kursor w Unity. Gdy coś nie działa — przyślij błędy z konsoli Unity i `dziennik.txt`. Znane możliwe kłopoty:
- Unity zgłasza dwa pliki `System.Runtime.CompilerServices.Unsafe.dll` → usuń
  `Assets/Plugins/Trzewia/Biblioteki/System.Runtime.CompilerServices.Unsafe.dll`.
- Obraz pokazuje `OnRenderImage` (wbudowany potok renderowania Unity). Po przejściu na URP/HDRP pokazanie tekstury
  trzeba zrobić inaczej (np. `RawImage` na całym ekranie).
- macOS nie jest obsługiwany (brak bibliotek Skii dla Maca w projekcie i brak EGL).
