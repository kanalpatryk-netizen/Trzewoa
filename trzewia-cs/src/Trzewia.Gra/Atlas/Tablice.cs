// Port: alpha-1/src/atlas/tablice.ts — tablice atlasu: u góry rycina, pod nią nazwa, łaciński podpis, kilka zdań o tym,
// czym to jest, i jedno — kiedy tego użyć. Teksty biorą liczby z nastaw, żeby nie kłamały po strojeniu. Treść tablic
// przeniesiona skryptem (szablony TS → napisy C#), wyliczane opisy walki — ręcznie.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyMoce;
using static Trzewia.Nastawy.NastawyWydarzenia;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Nastawy.NastawyWiadro;
using static Trzewia.Nastawy.NastawyAniol;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Nastawy.NastawyKruszce;
using static Trzewia.Nastawy.NastawyPolecenia;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Nastawy.NastawyZbroja;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyWalka;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Atlas.RycinyAtlasu;
using Trzewia.Nastawy;

namespace Trzewia.Atlas
{
    /// <summary>
    /// Tablica z atlasu: u góry rycina, pod nią nazwa, łaciński podpis, kilka zdań o tym, czym to jest, i jedno — kiedy tego
    /// użyć. grupa: 'rasy' | 'ryty' | 'zasoby' | 'prawa'.
    /// </summary>
    public sealed class Tablica
    {
        public string id = "", grupa = "", nazwa = "", lacina = "", opis = "", kiedy = "";
        /// <summary>Koszt w słowach — tylko ryty.</summary>
        public string? koszt;
        public Action<PlotnoRyciny> rycina = null!;
    }

    public static class Tablice
    {
        public static readonly Dictionary<string, string> NAZWY_GRUP = new Dictionary<string, string>
        {
            ["rasy"] = "Twój lud", ["ryty"] = "Trzy ryty", ["zasoby"] = "Czym płacisz i czym żyją", ["prawa"] = "Prawa góry",
        };

        static string S(double v) => Js.Js.S(v);
        static string S(string v) => v;
        /// <summary>Pole opcjonalne nastaw: brak — „undefined”, jak w szablonie JS.</summary>
        static string S(double? v) => v is { } x ? Js.Js.S(x) : "undefined";
        static double R(double? v) => v is { } x ? Math.Floor(x + 0.5) : double.NaN;
        static double R(double v) => Math.Floor(v + 0.5);
        /// <summary>Próg w procentach — teksty tablic biorą liczby z nastaw.</summary>
        static string proc(double x) => $"{Js.Js.S(R(x * 100))}%";

        static string kosztSlowami(string v, string narzedzie)
        {
            var c = Moce.cost(v, narzedzie);
            var cz = new List<string>();
            if (c.krew != 0) cz.Add($"{S(c.krew)} krwi");
            if (c.wiara != 0) cz.Add($"{S(c.wiara)} wiary");
            return cz.Count > 0 ? string.Join(", ", cz) : "nic";
        }

        static readonly string[] CZESCI_ZBROI = { "helm", "naramienniki", "napiersnik", "nakolanniki", "tarcza" };
        static readonly Dictionary<string, string> NAZWY_CZESCI = new Dictionary<string, string> { ["helm"] = "hełm", ["napiersnik"] = "napierśnik", ["naramienniki"] = "naramienniki", ["nakolanniki"] = "nakolanniki", ["tarcza"] = "tarcza" };
        static string wymagania(RuchRycerza d) =>
            string.Join(" + ", new[] { d.weteran == true ? "weteran" : "" }.Concat((d.zbroja ?? Array.Empty<string>()).Select(z => NAZWY_CZESCI.TryGetValue(z, out var n) ? n : z)).Where(x => x != ""));

        /// <summary>Opis tablicy „Walka rycerza” — wyliczany z ruchów (w TS: funkcja wołana od razu).</summary>
        static string opisWalkiRycerza()
        {
            var ruchy = IdRuchuRycerza.Select(i => RUCHY_RYCERZA[i]).ToList();
            string grupa(Func<RuchRycerza, bool> f) => string.Join(", ", ruchy.Where(d => d.rodzaj == "atak" && f(d)).Select(d => d.nazwa.ToLowerInvariant()));
            var zbr = string.Join(", ", ruchy.Where(d => d.rodzaj == "atak" && d.zbroja != null && d.weteran != true).Select(d => $"{d.nazwa.ToLowerInvariant()} ({wymagania(d)})"));
            return $"Rycerz walczy ruchami — każdy to osobna, długa animacja z zamachem, uderzeniem i powrotem do gardy, a rana pada dokładnie wtedy, gdy spada ostrze. Zawsze: {grupa(d => d.weteran != true && d.zbroja == null)}. Tylko weteran: {grupa(d => d.weteran == true)}. Tylko w zbroi z kuźni: {zbr}. Broni się sam: z tarczą zasłania się blokiem (zostaje ułamek rany), weteran paruje ostrzem i od razu kontruje, w nakolannikach robi unik, w napierśniku przyjmuje cios na blachę i tnie. Mała rana tylko go wzdryga, duża przerywa atak, a najcięższe ciosy demona zwalają go z nóg — wstaje, podpierając się mieczem. Iskry, odpryski i odrzut są tym większe, im mocniejszy cios.";
        }

        /// <summary>Opis tablicy „Walka demona” — wyliczany z ruchów bossa.</summary>
        static string opisWalkiDemona()
        {
            string z(string r) => string.Join(", ", IdRuchuBossa.Select(i => RUCHY_BOSSA[i]).Where(d => d.rodzaj == r)
                .Select(d => d.nazwa.ToLowerInvariant() + (d.zycieDo is { } zd && zd != 0 ? $" (gdy życia mniej niż {S(R(zd * 100))}%)" : "")));
            return $"Demon walczy dziewiętnastoma ruchami, każdy z długim zamachem — widać, co nadchodzi. W zwarciu: {z("atak")}. Na obszar: {z("obszar")}. Z dystansu: {z("dystans")}. Do tego {z("zdolnosc")}. Gdy rycerz bierze zamach, czasem zasłania się przedramieniem (zostaje połowa rany — fintę przepuszcza); po ciężkim ciosie się chwieje i nie bije, a przy połowie i ćwierci życia pada na kolano, a potem ryczy. Ciosy z góry, podcięcie, szarża i wybuch aureoli mogą powalić rycerza, przygniecenie trzyma go pod dłonią.";
        }

        /// <summary>Krew: ten sam relikwiarz co pod płytą (telefon), na kamiennej płycie ołtarza, krwi w nim dwie trzecie.</summary>
        static void krewRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            var wys = Math.Min(h * 0.82, (w * 0.7) / Relikwiarz.RELIKWIARZ_PROPORCJA);
            var cx = w / 2 + Math.Min(w * 0.08, h * 0.2);
            var dol = h * 0.9;
            ctx.save();
            var g = ctx.createRadialGradient(cx, dol - wys * 0.5, 4, cx, dol - wys * 0.5, wys * 0.75);
            g.addColorStop(0, "rgba(150,40,26,0.28)");
            g.addColorStop(1, "rgba(150,40,26,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "rgba(24,17,13,0.95)";
            ctx.fillRect(cx - wys * 0.62, dol - wys * 0.015, wys * 1.24, wys * 0.06);
            ctx.strokeStyle = "rgba(206,192,166,0.45)"; ctx.lineWidth = 1;
            ctx.strokeRect(cx - wys * 0.62, dol - wys * 0.015, wys * 1.24, wys * 0.06);
            Relikwiarz.rysujRelikwiarz(ctx, cx - (wys * Relikwiarz.RELIKWIARZ_PROPORCJA) / 2, dol - wys, wys, GORA.krewMax * 0.66, GORA.krewMax, t, pamietaj: false);
            ctx.restore();
        }

