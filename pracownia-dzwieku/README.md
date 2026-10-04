# Pracownia dźwięku

Stół warsztatowy nowego soundtracku Trzewi. **Nic tu nie jest wpięte w grę** — to osobny,
samodzielny plik, w którym każdy dźwięk ma własny przycisk, a stan góry ustawia się suwakami.

```
pracownia-dzwieku/
├─ index.html          cała pracownia: synteza + interfejs, bez builda
├─ test-pracowni.mjs   sprawdzenie w Chromium: błędy JS, każdy dźwięk, budżet węzłów
├─ test-zapisu.mjs     składnia, generator tonu, strój i zapis (z kompilacją przez tsc)
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

## Strój i generator tonu

**Generator** gra czysty ton o dowolnej częstotliwości — wpisz Hz albo weź gotową.
Własna szyna omija filtr pauzy, bo to wzorzec do odsłuchu, nie część soundtracku.
Pod spodem pokazuje nutę, odchylenie w centach i kolejne oktawy w dół.

**Strój odniesienia** to jedna częstotliwość, od której liczy się cały akord, chór,
tryton Strażników i dzwon. Domyślnie D3 = 146,83 Hz (A4 = 440). Gotowe nastawy:

| Przycisk | Hz | Co to |
|---|---|---|
| jak teraz | 146,83 | D3 przy A4 = 440 |
| 852 ÷ 8 | 106,5 | 852 Hz zwinięte trzy oktawy w dół — niżej i ciężej |
| 852 ÷ 4 | 213 | 852 Hz dwie oktawy w dół — jaśniej, bliżej góry |
| A = 432 | 144,16 | D3 przy stroju koncertowym 432 Hz |

Osobny przełącznik **„Serce też ze stroju"** sadza puls na odniesieniu zwiniętym
w pasmo ciała (45–90 Hz). Przy 852 Hz wypada **53,25 Hz** — dokładnie cztery oktawy
pod odniesieniem, blisko domyślnych 56 Hz, więc charakter uderzenia zostaje.

Zestaw w generatorze (174–963 Hz) to tzw. częstotliwości „solfeggio". Uczciwie:
**przypisywane im działanie na ciało nie ma potwierdzenia** — zestaw wymyślono
w latach 70. XX w. i nie pochodzi z historycznego solfeżu. Jako wybór stroju jest
jednak zupełnie normalny (jak 432 Hz) i w grze o górze z kultem dodaje klimatu —
po to tu jest.

## Zapis nastaw

Przycisk **„Zapisz dzwiek.ts"** wypluwa plik tekstowy ze wszystkimi liczbami tak,
jak są w tej chwili ustawione — każda z komentarzem, co robi i w którą stronę działa
(konwencja z `nastawy/README.md`). Gotowy do wrzucenia w grę jako
`src/nastawy/dzwiek.ts`: 13 sekcji (`MIKSER`, `ZEGAR`, `SERCE`, `ODDECH`, `KAMIEN`,
`TRZEWIA`, `PRACA`, `MODLITWA`, `STRAZNICY`, `DZWON`, `STROJ`, `WARSTWY`,
`SERCE_ZE_STROJU`), ~345 linii, ~10 kB.

`test-zapisu.mjs` przepuszcza ten plik przez **`tsc --strict`** — to jest kontrakt
tego zapisu i jest pilnowany automatycznie.

Obok: **„Zapisz JSON"** (ten sam zapis maszynowo) i **„Wczytaj JSON…"**, żeby dało
się wrócić do zapisanego brzmienia. Wczytanie scala po kluczach, więc starszy zapis
nie wywala brakujących pokręteł. Jest też podgląd i kopiowanie do schowka, gdy
wolisz wkleić niż pobierać.

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

Oba testy potrzebują Playwrighta i otwierają pracownię w prawdziwym Chromium.

`node test-pracowni.mjs` klika **każdy** przycisk i mierzy RMS wyjścia 60 razy
na sekundę. Stan na teraz:

- zero błędów JS,
- wszystkie 45 przycisków dają dźwięk mierzalnie powyżej podłogi,
- 9 odsłon działa, puls zmienia się z `sen` (42 → 19,9 BPM),
- „Cisza" naprawdę milczy, wznowienie wraca,
- 19 żywych źródeł w szczycie przy wszystkich warstwach — w budżecie telefonu (≤40).

`node test-zapisu.mjs` sprawdza składnię skryptu, strój i zapis:

- generator: wpisane 852 / 174 / 528 / 963 Hz wychodzą jako te Hz (w granicach
  jednego prążka widma, 21,5 Hz),
- strój przestraja kamień, chór i oba oscylatory Strażników,
- `dzwiek.ts` kompiluje się przez `tsc --strict`,
- JSON wraca do pracowni prawdziwym wyborem pliku, a zły plik jest odrzucany.

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
