# Trailer „Trzewia” (Alpha 1)

**Film:** [`trzewia-trailer.mp4`](trzewia-trailer.mp4) — 1920×1080, 30 kl/s, 2:35, H.264 + AAC stereo 48 kHz, −14 LUFS, 48,5 MB.

Cały trailer powstaje z kodu i z klatek prawdziwej gry: obraz to rycina gry nagrana klatka po klatce z działającej
partii (bot gra, reżyser prowadzi kamerę), napisy są złożone krojami pisma gry z ozdobnikami menu, plansza tytułowa to
logo z menu z bijącym sercem, a muzyka i efekty są syntezowane w przeglądarce (WebAudio), w języku muzycznym gry —
skala frygijska od D, kamienny akord z pił, dzwon „głosu rdzenia”, chór formantowy, puls serca. Żadnych nagrań,
obcych grafik ani montażu ręcznego.

## Scenariusz

48 taktów w tempie 75 BPM (takt = 3,2 s); cięcia stoją na taktach, uderzenia muzyki na zdarzeniach w obrazie.

| Część | Czas | Co widać |
|---|---|---|
| Hak | 0:00–0:19 | „Nie jesteś bogiem.” · „Jesteś górą, która śni.” · od rozety katedry w dół smugi światła do sali z ołtarzem |
| Akt I — życie | 0:19–0:54 | lud przy ołtarzu, konwój z końmi, worek z jedzeniem zjeżdża po linie, szept, Cud, kopanie (błysk złota), kołowrót, schody kręcone rosnące w rusztowaniu (przyspieszone), spadek kamery drogą wiernych na samo dno |
| Przełom | 0:54–1:01 | „Lecz na samym dnie coś śpi.” |
| Akt II — tajemnica | 1:01–1:42 | Wielki Pomnik w łańcuchach, zaklinanie nad kotłem, stalowa brama unosi się, modlitwa nad pomnikiem, trzy pęknięcia, Strażnicy Snu i rycerz, dłoń anielska |
| Akt III — demon | 1:42–2:21 | pomnik wybucha gruzem, demon wstaje z płonącą aureolą, tarcza z dłoni z otchłani, chwyt i rzut rycerzem pod strop (zwolnione), uderzenie w ziemię, przecięta lina w sali, ryk, szarża, ostatni cios — czas zwalnia, złote światło, demon w pył |
| Finał | 2:21–2:34 | „Uwolnij się.” · logo TRZEWIA z bijącym sercem · Alpha 1 · znaki zespołu |

Wszystkie ujęcia pochodzą z jednej partii bota „rozsądnego” (ziarno 3), w której lud wygrywa (Uwolnienie po 15,3 min
gry). Gracz-reżyser dokłada tylko to, co może zrobić gracz: szept i Cud przy pobożnym oraz rozkaz „Buduj schody drogi
wiernych” (ujęcia z kołowrotem i schodami).

## Pliki

| Plik | Rola |
|---|---|
| `scenariusz.mjs` | jedno źródło prawdy: ujęcia (tik gry, kamera, tempo, akcje), napisy, plansza, sekcje i uderzenia muzyki |
| `rezyser.ts` | wstrzykiwany do gry: przewija partię z botem, rysuje kadr kinowy (świat bez interfejsu), kamera, Cud/szept/rozkazy |
| `nagraj.mjs` | nagrywa ujęcia do `klatki/<id>/` (Playwright, sztuczny zegar — każda klatka liczona w pełnej jakości) |
| `montaz.ts`, `montaz.html`, `montaz.mjs` | składa film: przejścia, napisy, plansza tytułowa, korekcja barwna, winieta, ziarno → `wyjscie/klatki/` |
| `muzyka.ts`, `muzyka.html`, `muzyka.mjs` | partytura i efekty zsynchronizowane z obrazem (tiki z `meta.json` ujęć, ruchy walki z `dane/ruchy-3.json`) → `wyjscie/muzyka.wav` |
| `wspolne.mjs` | otwieranie gry pod zegarem Playwrighta i wstrzyknięcie reżysera |
| `vite.trailer.config.mjs` | serwer gry do nagrywania: konfiguracja gry bez HMR (edycja pliku nie przeładowuje nagrywanych stron) |
| `eksport.sh` | mastering dźwięku (EQ, −14 LUFS), kodowanie H.264 w dwóch przebiegach → `trzewia-trailer.mp4` |
| `os-zdarzen.mjs`, `szukaj-walki.mjs`, `sonda.mjs`, `podglad.mjs`, `ruchy.mjs` | narzędzia do szukania ujęć: oś zdarzeń partii, przegląd walk w wielu partiach, śledzenie wartości w czasie, stykówki, ruchy walki |

## Jak odtworzyć

Z katalogu `alpha-1` (Node 22, Chromium z Playwrightem, ffmpeg):

```bash
npm install
npx vite --config trailer/vite.trailer.config.mjs --port 5180 &   # gra w trybie dev, bez HMR (reżyser: window.__trzewia)
for i in 1 2 3; do node trailer/nagraj.mjs --czesc $i/3 & done; wait    # ujęcia (~6 min)
node trailer/ruchy.mjs 3                       # ruchy walki do synchronizacji dźwięku
node trailer/muzyka.mjs                        # muzyka i efekty → trailer/wyjscie/muzyka.wav
for i in 1 2; do node trailer/montaz.mjs --czesc $i/2 & done; wait      # klatki filmu
bash trailer/eksport.sh                        # MP4: H.264 + AAC, głośność −14 LUFS
```

Gra nie jest zmieniana: reżyser działa tylko w trybie deweloperskim, przez obiekty z `window.__trzewia`. Klatki robocze
(`klatki/`, `wyjscie/`) nie trafiają do repozytorium.
