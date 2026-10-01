# Trzewia — wersja na Androida

Ta sama gra co w [`pc/`](../pc), dopasowywana do telefonu: dotyk zamiast myszy i klawiatury,
mały ekran trzymany pionowo albo poziomo. Symulacja (świat, ludy, rytuał) jest taka sama —
zmienia się tylko to, jak gra wygląda i jak się jej dotyka.

## Co jest inaczej niż na komputerze

| Obszar | Na telefonie |
|---|---|
| **Skala** | obraz 1:1 z ekranem telefonu — na komputerze mały ekran był ściskany (poziomo do 64%) |
| **Układ w pionie** | przyciski pod płytą, a nie na niej; mniejszy dolny margines; wstęga drogi na dole płyty — u góry mieszkają ludy |
| **Układ w poziomie** | własny, zwarty: ryty z lewej, przyciski w kolumnie z prawej, pod płytą jeden cienki pasek (spis, Otchłań, krew) |
| **Narzędzia** | duże pola nad płytą zamiast drobnych słów; opis narzędzia na dole płyty |
| **Karta mieszkańca** | większe pola myśli do szeptu |
| **Przytrzymanie** | przytrzymanie palca na rycie otwiera jego tablicę (zamiast prawego przycisku) |
| **Opis rytu** | pokazuje się na chwilę po wybraniu rytu (palec nie „najeżdża” jak mysz) |
| **Podpowiedzi** | bez klawiszy, „esc”, „kółka myszy” i prawego przycisku; „kliknij” → „dotknij” |
| **Ustawienia** | przewijanie palcem, przycisk „‹ menu”, przełącznik „Pełny ekran”, dział „Dotyk”; bez listy klawiszy |
| **Wstęp samouczka** | „pomiń wstęp ›” w rogu zamiast „P albo esc” |
| **Pełny ekran** | włącza się przy „dotknij, aby się obudzić” (można wyłączyć w ustawieniach) |
| **Przycisk „wstecz”** | działa jak Esc: odkłada ryt, zamyka kartę, zapiski, atlas, wraca do menu — dopiero w menu wychodzi |
| **Ekran** | nie gaśnie w trakcie partii i samouczka |
| **Kronika i minimapa** | schowane — kronika jest pod przyciskiem zapisków, płytę przesuwa się palcem |

## Zapisane wersje

Każda zapisana wersja ma własne wydanie z plikiem APK, które zostaje na stałe
(lista w `.github/workflows/android-wersje.yml`):

| Wersja | Co w niej jest | APK |
|---|---|---|
| **v1** | pierwsza wersja na telefon: układ ekranu, dotyk, pełny ekran; mechanika jak na komputerze | [`Trzewia-v1.apk`](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/v1/Trzewia-v1.apk) |
| **v2** | prostsza mechanika i wytłumaczona wiara | [`Trzewia-v2.apk`](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/v2/Trzewia-v2.apk) |
| **v3** | karty wydarzeń z wyborem, trzy ryty, zawsze poziomo (niżej) | [`Trzewia-v3.apk`](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/v3/Trzewia-v3.apk) |

Najnowsza wersja z gałęzi jest zawsze pod
[`android-apk/Trzewia.apk`](https://github.com/kanalpatryk-netizen/Trzewoa/releases/download/android-apk/Trzewia.apk).

## Mechanika na telefonie (v3)

Mniej rzeczy do ogarnięcia, więcej decyzji. Główny sposób grania to **karty wydarzeń**:

| Co | Na komputerze | Na telefonie |
|---|---|---|
| **Ryty** | pięć: Kształtuj, Zasiej, Szepcz, Znak, Skaź | trzy: **Nakarm** (grzyb), **Szepnij** („módl się”, „prorokuj”), **Cud** |
| **Zasoby** | Krew, Wiara, Otchłań | Krew i Wiara — nad płytą jako liczby, obok oddania i snu |
| **Wydarzenia** | przypływy, na które się nie wpływa | karty z wyborem: czas staje, 2–3 wybory, każdy z ceną i skutkiem |
| **Wojny** | — | karta „pierwsza krew”: rozdziel nacje (rozejm na 2 min) albo pozwól walczyć |
| **Droga pod rdzeń** | gracz ją drąży | drąży ją góra; jest sucha i ma stopnie, więc da się nią wrócić |
| **Warta** | trzech wiernych jednej nacji | trzech wiernych z dowolnych nacji; w drodze się nie starzeją i głodnieją 5× wolniej |
| **Ekran** | dowolny | zawsze poziomo |

Studnia oddania (dolna rama) pokazuje oddanie najwierniejszej nacji, a kreska na niej — próg,
od którego nacja sama wysyła wartę pod rdzeń.

## Gdzie to jest w kodzie

- nastawy telefonu: [`src/nastawy/ekran.ts`](src/nastawy/ekran.ts) (`EKRAN`, `TELEFON`) i
  [`src/nastawy/sterowanie.ts`](src/nastawy/sterowanie.ts) (`STEROWANIE`: podpowiedzi klawiszy,
  czas przytrzymania, próg przewijania);
- układ płyty i marginesów: [`src/render/plate.ts`](src/render/plate.ts) (`computePlate`, `Plate.niski`),
  [`src/render/przyciski.ts`](src/render/przyciski.ts);
- system telefonu (pełny ekran, „wstecz”, blokada wygaszania): [`src/core/android.ts`](src/core/android.ts).

## Uruchomienie i testy

```bash
npm install
npm run dev              # http://localhost:5180 — w przeglądarce włącz widok telefonu
npm run pack             # trzewia.html — jeden plik do wgrania na telefon
npm test                 # testy symulacji
npm run test:nakladanie  # przy działającym npm run dev: 11 rozmiarów telefonów i tabletów
```
