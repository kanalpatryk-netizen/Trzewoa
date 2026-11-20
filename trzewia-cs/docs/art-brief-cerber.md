# Zlecenie dla grafika — Cerber, dłoń, zejście (etap 5 oprawy)

Projekt dla człowieka, nie dla narzędzia. `tools/ink-pipeline/` (etap 5) przerabia już istniejące obrazki
automatycznie — to łatka, nie docelowa grafika. Ten brief zamawia to, czego narzędzie zrobić nie może: nowe
rysunki od kogoś, kto naprawdę umie rysować rycinę.

## Styl

- Wzór: ryciny Gustave'a Doré do „Piekła” Dantego (domena publiczna — do obejrzenia, nie do kopiowania).
  Kreskowanie zamiast miękkich cieni i połysku; ukośna kreska, krzyżowa w najciemniejszych miejscach; kontur
  rylcem, nie miękki cień.
- Paleta: jedna na całą grę, `Trzewia.Nastawy.NastawyBarwy.BARWA` i `.FRESK` (patrz
  `src/Trzewia.Gra/Visual/Palette.cs` — tam te same barwy pod nazwami tusz/pergamin/kość/krew/żar/złoto itd.).
  Prawie monochromatyczne: ciemność ciepła (sadza, kamień), kolor tylko tam, gdzie świat go naprawdę ma —
  krew (`#8a1a16`/`#c2503c`), żar pieca i oczu (`#ff8c32`/`#e0a860`), złoto rytów (`#c49a50`). Żadnego innego
  koloru — żadnej zieleni, błękitu, różu.
- Kierunek światła: zimne, słabe światło z góry (otwór szybu) + ciepły żar z dołu i z przodu (piec, oczy,
  krew) — to ta sama zasada, którą ma już reszta gry (`Visual/SwiatloOprawy.cs`, etap 1): ciemność jest
  ciepła, światło pojawia się tylko przy źródłach. Cerber stoi w piecu, więc dolne/przednie krawędzie
  (podgardle, łapy, pierś) powinny mieć żarowy rant, reszta — zimny, prawie czarny kontur.
- Bez połysku, bez podskórnego rozpraszania światła (SSS), bez gładkich gradientów renderu 3D — płasko
  cieniowane tony plus kreska, jak w drzeworycie/miedziorycie.

## Zakres

### 1. Cerber — pełny rig od nowa

Obecne obrazki (`dane/grafika/krag/cerber/*.webp`, 181 plików) to błyszczący render 3D przepuszczony teraz
przez `tools/ink-pipeline/` — ujdzie, ale to łatka na starym materiale, nie docelowa grafika. Docelowo: te same
181 części (ciało w krokach/przysiadzie/dębie/leżeniu, trzy głowy w kilku fazach ataku/obrażeń/skamienienia,
szyja, ogon, kikuty po ścięciu, odcięte głowy) narysowane od razu w stylu ryciny — nie renderowane i odbarwiane.
Lista części, ich rozmiary i punkty zaczepienia: `dane/grafika/krag/cerber/dane.json` (pole `S` — skala, px na
jednostkę wysokości stwora, zwykle 700; `x0`/`y0` — punkt zaczepienia w jednostkach). Rozmiary w pikselach
podobne do obecnych (ciało ok. 470–600×480×, głowa ok. 260–350 px) — nowe wymiary nie muszą być identyczne
(silnik skaluje), ale proporcje (środek ciężkości, punkt zaczepienia) powinny zostać zbliżone, żeby ruchy
walki (`RUCHY_BOSSA`) nadal składały się sensownie.

### 2. Dłoń — 3 kluczowe klatki

Dłoń (`Rysunek/DlonDemona.cs`) ma trzy zachowania; po jednej reprezentatywnej klatce na każde wystarczy jako
materiał odniesienia (nie każda poszczególna faza):
1. **Rzut** — dłoń chwyta rycerza i unosi go nad bossem, gotowa do rzutu (faza „unosi”/„rzuca”).
2. **Tarcza** — dłoń stoi otwarta przed bossem, zasłaniając go (faza „stoi”).
3. **Zawał stropu** — dłoń wyrasta ze stropu, szarpiąc go w dół (faza „drze”/„wali”).

Dziś dłoń to model 3D rysowany na żywo (`Rysunek/Model3D/Dlon3D.cs`, decyzja użytkownika 12.11 — świadoma
zmiana wobec TS, gdzie dłoń to były klatki z obrazków). Te trzy rysunki są więc **materiałem odniesienia**
do oceny, czy wrócić do klatek z obrazków w stylu ryciny, czy tylko spłaszczyć materiał modelu 3D (usunąć
połysk/SSS z oświetlenia) — decyzja osobna, nie część tego zlecenia.

### 3. Otwarte przejście w dół

Gdy pieczęć pęka, droga w dół stoi otworem (napis „Droga w dół stoi otworem.” — etap 4), ale sam otwór to dziś
tylko ciemna dziura w geometrii pieca/podłogi (`Rysunek/Krag/PomnikKregu.cs`), bez własnej grafiki. Przydałby
się rysunek: krawędź rozłupanej pieczęci, schody/uskok schodzący w ciemność, żar z głębi. Rozmiar i punkt
zaczepienia dobrać tak, żeby pasowały na miejscu obecnego otworu w podłodze korytarza (patrz
`PomnikKregu.rysujWstajacegoCerbera`/`rysujPomnik` dla obecnej geometrii pieca).

## Czego NIE dotyczy to zlecenie

Złoty trójkąt (strzałka celu) i dusze w tle (potępieni) — opisane i tylko zaproponowane w raporcie etapu 5,
nie zlecane tu; ewentualna nowa grafika dla nich — osobna decyzja po akceptacji propozycji.
