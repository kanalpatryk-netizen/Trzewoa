// Oprawa, etap 7d (docs/plan-oprawy-cerber.md; użytkownik 22.11: „ludzie wyglądają jak kurczaki, to nawet nie przypomina
// człowieka” — decyzja: „narysuję od nowa w kodzie”): NOWA POSTAĆ LUDZKA rysowana kodem w stylu ryciny. Ludzkie
// proporcje (głowa ok. 1/7,5 wzrostu, szyja, barki, łokcie, dłonie, kolana, stopy z piętą), stawy jak w Ludziku
// (0 — kość w dół, + — naprzód), stroje: grabarz, mnich, rycerz (zbroja z kuźni część po części), żarłok (potępiony
// z trzeciego kręgu), Dante, Wergiliusz. Cieniowanie od światła z góry z przodu, kreskowanie w cieniu (na większych
// rozmiarach), cienki kontur tuszem w barwie sepii — bez obwódki wokół sylwetki (7a: „czarne obramowania” usunięte).
//
// Układ: środek stóp w (0, 0), y w górę ujemne, twarzą w prawo (+x); `h` — wzrost stojącej postaci w pikselach.
// Postać gry trafia do gry jako arkusze klatek (Komputer/PiekarniaLudzi.cs) — wtedy działa wszystko, co gra robi
// z duszkami (krawędź światła, przenikanie za Cerberem, czytelność, poziomy wielkości). Żarłoki, Dante i Wergiliusz
// rysują się na żywo (film, zabijanie, tłum), bo ich pozy są dowolne. Rysunek: PostacRysunek.cs.
using System;

namespace Trzewia.Rysunek.Ludzie
{
    /// <summary>Poza: kąty stawów w radianach (kość: 0 — w dół, + — naprzód; tułów: 0 — pion, + — pochylony naprzód).</summary>
    public struct Poza
    {
        public double tulow, glowa;
        /// <summary>ramię (bezwzględnie), zgięcie łokcia (+ — przedramię w górę/naprzód), zgięcie nadgarstka; L — dalsze, P — bliższe</summary>
        public double ramieL, lokiecL, dlonL, ramieP, lokiecP, dlonP;
        /// <summary>udo (bezwzględnie), zgięcie kolana (+ — podudzie do tyłu), stopa (+ — palce w dół)</summary>
        public double udoL, kolanoL, stopaL, udoP, kolanoP, stopaP;
        /// <summary>biodro względem środka stóp: x (ułamki wzrostu, + naprzód); y — wysokość nad ziemią (null — tak nisko, by stała na ziemi)</summary>
        public double biodroX;
        public double? biodroY;
        /// <summary>obrót całej postaci wokół bioder (leżenie, upadek), + — naprzód</summary>
        public double obrot;
        /// <summary>wzlot nad ziemię (skok; ułamki wzrostu) — gdy biodroY nie jest podane</summary>
        public double wzlot;
        /// <summary>usta 0…1 (krzyk), płaszcz: wychylenie (−1…1, + — rozwiany do tyłu), brzuch 0…1 (żarłok)</summary>
        public double usta, plaszcz, brzuch;
        /// <summary>błoto i krew 0…1</summary>
        public double bloto, krew;

        /// <summary>Stoi prosto, ręce wzdłuż ciała.</summary>
        public static Poza Stoi() => new Poza
        {
            tulow = 0.03, glowa = 0.02, ramieL = -0.06, lokiecL = 0.12, ramieP = 0.05, lokiecP = 0.15,
            udoL = -0.03, kolanoL = 0.03, udoP = 0.04, kolanoP = 0.04,
        };

        /// <summary>Poza pośrodku między a i b (kąty liniowo; wysokość bioder — jeśli obie podane).</summary>
        public static Poza Miesz(in Poza a, in Poza b, double k)
        {
            double m(double x, double y) => x + (y - x) * k;
            return new Poza
            {
                tulow = m(a.tulow, b.tulow), glowa = m(a.glowa, b.glowa),
                ramieL = m(a.ramieL, b.ramieL), lokiecL = m(a.lokiecL, b.lokiecL), dlonL = m(a.dlonL, b.dlonL),
                ramieP = m(a.ramieP, b.ramieP), lokiecP = m(a.lokiecP, b.lokiecP), dlonP = m(a.dlonP, b.dlonP),
                udoL = m(a.udoL, b.udoL), kolanoL = m(a.kolanoL, b.kolanoL), stopaL = m(a.stopaL, b.stopaL),
                udoP = m(a.udoP, b.udoP), kolanoP = m(a.kolanoP, b.kolanoP), stopaP = m(a.stopaP, b.stopaP),
                biodroX = m(a.biodroX, b.biodroX),
                biodroY = a.biodroY is double ya && b.biodroY is double yb ? m(ya, yb) : (k < 0.5 ? a.biodroY : b.biodroY),
                obrot = m(a.obrot, b.obrot), wzlot = m(a.wzlot, b.wzlot), usta = m(a.usta, b.usta), plaszcz = m(a.plaszcz, b.plaszcz), brzuch = m(a.brzuch, b.brzuch),
                bloto = m(a.bloto, b.bloto), krew = m(a.krew, b.krew),
            };
        }
    }

