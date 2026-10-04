# Pracownia dźwięku

Stół warsztatowy nowego soundtracku Trzewi. **Nic tu nie jest wpięte w grę** — to osobny,
samodzielny plik, w którym każdy dźwięk ma własny przycisk, a stan góry ustawia się suwakami.

```
pracownia-dzwieku/
├─ index.html          cała pracownia: synteza + interfejs, bez builda
├─ test-pracowni.mjs   sprawdzenie w Chromium: błędy JS, każdy dźwięk, budżet węzłów
└─ README.md
```

**Jak otworzyć:** kliknij `index.html` dwa razy. Nie ma kompilacji ani zależności —
jeden plik, zwykły `<script>`, żadnych modułów, więc działa też z `file://`.
Potem naciśnij **„Obudź górę"** (bez twojego ruchu przeglądarka nie wpuści dźwięku).

## Co jest w środku

| Warstwa | Czym jest | Czym sterowana |
|---|---|---|
| **Serce** | puls rdzenia; zegar całej gry | `sen` (tempo i gubione uderzenia), `fala` |
| **Oddech** | wdech i wydech skały, co 4 uderzenia | `zywi` |
| **Kamień** | pad: trzy piły i bas; akord co 8 uderzeń | głębokość (tryb skali), napięcie (filtr), dominacja |
| **Trzewia** | *nowe* — bulgot krwi, lepka masa, skwierczenie magmy | `krew`, `magma` |
| **Praca** | kilofy kwantyzowane do siatki, kroki, zbroje | `kopie`, `zywi`, `rycerze` |
| **Modlitwa** | *nowe* — chór formantowy, samogłoska „o"→„a" | `wiara` |
| **Strażnicy** | *nowe* — tryton, pomruk, śpiący kamień | `fala`, `bossSpi` |
| **Głos rdzenia** | dzwon — tylko na zdarzenia, nigdy losowo | wywoływany wprost |

Do tego **9 odsłon** (Przebudzenie, Zasiedlenie, Kult, Zaduch, Sen, Fala Strażników,
Śpiący kamień, Czas stoi, Przy magmie), które nastawiają cały stan naraz, oraz
**zdarzenia**: pięć pęknięć skorupy, ostrzeżenie o zaśnięciu, przebudzenie bossa,
`RDZEŃ OTWARTY` i `Kronika`.

Przełącznik **„Zatrzymaj zegar"** wyłącza wszystko, co gra samo — zostają pojedyncze
dźwięki w ciszy, do strojenia pokrętłami.

## Trzy zasady, na których to stoi

1. **Serce jest zegarem.** Tempo bierze się z `sen`: 42 BPM na czuwaniu, 15 u progu
   śmierci, przy `sen = 1` cisza. Wszystko inne wisi na tej siatce, więc zasypianie
   zwalnia i rozwleka cały utwór — pasek życia, którego nie trzeba rysować.
2. **Lud jest sekcją rytmiczną.** Kilofy idą po siatce, nie losowo. Dużo robotników =
   góra ma groove; mało = rytm kuleje; zero = zostaje sam kamień. Wymieranie słychać,
   zanim się je zobaczy.
3. **Harmonia nie rozwiązuje się, dopóki nie wygrasz.** Cała gra jest frygijska i
   zawieszona. Jedyna czysta tercja wielka w całym soundtracku pada w chwili, gdy
   wierni dokopią się do rdzenia (przycisk `RDZEŃ OTWARTY`).

Dodatkowo: skala ciemnieje z głębokością (dorycka → frygijska → lokrycka, z histerezą
albo ciągłym gięciem — do porównania przełącznikiem), a każde uderzenie serca lekko
dociska cały świat (ducking), więc miks oddycha razem z pulsem.

## Jak to się przełoży na grę

Układ skryptu w `index.html` odpowiada planowanym plikom, żeby przeniesienie było
przepisaniem, nie pisaniem od nowa:

| Sekcja w pracowni | Plik w grze |
|---|---|
| `NASTAWY` | `src/nastawy/dzwiek.ts` |
| `MIKSER` | `src/core/mikser.ts` |
| `ZEGAR` | `src/core/zegar.ts` *(nowy)* |
| `STAN GÓRY` | `src/core/stan-dzwieku.ts` *(nowy)* |
| `WARSTWY: …` | `src/core/warstwy/*.ts` *(nowe)* |
| `DYRYGENT` | `src/core/dyrygent.ts` *(nowy)* |

## Co jest sprawdzone, a co nie

`node test-pracowni.mjs` (potrzebuje Playwrighta) otwiera pracownię w Chromium, klika
**każdy** przycisk i mierzy RMS wyjścia 60 razy na sekundę. Stan na teraz:

- zero błędów JS,
- wszystkie 45 przycisków dają dźwięk mierzalnie powyżej podłogi,
- 9 odsłon działa, puls zmienia się z `sen` (42 → 19,9 BPM),
- „Cisza" naprawdę milczy, wznowienie wraca,
- 19 żywych źródeł w szczycie przy wszystkich warstwach — w budżecie telefonu (≤40).

**Czego test nie mówi:** czy to brzmi dobrze. Pracownia nie była odsłuchana uchem,
a wszystkie liczby w `NASTAWY` to pierwsze przybliżenie — proporcje głośności, barwy
i tempa są do strojenia. Pasmo pod 100 Hz jest na widmie zaznaczone czerwono:
telefon tego nie zagra (lekcja z `core/audio.ts` — 46 Hz nie wychodzi z małego głośnika).

## Dwie usterki znalezione przy okazji — są też w grze

1. **Wysyłka do pogłosu omija głośność warstwy.** W `core/music.ts` i `core/gesty.ts`
   odczep do `mikser.poglos` wisi *przed* własnym masterem warstwy, więc wyciszenie
   muzyki zostawia jej ogon w jaskini. W pracowni każda warstwa ma osobną „mokrą
   szynę" chodzącą pod tą samą głośnością co sucha.
2. **Brązowy szum w wysokich pasmach nie gra.** Wspólny bufor szumu w pracowni jest
   brązowy (opada 6 dB/oktawę), więc filtr pasmowy przy 2600 Hz wyciągał z niego prawie
   nic — skwierczenie magmy było niemal niesłyszalne. Pracownia ma teraz drugi bufor,
   biały, do skwierczenia i metalu.
   W grze ten sam problem ma **warstwa modlitwy** w `core/audio.ts`: `prayFilter` to
   pasmo przy 1400 Hz z Q = 6, karmione tym samym brązowym buforem co szum korytarzy
   przy 340 Hz. Brąz ma przy 1400 Hz kilkanaście decybeli mniej, a wąskie pasmo
   dobiera resztę — przy `prayGain` ≤ 0,05 modlitwy praktycznie nie słychać, choć
   kod wygląda poprawnie. (`core/gesty.ts` jest czysty — ma własny bufor białego szumu.)
