import type { Scena } from './cutscene';
import { rysujGore } from './art/gora';
import { rysujPamiec } from './art/pamiec';
import { rysujZyly } from './art/zyly';
import { rysujZiarno } from './art/ziarno';
import { rysujSzept } from './art/szept';
import { rysujZnak } from './art/znak';
import { rysujKrew } from './art/krew';
import { rysujSpis } from './art/spis';
import { rysujKronike } from './art/kronika';
import { rysujOrgany } from './art/organy';
import { rysujRasy } from './art/rasy';
import { rysujPrzyplyw } from './art/przyplyw';
import { rysujCel } from './art/cel';

/** Scenariusz wprowadzenia. Każda scena tłumaczy jedną regułę i pokazuje jej obraz. */
export const SCENY: Record<string, Scena> = {
  kimJestes: {
    id: 'kimJestes', tytul: 'Kim jesteś',
    rysunek: rysujGore,
    linie: [
      'Nie jesteś bogiem, który rządzi podziemiem. Jesteś podziemiem — górą, która śni.',
      'Korytarze są twoimi żyłami, jaskinie płucami, a na samym dnie bije rdzeń: twoje serce, zamknięte w kamieniu.',
      'W tobie mieszkają rasy. Żywisz się tym, że o tobie myślą: ich modlitwą, ich strachem i ich śmiercią.',
      'Nie rozkazujesz im. Zmieniasz skałę, w której żyją, i szepczesz im do głów — a one robią resztę.',
    ],
  },

  cel: {
    id: 'cel', tytul: 'Jak się uwolnić',
    rysunek: rysujCel,
    linie: [
      'Twój rdzeń jest uwięziony w skorupie. Nie rozkuje jej żaden kilof i żadna twoja moc.',
      'Pęka tylko od modlitwy. Najpierw jedna nacja musi uwierzyć w ciebie mocno — Znak przy jej gnieździe pomaga.',
      'Potem trzech jej wiernych musi stanąć przy samym rdzeniu i modlić się, aż kamień pęknie — kafel po kaflu, zwykle pięć razy.',
      'Gdy skorupa się otworzy, wierni sami zejdą do środka. Kto wierzy i dotknie rdzenia — uwalnia cię. To jest wygrana.',
    ],
  },

  zagrozenie: {
    id: 'zagrozenie', tytul: 'Jak przegrać',
    rysunek: rysujSpis,
    linie: [
      'Pod płytą leży wstęga: każda rasa ma w niej swoje pasmo.',
      'Gdy jedna krew zjada resztę, zwycięzcy przestają się bać i przestają o tobie myśleć. Gdy wszyscy giną — nie ma kto myśleć.',
      'Wtedy z góry i z dołu zsuwa się powieka. Gdy się zamknie, zasypiasz — i to jest koniec.',
      'Dlatego karm słabych, osłabiaj silnych i pilnuj, żeby w tobie zawsze ktoś żył. A w tym czasie prowadź jedną nację do rdzenia.',
    ],
  },

  narzedzia: {
    id: 'narzedzia', tytul: 'Czym działasz',
    rysunek: rysujOrgany,
    linie: [
      'Masz cztery ryty: Kształtuj skałę, Zasiej jedzenie i rudę, Szepnij komuś myśl, postaw Znak.',
      'Płacisz Krwią, która przybywa z każdą śmiercią, i Wiarą, która przybywa z każdą modlitwą.',
      'Klepsydra zatrzymuje czas: w pauzie planujesz rozkazy, a dzieją się naraz, gdy puścisz. Gra sama staje przy kryzysach.',
      'Nad płytą zawsze stoi jedno zdanie — co teraz najpilniejsze. A w rogu płyty widać, ile zostało do wolności. Zaraz pokażę ci wszystko palcem.',
    ],
  },

  pamiec: {
    id: 'pamiec', tytul: 'Ciemność',
    rysunek: rysujPamiec,
    linie: [
      'Wiesz o sobie tylko tyle, ile wiedzą ci, którzy w tobie chodzą.',
      'Tam, gdzie ktoś właśnie jest, rysunek ma pełną kreskę. Tam, gdzie ktoś był — blaknie i pokazuje stan sprzed pokoleń, nie dzisiejszy.',
      'Tam, gdzie nie ma nikogo, nie ma nawet kreski — sama ciemność.',
      'Drąż im drogi, a będą chodzić dalej. Im dalej chodzą, tym więcej o sobie widzisz.',
    ],
  },

  zasoby: {
    id: 'zasoby', tytul: 'Wiara, krew i oddanie',
    rysunek: rysujOrgany,
    linie: [
      'Nie ma pasków ani liczb. Zasoby są rzeczami, które widzisz w ramie obrazu.',
      'Wiara zbiera się pod sklepieniem jak dym ofiarny. Bierze się z modlitwy przy ołtarzach i kuźniach, a najwięcej z ofiary, którą składają sami.',
      'Krew podnosi się w szczelinie u dołu. Płaci ci ją każda śmierć w twoich trzewiach — cudza wojna jest twoim dochodem.',
      'Złota studnia w ramie to oddanie: jak mocno wierzy w ciebie najwierniejsza nacja. Gdy przekroczy kreskę, jej wierni sami zejdą pod twój rdzeń.',
    ],
  },

  rasy: {
    id: 'rasy', tytul: 'Sześć sposobów istnienia',
    rysunek: rysujRasy,
    linie: [
      'Nie ma tu ras lepszych i gorszych. Każda istnieje inaczej i inaczej rośnie.',
      'Ślepy Lud rodzi dzieci i modli się najgorliwiej. Żużlowcy nie rodzą — wykuwają nowych kowali z rudy i żyją z ciepła kuźni.',
      'Prządki nie podbijają, tylko biorą w jarzmo i przerabiają cudze dzieci na swoje. Trolem nikt się nie rodzi: trolem się zostaje, gdy kopie się za głęboko.',
      'Grzybnia nie ma jednostek — rośnie ze zwłok i nie czci cię wcale. Ludzie nie mieszkają w tobie: schodzą z powierzchni po rudę i wracają.',
    ],
  },

  przyplyw: {
    id: 'przyplyw', tytul: 'Przypływ',
    rysunek: rysujPrzyplyw,
    linie: [
      'Co kilka tysięcy tików coś wchodzi z zewnątrz i tasuje planszę.',
      'Woda znajduje szczelinę i zalewa górne korytarze. Zaraza zabiera połowę sił każdemu. Żyła szaleństwa otwiera kryształ w głębi.',
      'Z powierzchni schodzą ludzie po rudę i sławę — a gdy góra pustoszeje, nowe plemię przychodzi samo, bo pustka przyciąga.',
      'Przypływu nie da się zatrzymać. Można tylko zdecydować, kto po nim zostanie.',
    ],
  },

  ksztaltuj: {
    id: 'ksztaltuj', tytul: 'Kształtuj',
    rysunek: rysujZyly,
    linie: [
      'Pierwszy czasownik rusza samą skałę i kosztuje Krew — a Krew bierze się z każdej śmierci w twoich trzewiach.',
      'Drążysz korytarz, żeby ktoś dotarł do rudy albo do sąsiada, z którym ma na pieńku.',
      'Zawalasz strop, żeby kogoś zasypać albo odciąć. Wpuszczasz wodę, żeby utopić tych, którzy nie pływają.',
      'Otwierasz żar, bo Żużlowcy nie postawią kuźni tam, gdzie nie ma ognia. Magma wpuszczona do wody zastyga w kamień i zamyka przejście na zawsze.',
    ],
  },

  zasiej: {
    id: 'zasiej', tytul: 'Zasiej',
    rysunek: rysujZiarno,
    linie: [
      'Nie rozkazujesz im, dokąd mają iść. Kładziesz w skale powód, żeby poszli.',
      'Grzyb to jedzenie, które rośnie samo — i to on wyznacza, ilu Ślepego Ludu góra udźwignie.',
      'Ruda karmi kuźnie: Żużlowcy nie rodzą dzieci, tylko wykuwają nowych kowali za trzy sztuki rudy.',
      'Kości są jedzeniem od ręki i paliwem dla grzybni. Trucizna to kryształ: kto go kopie, wraca z głębi inny.',
    ],
  },

  szept: {
    id: 'szept', tytul: 'Szepcz',
    rysunek: rysujSzept,
    linie: [
      'Najtańszy czasownik i jedyny, który dotyka kogoś po imieniu. Płacisz Wiarą.',
      'Dotykasz jednego stworzenia — otwiera się jego karta: rasa, nacja i jedno zdanie o tym, kim jest.',
      '„Kop w dół" wysyła je głębiej, niż powinno; głębia daje kryształ i szaleństwo. Kto oszaleje do końca, wraca trolem.',
      '„Prorokuj" robi z niego proroka: odchodzi z sześcioma wiernymi i zakłada własną nację, która od razu ma urazę do dawnej.',
      'To jest twoje główne narzędzie. Wojny nie zaczyna się armią, tylko jedną myślą w jednej głowie.',
    ],
  },

  znak: {
    id: 'znak', tytul: 'Znak',
    rysunek: rysujZnak,
    linie: [
      'Jawny cud. Drogi — czterdzieści pięć Wiary — i widzą go wszyscy w promieniu dwudziestu sześciu kafli.',
      '„Objawienie" podnosi oddanie i gasi strach: modlą się gorliwiej, więc więcej Wiary wraca do ciebie.',
      '„Panika" robi odwrotnie — rozbija oblężenie, wypędza za silną nację z cudzego terenu, ale oddanie spada.',
      'Po Znaku zostaje w skale świecący glif. Modlitwa przy nim liczy się podwójnie.',
    ],
  },

  skaz: {
    id: 'skaz', tytul: 'Skaź',
    rysunek: rysujKrew,
    linie: [
      'Ostatni czasownik zmienia krew całego gatunku i nie da się tego cofnąć.',
      'Płacisz Krwią i Otchłanią: dotykasz jednego przedstawiciela, a zmiana idzie przez wszystkie pokolenia po nim.',
      'Każda skaza ma cenę. Płodność skraca życie i podnosi głód. Żądza krwi daje siłę, ale oni przestają się modlić.',
      'Ślepota spowalnia, za to każda modlitwa liczy się podwójnie. Kamienna skóra daje twardość kosztem kopania.',
    ],
  },

  spis: {
    id: 'spis', tytul: 'Spis ras i Sen',
    rysunek: rysujSpis,
    linie: [
      'Pod płytą leży wstęga warstw — tyle miejsca, ile zajmuje każda rasa.',
      'Dopóki warstwy są różne, żyjesz. Gdy jedna zaczyna zjadać wstęgę, zwycięzcy przestają się bać i przestają cię potrzebować.',
      'Wtedy Wiara i Krew wysychają, a z góry i z dołu zaczyna zsuwać się powieka. To twoja jedyna przegrana: zaśnięcie.',
      'Dlatego cała gra polega na jednym: podtrzymuj konflikt, ale nie pozwól nikomu wyginąć.',
    ],
  },

  kronika: {
    id: 'kronika', tytul: 'Kronika',
    rysunek: rysujKronike,
    linie: [
      'Gra przez cały czas pisze. Jedna linijka na dole mówi, co się właśnie stało i jak oni to nazwali.',
      'Są trzy końce: zaśnięcie, albo ktoś dojdzie do twojego rdzenia i uklęknie — to wolność — albo dojdzie i nie uklęknie.',
      'W każdym z nich zostaje po tobie kronika — spisana legenda tego, czym byłeś dla tych, którzy w tobie mieszkali.',
      'To jest twój wynik. Teraz zejdź i zobacz, co z tobą zrobią.',
    ],
  },
};