    public enum Narzedzie { Brak, Kilof, Lopata, Miecz, Kostur, Ksiega, Mlot, Kielich, Grzyb }

    /// <summary>Co postać trzyma i nosi w tej klatce.</summary>
    public struct Rekwizyty
    {
        /// <summary>narzędzie w bliższej dłoni i jego kąt względem przedramienia (0 — w przedłużeniu przedramienia)</summary>
        public Narzedzie wP;
        public double katP;
        /// <summary>narzędzie w dalszej dłoni (np. księga), kąt względem przedramienia</summary>
        public Narzedzie wL;
        public double katL;
        /// <summary>worek na plecach (grabarz niesie), blask księgi 0…1, księga otwarta 0…1</summary>
        public bool worek;
        public double blask, otwarta;
        /// <summary>tarcza na dalszym ramieniu — null: według stroju (rycerz z tarczą z kuźni); false — schowana (np. obie ręce na mieczu)</summary>
        public bool? tarcza;
        /// <summary>latarnia grabarza: 0 — brak, 1 — w dalszej dłoni, 2 — postawiona na ziemi w (lampaX, 0) (ułamki wzrostu od środka stóp)</summary>
        public int lampa;
        public double lampaX;
        /// <summary>świeca postawiona na ziemi w (swiecaX, 0) — modlitwa mnicha</summary>
        public bool swieca;
        public double swiecaX;
        /// <summary>miecz w pochwie u pasa (rycerz przy pracy, modlitwie, jedzeniu)</summary>
        public bool pochwa;
    }

    /// <summary>Strój: kim jest postać i co ma na sobie.</summary>
    public sealed class Stroj
    {
        /// <summary>„robotnik” | „pobozny” | „rycerz” | „zarlok” | „dante” | „wergiliusz”</summary>
        public string rola = "robotnik";
        /// <summary>wzór (barwy) — numer postaci jak w arkuszach: robotnik 3, 4, 5, 7, 8; pobożny 1, 2</summary>
        public int wzor;
        /// <summary>robotnik: żelazny hełm; rycerz: ile części zbroi z kuźni (hełm, naramienniki, napierśnik, nakolanniki, tarcza)</summary>
        public bool helm;
        public int zbroja;

        public bool Helm => rola == "rycerz" ? zbroja >= 1 : helm;
        public bool Naramienniki => rola == "rycerz" && zbroja >= 2;
        public bool Napiersnik => rola == "rycerz" && zbroja >= 3;
        public bool Nakolanniki => rola == "rycerz" && zbroja >= 4;
        public bool Tarcza => rola == "rycerz" && zbroja >= 5;
    }

    /// <summary>Punkty ciała w pikselach układu rysunku (stopy w (0, 0)).</summary>
    public struct PunktyPostaci
    {
        public (double x, double y) biodro, kark, glowa, barkL, barkP, lokiecL, lokiecP, dlonL, dlonP, kolanoL, kolanoP, kostkaL, kostkaP, pietaL, pietaP, palceL, palceP;
        /// <summary>promień głowy (piksele)</summary>
        public double rGlowy;
        /// <summary>czubek narzędzia w bliższej dłoni (sztych, ostrze kilofa) — do błysków</summary>
        public (double x, double y) czubek;
        /// <summary>środek światła latarni, płomień świecy, środek księgi (piksele) — do świateł klatek arkusza</summary>
        public (double x, double y) lampa, swieca, ksiega;
    }

    public static partial class Postac
    {
        // ── proporcje (ułamki wzrostu) ──
        internal const double UDO = 0.245, PODUDZIE = 0.235, KOSTKA = 0.032, STOPA = 0.125;
        internal const double TULOW = 0.3, SZYJA = 0.045, R_GLOWY = 0.062, RAMIE = 0.165, PRZEDRAMIE = 0.15, DLON = 0.05;

        internal static (double x, double y) od((double x, double y) a, double kat, double dl) => (a.x + Math.Sin(kat) * dl, a.y + Math.Cos(kat) * dl);
        static (double x, double y) obroc(double x, double y, double kat) => (x * Math.Cos(kat) - y * Math.Sin(kat), x * Math.Sin(kat) + y * Math.Cos(kat));