        public static Tablica? tablica(string id) => TABLICE.FirstOrDefault(t => t.id == id);

        public static readonly Tablica[] TABLICE =
                {
          // lud
          new Tablica
          {
            id = "rasa-0", grupa = "rasy", nazwa = "Pobożni", lacina = "Gens pia",
            opis = $"Twój jedyny lud — stała drużyna: {S(LUD.start.robotnik)} robotników, {S(LUD.start.pobozny)} pobożnych i {S(LUD.start.rycerz)} rycerz. Nikt się w nim nie rodzi i skała nie wydaje nowych — każda śmierć to strata na całą partię. Mieszkają przy siedzibie, a odcięte grupki zakładają obozy.",
            kiedy = "Pilnuj, żeby zawsze był ktoś, kto się modli — bez pobożnych skorupa nie pęknie. Przy ołtarzu pobożny może oddać krew (słabnie, póki nie wyśpi się w sypialni) albo życie, a poległych da się tam wskrzesić.",
            rycina = postac(Race.GOBLIN, "modli"),
          },
          // ryty
          new Tablica
          {
            id = "ryt-zasiej", grupa = "ryty", nazwa = "Nakarm", lacina = "Situla de caelo",
            opis = $"Dotknij płyty, a z góry, tym samym szybem co zawsze, zjedzie {S(WIADRO.nakarmPorcji)} porcji jedzenia więcej — wiadro jest jedno: gdy stoi albo zjeżdża, dosypują do niego, a gdy go nie ma, zjeżdża od razu. Gdzie dotkniesz, nie ma znaczenia.",
            kiedy = "Gdy jedzenia w wiadrze nie starcza do następnego zjazdu. Do tych, którzy zeszli w głąb, jedzenie dotrze tylko wtedy, gdy pogłębisz szyb pod wiadrem albo robotnicy im je zaniosą.",
            koszt = $"wiadro {S(kosztSlowami("zasiej", "grzyb"))}",
            rycina = cala(RycinyScen.rysujZiarno),
          },
          new Tablica
          {
            id = "ryt-szept", grupa = "ryty", nazwa = "Szepnij", lacina = "Susurrus",
            opis = "„Szepnij”, potem dotknij jednej postaci i wybierz słowo na jej karcie. „Módl się” posyła pobożnego pod twój rdzeń od razu, bez względu na wiarę ludu. „Przerwij modlitwę” zawraca spod rdzenia. Ofiary krwi i życia nie są już szeptami — odprawia się je przy ołtarzu.",
            kiedy = "Gdy droga do rdzenia jest gotowa, szepnij „módl się” obu pobożnym — skorupa pęka szybciej, gdy modlą się razem.",
            koszt = $"módl się {S(kosztSlowami("szept", "modl"))}",
            rycina = cala(RycinyScen.rysujSzept),
          },
          new Tablica
          {
            id = "ryt-znak", grupa = "ryty", nazwa = "Cud", lacina = "Signum manifestum",
            opis = $"Jawny cud widziany w promieniu {S(MOCE.znakZasieg)} kafli. Każdy, kto go widzi, wierzy mocniej (+{S(proc(MOCE.objawienieOddanie))}) i mniej się boi, a oddanie ludu rośnie o {S(proc(MOCE.objawienieNacja))}. Zostaje świecący znak w skale, przy którym pobożni się modlą. Światło Cudu odpycha dłoń z otchłani (do {S(DLON.cudPromien)} kafli).",
            kiedy = "Przy siedzibie, żeby lud uwierzył dość mocno i sam ruszył pod rdzeń — i zawsze tam, gdzie spod ziemi bije czerwona łuna.",
            koszt = kosztSlowami("znak", "objawienie"),
            rycina = cala(RycinyScen.rysujZnak),
          },
          // zasoby
          new Tablica
          {
            id = "krew", grupa = "zasoby", nazwa = "Krew", lacina = "Sanguis",
            opis = $"Liczba w dużej ramce zasobów nad płytą, z ampułką: krew stoi w szkle tak wysoko, ile jej masz; pełna ampułka żarzy się, a nadmiar przepada, a gdy krwi za mało na rytuał, ampułka pulsuje czerwienią. Najedź na nią kursorem — zobaczysz, ile jej jest i co z tego wynika. Na Koszmarze zaczynasz z {S(Math.Max(0, LUD.krewStart - GORA.koszmarKrew))}, mieści się jej najwyżej {S(GORA.krewMax)}. Płaci ci ją każda śmierć — także Strażników Snu — i ofiary przy ołtarzu: krwi pobożnego (+{S(LUD.okaleczenieKrew)}) i jego życia (+{S(LUD.ofiaraKrew)}).",
            kiedy = "Wydajesz ją na rytuały przy ołtarzu, na liny, na dodatkowe jedzenie rytem Nakarm i na wybory na kartach wydarzeń.",
            rycina = krewRycina,
          },
          new Tablica
          {
            id = "wiara", grupa = "zasoby", nazwa = "Wiara", lacina = "Fides",
            opis = $"Liczba nad płytą — twój zapas, najwyżej {S(GORA.wiaraMax)}. Rośnie za każdym razem, gdy ktoś się do ciebie modli: przy kapliczce (pobożni stawiają je sami), przy znaku po Cudzie, w modlitwie przy ołtarzu, a najmocniej pod rdzeniem; +{S(STRAZNICY.nagrodaWiary)} za każdą pokonaną falę Strażników. Nie myl jej z oddaniem: wiara to twoja waluta, oddanie to to, jak mocno wierzy lud.",
            kiedy = "Płacisz nią za szepty, Cud i wybory na kartach wydarzeń.",
            rycina = cala(RycinyScen.rysujOrgany),
          },
          new Tablica
          {
            id = "wiadro", grupa = "zasoby", nazwa = "Wiadro z jedzeniem", lacina = "Situla panis",
            opis = $"Jedyne jedzenie ludu — grzyba ani spiżarni nie ma. Co {S(R(WIADRO.co / 120))} sekund na powierzchnię przyjeżdża konwój — wóz z parą koni — i z drewnianego kozła nad szybem spuszcza na linie wiadro pełne jedzenia ({S(WIADRO.porcjiNaGlowe)} porcji na każdego z ludu) — zawsze tym samym, węższym otworem obok szybu ze światłem, do sali z siedzibą; gdy poprzednie jeszcze tam stoi, zsyła do niego po linie worek. Wiadro jest jedno i ma jeden punkt, w który spada: na dno kolumny pod otworem. Pod wiadrem w podłodze sali da się kuć — kto wykopie tam dziurę, sprowadzi wiadro niżej (lina sięga do dna kolumny), ale wtedy ci z sali do niego nie sięgną. Do tych, którzy zeszli w głąb, wiadro samo nie zjedzie — nigdzie poza tym szybem się nie pojawia; wracają po jedzenie drogą wiernych (na jej zakrętach wiszą liny). Przed zjazdem ze stropu sypie się pył. Każdy może z niego jeść, i to do syta, robotnicy donoszą z niego jedzenie warcie; puste odjeżdża w górę. Kto umiera z głodu ({S(proc(WIADRO.wspinaczkaOd))} głodu), a wiadro jeszcze jedzie, wspina się po linie, wsiada do niego i je w drodze w dół.",
            kiedy = "Liczba „jedzenie” nad płytą to porcje w wiadrze. Gdy nie starcza, dosyp rytem Nakarm; gdy lud pracuje głęboko, pogłęb szyb pod wiadrem.",
            rycina = postac(Race.GOBLIN, "je"),
          },
          new Tablica
          {
            id = "kruszce", grupa = "zasoby", nazwa = "Kruszce", lacina = "Ferrum et aurum",
            opis = $"Żelazo i złoto — dwie liczby nad płytą, obok wiary, krwi i jedzenia. Nikt ich nie nosi: gdy robotnik rozbije kafel rudy, okruch sam leci do licznika i dodaje {S(KRUSZCE.zelazoZaKafel)} żelaza albo {S(KRUSZCE.zlotoZaKafel)} złota. Żelazo leży w kępach rdzawej rudy w płytkiej warstwie, tuż pod salą; złoto — w żółtych grudkach pod dnami jaskiń w warstwie środkowej, głębiej i twardsze. Wskaż zaznaczonemu robotnikowi rudę, a wykuje całą kępę — kafel po kaflu, najdalej {S(POLECENIA.zylaZasieg)} kafli od wskazanego. W dół schodzi stopniami, a podłogi pod złotą kreską drogi wiernych nie rusza.",
            kiedy = "Kop, póki jest czas: z żelaza kuźnia wykuje zbroję dla rycerza, a ze złota warsztat zrobi krzyże i różańce, które zamienią się w wiarę. Po złoto trzeba zejść głęboko — a jedzenie jest tylko w sali, więc pilnuj, żeby robotnik miał którędy wrócić (schodami, po linie albo drogą wiernych).",
            rycina = kruszce,
          },
          new Tablica
          {
            id = "warsztat", grupa = "zasoby", nazwa = "Warsztat", lacina = "Officina",
            opis = $"Robotnik, któremu wskażesz gotowy warsztat, staje przy stole: topi złoto w tyglu i kuje z niego krzyż, różaniec albo krucyfiks. Na sztukę idzie {S(POMIESZCZENIA.warsztat.zlotoNaSztuke)} złota i {S(R(POMIESZCZENIA.warsztat.tikowNaSztuke / 120))} sekund pracy. Gotowa rozbłyskuje i od razu zamienia się w {S(POMIESZCZENIA.warsztat.wiaraZaSztuke)} wiary — krzyż leci do licznika. Dwóch przy stole pracuje szybciej. Bez złota robotnik czeka przy stole, a nad warsztatem stoi „brak złota”.",
            kiedy = "Złoto leży głęboko, pod dnami jaskiń — warsztat zamienia je w wiarę na Cud i szepty.",
            rycina = warsztatRycina,
          },
          new Tablica
          {
            id = "kuznia", grupa = "zasoby", nazwa = "Kuźnia", lacina = "Fabrica armorum",
            opis = $"Robotnik przy kowadle wykuwa z żelaza kolejne części zbroi rycerza: {string.Join(", ", POMIESZCZENIA.kuznia.czesci.Select(c => $"{c.nazwa} ({S(c.zelazo)} żelaza)"))}. Palenisko bucha, młot dzwoni, iskry lecą w takt uderzeń, a gotowa część błyska nad kowadłem i trafia na wieszak. Bez żelaza robotnik czeka, a nad kuźnią widać, czego brakuje.",
            kiedy = "Kuj zbroję przed falami Strażników Snu. Gotowe części czekają na wieszaku, aż rycerz przyjdzie je założyć.",
            rycina = kuzniaRycina,
          },
          new Tablica
          {
            id = "zbroja", grupa = "zasoby", nazwa = "Zbroja rycerza", lacina = "Armatura militis",
            opis = $"Rycerz zaczyna w kolczudze, z mieczem i w płaszczu — bez hełmu, z odsłoniętą twarzą. Resztę wykuwa kuźnia, a każda część, którą nosi, coś mu daje: {string.Join(", ", CZESCI_ZBROI.Select(id => $"{CZESC[id].nazwa} — {CZESC[id].skutek}"))}. Gdy na wieszaku coś czeka, nie ma fali Strażników ani rozkazu, a rycerz jest syty, sam idzie do kuźni: staje pod wieszakiem, zdejmuje część, przykłada ją na miejsce i dopina — część błyska, a nad nim widać, co mu dała. Potem wraca na wartę. Każda część zajmuje mu {S(S(ZBROJA.zakladanieTikow / 120).Replace(".", ","))} sekundy.",
            kiedy = "Nie chcesz czekać? Zaznacz rycerza i wskaż kuźnię — pójdzie od razu (gdy nic nie wisi, odmówi). Co nosi, widać na karcie postaci.",
            rycina = zbrojaRycina,
          },
          new Tablica
          {
            id = "walkaRycerza", grupa = "zasoby", nazwa = "Walka rycerza", lacina = "Ars pugnandi",
            opis = opisWalkiRycerza(),
            kiedy = $"Weteranem zostaje po {S(R(LUD.weteranPo / 7200))} minutach w ludzie — póki syty, a lud wierny. Kuj mu zbroję: każda część odblokowuje nowe ruchy.",
            rycina = walkaRycerzaRycina,
          },
          // prawa góry
          new Tablica
          {
            id = "pamiec", grupa = "prawa", nazwa = "Pamięć", lacina = "Memoria",
            opis = "Widzisz siebie tylko tam, gdzie ktoś jest albo był. Gdzie nikt nie chodzi, rysunek blaknie i pokazuje stan sprzed pokoleń, a potem ciemność.",
            kiedy = "Im dalej chodzą twoi mieszkańcy, tym więcej o sobie widzisz.",
            rycina = cala(RycinyScen.rysujPamiec),
          },
          new Tablica
          {
            id = "sen", grupa = "prawa", nazwa = "Przegrana", lacina = "Casus",
            opis = "Przegrywasz, gdy nie żyje już żaden pobożny — tylko ich modlitwa kruszy skorupę, a nowych nikt nie wyda. Przegrywasz też, gdy do rdzenia dojdzie ktoś, kto w ciebie nie wierzy. Najczęstsza droga do porażki to głód — lud rozproszony daleko od wiadra, bez robotników, którzy noszą jedzenie.",
            kiedy = "Trzymaj lud razem i robotników przy życiu — jedzenie jest tylko w wiadrze w sali, a warcie pod rdzeniem donoszą je robotnicy. Nie wysyłaj pod rdzeń ostatniego pobożnego.",
            rycina = cala(RycinyScen.rysujSpis),
          },
          new Tablica
          {
            id = "droga", grupa = "prawa", nazwa = "Droga do wolności", lacina = "Via liberationis",
            opis = $"Wygrywasz, gdy rycerz pokona demona, który spał w Wielkim Pomniku na dnie góry. Po kolei: pobożni się modlą (wiara); lud uwierzy na {S(proc(PIELGRZYMKA.oddanieNacji))} albo sam poślesz pobożnych szeptem „módl się” (oddanie); robotnicy na twój rozkaz wykopią drogę wiernych — szyb ze schodami od wnęki przy sali do krypty (droga); pomnik słucha tylko tych, którzy zeszli wykopaną drogą: pobożni modlą się w krypcie i kruszą go, rycerz trzyma wartę, a fale Strażników Snu trzeba pokonać (pomnik); gdy pomnik pęknie do końca, z gruzów wstaje demon — jego śmierć to twoja wolność.",
            kiedy = "Chroń rycerza — bez niego demona biją robotnicy w hełmach albo pobożni księgami.",
            rycina = drogaWolnosci,
          },
          new Tablica
          {
            id = "skorupa", grupa = "prawa", nazwa = "Wielki Pomnik", lacina = "Monumentum daemonis",
            opis = $"Na dnie góry, w komorze pod kryptą, na cokole z wyrytymi znakami stoi olbrzymi kamienny demon z rękami wzniesionymi, z płomienną aureolą za głową i naszyjnikiem z czaszek, zakuty w łańcuchy — w środku śpi żywy. Kilof go nie ruszy; kruszy go tylko modlitwa: gdy w krypcie modli się co najmniej {S(RYTUAL.potrzebaWiernych)} pobożny z oddaniem od {S(proc(RYTUAL.minOddanie))}. Pęka w trzech stanach: przy {S(POMNIK.stany[0])}% biegną po nim rysy, przy {S(POMNIK.stany[1])}% odpadają kawałki (czubki aureoli, palce, stopa), przy {S(POMNIK.stany[2])}% rysy żarzą się czerwono od środka. Każde pęknięcie idzie wolniej od poprzedniego, a na Koszmarze pomnik jest twardszy ({S(proc(RYTUAL.koszmarMnoznik))} tempa). Przy 100% rozpada się w gruz, a z gruzu wstaje demon.",
            kiedy = $"Trzymaj w krypcie pobożnych, najedzonych i wierzących. Przy {string.Join(", ", STRAZNICY.fale.Where(f => f.boss != true).Select(f => S(f.prog)))}% wychodzą Strażnicy Snu — dopóki żyją, pomnik nie pęka.",
            rycina = pomnikRycina,
          },
          new Tablica
          {
            id = "rdzen", grupa = "prawa", nazwa = "Ostatnie uderzenie", lacina = "Ictus ultimus",
            opis = "Gdy rycerz zada demonowi ostatnie uderzenie, czas na chwilę zwalnia, a kamera jedzie do demona. Cios odrzuca go w tył, złote światło rozsadza mu pierś; zatacza się z dłonią na piersi, po całym ciele biegną złote pęknięcia, a ogień aureoli gaśnie. Pada na kolana, kamienieje od stóp w górę — i rozpada się na kawałki, które obracają się w pył i popiół: fala światła po krypcie, gasnące iskry i kupka kamieni. Jesteś wolny — to koniec gry.",
            kiedy = "Ostatni cios zadaje rycerz (albo robotnik w hełmie, albo pobożny księgą, gdy walczących brak). W przyszłości będzie tu przerywnik filmowy.",
            rycina = uderzenieRycina,
          },
          new Tablica
          {
            id = "warstwy", grupa = "prawa", nazwa = "Warstwy góry", lacina = "Strata montis",
            opis = "Góra ma piętra. Z powierzchni prowadzą dwa otwory: szerszy szyb pod katedrą, którym z jej rozety pada światło na ołtarz, i węższy, nad którym stoi kozioł — tędy konwój spuszcza wiadro z jedzeniem — oba do sali z siedzibą. Nad salą leży czapa skały nie do ruszenia, a całą górę otacza gruba rama, której nikt nie przekuje. Niżej trzy warstwy: płytka — miękka skała i kępy rdzawego żelaza; środkowa — zwykła skała, małe jaskinie ze złotem pod dnem i ruiny; głęboka — twarda skała, kuje się najwolniej. Na samym dole szeroka, niska krypta z płaską podłogą, a pod jej środkiem, w komorze, Wielki Pomnik demona — zawsze w tym samym miejscu.",
            kiedy = "Każda warstwa w dół to dłuższa droga z powrotem do wiadra. Żelazo leży tuż pod salą, po złoto trzeba zejść do środkowej, a droga wiernych prowadzi przez wszystkie trzy — z zakrętem przez starą komnatę z kotłem — aż do stalowej bramy lochu.",
            rycina = warstwyRycina,
          },
          new Tablica
          {
            id = "oddanie", grupa = "prawa", nazwa = "Oddanie i modlitwa", lacina = "Devotio",
            opis = $"Oddanie to to, jak mocno lud w ciebie wierzy — od 0 do 100%, widać je w złożonych dłoniach pod płytą, które napełniają się złotem, i na karcie postaci. Kto wierzy, ten się modli: przy ołtarzu, przy znaku po Cudzie i w krypcie nad Wielkim Pomnikiem. Każda modlitwa daje ci wiarę i trochę podnosi oddanie. Najszybciej podniesie je Cud przy siedzibie. Przy {S(proc(PIELGRZYMKA.oddanieNacji))} lud sam wyśle wartę do krypty.",
            kiedy = "Najprościej: Cud przy siedzibie, jedzenie dla warty — i szepnij „módl się” pobożnym (albo wybierz „poślij” na karcie warty).",
            rycina = pielgrzymka,
          },
          new Tablica
          {
            id = "pielgrzymka", grupa = "prawa", nazwa = "Warta w krypcie", lacina = "Peregrinatio",
            opis = $"Gdy oddanie ludu przekroczy {S(proc(PIELGRZYMKA.oddanieNacji))}, od {S(PIELGRZYMKA.minPielgrzymow)} do {S(PIELGRZYMKA.maxPielgrzymow)} najwierniejszych, najedzonych pobożnych samo schodzi do krypty i modli się nad Wielkim Pomnikiem. Czekają przy obozie, aż robotnicy dokopią drogę (złotą kreskę), a rycerze idą z nimi na wartę. Szept „módl się” posyła pobożnego od razu, bez względu na wiarę ludu.",
            kiedy = "Warta głoduje pierwsza — wiadro jest tylko w sali, więc pilnuj, żeby robotnicy donosili jej jedzenie (i żeby w wiadrze było co nosić: dosyp rytem Nakarm).",
            rycina = pielgrzymka,
          },
          new Tablica
          {
            id = "wydarzenia", grupa = "prawa", nazwa = "Wydarzenia", lacina = "Aestus",
            opis = $"Co {S(R(WYDARZENIA.odstep / 120))}–{S(R((WYDARZENIA.odstep + WYDARZENIA.rozrzut) / 120))} sekund coś się dzieje: nadchodzi zaraza, lud głoduje albo prosi o znak, pobożni chcą zejść do krypty, głębia proponuje układ, jedzenie w wiadrze gnije, strop nad drogą wiernych pęka. Czas wtedy staje, a karta pokazuje dwa albo trzy wybory — każdy z ceną i jednym zdaniem skutku.",
            kiedy = "Zgniłe jedzenie lepiej oczyścić albo wylać, niż zjeść. Podparty strop oszczędza robotnikom kopania.",
            rycina = cala(RycinyScen.rysujPrzyplyw),
          },
          new Tablica
          {
            id = "role", grupa = "prawa", nazwa = "Role ludu", lacina = "Officia",
            opis = $"Drużyna jest stała: {S(LUD.start.robotnik)} robotników, {S(LUD.start.pobozny)} pobożnych i {S(LUD.start.rycerz)} rycerz — nikt nie dochodzi i nikt się nie starzeje. Pobożni modlą się i kruszą Wielki Pomnik; stoją przy obozie najbliżej krypty. Robotnicy kopią tylko na twój rozkaz, a poza tym donoszą jedzenie z wiadra tym, którzy stoją na warcie. Rycerz jest jeden, ale ma miecz i {S(LUD.role.rycerz.hp)} razy więcej życia; poza wartą pilnuje obozu, a w czasie fali walczy ze Strażnikami. Zaczyna w samej kolczudze — resztę zbroi wykuwa mu kuźnia. Gdy rycerza zabraknie, robotnicy zakładają hełmy i walczą zamiast niego.",
            kiedy = "Na karcie postaci widać jej zamiar i ile jeszcze go trzyma. Rozkazy wydajesz z medalionów pod płytą.",
            rycina = postac(Race.GOBLIN, "kopie", 1, "robotnik"),
          },
          new Tablica
          {
            id = "weterani", grupa = "prawa", nazwa = "Weterani i aureole", lacina = "Veterani",
            opis = $"Kto przeżyje w ludzie {S(R(LUD.weteranPo / 7200))} minuty, staje się weteranem: póki najedzony, a lud wierny, ma +{S(R((LUD.weteranPremia - 1) * 100))}% siły, szybkości, kopania i modlitwy. Jasna aureola znaczy wzmocnienie (weteran, hełm), czerwona — osłabienie (okaleczony, zatruty).",
            kiedy = "Karta postaci mówi, jaki to stan i kiedy minie. Weterana warto karmić — głodny traci premię.",
            rycina = postac(Race.GOBLIN, "modli"),
          },
          new Tablica
          {
            id = "straznicy", grupa = "prawa", nazwa = "Strażnicy Snu", lacina = "Custodes somni",
            opis = $"Pomnik ma strażników. Przy {string.Join(", ", STRAZNICY.fale.Where(f => f.boss != true).Select(f => S(f.prog)))}% skruszenia — razem z każdym stanem pękania — wychodzą ze skały wokół krypty fale, z każdą silniejsi. Przenikają skałę, nie odchodzą daleko od krypty i biją najpierw rycerzy. Dopóki fala trwa, pomnik nie pęka. Za pokonaną falę dostajesz {S(STRAZNICY.nagrodaWiary)} wiary. Ostatnia fala przychodzi z demonem.",
            kiedy = "W czasie fali pobożni i robotnicy sami odchodzą z krypty — walczą rycerze (a gdy ich brak, robotnicy w hełmach). Pasek nad płytą mówi, ilu zostało.",
            rycina = skorupa,
          },
          new Tablica
          {
            id = "boss", grupa = "prawa", nazwa = DEMON.nazwa, lacina = "Daemon lapidis",
            opis = $"Gdy Wielki Pomnik pęknie do końca, rozpada się w gruz, a z gruzu wstaje demon, który w nim spał: przebija się ręka, druga, kamienna głowa z zapalającymi się oczami; wstaje, kamień ożywa na nim od piersi w ciemną, żarzącą się skórę, aureola za jego głową bucha ogniem — i ryczy — a z nim wychodzą ostatni Strażnicy. To ten sam posąg, tylko żywy: wciąż ma na nadgarstkach i kostkach kajdany z zerwanymi łańcuchami. Przenika skałę i idzie do krypty. Rani go tylko rycerz albo robotnik w hełmie ({S(DEMON.hp)} życia). Walczy dziewiętnastoma ruchami (patrz „Walka demona”); co jakiś czas wznosi ręce z rykiem, wali pięściami w ziemię i zasypuje kawałek drogi wiernych. Dłoni z otchłani rozkazuje gestem. Ranny pęka i dymi, w szale drży i płonie. Gdy w krypcie modlą się pobożni, kuli się i zasłania twarz, a złoty pył parzy go do żywego — słabnie; bez modlitwy się zrasta. Gdy walczących brak, pobożni unoszą księgi i razią go z dystansu. Gdy padnie — jesteś wolny.",
            kiedy = "Rycerz na demona, pobożni do modlitwy, robotnicy przy drodze. Życie demona widać na pasku nad płytą.",
            rycina = demonRycina,
          },
          new Tablica
          {
            id = "walkaDemona", grupa = "prawa", nazwa = "Walka demona", lacina = "Furor daemonis",
            opis = opisWalkiDemona(),
            kiedy = "Nie stój z rycerzem przed demonem, gdy ten wciąga powietrze (ogień) albo kuli się z rękami na piersi (wybuch aureoli) — a gdy klęknie, to twoja chwila.",
            rycina = walkaDemonaRycina,
          },
          new Tablica
          {
            id = "brama", grupa = "prawa", nazwa = "Kocioł i stalowa brama", lacina = "Porta ferrea",
            opis = $"Droga wiernych skręca: pierwszy szyb schodzi do starej komnaty z pajęczynami, w której stoi kocioł, komnatą idzie się w bok, a drugi szyb schodzi na przedproże lochu z Wielkim Pomnikiem. Do lochu wchodzi się tylko przez stalową bramę. Krata podnosi się, póki przy kotle rzuca zaklęcia co najmniej {S(BRAMA.potrzeba)} pobożnych (rozkaz „Do kotła”) — pełne otwarcie po {S(R(BRAMA.otwieranie / 120))} s; gdy przestaną, krata powoli opada ({S(R(BRAMA.opadanie / 120))} s). Wyprostowanym przejdzie się od {S(R(BRAMA.idzieOd * 100))}% otwarcia, niżej trzeba się przeczołgać — do {S(R(BRAMA.czolgaOd * 100))}%. Na nadprożu bramy pięć run zapala się kolejno, ile otwarta.",
            kiedy = $"Najpierw postaw pod bramą tych, którzy mają wejść, potem poślij dwóch pobożnych do kotła. Po {S(R(BRAMA.otwieranie / 120))} s zaklinania pobożni zdążą zejść z komnaty i przejść, zanim krata opadnie. Wejście w mur lochu jest nie do przekucia — tylko brama.",
            rycina = bramaRycina,
          },
          new Tablica
          {
            id = "modlitwaZaInnych", grupa = "prawa", nazwa = "Modlitwa za innych", lacina = "Oratio pro aliis",
            opis = $"Pobożny, który się modli — na rozkaz „Módl się za innych”, przy obozie, przy ołtarzu albo w krypcie — błogosławi swoich w promieniu {S(BLOGOSLAWIENSTWO.promien)} kafli: rany się goją ({S(S(BLOGOSLAWIENSTWO.leczenie).Replace(".", ","))} życia na sekundę), a każdy dostaje dar swojej roli na {S(R(BLOGOSLAWIENSTWO.trwa / 120))} s po wyjściu z kręgu — rycerz bije mocniej i szybciej chodzi, robotnik szybciej kopie, pobożny mocniej się modli, a każdy wolniej głodnieje. Siebie nie błogosławi. Rzucający zaklęcia przy kotle się nie modlą.",
            kiedy = "Postaw modlącego się za innych za rycerzem w walce albo przy kopaczach drogi.",
            rycina = modlitwaZaInnychRycina,
          },
          new Tablica
          {
            id = "helmy", grupa = "prawa", nazwa = "Hełmy robotników", lacina = "Fossores armati",
            opis = $"Gdy zginie rycerz, robotnicy zakładają żelazne hełmy i biorą kilofy do walki: mają {S(R((LUD.helm.hp - 1) * 100))}% więcej życia i biją jak rycerze — trzymają wartę, bronią przed obcymi, walczą ze Strażnikami Snu i z bossem. Gdy rycerz wróci do ludu, hełmy zdejmują.",
            kiedy = "To ostatnia obrona, nie zastępstwo — w czasie fali robotnik w hełmie walczy zamiast kopać i nosić jedzenie.",
            rycina = postac(Race.GOBLIN, "walczy", 1, "robotnik", true),
          },
          new Tablica
          {
            id = "trupy", grupa = "prawa", nazwa = "Trupy", lacina = "Corpora",
            opis = $"Kto z ludu umrze, nie znika: jego ciało leży tam, gdzie padł. Tylko zabranych przez ciemność i przez dłoń z otchłani nie ma. Gdy ciał jest więcej niż {S(LUD.trupyMax)}, najstarsze rozsypują się w kości.",
            kiedy = "Trupy mówią, gdzie lud ginie — tam spuść wiadro albo poślij rycerza.",
            rycina = postac(Race.GOBLIN, "spi"),
          },
          new Tablica
          {
            id = "rozkazy", grupa = "prawa", nazwa = "Drużyna i rozkazy", lacina = "Imperium",
            opis = "Pod płytą trzy medaliony: robotnicy, pobożni i rycerz, z liczbą żywych. Dotknięcie medalionu zaznacza wszystkich z tej roli, drugie wiezie do nich kamerę; dotknięcie postaci na mapie zaznacza ją (z Shiftem dokładasz). Myszą możesz też przeciągnąć ramkę lewym przyciskiem: zaznacza wszystkich w środku, a gdy w ramce nikogo nie ma, a zaznaczeni są robotnicy — oznacza skałę w środku do wykucia (robotnicy kują ją kafel po kaflu; blok pod wiadrem tylko wtedy, gdy ramka go obejmuje). Widok przesuwasz wtedy prawym albo środkowym przyciskiem. Gdy ktoś jest zaznaczony, dotknięcie mapy to rozkaz „idź tam”: idzie i trzyma tam posterunek — pobożny się modli, rycerz pilnuje — aż rozkaz odwołasz. Pobożny i rycerz idą tylko tam, dokąd prowadzi droga; inaczej odmawiają — kręcą głową, a w dymku mówią dlaczego. Robotnik przekopuje się sam, a wskazana mu skała to „kop tam” (ruda — „kop żyłę”: wykuje całą kępę). Wskazany plan pomieszczenia robotnicy kują, w gotowym warsztacie i kuźni pracują, rycerz w kuźni zakłada zbroję z wieszaka, a w sypialni każdy śpi. „Kop drogę wiernych” każe robotnikom kopać szyb drogi wiernych. Stojący rozstawiają się, nie jeden w drugim, a idący razem dopasowują krok.",
            kiedy = "Klawisze: A — robotnicy, S — pobożni, D — rycerz, G — kop drogę wiernych, V — odwołaj rozkaz, B — wyznacz pomieszczenie; Esc albo prawy przycisk — odznacz. Bez rozkazu robotnicy nie kopią.",
            rycina = postac(Race.GOBLIN, "idzie", 1, "rycerz"),
          },
          new Tablica
          {
            id = "pomieszczenia", grupa = "prawa", nazwa = "Pomieszczenia", lacina = "Conclavia",
            opis = $"„Wyznacz pomieszczenie” pod płytą (albo klawisz B) i szablon: sypialnia ({S(POMIESZCZENIA.szablony.sypialnia.w)}×{S(POMIESZCZENIA.szablony.sypialnia.h)}), warsztat i kuźnia ({S(POMIESZCZENIA.szablony.warsztat.w)}×{S(POMIESZCZENIA.szablony.warsztat.h)}), korytarz, szyb i lina (lina wisi od razu — nikt jej nie buduje). Pod kursorem widać obrys: jasny — wolno, czerwony — nie, i dlaczego. Pokój stoi na płaskiej, litej podłodze i ma wejście z boku, na poziomie podłogi albo o kafel wyżej lub niżej. Korytarz i szyb zaczynają się tam, gdzie stoi lud: korytarz ciągniesz palcem w bok (wysoki na {S(POMIESZCZENIA.korytarzWys)} kafle), szyb w dół — to proste schody, więc da się nim wrócić. Planu nie położysz w skale nie do ruszenia ani pod złotą kreską drogi wiernych; prawy przycisk na planie go skreśla.",
            kiedy = "Plan kują tylko robotnicy, których zaznaczysz i którym go wskażesz — wolni sami nic nie biorą. Kując plan, robotnik sięga też nad głowę.",
            rycina = pomieszczeniaRycina,
          },
          new Tablica
          {
            id = "sypialnia", grupa = "prawa", nazwa = "Sypialnia", lacina = "Dormitorium",
            opis = $"Każdy z ludu — robotnik, pobożny, rycerz — wskazany na gotową sypialnię kładzie się na posłaniu. Po {S(R(POMIESZCZENIA.sypialnia.snuTikow / 120))} sekundach snu traci osłabienia: okaleczenie i zatrucie (czerwona aureola rozpływa się), wstaje wypoczęty i wraca do swoich zajęć. Głodny najpierw idzie jeść, a potem wraca spać.",
            kiedy = "Poślij tam pobożnego po ofierze krwi przy ołtarzu albo kogoś zatrutego — po minucie snu wróci do pełni sił.",
            rycina = sypialniaRycina,
          },
          new Tablica
          {
            id = "oltarz", grupa = "prawa", nazwa = "Ołtarz", lacina = "Altare",
            opis = $"Kamienny ołtarz z krzyżem stoi od początku na środku sali, w promieniu światła, który pada z rozety katedry na powierzchni, przez otwór w jej posadzce i szyb nad ołtarzem; jedzenie zjeżdża drugim, węższym otworem obok. Pod ołtarzem jest kamienny kopczyk, a podłoga sali — z kamienia, więc nikt go nie podkopie ani nie przetnie drogi do niego; w sali nic się nie zawali. Dotknij ołtarza: otworzy się okno z rytuałami i ich ceną we krwi. Rytuał odprawia pobożny, który stoi przy ołtarzu — zaznacz go i dotknij ołtarza albo w oknie „przywołaj pobożnego”. Klęczy, aż skończy; gdy odejdzie albo zginie, rytuał przepada, a krew wraca.",
            kiedy = "Krew to paliwo rytuałów — zbieraj ją z bitew i ofiar, a wydawaj na modlitwę, szał rycerza i wskrzeszanie poległych.",
            rycina = oltarzRycina,
          },
          new Tablica
          {
            id = "rytual-modlitwa", grupa = "prawa", nazwa = "Modlitwa przy ołtarzu", lacina = "Oratio ad altare",
            opis = $"Pobożny klęczy przy ołtarzu, od krzyża biją promienie, a złote iskry płyną od niego do krzyża. Przez {S(R(OLTARZ.rytualy.modlitwa.tikow / 120))} sekund wiara rośnie — razem o {S(OLTARZ.rytualy.modlitwa.wiara)}.",
            kiedy = $"Gdy masz krew, a brak ci wiary na szepty i Cud. Kosztuje {S(OLTARZ.rytualy.modlitwa.krew)} krwi.",
            rycina = rytualRycina("modlitwa", "modli"),
          },
          new Tablica
          {
            id = "rytual-szal", grupa = "prawa", nazwa = "Szał krwi", lacina = "Furor sanguinis",
            opis = $"Pobożny unosi księgę, krew spływa po krzyżu do misy, a wokół ołtarza zapala się krąg czerwonych znaków. Na koniec czerwona smuga leci do rycerza: przez {S(R(OLTARZ.rytualy.szal.trwa / 7200))} minutę żarzy się czerwoną aurą i bije {S(S(OLTARZ.rytualy.szal.sila).Replace(".", ","))} raza mocniej. Gdy rycerza brak, szał rozpala robotnika w hełmie.",
            kiedy = $"Przed falą Strażników albo bossem — odpraw go, gdy fala nadciąga. Kosztuje {S(OLTARZ.rytualy.szal.krew)} krwi.",
            rycina = rytualRycina("szal", "czyta"),
          },
          new Tablica
          {
            id = "rytual-wskrzeszenie", grupa = "prawa", nazwa = "Wskrzeszenie", lacina = "Resurrectio",
            opis = $"W oknie ołtarza wybierasz, kogo przywrócić — z poległych, których ciała jeszcze leżą. Ciało blednie i rozsypuje się w jasne iskry, które płyną do ołtarza; nad mensą unosi się ta sama postać, z szarej coraz barwniejsza, i po {S(R(OLTARZ.rytualy.wskrzeszenie.tikow / 120))} sekundach staje obok ołtarza — z tą samą rolą i twarzą, zdrowa. Zabranych przez ciemność i dłoń z otchłani wskrzesić się nie da: nie zostaje po nich ciało.",
            kiedy = $"Jedyny sposób, żeby drużyna znów była cała. Kosztuje {S(OLTARZ.rytualy.wskrzeszenie.krew)} krwi.",
            rycina = wskrzeszenieRycina,
          },
          new Tablica
          {
            id = "rytual-ofiara-krwi", grupa = "prawa", nazwa = "Ofiara krwi", lacina = "Sacrificium sanguinis",
            opis = $"Pobożny przy ołtarzu upuszcza krwi: krople spadają do misy, misa się napełnia, a kropla leci do licznika — +{S(LUD.okaleczenieKrew)} krwi. Potem jest okaleczony (−{S(R((1 - LUD.okaleczenie) * 100))}% życia, siły i szybkości), póki nie prześpi {S(R(POMIESZCZENIA.sypialnia.snuTikow / 7200))} minuty w sypialni. Okaleczony drugi raz krwi nie odda.",
            kiedy = "Gdy brak krwi na rytuał, a pobożny może potem odpocząć.",
            rycina = rytualRycina("ofiaraKrwi", "modli"),
          },
          new Tablica
          {
            id = "rytual-ofiara-zycia", grupa = "prawa", nazwa = "Ofiara życia", lacina = "Sacrificium vitae",
            opis = $"Pobożny oddaje życie na ołtarzu: krąg ciemnoczerwonych znaków, słup czerwonego światła — i +{S(LUD.ofiaraKrew)} krwi. Ostatniego pobożnego ołtarz nie przyjmie: bez niego nikt nie odprawi rytuału ani nie pomodli się pod rdzeniem. Jego ciało zostaje przy ołtarzu — można go potem wskrzesić.",
            kiedy = "Ostateczność. Drużyna jest stała, a wskrzeszenie kosztuje więcej krwi, niż daje ofiara.",
            rycina = ofiaraZyciaRycina,
          },
          new Tablica
          {
            id = "lina", grupa = "prawa", nazwa = "Lina", lacina = "Funis",
            opis = $"„Wyznacz pomieszczenie” → „lina”: dotknij miejsca, gdzie ma wisieć hak (albo przeciągnij w górę). Jedyny warunek: lina nie trzyma się powietrza — jej górny koniec musi być uczepiony skały: stropu tuż nad nią, krawędzi półki obok albo ściany przy górze; bez tego obrys jest czerwony. Wskazana skała to strop — lina zawiśnie tuż pod nią. Wieszasz ją ty, od razu — nikt z ludu jej nie buduje: z żelaznego haka wbitego w skałę spada zwój, rozwija się aż do podłogi, a lina chwilę się kołysze. {S(POMIESZCZENIA.linyDarmowe)} pierwszych lin jest za darmo, każda następna kosztuje {S(POMIESZCZENIA.linaKrew)} krwi. Po linie każdy z ludu wchodzi i schodzi w obie strony. Na zakrętach drogi wiernych lina spada sama, gdy zakręt jest wykopany — za darmo.",
            kiedy = "Gdy ktoś zszedł w głąb i nie ma jak wrócić, albo gdy półka z rudą wisi za wysoko. Wieszaj przy krawędzi półki — po linie wchodzi się na nią. Darmowe liny szybko się kończą.",
            rycina = linaRycina,
          },
          new Tablica
          {
            id = "ruiny", grupa = "prawa", nazwa = "Ruiny", lacina = "Ruinae",
            opis = $"W środkowej warstwie góry leżą zawalone budowle — {S(ZABYTKI.ruiny.odIlu)}–{S(ZABYTKI.ruiny.doIlu)} na górę: kaplica z łukami i filarami, stara kopalnia z odrzwiami z belek i porzuconym wózkiem albo kawałek miasta, dwa domy i ulica pod łukiem bramy. Zamurowane w skale, częściowo zawalone (gruz, zwalone belki) — trzeba się do nich przekopać. Mur z ciosów kuje się jak skała. W każdej leży zabytek; w ciemności czasem błyśnie.",
            kiedy = "Wyślij robotnika rozkazem „kop tam” do ruin — gdy ktoś z ludu stanie przy zabytku, odkryje go. Pamiętaj o drodze powrotnej: jedzenie jest tylko w sali.",
            rycina = ruinyRycina,
          },
          new Tablica
          {
            id = "zabytki", grupa = "prawa", nazwa = "Zabytki", lacina = "Reliquiae",
            opis = $"Kto z ludu stanie przy zabytku, odkrywa go: z ruin sypie się kurz, zabytek rozbłyskuje i unosi się w świetle, a świat staje i pyta: „Weź” czy „Zostaw”. Weź — premia i kara dla całego ludu, na zawsze (sen w sypialni kary nie zdejmie): zabytek leci do rąk odkrywcy, ten unosi go nad głowę, a fala światła zapala każdemu jasną i czerwoną aureolę. Zostaw — zabytek opada i gaśnie. Relikwiarz świętego: {S(ZABYTEK.relikwiarz.premia)}, ale {S(ZABYTEK.relikwiarz.kara)}. Miecz krzyżowca: {S(ZABYTEK.miecz.premia)}, ale {S(ZABYTEK.miecz.kara)}. Kielich: {S(ZABYTEK.kielich.premia)}, ale {S(ZABYTEK.kielich.kara)}. Księga: {S(ZABYTEK.ksiega.premia)}, ale {S(ZABYTEK.ksiega.kara)}.",
            kiedy = "Bierz to, czego kara najmniej ci szkodzi: relikwiarz, gdy droga już wykopana; miecz przed bossem, jeśli drużyna trzyma się razem; kielich tylko przy pełnym wiadrze.",
            rycina = zabytkiRycina,
          },
          new Tablica
          {
            id = "schody", grupa = "prawa", nazwa = "Schody", lacina = "Gradus",
            opis = "Lud nie ma lin ani klamer. W górę wchodzi najwyżej o jeden stopień — na wyższą półkę się nie wdrapie: musi wykuć sobie w skale schody albo wejść po linie, którą powiesisz. W dół zsuwa się szybem po ścianach albo zeskakuje z niewysokiej półki; kto spadnie z wysoka, potłucze się, a w głęboką przepaść sam nie skoczy.",
            kiedy = "Robotnik, któremu każesz iść tam, dokąd nie ma przejścia, sam wykuwa schody; kto utknie w dołku bez wyjścia, wkopuje się do jedzenia. Droga wiernych to szyb od wnęki przy sali do lochu: kopacze schodzą w głąb po drabinie, którą przedłużają za sobą, a przy wylocie kołowrót wyciąga kubłem urobek. Gdy odcinek jest wykopany do dna, robotnicy stawiają w nim od dołu schody kręcone: kołowrotem opuszczają ciosane stopnie, a murarze z rusztowania osadzają je jeden po drugim (rozkaz „Buduj schody drogi wiernych” — robotnicy, którzy długo nie mają co robić, idą pomóc sami). Do tego czasu szybem chodzi się po drabinie, w obie strony. Kafle szybu kuje się szybciej niż zwykłą skałę.",
            rycina = postac(Race.GOBLIN, "wspina"),
          },
          new Tablica
          {
            id = "pauza", grupa = "prawa", nazwa = "Pauza", lacina = "Tempus suspensum",
            opis = "Czas możesz zatrzymać. Rozkazy wydane w pauzie (Nakarm, Cud) rysują się jako szkice, rezerwują koszt i dzieją się naraz, gdy puścisz czas. Przy kryzysach gra staje sama.",
            kiedy = "Zatrzymuj świat, gdy musisz trafić — i przy każdym kryzysie.",
            rycina = pauza,
          },
          new Tablica
          {
            id = "pismo", grupa = "prawa", nazwa = "Pismo w skale", lacina = "Scriptura ignota",
            opis = "W skale, do której nikt jeszcze nie zajrzał, widać znaki. Nikt z żyjących ich nie wyrył — były tu przed pierwszym z ludu. Gasną, gdy dojdzie do nich światło; w zatrzymanym czasie widać je wyraźniej.",
            kiedy = "Nie da się ich przeczytać. Można tylko pójść tam, gdzie są, i patrzeć, jak znikają.",
            rycina = pismo,
          },
          new Tablica
          {
            id = "dlon", grupa = "prawa", nazwa = "Dłoń z otchłani", lacina = "Manus ex abysso",
            opis = $"Rzadko, najwcześniej po {S(R(DLON.pierwszaPo / 7200))} minutach i najwyżej {S(DLON.maxNaPartie)} razy w partii. Otchłań to nieznane — ta część góry, której nikt nie widział albo o której zapomniano. Gdy ktoś z ludu stanie daleko od obozu, a pod nim zaczyna się otchłań, spod ziemi sączy się czerwona łuna, a on (czasem dwoje naraz) staje jak wryty. Z głębi, zawsze od dołu, wznosi się ogromna dłoń — po {S(R((DLON.wstaje + DLON.siega) / 120))} sekundach sięga, chwyta ich i zapada się z nimi w ciemność. Nie zostają nawet trupy — krew i tak spływa do ciebie.",
            kiedy = "Nie stawiaj ludu nad nieznanym daleko od obozu. Gdy otchłań pod kimś zaczerwieni się — rzuć Cud przy nim, zanim dłoń chwyci.",
            rycina = dlonOtchlani,
          },
          new Tablica
          {
            id = "lina-wiadra", grupa = "prawa", nazwa = "Przecięta lina", lacina = "Funis praecisus",
            opis = $"W Koszmarze (w Alphie zawsze) dłoń z otchłani poluje też na linę, na której zjeżdża jedzenie — najwcześniej po {S(R(DLON.lina.pierwszaPo / 7200))} minutach, najwyżej {S(DLON.lina.maxNaPartie)} razy w partii. Spod podłogi sali, tuż przy wiadrze, wznosi się obok liny, czeka z rozwartymi szponami i jednym zamachem przecina ją pazurem. Zjeżdżające wiadro spada i roztrzaskuje się — {S(R(WIADRO.ciecie.strata * 100))}% jedzenia przepada, reszta leży rozsypana i da się ją zjeść; stojące zostaje bez liny. Póki nikt liny nie sklei, z góry nic nie zjedzie (także Nakarm). „Napraw linę wiadra” — przycisk pod płytą albo na karcie postaci: ktoś z ludu idzie pod szyb, wspina się po zwisającym końcu, owija i wiąże oba kawałki, lina się napina, a z góry od razu zjeżdża nowe wiadro z resztkami rozsypanego jedzenia.",
            kiedy = "Rzuć Cud przy wiadrze, zanim pazur przetnie linę — odpędzi dłoń. Jeśli nie zdążysz, wyślij kogoś do liny od razu: każda chwila bez wiadra to głód. Skleja jeden naraz.",
            rycina = przecietaLina,
          },
          new Tablica
          {
            id = "dlon-anielska", grupa = "prawa", nazwa = "Dłoń anielska", lacina = "Manus angelica",
            opis = $"Czasem — najwcześniej po {S(R(ANIOL.pierwszaPo / 7200))} minutach, najwyżej {S(ANIOL.maxNaPartie)} razy w partii — z góry, przez skałę, sączy się słup złotego światła i schodzi w nim jasna dłoń, palcami w dół. Daje dar, który sama wybiera, za darmo: {S(DAR.podkop.nazwa.ToLowerInvariant())} — {S(DAR.podkop.opis)} (droga idzie schodami, więc nikt nie utknie w przepaści, a ruda trafia do liczników); {S(DAR.ludzie.nazwa.ToLowerInvariant())} — {S(DAR.ludzie.opis)}, póki ludu jest mniej niż {S(ANIOL.dary.ludzie.maksLudu)}; {S(DAR.krew.nazwa.ToLowerInvariant())} — {S(DAR.krew.opis)}: struga spływa z jej dłoni prosto do ampułki. Potem wraca w światło.",
            kiedy = $"Nie wywołasz jej — przychodzi sama. Dar ludzi to jedyna, poza wskrzeszeniem, droga do nowych rąk w drużynie.",
            rycina = dlonAnielska,
          },
          // ---------------------------------------------------------------- etap 5b: dłoń z otchłani pomaga demonowi
          new Tablica
          {
            id = "dlon-rzut", grupa = "prawa", nazwa = "Rzut rycerzem", lacina = "Manus iaciens",
            opis = $"W walce z demonem dłoń z otchłani mu pomaga. Gdy rycerz stoi przy demonie, podłoga obok niego pęka i wyrasta z niej dłoń — obejmuje go palcami jak naczynie (nie pięścią), podnosi, bierze zamach w tył i ciska nim w górę i w bok, z dala od demona; palce rozwierają się gwałtownie, odgięte do tyłu. Rycerz koziołkuje pod sam strop, uderza o niego i spada — traci {S(R(DLON.demon.rzut.rana * 100))}% życia i leży ogłuszony {S(R(DLON.demon.rzut.ogluszenie / 120))} s (nad głową krążą gwiazdki).",
            kiedy = "Nie da się go uniknąć — ale ogłuszony rycerz wstaje sam. Pilnuj, żeby był najedzony i miał życie na taki upadek.",
            rycina = p => RysDlonDemona.rycinaDloniDemona(p.ctx, p.w, p.h, p.t, "rzut"),
          },
          new Tablica
          {
            id = "dlon-tarcza", grupa = "prawa", nazwa = "Tarcza z dłoni", lacina = "Manus scutum",
            opis = $"Między rycerzem a demonem wyrasta z podłogi otwarta dłoń, wnętrzem do rycerza, palce rozczapierzone jak mur, i drży z wysiłku. Przez {S(R(DLON.demon.tarcza.stoi / 120))} s demona nic nie rani: każdy cios odbija się od dłoni (iskry, fala na wnętrzu dłoni) i odrzuca atakującego. Demon w tym czasie czeka za nią.",
            kiedy = "Przeczekaj — dłoń sama zapadnie się w podłogę. Bez modlitwy w krypcie demon za tarczą się zrasta.",
            rycina = p => RysDlonDemona.rycinaDloniDemona(p.ctx, p.w, p.h, p.t, "tarcza"),
          },
          new Tablica
          {
            id = "dlon-zawal", grupa = "prawa", nazwa = "Zawał stropu", lacina = "Ruina fornicis",
            opis = $"Gdy rycerz idzie na demona z daleka, strop krypty między nimi pęka i przebijają się przez niego szpony zagięte w hak. Drą skałę szarpnięciami, płaskie uderzenie — i kolumna stropu spada lawiną głazów. Zostaje ściana gruzu, która odcina demona: nie przechodzi na drugą stronę i zrasta się {S(DLON.demon.zawal.zrastanie)} razy szybciej. Rycerz staje, gdy przed nim sypie się strop. Po {S(R(DLON.demon.zawal.trwa / 120))} s gruz kruszy się i osypuje sam.",
            kiedy = "Zaznacz robotników i wskaż im gruz — rozkują go wcześniej, a rycerz szybciej dojdzie do demona.",
            rycina = p => RysDlonDemona.rycinaDloniDemona(p.ctx, p.w, p.h, p.t, "zawal"),
          },
                };

    }
}
