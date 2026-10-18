# Trzewia — Alpha 0.1 (komputer)

Nowa gra, w budowie. Wychodzi od Remake v2 i przebudowuje go według wspólnego planu (stała drużyna, rozkazy dla
wybranych postaci, pomieszczenia i rudy, ołtarz, dwie dłonie, Wielki Pomnik). Remake v2 zostaje bez zmian
w [`../remake-v2/`](../remake-v2) (punkt odniesienia).

**[⬇️ Pobierz trzewia-alpha-0.1.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.1.html)** — gra ·
**[⬇️ Pobierz trzewia-alpha-0.1-obserwatorium.html](https://github.com/kanalpatryk-netizen/Trzewoa/releases/latest/download/trzewia-alpha-0.1-obserwatorium.html)** — obserwatorium.
Otwórz w przeglądarce (jeden plik, bez instalacji, działa bez internetu). Zapisy, ustawienia, atlas i osiągnięcia
Alphy są osobne — nie mieszają się z Remake v2.

## Co jest inaczej niż w Remake v2
- **Stała drużyna:** 3 robotników, 2 pobożnych, 1 rycerz — na całą partię (i nikt się nie starzeje). Skała nie
  wydaje nowych postaci, nie ma gniazd kamiennych rycerzy (ani szeptów „przemyśl i kop” i „kop losowo”), kart
  spisku rycerzy i snu o kamiennych rycerzach. Rycerz jest jeden, ale dużo silniejszy (życie ×12, siła ×11)
  i na bossa idzie sam; boss nie zasypia w ścianie. Przegrywasz, gdy zginie ostatni pobożny.
- **Rozkazy:** pod płytą trzy medaliony (robotnicy, pobożni, rycerz). Dotknięcie medalionu albo postaci zaznacza,
  dotknięcie mapy to „idź tam” — pobożny i rycerz idą tylko tam, dokąd prowadzi droga, inaczej odmawiają (kręcą
  głową, a w dymku mówią dlaczego); robotnik przekopuje się sam, wskazana skała to „kop tam”. „Kop drogę wiernych”
  — robotnicy kopią złotą kreskę pod rdzeń; bez rozkazu nie kopią, tylko noszą jedzenie. Klawisze: A/S/D — role,
  G — kop drogę, V — odwołaj, Esc i prawy przycisk — odznacz.
- **Bez zawału od góry:** mapa się nie skraca, góra nie zamyka się za ludem.
- **Bez wspinania po ścianach.** Lud wchodzi najwyżej o jeden stopień (kafel) i to tylko z miejsca, na którym stoi. Wyżej nie wejdzie —
  wykuwa sobie schody w skale albo wchodzi po linie, którą powiesisz (tylko tam, gdzie inaczej się nie wejdzie;
  5 lin za darmo, potem po 10 krwi). W dół zsuwa się po
  ścianie albo skacze, ale nie z dużej wysokości.
- **Góra według szkicu:** z powierzchni dwa otwory do jasnej sali na środku u góry — szerszy, przez który pada światło
  dzienne na ołtarz, i węższy obok, którym zjeżdża jedzenie (pod nim siedziba); niżej trzy warstwy — płytka (miękka skała, żelazo), środkowa (małe jaskinie, pod nimi złoto), głęboka
  (twarda skała); dookoła rama nie do ruszenia; na dole, na środku, rdzeń pod szeroką kryptą. Drogę w dół trzeba
  wykuć, a kucie trwa (skała pęka pod kilofem coraz mocniej).
- **Jedno wiadro:** jedzenie zjeżdża tylko węższym otworem, do sali — nigdzie indziej. Kopiąc pod wiadrem, sprowadzasz
  je niżej; Nakarm dosypuje do tego samego wiadra. Z głębi wraca się po jedzenie drogą wiernych: na jej zakrętach
  lina spada sama, a podłogi pod nią nikt nie kuje; warcie jedzenie donoszą robotnicy.
- **Pomieszczenia:** „wyznacz pomieszczenie” (B) i szablon — sypialnia, warsztat, kuźnia, korytarz, szyb, lina; kują
  je tylko zaznaczeni robotnicy (linę wieszasz sam, od razu), którym plan wskażesz. W warsztacie złoto staje się wiarą (krzyż leci do licznika), w kuźni żelazo
  — kolejnymi częściami zbroi rycerza, a minuta snu w sypialni zdejmuje osłabienia. Wszystko z animacją.
- **Ołtarz:** stoi od początku na środku sali, na kamiennym kopczyku, w smudze światła; podkopać go ani zasypać drogi do
  niego się nie da. Dotknięcie otwiera okno rytuałów płaconych krwią — modlitwa, szał krwi rycerza, wskrzeszenie
  poległego, ofiara krwi i ofiara życia; odprawia je pobożny stojący przy ołtarzu, każdy z własną animacją.
  „Okalecz się” i „ofiaruj” są już tylko tutaj, nie w szeptach.
- **Kruszce:** nad płytą liczniki żelaza i złota. Bez ekwipunku: robotnik rozbija kafel rudy, a okruch sam leci
  łukiem do licznika, który podbija liczbę i błyska. Wskazana robotnikowi ruda to „kop żyłę” — wykuwa całą kępę.

## W budowie (plan)
1. ~~**Sprzątanie i stały start**~~ — zrobione (wyżej).
2. ~~**Sterowanie i odstępy**~~ — zrobione (wyżej): medaliony, zaznaczanie, rozkazy, odmowa z animacją i dymkiem,
   robotnicy kopią tylko na rozkaz, postacie rozstawiają się i dopasowują krok. Przy okazji: pobożni i rycerz nie
   kopią, skorupa pęka od środka (rysa nie jest już pułapką), wiadra zjeżdżają tam, dokąd lud dojdzie, a droga
   wiernych liczy się schodami (bez zeskoków; pod górę nie przejdzie się tylko na zakrętach).
3. **Mapa, pomieszczenia, rzemiosło**
   - ~~3a. Mapa według szkicu~~ — zrobione (wyżej): szyb z jedzeniem do sali, trzy warstwy, żelazo i złoto, krypta
     nad rdzeniem, wolniejsze kucie z pękającą skałą, wiadra dla tych, którzy zeszli w głąb.
   - ~~3b. Liczniki kruszców na ekranie (żelazo, złoto)~~ — zrobione (wyżej): bez ekwipunku, okruch leci do
     licznika, „kop żyłę”, tablica atlasu „Kruszce”.
   - ~~3c. Szablony pomieszczeń do wykopania (sypialnia, warsztat, kuźnia, korytarz, szyb)~~ — zrobione (wyżej):
     złoto w warsztacie — dewocjonalia i wiara; żelazo w kuźni — części zbroi rycerza; sypialnia zdejmuje osłabienia.
   - ~~3d. Ołtarz z rytuałami — każdy z własną animacją~~ — zrobione (wyżej): ołtarz w sali pod światłem (decyzja
     użytkownika — nie w środkowej warstwie), drugi otwór na wiadro, okno rytuałów, pięć rytuałów za krew, drabiny (od 18.10 — liny),
     sen 60 s.
   - 3e. Ruiny z zabytkami (wydarzenie: weź — premia i kara — albo zostaw).
   - 3f. Części zbroi widoczne na rycerzu.
4. **Dwie dłonie** — dłoń z otchłani przecina pazurem linę wiadra (jedzenie staje, póki ktoś nie wejdzie po linie
   i jej nie sklei); dłoń anielska z góry: podkop, dar ludzi (robotnik w dłoni), dar krwi.
5. **Finał, bot, samouczek** — Wielki Pomnik pęka od modlitwy, z gruzów wychodzi boss, a dłoń z otchłani mu pomaga;
   bot pod nowe zasady; nowy samouczek, w którym kroki przewija się samemu.

Grafika (menu, boss i Strażnicy, ikonki) i muzyka adaptacyjna — zadania zespołu (Paweł, Milan).

## Obserwatorium (`trzewia-alpha-0.1-obserwatorium.html`)
Cztery okna gry na jednej stronie. W każdym gra bot, a ty patrzysz na żywo. Każde okno osobno: tempo (×¼ … ×20),
pauza, styl bota (*rozsądny*, *budowniczy*, *speedrun*, *bierny*), ziarno świata, „nowa partia”, „sama następna partia”
i dźwięk. Kliknij okno — powiększa się na cały ekran; **Esc** wraca, klawisze **1–4** przełączają. Okna obserwatorium
niczego nie zapisują w przeglądarce. Bot: `src/app/bot.ts`, tryb okna: `src/app/obserwowany.ts`, strona:
`scripts/obserwatorium/szablon.html`, budowa: `npm run obserwatorium`.

## Kod
TypeScript + Vite, jeden plik HTML (`npm run pack`). Symulacja w `src/sim/`, liczby do strojenia w `src/nastawy/`,
rysunek w `src/render/` (postacie ludu w `src/render/lud/`), ekrany w `src/app/screens/`.
Testy: `npm test` (światy i skorupa), próby botów: `node scripts/proby-graczy.mjs`.
