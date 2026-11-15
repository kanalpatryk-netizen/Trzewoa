# TRZEWIA — Krąg Trzeci (beta, komputer)

Wersja próbna na bazie **Alphy 1**: gra przeniesiona do **trzeciego kręgu piekła Dantego** — kręgu żarłoków
(Piekło, pieśń VI). Zrobiona szybko, „bez przykładania gigantycznej wagi do szczegółów” (polecenie użytkownika
15.11). `alpha-1/` zostaje bez zmian. Zapisy, ustawienia, atlas i osiągnięcia są tu osobne (klucze `trzewia-krag-3-beta:`).

Uruchomienie: `npm ci`, potem `npm run dev` (podgląd) albo `npm run pack` (jeden plik `trzewia.html`).

## Fabuła
Krąg trzeci. Wieczny deszcz, zimny i ciężki, bije w cuchnącą ziemię. Tu leżą żarłocy — za życia służyli brzuchowi,
teraz brzuch służy błotu. Jesteś ziemią tego kręgu. Garstka **potępionych** (dawny lud: robotnicy, pobożni, rycerz)
chce zejść niżej — jedyna droga z piekła wiedzie przez jego dno. W lochu na dnie śpi zakuty w kamień **Cerber**.
Modlitwa budzi po kolei jego trzy głowy; gdy posąg pęknie, Cerber wstaje i trzeba go pokonać. Wygrana to
„Zejście do kręgu czwartego”.
Prolog wyświetla się na początku partii (`rysujProlog` w `src/render/krag.ts`).

## Nowe mechaniki (`src/sim/krag.ts`, liczby: `src/nastawy/krag.ts`)
- **Obżarstwo.** Gdy w wiadrze jest jedzenia w bród, potępieni jedzą ponad głód. Obżarty robi się wolniejszy, słabiej kuje
  i bije (zielonkawe smugi smrodu nad głową), a przejedzony **pada twarzą w błoto** i leży ok. 10 s (kałuża z bąblami).
  Za mało jedzenia oznacza głód, a za dużo grzech.
- **Ulewa.** Z nieba leje zawsze, a co jakiś czas przychodzi ulewa: grad, brudny śnieg, błyskawice. W ulewie zimno
  przyspiesza głód (×1,15), a błoto spowalnia krok (×0,9). Pod ziemią ze stropów kapie woda.
- **Okup dla Cerbera.** Jak Wergiliusz w pieśni VI: w walce ktoś z potępionych (najczęściej rycerz, który stoi najbliżej)
  rzuca w paszczę garść jedzenia. Trzy głowy żrą i przez 2,5 s nie gryzą. Kosztuje to 2 porcje z wiadra albo
  z niesionego jedzenia, okup może być raz na 5 s.

## Wygląd
- **Cerber** (`src/render/cerber.ts`) jest rysowany kodem, tuszem jak reszta gry. Ma trzy głowy z osobnymi szczękami
  i żarzącymi się oczami, tłustą czarną brodę-grzywę, obroże z kolcami, szeroki brzuch żarłoka i wężowy ogon.
  - Posąg w lochu to kamienny pies leżący jak sfinks, zakuty w łańcuchy. Oczy budzących się głów zapalają się
    z kolejnymi stanami pękania.
  - Wstaje z gruzu i wyje na trzy gardła. Kona w złotym świetle i rozpada się na bryły.
  - W walce odgrywa te same ruchy, co dawny demon (`src/render/cerber-boss.ts`): ciosy to kłapnięcia jednej głowy,
    zgniecenie to kłapnięcie trzech, tupnięcie i uderzenie w ziemię to stanięcie dęba. Tchnienie to ogień ze
    środkowej paszczy, bicz to smagnięcie ogonem, szarża to przysiad i skok, a ryk to wycie trzech głów. Przy okupie
    głowy żrą.
- **Brzeg kręgu zamiast katedry** (`src/render/krag.ts`): na powierzchni stoją poszarpane turnie z naturalnym łukiem
  nad szybem, a w łuku jest szczelina w chmurach, z której pada jedyne światło łaski. Na lewej turni rośnie martwe drzewo.
  Na powierzchni leżą w błocie żarłocy.
- Barwy świata to zgniła zieleń i sina szarość zamiast ciepłej sepii (`barwaKregu`). Strażnicy Snu to teraz
  **Cienie Żarłoków** (zielonkawe).
- Teksty zmienione: nazwy (Cerber, posąg Cerbera, potępieni, Cienie Żarłoków), kronika, zakończenia.

## Próby bota (`node scripts/proby-graczy.mjs $PWD <ziarno> rozsadny 40 plik.log`)
Ziarna 3, 5 i 11 kończą się wygraną w ok. 15 minut gry, ziarno 7 przegrywa z głodu. W Alphie 1 bot wygrywa na tych
ziarnach w 14–16 minut. Pierwsze, ostrzejsze liczby ulewy i obżarstwa przegrywały 2 z 2 partii, stąd obecne łagodniejsze.

## Czego nie ruszano (do zrobienia, jeśli wersja się przyjmie)
Konwój z końmi przy wiadrze, ikony i ryciny w księdze, freski w atlasie, menu i samouczek mają jeszcze motywy
z Alphy 1. Film intro (`filmy/intro.mp4`) jest stary.
