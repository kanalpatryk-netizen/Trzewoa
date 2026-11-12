// Port: alpha-1/src/sim/sim.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Stworzenia;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Wydarzenia;
using static Trzewia.Symulacja.CechyNacji;
using static Trzewia.Symulacja.Brama;
using static Trzewia.Symulacja.Blogoslawienstwo;
using static Trzewia.Symulacja.BudowaSchodow;
using static Trzewia.Symulacja.Trupy;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Pomieszczenia;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.Oltarz;
using static Trzewia.Symulacja.Zabytki;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class Rezerwa { public double krew, wiara, otchlan; }

    /// <summary>
    /// v4 beta — statystyki partii na ekran końcowy i do osiągnięć. Remake v2: zgony ludu i z głodu, wspinaczki do wiadra,
    /// hełmy, Nakarm, odepchnięta dłoń, najwięcej weteranów i ludu naraz.
    /// </summary>
    public sealed class StatPartii
    {
        public double urodzen, kart, szczyt, walka, dlug, przysiega, proroctwo, lancuch, podsumowana;
        public double ludZgonow, zGlodu, wspinaczek, helmy, nakarm, odepchnieta, weteranowMax, ludMax;
        public double dewocjonalia, rytualow, wskrzeszen;
        /// <summary>Alpha, etap 4: sklejone liny wiadra i dary dłoni anielskiej.</summary>
        public double naprawLin, darow;
        /// <summary>Alpha, etap 5b: ile razy dłoń cisnęła rycerzem i zawaliła strop w walce z demonem.</summary>
        public double rzutow, zawalow;
    }

    public sealed class Skupisko { public double x, y, w, h; }

    public sealed partial class Sim
    {
        /// <summary>Ile Otchłani daje jeden zapomniany kafel. Wydanie jej zasklepia tyle samo.</summary>
        public static double OTCHLAN_PER_TILE => GORA.otchlanNaKafel;

        public World world;
        public Rng rng;
        public List<Creature> creatures = new List<Creature>();
        public JsMap<double, Creature> byId = new JsMap<double, Creature>();
        public List<Clan> clans = new List<Clan>();
        public JsMap<double, double> target = new JsMap<double, double>();
        public List<Particle> particles = new List<Particle>();
        /// <summary>Krótkie znaki po użyciu czasownika — żeby było widać, że coś się stało.</summary>
        public List<Efekt> efekty = new List<Efekt>();
        public List<ChronicleEntry> chronicle = new List<ChronicleEntry>();

        public double tick = 0;
        /// <summary>Numer następnego stworzenia — osobny dla każdej góry, żeby partia była powtarzalna.</summary>
        public double nextId = 1;
        public double dug = 0;
        public double wiara = GORA.startWiara;
        /// <summary>Remake v2: zawsze Koszmar — na start mniej krwi (GORA.koszmarKrew).</summary>
        public double krew = Math.Max(0, LUD.krewStart - GORA.koszmarKrew);
        /// <summary>Alpha, etap 3b: kruszce bez ekwipunku — wykuta ruda od razu podbija licznik (sim/kruszce.ts).</summary>
        public double zelazo = 0;
        public double zloto = 0;
        /// <summary>Świeży urobek: skąd leci okruch do licznika. Nie idzie do zapisu.</summary>
        public List<Urobek> urobek = new List<Urobek>();
        /// <summary>Alpha, etap 3c: plany i gotowe pomieszczenia (sim/pomieszczenia.ts).</summary>
        public List<Pomieszczenie> pomieszczenia = new List<Pomieszczenie>();
        public double nrPomieszczenia = 1;
        /// <summary>Części zbroi rycerza wykute w kuźni.</summary>
        public List<string> zbroja = new List<string>();
        /// <summary>Zdarzenia pomieszczeń dla rysunku. Nie idą do zapisu.</summary>
        public List<ZdarzeniePom> zdarzeniaPom = new List<ZdarzeniePom>();
        /// <summary>Alpha, etap 3d: zdarzenia rytuałów przy ołtarzu dla rysunku. Nie idą do zapisu.</summary>
        public List<ZdarzenieOltarza> zdarzeniaOltarza = new List<ZdarzenieOltarza>();
        /// <summary>Otchłań nie jest dochodem — jest miarą tego, o czym nikt nie pamięta.</summary>
        public double otchlan => world.unknown * OTCHLAN_PER_TILE;
        /// <summary>0 = czuwasz, 1 = zasnąłeś na zawsze</summary>
        public double sen = 0;
        /// <summary>Zasoby zarezerwowane przez rozkazy wydane w pauzie (nie idą do zapisu).</summary>
        public Rezerwa rezerwa = new Rezerwa();
        public double dominance = 0;
        public double domRace = -1;
        public string? ending = null;
        public double fungusTiles = 0;
        /// <summary>Na co umierają — do strojenia, nie do pokazywania graczowi.</summary>
        public JsMap<string, double> deaths = new JsMap<string, double>();
        public double meals = 0;
        public double foodMiss = 0;
        public double prayers = 0;
        public Int32Array popByRace = new Int32Array(RACE_COUNT);
        /// <summary>Twardy sufit gatunku — ostatnia zapora, nie główny mechanizm.</summary>
        public double[] raceCap = (double[])LUDY.sufitRasy.Clone();
        /// <summary>Pojemność środowiska dla każdej rasy.</summary>
        public Float32Array carrying = new Float32Array(RACE_COUNT);
        /// <summary>Zatłoczenie = populacja / pojemność.</summary>
        public Float32Array crowding = new Float32Array(RACE_COUNT);
        public double bonesTiles = 0;
        /// <summary>Wszystkie kuźnie w górze.</summary>
        public List<double> allForges = new List<double>();
        public List<List<string>> taints = new List<List<string>> { new List<string>(), new List<string>(), new List<string>(), new List<string>(), new List<string>(), new List<string>() };
        public double nextTide = PRZYPLYWY.pierwszy;
        public double lastSettlers = -9999;
        public double przybyszow = 0;
        /// <summary>W samouczku świat ma stać spokojnie — bez przypływów i wymierania nacji.</summary>
        public bool spokojnySwiat = false;
        /// <summary>Koszmar — Remake v2 ma tylko ten poziom.</summary>
        public bool koszmar = true;
        public StatPartii stat = new StatPartii();
        /// <summary>v4.1 beta — podsumowanie skończonej partii (osiągnięcia); nie trafia do zapisu.</summary>
        public object? podsumowanie;
        /// <summary>Ile jedzenia rośnie w suchej strefie przy przedsionku — liczone co sekundę gry.</summary>
        public double jedzeniePrzedsionka = 0;
        /// <summary>Ustawiane przy przekroczeniu progu senności.</summary>
        public bool senDzwon = false;
        /// <summary>Postęp kruszenia skorupy rdzenia.</summary>
        public StanRytualu rytual = new StanRytualu { postep = 0, klan = -1, wierni = 0, pekniecia = 0, otwarta = false, skorupa = 0 };
        /// <summary>Karty wydarzeń (patrz wydarzenia.ts).</summary>
        public StanWydarzen wydarzenia = nowyStanWydarzen();
        /// <summary>Remake v1: siedziba, obozy, wiadra, fale, mrok, dłoń.</summary>
        public StanLudu lud = nowyStanLudu();
        /// <summary>Plan drogi pielgrzymów — pamięć podręczna, nie stan gry.</summary>
        public PlanDrogi? planDrogi = null;
        /// <summary>Gracz kazał wykuć blok pod wiadrem — od tej chwili kolumnę pod szybem wiadra wolno kuć.</summary>
        public bool wiadroOdblokowane = false;
        public string lastTide = "";
        /// <summary>Tik ostatniego przypływu.</summary>
        public double tideTick = -1;

        List<Creature>[] hash;
        /// <summary>Komórki `hash`, w których po ostatnim przeliczeniu ktoś jest.</summary>
        readonly List<int> zajete = new List<int>();
        readonly int hashW, hashH;
        const double CELL = 8;

        public readonly double seed;

        public Sim(double seed)
        {
            this.seed = seed;
            resetRaces();
            world = new World(seed);
            rng = new Rng(JS.ToInt32(seed) ^ unchecked((int)0x9e3779b9));
            hashW = (int)Math.Ceiling(world.w / CELL);
            hashH = (int)Math.Ceiling(world.h / CELL);
            hash = new List<Creature>[hashW * hashH];
            for (int i = 0; i < hash.Length; i++) hash[i] = new List<Creature>();
            // Płyny z generatora najpierw spływają tam, gdzie mają leżeć.
            for (double t = 1; t <= SWIAT.splywaniePrzedZasiedleniem; t++) world.tickFluids(t);
            seedWorld();
            log("Budzisz się. Coś w tobie drąży.", "swiat");
        }

        // ------------------------------------------------------------ zasiedlenie

        (double x, double y) spot(double minD, double maxD)
        {
            var w = world;
            for (var tries = 0; tries < 4000; tries++)
            {
                var y = Math.Floor(World.SURFACE_Y + (w.h - World.SURFACE_Y) * (minD + rng.next() * (maxD - minD)));
                double x = 4 + rng.@int(w.w - 8);
                if (w.passable(x, y) && !w.passable(x, y + 1) && w.water[w.idx(x, y)] < 3 && !przyMagmie(x, y, 3)) return (x, y);
            }
            return (JS.ToInt32(w.w / 2), JS.ToInt32(w.h / 3));
        }

        void seedWorld()
        {
            var w = world;
            var Z = ZASIEDLENIE;
            // (hotSpot i found z TS — dawne zasiedlenie wielu ras — nieużywane w Remake; zostają tylko w TS jako punkt odniesienia)
            // Remake v1: jeden lud — pobożni, robotnicy i rycerze przy jednej siedzibie
            var (sx0, sy0) = SWIAT.warstwy.wlaczone ? (w.szybWiadraX, w.salaStart.y) : spot(Z.slepyLud1.od, Z.slepyLud1.@do);
            var (hx, hy) = SWIAT.warstwy.wlaczone ? (sx0, sy0) : miejsceNaObozu(this, sx0, sy0, 20, 12) ?? (sx0, sy0);
            var lud = newClan(Race.GOBLIN, hx, hy);
            lud.name = "Pobożni";
            lud.cecha = null;
            lud.stock = REMAKE ? 0 : LUD.jedzenieStart;     // Remake v2: bez spiżarni — jedzenie zjeżdża w wiadrach
            foreach (var rola in new[] { "pobozny", "robotnik", "rycerz" })
            {
                var ile = rola == "pobozny" ? LUD.start.pobozny : rola == "robotnik" ? LUD.start.robotnik : LUD.start.rycerz;
                for (var i = 0; i < ile; i++)
                {
                    // na podłodze przy siedzibie — postawieni obok niej spadali szybem i nie mieli jak wrócić
                    var (x, y) = podloga(this, hx + rng.@int(5) - 2, hy, 3) ?? (hx, hy);
                    var c = spawn(Race.GOBLIN, lud.id, x, y);
                    if (c != null) { nadajRole(this, c, rola); c.age = rng.@int(Math.Floor(RACES[Race.GOBLIN].lifespan * Z.dorosliDo)); }
                }
            }

            // to, co wiedzą od pokoleń: okolice własnych gniazd
            for (int ci = 0; ci < clans.Count; ci++)
            {
                var clan = clans[ci];
                world.observe(clan.hx, clan.hy, Z.wiedzaPromien, 0);
                for (var k = 0; k < Z.wiedzaPlam; k++)
                {
                    world.observe(
                        Math.Max(2, Math.Min(w.w - 3, clan.hx + rng.@int(31) - 15)),
                        Math.Max(2, Math.Min(w.h - 3, clan.hy + rng.@int(21) - 10)), Z.wiedzaPlamaPromien, 0);
                }
            }

            // pełna spiżarnia przy gniazdach
            nakarmSwiat(Z.spizarnia);

            // pierwsza grzybnia — tam, gdzie mokro (Remake v2: grzyba już nie ma)
            for (var k = 0; k < (REMAKE ? 0 : GORA.grzybniaStartProby); k++)
            {
                double x = 2 + rng.@int(w.w - 4), y = World.SURFACE_Y + rng.@int(w.h - World.SURFACE_Y - 4);
                var i = w.idx(x, y);
                var wet = w.water[i] > 0 || w.water[w.idx(x, Math.Min(w.h - 1, y + 1))] > 0;
                if (w.tile[i] != T.AIR || w.magma[i] > 0) continue;
                if (wet || (!w.passable(x, y + 1) && rng.chance(GORA.grzybniaStartSucho))) w.tile[i] = T.FUNGUS;
            }
        }

        public Clan newClan(int race, double hx, double hy)
        {
            var L = LUDY;
            var clan = new Clan
            {
                id = clans.Count, race = race, name = clanName(race, n => rng.@int(n)),
                hx = hx, hy = hy, pop = 0,
                cap = race == Race.GOBLIN ? L.limitNacji.slepyLud : race == Race.DWARF ? L.limitNacji.zuzlowcy : race == Race.SPINNER ? L.limitNacji.przadki : L.limitNacji.inni,
                devotion = race == Race.GOBLIN ? L.oddanieStart.slepyLud : race == Race.DWARF ? L.oddanieStart.zuzlowcy : L.oddanieStart.inni,
                stock = 0, grudge = new JsMap<double, double>(), founded = tick, dead = false, forges = new List<double>(), rytual = 0, pekniecia = 0,
            };
            clan.tint = rng.range(-L.odcien, L.odcien);
            clan.cecha = losujCeche(race, n => rng.@int(n));
            clans.Add(clan);
            if (world.passable(hx, hy)) world.set(hx, hy, T.NEST);
            return clan;
        }

        public Creature? spawn(int race, int clanId, double x, double y)
        {
            var w = world;
            x = Math.Max(1, Math.Min(w.w - 2, x)); y = Math.Max(1, Math.Min(w.h - 2, y));
            if (!w.passable(x, y)) w.set(x, y, T.AIR);
            var c = makeCreature(race, clanId, x + 0.5, y, nextId++);
            creatures.Add(c);
            byId.set(c.id, c);
            clans[clanId].pop++;
            return c;
        }

        // ---------------------------------------------------------------- pomocne

        public Creature? creatureById(double id) => byId.TryGet(id, out var c) ? c : null;

        /// <summary>Nacja o tym numerze albo null (jak `sim.clans[i]?.…` w TS).</summary>
        public Clan? klan(double i) => i >= 0 && i < clans.Count && i == Math.Floor(i) ? clans[(int)i] : null;

        /// <summary>Środek najgęstszego skupiska — kamera ma pokazywać cywilizację, nie geologię.</summary>
        public Skupisko? heartOfLife()
        {
            const double cell = 16;
            var gw = Math.Ceiling(world.w / cell);
            var buckets = new JsMap<double, double>();
            foreach (var c in creatures)
            {
                if (c.dead) continue;
                var k = JS.ToInt32(c.y / cell) * gw + JS.ToInt32(c.x / cell);
                buckets.set(k, (buckets.TryGet(k, out var b) ? b : 0) + 1);
            }
            double bestK = -1, bestN = 0;
            foreach (var kv in buckets) if (kv.Value > bestN) { bestN = kv.Value; bestK = kv.Key; }
            if (bestK < 0) return null;
            double bx = bestK % gw, by = JS.ToInt32(bestK / gw);

            // razem z sąsiednimi komórkami, inaczej kamera skacze, gdy kolonia stoi na granicy
            double n = 0, sx = 0, sy = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            foreach (var c in creatures)
            {
                if (c.dead) continue;
                double cx = JS.ToInt32(c.x / cell), cy = JS.ToInt32(c.y / cell);
                if (Math.Abs(cx - bx) > 1 || Math.Abs(cy - by) > 1) continue;
                n++; sx += c.x; sy += c.y;
                if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x;
                if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y;
            }
            if (n == 0) return null;
            return new Skupisko { x = sx / n, y = sy / n, w = Math.Max(6, x1 - x0), h = Math.Max(4, y1 - y0) };
        }

        void rehash()
        {
            // co tik: dawniej opróżniało wszystkie komórki siatki — teraz tylko zajęte
            foreach (var k in zajete) hash[k].Clear();
            zajete.Clear();
            foreach (var c in creatures)
            {
                var cx = Math.Min(hashW - 1, Math.Max(0, JS.ToInt32(c.x / CELL)));
                var cy = Math.Min(hashH - 1, Math.Max(0, JS.ToInt32(c.y / CELL)));
                var k = cy * hashW + cx;
                var komorka = hash[k];
                if (komorka.Count == 0) zajete.Add(k);
                komorka.Add(c);
            }
        }

        public Creature? nearestCreature(double x, double y, double r, Func<Creature, bool> pred)
        {
            var rc = (int)Math.Ceiling(r / CELL);
            int cx = JS.ToInt32(x / CELL), cy = JS.ToInt32(y / CELL);
            Creature? best = null; var bd = r * r;
            for (var gy = cy - rc; gy <= cy + rc; gy++)
            {
                if (gy < 0 || gy >= hashH) continue;
                for (var gx = cx - rc; gx <= cx + rc; gx++)
                {
                    if (gx < 0 || gx >= hashW) continue;
                    var kom = hash[gy * hashW + gx];
                    for (int i = 0; i < kom.Count; i++)
                    {
                        var o = kom[i];
                        if (o.dead || !pred(o)) continue;
                        var d = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y);
                        if (d < bd) { bd = d; best = o; }
                    }
                }
            }
            return best;
        }

        /// <summary>Spirala po kaflach — tanie zmysły zamiast wszechwiedzy.</summary>
        public (double x, double y)? findTile(double x, double y, double r, Func<double, double, double, bool> pred)
        {
            var w = world;
            double ox = Math.Floor(x), oy = Math.Floor(y);
            for (double ring = 1; ring <= r; ring++)
            {
                var step = ring > 12 ? 2 : 1;
                for (var dy = -ring; dy <= ring; dy += step)
                {
                    for (var dx = -ring; dx <= ring; dx += step)
                    {
                        if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != ring) continue;
                        double tx = ox + dx, ty = oy + dy;
                        if (!w.inb(tx, ty)) continue;
                        if (pred(w.tile[w.idx(tx, ty)], tx, ty)) return (tx, ty);
                    }
                }
            }
            return null;
        }

        /// <summary>Jedzenie, do którego da się dojść (patrz TS: najpierw na własnym poziomie albo niżej).</summary>
        public (double x, double y)? findFood(double x, double y, double r, bool plywa, Func<double, bool> pred)
        {
            var w = world;
            double ox = Math.Floor(x), oy = Math.Floor(y);
            bool sucho(double tx, double ty) => plywa || w.water[w.idx(tx, ty)] <= 5;
            if (w.inb(ox, oy) && pred(w.tile[w.idx(ox, oy)])) return (ox, oy);
            bool doSiegniecia(double tx, double ty)
            {
                if (!sucho(tx, ty)) return false;
                for (var sy = ty - 1; sy <= ty + 1; sy++)
                    for (var sx = tx - 1; sx <= tx + 1; sx++)
                        if (w.passable(sx, sy) && !w.passable(sx, sy + 1) && sucho(sx, sy)) return true;
                return false;
            }
            return findTile(x, y, r, (t, tx, ty) => ty >= oy - 1 && pred(t) && doSiegniecia(tx, ty))
                ?? findTile(x, y, r, (t, tx, ty) => pred(t) && doSiegniecia(tx, ty));
        }

        /// <summary>Najbliższy ogień: magma albo kuźnia. Dla Żużlowców to spiżarnia.</summary>
        public (double x, double y)? findHeat(double x, double y, double r)
        {
            var w = world;
            double ox = Math.Floor(x), oy = Math.Floor(y);
            for (double ring = 1; ring <= r; ring++)
            {
                var step = ring > 10 ? 2 : 1;
                for (var dy = -ring; dy <= ring; dy += step)
                {
                    for (var dx = -ring; dx <= ring; dx += step)
                    {
                        if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != ring) continue;
                        double tx = ox + dx, ty = oy + dy;
                        if (!w.inb(tx, ty)) continue;
                        var i = w.idx(tx, ty);
                        if (w.tile[i] == T.FORGE) return (tx, ty);
                        if (w.magma[i] > 0 && w.passable(tx, ty - 1)) return (tx, ty - 1);
                    }
                }
            }
            return null;
        }

        /// <summary>Rozejm na rozruch.</summary>
        public bool rozejm => tick < GORA.rozejmTikow;

        public bool hostile(Creature a, Creature b)
        {
            var L = LUDY;
            if (b.dead || b.id == a.id) return false;
            if (spokojnySwiat) return false;
            if (rozejm) return false;
            if (b.race == Race.HUMAN || a.race == Race.HUMAN) return b.race != a.race;
            if (a.clan == b.clan) return false;
            if (pokojMiedzy(a.clan, b.clan)) return false;
            if (a.race == b.race)
            {
                var g = clans[a.clan].grudge.TryGet(b.clan, out var gg) ? gg : 0;
                return g > L.urazaWojnaSwoich;       // swoi biją się dopiero, gdy jest o co
            }
            if (a.race == Race.TROLL) return a.hunger > L.trolAtakGlod || a.fear > L.trolAtakStrach;
            return (clans[a.clan].grudge.TryGet(b.clan, out var g2) ? g2 : 0) > 0
                || rng.chance(L.bojkaSzansa * Math.Min(1, clans[b.clan].pop / L.bojkaPelnaOd));
        }

        /// <summary>Rozejm między dwiema nacjami z karty „pierwsza krew”.</summary>
        public bool pokojMiedzy(double a, double b)
        {
            var p = wydarzenia.pokoj;
            if (p.size == 0) return false;
            return p.TryGet(paraNacji(a, b), out var t) && t > tick;
        }

        /// <summary>„Obudzi cię tylko cudza wojna”.</summary>
        public void wojnaBudzi(double a, double b)
        {
            if (a == b || sen <= 0) return;
            if (klan(a)?.zSzeptu != true && klan(b)?.zSzeptu != true) return;
            sen = Math.Max(0, sen - GORA.wojnaBudzi);
        }

        public void feud(int ca, int cb)
        {
            Clan A = clans[ca], B = clans[cb];
            A.grudge.set(cb, (A.grudge.TryGet(cb, out var a) ? a : 0) + LUDY.urazaNapastnik);
            B.grudge.set(ca, (B.grudge.TryGet(ca, out var b) ? b : 0) + LUDY.urazaOfiara);
        }

        // ------------------------------------------------------------- zdarzenia

        /// <summary>Miejsce dla najbliższego wpisu kroniki: `gdzie(x, y).log(...)`.</summary>
        (double, double)? pozWpisu = null;
        public Sim gdzie(double x, double y) { pozWpisu = (JS.Round(x), JS.Round(y)); return this; }

        /// <summary>Kronika nie jąka się: to samo zdarzenie w krótkim oknie zagęszcza poprzedni wpis.</summary>
        public void log(string text, string kind, string? key = null, Func<double, string>? agg = null)
        {
            var poz = pozWpisu; pozWpisu = null;
            zapisz(this, "swiat", text, poz?.Item1, poz?.Item2);
            var last = chronicle.Count > 0 ? chronicle[chronicle.Count - 1] : null;
            if (last != null && tick - last.tick < GORA.kronikaOkno)
            {
                if (!string.IsNullOrEmpty(key) && last.key == key)
                {
                    last.n = (last.n ?? 1) + 1;
                    last.text = agg != null ? agg(last.n.Value) : text;
                    last.tick = tick;
                    return;
                }
                if (last.text == text) { last.tick = tick; return; }
            }
            chronicle.Add(new ChronicleEntry { tick = tick, text = text, kind = kind, key = key, n = 1, x = poz?.Item1, y = poz?.Item2 });
            if (chronicle.Count > GORA.kronikaDlugosc) chronicle.RemoveAt(0);
        }

        /// <summary>Dodaje widoczny znak w świecie.</summary>
        public void efekt(double x, double y, string rodzaj, string? tekst = null)
        {
            var G = GORA;
            var max = rodzaj == "cud" || rodzaj == "skaza" ? G.efektCud : rodzaj == "mysl" ? G.efektMysl
                : rodzaj == "objawienie" ? G.efektObjawienie : rodzaj == "szept" ? G.efektSzept : rodzaj == "smierc" ? G.efektSmierc : G.efektInny;
            efekty.Add(new Efekt { x = x, y = y, rodzaj = rodzaj, t = 0, max = max, tekst = tekst });
            if (efekty.Count > G.efektowMax) efekty.RemoveAt(0);
        }

        public void spark(double x, double y, string kind)
        {
            var k = kind switch { "hit" => PK.BLOOD, "pray" => PK.PRAY, "spore" => PK.SPORE, "ember" => PK.EMBER, "dust" => PK.DUST, _ => PK.GLINT };
            var n = k == PK.BLOOD ? 6 : 2;
            for (var i = 0; i < n; i++)
            {
                if (particles.Count > GORA.czasteczekMax) break;
                var p = new Particle { x = x, y = y };
                p.vx = rng.range(-0.08, 0.08);
                p.vy = k == PK.EMBER || k == PK.PRAY || k == PK.SPORE ? rng.range(-0.09, -0.02) : rng.range(-0.06, 0.02);
                p.life = 1; p.max = k == PK.PRAY ? 40 : 30; p.kind = k;
                particles.Add(p);
            }
        }

        /// <summary>Ile ich na co ginie — do strojenia; gracz widzi tylko poziom krwi.</summary>
        public void kill(Creature c, string why, string tag = "inne")
        {
            if (c.dead) return;
            c.dead = true;
            zapisz(this, "zgon", $"{kto(this, c)} umiera: {why}", c.x, c.y);
            var klucz = tag + ":" + RACES[c.race].@short;
            deaths.set(klucz, (deaths.TryGet(klucz, out var ile) ? ile : 0) + 1);
            var d = RACES[c.race];
            krew += GORA.krewZaSmierc * d.size;
            fungusBudget += GORA.grzybniaZaSmierc * d.size;
            clans[c.clan].pop--;
            if (c.race == Race.GOBLIN && c.straznik != true)
            {
                stat.ludZgonow++;
                if (tag == "wycieńczenie") stat.zGlodu++;
            }
            double x = Math.Floor(c.x), y = Math.Floor(c.y);
            // Remake v2: ciało ludu zostaje na ziemi (sim/trupy.ts) — bez kości w kaflach
            if (REMAKE) zostawTrupa(this, c, tag);
            else if (world.passable(x, y) && world.get(x, y) == T.AIR) world.set(x, y, T.BONES);
            // Strażnik Snu jest z kamienia: rozsypuje się w pył, nie krwawi
            spark(c.x, c.y, c.straznik == true ? "dust" : "hit");
            efekt(c.x, c.y, c.straznik == true ? "zawal" : "smierc");
            if (c.prophet) gdzie(c.x, c.y).log($"Prorok {clans[c.clan].name} zginął {why}.", "krew");
            if (clans[c.clan].pop <= 0 && !clans[c.clan].dead && c.straznik != true)
            {
                clans[c.clan].dead = true;
                log($"{clans[c.clan].name} — wygaśli. Nikt ich nie opłakał.", "krew",
                    "wygasli", n => $"{JS.S(n)} nacje wygasły. Nikt ich nie opłakał.");
            }
        }

        /// <summary>Ktoś zobaczył kawałek ciebie, o którym nikt nie wiedział. Otchłani ubywa sama.</summary>
        public void onVisit(double _freshTiles) { /* liczone w spisie nieznanego */ }

        public void onCrystal(double x, double y) { spark(x + 0.5, y + 0.5, "glint"); }

        /// <summary>Wydanie Otchłani domalowuje część twojego nieznanego — nieodwracalnie.</summary>
        public bool spendOtchlan(double amount)
        {
            var tiles = JS.Round(amount / OTCHLAN_PER_TILE);
            if (world.unknown < tiles) return false;
            var done = world.seal(tiles, tick, rng);
            if (done > 0) log("Zasklepiłeś kawałek własnego nieznanego. Już go nie odzyskasz.", "otchlan");
            return true;
        }

        public void maddenCreature(Creature c)
        {
            var L = LUDY;
            var clan = clans[c.clan];
            // koniec drogi kogoś, kto kopał za głęboko: przestaje być sobą
            if (c.mad >= L.trolSzalenstwo && world.depth(c.y) > L.trolGlebokosc && c.race != Race.TROLL)
            {
                var was = RACES[c.race].dopelniacz;
                var home = clans.FirstOrDefault(k => !k.dead && k.race == Race.TROLL)
                    ?? newClan(Race.TROLL, Math.Floor(c.x), Math.Floor(c.y));
                clan.pop--; c.clan = home.id; home.pop++;
                c.race = Race.TROLL;
                c.hp = RACES[Race.TROLL].maxHp;
                c.age = 0; c.mad = 1; c.prophet = false; c.slave = false;
                gdzie(c.x, c.y).log($"Ktoś z {was} zszedł za głęboko i wrócił trolem.", "otchlan");
                return;
            }
            c.thought = Thought.DIG_DOWN;                        // co raz usłyszał głębię, ciągnie niżej
            if (rng.chance(L.sektaSzansa) && clan.pop > L.sektaMinNacja)
            {
                var nc = newClan(c.race, Math.Floor(c.x), Math.Floor(c.y));
                nc.devotion = clan.devotion * L.sektaOddanie;
                clan.pop--; c.clan = nc.id; nc.pop++;
                feud(nc.id, clan.id);
                log($"{(c.mad > 0.8 ? "Szaleniec" : "Odszczepieniec")} z {clan.name} założył {nc.name} na głębokości {JS.S(Math.Floor(c.y))}.", "otchlan");
            }
            else
            {
                c.thought = Thought.KILL_KIN;
            }
        }

        public void makeProphet(Creature c)
        {
            var L = LUDY;
            var old = clans[c.clan];
            var nc = newClan(c.race, Math.Floor(c.x), Math.Floor(c.y));
            nc.devotion = Math.Min(1, old.devotion + L.prorokOddanie);
            nc.tint = old.tint + L.prorokOdcien;
            nc.zSzeptu = true;
            c.prophet = true;
            old.pop--; c.clan = nc.id; nc.pop++;
            // kilku wiernych idzie za nim
            var taken = 0;
            for (int i = 0; i < creatures.Count; i++)
            {
                var o = creatures[i];
                if (taken >= L.prorokZabiera || o.dead || o.clan != old.id || o.race != c.race) continue;
                if (JS.Hypot(o.x - c.x, o.y - c.y) > L.prorokZasieg) continue;
                old.pop--; o.clan = nc.id; nc.pop++; taken++;
            }
            feud(nc.id, old.id);
            gdzie(nc.hx, nc.hy).log($"Szept stał się ciałem: {nc.name} odłączyli się od {old.name}.", "wiara");
        }

        public void enslave(Creature foe, int clanId)
        {
            var old = clans[foe.clan];
            if (old.id == clanId) return;
            old.pop--; foe.clan = clanId; clans[clanId].pop++;
            foe.fear = 1; foe.devotion *= LUDY.jarzmoOddanie; foe.slave = true;
            if (rng.chance(0.15)) gdzie(foe.x, foe.y).log($"{clans[clanId].name} wzięli kogoś z {RACES[foe.race].dopelniacz} w jarzmo.", "swiat");
        }

        public void pray(Creature c, double tile)
        {
            var G = GORA;
            var clan = clans[c.clan];
            var mult = tile == T.CORE ? G.modlitwaPrzyRdzeniu : tile == T.GLYPH ? G.modlitwaPrzyZnaku : 1;
            prayers++;
            var pob = cechaNacji(clan).wiara;
            wiara += RACES[c.race].faithGain * pob * clan.devotion * G.modlitwaWiara * mult * incomeMult()
                * (maZabytek(this, "ksiega") ? ZABYTKI.skutki.ksiega.wiara : 1);   // etap 3e: wzięta księga
            clan.devotion = Math.Min(1, clan.devotion
                + G.modlitwaOddanie * RACES[c.race].faithGain * pob * (1 - clan.devotion) / Math.Max(G.modlitwaNaGlowe, clan.pop));
            if (rng.chance(G.modlitwaIskra)) spark(c.x, c.y - 0.6, "pray");
        }

        public void sacrifice(Creature c)
        {
            var G = GORA;
            var victim = nearestCreature(c.x, c.y, G.ofiaraZasieg, o => o.clan == c.clan && o.age < G.ofiaraWiek && o.id != c.id);
            var clan = clans[c.clan];
            if (victim == null) { clan.devotion = Math.Max(0, clan.devotion - G.ofiaraBrakKara); return; }
            kill(victim, "na ołtarzu", "ofiara");
            wiara += G.ofiaraWiara * incomeMult();
            krew += G.ofiaraKrew;
            clan.devotion = Math.Min(1, clan.devotion + G.ofiaraOddanie);
            if (rng.chance(0.3)) gdzie(c.x, c.y).log($"{clan.name} złożyli ci w ofierze własne dziecko. Zrobili to chętnie.", "wiara",
                "ofiara", n => $"{clan.name} złożyli ci w ofierze {(n == 2 ? "dwoje" : n == 3 ? "troje" : JS.S(n))} własnych dzieci.");
        }

        public void birth(Creature c)
        {
            var clan = clans[c.clan];
            if (clan.pop >= clan.cap) return;
            var nowy = spawn(c.race, c.clan, Math.Floor(c.x), Math.Floor(c.y));
            if (nowy != null) stat.urodzen++;
            if (nowy != null) zapisz(this, "narodziny", $"rodzi się {kto(this, nowy)} — rodzic #{JS.S(c.id)}", c.x, c.y);
        }

        /// <summary>Szukanie miejsca pod budowę.</summary>
        public bool canBuild(Creature c)
        {
            var L = LUDY;
            var w = world;
            var clan = clans[c.clan];
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var need = c.race == Race.GOBLIN ? L.kosztOltarza : c.race == Race.DWARF ? L.kosztKuzni : 0;
            // Remake v2: ołtarz stawiają tylko pobożni, bez spiżarni — za darmo, ale najwyżej raz na `LUD.oltarzCo`
            if (REMAKE && c.race == Race.GOBLIN) { if (c.rola != "pobozny" || tick < (lud.oltarzPo ?? 0)) return false; }
            else if (clan.stock < need) return false;
            var R = L.budowaZasieg;
            (double, double)? best = null;
            double bestD = 1e9;

            for (var y = cy - R; y <= cy + R; y++)
            {
                for (var x = cx - R; x <= cx + R; x++)
                {
                    if (!w.inb(x, y) || w.tile[w.idx(x, y)] != T.AIR) continue;
                    if (w.water[w.idx(x, y)] > 2 || w.magma[w.idx(x, y)] > 0) continue;
                    if (!w.solid(x, y + 1)) continue;                 // musi mieć na czym stanąć
                    if (REMAKE && (JS.Hypot(x - w.coreX, y - w.coreY) < LUD.strefaRdzenia || w.prog[w.idx(x, y)] == 1)) continue;
                    // Alpha, etap 3d: nie w sali z ołtarzem
                    if (w.wSali(x, y)) continue;
                    if (c.race == Race.DWARF)
                    {
                        var hot = false;
                        for (var dy = -L.kuzniaOgien; dy <= L.kuzniaOgien && !hot; dy++)
                            for (var dx = -L.kuzniaOgien; dx <= L.kuzniaOgien && !hot; dx++)
                                if (w.inb(x + dx, y + dy) && w.magma[w.idx(x + dx, y + dy)] > 0) hot = true;
                        if (!hot) continue;                             // kuźnia bez ognia nie jest kuźnią
                    }
                    var d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
                    if (d < bestD) { bestD = d; best = (x, y); }
                }
            }
            if (best == null) return false;
            c.jx = best.Value.Item1; c.jy = best.Value.Item2;
            return true;
        }

        public bool buildStep(Creature c)
        {
            var L = LUDY;
            var w = world;
            if (w.get(c.jx, c.jy) != T.AIR) return false;
            if (Math.Abs(c.jx - Math.Floor(c.x)) > 1 || Math.Abs(c.jy - Math.Floor(c.y)) > 1) return true;   // jeszcze idzie
            // ołtarz i kuźnia są lite — postawione na kimś zamurowywały go żywcem
            if (creatures.Any(o => !o.dead && Math.Floor(o.x) == c.jx && Math.Floor(o.y) == c.jy)) return false;
            var clan = clans[c.clan];
            if (c.race == Race.GOBLIN && (REMAKE || clan.stock >= L.kosztOltarza))
            {
                if (REMAKE) lud.oltarzPo = tick + LUD.oltarzCo; else clan.stock -= L.kosztOltarza;
                w.set(c.jx, c.jy, T.SHRINE);
                clan.devotion = Math.Min(1, clan.devotion + L.oltarzOddanie);
                if (rng.chance(0.4)) gdzie(c.jx, c.jy).log($"{clan.name} postawili ci kapliczkę.", "wiara",
                    "oltarz", n => $"{clan.name} postawili ci {JS.S(n)} kapliczki.");
            }
            else if (c.race == Race.DWARF && clan.stock >= L.kosztKuzni)
            {
                clan.stock -= L.kosztKuzni; w.set(c.jx, c.jy, T.FORGE);
                clan.forges.Add(w.idx(c.jx, c.jy));
                allForges.Add(w.idx(c.jx, c.jy));
                wiara += L.kuzniaWiara * incomeMult();
                if (rng.chance(0.6)) gdzie(c.jx, c.jy).log($"{clan.name} rozpalili kuźnię — czczą cię pracą.", "wiara");
            }
            else if (c.race == Race.SPINNER)
            {
                w.set(c.jx, c.jy, T.WEB);
            }
            return false;
        }

        public void reachCore(Creature c)
        {
            if (ending != null) return;
            // etap 3: dopóki trwa fala Strażników Snu (z bossem włącznie), rdzeń jest dla nikogo nie do dotknięcia
            if (falaTrwa(this)) return;
            var clan = clans[c.clan];
            if (clan.devotion > RYTUAL.uwolnienieNacja || c.devotion > RYTUAL.uwolnienieWlasne)
            {
                ending = $"uwolnienie:{clan.name}";
                gdzie(world.coreX, world.coreY).log($"{clan.name} dokopali się do twojego rdzenia i padli na twarz. Jesteś wolny.", "koniec");
            }
            else
            {
                ending = $"smierc:{clan.name}";
                gdzie(world.coreX, world.coreY).log($"{clan.name} dokopali się do twojego rdzenia. Nie modlili się.", "koniec");
            }
        }

        // --------------------------------------------------------------- ekonomia

        /// <summary>Monokultura to śmierć: zwycięzcy przestają się bać i przestają cię potrzebować.</summary>
        public double incomeMult()
        {
            var G = GORA;
            if (dominance <= G.dochodOdDominacji) return 1;
            return Math.Max(G.dochodMin, 1 - (dominance - G.dochodOdDominacji) / G.dochodZakres);
        }

        void capacities()
        {
            var L = LUDY;
            var food = fungusTiles + bonesTiles * 2;
            var P = L.pojemnosc;
            carrying[Race.GOBLIN] = P.slepyLud + food * P.slepyLudNaJedzenie;
            double forges = 0;
            foreach (var c in clans) if (!c.dead && c.race == Race.DWARF) forges += c.forges.Count;
            carrying[Race.DWARF] = P.zuzlowcy + forges * P.zuzlowcyNaKuznie;
            var prey = popByRace[Race.GOBLIN] + popByRace[Race.DWARF];
            carrying[Race.SPINNER] = P.przadki + prey * P.przadkiNaOfiare;
            carrying[Race.TROLL] = P.trole + popByRace[Race.MYCELIUM] * P.troleNaGrzybnie;
            carrying[Race.HUMAN] = 9999;
            carrying[Race.MYCELIUM] = 9999;
            double razem = 0;
            for (var r = 0; r < RACE_COUNT; r++) if (r != Race.MYCELIUM) razem += popByRace[r];
            for (var r = 0; r < RACE_COUNT; r++)
            {
                var cap = Math.Min(carrying[r], raceCap[r]);
                var udzial = razem > 0 ? popByRace[r] / razem : 0;
                var ciasno = 1 + Math.Max(0, udzial - L.ciasnotaOdUdzialu) * L.ciasnotaSila;
                crowding[r] = cap > 0 ? (popByRace[r] / cap) * ciasno : 0;
            }
        }

        void census()
        {
            var G = GORA;
            popByRace.fill(0);
            foreach (var c in creatures) if (!c.dead && c.race != Race.HUMAN) popByRace[c.race] = popByRace[c.race] + 1;
            popByRace[Race.MYCELIUM] = Math.Floor(fungusTiles / G.grzybniaNaGlowe);
            double total = 0, max = 0, mr = -1;
            for (var r = 0; r < RACE_COUNT; r++)
            {
                if (r == Race.MYCELIUM) continue;
                total += popByRace[r];
                if (popByRace[r] > max) { max = popByRace[r]; mr = r; }
            }
            dominance = total > 0 ? max / total : 1;
            if (total > stat.szczyt) stat.szczyt = total;
            domRace = mr;
            capacities();
            var senPrzed = sen;
            var nadmiar = Math.Max(0, dominance - G.senOdDominacji) / G.senZakresDominacji;
            var pustka = total < G.senPustkaPonizej ? 1 - total / G.senPustkaPonizej : 0;
            var warta = rytual.wierni >= RYTUAL.potrzebaWiernych && !rytual.otwarta ? 0 : 1;
            // Remake v1: sen nie jest już przegraną — przegrywasz, gdy nie da się wygrać (sim/lud.ts)
            var rosnie = 0 * (G.senOdMonokultury * nadmiar * warta + G.senOdPustki * pustka);
            sen = Math.Max(0, Math.Min(1, sen + (rosnie > 0 ? rosnie : -G.senCofaSie)));
            foreach (var prog in G.senProgi)
            {
                if (senPrzed < prog && sen >= prog)
                {
                    log(prog < 0.4 ? "Robi ci się ciepło i cicho. Tak zaczyna się sen."
                        : prog < 0.7 ? "Powieka opada. Jeszcze chwila jednej krwi i zaśniesz."
                        : "Ledwo widzisz własne korytarze. Obudzi cię tylko cudza wojna.", "otchlan", $"sen{JS.S(prog)}");
                    senDzwon = true;
                }
            }
            if (sen >= 1 && ending == null)
            {
                ending = "sen";
                log("Nikt się już ciebie nie boi. Zasypiasz.", "koniec");
            }
        }

        // ------------------------------------------------------------- grzybnia

        readonly List<double> fungusList = new List<double>();
        /// <summary>Grzybnia rośnie wyłącznie ze zwłok: każda śmierć to paliwo na kilka kafli.</summary>
        public double fungusBudget = GORA.grzybniaStart;

        void tickMycelium()
        {
            var G = GORA;
            var w = world;
            if (tick % G.grzybniaSpisCo == 0)
            {
                fungusList.Clear();
                double bones = 0;
                for (var i = 0; i < w.tile.length; i++)
                {
                    if (w.tile[i] == T.FUNGUS) fungusList.Add(i);
                    else if (w.tile[i] == T.BONES) bones++;
                }
                fungusTiles = fungusList.Count;
                bonesTiles = bones;
            }
            var list = fungusList;
            if (list.Count == 0) return;
            var tries = Math.Max(G.grzybniaProbyMin, Math.Min(G.grzybniaProbyMax, Math.Ceiling(list.Count * G.grzybniaProby)));
            for (var k = 0; k < tries; k++)
            {
                var i = list[rng.@int(list.Count)];
                if (w.tile[i] != T.FUNGUS) continue;
                double x = i % w.w, y = JS.ToInt32(i / w.w);
                var dirs = new[] { (1.0, 0.0), (-1.0, 0.0), (0.0, 1.0), (0.0, -1.0) };
                var (dx, dy) = dirs[rng.@int(4)];
                if (!w.inb(x + dx, y + dy)) continue;
                var j = w.idx(x + dx, y + dy);
                var t = w.tile[j];
                if (w.magma[j] > 0) continue;
                var wet = w.water[j] > 0 || w.water[i] > 0;
                if (fungusBudget <= 0) break;
                var fromCorpse = t == T.BONES;
                if (fromCorpse || (t == T.AIR && wet && rng.chance(G.grzybniaMokro)) || (t == T.AIR && rng.chance(G.grzybniaSucho)))
                {
                    w.tile[j] = T.FUNGUS;
                    list.Add(j);
                    fungusTiles++;
                    fungusBudget -= fromCorpse ? G.grzybniaKosztKosci : G.grzybniaKoszt;
                }
                if (rng.chance(0.015)) spark(x + 0.5, y + 0.5, "spore");
            }
        }

        // ---------------------------------------------------------------- przypływ

        void tides()
        {
            var PP = PRZYPLYWY;
            if (spokojnySwiat) return;
            double alive = 0;
            foreach (var c in creatures) alive += c.dead ? 0 : 1;
            // Remake v1: nikt obcy nie schodzi w pustą górę
            if (!REMAKE && alive < PP.pustkaPonizej && tick > lastSettlers + PP.osadnicyOdstep && przybyszow < PP.maxPrzybyszow && ending == null)
            {
                settlers();
                var nowy = clans.Count > 0 ? clans[clans.Count - 1] : null;
                if (nowy != null && !nowy.dead) kartaPlemienia(this, nowy);
                return;
            }
            // WERSJA ANDROID: powodzie, zarazy i żyły szaleństwa przychodzą jako karty wydarzeń z wyborem
        }

        /// <summary>Nowe plemię schodzi w pustą górę. To nie litość — to głód, który cię karmi.</summary>
        public void settlers()
        {
            var PP = PRZYPLYWY;
            var w = world;
            lastSettlers = tick;
            var ofiar = popByRace[Race.GOBLIN] + popByRace[Race.DWARF];
            var kandydaci = ofiar >= PP.przadkiOfiar ? new[] { Race.GOBLIN, Race.DWARF, Race.SPINNER } : new[] { Race.GOBLIN, Race.DWARF };
            int race = Race.GOBLIN; var najmniej = double.PositiveInfinity;
            foreach (var r in kandydaci)
            {
                var ilu = popByRace[r] + (r == Race.GOBLIN ? PP.slepyLudPremia : 0);   // Ślepy Lud i tak się rodzi
                if (ilu < najmniej) { najmniej = ilu; race = r; }
            }
            double x = 10 + rng.@int(w.w - 20), y = World.SURFACE_Y + 2;
            var miejsce = race == Race.DWARF
                ? miejsceWCieple(0.3, 0.7) ?? miejscePrzyJedzeniu()
                : miejscePrzyJedzeniu();
            if (miejsce != null) { x = miejsce.Value.x; y = miejsce.Value.y; }
            else for (var k = 0; k < 60; k++)
            {
                double xx = 10 + rng.@int(w.w - 20);
                for (var yy = World.SURFACE_Y; yy < w.h * 0.3; yy++)
                {
                    if (w.passable(xx, yy) && !w.passable(xx, yy + 1)) { x = xx; y = yy; k = 60; break; }
                }
            }
            var clan = newClan(race, x, y);
            clan.devotion = PP.osadnicyOddanie + rng.next() * PP.osadnicyOddanieRozrzut;
            var n = (race == Race.GOBLIN ? PP.osadnicySlepyLud : PP.osadnicyInni) + rng.@int(PP.osadnicyRozrzut);
            for (var i = 0; i < n; i++)
            {
                var c = spawn(race, clan.id, x + rng.@int(5) - 2, y);
                if (c != null) c.age = rng.@int(PP.osadnicyWiek);
            }
            if (race == Race.DWARF) clan.stock = PP.zuzlowcyRuda;
            zapasy(clan, PP.osadnicySpizarnia);
            clan.founded = tick;
            przybyszow++;
            lastTide = "nowe plemię"; tideTick = tick;
            gdzie(clan.hx, clan.hy).log($"{clan.name} zeszli w pustą górę. Nie wiedzą, co ich tu ściągnęło.", "swiat");
        }

        /// <summary>Obcy lud: garstka wymarłej rasy wychodzi ze szczelin w głębi. Zwraca false, gdy nie ma kogo ani gdzie wypuścić.</summary>
        public bool obcyLud()
        {
            var PP = PRZYPLYWY;
            var w = world;
            var ofiar = popByRace[Race.GOBLIN] + popByRace[Race.DWARF];
            var chetni = new[] { Race.DWARF, Race.SPINNER, Race.GOBLIN }
                .Where(r => r != domRace && popByRace[r] <= 2 && (r != Race.SPINNER || ofiar >= PP.przadkiOfiar)).ToList();
            if (chetni.Count == 0) return false;
            var race = chetni[rng.@int(chetni.Count)];

            double x = -1, y = -1;
            var cieplo = race == Race.DWARF ? miejsceWCieple(0.45, 0.7) : null;   // poniżej 0,72 zaczyna się obłęd
            if (cieplo != null) { x = cieplo.Value.x; y = cieplo.Value.y; }
            for (var k = 0; k < 400 && x < 0; k++)
            {
                double xx = 6 + rng.@int(w.w - 12);
                var yy = Math.Floor(w.h * 0.45) + rng.@int(Math.Floor(w.h * 0.32));
                if (!w.passable(xx, yy) || w.passable(xx, yy + 1)) continue;
                if (w.water[w.idx(xx, yy)] > 2 || w.magma[w.idx(xx, yy)] > 0) continue;
                x = xx; y = yy; break;
            }
            if (x < 0)
            {                                  // nie ma pustki — wygryzamy im komorę
                x = 6 + rng.@int(w.w - 12);
                y = Math.Floor(w.h * 0.55) + rng.@int(Math.Floor(w.h * 0.2));
                for (var dy = -2; dy <= 1; dy++)
                {
                    for (var dx = -3; dx <= 3; dx++)
                    {
                        if (!w.inb(x + dx, y + dy)) continue;
                        var i = w.idx(x + dx, y + dy);
                        if (w.tile[i] == T.ROCK || w.tile[i] == T.SOIL || w.tile[i] == T.ORE) w.tile[i] = T.AIR;
                    }
                }
            }

            var clan = newClan(race, x, y);
            clan.devotion = PP.obcyOddanie + rng.next() * PP.obcyOddanieRozrzut;
            var n = PP.obcyIlu + rng.@int(PP.obcyRozrzut);
            for (var i = 0; i < n; i++)
            {
                var c = spawn(race, clan.id, x + rng.@int(5) - 2, y);
                if (c != null) c.age = rng.@int(PP.obcyWiek);
            }
            zapasy(clan, PP.obcySpizarnia);
            lastTide = "obcy lud"; tideTick = tick;
            lastSettlers = tick;
            przybyszow++;
            gdzie(clan.hx, clan.hy).log($"Ze szczelin w głębi wyszli {clan.name}. Nikt ich nie wołał.", "swiat");
            return true;
        }

        (double x, double y)? miejscePrzyJedzeniu()
        {
            var w = world;
            for (var k = 0; k < 500; k++)
            {
                double x = 6 + rng.@int(w.w - 12);
                var y = World.SURFACE_Y + 2 + rng.@int(Math.Floor(w.h * 0.55));
                if (!w.passable(x, y) || w.passable(x, y + 1)) continue;
                if (w.water[w.idx(x, y)] > 2 || w.magma[w.idx(x, y)] > 0) continue;
                if (findFood(x, y, 8, false, t => t == T.FUNGUS || t == T.BONES) != null) return (x, y);
            }
            return null;
        }

        (double x, double y)? miejsceWCieple(double minD, double maxD)
        {
            var w = world;
            for (var k = 0; k < 3000; k++)
            {
                double x = 4 + rng.@int(w.w - 8);
                var y = Math.Floor(World.SURFACE_Y + (w.h - World.SURFACE_Y) * (minD + rng.next() * (maxD - minD)));
                if (!w.passable(x, y) || w.passable(x, y + 1)) continue;
                if (w.water[w.idx(x, y)] > 2 || przyMagmie(x, y, 2)) continue;
                if (findHeat(x, y, 9) != null) return (x, y);
            }
            return null;
        }

        /// <summary>Czy tu grzeje: kuźnia w zasięgu ośmiu kafli albo magma tuż obok.</summary>
        public bool goraco(double x, double y)
        {
            var w = world;
            foreach (var f in allForges)
            {
                if (Math.Abs((f % w.w) - x) <= 8 && Math.Abs(JS.ToInt32(f / w.w) - y) <= 8) return true;
            }
            return przyMagmie(x, y, 2);
        }

        /// <summary>Czy w promieniu r od kafla płynie magma.</summary>
        public bool przyMagmie(double x, double y, double r = 1)
        {
            var w = world;
            for (var dy = -r; dy <= r; dy++)
                for (var dx = -r; dx <= r; dx++)
                    if (w.inb(x + dx, y + dy) && w.magma[w.idx(x + dx, y + dy)] > 0) return true;
            return false;
        }

        /// <summary>Zaopatruje okolice gniazd w to, co dana krew je.</summary>
        public void nakarmSwiat(double? ile = null)
        {
            var Z = ZASIEDLENIE;
            var ileJ = ile ?? Z.nakarmJedzenie;
            // Remake v2: zamiast grzyba przy gniazdach — wiadro z jedzeniem od razu
            if (REMAKE)
            {
                if (creatures.Count > 0) wiadroTeraz(this);
                foreach (var c in creatures) if (!c.dead) c.hunger = Math.Min(c.hunger, Z.nakarmGlod);
                return;
            }
            foreach (var klan in clans) if (!klan.dead) zapasy(klan, ileJ);
            fungusBudget += Z.nakarmGrzybnia;
            foreach (var c in creatures) if (!c.dead) c.hunger = Math.Min(c.hunger, Z.nakarmGlod);
        }

        /// <summary>Spiżarnia przy gnieździe — z tego, co dana krew je.</summary>
        public void zapasy(Clan klan, double ile)
        {
            if (klan.race == Race.DWARF || klan.race == Race.HUMAN) return;
            // Remake v2: jedzenie z kart i wydarzeń zjeżdża wiadrem (porcja na dwa dawne grzyby)
            if (REMAKE) { wiadroTeraz(this, Math.Max(4, JS.Round(ile / 2))); return; }
            var w = world;
            var kafel = klan.race == Race.GOBLIN ? T.FUNGUS : T.BONES;
            double poszlo = 0;
            for (var k = 0; k < 600 && poszlo < ile; k++)
            {
                var x = klan.hx + rng.@int(19) - 9;
                var y = klan.hy + rng.@int(13) - 6;
                if (!w.inb(x, y)) continue;
                var i = w.idx(x, y);
                if (w.tile[i] != T.AIR || w.water[i] > 0) continue;
                if (w.passable(x, y + 1)) continue;
                w.set(x, y, kafel);
                poszlo++;
            }
        }

        /// <summary>Odsuwa całą nację od podanego punktu.</summary>
        public void odsunKlany(int race, double odX, double odY, double minimum = 45)
        {
            var w = world;
            foreach (var klan in clans)
            {
                if (klan.dead || klan.race != race) continue;
                if (JS.Hypot(klan.hx - odX, klan.hy - odY) >= minimum) continue;
                (double, double)? cel = null;
                for (var k = 0; k < 900 && cel == null; k++)
                {
                    double x = 6 + rng.@int(w.w - 12);
                    var y = World.SURFACE_Y + 4 + rng.@int(Math.Floor(w.h * 0.5));
                    if (JS.Hypot(x - odX, y - odY) < minimum) continue;
                    if (!w.passable(x, y) || w.passable(x, y + 1)) continue;
                    if (w.water[w.idx(x, y)] > 0 || w.magma[w.idx(x, y)] > 0) continue;
                    cel = (x, y);
                }
                if (cel == null) continue;
                var (cx, cy) = cel.Value;
                klan.hx = cx; klan.hy = cy;
                if (w.passable(klan.hx, klan.hy)) w.set(klan.hx, klan.hy, T.NEST);
                foreach (var c in creatures)
                {
                    if (c.dead || c.clan != klan.id) continue;
                    c.x = cx + rng.range(-2, 2);
                    c.y = cy;
                    c.job = 0; c.jt = 0;
                }
            }
        }

        /// <summary>Powódź; `nadX` — woda płynie nad tym miejscem.</summary>
        public void flood(double? nadX = null)
        {
            var PP = PRZYPLYWY;
            var w = world;
            var swiezi = clans.Where(k => !k.dead && tick - k.founded < PP.swiezeTikow).ToList();
            var x = nadX ?? 6 + rng.@int(w.w - 12);
            for (var k = 0; nadX == null && k < 24 && swiezi.Any(s => Math.Abs(s.hx - x) < PP.powodzOdstep); k++) x = 6 + rng.@int(w.w - 12);
            for (var k = 0; k < PP.powodzProby; k++)
            {
                var xx = Math.Max(1, Math.Min(w.w - 2, x + rng.@int(9) - 4));
                var yy = World.SURFACE_Y + rng.@int(PP.powodzGlebokosc);
                var i = w.idx(xx, yy);
                if (PASSABLE[w.tile[i]] == 1) w.water[i] = 8;
            }
            lastTide = "zalanie"; tideTick = tick;
            log("Woda znalazła szczelinę. Zalewa górne korytarze.", "swiat");
        }

        public void plague()
        {
            var PP = PRZYPLYWY;
            var hit = 0;
            foreach (var c in creatures)
            {
                if (c.dead) continue;
                if (tick - clans[c.clan].founded < PP.swiezeTikow) continue;
                var celowana = c.race == domRace;
                if (rng.chance(celowana ? PP.zarazaOmijaCel : PP.zarazaOmija)) continue;
                c.hp -= RACES[c.race].maxHp * (celowana ? PP.zarazaCel : PP.zaraza); c.fear = 1; hit++;
            }
            lastTide = "zaraza"; tideTick = tick;
            if (hit > 0) log($"Zaraza przeszła przez twoje trzewia. Zachorowało {hit}.", "krew");
        }

        public void madVein()
        {
            var PP = PRZYPLYWY;
            var w = world;
            double x = 6 + rng.@int(w.w - 12);
            var y = Math.Floor(w.h * (PP.zylaOd + rng.next() * PP.zylaRozrzut));
            for (var k = 0; k < PP.zylaProby; k++)
            {
                var xx = Math.Max(1, Math.Min(w.w - 2, x + rng.@int(11) - 5));
                var yy = Math.Max(1, Math.Min(w.h - 2, y + rng.@int(11) - 5));
                var i = w.idx(xx, yy);
                if (w.suchaStrefa(xx, yy)) continue;
                if (w.tile[i] == T.ROCK) w.tile[i] = T.CRYSTAL;
            }
            lastTide = "żyła szaleństwa"; tideTick = tick;
            log("Żyła szaleństwa otworzyła się w głębi. Kto tam kopie, wraca inny.", "otchlan");
        }

        void forgeAndThread()
        {
            var L = LUDY;
            foreach (var clan in clans.ToList())
            {
                if (clan.dead) continue;
                var odstep = Math.Max(L.wykuciMinOdstep, L.wykuciOdstep / Math.Max(1, clan.forges.Count) / cechaNacji(clan).rozrod);
                if (clan.race == Race.DWARF && clan.stock >= L.wykuciKoszt && clan.forges.Count > 0
                    && tick - (clan.kuto ?? -1e9) >= odstep
                    && crowding[Race.DWARF] < L.wykuciTlok && clan.pop < clan.cap)
                {
                    var f = clan.forges[rng.@int(clan.forges.Count)];
                    if (world.tile[f] != T.FORGE) { clan.forges = clan.forges.Where(i => i != f).ToList(); continue; }
                    clan.stock -= L.wykuciKoszt;
                    clan.kuto = tick;
                    double fx = f % world.w, fy = JS.ToInt32(f / world.w);
                    var born = spawn(Race.DWARF, clan.id, fx, fy - 1);
                    if (born != null) born.age = L.wykuciWiek;
                    if (rng.chance(0.5)) log($"{clan.name} wykuli nowego w ogniu. Ruda zamiast dziecka.", "swiat");
                }
                if (clan.race == Race.SPINNER && crowding[Race.SPINNER] < L.przerabianieTlok)
                {
                    var slave = creatures.FirstOrDefault(o => !o.dead && o.clan == clan.id && o.slave && o.race != Race.SPINNER);
                    if (slave != null && rng.chance(L.przerabianieSzansa * cechaNacji(clan).rozrod))
                    {
                        var was = RACES[slave.race].dopelniacz;
                        slave.race = Race.SPINNER;
                        slave.slave = false;
                        slave.hp = RACES[Race.SPINNER].maxHp;
                        slave.age = L.przerabianieWiek;
                        if (rng.chance(0.4)) gdzie(slave.x, slave.y).log($"{clan.name} przerobiły kogoś z {was} na swoje. Nikt nie pytał o zgodę.", "krew");
                    }
                }
            }
        }

        void stygnie()
        {
            var L = LUDY;
            foreach (var clan in clans)
            {
                if (clan.dead) continue;
                var natura = clan.race == Race.GOBLIN ? L.oddanieNatura.slepyLud : clan.race == Race.DWARF ? L.oddanieNatura.zuzlowcy : L.oddanieNatura.inni;
                clan.devotion += (natura - clan.devotion) * L.stygniecie;
                foreach (var kv in clan.grudge)
                {
                    if (kv.Value <= L.urazyWygasaja) clan.grudge.delete(kv.Key);
                    else clan.grudge.set(kv.Key, kv.Value - L.urazyWygasaja);
                }
            }
        }

        void schism()
        {
            var L = LUDY;
            var zywych = 0;
            foreach (var k in clans) if (!k.dead) zywych++;
            for (int ci = 0; ci < clans.Count; ci++)   // for…of: nowe nacje dopisane w trakcie też są przeglądane
            {
                var clan = clans[ci];
                if (clan.dead || clan.pop < clan.cap * L.rozlamOdLimitu || zywych > L.rozlamMaxNacji) continue;
                if (!rng.chance(L.rozlamSzansa)) continue;
                bool wWarcie(Creature c) => c.job == Job.PIELGRZYM
                    || (Math.Abs(c.x - world.coreX) < L.rozlamWarta && Math.Abs(c.y - world.coreY) < L.rozlamWarta);
                Creature? far = null; var fd = L.rozlamOdleglosc;
                foreach (var c in creatures)
                {
                    if (c.dead || c.clan != clan.id || wWarcie(c)) continue;
                    var d = JS.Hypot(c.x - clan.hx, c.y - clan.hy);
                    if (d > fd) { fd = d; far = c; }
                }
                if (far == null) continue;
                var nc = newClan(clan.race, Math.Floor(far.x), Math.Floor(far.y));
                zywych++;
                nc.devotion = Math.Min(1, clan.devotion * rng.range(L.rozlamOddanieOd, L.rozlamOddanieDo));
                clan.pop--; far.clan = nc.id; nc.pop++;
                var taken = 0;
                foreach (var o in creatures)
                {
                    if (taken >= L.rozlamZabiera || o.dead || o.clan != clan.id || wWarcie(o)) continue;
                    if (JS.Hypot(o.x - far.x, o.y - far.y) > L.rozlamZasieg) continue;
                    clan.pop--; o.clan = nc.id; nc.pop++; taken++;
                }
                feud(nc.id, clan.id);
                gdzie(nc.hx, nc.hy).log($"{nc.name} odeszli na swoje — za daleko, by słuchać tych samych opowieści.", "swiat");
            }
        }

        // ------------------------------------------------------------------- tick

        public void step()
        {
            if (ending != null) return;
            tick++;
            nowyTik();
            var w = world;
            w.tickFluids(tick);
            if (tick % 3 == 0) w.tickSoil(tick);
            if (!REMAKE) tickMycelium();      // Remake v2: grzybnia nie rośnie
            rehash();

            // for…of po tablicy: urodzeni w trakcie tiku też robią krok (indeks sprawdzany na bieżąco)
            var lista = creatures;
            for (int i = 0; i < lista.Count; i++) { var c = lista[i]; if (!c.dead) stepCreature(this, c); }

            if (tick % 16 == 0)
            {
                creatures = creatures.Where(c => { if (c.dead) byId.delete(c.id); return !c.dead; }).ToList();
            }

            for (var i = efekty.Count - 1; i >= 0; i--)
            {
                efekty[i].t++;
                if (efekty[i].t > efekty[i].max) efekty.RemoveAt(i);
            }

            // cząsteczki
            for (var i = particles.Count - 1; i >= 0; i--)
            {
                var p = particles[i];
                p.x += p.vx; p.y += p.vy;
                if (p.kind == PK.BLOOD || p.kind == PK.DUST) p.vy += 0.02;
                p.life++;
                if (p.life > p.max) particles.RemoveAt(i);
            }
            // kurz w powietrzu: widać go tylko tam, gdzie coś świeci
            if (tick % 7 == 0)
            {
                for (var k = 0; k < 3; k++)
                {
                    double x = rng.@int(w.w), y = World.SURFACE_Y + rng.@int(w.h - World.SURFACE_Y);
                    var i = w.idx(x, y);
                    if (w.ever[i] != 0 && PASSABLE[w.tile[i]] == 1 && w.water[i] == 0 && rng.chance(0.4))
                    {
                        var p = new Particle();
                        p.x = x + rng.next(); p.y = y + rng.next(); p.vx = rng.range(-0.01, 0.01); p.vy = rng.range(-0.012, -0.002);
                        p.life = 1; p.max = 90; p.kind = PK.DUST;
                        particles.Add(p);
                    }
                }
            }

            // żar znad magmy
            if (tick % 4 == 0)
            {
                for (var k = 0; k < 6; k++)
                {
                    double x = rng.@int(w.w), y = Math.Floor(w.h * 0.6) + rng.@int(Math.Floor(w.h * 0.4));
                    if (w.magma[w.idx(x, y)] > 4 && w.passable(x, y - 1)) spark(x + 0.5, y - 0.5, "ember");
                }
            }

            if (tick % 600 == 0) allForges = allForges.Where(i => w.tile[i] == T.FORGE).ToList();
            if (tick % 90 == 0) { forgeAndThread(); stygnie(); }
            if (tick % 240 == 0) schism();
            if (tick % 45 == 0) w.countUnknown(tick);
            if (tick % RYTUAL.coIleTikow == 0) tikRytualu(this, rytual);
            if (tick % PIELGRZYMKA.jedzenieCo == 0) jedzeniePrzedsionka = policzJedzeniePrzedsionka(this);
            if (tick % PLAN_DROGI.odswiezCo == 0) odswiezPlan(this);
            if (tick % PLAN_DROGI.odswiezCo == 300) pilnujCzola(this);
            if (tick % PLAN_DROGI.drazenieCo == 0) drazDrogeWiernym(this);
            census();
            tides();
            tikWydarzen(this);
            tikLudu(this);
            // 6.11: stalowa brama lochu i modlitwa pobożnych za innych
            tikBramy(this);
            tikBlogoslawienstwa(this);
            // 6.11: budowa schodów drogi wiernych
            tikBudowySchodow(this);
            tikPomieszczen(this);
            tikZbroi(this);
            tikOltarza(this);
            if (wiara > GORA.wiaraMax) wiara = GORA.wiaraMax;
            if (krew > GORA.krewMax) krew = GORA.krewMax;
        }
    }
}
