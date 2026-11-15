// Port: alpha-1/src/render/lud/rozstep.ts
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using Trzewia.Js;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;
using JS = Trzewia.Js.Js;

namespace Trzewia.Rysunek.Lud
{
    /// <summary>
    /// Rozstęp tłumu — tylko na rysunku, symulacja o nim nie wie. Postacie ludu stojące prawie w tym samym
    /// miejscu (dwóch kopaczy przy jednym kaflu, grupka przy siedzibie) rysujemy obok siebie: każda dostaje
    /// przesunięcie w poziomie (w kaflach), które płynie ku celowi, więc postacie rozchodzą się krokiem,
    /// a nie skaczą.
    ///
    /// Stopy zostają na podłodze: przesunięcie nie wyprowadza postaci nad pustkę ani w skałę (dalej, niż
    /// stoi w symulacji). Gdy miejsca brak — szyb na jeden kafel — drugi staje odrobinę z tyłu: ciemniejszy
    /// i rysowany wcześniej, jak dalsza postać na rycinie.
    /// </summary>
    public static class Rozstep
    {
        sealed class Stan
        {
            /// <summary>przesunięcie na rysunku (kafle) i jego cel</summary>
            public double dx, cel;
            /// <summary>0..1 — o ile postać stoi „z tyłu” (przyciemniona, pod sąsiadem) i cel tego</summary>
            public double tlo, celTlo;
            /// <summary>granice rysunku w poziomie (kafle świata) z ostatniego układu</summary>
            public double lo, hi;
            public double t;
            public bool nowy;
            /// <summary>
            /// 6.11: schody kręcone drogi wiernych (render/schody.ts) — o ile postać idzie po spirali (0..1, płynnie przy wejściu
            /// i zejściu), gdzie na niej jest (przesunięcie w poziomie i pionie, „w tle” za słupem) i w którą stronę idzie.
            /// </summary>
            public double sch, schCel, hx, hy, hTlo, zw, px;
            /// <summary>6.11, budowa schodów: na stopniach czy na drabinie w surowym szybie (render/schody.ts: naSchodach)</summary>
            public string tryb = "schody";
            /// <summary>
            /// Na spirali: numer stopnia pod stopami (ciągły) i z poprzedniej klatki, kąt na spirali, kierunek (1 — schodzi,
            /// −1 — wchodzi, 0 — stoi; od kiedy stoi), szerokość sylwetki (1 — bokiem do widza, mniej — gdy obraca się w głąb).
            /// </summary>
            public double stopien, pStopien, kat, kier, ruchT, szer;
        }

        // WeakMap<Creature, Rozstep> z TS
        static ConditionalWeakTable<Creature, Stan> stan = new ConditionalWeakTable<Creature, Stan>();
        static double klatka = double.NaN;

        /// <summary>Szerokość sylwetki (z narzędziem przy ciele) jako część jej wysokości.</summary>
        const double SZEROKOSC = 0.34;
        /// <summary>
        /// Odstęp środków dwóch sąsiadów jako część średniej szerokości — każda sylwetka stoi osobno, z małą szparą
        /// (przy 0,7 grupa przy siedzibie zlewała się w jedną plamę, a kij pobożnego wchodził w sąsiada).
        /// </summary>
        const double ODSTEP = 1.08;
        /// <summary>Najdalej od miejsca w symulacji (kafle) — szóstka przy siedzibie stoi w symulacji na dwóch kaflach.</summary>
        const double MAKS = 1.9;
        /// <summary>Granice szuka się najwyżej tyle kafli w każdą stronę.</summary>
        static readonly double ZASIEG = Math.Ceiling(MAKS) + 1;
        /// <summary>Środek stóp nie bliżej ściany niż tyle (kafle) — pół tułowia.</summary>
        const double MARGINES = 0.24;
        /// <summary>Sąsiedzi w jednym rzędzie: różnica wysokości stóp mniejsza niż tyle (kafle).</summary>
        const double RZAD = 1.5;
        /// <summary>Stała czasowa płynięcia ku celowi (ms).</summary>
        const double PLYN_MS = 230;
        /// <summary>Stała czasowa wejścia na spiralę i zejścia z niej (ms) — krótsza niż rozstęp, żeby stopy trzymały się stopni.</summary>
        const double SCHODY_MS = 140;
        /// <summary>Poniżej tej różnicy (kafle) kolejność w rzędzie bierze się z rysunku, nie z symulacji.</summary>
        const double REMIS = 0.15;

