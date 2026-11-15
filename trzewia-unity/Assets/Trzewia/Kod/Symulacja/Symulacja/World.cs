// Port: alpha-1/src/sim/world.ts
// Liczby jak w JS: współrzędne, wymiary i pętle są double (number), indeksy tablic typowanych też — zapis pod indeks
// ułamkowy albo poza zakresem jest pomijany, a odczyt daje NaN (undefined), dokładnie jak w TS.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Symulacja.Tiles;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Prostokąt kafli (od–do włącznie); pusty, gdy x1 &lt; x0.</summary>
    public sealed class Prost
    {
        public double x0, x1, y0, y1;
        public Prost() { }
        public Prost(double x0, double x1, double y0, double y1) { this.x0 = x0; this.x1 = x1; this.y0 = y0; this.y1 = y1; }
        public static Prost Pusty() => new Prost(0, -1, 0, -1);
        public Prost Kopia() => new Prost(x0, x1, y0, y1);
    }

    /// <summary>Punkt (kafel) — { x, y } w TS.</summary>
    public sealed class XY
    {
        public double x, y;
        public XY() { }
        public XY(double x, double y) { this.x = x; this.y = y; }
    }

    /// <summary>Góra: kafle, woda, magma i pamięć o tym, gdzie ktokolwiek dotarł.</summary>
    public sealed class World
    {
        public static readonly double WORLD_W = SWIAT.szerokosc;
        public static readonly double WORLD_H = SWIAT.wysokosc;
        public static readonly double SURFACE_Y = SWIAT.powierzchnia;
        /// <summary>Po tylu tikach bez niczyjego spojrzenia rysunek rozpada się w pusty papier.</summary>
        public static readonly double MEM_SPAN = SWIAT.pamiecTikow;

        internal static bool wProst(Prost r, double x, double y, double zapas = 0) =>
            x >= r.x0 - zapas && x <= r.x1 + zapas && y >= r.y0 - zapas && y <= r.y1 + zapas;

        public readonly double w = WORLD_W;
        public readonly double h = WORLD_H;
        public readonly Uint8Array tile = new Uint8Array((int)(WORLD_W * WORLD_H));
        public readonly Uint8Array water = new Uint8Array((int)(WORLD_W * WORLD_H));   // 0..8 objętości
        public readonly Uint8Array magma = new Uint8Array((int)(WORLD_W * WORLD_H));   // 0..8
        /// <summary>Ostatnio widziany kafel — pamięć bywa nieaktualna i o to chodzi.</summary>
        public readonly Uint8Array mem = new Uint8Array((int)(WORLD_W * WORLD_H));
        /// <summary>Tik ostatniego spojrzenia; z tego liczy się blaknięcie rysunku.</summary>
        public readonly Int32Array lastSeen = Wypelnione((int)(WORLD_W * WORLD_H), -999999);
        /// <summary>Czy ktokolwiek kiedykolwiek tu był. Zero = pusty papier.</summary>
        public readonly Uint8Array ever = new Uint8Array((int)(WORLD_W * WORLD_H));
        /// <summary>Wysokość gruntu w każdej kolumnie — linia powierzchni jest stałym punktem odniesienia.</summary>
        public readonly Int16Array surface = new Int16Array((int)WORLD_W);
        /// <summary>Ślad twojej ręki: 1 = wykop, 2 = zawał. Tego nie zapominasz nigdy.</summary>
        public readonly Uint8Array slad = new Uint8Array((int)(WORLD_W * WORLD_H));
        /// <summary>
        /// Próg: kafle, przez które nie przepływa ani woda, ani magma. Trzyma sucho
        /// przedsionek pod rdzeniem — inaczej magma z sąsiedztwa zalewała jedyne miejsce,
        /// w którym da się odprawić rytuał, i połowa światów była nie do przejścia.
        /// </summary>
        public readonly Uint8Array prog = new Uint8Array((int)(WORLD_W * WORLD_H));
        public readonly Rng rng;
        public readonly Noise noise;
        /// <summary>Kafli, o których nikt teraz nie pamięta — to jest Otchłań, cała i jedyna.</summary>
        public double unknown = 0;
        public double coreX = JS.ToInt32(WORLD_W / 2);
        public double coreY = WORLD_H - RDZEN.nadDnem;
        /// <summary>Środek przedsionka — jaskini nad skorupą, w której modli się warta.</summary>
        public double przedsionekY => coreY - RDZEN.przedsionekNad;
        /// <summary>Alpha: sala startowa pod szybem z jedzeniem — środek jej podłogi (kafel, na którym się stoi).</summary>
        public XY salaStart = new XY(JS.ToInt32(WORLD_W / 2), SURFACE_Y + 2);
        /// <summary>Alpha: kolumna środka szybu z jedzeniem i jego wylot (pierwszy rząd sali pod szybem).</summary>
        public double szybX = JS.ToInt32(WORLD_W / 2);
        public double szybDol = SURFACE_Y;
        /// <summary>Alpha, etap 3d: węższy otwór, którym zjeżdża wiadro (na prawo od szybu ze światłem) — kolumna i dolny kafel.</summary>
        public double szybWiadraX = JS.ToInt32(WORLD_W / 2);
        public double szybWiadraDol = SURFACE_Y;
        /// <summary>Alpha, etap 3d: ołtarz — kafel, na którym stoi (środek sali, pod szybem ze światłem).</summary>
        public XY oltarz = new XY(JS.ToInt32(WORLD_W / 2), SURFACE_Y + 2);
        /// <summary>
        /// Alpha: liny (1 — przez ten kafel pustki wisi lina; dawniej, w 3d, drabiny ze szczeblami). Po linie lud wchodzi
        /// i schodzi (sim/droga.ts: stoi), a ciążenie go nie ściąga. Kafel, który przestaje być pustką, traci linę.
        /// </summary>
        public Uint8Array lina = new Uint8Array((int)(WORLD_W * WORLD_H));
        /// <summary>
        /// Droga wiernych (25.10): schody w wykutych kaflach jej szybu (1) — stoi się na nich i chodzi nimi w górę i w dół
        /// jak po linie (sim/droga.ts: stoi). Liczone z mapy (sim/pielgrzymka.ts: schodyDrogi), nie trafiają do zapisu.
        /// </summary>
        public Uint8Array schody = new Uint8Array((int)(WORLD_W * WORLD_H));
        /// <summary>
        /// Droga wiernych (6.11 — z zakrętem): odcinki szybu, każdy prostokątem kafli — pierwszy od szczytu wnęki przy sali
        /// w dół do dna starej komnaty z kotłem, drugi z podłogi komnaty w dół do dna przedproża lochu. Puste, gdy góra nie
        /// ma warstw. `szybDrogi` to prostokąt, który obejmuje oba (do szybkiego „czy w ogóle blisko”).
        /// </summary>
        public List<Prost> odcinkiDrogi = new List<Prost>();
        public Prost szybDrogi = Prost.Pusty();
        /// <summary>Stara komnata na zakręcie drogi (wnętrze), kocioł na jej środku (kafel, na którym stoi) — LOCH.komnata.</summary>
        public Prost komnata = Prost.Pusty();
        public XY kociol = new XY(0, 0);
        /// <summary>Loch z Wielkim Pomnikiem (wnętrze, bez sklepienia nad przęsłami), przejście bramy w jego murze i przedproże.</summary>
        public Prost loch = Prost.Pusty();
        public Prost brama = Prost.Pusty();
        public Prost przedproze = Prost.Pusty();
        /// <summary>Alpha, etap 3d: wnętrze sali startowej (kafle od–do) — nic tu nie wyrośnie, co zagrodziłoby drogę do ołtarza.</summary>
        public Prost salaOltarza = new Prost(0, -1, 0, -1);
        /// <summary>
        /// Alpha, etap 3: kafle napoczęte kilofem — ile z nich już wykuto (0..1). Postęp zostaje w skale: odświeżony
        /// rozkaz, nowy zamiar ani drugi kopacz go nie zerują, a na ekranie skała pęka coraz mocniej. Zmiana kafla czyści wpis.
        /// </summary>
        public readonly JsMap<double, double> kucie = new JsMap<double, double>();
        /// <summary>Alpha, etap 3e: ruiny z zabytkami w środkowej warstwie (sim/ruiny.ts) — z ziarna, nie trafiają do zapisu.</summary>
        public List<Ruina> ruiny = new List<Ruina>();
        readonly double ziarno = 0;
        bool flip = false;

        static Int32Array Wypelnione(int n, double v) { var a = new Int32Array(n); a.fill(v); return a; }

        public World(double seed)
        {
            ziarno = seed;
            rng = new Rng(seed);
            noise = new Noise(rng);
            generate();
        }

        public double idx(double x, double y) => y * w + x;
        public bool inb(double x, double y) => x >= 0 && y >= 0 && x < w && y < h;
        public double get(double x, double y) => inb(x, y) ? tile[y * w + x] : T.ROCK;
        public void set(double x, double y, double t)
        {
            if (!inb(x, y)) return;
            var i = y * w + x;
            tile[i] = t;
            if (kucie.size != 0) kucie.delete(i);
            if (PASSABLE[t] != 1) { lina[i] = 0; schody[i] = 0; }
        }

        /// <summary>Czy kafel leży w szybie drogi wiernych (wykuty czy nie) — w którymś z jego odcinków.</summary>
        public bool wSzybie(double x, double y)
        {
            var s = szybDrogi;
            if (x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) return false;
            foreach (var o in odcinkiDrogi) if (x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1) return true;
            return false;
        }

        /// <summary>Odcinek szybu drogi wiernych, w którym leży kafel (albo null).</summary>
        public Prost? odcinekDrogi(double x, double y)
        {
            foreach (var o in odcinkiDrogi) if (x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1) return o;
            return null;
        }

        // (te cztery przyjmują też położenie postaci — ułamki — i liczą kafel, w którym leży)
        /// <summary>Czy kafel leży we wnętrzu lochu z pomnikiem (zapas — kafli wokół).</summary>
        public bool wLochu(double x, double y, double zapas = 0) => wProst(loch, Math.Floor(x), Math.Floor(y), zapas);
        /// <summary>Czy kafel leży na przedprożu przed bramą lochu.</summary>
        public bool wPrzedprozu(double x, double y) => wProst(przedproze, Math.Floor(x), Math.Floor(y));
        /// <summary>Czy kafel leży w przejściu bramy (w murze lochu).</summary>
        public bool wBramie(double x, double y) => wProst(brama, Math.Floor(x), Math.Floor(y));
        /// <summary>Czy kafel leży w starej komnacie z kotłem.</summary>
        public bool wKomnacie(double x, double y, double zapas = 0) => wProst(komnata, Math.Floor(x), Math.Floor(y), zapas);
        public bool passable(double x, double y) => inb(x, y) && PASSABLE[tile[y * w + x]] == 1;
        public bool solid(double x, double y) => !passable(x, y);
        public double hardness(double x, double y) => HARDNESS[get(x, y)];
        /// <summary>Głębokość 0..1 — waluta ryzyka.</summary>
        public double depth(double y) => Math.Max(0, (y - SURFACE_Y) / (h - SURFACE_Y));

        // ---------------------------------------------------------------- generacja

        void generate()
        {
            if (SWIAT.warstwy.wlaczone) { generujWarstwy(); return; }
            var S = SWIAT;

            for (double x = 0; x < w; x++)
            {
                var sh = SURFACE_Y + JS.Round(noise.fbm(x * 0.06, 0.5, 3) * (S.falowaniePowierzchni * 2) - S.falowaniePowierzchni);
                surface[x] = sh;
                for (double y = 0; y < h; y++)
                {
                    var i = y * w + x;
                    if (y < sh) { tile[i] = T.SKY; continue; }
                    var d = depth(y);
                    tile[i] = y < sh + S.gruboscZiemi ? T.SOIL : (d < S.ziemiaDoGlebokosci && rng.chance(S.szansaNaZiemie) ? T.SOIL : T.ROCK);
                }
            }

            // Jaskinie: dwie warstwy szumu, im głębiej tym rzadsze, ale większe.
            for (double y = SURFACE_Y; y < h - 4; y++)
            {
                var d = depth(y);
                var thr = S.jaskinie.prog + S.jaskinie.falowanie * JS.Sin(d * 9) - d * S.jaskinie.ubytekWGlebi;
                for (double x = 1; x < w - 1; x++)
                {
                    var n = noise.fbm(x * 0.045, y * 0.055, 4);
                    var n2 = noise.fbm(200 + x * 0.02, 90 + y * 0.03, 2);
                    if (n > thr && n2 > S.jaskinie.progDrugi) tile[y * w + x] = T.AIR;
                }
            }

            // Komory: kilkanaście wielkich pustek, tam siadają gniazda.
            for (double k = 0; k < S.komory.ile; k++)
            {
                double cx = rng.@int(w - 20) + 10;
                double cy = SURFACE_Y + 8 + rng.@int(h - SURFACE_Y - 30);
                double rx = rng.range(S.komory.szerokoscOd, S.komory.szerokoscDo), ry = rng.range(S.komory.wysokoscOd, S.komory.wysokoscDo);
                ellipse(cx, cy, rx, ry, T.AIR);
            }

            // Wejścia z powierzchni — korytarze schodzące w głąb.
            for (double k = 0; k < S.wejscia.ile; k++)
            {
                double x = 12 + rng.@int(w - 24);
                double y = SURFACE_Y - 4;
                double cx = x;
                while (y < h * S.wejscia.doGlebokosci)
                {
                    ellipse(cx, y, rng.range(1.4, 2.6), 1.8, T.AIR);
                    y += 2;
                    cx += rng.@int(3) - 1;
                    if (cx < 3 || cx > w - 4) cx = x;
                    if (rng.chance(S.wejscia.szansaUrwania)) break;
                }
            }

            // Rudy i kryształy — nagroda rośnie z głębokością.
            for (double y = SURFACE_Y; y < h; y++)
            {
                var d = depth(y);
                for (double x = 0; x < w; x++)
                {
                    var i = y * w + x;
                    if (tile[i] != T.ROCK && tile[i] != T.SOIL) continue;
                    var v = noise.fbm(500 + x * 0.14, 300 + y * 0.10, 3);
                    if (v > S.rudy.prog - d * S.rudy.latwiejWGlebi && rng.chance(S.rudy.szansa + d * S.rudy.szansaWGlebi)) tile[i] = T.ORE;
                    else if (d > S.rudy.krysztalyOd && v > S.rudy.krysztalyProg && rng.chance(d * S.rudy.krysztalySzansa)) tile[i] = T.CRYSTAL;
                }
            }

            // Remake v1: w górze nie ma ani wody, ani lawy — są za to rozległe jaskinie.
            rzezbJaskinie();

            // Rdzeń — ty. Zamknięty w skorupie, której nikt nie przekopie:
            // wejście otwiera dopiero rytuał wielu wiernych, nie jeden zdeterminowany goblin.
            ellipse(coreX, coreY, RDZEN.skorupaX, RDZEN.skorupaY, T.STONE);
            ellipse(coreX, coreY, RDZEN.komoraX, RDZEN.komoraY, T.AIR);
            ellipse(coreX, coreY, RDZEN.promien, RDZEN.promien, T.CORE);
            // przedsionek nad skorupą: tam schodzą ci, którzy chcą cię znaleźć
            ellipse(coreX, przedsionekY, RDZEN.przedsionekX, RDZEN.przedsionekY, T.AIR);
            osuszPrzedsionek();

            // Zejście się osypuje, zanim gracz spojrzy — świat ma startować stabilny.
            for (double k = 0; k < S.osypywanieNaStart; k++) tickSoil(k);

            unknown = w * h;
        }

        /// <summary>Alpha, etap 3d: czy kafel leży w sali startowej (tam stoi ołtarz — droga do niego ma zostać wolna).</summary>
        public bool wSali(double x, double y)
        {
            var s = salaOltarza;
            return x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1;
        }

        /// <summary>Alpha: granica warstw w kolumnie x — na głębokości `g` (0..1), falująca szumem.</summary>
        double granica(double x, double g, double ziarno)
        {
            var fal = SWIAT.warstwy.falowanie;
            return JS.Round(SURFACE_Y + g * (h - SURFACE_Y) + (noise.fbm(ziarno + x * 0.05, ziarno * 0.7, 2) - 0.5) * 2 * fal);
        }

        /// <summary>
        /// Alpha, etap 3 — góra według szkicu (SWIAT.warstwy): pod powierzchnią czapa kamienia, przez nią szyb z jedzeniem
        /// do jasnej sali startowej na środku u góry; trzy warstwy skały z żyłami żelaza, małymi jaskiniami (pod dnem
        /// złoto) i kieszeniami; gruba rama dookoła; rdzeń w skorupie na środku u dołu, nad nim przedsionek.
        /// </summary>
        void generujWarstwy()
        {
            var S = SWIAT.warstwy;
            double cx = JS.ToInt32(w / 2);
            var dnoSali = SURFACE_Y + S.sala.dnoPod;                 // pierwszy rząd podłogi sali
            var stropSali = JS.Round(dnoSali - S.sala.ry * 2);       // najwyższy rząd sali
            var g1 = new Int16Array((int)w);
            var g2 = new Int16Array((int)w);
            // 1. kolumny: niebo, ziemia, warstwy skały
            for (double x = 0; x < w; x++)
            {
                surface[x] = SURFACE_Y;
                g1[x] = granica(x, S.plytkaDo, 11); g2[x] = granica(x, S.srodkowaDo, 37);
                for (double y = 0; y < h; y++)
                {
                    var i = y * w + x;
                    tile[i] = y < SURFACE_Y ? T.SKY : y < SURFACE_Y + S.ziemia ? T.SOIL : y < g1[x] ? T.MIEKKA : y < g2[x] ? T.ROCK : T.TWARDA;
                }
            }
            bool wolno(double x, double y) => x >= S.rama + 2 && x < w - S.rama - 2 && y >= stropSali + 2 && y < h - S.rama - 2;
            var podlogaKrypty = przedsionekY + RDZEN.przedsionekY;   // pierwszy lity rząd pod kryptą
            // 6.11: droga z zakrętem, komnata z kotłem, przedproże, brama i loch — najpierw sam układ (ruiny i jaskinie
            // omijają go), wykuwa się je na końcu (wykujLochIDroge)
            ukladDrogi(cx, dnoSali, podlogaKrypty);
            bool zaRdzeniem(double x, double y, double zapas) => JS.Hypot(x - coreX, (y - coreY) * 0.8) < RDZEN.skorupaX + zapas
                || JS.Hypot(x - coreX, y - przedsionekY) < RDZEN.suchaStrefa + zapas * 0.5
                || wProst(loch, x, y, LOCH.loch.mur + zapas);
            bool wSaliL(double x, double y, double zapas) => Math.Abs(x - cx) < S.sala.rx + zapas && y < dnoSali + zapas;
            // droga wiernych (szyby, komnata z kotłem, przedproże) — ruiny i jaskinie stają z dala od niej
            bool przyDrodze(double x, double y, double zapas) => odcinkiDrogi.Any(o => wProst(o, x, y, zapas))
                || wProst(komnata, x, y, zapas + 1) || wProst(przedproze, x, y, zapas + 1);
            // 2. żyły żelaza: kępy rudy w miękkiej i zwykłej skale
            void kepa(double x0, double y0, double r)
            {
                for (var y = Math.Floor(y0 - r - 1); y <= y0 + r + 1; y++) for (var x = Math.Floor(x0 - r - 1); x <= x0 + r + 1; x++)
                {
                    if (!wolno(x, y)) continue;
                    var i = y * w + x;
                    if (tile[i] != T.MIEKKA && tile[i] != T.ROCK) continue;
                    var brzeg = r * (0.75 + 0.5 * noise.fbm(900 + x * 0.4, 400 + y * 0.4, 2));
                    if (JS.Hypot(x - x0, (y - y0) * 1.3) <= brzeg) tile[i] = T.ORE;
                }
            }
            double losX() => S.rama + 4 + rng.@int(w - 2 * S.rama - 8);
            for (double k = 0; k < S.zelazo.plytka + S.zelazo.srodkowa; k++)
            {
                var x = losX();
                var plytka = k < S.zelazo.plytka;
                double y0 = plytka ? stropSali + 4 : g1[x] + 2, y1 = plytka ? g1[x] - 1 : g2[x] - 2;
                if (y1 <= y0) continue;
                var y = y0 + rng.@int(y1 - y0);
                if (wSaliL(x, y, 3)) continue;
                kepa(x, y, rng.range(S.zelazo.promienOd, S.zelazo.promienDo));
            }
            // 3. kieszenie i jaskinie: nieregularna elipsa z płaskim dnem; zwraca rząd dna (pierwszy lity pod środkiem)
            double jaskinia(double x0, double y0, double rx, double ry)
            {
                var dno = JS.Round(y0 + ry * 0.6);
                for (var y = Math.Floor(y0 - ry - 1); y < dno; y++) for (var x = Math.Floor(x0 - rx - 2); x <= x0 + rx + 2; x++)
                {
                    if (!wolno(x, y)) continue;
                    var brzeg = 1 + (noise.fbm(300 + x * 0.17, 700 + y * 0.21, 2) - 0.5) * 0.5;
                    double dx = (x - x0) / rx, dy = (y - y0) / ry;
                    if (dx * dx + dy * dy <= brzeg * brzeg) tile[y * w + x] = T.AIR;
                }
                return dno;
            }
            double[]? losuj(double y0, double y1, double rx, double ry, double zapas)
            {
                for (var p = 0; p < 30; p++)
                {
                    var x = JS.Round(S.rama + 3 + rx + rng.next() * (w - 2 * (S.rama + 3 + rx)));
                    var y = JS.Round(y0 + rng.next() * Math.Max(1, y1 - y0));
                    if (wSaliL(x, y, rx + 4) || zaRdzeniem(x, y, rx + zapas) || wProst(komnata, x, y, rx + 3) || wProst(przedproze, x, y, rx + 3)) continue;
                    return new[] { x, y };
                }
                return null;
            }
            var K = S.kieszenie;
            var J = S.jaskinie;
            for (double k = 0; k < K.plytka + K.gleboka; k++)
            {
                var plytka = k < K.plytka;
                double rx = rng.range(K.rxOd, K.rxDo), ry = rng.range(K.ryOd, K.ryDo);
                var m = plytka ? losuj(stropSali + 10, h * (S.plytkaDo + 0.04), rx, ry, 4) : losuj(h * (S.srodkowaDo + 0.06), przedsionekY - 6, rx, ry, 6);
                if (m != null) jaskinia(m[0], m[1], rx, ry);
            }
            for (double k = 0; k < J.ile; k++)
            {
                double rx = rng.range(J.rxOd, J.rxDo), ry = rng.range(J.ryOd, J.ryDo);
                var m = losuj(h * (S.plytkaDo + 0.05), h * (S.srodkowaDo - 0.02), rx, ry, 4);
                if (m == null) continue;
                var dno = jaskinia(m[0], m[1], rx, ry);
                if (!rng.chance(J.zlotoSzansa)) continue;
                // złoto pod dnem jaskini: pas kruszcu w pierwszym litym rzędzie, czasem i w drugim
                double szer = J.zlotoOd + rng.@int(J.zlotoDo - J.zlotoOd + 1);
                var x0 = JS.Round(m[0] - szer / 2 + rng.range(-rx * 0.4, rx * 0.4));
                for (var x = x0; x < x0 + szer; x++)
                {
                    var y = dno - 2;
                    while (y < dno + 4 && wolno(x, y) && PASSABLE[tile[y * w + x]] == 1) y++;
                    if (!wolno(x, y)) continue;
                    if (tile[y * w + x] == T.ROCK || tile[y * w + x] == T.MIEKKA) tile[y * w + x] = T.ZLOTO;
                    if (rng.chance(0.45) && wolno(x, y + 1) && tile[(y + 1) * w + x] == T.ROCK) tile[(y + 1) * w + x] = T.ZLOTO;
                }
            }
            // 3e. ruiny z zabytkami w środkowej warstwie — własne losowanie, żeby reszta góry z ziarna została ta sama
            ruiny = Ruiny.zbudujRuiny(this, new Rng(ziarno * 9781 + 77), g1, g2,
                (x, y) => wolno(x, y) && !wSaliL(x, y, 8) && !zaRdzeniem(x, y, 8) && !przyDrodze(x, y, 4));
            // 4. czapa nad salą i rama dookoła: kamień nie do ruszenia
            for (var y = SURFACE_Y + S.ziemia; y < stropSali; y++) for (double x = 0; x < w; x++) tile[y * w + x] = T.STONE;
            for (var y = SURFACE_Y; y < h; y++) for (double x = 0; x < w; x++)
            {
                if (x < S.rama || x >= w - S.rama || y >= h - S.rama) tile[y * w + x] = T.STONE;
            }
            // 5. szyb z jedzeniem i sala startowa: sklepienie łukiem, płaska podłoga z miękkiej skały
            double pol = JS.ToInt32(S.szyb) >> 1;
            for (var y = SURFACE_Y - 1; y <= stropSali; y++) for (var x = cx - pol; x <= cx + pol; x++) tile[y * w + x] = T.AIR;
            for (var y = stropSali; y < dnoSali; y++) for (var x = cx - S.sala.rx - 1; x <= cx + S.sala.rx + 1; x++)
            {
                var dx = (x - cx) / S.sala.rx;
                var luk = stropSali + (S.sala.ry * 0.9) * dx * dx + (noise.fbm(x * 0.3, 55, 2) - 0.5) * 1.2;
                if (Math.Abs(x - cx) <= S.sala.rx && y >= luk) tile[y * w + x] = T.AIR;
            }
            for (var x = cx - S.sala.rx - 1; x <= cx + S.sala.rx + 1; x++) for (var y = dnoSali; y < dnoSali + 2; y++)
            {
                if (PASSABLE[tile[y * w + x]] == 1 || tile[y * w + x] == T.ORE) tile[y * w + x] = T.MIEKKA;
            }
            salaStart = new XY(cx, dnoSali - 1);
            szybX = cx; szybDol = stropSali;
            // etap 3d: drugi, węższy otwór na prawo — tym zjeżdża wiadro; przez czapę aż do sklepienia sali
            var SW = S.szybWiadra;
            var wx0 = cx + SW.dx;
            var wDol = SURFACE_Y - 1;
            for (var y = SURFACE_Y - 1; y < dnoSali - 1; y++)
            {
                if (y > stropSali && PASSABLE[tile[y * w + wx0]] == 1) break;
                for (var x = wx0; x < wx0 + SW.szer; x++) tile[y * w + x] = T.AIR;
                wDol = y;
            }
            szybWiadraX = wx0; szybWiadraDol = wDol;
            // ołtarz pod szybem ze światłem: kamienny kopczyk pod nim i kamienna podłoga sali (wyjścia zostają na jej końcach)
            var O = S.oltarz;
            // (kolumna pod otworem z wiadrem zostaje do kucia — kto wykopie pod wiadrem dziurę, sprowadzi je niżej)
            for (var x = cx - S.sala.rx + O.wyjscie; x <= cx + S.sala.rx - O.wyjscie; x++)
            {
                if (x >= wx0 && x < wx0 + SW.szer) continue;
                for (var y = dnoSali; y < dnoSali + O.podlogaRzedow; y++) tile[y * w + x] = T.STONE;
            }
            double polKopczyka = JS.ToInt32(O.kopczykSzer) >> 1;
            for (var x = cx - polKopczyka; x <= cx + polKopczyka; x++) for (var y = dnoSali; y < dnoSali + O.kopczykGleb; y++) tile[y * w + x] = T.STONE;
            oltarz = new XY(cx, dnoSali - 1);
            salaOltarza = new Prost(cx - S.sala.rx - 1, cx + S.sala.rx + 1, stropSali, dnoSali - 1);
            // 6. rdzeń — zamknięty w skorupie, której nikt nie przekopie; nad nim krypta (szeroki pas z płaską podłogą,
            //    sklepienie najwyżej nad rdzeniem) i w niej przedsionek
            ellipse(coreX, coreY, RDZEN.skorupaX, RDZEN.skorupaY, T.STONE);
            ellipse(coreX, coreY, RDZEN.komoraX, RDZEN.komoraY, T.AIR);
            // (Alpha, etap 5: w komorze stoi Wielki Pomnik demona — render/pomnik.ts; kafli rdzenia już nie ma)
            if (!POMNIK.wlaczony) ellipse(coreX, coreY, RDZEN.promien, RDZEN.promien, T.CORE);
            // 6.11: zamiast niskiej krypty — loch za murem nie do ruszenia, sklepiony łukami, z wysoką nawą nad przedsionkiem;
            // wchodzi się do niego tylko przez stalową bramę z przedproża (sim/brama.ts)
            wykujLoch(podlogaKrypty);
            ellipse(coreX, przedsionekY, RDZEN.przedsionekX, RDZEN.przedsionekY, T.AIR);
            osuszPrzedsionek();
            for (double k = 0; k < SWIAT.osypywanieNaStart; k++) tickSoil(k);
            wykujDroge();
            unknown = w * h;
        }

        /// <summary>
        /// 6.11 — układ drogi wiernych z zakrętem (LOCH): pierwszy szyb od wnęki przy lewej ścianie sali w dół do dna starej
        /// komnaty, komnata w bok, drugi szyb z jej drugiego końca w dół na przedproże, a z przedproża brama do lochu.
        /// </summary>
        void ukladDrogi(double cx, double dnoSali, double podlogaKrypty)
        {
            var S = SWIAT.warstwy;
            var D = S.drogaWiernych;
            var Z = LOCH.zakret;
            var KM = LOCH.komnata;
            var L = LOCH.loch;
            var PP = LOCH.przedproze;
            var dolSali = dnoSali - 1;
            double s1x1 = cx - S.sala.rx - 1, s1x0 = s1x1 - D.szer + 1;
            double yK1 = dolSali + Z.wDol, yK0 = yK1 - KM.wys + 1;
            double s2x0 = s1x0 + Z.strona * Z.wBok, s2x1 = s2x0 + D.szer - 1;
            komnata = new Prost(Math.Min(s1x0, s2x0) - KM.zaSzybem, Math.Max(s1x1, s2x1) + KM.zaSzybem, yK0, yK1);
            kociol = new XY(JS.Round((komnata.x0 + komnata.x1) / 2), yK1);
            loch = new Prost(coreX - L.rx, coreX + L.rx, podlogaKrypty - L.nawa, podlogaKrypty - 1);
            var bx0 = Z.strona < 0 ? loch.x0 - L.mur : loch.x1 + 1;
            brama = new Prost(bx0, bx0 + L.mur - 1, podlogaKrypty - LOCH.brama.wys, podlogaKrypty - 1);
            przedproze = Z.strona < 0
                ? new Prost(s2x0 - PP.zaSzybem, brama.x0 - 1, podlogaKrypty - PP.wys, podlogaKrypty - 1)
                : new Prost(brama.x1 + 1, s2x1 + PP.zaSzybem, podlogaKrypty - PP.wys, podlogaKrypty - 1);
            odcinkiDrogi = new List<Prost>
            {
                new Prost(s1x0, s1x1, dolSali - D.wneka + 1, yK1),
                new Prost(s2x0, s2x1, yK1 + 1, podlogaKrypty - 1),
            };
            var o = odcinkiDrogi;
            szybDrogi = new Prost(Math.Min(o[0].x0, o[1].x0), Math.Max(o[0].x1, o[1].x1), o[0].y0, o[1].y1);
        }

        /// <summary>Wysokość sklepienia lochu nad kolumną x (rzędy wnętrza nad podłogą): łuki przęseł i wysoka nawa nad przedsionkiem.</summary>
        public double wysokoscLochu(double x)
        {
            var L = LOCH.loch;
            var f = (((x - loch.x0) % L.przeslo) + L.przeslo) % L.przeslo / L.przeslo;
            var luk = L.sklepienie + JS.Round(L.luk * JS.Sin(Math.PI * f));
            var dx = (x - coreX) / L.nawaSzer;
            var nawa = Math.Abs(dx) <= 1 ? JS.Round(L.nawa - 3 * dx * dx) : 0;
            return Math.Max(luk, nawa);
        }

        /// <summary>Loch (6.11): wnętrze pod sklepieniem, mur nie do ruszenia dookoła i kamienna posadzka; przejście bramy zamknięte.</summary>
        void wykujLoch(double podloga)
        {
            var L = LOCH.loch;
            var l = loch;
            var W = w;
            void mur(double x, double y) { if (inb(x, y)) tile[y * W + x] = T.STONE; }
            for (var x = l.x0 - L.mur; x <= l.x1 + L.mur; x++)
            {
                var xx = Math.Max(l.x0, Math.Min(l.x1, x));
                var hh = wysokoscLochu(xx);
                for (var y = podloga - hh - L.mur; y <= podloga + 1; y++) mur(x, y);
                if (x < l.x0 || x > l.x1) continue;
                for (var y = podloga - hh; y < podloga; y++) tile[y * W + x] = T.AIR;
            }
            // mur boczny sięga nad najwyższy łuk przy ścianie (sklepienie przy ścianie jest niższe niż nad przęsłem)
            foreach (var sx in new[] { l.x0 - L.mur, l.x1 + 1 })
                for (var x = sx; x < sx + L.mur; x++)
                    for (var y = podloga - L.sklepienie - L.luk - L.mur; y <= podloga + 1; y++) mur(x, y);
        }

        /// <summary>
        /// Droga wiernych (6.11): stara komnata z kotłem i przedproże przed bramą stoją puste od początku (za murem nie do
        /// ruszenia, wchodzi się do nich szybem), wnęka u szczytu pierwszego szybu też; w samych szybach nie zostaje kamień nie
        /// do ruszenia — inaczej droga by stanęła (szyb przebija sklepienie komnaty, jej posadzkę i strop przedproża).
        /// </summary>
        void wykujDroge()
        {
            var W = w;
            void pusta(Prost r)
            {
                for (var y = r.y0 - 1; y <= r.y1 + 1; y++) for (var x = r.x0 - 1; x <= r.x1 + 1; x++)
                {
                    if (!inb(x, y)) continue;
                    tile[y * W + x] = wProst(r, x, y) ? T.AIR : T.STONE;
                }
            }
            pusta(komnata);
            // przedproże: z prawej (od strony lochu) jego ścianą jest mur lochu z przejściem bramy
            var pp = przedproze;
            for (var y = pp.y0 - 1; y <= pp.y1 + 2; y++) for (var x = pp.x0 - 1; x <= pp.x1 + 1; x++)
            {
                if (!inb(x, y) || wLochu(x, y)) continue;
                tile[y * W + x] = wProst(pp, x, y) ? T.AIR : T.STONE;
            }
            var s = salaOltarza;
            foreach (var o in odcinkiDrogi) for (var y = o.y0; y <= o.y1; y++) for (var x = o.x0; x <= o.x1; x++)
            {
                var i = idx(x, y);
                if (y <= s.y1) tile[i] = T.AIR;
                else if (tile[i] == T.STONE) tile[i] = T.ROCK;
            }
        }

        sealed class SalaJ { public double x, y, rx, ry; }

        /// <summary>
        /// Rozległe jaskinie (Remake v1): wielkie sale z płaską podłogą, filarami i naciekami,
        /// kręte galerie, które łączą sale między sobą, kominy w pionie i niskie groty w głębi
        /// (tam, gdzie dawniej leżały jeziora magmy). Liczby w SWIAT.sale / galerie / kominy / groty.
        /// </summary>
        void rzezbJaskinie()
        {
            var S = SWIAT;
            var sale = new List<SalaJ>();
            // sale: od pierwszej warstwy pod ziemią do głębi, równo rozrzucone w pionie
            for (double k = 0; k < S.sale.ile; k++)
            {
                var pas = (k + rng.next()) / S.sale.ile;
                var y = JS.Round(SURFACE_Y + S.sale.odPowierzchni + pas * (h * S.sale.doGlebokosci - SURFACE_Y - S.sale.odPowierzchni));
                double rx = rng.range(S.sale.szerokoscOd, S.sale.szerokoscDo), ry = rng.range(S.sale.wysokoscOd, S.sale.wysokoscDo);
                var x = JS.Round(rx + 3 + rng.next() * (w - rx * 2 - 6));
                sala(x, y, rx, ry);
                sale.Add(new SalaJ { x = x, y = y, rx = rx, ry = ry });
            }
            // groty w głębi: niskie i szerokie
            for (double k = 0; k < S.groty.ile; k++)
            {
                var y = JS.Round(h * (S.groty.od + rng.next() * S.groty.pas));
                double rx = rng.range(S.groty.szerokoscOd, S.groty.szerokoscDo), ry = rng.range(S.groty.wysokoscOd, S.groty.wysokoscDo);
                var x = JS.Round(rx + 3 + rng.next() * (w - rx * 2 - 6));
                sala(x, y, rx, ry);
                sale.Add(new SalaJ { x = x, y = y, rx = rx, ry = ry });
            }
            // galerie: każda sala łączy się z najbliższą sąsiadką i czasem z drugą
            for (var a = 0; a < sale.Count; a++)
            {
                var odl = JS.Sort(sale.Select((b, j) => (j, d: j == a ? 1e9 : JS.Hypot(b.x - sale[a].x, (b.y - sale[a].y) * 1.6))).ToList(), (p, q) => p.d - q.d);
                var ile = rng.chance(S.galerie.drugaSzansa) ? 2 : 1;
                for (var n = 0; n < ile && n < odl.Count; n++)
                {
                    var b = sale[odl[n].j];
                    if (odl[n].d > S.galerie.najdluzsza) continue;
                    galeria(sale[a].x, sale[a].y + sale[a].ry * 0.4, b.x, b.y + b.ry * 0.4);
                }
            }
            // kominy: pionowe szyby z sali w dół
            for (double k = 0; k < S.kominy.ile; k++)
            {
                var s0 = sale[(int)rng.@int(sale.Count)];
                komin(s0.x + rng.range(-s0.rx * 0.6, s0.rx * 0.6), s0.y, rng.range(S.kominy.dlugoscOd, S.kominy.dlugoscDo));
            }
        }

        /// <summary>Sala: nieregularna elipsa z płaską podłogą, filary od dna do stropu, stalaktyty i stalagmity.</summary>
        void sala(double cx, double cy, double rx, double ry)
        {
            var S = SWIAT.sale;
            var podloga = S.podloga;                       // część promienia pod środkiem, gdzie kończy się sala
            for (var y = Math.Floor(cy - ry - 2); y <= cy + ry + 2; y++)
            {
                for (var x = Math.Floor(cx - rx - 3); x <= cx + rx + 3; x++)
                {
                    if (!inb(x, y) || y < SURFACE_Y + 3 || x < 1 || x > w - 2) continue;
                    double dx = (x - cx) / rx, dy = (y - cy) / ry;
                    var brzeg = 1 + (noise.fbm(300 + x * 0.13, 700 + y * 0.17, 3) - 0.5) * S.poszarpanie;
                    if (dy > podloga + (noise.fbm(x * 0.2, 40, 2) - 0.5) * 0.12) continue;        // płaskie dno
                    if (dx * dx + dy * dy <= brzeg * brzeg) tile[y * w + x] = T.AIR;
                }
            }
            var dno = Math.Floor(cy + ry * podloga);
            // filary: kolumny skały od dna do stropu
            var filarow = Math.Floor(rx / S.filarCo * rng.next() * 2);
            for (double f = 0; f < filarow; f++)
            {
                var fx = JS.Round(cx + rng.range(-rx * 0.7, rx * 0.7));
                var gruby = 2 + (rng.chance(0.4) ? 1 : 0);
                for (var y = dno; y > cy - ry - 2; y--)
                {
                    if (!inb(fx, y)) break;
                    var i = y * w + fx;
                    if (PASSABLE[tile[i]] != 1 && y < dno - 1) break;
                    for (double gx = 0; gx < gruby; gx++) if (inb(fx + gx, y)) tile[i + gx] = T.ROCK;
                }
            }
            // nacieki: zęby ze stropu i z dna
            var naciekow = Math.Floor(rx * S.naciekiNaKafel);
            for (double n = 0; n < naciekow; n++)
            {
                var nx = JS.Round(cx + rng.range(-rx * 0.85, rx * 0.85));
                var zDolu = rng.chance(0.4);
                double dl = 1 + rng.@int(zDolu ? 2 : 3);
                if (zDolu)
                {
                    for (double k = 0; k < dl; k++)
                        if (inb(nx, dno - k) && PASSABLE[tile[(dno - k) * w + nx]] == 1 && !passable(nx, dno - k + 1)) tile[(dno - k) * w + nx] = T.ROCK; else break;
                }
                else
                {
                    var y = Math.Floor(cy);
                    while (y > 1 && passable(nx, y - 1)) y--;
                    for (double k = 0; k < dl; k++) if (inb(nx, y + k) && PASSABLE[tile[(y + k) * w + nx]] == 1) tile[(y + k) * w + nx] = T.ROCK;
                }
            }
        }

        /// <summary>Galeria: kręty korytarz z punktu do punktu, o zmiennej szerokości.</summary>
        void galeria(double x0, double y0, double x1, double y1)
        {
            var S = SWIAT.galerie;
            double x = x0, y = y0;
            var krokow = Math.Ceiling(JS.Hypot(x1 - x0, y1 - y0) * 1.6);
            var ziarnoG = rng.next() * 100;
            for (double k = 0; k < krokow; k++)
            {
                var a = JS.Atan2(y1 - y, x1 - x) + (noise.fbm(ziarnoG + k * 0.08, 5, 2) - 0.5) * S.krety;
                x += JS.Cos(a) * 0.8; y += JS.Sin(a) * 0.8;
                // galeria nie przecina boków góry ani nie wychodzi pod niebo
                x = Math.Max(3, Math.Min(w - 4, x)); y = Math.Max(SURFACE_Y + 4, Math.Min(h - 3, y));
                var r = S.promienOd + (S.promienDo - S.promienOd) * noise.fbm(ziarnoG + 50 + k * 0.05, 9, 2);
                ellipse(x, y, r * 1.25, r, T.AIR);
                if (JS.Hypot(x1 - x, y1 - y) < 1.5) break;
            }
        }

        /// <summary>Komin: pionowy szyb, lekko falujący na boki.</summary>
        void komin(double x, double y, double dl)
        {
            var z = rng.next() * 100;
            for (double k = 0; k < dl; k++)
            {
                var xx = Math.Max(3, Math.Min(w - 4, x + (noise.fbm(z + k * 0.09, 3, 2) - 0.5) * 6));
                ellipse(xx, y + k, SWIAT.kominy.promien, 1.2, T.AIR);
            }
        }

        /// <summary>
        /// Strefa sucha wokół przedsionka: żadnej magmy, wody ani żyły szaleństwa,
        /// a krawędź strefy dostaje próg, przez który ciecze nie przepływają.
        /// </summary>
        void osuszPrzedsionek()
        {
            double px = coreX, py = przedsionekY;
            var R = RDZEN.suchaStrefa;
            for (var y = py - R; y <= py + R; y++)
            {
                for (var x = px - R; x <= px + R; x++)
                {
                    if (!inb(x, y)) continue;
                    var d = JS.Hypot(x - px, y - py);
                    if (d > R) continue;
                    var i = y * w + x;
                    magma[i] = 0;
                    water[i] = 0;
                    if (tile[i] == T.CRYSTAL) tile[i] = T.ROCK;
                    if (d > R - RDZEN.progSuchejStrefy) prog[i] = 1;          // pierścień progu na obrzeżu strefy
                }
            }
        }

        /// <summary>Czy kafel leży w suchej strefie przedsionka — tam nie wolno lać ani wody, ani ognia.</summary>
        public bool suchaStrefa(double x, double y) => JS.Hypot(x - coreX, y - przedsionekY) <= RDZEN.suchaStrefa;

        void ellipse(double cx, double cy, double rx, double ry, double t)
        {
            for (var y = Math.Floor(cy - ry); y <= cy + ry; y++)
            {
                for (var x = Math.Floor(cx - rx); x <= cx + rx; x++)
                {
                    if (!inb(x, y) || y < SURFACE_Y - 6) continue;
                    double dx = (x - cx) / rx, dy = (y - cy) / ry;
                    if (dx * dx + dy * dy <= 1) tile[y * w + x] = t;
                }
            }
        }

        // ------------------------------------------------------------------- płyny

        /// <summary>Woda i magma jako objętość w kafelku, nie jako kafelek.</summary>
        public void tickFluids(double tick)
        {
            if (!SWIAT.plyny) return;
            flip = !flip;
            var doMagma = tick % 3 == 0;
            for (var y = h - 2; y >= 0; y--)
            {
                for (double k = 0; k < w; k++)
                {
                    var x = flip ? k : w - 1 - k;
                    var i = y * w + x;
                    var lvl = water[i];
                    if (lvl > 0)
                    {
                        if (PASSABLE[tile[i]] != 1) { water[i] = 0; continue; }
                        var below = i + w;
                        if (y + 1 < h && PASSABLE[tile[below]] == 1 && prog[below] == 0 && water[below] < 8)
                        {
                            var move = Math.Min(lvl, 8 - water[below]);
                            water[below] += move; water[i] -= move;
                            if (magma[below] > 0) quench(below);
                            if (water[i] == 0) continue;
                        }
                        // rozlew na boki: wyrównanie o jeden stopień
                        foreach (var dx in flip ? new double[] { -1, 1 } : new double[] { 1, -1 })
                        {
                            var j = i + dx;
                            if (x + dx < 0 || x + dx >= w) continue;
                            if (PASSABLE[tile[j]] != 1 || prog[j] == 1) continue;
                            if (water[j] + 1 < water[i]) { water[j]++; water[i]--; if (magma[j] > 0) quench(j); }
                        }
                    }
                    if (doMagma && magma[i] > 0)
                    {
                        if (PASSABLE[tile[i]] != 1) { magma[i] = 0; continue; }
                        if (water[i] > 0) { quench(i); continue; }
                        var below = i + w;
                        if (y + 1 < h && PASSABLE[tile[below]] == 1 && prog[below] == 0 && magma[below] < 8)
                        {
                            var move = Math.Min(magma[i], 8 - magma[below]);
                            magma[below] += move; magma[i] -= move;
                            if (water[below] > 0) quench(below);
                        }
                        else
                        {
                            foreach (var dx in flip ? new double[] { -1, 1 } : new double[] { 1, -1 })
                            {
                                var j = i + dx;
                                if (x + dx < 0 || x + dx >= w) continue;
                                if (PASSABLE[tile[j]] != 1 || prog[j] == 1) continue;
                                if (magma[j] + 2 < magma[i]) { magma[j]++; magma[i]--; if (water[j] > 0) quench(j); }
                            }
                        }
                    }
                }
            }
        }

        /// <summary>Magma w wodzie zastyga w kamień — przejście zamknięte na zawsze.</summary>
        void quench(double i)
        {
            magma[i] = 0;
            water[i] = Math.Max(0, water[i] - 4);
            tile[i] = T.STONE;
        }

        /// <summary>
        /// Ziemia sypie się, gdy podkopiesz — stropy nie są wieczne. (W TS sprawdzanie po cztery kafle naraz —
        /// słowem 32-bitowym — dla szybkości; kolejność i wynik te same co kafel po kaflu, więc tu po kaflu.)
        /// </summary>
        public void tickSoil(double tick)
        {
            var right = tick % 2 == 0;
            int W = (int)w;
            var t = tile.d;
            for (int y = (int)h - 2; y >= 1; y--)
            {
                for (int k = 0; k < W; k++)
                {
                    int x = right ? k : W - 1 - k;
                    int i = y * W + x;
                    if (t[i] != T.SOIL) continue;
                    int below = i + W;
                    if (PASSABLE.d[t[below]] != 1) continue;
                    var lp = x > 0 && PASSABLE.d[t[i - 1]] == 1;
                    var rp = x < W - 1 && PASSABLE.d[t[i + 1]] == 1;
                    if (!lp && !rp) continue;                 // strop trzyma się ścian
                    t[below] = T.SOIL; t[i] = T.AIR;
                    water.d[below] = 0;
                }
            }
        }

        /// <summary>
        /// Zapisuje, że to miejsce zmieniła twoja ręka. Takie kafle zostają na rysunku
        /// na zawsze — inaczej własny wykop w pustce znikał i nie było widać, co się zrobiło.
        /// </summary>
        public void oznaczSlad(double x, double y, double rodzaj, double tick)
        {
            if (!inb(x, y)) return;
            var i = y * w + x;
            slad[i] = rodzaj;
            mem[i] = tile[i];
            lastSeen[i] = tick;
            if (!Prawda(ever[i])) { ever[i] = 1; if (unknown > 0) unknown--; }
        }

        /// <summary>Wartość z tablicy jako warunek JS: 0 i NaN (undefined) to fałsz.</summary>
        static bool Prawda(double v) => v != 0 && !double.IsNaN(v);

        /// <summary>Ile ciebie nikt teraz nie pamięta. Liczone rzadko — pełny skan to 42 tysiące kafli.</summary>
        public double countUnknown(double tick)
        {
            double n = 0;
            for (int i = 0; i < tile.length; i++)
            {
                if (ever.d[i] == 0 || tick - lastSeen.d[i] > MEM_SPAN) n++;
            }
            unknown = n;
            return n;
        }

        /// <summary>
        /// Zasklepienie nieznanego: wydana Otchłań dosłownie domalowuje kawałek ciebie.
        /// Zwraca, ile kafli udało się zasklepić.
        /// </summary>
        public double seal(double tiles, double tick, Rng rng)
        {
            double done = 0, guard = 0;
            while (done < tiles && guard++ < 400)
            {
                double cx = rng.@int(w), cy = rng.@int(h);
                var r = GORA.zasklepianiePromien;
                for (var y = Math.Max(0, cy - r); y <= Math.Min(h - 1, cy + r) && done < tiles; y++)
                {
                    for (var x = Math.Max(0, cx - r); x <= Math.Min(w - 1, cx + r) && done < tiles; x++)
                    {
                        double dx = x - cx, dy = y - cy;
                        if (dx * dx + dy * dy > r * r) continue;
                        var i = y * w + x;
                        if (Prawda(ever[i]) && tick - lastSeen[i] <= MEM_SPAN) continue;
                        ever[i] = 1;
                        mem[i] = tile[i];
                        lastSeen[i] = tick;
                        done++;
                    }
                }
            }
            unknown = Math.Max(0, unknown - done);
            return done;
        }

        /// <summary>
        /// Stworzenie rozgląda się dookoła. Wiesz o sobie tyle, ile wiedzą ci, co w tobie
        /// mieszkają — więc to jedyny sposób, w jaki rysunek twojego ciała się uzupełnia.
        /// (Współrzędne mogą być ułamkowe — wtedy, jak w JS, zapisy pod ułamkowy indeks przepadają.)
        /// </summary>
        public double observe(double cx, double cy, double r, double tick)
        {
            double fresh = 0;
            var r2 = r * r;
            double x0 = Math.Max(0, cx - r), x1 = Math.Min(w - 1, cx + r);
            double y0 = Math.Max(0, cy - r), y1 = Math.Min(h - 1, cy + r);
            for (var y = y0; y <= y1; y++)
            {
                var dy = y - cy;
                for (var x = x0; x <= x1; x++)
                {
                    var dx = x - cx;
                    if (dx * dx + dy * dy > r2) continue;
                    var i = y * w + x;
                    mem[i] = tile[i];
                    lastSeen[i] = tick;
                    if (!Prawda(ever[i])) { ever[i] = 1; fresh++; }
                }
            }
            return fresh;
        }
    }
}
