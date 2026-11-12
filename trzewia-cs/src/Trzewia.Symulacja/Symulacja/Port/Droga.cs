// Port: alpha-1/src/sim/droga.ts
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Koszt wykucia kafla (> 0), albo -1, gdy tego kafla kuć nie wolno albo nie da się.</summary>
    public delegate double KosztKucia(double i, double x, double y);

    public sealed class OpcjeKopania
    {
        /// <summary>koszt wykucia litego kafla (albo -1 — nie wolno)</summary>
        public KosztKucia koszt = (_, __, ___) => -1;
        /// <summary>najwyżej tyle przejrzanych kafli</summary>
        public double limit = 6000;
        public bool plywa = false;
        /// <summary>liczy się z budżetu szukań tiku (planer drogi wiernych — nie)</summary>
        public bool zBudzetu = true;
        /// <summary>dodatkowo: przez które kafle (wolne i lite) w ogóle wolno iść</summary>
        public Func<double, double, double, bool>? dozwolony;
        /// <summary>Alpha: droga schodami — w dół najwyżej o jeden kafel (patrz TS).</summary>
        public bool dwukierunkowa = false;
    }

    public sealed class WynikKopania { public List<double> droga = new List<double>(); public double start; }

    /// <summary>
    /// Szukanie drogi po kaflach — wszerz, z fizyką, jaką stworzenia naprawdę mają (patrz komentarz w droga.ts).
    /// Droga to lista kafli (bez kafla startowego). Szukanie ma limit węzłów i limit na tik.
    /// </summary>
    public static class Droga
    {
        static readonly int N = (int)(World.WORLD_W * World.WORLD_H);
        static readonly int[] znak = new int[N];
        static readonly int[] skad = new int[N];
        static readonly int[] kolejka = new int[N];
        static int pokolenie = 0;

        /// <summary>Ile szukań zostało w tym tiku — reszta czeka albo idzie na przełaj.</summary>
        static int budzet = 0;
        public static void nowyTik(int ile = 18) { budzet = ile; }
        /// <summary>Ile szukań zostało w tym tiku — żeby odróżnić „nie ma drogi” od „nie było czasu szukać”.</summary>
        public static int budzetDrog() => budzet;

        public static bool wolny(Sim sim, double i, bool plywa)
        {
            var w = sim.world;
            int k = (int)i;
            return PASSABLE.d[w.tile.d[k]] == 1 && w.magma.d[k] == 0 && (plywa || w.water.d[k] <= 5);
        }

        /// <summary>Remake v2: czy to lud gracza — on chodzi po nowemu: najwyżej stopień w górę, wyżej kuje schody.</summary>
        public static bool ludRuch(Creature c) => REMAKE && c.race == 0 && c.straznik != true;

        /// <summary>Czy w tym kafelku da się wisieć — ściana z boku albo krawędź pod ręką.</summary>
        public static bool uchwyt(Sim sim, double x, double y)
        {
            var w = sim.world;
            return w.solid(x - 1, y) || w.solid(x + 1, y) || w.solid(x - 1, y + 1) || w.solid(x + 1, y + 1);
        }

        /// <summary>Czy tu się stoi: pod spodem lita skała albo woda, na której się unosi — albo na linie.</summary>
        public static bool stoi(Sim sim, double x, double y)
        {
            var w = sim.world;
            if (!w.inb(x, y + 1)) return true;
            var i = y * w.w + x;
            if (w.lina[i] == 1 || w.schody[i] == 1) return true;
            return w.solid(x, y + 1) || w.water[w.idx(x, y + 1)] >= 4;
        }

        /// <summary>Ile pustych kafli ziała pod (x, y), licząc do pierwszej podłogi (najwyżej limit+1).</summary>
        public static double glebiaPod(Sim sim, double x, double y, double limit)
        {
            var w = sim.world;
            double n = 0;
            for (var yy = y + 1; yy < w.h && n <= limit; yy++)
            {
                if (!w.passable(x, yy) || w.water[w.idx(x, yy)] >= 4) break;
                n++;
            }
            return n;
        }

        /// <summary>Remake v1: krok w przepaść — bez podłogi i ściany, a pod spodem pustka głębsza niż `LUD.spadekMaks`.</summary>
        public static bool przepasc(Sim sim, double x, double y) =>
            !stoi(sim, x, y) && !uchwyt(sim, x, y) && glebiaPod(sim, x, y, LUD.spadekMaks) > LUD.spadekMaks;

        /// <summary>Spadając stąd, wylądowałby w ogniu.</summary>
        public static bool nadOgniem(Sim sim, double x, double y)
        {
            var w = sim.world;
            for (var yy = y + 1; yy <= y + 16 && yy < w.h; yy++)
            {
                var j = w.idx(x, yy);
                if (w.magma[j] > 0) return true;
                if (PASSABLE[w.tile[j]] != 1 || w.water[j] >= 4) return false;
            }
            return false;
        }

        static readonly int[] BOKI = { -1, 1 };

        /// <summary>
        /// Najbliższy drogą kafel spełniający `cel`. Zwraca listę kafli do przejścia (pusta, gdy cel jest tu, gdzie stoi)
        /// albo null, gdy nie ma drogi w zasięgu lub skończył się budżet tiku.
        /// </summary>
        public static List<double>? szukajDrogi(Sim sim, Creature c, Func<double, double, double, bool> cel, double limit = 1400)
        {
            if (budzet <= 0) return null;
            budzet--;
            var w = sim.world;
            var W = (int)w.w;
            var H = (int)World.WORLD_H;
            var plywa = RACES[c.race].swims;
            // lud omija przepaści i w górę wchodzi tylko z podłogi, o jeden kafel (Remake v2)
            var ostrozny = ludRuch(c);
            double sx = Math.Floor(c.x), sy = Math.Floor(c.y);
            if (!w.inb(sx, sy)) return null;
            pokolenie++;
            if (pokolenie > 2_000_000_000) { Array.Clear(znak, 0, znak.Length); pokolenie = 1; }
            var start = (int)(sy * W + sx);
            int glowa = 0, ogon = 0;
            kolejka[ogon++] = start;
            znak[start] = pokolenie;
            skad[start] = -1;

            void dodaj(int j, int od)
            {
                if (znak[j] == pokolenie) return;
                znak[j] = pokolenie;
                skad[j] = od;
                kolejka[ogon++] = j;
            }

            while (glowa < ogon && ogon < limit)
            {
                var i = kolejka[glowa++];
                int x = i % W, y = i / W;
                if (cel(i, x, y))
                {
                    var droga = new List<double>();
                    for (var k = i; k != start; k = skad[k]) droga.Add(k);
                    droga.Reverse();
                    return droga;
                }
                var naPodlodze = stoi(sim, x, y);
                var wisi = !naPodlodze && uchwyt(sim, x, y);
                // z liny (i ze schodów drogi wiernych) — w dół, niżej po linie albo na podłogę pod nią
                if ((w.lina.d[i] == 1 || w.schody.d[i] == 1) && y + 1 < H && wolny(sim, i + W, plywa)) dodaj(i + W, i);
                // w dół: z wiszenia albo w locie
                if (!naPodlodze && y + 1 < H && wolny(sim, i + W, plywa) && !(ostrozny && wisi && przepasc(sim, x, y + 1))) dodaj(i + W, i);
                if (!naPodlodze && !wisi) continue;            // w locie nie ma innego wyboru
                // w górę: tylko tam, gdzie da się chwycić — lud tylko z podłogi, na stopień
                if (y > 0 && wolny(sim, i - W, plywa) && (ostrozny ? naPodlodze : uchwyt(sim, x, y - 1))) dodaj(i - W, i);
                // w bok
                foreach (var dx in BOKI)
                {
                    var nx = x + dx;
                    if (nx < 0 || nx >= W) continue;
                    var j = i + dx;
                    if (!wolny(sim, j, plywa)) continue;
                    var tamStoi = stoi(sim, nx, y);
                    // z wiszenia tylko na półkę; z podłogi wszędzie, byle nie nad ogień
                    if (wisi && !tamStoi) continue;
                    if (!tamStoi && nadOgniem(sim, nx, y)) continue;
                    if (ostrozny && przepasc(sim, nx, y)) continue;
                    dodaj(j, i);
                }
            }
            return null;
        }

        /// <summary>Na drodze do celu: następny kafel, -2 = doszedł, -1 = zgubił drogę. Sam ruch robi `krok`.</summary>
        public static double nastepnyKafel(Sim sim, Creature c)
        {
            var d = c.droga;
            if (d == null) return -1;
            var w = sim.world;
            var cur = w.idx(Math.Floor(c.x), Math.Floor(c.y));
            var i = c.drogaI ?? 0;
            // doszedł do któregoś z dalszych kafli (np. spadł kawałek) — przeskakuje
            var dalej = JS.IndexOf(d, cur, i);
            if (dalej >= 0) i = dalej + 1;
            c.drogaI = i;
            if (i >= d.Count) return -2;                  // na miejscu
            var next = d[(int)i];
            double nx = next % w.w, ny = JS.ToInt32(next / w.w);
            double cx = cur % w.w, cy = JS.ToInt32(cur / w.w);
            if (Math.Abs(nx - cx) + Math.Abs(ny - cy) != 1) return -1;
            if (!wolny(sim, next, RACES[c.race].swims)) return -1;
            return next;
        }

        // ------------------------------------------------------------------ droga z kopaniem (Remake v2)

        static readonly int[] odlK = new int[N];
        static readonly int[] skadK = new int[N];
        static readonly int[] znakK = new int[N];
        static int pokolenieK = 0;

        /// <summary>Czy kafel `j` leży na łańcuchu poprzedników `i` (najwyżej `ile` kroków wstecz, licząc z `i`).</summary>
        static bool naLancuchu(int i, int j, int ile)
        {
            for (int k = i, n = 0; k >= 0 && n < ile; k = skadK[k], n++) if (k == j) return true;
            return false;
        }

        /// <summary>Czy w tablicy kafli (woda, magma) jest choć jedna niezerowa wartość (liczone raz na szukanie).</summary>
        public static bool maCos(Uint8Array a)
        {
            var b = a.d;
            var s = MemoryMarshal.Cast<byte, ulong>(b.AsSpan());
            for (int i = 0; i < s.Length; i++) if (s[i] != 0) return true;
            for (int i = s.Length * 8; i < b.Length; i++) if (b[i] != 0) return true;
            return false;
        }

        /// <summary>
        /// Remake v2: droga, na której wolno kuć skałę (patrz komentarz w droga.ts). Zwraca kafle od startu (bez niego)
        /// do celu i start, z którego wyszła droga — albo null, gdy celu nie ma w zasięgu `limit` przejrzanych kafli.
        /// </summary>
        public static WynikKopania? szukajKopiac(Sim sim, IReadOnlyList<double> starty, Func<double, double, double, bool> cel, OpcjeKopania op)
        {
            var w = sim.world; var W = (int)w.w;
            var H = (int)World.WORLD_H;
            var koszt = op.koszt; var limit = op.limit; var plywa = op.plywa; var zBudzetu = op.zBudzetu; var dozwolony = op.dozwolony; var dwukierunkowa = op.dwukierunkowa;
            if (starty.Count == 0) return null;
            // szukanie z kopaniem jest droższe od zwykłego — liczy się za dwa z budżetu tiku
            if (zBudzetu) { if (budzet < 2) return null; budzet -= 2; }
            pokolenieK++;
            if (pokolenieK > 2_000_000_000) { Array.Clear(znakK, 0, znakK.Length); pokolenieK = 1; }
            var pk = pokolenieK;
            var tile = w.tile.d;
            var pass = PASSABLE.d;
            // bez magmy w świecie nikt nie stanie „nad ogniem”
            var ogien = maCos(w.magma);
            // kubełki kosztów (koszty są małymi liczbami całkowitymi)
            const int KUBLY = 32;
            var kubly = new List<int>[KUBLY];
            for (int q = 0; q < KUBLY; q++) kubly[q] = new List<int>();
            var zostalo = 0;
            void wstaw(int j, int d, int od)
            {
                if (znakK[j] == pk && d >= odlK[j]) return;
                znakK[j] = pk; odlK[j] = d; skadK[j] = od;
                kubly[d % KUBLY].Add(j); zostalo++;
            }
            foreach (var s in starty) wstaw((int)s, 0, -1);
            bool lity(int j) => pass[tile[j]] != 1;
            // pustka po drodze: wolny kafel albo lity, który ta droga przed chwilą wykuła
            bool kuty(int i, int j) => lity(j) && znakK[j] == pk && naLancuchu(i, j, 8);
            bool podloga(int i, int j)
            {
                // (w szybie drogi wiernych — zawsze: wykuty kafel szybu dostaje schody)
                if (w.schody.d[j] == 1 || (w.szybDrogi.x1 >= 0 && w.wSzybie(j % W, j / W))) return true;
                var b = j + W;
                if (b >= N) return true;
                if (w.water.d[b] >= 4) return true;
                return lity(b) && !kuty(i, b);
            }
            bool sciana(double x, double y) => w.solid(x - 1, y) || w.solid(x + 1, y) || w.solid(x - 1, y + 1) || w.solid(x + 1, y + 1);
            bool wDolWolno(int i, int j) => !dwukierunkowa || (skadK[i] != i - W && podloga(i, j));
            void wejdz(int i, int d, int j, int nx, int ny, bool mozeKuc)
            {
                if (j < 0 || j >= N || nx < 0 || nx >= W) return;
                if (dozwolony != null && !dozwolony(j, nx, ny)) return;
                if (lity(j) && !kuty(i, j))
                {
                    if (!mozeKuc) return;
                    var k = koszt(j, nx, ny);
                    if (k < 0) return;
                    // d + 1 + min(30, k): k to liczba całkowita (1 + round(...)), więc wynik też
                    wstaw(j, (int)(d + 1 + Math.Min(KUBLY - 2, k)), i);
                    return;
                }
                if (!wolny(sim, j, plywa) && !kuty(i, j)) return;
                wstaw(j, d + 1, i);
            }
            var obejrzane = 0;
            for (var d = 0; zostalo > 0; d++)
            {
                var kubel = kubly[d % KUBLY];
                while (kubel.Count > 0)
                {
                    var i = kubel[kubel.Count - 1]; kubel.RemoveAt(kubel.Count - 1);
                    zostalo--;
                    if (odlK[i] != d || znakK[i] != pk) continue;
                    int x = i % W, y = i / W;
                    if (cel(i, x, y))
                    {
                        var droga = new List<double>();
                        var k = i;
                        for (; skadK[k] != -1; k = skadK[k]) droga.Add(k);
                        droga.Reverse();
                        return new WynikKopania { droga = droga, start = k };
                    }
                    if (++obejrzane > limit) return null;
                    var stoiTu = podloga(i, i);
                    var wisiTu = !stoiTu && sciana(x, y);
                    // wszedł tu na stopień, prosto z podłogi pod spodem
                    var zeStopnia = skadK[i] == i + W;
                    if (!stoiTu)
                    {
                        // w locie albo na ścianie: w dół albo z wiszenia na półkę
                        if (y + 1 < H && (wolny(sim, i + W, plywa) || kuty(i, i + W)) && !(wisiTu && przepasc(sim, x, y + 1))
                            && wDolWolno(i, i + W) && (dozwolony == null || dozwolony(i + W, x, y + 1))) wstaw(i + W, d + 1, i);
                        if (wisiTu)
                        {
                            for (var dx = -1; dx <= 1; dx += 2)
                            {
                                var j = i + dx;
                                if (x + dx < 0 || x + dx >= W) continue;
                                if (podloga(i, j)) wejdz(i, d, j, x + dx, y, zeStopnia);
                            }
                        }
                        continue;
                    }
                    // z podłogi: w bok, na stopień w górę, kucie w dół
                    for (var dx = -1; dx <= 1; dx += 2)
                    {
                        var nx = x + dx;
                        if (nx < 0 || nx >= W) continue;
                        var j = i + dx;
                        if (!lity(j) || kuty(i, j))
                        {
                            if (!podloga(i, j) && (przepasc(sim, nx, y) || (ogien && nadOgniem(sim, nx, y)))) continue;
                        }
                        else if (!podloga(i, j) && glebiaPod(sim, nx, y, LUD.spadekMaks) > LUD.spadekMaks && !sciana(nx, y)) continue;
                        wejdz(i, d, j, nx, y, true);
                    }
                    if (y > 0) wejdz(i, d, i - W, x, y - 1, true);
                    // ze schodów drogi wiernych — w dół po nich
                    if (w.schody.d[i] == 1 && i + W < N && wolny(sim, i + W, plywa) && (dozwolony == null || dozwolony(i + W, x, y + 1))) wstaw(i + W, d + 1, i);
                    var bb = i + W;
                    if (bb < N && lity(bb) && !kuty(i, bb) && (bb + W >= N || !(glebiaPod(sim, x, y + 1, LUD.spadekMaks) > LUD.spadekMaks && !sciana(x, y + 1)))
                        && wDolWolno(i, bb)) wejdz(i, d, bb, x, y + 1, true);
                }
                if (d > N * 4) break;
            }
            return null;
        }

        /// <summary>Kafle `sciezka` planu drogi wiernych jako maska świata — liczona raz, przy pierwszym pytaniu.</summary>
        static readonly ConditionalWeakTable<PlanDrogi, byte[]> maskiDrogi = new ConditionalWeakTable<PlanDrogi, byte[]>();

        /// <summary>Alpha (jedno wiadro): kafel tuż pod złotą kreską drogi wiernych, który sam do niej nie należy — jej podłoga.</summary>
        public static bool podDroga(Sim sim, double i)
        {
            var p = sim.planDrogi;
            var WW = World.WORLD_W;
            if (p == null || i < WW) return false;
            // szyb drogi wiernych (25.10) kuje się cały — jego kafle nie są niczyją podłogą
            if (p.szyb != null && sim.world.wSzybie(i % WW, JS.ToInt32(i / WW))) return false;
            if (!maskiDrogi.TryGetValue(p, out var m))
            {
                m = new byte[N];
                foreach (var k in p.sciezka) { var kk = (int)k; if (kk == k && kk >= 0 && kk < N) m[kk] = 1; }
                maskiDrogi.Add(p, m);
            }
            int ii = (int)i;
            return m[ii - (int)WW] == 1 && m[ii] == 0;
        }

        /// <summary>Blok, na którym stoi wiadro z jedzeniem — indeks kafla albo -1, gdy już wolno go kuć (decyzja użytkownika, 25.10).</summary>
        public static double blokWiadra(Sim sim)
        {
            if (sim.wiadroOdblokowane || !SWIAT.warstwy.wlaczone) return -1;
            var w = sim.world;
            var x = w.szybWiadraX;
            var y = w.szybWiadraDol;
            if (!w.inb(x, y) || !w.passable(x, y)) return -1;
            while (y + 1 < w.h && w.passable(x, y + 1)) y++;
            return y + 1 < w.h ? w.idx(x, y + 1) : -1;
        }

        /// <summary>Koszt kucia dla ludu: ziemia tanio, skała drożej; nie przy ogniu, wodzie, rdzeniu ani w skorupie.</summary>
        public static KosztKucia kosztKuciaLudu(Sim sim, bool mozeDoRdzenia = false)
        {
            var w = sim.world;
            var wiadro = blokWiadra(sim);
            var magma = maCos(w.magma); var woda = maCos(w.water);
            return (i, x, y) =>
            {
                var t = w.tile[i];
                var tw = HARDNESS[t];
                if (tw <= 0 || t == T.CORE) return -1;
                if (podDroga(sim, i) || i == wiadro) return -1;
                if (magma && (sim.przyMagmie(x, y, 2) || nadOgniem(sim, x, y))) return -1;
                if (woda) for (var k = -1; k <= 1; k++) for (var j = -1; j <= 1; j++) if (w.inb(x + k, y + j) && w.water[w.idx(x + k, y + j)] > 2) return -1;
                if (!mozeDoRdzenia && JS.Hypot(x - w.coreX, y - w.coreY) < LUD.strefaRdzenia) return -1;
                return 1 + JS.Round(tw * 2);
            };
        }
    }
}