        static Stan? Daj(Creature c) => stan.TryGetValue(c, out var s) ? s : null;

        /// <summary>Przesunięcie postaci na rysunku (kafle, w poziomie) — pierścienie, dymki i trafienie palcem idą za nim.</summary>
        public static double przesuniecieX(Creature c)
        {
            var s = Daj(c);
            return s != null ? s.dx * (1 - s.sch) + s.hx * s.sch : 0;
        }

        /// <summary>6.11: przesunięcie w pionie (kafle) — na schodach kręconych dalsza strona spirali leży wyżej (rzut z góry).</summary>
        public static double przesuniecieY(Creature c)
        {
            var s = Daj(c);
            return s != null ? s.hy * s.sch : 0;
        }

        /// <summary>0..1 — o ile postać stoi z tyłu (nie zmieściła się obok sąsiada; na schodach kręconych — z tyłu, za słupem).</summary>
        public static double wTle(Creature c)
        {
            var s = Daj(c);
            return s != null ? Math.Max(s.tlo, s.hTlo * s.sch) : 0;
        }

        /// <summary>6.11: zwrot na rysunku (−1, 1), gdy idzie po spirali — w stronę, w którą idzie po stopniach; 0 — jak w symulacji.</summary>
        public static double zwrotNaRysunku(Creature c)
        {
            var s = Daj(c);
            return s != null && s.sch > 0.5 ? s.zw : 0;
        }

        /// <summary>
        /// 6.11: szerokość sylwetki na rysunku (0..1) — na spirali postać obraca się z nią: bokiem do widza (z przodu i z tyłu
        /// spirali) jest cała, przy ścianach szybu, gdzie idzie w głąb albo ku widzowi, zwęża się jak obracająca się postać.
        /// </summary>
        public static double szerokoscNaRysunku(Creature c)
        {
            var s = Daj(c);
            return s != null ? 1 + (s.szer - 1) * s.sch : 1;
        }

        /// <summary>6.11: na schodach kręconych — czy postać jest z tyłu spirali (za płaszczyzną słupa); rysuje się ją przed innymi.</summary>
        public static bool zTyluSchodow(Creature c)
        {
            var s = Daj(c);
            return s != null && s.sch > 0.5 && s.tryb == "schody" && Math.Cos(s.kat) > 0;
        }

        /// <summary>6.11: chód po schodach kręconych — numer stopnia pod stopami (ciągły) i kierunek (1 — w dół, −1 — w górę, 0 — stoi).</summary>
        public static (double stopien, double kier)? chodNaSchodach(Creature c)
        {
            var s = Daj(c);
            return s != null && s.sch > 0.5 && s.tryb == "schody" ? (s.stopien, s.kier) : ((double, double)?)null;
        }

        /// <summary>6.11, budowa schodów: czy postać wisi na drabinie w surowym szybie (wspina się — render/figury.ts).</summary>
        public static bool naDrabinie(Creature c)
        {
            var s = Daj(c);
            return s != null && s.sch > 0.5 && s.tryb == "drabina";
        }

        /// <summary>Czy postać może zejść z miejsca na rysunku — nie w locie, nie na linie, nie leżąc.</summary>
        static bool moznaRozsunac(Sim sim, Creature c) =>
            c.lot == null && c.wDloni != true && c.naLinie == null && c.naWiadrze != true && c.vy <= 0.3
            && c.czynnosc != "spi" && !((c.ogluszonyDo ?? -1) > sim.tick);

        /// <summary>
        /// Granice rysunku w poziomie: postać stojąca na ziemi może przejść tylko po kaflach z podłogą, a wisząca
        /// w powietrzu (wspinaczka) — po wolnych; nie dalej niż MAKS i nigdy głębiej w ścianę, niż stoi naprawdę.
        /// </summary>
        static (double lo, double hi) granice(Sim sim, Creature c)
        {
            var w = sim.world;
            double tx = Math.Floor(c.x), ry = Math.Floor(c.y + 0.02);
            var naZiemi = w.solid(tx, ry + 1);
            bool wolna(double x) => w.inb(x, ry) && !w.solid(x, ry) && (!naZiemi || w.solid(x, ry + 1));
            if (!wolna(tx)) return (c.x, c.x);
            double l = tx, r = tx;
            while (l > tx - ZASIEG && wolna(l - 1)) l--;
            while (r < tx + ZASIEG && wolna(r + 1)) r++;
            return (Math.Max(c.x - MAKS, Math.Min(c.x, l + MARGINES)), Math.Min(c.x + MAKS, Math.Max(c.x, r + 1 - MARGINES)));
        }

