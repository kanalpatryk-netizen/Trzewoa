// Zmiany Kręgu Trzeciego po porcie z TS — prośby użytkownika z 20.11 (docs/plan-oprawy-cerber.md, etap 6b):
//   - bez Cieni Żarłoków: jedynym przeciwnikiem jest Cerber (fale Strażników z kamienia nie wychodzą),
//   - naprawy błędów Kręgu (krata lochu w walce z Cerberem…),
//   - (dalsze zmiany etapu 6 — dopisywane tutaj).
// Walka według wzorów ma osobny przełącznik (WalkaWzor.Wlaczony, w grze: --walka stara|wzory), ale i ona gaśnie razem
// z głównym wyłącznikiem.
//
// Główny wyłącznik Wlaczone (domyślnie tak): wyłączony — Krąg liczy się bit w bit jak w TS (krag-3-beta); tak liczą
// testy zgodności z TS. Działa tylko w Kręgu Trzecim; Alpha 1 bez zmian.
using System;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static class ZmianyKregu
    {
        /// <summary>Zmiany Kręgu po porcie włączone. Wyłączone — Krąg jak w TS.</summary>
        public static bool Wlaczone = true;

        /// <summary>Tryb kręgu i zmiany włączone.</summary>
        public static bool Aktywne => Wlaczone && Krag.Wlaczony;

        /// <summary>Bez Cieni Żarłoków: fale bez bossa przepadają, fala z bossem — sam Cerber.</summary>
        public static bool BezCieni => Aktywne;

        /// <summary>Trwa walka z Cerberem: pieczęć się rozpada, Cerber wychodzi albo walczy (nie: kona).</summary>
        public static bool WalkaZCerberem(Sim sim) { var f = sim.lud.pomnik?.faza; return f == "rozpada" || f == "wychodzi" || f == "walka"; }

        /// <summary>
        /// Naprawa błędu „rycerz nie dojdzie do Cerbera” (20.11): w walce z Cerberem krata lochu jest wyrwana — brama stoi
        /// otworem (Brama.tikBramy).
        /// </summary>
        public static bool KrataWyrwana(Sim sim) => Aktywne && WalkaZCerberem(sim);

        /// <summary>
        /// Życie Cerbera × tyle. Decyzja użytkownika 22.11: „przedłuż” — po naprawach etapu 7a walka trwała 32 s (mediana
        /// 40 ziaren) zamiast 51 s, bo rycerz wreszcie sięgał Cerbera i od razu ścinał pustą głowę.
        /// </summary>
        public const double ZYCIE_CERBERA = 2.9;

        /// <summary>Życie, z którym Cerber wstaje (przy zmianach kręgu — większe, patrz ZYCIE_CERBERA).</summary>
        public static double ZycieCerbera(double hp) => Aktywne ? hp * ZYCIE_CERBERA : hp;

        /// <summary>
        /// Naprawa błędu „rycerz nie ścina pustej głowy” (22.11): pasek głowy zbity do dna — głowa zwisa i czeka na miecz,
        /// a Cerber się nie zrasta. Dawniej w pół sekundy odrastał z 1 do 5 punktów, rycerz przestawał celować w ścięcie
        /// (Walka.glowaCzeka) i bił zwykłymi ciosami, aż głodny odchodził jeść, a Cerber zrastał się do pełnego paska.
        /// </summary>
        public static bool GlowaCzekaNaMiecz(Creature b) => Aktywne && Walka.glowaCzeka(b);

        /// <summary>
        /// Naprawa błędu „rycerz kręci się pod Cerberem” (22.11): w symulacji Cerber wisiał 3 kafle nad rycerzem (na rysunku
        /// stoi na posadzce tuż przy nim) i smagał go łańcuchem raz za razem, a rycerz nie sięgał go mieczem. Po ataku
        /// z dystansu Cerber najpierw podchodzi do celu; następny atak z daleka — dopiero gdy bliżej podejść nie może.
        /// </summary>
        public static bool NajpierwPodejdz(Sim sim, Creature b, Creature cel, double d)
        {
            if (!Aktywne || b.ruchPoprz == null || d <= Nastawy.NastawyPomnik.DEMON.zasieg) return false;
            if (Nastawy.NastawyWalka.RUCHY_BOSSA[b.ruchPoprz]?.rodzaj != "dystans") return false;
            var (tx, ty) = CelPodejsciaCerbera(b, cel);
            return Straznicy.zblizySie(sim, b, tx, ty, Nastawy.NastawyPomnik.DEMON.szybkosc, Nastawy.NastawyStraznicy.STRAZNICY.limitOdRdzenia);
        }

        // ---------------------------------------------------------------------------------------------------------------
        // Etap 7b (użytkownik 22.11, film 3:04–3:27): „rycerz kręci się wokół własnej osi z pozycją do walki… to samo Cerber
        // na początku; atak ma być dopiero wtedy, gdy Cerber wyjdzie naprzeciw rycerzowi”. Przyczyna: odległości liczyły się
        // od środka Cerbera, który w symulacji wisi nad posadzką (rysunek stawia go na posadzce), więc rycerz, żeby go
        // sięgnąć, wchodził pod niego — i obaj obracali się przy każdej setnej kafla różnicy. Teraz przy Cerberze:
        // odległość w poziomie od jego łbów (CIALO_CERBERA) i różnica posadzek pod stopami; walczący staje STAN_WALKI od jego
        // środka, nigdy bliżej niż STAN_NAJBLIZEJ; Cerber podchodzi na to samo miejsce i obraca się dopiero od OBROT_OD.

        /// <summary>Ile Cerbera wystaje przed jego środek w stronę walczącego (kafle) — odległość walki liczy się od łbów.</summary>
        public const double CIALO_CERBERA = 0.6;
        /// <summary>Gdzie staje walczący przy Cerberze: tyle kafli od jego środka w poziomie (przed łbami, nie pod nim).</summary>
        public const double STAN_WALKI = 2.6;
        /// <summary>Bliżej środka Cerbera walczący nie stoi — odsuwa się na STAN_WALKI.</summary>
        public const double STAN_NAJBLIZEJ = 2.0;
        /// <summary>Cerber obraca się do celu dopiero, gdy ten jest dalej niż tyle w poziomie (bez kręcenia się w miejscu).</summary>
        public const double OBROT_OD = 0.6;

        static bool JestCerberem(Creature c) => c.boss == "demon";

        /// <summary>Para walczących, w której jest Cerber — przy zmianach kręgu liczy się ją po nowemu.</summary>
        public static bool ParaZCerberem(Creature a, Creature b) => Aktywne && (JestCerberem(a) || JestCerberem(b));

        /// <summary>
        /// Rząd posadzki pod stopami: Cerber — pierwsza posadzka pod jego miejscem (jak na rysunku, do 8 kafli), a gdy jeszcze
        /// przenika skałę (wychodzi z komory pieczęci w górę, na posadzkę sali) — rząd pod nim, czyli niżej niż ci na
        /// posadzce; reszta — rząd pod nogami.
        /// </summary>
        public static double Stopy(Sim sim, Creature c)
        {
            if (!JestCerberem(c)) return Math.Floor(c.y) + 1;
            var w = sim.world;
            double fx = Math.Floor(c.x), y = Math.Floor(c.y);
            if (WSkale(sim, c)) return y + 1;
            for (int k = 0; k < 8 && w.passable(fx, y + 1); k++) y++;
            return y + 1;
        }

        /// <summary>Cerber jest w skale (przenika ją, wychodząc z komory pieczęci) — jeszcze nie stoi na żadnej posadzce.</summary>
        public static bool WSkale(Sim sim, Creature c)
        {
            var w = sim.world;
            double fx = Math.Floor(c.x), y = Math.Floor(c.y);
            return w.inb(fx, y) && !w.passable(fx, y);
        }

        /// <summary>O ile rzędów różnią się posadzki pod stopami dwóch postaci.</summary>
        public static double RoznicaPoziomow(Sim sim, Creature a, Creature b) => Math.Abs(Stopy(sim, a) - Stopy(sim, b));

        /// <summary>
        /// Odległość walki. Para z Cerberem (przy zmianach kręgu): w poziomie od jego łbów i różnica posadzek; poza tym — jak
        /// dawniej, prosto między środkami (to samo wyrażenie co w TS).
        /// </summary>
        public static double Odleglosc(Sim sim, Creature a, Creature b)
        {
            if (!ParaZCerberem(a, b)) return JS.Hypot(a.x - b.x, a.y - b.y);
            return JS.Hypot(Math.Max(0, Math.Abs(a.x - b.x) - CIALO_CERBERA), RoznicaPoziomow(sim, a, b));
        }

        /// <summary>Różnica wysokości do warunków „ten sam poziom”: para z Cerberem — posadzki, poza tym — y jak dawniej.</summary>
        public static double RoznicaWysokosci(Sim sim, Creature a, Creature b) =>
            ParaZCerberem(a, b) ? RoznicaPoziomow(sim, a, b) : Math.Abs(a.y - b.y);

        /// <summary>Po której stronie Cerbera jest `c` (−1 lewa, 1 prawa); pod samym środkiem — przed jego łbami.</summary>
        static double Strona(Creature b, Creature c)
        {
            var dx = c.x - b.x;
            return Math.Abs(dx) >= 0.3 ? Math.Sign(dx) : (b.face >= 0 ? 1 : -1);
        }

        /// <summary>Walczący jest blisko Cerbera (na arenie): w poziomie nie dalej niż tyle kafli, w pionie — tyle rzędów.</summary>
        const double BLISKO_DX = 8, BLISKO_RZEDOW = 24;

        /// <summary>Walczący jest blisko Cerbera — wtedy ustawia się naprzeciw niego; z daleka idzie jak dawniej (drogą wiernych).</summary>
        public static bool BliskoCerbera(Sim sim, Creature c, Creature b) =>
            ParaZCerberem(c, b) && Math.Abs(c.x - b.x) <= BLISKO_DX && RoznicaPoziomow(sim, c, b) <= BLISKO_RZEDOW;

        /// <summary>
        /// Kafel, na którym walczący staje przy Cerberze: STAN_WALKI od jego środka, po swojej stronie, na posadzce `rzad`
        /// (gdy tam ściana albo dziura — po drugiej stronie; gdy i tam — null).
        /// </summary>
        static (double x, double y)? Stan(Sim sim, Creature c, Creature b, double rzad)
        {
            var w = sim.world;
            var strona = Strona(b, c);
            foreach (var s in new[] { strona, -strona })
            {
                var x = Math.Floor(b.x + s * STAN_WALKI);
                if (w.inb(x, rzad) && w.inb(x, rzad + 1) && w.passable(x, rzad) && !w.passable(x, rzad + 1)) return (x, rzad);
            }
            return null;
        }

        /// <summary>
        /// Dokąd podchodzi walczący do Cerbera: blisko i na tej samej posadzce — na swoje miejsce do walki (STAN_WALKI od
        /// jego środka); poza tym — jak dawniej, na kafel Cerbera (droga wiernych sprowadza go na arenę).
        /// </summary>
        public static (double x, double y) MiejsceDoWalki(Sim sim, Creature c, Creature b)
        {
            if (BliskoCerbera(sim, c, b) && RoznicaPoziomow(sim, c, b) <= 1 && Stan(sim, c, b, Stopy(sim, b) - 1) is var (x, y)) return (x, y);
            return (Math.Floor(b.x), Math.Floor(b.y));
        }

        /// <summary>
        /// Dokąd idzie Cerber do celu: STAN_WALKI przed nim, po swojej stronie, rząd nad nim — wtedy rysunek (stopy na pierwszej
        /// posadzce pod miejscem Cerbera) stawia go łapami na tej samej posadzce co cel, a nie pół kafla w niej.
        /// </summary>
        public static (double x, double y) CelPodejsciaCerbera(Creature b, Creature cel) =>
            (cel.x - Strona(b, cel) * STAN_WALKI, cel.y - 1);

        /// <summary>
        /// Walczący blisko Cerbera ustawia się do walki. True — ten tik zajęło ustawianie (czeka albo idzie), false — może bić
        /// albo podchodzić jak zwykle. Cerber niżej (wychodzi z dołu i idzie w górę, na posadzkę walczącego) — czeka przodem
        /// do niego; za blisko (nad nim albo pod nim) — odsuwa się na STAN_WALKI po swojej posadzce; pierwszy cios dopiero,
        /// gdy Cerber stanie do niego przodem.
        /// </summary>
        public static bool UstawDoWalki(Sim sim, Creature c, Creature b, Action<double, double> podejdz)
        {
            if (!BliskoCerbera(sim, c, b)) return false;
            double sc = Stopy(sim, c), sb = Stopy(sim, b), strona = Strona(b, c);
            // przodem do Cerbera; cel zajęcia tu, gdzie stoi — żeby nic innego nie ciągnęło go do dawnego celu
            void przodem() { c.face = c.x < b.x ? 1 : -1; c.jx = Math.Floor(c.x); c.jy = Math.Floor(c.y); }
            // krok na miejsce do walki — tyłem, przodem do Cerbera (bez odwracania się)
            void krokNa(double x, double y) { podejdz(x, y); c.face = c.x < b.x ? 1 : -1; }
            var zaBlisko = Math.Abs(c.x - b.x) < STAN_NAJBLIZEJ;
            if (sb > sc + 1)
            {
                // Cerber wychodzi z dołu: czeka na swojej posadzce; nad samym Cerberem — odsuwa się na bok
                if (zaBlisko && Stan(sim, c, b, sc - 1) is var (nx, ny)) { krokNa(nx, ny); return true; }
                przodem(); c.droga = null; return true;
            }
            if (sb < sc - 1) return false;   // Cerber wyżej — podchodzi jak zwykle
            // za blisko — odsuwa się na swoje miejsce; gdy wolnego miejsca nie ma po żadnej stronie — bije, gdzie stoi
            if (zaBlisko) { if (Stan(sim, c, b, sb - 1) is var (mx, my)) { krokNa(mx, my); return true; } }
            // pierwszy cios dopiero, gdy Cerber stanie przodem (jeszcze nikogo nie zaatakował)
            if (b.ciosT == null && (b.face >= 0 ? 1 : -1) != strona) { przodem(); return true; }
            return false;
        }

        /// <summary>
        /// Walczący stoi przy Cerberze — czeka, aż ten wyjdzie, albo bije z miejsca. To nie zakleszczenie (Stworzenia, licznik
        /// zakleszczenia): dawniej co sekundę planował od nowa, obracał się w stronę obozu i wracał do walki.
        /// </summary>
        public static bool StoiPrzyCerberze(Sim sim, Creature c)
        {
            if (!Aktywne || c.job != Job.FIGHT) return false;
            var b = sim.creatureById(sim.target.getOr(c.id, -1));
            return b != null && !b.dead && JestCerberem(b) && BliskoCerbera(sim, c, b);
        }

        /// <summary>Cerber obraca się do celu dopiero od OBROT_OD w poziomie; bliżej zostaje, jak stał (`face0`).</summary>
        public static void ObrocCerbera(Creature b, Creature cel, double face0)
        {
            var dx = cel.x - b.x;
            b.face = Math.Abs(dx) > OBROT_OD ? (dx > 0 ? 1 : -1) : face0;
        }

        /// <summary>
        /// Krok zmian kręgu (z Krag.tikKregu). Naprawa błędu „gra bez końca” (20.11): Cerber zasypuje kawałek drogi wiernych,
        /// a odkopać go mogą tylko grabarze — gdy zginęli, mnisi nie mieli jak zejść do Cerbera. Teraz, gdy grabarzy już nie
        /// ma, zasypany gruz osypuje się sam (a Cerber nie zasypuje drogi dalej — Boss.zasypDroge).
        /// </summary>
        public static void tik(Sim sim, StanKregu k)
        {
            if (!Aktywne) return;
            // etap 8: siła rośnie od chodzenia (kopanie i walka dokładają się tam, gdzie się kuje i bije)
            Sila.Chod(sim);
            if (sim.tick % 60 != 0 || k.zasypane == null || k.zasypane.Count == 0) return;
            var w = sim.world;
            k.zasypane.RemoveAll(i => w.tile[i] != T.ROCK);
            if (k.zasypane.Count == 0) return;
            foreach (var c in sim.creatures) if (!c.dead && Lud.rolaPostaci(c) == "robotnik") return;
            foreach (var i in k.zasypane)
            {
                w.tile[i] = T.AIR;
                sim.spark(i % w.w + 0.5, System.Math.Floor(i / w.w) + 0.5, "dust");
            }
            var i0 = k.zasypane[0];
            k.zasypane.Clear();
            sim.gdzie(i0 % w.w, System.Math.Floor(i0 / w.w)).log("Nie ma już grabarzy — gruz, którym Cerber zasypał drogę wiernych, osypuje się sam. Droga znów wolna.", "swiat", "zasyp-osypuje");
        }

        /// <summary>
        /// Naprawa błędu „gra bez końca” (20.11): gdy walczących brak, mnisi razą Cerbera księgą — a on zrastał się szybciej
        /// (3,6 życia na sekundę), niż dwóch mnichów go raniło, więc walka nie kończyła się nigdy. Księga to też modlitwa:
        /// póki choć jeden mnich trafił go nią w ostatnich 2,5 s, Cerber się nie zrasta.
        /// </summary>
        public static bool KsiegaWstrzymujeZrastanie(Sim sim)
        {
            if (!Aktywne || !Straznicy.trybWiernych(sim)) return false;
            foreach (var c in sim.creatures)
                if (!c.dead && c.ksiegaT is double t && sim.tick - t < 300 && Lud.rolaPostaci(c) == "pobozny") return true;
            return false;
        }
    }
}
