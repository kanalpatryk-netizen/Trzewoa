# Trzewia — Propozycja 1 (na bazie Alphy 0.2)

Wersja próbna z propozycjami Pawła z 24.10.2026. Zbudowana na Alphie 0.2 z `main` (stan po PR #30).
[`../alpha-0.2/`](../alpha-0.2) zostaje bez zmian. Zapisy, ustawienia, atlas i osiągnięcia są tu osobne
(klucze `trzewia-propozycja-1:`).

Gra: [`trzewia.html`](trzewia.html) — pobierz i otwórz w przeglądarce (jeden plik, działa bez internetu).

## Co nowego względem Alphy 0.2
- **Blok pod wiadrem:** robotnicy nie kopią przez blok, na którym stoi wiadro. Szukają drogi obok, a gdy jej
  nie ma, odmawiają. Rozkaz „kop” wskazany wprost na ten blok (albo ramka, która go obejmuje) odblokowuje tylko
  ten blok — gdy wiadro zjedzie niżej, blok, na którym stanie, znów jest zablokowany. Pobożny i rycerz nie kopią,
  idąc na przełaj.
- **Droga wiernych jako szyb ze schodami:**
  - szyb szeroki na 5 kafli przy lewej ścianie sali, prosto w dół do krypty;
  - we wnęce na start stoi rama z lampką, kilof i strzałka;
  - w każdym wykutym kaflu same pojawiają się schody, którymi chodzi się w obie strony;
  - plan widać zawsze;
  - pomnik pęka dopiero przy wykopanej drodze.
- **Ramka jak w Twierdzy:** lewy przycisk myszy przeciągnięty po mapie zaznacza postacie. Gdy w ramce nikogo nie
  ma, a zaznaczeni są robotnicy, oznacza skałę do wykucia. Widok myszą przesuwa się prawym albo środkowym przyciskiem.
- **Pomieszczenia gdziekolwiek:** także w litej skale i nad pustką. Robotnicy się do nich przekopują, a brakującą
  podłogę lud układa sam.
- **Interfejs** (rysowany w kodzie jako placeholdery do podmiany na grafiki):
  - zasoby w dwóch ramkach: duża na wiarę, krew z ampułką i jedzenie, mniejsza na żelazo i złoto;
  - kamienne tła pod mocami, oddaniem i przyciskami (każdy przycisk we własnej przegródce);
  - płótno pod medalionami postaci;
  - kronika jako otwarta księga.

Szczegóły, decyzje i dalsze kroki: [`../handoff.md`](../handoff.md), sekcja 0. Uruchamianie i testy tak jak w Alphie 0.2:
`npm install`, `npm run dev`, `npm test`, `npm run pack`.
