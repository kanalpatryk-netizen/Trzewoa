// Wygenerowane z alpha-1/src/nastawy/loch.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/loch.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/loch.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyLoch
    {
        /// <summary>
        /// LOCH, KOCIOŁ I BRAMA (6.11, decyzja użytkownika): droga wiernych nie idzie już prosto w dół. Pierwszy szyb schodzi
        /// od wnęki przy sali do starej komnaty z pajęczynami i kotłem, komnatą idzie się w bok, a drugi szyb schodzi z jej
        /// drugiego końca na przedproże lochu. Do lochu z Wielkim Pomnikiem prowadzi tylko stalowa brama — podnosi się, gdy
        /// przy kotle rzuca zaklęcia dwóch pobożnych, a potem powoli opada. Tu wszystkie liczby; geometria — sim/world.ts,
        /// brama — sim/brama.ts, rysunek — render/loch.ts. Odległości w kaflach, czas w tikach (120 = sekunda).
        /// </summary>
        public static Typ_LOCH LOCH = new Typ_LOCH
        {
            zakret = new Typ_LOCH_zakret
            {
                wDol = 46,
                wBok = 30,
                strona = -1,
            },
            komnata = new Typ_LOCH_komnata
            {
                wys = 7,
                zaSzybem = 3,
            },
            loch = new Typ_LOCH_loch
            {
                rx = 42,
                przeslo = 12,
                sklepienie = 9,
                luk = 3,
                nawa = 15,
                nawaSzer = 14,
                mur = 2,
            },
            przedproze = new Typ_LOCH_przedproze
            {
                wys = 4,
                zaSzybem = 1,
            },
            brama = new Typ_LOCH_brama
            {
                wys = 3,
            },
        };

        /// <summary>
        /// Brama (sim/brama.ts). Otwarcie 0..1: rośnie, póki przy kotle rzuca zaklęcia co najmniej `potrzeba` pobożnych
        /// (pełne otwarcie po `otwieranie` tików — 40 s), a gdy przestaną — opada przez `opadanie` (od pełnego otwarcia do
        /// zamknięcia). Przejść da się, póki otwarcie ≥ `czolgaOd` (pod kratą trzeba się czołgać), wyprostowanym — od `idzieOd`
        /// (40 s zaklinania — przejdzie każdy, 20 s — brama w połowie, tylko się przeczołgać).
        /// </summary>
        public static Typ_BRAMA BRAMA = new Typ_BRAMA
        {
            potrzeba = 2,
            otwieranie = 4800,
            opadanie = 13200,
            czolgaOd = 0.2,
            idzieOd = 0.6,
            czolganie = 0.35,
            przyKotle = 5,
            miejscaPrzyKotle = new double[] { 2, -2, 3, -3, 4, -4 },
        };

        /// <summary>
        /// Modlitwa za innych (6.11): modlący się pobożny (na rozkaz „Módl się za innych”, przy obozie, w krypcie albo przy
        /// ołtarzu) błogosławi swoich w promieniu: leczy (życia na sekundę) i daje dar swojej roli na `trwa` tików po wyjściu
        /// z kręgu. Dary: rycerz — siła i szybkość, robotnik — kopanie i szybkość, pobożny — modlitwa; każdy — wolniej głodnieje.
        /// </summary>
        public static Typ_BLOGOSLAWIENSTWO BLOGOSLAWIENSTWO = new Typ_BLOGOSLAWIENSTWO
        {
            promien = 8,
            co = 30,
            leczenie = 1.1,
            trwa = 2400,
            dary = new Dictionary<string, Typ_BLOGOSLAWIENSTWO_dary_wpis>
            {
                ["rycerz"] = new Typ_BLOGOSLAWIENSTWO_dary_wpis
                {
                    sila = 1.15,
                    szybkosc = 1.1,
                },
                ["robotnik"] = new Typ_BLOGOSLAWIENSTWO_dary_wpis
                {
                    szybkosc = 1.1,
                    kopanie = 1.25,
                },
                ["pobozny"] = new Typ_BLOGOSLAWIENSTWO_dary_wpis
                {
                    modlitwa = 1.25,
                },
            },
            glod = 0.85,
        };

        /// <summary>
        /// Schody drogi wiernych (6.11, decyzja użytkownika: dawne „były obrzydliwe i wyglądały nowocześnie” i „budowały się
        /// nierealistycznie”): w każdym odcinku szybu schody kręcone wykute w skale — stopnie wokół kamiennego słupa, jak
        /// w wieży zamku. Widać je tylko tam, gdzie robotnicy wykuli już skałę (render/schody.ts), a postacie idą po spirali
        /// (render/lud/rozstep.ts). Odległości w kaflach.
        /// </summary>
        public static Typ_SCHODY SCHODY = new Typ_SCHODY
        {
            obrot = 5,
            stopni = 12,
            slup = 0.5,
            linia = 1.58,
            ukos = 0.2,
            grubosc = 2,
            lina = 0.8,
            pierscienCo = 3,
            wGore = 0.5,
            wDol = 0.55,
            okruchyMs = 950,
            swiezyMs = 7000,
        };

        /// <summary>
        /// Budowa schodów drogi wiernych (sim/budowa-schodow.ts, decyzja użytkownika: schody powstają z rusztowaniem, liną
        /// i drabiną, nie wyłaniają się kafel po kaflu przy kopaniu). Czas w tikach (120 = sekunda).
        /// </summary>
        public static Typ_BUDOWA_SCHODOW BUDOWA_SCHODOW = new Typ_BUDOWA_SCHODOW
        {
            tikowNaStopien = 140,
            murarzy = 2,
            bezKolowrotu = 0.6,
            kubelTikow = 420,
            zmiana = 1800,
            bezczynnyPo = 3600,
            drabinaKat = -0.5,
            szczebel = 0.42,
            rusztowanie = 5,
            pomost = 2.2,
            przestawianie = 2,
        };
    }

    /// <summary>
    /// LOCH, KOCIOŁ I BRAMA (6.11, decyzja użytkownika): droga wiernych nie idzie już prosto w dół. Pierwszy szyb schodzi
    /// od wnęki przy sali do starej komnaty z pajęczynami i kotłem, komnatą idzie się w bok, a drugi szyb schodzi z jej
    /// drugiego końca na przedproże lochu. Do lochu z Wielkim Pomnikiem prowadzi tylko stalowa brama — podnosi się, gdy
    /// przy kotle rzuca zaklęcia dwóch pobożnych, a potem powoli opada. Tu wszystkie liczby; geometria — sim/world.ts,
    /// brama — sim/brama.ts, rysunek — render/loch.ts. Odległości w kaflach, czas w tikach (120 = sekunda).
    /// </summary>
    public sealed partial class Typ_LOCH
    {
        /// <summary>
        /// Zakręt drogi wiernych: pierwszy szyb sięga tyle rzędów pod podłogę sali (do dna komnaty z kotłem), a drugi zaczyna
        /// się tyle kolumn w bok (środek do środka). Strona: −1 — w lewo, w stronę przedproża lochu. Przykład użytkownika
        /// „40 w dół, 30 w bok, znowu w dół”; razem do wykucia mniej więcej tyle co dawny prosty szyb (komnata stoi pusta).
        /// </summary>
        public Typ_LOCH_zakret zakret;
        /// <summary>
        /// Stara komnata na zakręcie (z pajęczynami i kotłem): wysokość wnętrza i ile kafli wystaje za szyby po bokach.
        /// Mur dookoła jest nie do ruszenia — wchodzi się szybem z góry, wychodzi szybem w dół.
        /// </summary>
        public Typ_LOCH_komnata komnata;
        /// <summary>
        /// Loch z Wielkim Pomnikiem: pół szerokości wnętrza (końce leżą dalej od przedsionka niż zasięg Strażników z zapasem —
        /// tam bezbronni czekają, gdy trwa fala), wysokość sklepienia w przęsłach (łuki co `przeslo` kafli, każdy wyższy
        /// w środku o `luk`) i nad przedsionkiem (`nawa` na tyle kafli w bok). Mury nie do ruszenia, `mur` kafli grube.
        /// </summary>
        public Typ_LOCH_loch loch;
        /// <summary>Przedproże przed bramą (na dnie drugiego szybu): wysokość wnętrza i ile kafli sięga za szyb na lewo.</summary>
        public Typ_LOCH_przedproze przedproze;
        /// <summary>Stalowa brama w lewym murze lochu: wysokość przejścia (kafle) — tyle podnosi się krata przy pełnym otwarciu.</summary>
        public Typ_LOCH_brama brama;
    }

    public sealed partial class Typ_LOCH_zakret
    {
        public double wDol;
        public double wBok;
        public double strona;
    }

    public sealed partial class Typ_LOCH_komnata
    {
        public double wys;
        public double zaSzybem;
    }

    public sealed partial class Typ_LOCH_loch
    {
        public double rx;
        public double przeslo;
        public double sklepienie;
        public double luk;
        public double nawa;
        public double nawaSzer;
        public double mur;
    }

    public sealed partial class Typ_LOCH_przedproze
    {
        public double wys;
        public double zaSzybem;
    }

    public sealed partial class Typ_LOCH_brama
    {
        public double wys;
    }

    /// <summary>
    /// Brama (sim/brama.ts). Otwarcie 0..1: rośnie, póki przy kotle rzuca zaklęcia co najmniej `potrzeba` pobożnych
    /// (pełne otwarcie po `otwieranie` tików — 40 s), a gdy przestaną — opada przez `opadanie` (od pełnego otwarcia do
    /// zamknięcia). Przejść da się, póki otwarcie ≥ `czolgaOd` (pod kratą trzeba się czołgać), wyprostowanym — od `idzieOd`
    /// (40 s zaklinania — przejdzie każdy, 20 s — brama w połowie, tylko się przeczołgać).
    /// </summary>
    public sealed partial class Typ_BRAMA
    {
        public double potrzeba;
        // w TS: 40 * 120
        public double otwieranie;
        // w TS: 110 * 120
        public double opadanie;
        public double czolgaOd;
        public double idzieOd;
        /// <summary>Czołgający się pod kratą idzie tyle razy wolniej.</summary>
        public double czolganie;
        /// <summary>Przy kotle: tyle kafli od środka kotła w bok (i jeden rząd w górę/dół) stoi się, rzucając zaklęcia.</summary>
        public double przyKotle;
        /// <summary>Gdzie stają rzucający zaklęcia — kafle od kotła (po kolei, na zmianę po obu stronach).</summary>
        public double[] miejscaPrzyKotle;
    }

    /// <summary>
    /// Modlitwa za innych (6.11): modlący się pobożny (na rozkaz „Módl się za innych”, przy obozie, w krypcie albo przy
    /// ołtarzu) błogosławi swoich w promieniu: leczy (życia na sekundę) i daje dar swojej roli na `trwa` tików po wyjściu
    /// z kręgu. Dary: rycerz — siła i szybkość, robotnik — kopanie i szybkość, pobożny — modlitwa; każdy — wolniej głodnieje.
    /// </summary>
    public sealed partial class Typ_BLOGOSLAWIENSTWO
    {
        public double promien;
        /// <summary>Co tyle tików krąg sprawdza, kto w nim stoi (leczenie liczone za cały odstęp).</summary>
        public double co;
        /// <summary>Życia na sekundę (bez względu na rolę — rycerz ma go dużo, więc leczy go to słabiej, niż się wydaje).</summary>
        public double leczenie;
        // w TS: 20 * 120
        public double trwa;
        public Dictionary<string, Typ_BLOGOSLAWIENSTWO_dary_wpis> dary;
        public double glod;
    }

    public sealed partial class Typ_BLOGOSLAWIENSTWO_dary_wpis
    {
        public double? sila;
        public double? szybkosc;
        public double? kopanie;
        public double? modlitwa;
    }

    /// <summary>
    /// Schody drogi wiernych (6.11, decyzja użytkownika: dawne „były obrzydliwe i wyglądały nowocześnie” i „budowały się
    /// nierealistycznie”): w każdym odcinku szybu schody kręcone wykute w skale — stopnie wokół kamiennego słupa, jak
    /// w wieży zamku. Widać je tylko tam, gdzie robotnicy wykuli już skałę (render/schody.ts), a postacie idą po spirali
    /// (render/lud/rozstep.ts). Odległości w kaflach.
    /// </summary>
    public sealed partial class Typ_SCHODY
    {
        /// <summary>Jeden pełny obrót spirali (kafle wysokości) i ile stopni na obrót.</summary>
        public double obrot;
        public double stopni;
        /// <summary>Promień kamiennego słupa i linii, którą się chodzi (od środka szybu).</summary>
        public double slup;
        public double linia;
        /// <summary>Rysunek odrobinę z góry: o tyle kafli wyżej na ekranie leży punkt kafel dalej w głąb (widać stopnice i bębny słupa).</summary>
        public double ukos;
        /// <summary>Grubość bloku stopnia (wysokości stopnia) — bloki zachodzą na siebie, spód spirali jest ciągły.</summary>
        public double grubosc;
        /// <summary>Lina na żelaznych pierścieniach w ścianie: wysokość nad stopniami i pierścień co tyle stopni.</summary>
        public double lina;
        public double pierscienCo;
        /// <summary>
        /// Ruch w pionie po schodach (mnożnik prędkości chodu): w górę, w dół. Po spirali idzie się dalej niż w pionie —
        /// przy tych liczbach postać idzie po stopniach żwawo, trochę szybciej niż po płaskim (ok. 1,4 obrotu i 17 stopni
        /// na sekundę gry). Dawniej zjeżdżała szybem dwa razy szybciej, niż chodzi (0,6 w górę, 1,2 w dół) — na spirali
        /// byłoby to ponad 3 obroty i 40 stopni na sekundę, nogi migałyby zamiast stawać na stopniach. Zupełnie „po płaskiemu”
        /// (0,42 / 0,46) wydłużało każdą drogę z jedzeniem do lochu: bot wygrywał 26 partii z 32, przy tych liczbach 63 z 64
        /// (przy dawnych 64 z 64; partia dłuższa średnio o minutę).
        /// </summary>
        public double wGore;
        public double wDol;
        /// <summary>Świeżo wykuty kafel: ile ms sypią się okruchy i pył, ile ms kamień jest jaśniejszy (świeży).</summary>
        public double okruchyMs;
        public double swiezyMs;
    }

    /// <summary>
    /// Budowa schodów drogi wiernych (sim/budowa-schodow.ts, decyzja użytkownika: schody powstają z rusztowaniem, liną
    /// i drabiną, nie wyłaniają się kafel po kaflu przy kopaniu). Czas w tikach (120 = sekunda).
    /// </summary>
    public sealed partial class Typ_BUDOWA_SCHODOW
    {
        /// <summary>
        /// Tików pracy jednego murarza na stopień (kołowrót z obsługą opuszcza kamienie) — dwóch murarzy: ~0,6 s na stopień
        /// (pierwszy odcinek ~1 min, drugi ~3 min przy pełnej obsadzie). Kołowrót opuszcza naraz paletę z 4 stopniami.
        /// </summary>
        public double tikowNaStopien;
        /// <summary>Ilu murarzy mieści się przy czole budowy (na najwyższych stopniach).</summary>
        public double murarzy;
        /// <summary>Bez nikogo przy kołowrocie murarze sami opuszczają kamień — tyle razy wolniej idzie.</summary>
        public double bezKolowrotu;
        /// <summary>Kurs kubła z urobkiem przy kopaniu (w dół i w górę) — tików.</summary>
        public double kubelTikow;
        /// <summary>Zmiana przy budowie (tików pracy, zanim robotnik znów rozejrzy się, co robić — jedzenie ma pierwszeństwo).</summary>
        public double zmiana;
        /// <summary>Wolny robotnik idzie pomóc przy schodach dopiero po tylu tikach bez zajęcia (i gdy przy obozie zostaje inny wolny).</summary>
        // w TS: 30 * 120
        public double bezczynnyPo;
        /// <summary>Rysunek: drabina — kąt na ścianie szybu (0 — tył, ujemny — w lewo) i odstęp szczebli (kafle).</summary>
        public double drabinaKat;
        public double szczebel;
        /// <summary>Rysunek: rusztowanie — wysokość nad czołem budowy, odstęp pomostów, co ile kafli się je przestawia (kafle).</summary>
        public double rusztowanie;
        public double pomost;
        public double przestawianie;
    }
}