        sealed class Wpis { public Creature c = null!; public Stan s = null!; public double y, w, q, klucz; }

        /// <summary>
        /// Układ rozstępu na tę klatkę (liczy się raz na `czas` — pierwsza z funkcji rysujących, która go potrzebuje).
        /// `wysokosc` — wysokość sylwetki w pikselach ekranu (render/figury.ts: wysokoscPostaci).
        /// </summary>
        public static void rozstawTlum(Sim sim, Camera cam, double czas, Func<Creature, double, double> wysokosc)
        {
            if (czas == klatka) return;
            klatka = czas;
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z - 3, top = cam.y - cam.vh / 2 / z - 3;
            double right = left + cam.vw / z + 6, bottom = top + cam.vh / z + 6;
            // z daleka tłum i tak się grupuje (render/figury.ts: rysujStworzenia) — wtedy wszyscy wracają na swoje miejsca
            var zBliska = z >= 9;
            var wpisy = new List<Wpis>();
            foreach (var c in sim.creatures)
            {
                if (c.dead || Symulacja.Lud.rolaPostaci(c) == null) continue;
                if (c.x < left || c.x > right || c.y < top || c.y > bottom) { stan.Remove(c); continue; }
                var s = Daj(c);
                if (s == null)
                {
                    s = new Stan { lo = c.x, hi = c.x, t = czas, nowy = true, zw = c.face >= 0 ? 1 : -1, px = c.x, pStopien = double.NaN, ruchT = -1e9, szer = 1 };
                    stan.Add(c, s);
                }
                s.cel = 0; s.celTlo = 0;
                // 6.11: na schodach kręconych idzie po spirali — tłum się tu nie rozstępuje
                var ns = moznaRozsunac(sim, c) ? Schody.naSchodach(sim, c) : null;
                s.schCel = ns != null ? 1 : 0;
                if (ns != null)
                {
                    s.hx = ns.dx; s.hy = ns.dy; s.hTlo = ns.tlo; s.lo = c.x; s.hi = c.x;
                    s.stopien = ns.stopien; s.kat = ns.kat;
                    if (ns.tryb != s.tryb) { s.tryb = ns.tryb; s.pStopien = double.NaN; }
                    continue;
                }
                s.pStopien = double.NaN;
                if (zBliska && moznaRozsunac(sim, c))
                {
                    (s.lo, s.hi) = granice(sim, c);
                    wpisy.Add(new Wpis { c = c, s = s, y = c.y, w = SZEROKOSC * wysokosc(c, z) / z, q = c.x, klucz = c.x + s.dx });
                }
                else { s.lo = c.x; s.hi = c.x; }
            }
            // rzędy: postacie o podobnej wysokości stóp (łańcuchem)
            JS.Sort(wpisy, (a, b) => a.y - b.y);
            for (int i = 0; i < wpisy.Count;)
            {
                int j = i + 1;
                while (j < wpisy.Count && wpisy[j].y - wpisy[j - 1].y < RZAD) j++;
                if (j - i > 1) rozsun(wpisy.GetRange(i, j - i));
                i = j;
            }
            foreach (var e in wpisy) e.s.cel = e.q - e.c.x;
            // płynięcie ku celowi; granice obowiązują też w drodze (postać nie wchodzi w ścianę, gdy korytarz się zwęża)
            foreach (var c in sim.creatures)
            {
                var s = Daj(c);
                if (s == null) continue;
                var dt = Math.Max(0, Math.Min(250, czas - s.t));
                s.t = czas;
                var k = s.nowy || ustawienia.ograniczRuch ? 1 : 1 - Math.Exp(-dt / PLYN_MS);
                var kSch = s.nowy || ustawienia.ograniczRuch ? 1 : 1 - Math.Exp(-dt / SCHODY_MS);
                s.nowy = false;
                s.dx += (s.cel - s.dx) * k;
                s.dx = Math.Max(s.lo - c.x, Math.Min(s.hi - c.x, s.dx));
                if (Math.Abs(s.dx) < 1e-3) s.dx = 0;
                s.tlo += (s.celTlo - s.tlo) * k;
                s.sch += (s.schCel - s.sch) * kSch;
                if (s.sch < 1e-3) s.sch = 0;
                // na spirali: kierunek (schodzi czy wchodzi), zwrot i szerokość sylwetki z kierunku marszu po stopniach —
                // schodzący idzie w stronę rosnącego kąta (cos — składowa marszu w poziomie ekranu), wchodzący odwrotnie
                if (s.schCel > 0 && s.tryb == "drabina")
                {
                    // na drabinie: twarzą do ściany szybu (drabina stoi z tyłu, odrobinę w lewo) — lekko bokiem
                    s.zw = -1; s.szer = 0.82; s.kier = 0;
                }
                else if (s.schCel > 0)
                {
                    if (!double.IsNaN(s.pStopien))
                    {
                        var ds = s.stopien - s.pStopien;
                        if (Math.Abs(ds) > 0.003) { s.kier = ds > 0 ? 1 : -1; s.ruchT = czas; }
                        else if (czas - s.ruchT > 260) s.kier = 0;
                    }
                    s.pStopien = s.stopien;
                    var kierunek = s.kier != 0 ? s.kier : (s.zw == (Math.Cos(s.kat) >= 0 ? 1 : -1) ? 1 : -1);
                    var vx = Math.Cos(s.kat) * kierunek;
                    if (Math.Abs(vx) > 0.08) s.zw = vx > 0 ? 1 : -1;
                    // (bez wygładzania — szerokość ma iść równo z kątem na spirali; wejście i zejście wygładza `sch`)
                    s.szer = 0.34 + 0.66 * Math.Abs(vx);
                }
                s.px = c.x + s.dx * (1 - s.sch) + s.hx * s.sch;
            }
        }