        /// <summary>Punkty ciała w pozie (bez rysowania): stopy w (0, 0) na ziemi, wzrost `h`.</summary>
        public static PunktyPostaci Punkty(in Poza p, double h = 1)
        {
            var q = PunktyWzgledne(p);
            var y0 = p.biodroY is double by ? -by : -Dno(q, p.obrot) - p.wzlot;
            var x0 = p.biodroX;
            double c = Math.Cos(p.obrot), s = Math.Sin(p.obrot);
            (double, double) T((double x, double y) a) => ((x0 + a.x * c - a.y * s) * h, (y0 + a.x * s + a.y * c) * h);
            return new PunktyPostaci
            {
                biodro = T(q.biodro), kark = T(q.kark), glowa = T(q.glowa), barkL = T(q.barkL), barkP = T(q.barkP),
                lokiecL = T(q.lokiecL), lokiecP = T(q.lokiecP), dlonL = T(q.dlonL), dlonP = T(q.dlonP),
                kolanoL = T(q.kolanoL), kolanoP = T(q.kolanoP), kostkaL = T(q.kostkaL), kostkaP = T(q.kostkaP),
                pietaL = T(q.pietaL), pietaP = T(q.pietaP), palceL = T(q.palceL), palceP = T(q.palceP), rGlowy = R_GLOWY * h,
            };
        }

        /// <summary>Jak nisko pod biodrem sięga najniższa część ciała po obrocie postaci (wzrost 1) — tyle biodro nad ziemią.</summary>
        static double Dno(in PunktyPostaci q, double obrot)
        {
            double c = Math.Cos(obrot), s = Math.Sin(obrot);
            double Y((double x, double y) a) => a.x * s + a.y * c;
            var m = Math.Max(Math.Max(Y(q.pietaL), Y(q.pietaP)), Math.Max(Y(q.palceL), Y(q.palceP)));
            m = Math.Max(m, Math.Max(Y(q.kolanoL), Y(q.kolanoP)) + 0.03);
            // leżący, klęczący na rękach: także dłonie, łokcie, głowa i bark (opiera się o ziemię)
            if (Math.Abs(obrot) > 0.6) m = Math.Max(m, Math.Max(Y(q.glowa) + R_GLOWY, Math.Max(Y(q.barkL), Y(q.barkP)) + 0.05));
            m = Math.Max(m, Math.Max(Y(q.dlonL), Y(q.dlonP)) + 0.02);
            return m;
        }

        /// <summary>Punkty od bioder w (0, 0), wzrost 1, przed obrotem całej postaci.</summary>
        internal static PunktyPostaci PunktyWzgledne(in Poza p)
        {
            (double x, double y) biodro = (0, 0);
            var kat = Math.PI - p.tulow;
            var kark = od(biodro, kat, TULOW);
            double cs = Math.Cos(p.tulow), sn = Math.Sin(p.tulow);
            // barki tuż pod karkiem, dalszy odrobinę z tyłu (profil)
            (double x, double y) barkL = (kark.x - cs * 0.018 + sn * 0.035, kark.y + cs * 0.035 + sn * 0.018);
            (double x, double y) barkP = (kark.x + cs * 0.018 + sn * 0.035, kark.y + cs * 0.035 - sn * 0.018);
            var lokL = od(barkL, p.ramieL, RAMIE); var dlL = od(lokL, p.ramieL + p.lokiecL, PRZEDRAMIE);
            var lokP = od(barkP, p.ramieP, RAMIE); var dlP = od(lokP, p.ramieP + p.lokiecP, PRZEDRAMIE);
            var kolL = od((-0.01, 0), p.udoL, UDO); var kosL = od(kolL, p.udoL - p.kolanoL, PODUDZIE);
            var kolP = od((0.01, 0), p.udoP, UDO); var kosP = od(kolP, p.udoP - p.kolanoP, PODUDZIE);
            var szyja = od(kark, kat - p.glowa * 0.4, SZYJA);
            var glowa = od(szyja, kat - p.glowa, R_GLOWY * 0.95);
            var (pL, tL) = Stopa(kosL, p.udoL - p.kolanoL, p.stopaL);
            var (pP, tP) = Stopa(kosP, p.udoP - p.kolanoP, p.stopaP);
            return new PunktyPostaci
            {
                biodro = biodro, kark = kark, glowa = glowa, barkL = barkL, barkP = barkP, lokiecL = lokL, lokiecP = lokP,
                dlonL = dlL, dlonP = dlP, kolanoL = kolL, kolanoP = kolP, kostkaL = kosL, kostkaP = kosP,
                pietaL = pL, pietaP = pP, palceL = tL, palceP = tP, rGlowy = R_GLOWY,
            };
        }

        /// <summary>Kąt stopy (+ — palce w dół): stopa obraca się trochę z podudziem, resztę robi kostka.</summary>
        internal static double KatStopy(double podudzie, double stopa) => podudzie * 0.35 + stopa;

        /// <summary>Pięta i palce stopy: spód stopy pod kostką, od pięty (trochę za kostką) do palców (naprzód).</summary>
        static ((double x, double y) pieta, (double x, double y) palce) Stopa((double x, double y) kostka, double podudzie, double stopa)
        {
            var k = KatStopy(podudzie, stopa);
            var a = obroc(-0.028, KOSTKA, k); var b = obroc(STOPA - 0.028, KOSTKA, k);
            return ((kostka.x + a.x, kostka.y + a.y), (kostka.x + b.x, kostka.y + b.y));
        }
    }
}