        /// <summary>
        /// Rozsuwa jeden rząd: sąsiedzi ustępują sobie po połowie, w swoich granicach. Kolejność — według miejsca
        /// w symulacji (idący mija stojącego, zamiast pchać go przed sobą); prawie w jednym miejscu — według rysunku
        /// z poprzedniej klatki i numeru, żeby stojący razem nie zamieniali się miejscami przy każdym drgnięciu.
        /// </summary>
        static void rozsun(List<Wpis> rzad)
        {
            JS.Sort(rzad, (a, b) =>
            {
                var d = a.c.x - b.c.x;
                if (Math.Abs(d) > REMIS) return d;
                var kl = a.klucz - b.klucz;       // (a.klucz − b.klucz) || (a.c.id − b.c.id)
                return JS.Tak(kl) ? kl : a.c.id - b.c.id;
            });
            for (int it = 0; it < 10; it++)
            {
                var ruch = false;
                for (int k = 0; k + 1 < rzad.Count; k++)
                {
                    Wpis a = rzad[k], b = rzad[k + 1];
                    if (Math.Abs(a.y - b.y) >= RZAD) continue;
                    var brak = ODSTEP * (a.w + b.w) / 2 - (b.q - a.q);
                    if (brak <= 1e-3) continue;
                    double mozeA = Math.Max(0, a.q - a.s.lo), mozeB = Math.Max(0, b.s.hi - b.q);
                    double da = Math.Min(brak / 2, mozeA), db = Math.Min(brak / 2, mozeB);
                    // czego jeden nie może (ściana), oddaje drugiemu
                    var reszta = brak - da - db;
                    if (reszta > 1e-4) { var ea = Math.Min(reszta, mozeA - da); da += ea; db += Math.Min(reszta - ea, mozeB - db); }
                    if (da + db < 1e-4) continue;
                    a.q -= da; b.q += db;
                    ruch = true;
                }
                if (!ruch) break;
            }
            // kto nie zmieścił się obok sąsiada (wąski szyb), staje za nim — zawsze ten z wyższym numerem;
            // im ciaśniej, tym głębiej w cieniu
            for (int k = 0; k + 1 < rzad.Count; k++)
            {
                Wpis a = rzad[k], b = rzad[k + 1];
                if (Math.Abs(a.y - b.y) >= RZAD * 0.6) continue;
                var d = ODSTEP * (a.w + b.w) / 2;
                var ciasno = Math.Min(1, Math.Max(0, (0.92 * d - (b.q - a.q)) / (0.45 * d)));
                if (ciasno > 0) { var s = (a.c.id > b.c.id ? a : b).s; s.celTlo = Math.Max(s.celTlo, ciasno); }
            }
        }
    }
}
