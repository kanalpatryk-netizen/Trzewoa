// Port: alpha-1/src/render/engrave.ts — rycina świata (domyślny rysunek góry) i fresk (ustawienia → „Rysunek świata”).
// Liczona na procesorze, piksel po pikselu, tymi samymi wzorami co w TS (wynik piksel w piksel jak w grze TS — test
// RycinaTesty); wiersze kafli liczą się równolegle na wszystkich rdzeniach. Wynik to bajty RGBA (`dane` — rycina,
// `edane` — same źródła światła do poświaty), które gra albo silnik wgrywa jako teksturę.
//
// Różnice wobec TS (świadome):
//  - bez „zgrubnej odbitki” (co drugi piksel przy pierwszej klatce dużej płyty, dopracowywanej w budżecie czasu) —
//    tu każda odbitka jest od razu pełna, bo liczy się na wszystkich rdzeniach;
//  - rycina liczy się w wątku głównym gry, równolegle (TS: osobny wątek przeglądarki — Rycina.cs, uwagi).
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using Trzewia.Js;
using Trzewia.Nastawy;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyWygladFreskSwiata;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyWygladRycina;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    /// <summary>Kamera ryciny: środek (kafle), przybliżenie (px na kafel) i rozmiar widoku (px logiczne).</summary>
    public struct KameraRyciny
    {
        public double x, y, zoom, vw, vh;
        public KameraRyciny(double x, double y, double zoom, double vw, double vh) { this.x = x; this.y = y; this.zoom = zoom; this.vw = vw; this.vh = vh; }
        public static KameraRyciny Z(Camera c) => new KameraRyciny(c.x, c.y, c.zoom, c.vw, c.vh);
        public bool TakaSama(KameraRyciny b) => x == b.x && y == b.y && zoom == b.zoom && vw == b.vw && vh == b.vh;
    }

    /// <summary>Granice warstw góry w każdej kolumnie (rząd, w którym zaczyna się środkowa i głęboka).</summary>
    public sealed class GraniceWarstw { public float[] g1 = Array.Empty<float>(), g2 = Array.Empty<float>(); }

    public sealed class Engraver
    {
        // ------------------------------------------------------------------ stałe (nastawy/wyglad/rycina.ts)
        static Typ_RYCINA_SWIATA RS => RYCINA_SWIATA;
        static Typ_SWIATLO_RYCINY SR => SWIATLO_RYCINY;
        static Typ_FRESK_SWIATA FS => FRESK_SWIATA;
        /// <summary>Powyżej TONE_MAX linie zlewają się w kleks i cały kamień ma jedną wartość.</summary>
        static double TONE_MAX => TON_MAX;

        /// <summary>Kreskowanie materiału (H[mat]) albo null.</summary>
        static Kreskowanie? H(int mat) => MATERIALY.TryGetValue(mat, out var h) ? h : null;
        static double[]? BAZA(int mat) => MASA.TryGetValue(mat, out var b) ? b : null;

        /// <summary>Okno kafli, dla którego rycina liczy światło i pola pomocnicze (z zapasem pięciu kafli na stronę).</summary>
        public static (int x0, int y0, int tilesX, int tilesY) oknoKafli(KameraRyciny cam, double aw, double ah, double scale)
        {
            var zoom = cam.zoom / scale;
            var tilesX = Math.Ceiling(aw / zoom) + 10;
            var tilesY = Math.Ceiling(ah / zoom) + 10;
            return ((int)Math.Floor(cam.x - tilesX / 2), (int)Math.Floor(cam.y - tilesY / 2), (int)tilesX, (int)tilesY);
        }

        /// <summary>Kamień skorupy pomnika (poza ramą płyty) rysuje się jak głęboka skała — mur widać tylko wokół komory.</summary>
        static bool skorupaJakSkala(World w, double wx, double wy)
        {
            var rama = SWIAT.warstwy.rama;
            if (wx < rama || wx >= w.w - rama || wy >= w.h - rama) return false;
            double dx = (wx - w.coreX) / (RDZEN.skorupaX + 1), dy = (wy - w.coreY) / (RDZEN.skorupaY + 1);
            return dx * dx + dy * dy <= 1;
        }

        /// <summary>Stałe ziarno faktur ryciny (płaty skały, szum papieru, szkic sinopii): ten sam papier w każdej partii.</summary>
        sealed class Losowe
        {
            uint a;
            public Losowe(uint ziarno) { a = ziarno; }
            public double Dalej()
            {
                a = unchecked(a + 0x6d2b79f5u);
                int t = (int)a;
                t = unchecked((t ^ (int)((uint)t >> 15)) * (t | 1));
                t ^= unchecked(t + (t ^ (int)((uint)t >> 7)) * (t | 61));
                return (uint)(t ^ (int)((uint)t >> 14)) / 4294967296.0;
            }
        }

        static readonly double PLAT_OCZKO = RS.platy.oczko, PLAT_IOCZKO = 1 / RS.platy.oczko;
        /// <summary>Ziarna płatów skały: po jednym w każdej komórce siatki 64×64 (położenie w komórce, kąt, jasność).</summary>
        static readonly float[] VOR_X = new float[4096], VOR_Y = new float[4096], VOR_K = new float[4096], VOR_J = new float[4096];

        static Engraver()
        {
            var los = new Losowe(0x7a3f19);
            for (int i = 0; i < 4096; i++)
            {
                VOR_X[i] = (float)(0.12 + los.Dalej() * 0.76);
                VOR_Y[i] = (float)(0.12 + los.Dalej() * 0.76);
                VOR_K[i] = (float)RS.platy.katy[(int)(los.Dalej() * RS.platy.katy.Length)];
                VOR_J[i] = (float)((los.Dalej() * 2 - 1) * RS.platy.jasnosc);
            }
        }

        /// <summary>Czerwień głębi: 0 nad `RS.czerwienOd`, 1 na samym dnie — skała przy krypcie żarzy się.</summary>
        static double czerwienGlebi(double depth)
        {
            var c = (depth - RS.czerwienOd) / (1 - RS.czerwienOd);
            return c <= 0 ? 0 : c >= 1 ? 1 : c * c * (3 - 2 * c);
        }

        /// <summary>Czerwień tylko przy pomniku: 1 nad kryptą, 0 dalej w bok niż `RS.czerwienZasieg` skorup.</summary>
        static double czerwienPrzyPomniku(World w, double wx)
        {
            var c = (Math.Abs(wx - w.coreX) - RDZEN.skorupaX) / (RDZEN.skorupaX * (RS.czerwienZasieg - 1));
            return c <= 0 ? 1 : c >= 1 ? 0 : 1 - c * c * (3 - 2 * c);
        }

        /// <summary>Barwa masy, barwa kreski i ton materiału na danej głębokości (7 liczb od `o`).</summary>
        static void barwyMaterialu(int mat, double depth, double przyPomniku, float[] @out, int o)
        {
            var baza = BAZA(mat);
            var hat = H(mat);
            var tint = hat?.tint;
            var cz = czerwienGlebi(depth) * przyPomniku;
            // żar głębi: masa czerwienieje, a chłód łupka z niej uchodzi (zamiast różu z błękitu)
            @out[o] = (float)((baza != null ? baza[0] : 26) + cz * 26);
            @out[o + 1] = (float)((baza != null ? baza[1] : 21) - cz * 5);
            @out[o + 2] = (float)((baza != null ? baza[2] : 18) - cz * 9);
            double kr = tint != null ? tint[0] : 196, kg = tint != null ? tint[1] : 176, kb = tint != null ? tint[2] : 150;
            double cc = cz * 0.55;
            var CK = RS.czerwienKreski;
            @out[o + 3] = (float)(kr + (CK[0] - kr) * cc);
            @out[o + 4] = (float)(kg + (CK[1] - kg) * cc);
            @out[o + 5] = (float)(kb + (CK[2] - kb) * cc);
            @out[o + 6] = (float)(hat != null ? hat.tone : 0.2);
        }

        /// <summary>Warstwa skały dla barwy nieznanego, w które gaśnie pamięć: płytka, środkowa, głęboka, kamień.</summary>
        static int warstwaMaterialu(int mat) => mat == T.MIEKKA || mat == T.SOIL ? 0 : mat == T.TWARDA ? 2 : mat == T.STONE ? 3 : 1;

        static readonly ConditionalWeakTable<World, GraniceWarstw> graniceSwiata = new ConditionalWeakTable<World, GraniceWarstw>();

        /// <summary>
        /// Granice warstw góry w każdej kolumnie, gładkie jak linia rylca, nie schodki z kafli. Liczone raz na świat — z kafli,
        /// zanim ktokolwiek je przekopie.
        /// </summary>
        public static GraniceWarstw? graniceWarstw(World w)
        {
            if (!SWIAT.warstwy.wlaczone) return null;
            if (graniceSwiata.TryGetValue(w, out var jest)) return jest;
            int W = (int)w.w, Hh = (int)w.h;
            var g1 = new float[W]; var g2 = new float[W];
            for (int x = 0; x < W; x++) { g1[x] = float.NaN; g2[x] = float.NaN; }
            var tile = w.tile.d;
            for (int x = 0; x < W; x++)
            {
                int ostatniaMiekka = -1, pierwszaTwarda = -1;
                for (int y = (int)World.SURFACE_Y; y < Hh; y++)
                {
                    var t = tile[y * W + x];
                    if (t == T.MIEKKA) ostatniaMiekka = y;
                    else if (t == T.TWARDA && pierwszaTwarda < 0) pierwszaTwarda = y;
                }
                if (ostatniaMiekka >= 0) g1[x] = ostatniaMiekka + 1;
                if (pierwszaTwarda >= 0) g2[x] = pierwszaTwarda;
            }
            // dziury (kolumny ramy, przekopane) — z sąsiadów; potem dwa razy wygładzić
            foreach (var g in new[] { g1, g2 })
            {
                var ost = float.NaN;
                for (int x = 0; x < W; x++) if (float.IsNaN(g[x])) g[x] = ost; else ost = g[x];
                ost = float.NaN;
                for (int x = W - 1; x >= 0; x--) if (float.IsNaN(g[x])) g[x] = ost; else ost = g[x];
                for (int x = 0; x < W; x++) if (float.IsNaN(g[x])) g[x] = (float)(w.h * 2);
                var tmp = new float[W];
                for (int p = 0; p < 2; p++)
                {
                    for (int x = 0; x < W; x++)
                    {
                        double s = 0; int n = 0;
                        for (int d = -2; d <= 2; d++) { var xx = x + d; if (xx >= 0 && xx < W) { s += g[xx]; n++; } }
                        tmp[x] = (float)(s / n);
                    }
                    Array.Copy(tmp, g, W);
                }
            }
            var wynik = new GraniceWarstw { g1 = g1, g2 = g2 };
            graniceSwiata.AddOrUpdate(w, wynik);
            return wynik;
        }

        /// <summary>Fresk: pigment materiału na danej głębokości i barwa jego świetlika — 7 liczb od `o`.</summary>
        static void pigmentFresku(int mat, double depth, float[] @out, int o)
        {
            var a = depth < 0.5 ? depth * 2 : (depth - 0.5) * 2;
            var p0 = depth < 0.5 ? FS.gora : FS.srodek; var p1 = depth < 0.5 ? FS.srodek : FS.dno;
            double r = p0[0] + (p1[0] - p0[0]) * a, g = p0[1] + (p1[1] - p0[1]) * a, b = p0[2] + (p1[2] - p0[2]) * a;
            if (FS.materialy.TryGetValue(mat, out var m) && m != null) { r += (m.barwa[0] - r) * m.wlasny; g += (m.barwa[1] - g) * m.wlasny; b += (m.barwa[2] - b) * m.wlasny; }
            @out[o] = (float)r; @out[o + 1] = (float)g; @out[o + 2] = (float)b;
            @out[o + 3] = (float)(FS.swietlik[0] * 0.8 + r * 0.2);
            @out[o + 4] = (float)(FS.swietlik[1] * 0.8 + g * 0.2);
            @out[o + 5] = (float)(FS.swietlik[2] * 0.8 + b * 0.2);
            @out[o + 6] = 0.5f;
        }

        /// <summary>Parametry kreski dla jednego materiału — liczone raz na kafel, nie raz na piksel.</summary>
        sealed class Kreska
        {
            public int mat; public double toneC, sp = 4.2, cross = 0.6, stip;
            public double tr, tg, tb, br, bg, bb;
        }

        /// <summary>Zapis do Uint8ClampedArray: obcięcie do 0..255 i zaokrąglenie połówek do parzystej (NaN → 0).</summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static byte C8(double v)
        {
            if (!(v > 0)) return 0;
            if (v >= 255) return 255;
            return (byte)Math.Round(v, MidpointRounding.ToEven);
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static int I(double v) => (int)v;

        /// <summary>Math.round z JS (połówki w górę).</summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static double Rnd(double v) => Math.Floor(v + 0.5);

        // ------------------------------------------------------------------ stan

        /// <summary>Rycina: RGBA (alfa 255), aw × ah.</summary>
        public byte[] dane = new byte[16];
        /// <summary>Same źródła światła (do poświaty): RGBA, alfa prosta (jak ImageData w TS).</summary>
        public byte[] edane = new byte[16];
        /// <summary>Światło ludu: po pięć liczb na źródło — środek x, y (kafle), promień, moc i zasięg w litej skale.</summary>
        public double[] zrodla = Array.Empty<double>();
        /// <summary>Przedziały równego gruntu pod grzbietem góry (Grzbiet.rowneW) — od wołającego.</summary>
        public RowneGrzbietu? rowne;
        public int aw = 1, ah = 1;
        public double scale = 1;
        /// <summary>Numer odbitki: rośnie z każdym przerysowaniem — poświata rozmywa obraz tylko wtedy, gdy jest nowy.</summary>
        public int wersja;
        /// <summary>Przesunięcie bufora na płycie (px płyty, od −1 do 0): rycina leży na siatce pikseli świata.</summary>
        public double dx, dy;
        /// <summary>W TS — zgrubna odbitka dopracowywana przez kilka klatek; tu odbitka jest zawsze pełna.</summary>
        public bool niedokonczona => false;
        /// <summary>Świat kreskowany jak rycina (domyślnie) albo malowany jak fresk.</summary>
        public bool fresk;

        readonly float[] noise = new float[256 * 256];
        /// <summary>Szum gładki — papier drze się płatami, nie pikselami.</summary>
        readonly float[] smooth = new float[256 * 256];
        /// <summary>Ziarno papieru pod nieznanym (0..1): gotowa mieszanka szumu gładkiego i drobnego.</summary>
        readonly float[] ziarno = new float[256 * 256];
        /// <summary>Szkic sinopii pod nieznanym (fresk): poziomice dużego, gładkiego szumu (0..1 na teksel).</summary>
        readonly float[] szkic = new float[256 * 256];
        readonly float[] cosT = new float[257], sinT = new float[257];

        float[] fresh = new float[1], freshB = new float[1];
        /// <summary>Kąt kreskowania per kafel, wygładzany.</summary>
        float[] angle = new float[1], angleB = new float[1];
        /// <summary>Światło samych kafli (ogień, grzybnia, Znak) — tylko ono idzie do poświaty.</summary>
        float[] light = new float[1];
        /// <summary>Całe światło na rysunku: kafle i do tego lampki ludu, jasna sala, gotowe pomieszczenia.</summary>
        float[] swiatlo = new float[1];
        /// <summary>Bliskość jaskini dla skały: 1 przy samej krawędzi, 0 w głębi masy.</summary>
        float[] bliskosc = new float[1];
        byte[] odl = new byte[1];
        /// <summary>Otwartość pustki: 0 przy ścianie, 1 kilka kafli od niej.</summary>
        float[] otwarcie = new float[1];
        /// <summary>Strop nad pustką: 0 tuż pod skałą, 1 trzy kafle niżej.</summary>
        float[] strop = new float[1];
        /// <summary>Poziom magmy i wody w kaflu 0..1.</summary>
        float[] magmaP = new float[1], wodaP = new float[1];
        /// <summary>Twardość kafla (1 skała, 0 przejście) i kafel, jaki się rysuje (prawdziwy albo zapamiętany).</summary>
        float[] sol = new float[1];
        byte[] rys = new byte[1];
        /// <summary>Barwy materiałów (7 na kafel) i ich średnie w narożnikach kafli.</summary>
        float[] matK = new float[7], rogK = new float[7];
        /// <summary>1 = kafel leży na styku materiałów i potrzebuje miękkiego przejścia.</summary>
        byte[] miek = new byte[1];
        /// <summary>Kolumny ekranu: x świata, granice warstw i falowanie spoin — raz na przerysowanie.</summary>
        float[] kolX = new float[1], kolG1 = new float[1], kolG2 = new float[1], kolFala = new float[1], kolGrzbiet = new float[1], kolDX = new float[1];
        byte[] kolRama = new byte[1];
        float[] wierszDY = new float[1], wierszWy = new float[1];
        byte[] wierszRama = new byte[1];

        /// <summary>Pamięć poprzedniej odbitki: klucz wejść każdego kafla i położenie siatki.</summary>
        bool odbitkaWazna;
        double pZoom, pOx, pOy, pKontrast;
        World? pSwiat;
        uint[] klucz = new uint[1], pKlucz = new uint[1];
        int pLx0, pLy0, pLw, pLh;
        /// <summary>1 = kafel (albo któreś z jego wejść) zmienił się od poprzedniej odbitki albo płynie.</summary>
        byte[] zmiana = new byte[1];
        int lw, lh, lx0, ly0;
        /// <summary>
        /// Materiał „drugiej kreski” (pB w TS) z ostatniego przerysowanego kafla na brzegu skały: w TS to stan obiektu, który
        /// pustka bez skały wokół dziedziczy po poprzednim kaflu (barwa półmroku dawno widzianej jaskini) — tu przenoszony tak samo.
        /// </summary>
        int ostatniMatB;

        public Engraver()
        {
            for (int i = 0; i <= 256; i++)
            {
                var a = -1.8 + (i / 256.0) * 3.6;
                cosT[i] = (float)JsMath.Cos(a);
                sinT[i] = (float)JsMath.Sin(a);
            }
            var los = new Losowe(0x51c0de);
            for (int i = 0; i < noise.Length; i++) noise[i] = (float)los.Dalej();
            const int G = 32; const double cell = 256.0 / G;
            var grid = new float[G * G];
            for (int i = 0; i < grid.Length; i++) grid[i] = (float)los.Dalej();
            for (int y = 0; y < 256; y++)
                for (int x = 0; x < 256; x++)
                {
                    double gx = x / cell, gy = y / cell;
                    int x0 = (int)Math.Floor(gx) % G, y0 = (int)Math.Floor(gy) % G;
                    int x1 = (x0 + 1) % G, y1 = (y0 + 1) % G;
                    double fx = gx - Math.Floor(gx), fy = gy - Math.Floor(gy);
                    double sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
                    double a = grid[y0 * G + x0], b = grid[y0 * G + x1];
                    double c = grid[y1 * G + x0], d = grid[y1 * G + x1];
                    double top = a + (b - a) * sx, bot = c + (d - c) * sx;
                    smooth[(y << 8) | x] = (float)(top + (bot - top) * sy);
                }
            // ziarno papieru: płaty i drobny piasek — jedna tablica zamiast dwóch odczytów na piksel
            for (int y = 0; y < 256; y++)
                for (int x = 0; x < 256; x++)
                    ziarno[(y << 8) | x] = (float)(smooth[(((y * 2) & 255) << 8) | ((x * 2) & 255)] * 0.6 + noise[(y << 8) | x] * 0.4);
            // szkic sinopii: kilka poziomic szumu o dużym oczku — kreślone pędzlem linie, nie siatka
            const int G2 = 8; const double cell2 = 256.0 / G2;
            var grid2 = new float[G2 * G2];
            for (int i = 0; i < grid2.Length; i++) grid2[i] = (float)los.Dalej();
            for (int y = 0; y < 256; y++)
                for (int x = 0; x < 256; x++)
                {
                    double gx = x / cell2, gy = y / cell2;
                    int x0 = (int)Math.Floor(gx) % G2, y0 = (int)Math.Floor(gy) % G2;
                    int x1 = (x0 + 1) % G2, y1 = (y0 + 1) % G2;
                    double fx = gx - Math.Floor(gx), fy = gy - Math.Floor(gy);
                    double sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
                    double a = grid2[y0 * G2 + x0], b = grid2[y0 * G2 + x1];
                    double c = grid2[y1 * G2 + x0], d = grid2[y1 * G2 + x1];
                    double t = a + (b - a) * sx, u = c + (d - c) * sx;
                    double v = t + (u - t) * sy;
                    double k = 0;
                    foreach (var poziom in new[] { 0.32, 0.5, 0.68 })
                    {
                        var odl = Math.Abs(v - poziom) / 0.012;
                        if (odl < 1) k = Math.Max(k, 1 - odl);
                    }
                    szkic[(y << 8) | x] = (float)k;
                }
        }

        /// <summary>Rozmiar widoku (px logiczne); `skala` — co ile pikseli ekranu jeden piksel ryciny.</summary>
        public void resize(double vw, double vh, double? skala = null)
        {
            scale = skala ?? skalaRenderu(vw);
            // piksel zapasu: rycina jest przyklejona do siatki pikseli świata i rysowana z przesunięciem do −1 px
            aw = (int)Math.Max(2, Math.Ceiling(vw / scale) + 1);
            ah = (int)Math.Max(2, Math.Ceiling(vh / scale) + 1);
            odbitkaWazna = false;
            wersja++;
            dane = new byte[aw * ah * 4];
            edane = new byte[aw * ah * 4];
            kolX = new float[aw]; kolG1 = new float[aw]; kolG2 = new float[aw]; kolFala = new float[aw];
            kolGrzbiet = new float[aw]; kolDX = new float[aw]; kolRama = new byte[aw];
            wierszDY = new float[ah]; wierszRama = new byte[ah]; wierszWy = new float[ah];
        }

        // ------------------------------------------------------------------ światło

        /// <summary>Światło jest wyłącznie diegetyczne: ogień, termika, biolumina.</summary>
        void computeLight(World w, double tick, KameraRyciny cam)
        {
            var (x0, y0, tilesX, tilesY) = oknoKafli(cam, aw, ah, scale);
            if (lw != tilesX || lh != tilesY)
            {
                lw = tilesX; lh = tilesY;
                int n = tilesX * tilesY;
                light = new float[n]; swiatlo = new float[n]; otwarcie = new float[n]; strop = new float[n];
                fresh = new float[n]; freshB = new float[n]; angle = new float[n]; angleB = new float[n];
                bliskosc = new float[n]; odl = new byte[n]; magmaP = new float[n]; wodaP = new float[n];
                sol = new float[n]; rys = new byte[n]; matK = new float[n * 7]; rogK = new float[n * 7]; miek = new byte[n];
            }
            lx0 = x0; ly0 = y0;
            var L = light; var F = fresh;
            Array.Clear(L, 0, L.Length);
            var gr = graniceWarstw(w);
            int W = (int)w.w, Hh = (int)w.h;
            var tileA = w.tile.d; var waterA = w.water.d; var magmaA = w.magma.d; var everA = w.ever.d; var memA = w.mem.d;
            var sladA = w.slad.d; var lastSeenA = w.lastSeen.d; var surfaceA = w.surface.d;
            var PASS = Tiles.PASSABLE.d;
            bool inb(int x, int y) => x >= 0 && y >= 0 && x < W && y < Hh;

            for (int y = 0; y < tilesY; y++)
            {
                int wy = y0 + y;
                for (int x = 0; x < tilesX; x++)
                {
                    int wx = x0 + x;
                    int k = y * tilesX + x;
                    if (!inb(wx, wy)) { F[k] = 0; magmaP[k] = 0; wodaP[k] = 0; continue; }
                    int i = wy * W + wx;
                    double age = tick - lastSeenA[i];
                    // to, co zrobiła twoja ręka, nie blaknie do zera; jasna sala i oba szyby nad nią są zawsze na widoku
                    var dW = Shafts.odWidoku(w, wx, wy);
                    double podstawa = wy <= surfaceA[wx] + 1 || dW == 0 ? 1
                        : (everA[i] != 0 ? Math.Max(0, 1 - age / World.MEM_SPAN) : 0);
                    // wokół nich pamięć gaśnie łagodnie przez kilka kafli; poniżej 0,82, więc nigdy niewidziany kafel
                    // rysuje się tam jako lita skała warstwy, nie zdradza jaskiń
                    if (podstawa < 0.8)
                    {
                        var ws = 0.8 - dW * 0.16;
                        if (ws > podstawa) podstawa = ws;
                    }
                    F[k] = (float)(sladA[i] != 0 ? Math.Max(0.42, podstawa) : podstawa);
                    int t = tileA[i];
                    magmaP[k] = (float)(magmaA[i] > 0 ? 0.55 + magmaA[i] / 8.0 * 0.45 : 0);
                    wodaP[k] = (float)(waterA[i] > 0 && PASS[t] == 1 ? 0.5 + waterA[i] / 8.0 * 0.5 : 0);
                    // jeden rylec na warstwę; własny mają tylko kamień nie do ruszenia i kryształ
                    int wlasny = (t == T.STONE && !skorupaJakSkala(w, wx, wy)) || t == T.CRYSTAL ? t
                        : gr != null ? (wy < gr.g1[wx] ? T.MIEKKA : wy < gr.g2[wx] ? T.ROCK : T.TWARDA) : t;
                    var hh = H(wlasny);
                    angle[k] = (float)(hh != null ? hh.ang : 1.36);
                    double e = 0;
                    if (magmaA[i] > 0) e = 0.4 + magmaA[i] / 8.0 * 0.32;
                    else if (t == T.FORGE) e = 0.85;
                    else if (t == T.GLYPH) e = 0.8;
                    else if (t == T.CORE) e = 0.5;
                    else if (t == T.FUNGUS) e = 0.3;
                    else if (t == T.CRYSTAL) e = 0.12;
                    else if (t == T.SHRINE) e = 0.12;
                    else if (wy < 16) e = Math.Max(e, 0.22 - wy * 0.012);
                    if (e > L[k]) L[k] = (float)e;
                }
            }
            // kąt rozmywany razem z resztą — granica materiału ma być przejściem, nie szwem
            {
                var AB = angleB; var A = angle;
                for (int y = 0; y < tilesY; y++)
                    for (int x = 0; x < tilesX; x++)
                    {
                        int k = y * tilesX + x;
                        double sum = A[k] * 2.0; int cnt = 2;
                        if (x > 0) { sum += A[k - 1]; cnt++; }
                        if (x < tilesX - 1) { sum += A[k + 1]; cnt++; }
                        if (y > 0) { sum += A[k - tilesX]; cnt++; }
                        if (y < tilesY - 1) { sum += A[k + tilesX]; cnt++; }
                        AB[k] = (float)((sum / cnt) * 0.45 + A[k] * 0.55);
                    }
                Array.Copy(AB, A, A.Length);
            }
            // najpierw domykanie: zapominać ma się całymi obszarami, nie punktami
            var FB = freshB;
            for (int y = 0; y < tilesY; y++)
                for (int x = 0; x < tilesX; x++)
                {
                    int k = y * tilesX + x;
                    var m = F[k];
                    if (x > 0 && F[k - 1] > m) m = F[k - 1];
                    if (x < tilesX - 1 && F[k + 1] > m) m = F[k + 1];
                    if (y > 0 && F[k - tilesX] > m) m = F[k - tilesX];
                    if (y < tilesY - 1 && F[k + tilesX] > m) m = F[k + tilesX];
                    FB[k] = m;
                }
            Array.Copy(FB, F, F.Length);
            for (int pass = 0; pass < 2; pass++)
            {
                for (int y = 0; y < tilesY; y++)
                    for (int x = 0; x < tilesX; x++)
                    {
                        int k = y * tilesX + x;
                        double sum = F[k] * 2.0; int cnt = 2;
                        if (x > 0) { sum += F[k - 1]; cnt++; }
                        if (x < tilesX - 1) { sum += F[k + 1]; cnt++; }
                        if (y > 0) { sum += F[k - tilesX]; cnt++; }
                        if (y < tilesY - 1) { sum += F[k + tilesX]; cnt++; }
                        FB[k] = (float)(sum / cnt);
                    }
                Array.Copy(FB, F, F.Length);
            }

            // co się rysuje: dobrze widziane — prawda, dawno widziane — pamięć, nieznane — lita skała
            var S = sol; var R = rys;
            double ramaW = SWIAT.warstwy.rama, czapaOdW = World.SURFACE_Y + SWIAT.warstwy.ziemia;
            double czapaDoW = w.salaOltarza.x1 >= 0 ? w.salaOltarza.y0 : -1e6;
            for (int y = 0; y < tilesY; y++)
                for (int x = 0; x < tilesX; x++)
                {
                    int k = y * tilesX + x;
                    int wx = x0 + x, wy = y0 + y;
                    // nad światem niebo ciągnie się dalej
                    if (wy < 0 && wx >= 0 && wx < W) { R[k] = T.SKY; S[k] = 0; continue; }
                    if (!inb(wx, wy) || F[k] <= 0.01) { R[k] = T.ROCK; S[k] = 1; continue; }
                    int i = wy * W + wx;
                    // nigdy niewidziane: lita skała swojej warstwy; w czapie i ramie — kamień
                    bool kamienny = gr != null && (wy >= czapaOdW && wy < czapaDoW || wx < ramaW || wx >= W - ramaW || wy >= Hh - ramaW);
                    int t = F[k] > 0.82 ? tileA[i] : everA[i] != 0 ? memA[i]
                        : kamienny ? T.STONE : gr != null ? (wy < gr.g1[wx] ? T.MIEKKA : wy < gr.g2[wx] ? T.ROCK : T.TWARDA) : T.ROCK;
                    // wyloty szybów nad powierzchnią to niebo
                    if (wy < World.SURFACE_Y && PASS[t] == 1) t = T.SKY;
                    else if (t == T.STONE && skorupaJakSkala(w, wx, wy)) t = T.TWARDA;
                    R[k] = (byte)t;
                    S[k] = PASS[t] == 1 ? 0 : 1;
                }
            // odległość skały od najbliższej (narysowanej) pustki, do 5 kafli — dwa przejścia jak w mapie odległości
            var O = odl; var B = bliskosc;
            for (int k = 0; k < O.Length; k++) O[k] = (byte)(S[k] == 1 ? 5 : 0);
            OdlegloscDwaPrzejscia(O, tilesX, tilesY);
            for (int k = 0; k < O.Length; k++) B[k] = (float)(O[k] == 0 ? 1 : Math.Max(0, (5 - O[k]) / 4.0));

            // otwartość pustki: odległość od najbliższej skały (do 4 kafli)
            var OA = otwarcie;
            for (int k = 0; k < OA.Length; k++) OA[k] = S[k] == 1 ? 0 : 9;
            for (int pass = 0; pass < 2; pass++)
            {
                bool fwd = pass == 0;
                for (int yy = 0; yy < tilesY; yy++)
                {
                    int y = fwd ? yy : tilesY - 1 - yy;
                    for (int xx = 0; xx < tilesX; xx++)
                    {
                        int x = fwd ? xx : tilesX - 1 - xx;
                        int k = y * tilesX + x;
                        var m = OA[k];
                        if (m == 0) continue;
                        if (x > 0 && OA[k - 1] + 1 < m) m = OA[k - 1] + 1;
                        if (x < tilesX - 1 && OA[k + 1] + 1 < m) m = OA[k + 1] + 1;
                        if (y > 0 && OA[k - tilesX] + 1 < m) m = OA[k - tilesX] + 1;
                        if (y < tilesY - 1 && OA[k + tilesX] + 1 < m) m = OA[k + tilesX] + 1;
                        OA[k] = m;
                    }
                }
            }
            for (int k = 0; k < OA.Length; k++) { var v = (OA[k] - 0.3) / 2.6; OA[k] = (float)(v <= 0 ? 0 : v >= 1 ? 1 : v); }
            var ST = strop;
            for (int x = 0; x < tilesX; x++)
            {
                int pod = 0;
                for (int y = 0; y < tilesY; y++)
                {
                    int k = y * tilesX + x;
                    if (S[k] == 1) { pod = 0; ST[k] = 0; continue; }
                    pod++;
                    ST[k] = (float)(pod >= 4 ? 1 : (pod - 0.5) / 3.5);
                }
            }

            // barwy materiałów i ich średnie w narożnikach — tylko z litych kafli
            var MK = matK; var RK = rogK;
            for (int y = 0; y < tilesY; y++)
            {
                int wy = y0 + y;
                var d = w.depth(wy);
                for (int x = 0; x < tilesX; x++)
                {
                    int k = y * tilesX + x;
                    if (S[k] != 1) continue;
                    if (fresk) pigmentFresku(R[k], d, MK, k * 7);
                    else barwyMaterialu(R[k], d, czerwienPrzyPomniku(w, x0 + x), MK, k * 7);
                }
            }
            Span<double> suma7 = stackalloc double[7];
            for (int y = 0; y < tilesY; y++)
                for (int x = 0; x < tilesX; x++)
                {
                    int k = y * tilesX + x;
                    int n = 0;
                    int o = k * 7;
                    // (w TS: Float32Array — każde dodanie zaokrąglane do float32)
                    for (int c = 0; c < 7; c++) RK[o + c] = 0;
                    for (int dy = -1; dy <= 0; dy++)
                        for (int dx = -1; dx <= 0; dx++)
                        {
                            int xx = x + dx, yy = y + dy;
                            if (xx < 0 || yy < 0) continue;
                            int j = yy * tilesX + xx;
                            if (S[j] != 1) continue;
                            n++;
                            for (int c = 0; c < 7; c++) RK[o + c] = (float)(RK[o + c] + (double)MK[j * 7 + c]);
                        }
                    if (n > 1) for (int c = 0; c < 7; c++) RK[o + c] = (float)(RK[o + c] / (double)n);
                }
            var MI = miek;
            Array.Clear(MI, 0, MI.Length);
            for (int y = 0; y < tilesY - 1; y++)
                for (int x = 0; x < tilesX - 1; x++)
                {
                    int k = y * tilesX + x;
                    if (S[k] != 1) continue;
                    int o = k * 7, c10 = o + 7, c01 = o + tilesX * 7, c11 = c01 + 7;
                    for (int c = 0; c < 7; c++)
                    {
                        double v = MK[o + c], e = c == 6 ? 0.01 : 1.5;
                        if (Math.Abs(RK[o + c] - v) > e || Math.Abs(RK[c10 + c] - v) > e || Math.Abs(RK[c01 + c] - v) > e || Math.Abs(RK[c11 + c] - v) > e) { MI[k] = 1; break; }
                    }
                }

            // dwa przejścia zamiast prawdziwej propagacji — na oko nie widać różnicy
            for (int pass = 0; pass < 2; pass++)
            {
                bool fwd = pass == 0;
                for (int yy = 0; yy < tilesY; yy++)
                {
                    int y = fwd ? yy : tilesY - 1 - yy;
                    for (int xx = 0; xx < tilesX; xx++)
                    {
                        int x = fwd ? xx : tilesX - 1 - xx;
                        int k = y * tilesX + x;
                        int wx = x0 + x, wy = y0 + y;
                        double att = inb(wx, wy) && PASS[tileA[wy * W + wx]] == 1 ? 0.085 : 0.30;
                        double m = L[k];
                        if (x > 0) m = Math.Max(m, L[k - 1] - att);
                        if (x < tilesX - 1) m = Math.Max(m, L[k + 1] - att);
                        if (y > 0) m = Math.Max(m, L[k - tilesX] - att);
                        if (y < tilesY - 1) m = Math.Max(m, L[k + tilesX] - att);
                        L[k] = (float)m;
                    }
                }
            }
            swiatloLudu(w, x0, y0, tilesX, tilesY);
        }

        static void OdlegloscDwaPrzejscia(byte[] O, int tilesX, int tilesY)
        {
            for (int pass = 0; pass < 2; pass++)
            {
                bool fwd = pass == 0;
                for (int yy = 0; yy < tilesY; yy++)
                {
                    int y = fwd ? yy : tilesY - 1 - yy;
                    for (int xx = 0; xx < tilesX; xx++)
                    {
                        int x = fwd ? xx : tilesX - 1 - xx;
                        int k = y * tilesX + x;
                        int m = O[k];
                        if (m == 0) continue;
                        if (x > 0 && O[k - 1] + 1 < m) m = O[k - 1] + 1;
                        if (x < tilesX - 1 && O[k + 1] + 1 < m) m = O[k + 1] + 1;
                        if (y > 0 && O[k - tilesX] + 1 < m) m = O[k - tilesX] + 1;
                        if (y < tilesY - 1 && O[k + tilesX] + 1 < m) m = O[k + tilesX] + 1;
                        O[k] = (byte)m;
                    }
                }
            }
        }

        /// <summary>
        /// Światło, które niesie lud i jego miejsca: lampki, siedziba, obozy, jasna sala z ołtarzem i gotowe pomieszczenia.
        /// Miękkie koła bez cieni — te same plamy, które wycina mrok.
        /// </summary>
        void swiatloLudu(World w, int x0, int y0, int tilesX, int tilesY)
        {
            var L = light; var LT = swiatlo; var O = odl;
            Array.Copy(L, LT, L.Length);
            /// `wSkale` — najwyżej tyle kafli światło wchodzi w litą skałę (pomieszczenia nie świecą przez strop).
            void plama(double cx, double cy, double r, double moc, double wSkale)
            {
                int xa = (int)Math.Max(0, Math.Floor(cx - r) - x0), xb = (int)Math.Min(tilesX - 1, Math.Ceiling(cx + r) - x0);
                int ya = (int)Math.Max(0, Math.Floor(cy - r) - y0), yb = (int)Math.Min(tilesY - 1, Math.Ceiling(cy + r) - y0);
                var r2 = 1 / (r * r);
                for (int y = ya; y <= yb; y++)
                {
                    var dy = y0 + y + 0.5 - cy;
                    for (int x = xa; x <= xb; x++)
                    {
                        var dx = x0 + x + 0.5 - cx;
                        var d2 = (dx * dx + dy * dy) * r2;
                        if (d2 >= 1) continue;
                        var s = 1 - Math.Sqrt(d2);
                        int k = y * tilesX + x;
                        var skala = double.IsPositiveInfinity(wSkale) || O[k] == 0 ? 1 : Math.Max(0, 1 - O[k] / wSkale);
                        var v = moc * s * s * (3 - 2 * s) * skala;
                        if (v > LT[k]) LT[k] = (float)v;
                    }
                }
            }
            /// Prostokąt w pełnym świetle z miękkim brzegiem (sala, pomieszczenie, szyb dnia).
            void prostokat(double ax, double ay, double bx, double by, double brzeg, double moc)
            {
                int xa = (int)Math.Max(0, Math.Floor(ax - brzeg) - x0), xb = (int)Math.Min(tilesX - 1, Math.Ceiling(bx + brzeg) - x0);
                int ya = (int)Math.Max(0, Math.Floor(ay - brzeg) - y0), yb = (int)Math.Min(tilesY - 1, Math.Ceiling(by + brzeg) - y0);
                for (int y = ya; y <= yb; y++)
                {
                    var cy = y0 + y + 0.5;
                    var dy = cy < ay ? ay - cy : cy > by ? cy - by : 0;
                    for (int x = xa; x <= xb; x++)
                    {
                        var cx = x0 + x + 0.5;
                        var dx = cx < ax ? ax - cx : cx > bx ? cx - bx : 0;
                        var d = Math.Sqrt(dx * dx + dy * dy) / brzeg;
                        if (d >= 1) continue;
                        var s = 1 - d;
                        var v = moc * s * s * (3 - 2 * s);
                        int k = y * tilesX + x;
                        if (v > LT[k]) LT[k] = (float)v;
                    }
                }
            }
            // jasna sala: dzień z szybu nad ołtarzem i świece — cała, nie tylko krąg wokół ołtarza
            var so = w.salaOltarza;
            if (so.x1 >= 0)
            {
                prostokat(so.x0 + 1, so.y0, so.x1, so.y1 + 1, SR.sala.brzeg, SR.sala.moc);
                prostokat(w.szybX - 1, World.SURFACE_Y - 2, w.szybX + 2, so.y0, 2.5, SR.sala.moc * 0.55);
                // węższym szybem, którym zjeżdża wiadro, dnia wpada mniej
                prostokat(w.szybWiadraX, World.SURFACE_Y - 2, w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer, w.szybWiadraDol + 1, 1.5, SR.sala.moc * 0.5);
                plama(w.oltarz.x + 0.5, w.oltarz.y - 1, SR.oltarz.r, SR.oltarz.moc, double.PositiveInfinity);
            }
            // gotowe pomieszczenia, siedziba, obozy i lampki ludu — gotowa lista (RycinaZrodla)
            var Z = zrodla;
            for (int i = 0; i + 4 < Z.Length; i += 5) plama(Z[i], Z[i + 1], Z[i + 2], Z[i + 3], Z[i + 4]);
        }

        // ------------------------------------------------------------------ kreska

        public void rebuild(World w, double tick, KameraRyciny cam, double time)
        {
            wersja++;
            computeLight(w, tick, cam);
            if (fresk)
            {
                Array.Clear(edane, 0, edane.Length);
                dx = 0; dy = 0;
                odbitkaWazna = false;
                malujFresk(w, cam, time);
            }
            else rytujRycine(w, cam, time);
        }

        /// <summary>Pola wspólne dla wszystkich wierszy jednej odbitki ryciny (liczone raz, czytane równolegle).</summary>
        sealed class Odbitka
        {
            public World w = null!;
            public double zoom, izoom, left, top, fala, far, spWide, kontrast, tetno, hwP, hwS, rimW, gW, hwMax, dashF, wSp, iwSp, rysaW;
            public bool plaski, linie, rysyWidac, pelna;
            public int ox, oy, odsX0, odsX1, odsY0, odsY1;
            public GraniceWarstw? gr;
            public double szSila, spSila, spF, szW, rama, ramaP, ramaD, czapaOd, czapaDo, spCo, ciosW;
            public float[] GMR = null!, GMG = null!, GMB = null!;
            public double soX0, soX1, soY0, soY1;
        }

        /// <summary>Kafel do narysowania: położenie i materiał „drugiej kreski”, jaki miałby w TS (stan po poprzednich kaflach).</summary>
        struct KafelDoRysunku { public int tx, matB; }

        /// <summary>Kreska — scratch jednego wiersza kafli (osobny dla każdego wątku).</summary>
        sealed class Brudnopis
        {
            public readonly float[] S9 = new float[9], M9 = new float[9], W9 = new float[9];
            public readonly Kreska pA = new Kreska(), pB = new Kreska();
            public readonly float[] pig = new float[7], kraw = new float[14];
            public readonly float[] PL = new float[6], PLK = new float[3], PLJ = new float[3], PLI = new float[3];
            public readonly byte[] PLR = new byte[3];
            public readonly int[] PID = new int[3];
        }

        /// <summary>
        /// Rycina (domyślny rysunek świata). Pustka jaskini to gładka, ciepła tylna ściana; skała to ciemna masa rytowana
        /// kreską (każda warstwa ma swój rylec); nieznane to półmrok papieru ze szkicem sinopii. Kreska jest wygładzana.
        /// </summary>
        void rytujRycine(World w, KameraRyciny cam, double time)
        {
            var O = new Odbitka { w = w };
            O.zoom = cam.zoom / scale;
            O.izoom = 1 / O.zoom;
            double zoom = O.zoom, izoom = O.izoom;
            // siatka pikseli przyklejona do świata: lewy górny róg bufora to zawsze cały piksel świata
            double leftC = cam.x - cam.vw / scale / 2 / zoom, topC = cam.y - cam.vh / scale / 2 / zoom;
            double oxD = Math.Floor(leftC * zoom), oyD = Math.Floor(topC * zoom);
            double left = oxD / zoom, top = oyD / zoom;
            O.left = left; O.top = top; O.ox = (int)oxD; O.oy = (int)oyD;
            dx = (left - leftC) * zoom * scale;
            dy = (top - topC) * zoom * scale;

            int tx0 = (int)Math.Floor(left) - 1, ty0 = (int)Math.Floor(top) - 1;
            int tx1 = (int)Math.Ceiling(left + aw / zoom) + 1, ty1 = (int)Math.Ceiling(top + ah / zoom) + 1;
            O.fala = time * 0.0016;
            O.far = zoom < 6 ? Math.Max(0.55, zoom / 6) : 1;
            O.plaski = zoom < 2.6;
            O.spWide = zoom < 6 ? 1.6 : Math.Min(2.1, Math.Max(1, zoom / 10));
            O.kontrast = ustawienia.kontrast;
            O.tetno = 0.5 + 0.5 * JsMath.Sin(time * 0.0025);
            O.linie = zoom >= 1.6;
            O.hwP = Math.Max(0.7, zoom / 15); O.hwS = Math.Max(0.45, zoom / 32);
            O.rimW = 1 + zoom * RS.swietlikGrubosc;
            O.gW = Math.Max(0.6, zoom * 0.045);
            O.hwMax = 0.42 + zoom * 0.015;
            O.dashF = 1 / Math.Max(4.5, zoom * 0.24);
            O.wSp = Math.Max(2.6, zoom * 0.17); O.iwSp = 1 / O.wSp;
            O.rysyWidac = zoom >= RS.rysy.odZoom; O.rysaW = Math.Max(0.6, zoom * RS.rysy.szer);

            // ---- kolumny ekranu: x świata, granice warstw i falowanie spoin
            var gr = graniceWarstw(w);
            O.gr = gr;
            int W = (int)w.w;
            for (int px = 0; px < aw; px++)
            {
                // (w TS: x świata w liczbie podwójnej precyzji — kolX to Float32Array, ale reszta kolumny liczy się z dokładnego x)
                double wxd = left + (px + 0.5) * izoom;
                kolX[px] = (float)wxd;
                // spoiny falują łagodnie, raz na kilka kafli — interpolowane, bez schodków
                double f1 = wxd * 1.6, i1 = Math.Floor(f1), t1 = f1 - i1;
                double s1 = smooth[(37 << 8) | ((int)i1 & 255)], s2 = smooth[(37 << 8) | (((int)i1 + 1) & 255)];
                double f2 = wxd * 7, i2 = Math.Floor(f2), t2 = f2 - i2;
                double s3 = smooth[(91 << 8) | ((int)i2 & 255)], s4 = smooth[(91 << 8) | (((int)i2 + 1) & 255)];
                kolFala[px] = (float)((s1 + (s2 - s1) * t1 - 0.5) * 0.9 + (s3 + (s4 - s3) * t2 - 0.5) * 0.12);
                kolGrzbiet[px] = (float)(gr != null && rowne != null ? Grzbiet.wysokoscGrzbietuZ(rowne, wxd) : 0);
                if (gr != null)
                {
                    double xf = wxd - 0.5, xi = Math.Floor(xf), xt = xf - xi;
                    int a = xi < 0 ? 0 : xi >= W ? W - 1 : (int)xi, b = xi + 1 < 0 ? 0 : xi + 1 >= W ? W - 1 : (int)xi + 1;
                    var drzy = (s3 + (s4 - s3) * t2 - 0.5) * 0.18;     // drżenie rylca
                    kolG1[px] = (float)(gr.g1[a] + (gr.g1[b] - (double)gr.g1[a]) * xt + drzy);
                    kolG2[px] = (float)(gr.g2[a] + (gr.g2[b] - (double)gr.g2[a]) * xt - drzy);
                }
                else { kolG1[px] = -1e6f; kolG2[px] = -1e6f; }
            }

            // ---- nieznane: półmrok papieru i szkic sinopii (granice warstw, brzeg ramy, rzadkie spoiny)
            var GM = RS.nieznaneMasa;
            O.szSila = RS.szkicSila; O.spSila = RS.szkicSpoinySila; O.spF = 1 / RS.szkicSpoinyCo;
            O.szW = Math.Max(1.6, zoom * 0.08);
            O.rama = SWIAT.warstwy.rama; O.ramaP = w.w - O.rama; O.ramaD = w.h - O.rama;
            O.czapaOd = World.SURFACE_Y + SWIAT.warstwy.ziemia; O.czapaDo = gr != null && w.salaOltarza.x1 >= 0 ? w.salaOltarza.y0 : -1e6;
            for (int px = 0; px < aw; px++)
            {
                double wx = kolX[px];
                var d = wx - O.rama; if (d < 0) d = -d;
                var e = wx - O.ramaP; if (e < 0) e = -e; if (e < d) d = e;
                kolDX[px] = (float)(gr != null ? d * zoom : 1e9);
                kolRama[px] = (byte)(wx < O.rama || wx >= O.ramaP ? 1 : 0);
            }
            for (int py = 0; py < ah; py++)
            {
                var wyP = top + (py + 0.5) * izoom;
                wierszWy[py] = (float)wyP;
                var d = wyP - O.ramaD; if (d < 0) d = -d;
                var e = wyP - O.czapaDo; if (e < 0) e = -e; if (e < d) d = e;
                wierszDY[py] = (float)(gr != null ? d * zoom : 1e9);
                wierszRama[py] = (byte)(wyP >= O.ramaD || (wyP >= O.czapaOd && wyP < O.czapaDo) ? 1 : 0);
            }
            O.GMR = new[] { (float)GM[0][0], (float)GM[1][0], (float)GM[2][0], (float)GM[3][0] };
            O.GMG = new[] { (float)GM[0][1], (float)GM[1][1], (float)GM[2][1], (float)GM[3][1] };
            O.GMB = new[] { (float)GM[0][2], (float)GM[1][2], (float)GM[2][2], (float)GM[3][2] };
            O.spCo = RS.szkicSpoinyCo * zoom;

            // ---- pamięć poprzedniej odbitki: co trzeba narysować od nowa
            int lw0 = lw, lh0 = lh, lx00 = lx0, ly00 = ly0;
            int nk = lw0 * lh0;
            if (klucz.Length != nk) { klucz = new uint[nk]; zmiana = new byte[nk]; }
            var KL = klucz; var ZM = zmiana; var PK = pKlucz;
            {
                var sladA = w.slad.d; int Hh = (int)w.h;
                for (int y = 0; y < lh0; y++)
                {
                    int wy = ly00 + y;
                    for (int x = 0; x < lw0; x++)
                    {
                        int k = y * lw0 + x, wx = lx00 + x;
                        int sl = wx >= 0 && wy >= 0 && wx < W && wy < Hh ? sladA[wy * W + wx] : 0;
                        unchecked
                        {
                            int h = ((rys[k] + 1) * (int)0x9e3779b1) ^ ((int)sol[k] << 7) ^ (miek[k] << 8) ^ (sl << 9);
                            h = (h ^ I(fresh[k] * 40.0 + 0.5)) * (int)0x85ebca6b;
                            h = (h ^ I(swiatlo[k] * 48.0 + 0.5) ^ (I(light[k] * 48.0 + 0.5) << 8)) * (int)0xc2b2ae35;
                            h = (h ^ I(angle[k] * 64.0 + 512) ^ (I(bliskosc[k] * 32.0 + 0.5) << 12)) * 0x27d4eb2f;
                            h = (h ^ I(otwarcie[k] * 32.0 + 0.5) ^ (I(strop[k] * 32.0 + 0.5) << 8)) * 0x165667b1;
                            KL[k] = (uint)(h ^ (int)((uint)h >> 15));
                        }
                        // płynie albo tętni: rysuje się co klatkę
                        bool ruch = magmaP[k] > 0 || wodaP[k] > 0 || rys[k] == T.CORE;
                        int ppx = wx - pLx0, ppy = wy - pLy0;
                        uint stary = ppx >= 0 && ppy >= 0 && ppx < pLw && ppy < pLh ? PK[ppy * pLw + ppx] : ~KL[k];
                        ZM[k] = (byte)(ruch || stary != KL[k] ? 1 : 0);
                    }
                }
            }
            bool pelna = !odbitkaWazna || zoom != pZoom || w != pSwiat || O.kontrast != pKontrast;
            double ddxD = oxD - pOx, ddyD = oyD - pOy;
            if (!pelna && (ddxD >= aw || -ddxD >= aw || ddyD >= ah || -ddyD >= ah)) pelna = true;
            int ddx = (int)ddxD, ddy = (int)ddyD;
            O.pelna = pelna;
            // odsłonięte paski (piksele bufora), które po przesunięciu trzeba narysować
            int odsX0 = 0, odsX1 = 0, odsY0 = 0, odsY1 = 0;
            var data = dane; var edata = edane;
            if (pelna) Array.Clear(edata, 0, edata.Length);
            else if (ddx != 0 || ddy != 0)
            {
                // przesunięcie o całe piksele: wiersze kopiowane w kolejności, która nie nadpisze źródła
                int x0c = ddx > 0 ? 0 : -ddx, n = aw - (ddx > 0 ? ddx : -ddx);
                int sx0 = ddx > 0 ? ddx : 0;
                for (int i = 0; i < ah; i++)
                {
                    int y = ddy > 0 ? i : ah - 1 - i;
                    int sy = y + ddy;
                    if (sy < 0 || sy >= ah) continue;
                    Array.Copy(data, (sy * aw + sx0) * 4, data, (y * aw + x0c) * 4, n * 4);
                    Array.Copy(edata, (sy * aw + sx0) * 4, edata, (y * aw + x0c) * 4, n * 4);
                }
                if (ddx > 0) { odsX0 = aw - ddx; odsX1 = aw; } else if (ddx < 0) { odsX0 = 0; odsX1 = -ddx; }
                if (ddy > 0) { odsY0 = ah - ddy; odsY1 = ah; } else if (ddy < 0) { odsY0 = 0; odsY1 = -ddy; }
            }
            O.odsX0 = odsX0; O.odsX1 = odsX1; O.odsY0 = odsY0; O.odsY1 = odsY1;
            odbitkaWazna = true;
            pZoom = zoom; pOx = oxD; pOy = oyD; pSwiat = w; pKontrast = O.kontrast;
            pKlucz = KL; klucz = PK.Length == nk ? PK : new uint[nk];
            pLx0 = lx00; pLy0 = ly00; pLw = lw0; pLh = lh0;

            var sb = SWIAT; var sala = w.salaOltarza;
            O.soX0 = sala.x0; O.soX1 = sala.x1; O.soY0 = sala.y0; O.soY1 = sala.y1;
            O.ciosW = Math.Max(0.7, zoom * 0.045);

            // ---- wybór kafli do narysowania (po kolei, jak w TS) i materiał „drugiej kreski” każdego z nich
            int wierszy = ty1 - ty0 + 1;
            var kafle = new List<KafelDoRysunku>[wierszy];
            var S = sol; var R = rys; var F = fresh;
            for (int ty = ty0; ty <= ty1; ty++)
            {
                var lista = new List<KafelDoRysunku>();
                kafle[ty - ty0] = lista;
                int py0 = (int)Math.Max(0, Rnd((ty - top) * zoom));
                int py1 = (int)Math.Min(ah, Rnd((ty + 1 - top) * zoom));
                if (py1 <= py0) continue;
                for (int tx = tx0; tx <= tx1; tx++)
                {
                    int px0 = (int)Math.Max(0, Rnd((tx - left) * zoom));
                    int px1 = (int)Math.Min(aw, Rnd((tx + 1 - left) * zoom));
                    if (px1 <= px0) continue;
                    int kx = tx - lx0, ky = ty - ly0;
                    int k = ky * lw + kx;
                    bool wOknie = kx >= 1 && ky >= 1 && kx < lw - 2 && ky < lh - 2;
                    if (!pelna && wOknie
                        && !(px0 < odsX1 && px1 > odsX0) && !(py0 < odsY1 && py1 > odsY0)
                        && (ZM[k - lw - 1] | ZM[k - lw] | ZM[k - lw + 1] | ZM[k - 1] | ZM[k] | ZM[k + 1] | ZM[k + lw - 1] | ZM[k + lw] | ZM[k + lw + 1]) == 0)
                        continue;           // czysty kafel: zostaje z poprzedniej odbitki
                    double known = wOknie ? (double)F[k] + F[k + 1] + F[k + lw] + F[k + lw + 1] : 0;
                    if (known > 0.002 && S[k] != 1)
                    {
                        double suma = 0;
                        for (int ddy2 = -1; ddy2 <= 1; ddy2++) for (int ddx2 = -1; ddx2 <= 1; ddx2++) suma += S[k + ddy2 * lw + ddx2];
                        if (suma > 0 && suma < 9)
                        {
                            // skała wchodząca w róg pustego kafla bierze materiał sąsiada — najpierw podłogi
                            ostatniMatB = S[k + lw] != 0 ? R[k + lw] : S[k - 1] != 0 ? R[k - 1] : S[k + 1] != 0 ? R[k + 1] : S[k - lw] != 0 ? R[k - lw]
                                : S[k + lw - 1] != 0 ? R[k + lw - 1] : S[k + lw + 1] != 0 ? R[k + lw + 1] : S[k - lw - 1] != 0 ? R[k - lw - 1] : R[k - lw + 1];
                        }
                    }
                    lista.Add(new KafelDoRysunku { tx = tx, matB = ostatniMatB });
                }
            }
            Parallel.For(0, wierszy, () => new Brudnopis(), (wi, _, bp) =>
            {
                RysujWiersz(O, ty0 + wi, kafle[wi], bp, time);
                return bp;
            }, _ => { });
        }

        /// <summary>Jeden wiersz kafli ryciny (wszystkie piksele jego kafli) — pętla `rytujRycine` z TS dla jednego `ty`.</summary>
        void RysujWiersz(Odbitka O, int ty, List<KafelDoRysunku> lista, Brudnopis bp, double time)
        {
            if (lista.Count == 0) return;
            var w = O.w;
            int W = (int)w.w, Hh = (int)w.h;
            var tileW = w.tile.d; var waterA = w.water.d; var magmaA = w.magma.d; var sladA = w.slad.d;
            var data = dane; var edata = edane;
            var noise = this.noise; var smooth = this.smooth; var ziarno = this.ziarno;
            var cosT = this.cosT; var sinT = this.sinT;
            double zoom = O.zoom, izoom = O.izoom, left = O.left, top = O.top;
            int ox = O.ox, oy = O.oy, aw = this.aw, ah = this.ah;
            var gr = O.gr;
            var S9 = bp.S9; var M9 = bp.M9; var W9 = bp.W9;
            var pA = bp.pA; var pB = bp.pB;
            var PL = bp.PL; var PLK = bp.PLK; var PLJ = bp.PLJ; var PLI = bp.PLI; var PLR = bp.PLR; var PID = bp.PID;
            var KR = bp.kraw;
            int lw = this.lw;
            var F = fresh; var L = light; var LT = swiatlo; var A = angle; var B = bliskosc; var S = sol; var R = rys;
            var OA = otwarcie; var ST = strop; var MP = magmaP; var WP = wodaP; var MI = miek; var RK = rogK;
            var KO = RS.kontur; var SW = RS.swietlik; double swBaza = RS.swietlikBaza;
            var SP = RS.swiatloPustki; var SS = RS.swiatloSkaly;
            var GC = RS.granicaCiemna; var GJ = RS.granicaJasna; double gSila = RS.granicaSila;
            var GM = RS.nieznaneMasa; var SZ = RS.szkic;
            double SZR = SZ[0], SZG = SZ[1], SZB = SZ[2];
            var PC = RS.pustkaCien; var PO = RS.pustkaOtwarta; var POS = RS.posadzka;
            var KAT_WARSTW = RS.katWarstw; double RYSA_SILA = RS.rysy.sila;
            bool plaski = O.plaski, linie = O.linie, rysyWidac = O.rysyWidac, pelna = O.pelna;
            double fala = O.fala, far = O.far, spWide = O.spWide, kontrast = O.kontrast, tetno = O.tetno;
            double hwP = O.hwP, hwS = O.hwS, rimW = O.rimW, gW = O.gW, hwMax = O.hwMax, dashF = O.dashF, wSp = O.wSp, iwSp = O.iwSp, rysaW = O.rysaW;
            double rama = O.rama, ramaP = O.ramaP;
            double soX0 = O.soX0, soX1 = O.soX1, soY0 = O.soY0, soY1 = O.soY1, ciosW = O.ciosW;
            var kolX = this.kolX; var kolG1 = this.kolG1; var kolG2 = this.kolG2; var kolFala = this.kolFala; var kolGrzbiet = this.kolGrzbiet;
            var kolDX = this.kolDX; var kolRama = this.kolRama; var wierszDY = this.wierszDY; var wierszRama = this.wierszRama; var wierszWy = this.wierszWy;
            float[] GMR = O.GMR, GMG = O.GMG, GMB = O.GMB;
            double szSila = O.szSila, spSila = O.spSila, spF = O.spF, szW = O.szW, spCo = O.spCo;

            // nieznane: półmrok papieru i szkic sinopii — wszystko tu mieści się w 0..255, zapis z ucięciem (jak `| 0` w TS)
            void duch(int o, int px, int py, int gx, int gy)
            {
                double wyP = wierszWy[py];
                bool wRamie = (kolRama[px] | wierszRama[py]) == 1;
                double g1 = kolG1[px], g2 = kolG2[px];
                int li = wRamie ? 3 : wyP < g1 ? 0 : wyP < g2 ? 1 : 2;
                double z = ziarno[((gy & 255) << 8) | (gx & 255)];
                double r = GMR[li] + z * 8, g = GMG[li] + z * 6, b = GMB[li] + z * 5.5;
                // linie szkicu: najbliższa granica warstw, brzeg ramy albo czapy
                double d = kolDX[px], e = wierszDY[py];
                if (e < d) d = e;
                if (!wRamie)
                {
                    e = (wyP - g1) * zoom; if (e < 0) e = -e; if (e < d) d = e;
                    e = (wyP - g2) * zoom; if (e < 0) e = -e; if (e < d) d = e;
                }
                double k = 0;
                if (d < szW)
                {
                    // pędzel płynnie słabnie i znów dociska
                    double nacisk = smooth[((((gy >> 3) + 61) & 255) << 8) | (((gx >> 3) + 17) & 255)];
                    k = (1 - d / szW) * szSila * (0.45 + 0.55 * nacisk);
                }
                else if (!wRamie && gr != null)
                {
                    // rzadkie spoiny: ledwie widać, że to skała, nie pustka
                    var bt = (wyP + kolFala[px] * 2.0) * spF;
                    bt -= Math.Floor(bt);
                    if (bt > 0.5) bt = 1 - bt;
                    var ds = bt * spCo;
                    if (ds < 1.1 && smooth[((((gy >> 2) + 23) & 255) << 8) | ((gx >> 3) & 255)] > 0.45) k = (1.1 - ds) / 1.1 * spSila;
                }
                if (k > 0) { r += (SZR - r) * k; g += (SZG - g) * k; b += (SZB - b) * k; }
                data[o] = (byte)I(r); data[o + 1] = (byte)I(g); data[o + 2] = (byte)I(b); data[o + 3] = 255;
            }

            double depth = w.depth(ty), czer = czerwienGlebi(depth), przyPomniku = 1;
            void ustaw(Kreska P, int mat)
            {
                var hat = H(mat);
                P.mat = mat;
                barwyMaterialu(mat, depth, przyPomniku, bp.pig, 0);
                var pg = bp.pig;
                P.br = pg[0]; P.bg = pg[1]; P.bb = pg[2]; P.tr = pg[3]; P.tg = pg[4]; P.tb = pg[5];
                if (hat != null) { P.toneC = hat.tone; P.sp = hat.sp; P.cross = hat.cross; P.stip = hat.stipple; }
                else { P.toneC = 0.2; P.sp = 4.2; P.cross = 0.6; P.stip = 0; }
                if (mat == T.CORE) { P.tr = 255; P.tg = 110 + tetno * 60; P.tb = 96; }
                P.sp *= spWide;
                P.toneC *= far;
            }
            // Poziom cieczy w narożniku: średnia z przejść wokół — ściana nie obniża lustra.
            double rog(float[] LL, int a, int b, int c, int d)
            {
                double wa = 1 - (double)S9[a], wb = 1 - (double)S9[b], wc = 1 - (double)S9[c], wd = 1 - (double)S9[d];
                var den = wa + wb + wc + wd;
                return den > 0 ? (LL[a] * wa + LL[b] * wb + LL[c] * wc + LL[d] * wd) / den : 0;
            }

            int py0 = (int)Math.Max(0, Rnd((ty - top) * zoom));
            int py1 = (int)Math.Min(ah, Rnd((ty + 1 - top) * zoom));
            bool inbY = ty >= 0 && ty < Hh;
            // tylna ściana jaskini: ugier płytko, umbra w środku, chłodny łupek w głębi (płynnie między nimi)
            double dw = depth < 0.17 ? 0 : depth > 0.85 ? 2 : (depth - 0.17) / 0.34;
            int di = dw >= 2 ? 1 : (int)Math.Floor(dw); double dt = dw - di;
            double acR = PC[di][0] + (PC[di + 1][0] - PC[di][0]) * dt + czer * 14, acG = PC[di][1] + (PC[di + 1][1] - PC[di][1]) * dt, acB = PC[di][2] + (PC[di + 1][2] - PC[di][2]) * dt;
            double aoR = PO[di][0] + (PO[di + 1][0] - PO[di][0]) * dt + czer * 26, aoG = PO[di][1] + (PO[di + 1][1] - PO[di][1]) * dt + czer * 6, aoB = PO[di][2] + (PO[di + 1][2] - PO[di][2]) * dt - czer * 8;

            foreach (var kafel in lista)
            {
                int tx = kafel.tx;
                przyPomniku = czerwienPrzyPomniku(w, tx);
                int px0 = (int)Math.Max(0, Rnd((tx - left) * zoom));
                int px1 = (int)Math.Min(aw, Rnd((tx + 1 - left) * zoom));
                bool inb = inbY && tx >= 0 && tx < W;
                int i = inb ? ty * W + tx : -1;
                int kx = tx - lx0, ky = ty - ly0;
                int k = ky * lw + kx;
                bool wOknie = kx >= 1 && ky >= 1 && kx < lw - 2 && ky < lh - 2;
                if (!pelna) for (int py = py0; py < py1; py++) Array.Clear(edata, (py * aw + px0) * 4, (px1 - px0) * 4);
                double f00 = wOknie ? F[k] : 0, f10 = wOknie ? F[k + 1] : 0;
                double f01 = wOknie ? F[k + lw] : 0, f11 = wOknie ? F[k + lw + 1] : 0;
                double known = f00 + f10 + f01 + f11;
                if (known <= 0.002)
                {
                    // nieznane: półmrok ze szkicem
                    for (int py = py0; py < py1; py++)
                    {
                        int gy = py + oy, row = py * aw;
                        for (int px = px0; px < px1; px++) duch((row + px) * 4, px, py, px + ox, gy);
                    }
                    continue;
                }
                double l00 = LT[k], l10 = LT[k + 1], l01 = LT[k + lw], l11 = LT[k + lw + 1];
                double e00 = L[k], e10 = L[k + 1], e01 = L[k + lw], e11 = L[k + lw + 1];
                double a00 = A[k], a10 = A[k + 1], a01 = A[k + lw], a11 = A[k + lw + 1];
                double b00 = B[k], b10 = B[k + 1], b01 = B[k + lw], b11 = B[k + lw + 1];
                double o00 = OA[k], o10 = OA[k + 1], o01 = OA[k + lw], o11 = OA[k + lw + 1];
                double t00 = ST[k], t10 = ST[k + 1], t01 = ST[k + lw], t11 = ST[k + lw + 1];

                // otoczenie 3×3: twardość i ciecze — z nich gładka ściana i gładki brzeg jeziora
                double suma = 0, ciecz = 0;
                for (int ddy = -1; ddy <= 1; ddy++)
                {
                    int kk = k + ddy * lw;
                    for (int ddx = -1; ddx <= 1; ddx++)
                    {
                        int j = (ddy + 1) * 3 + ddx + 1;
                        var s = S[kk + ddx];
                        S9[j] = s; suma += s;
                        var m = MP[kk + ddx]; var wo = WP[kk + ddx];
                        M9[j] = m; W9[j] = wo; ciecz += (double)m + wo;
                    }
                }
                bool lity = S9[4] == 1;
                bool brzegowy = suma > 0 && suma < 9;
                bool cieczObok = ciecz > 0;
                double m00 = 0, m10 = 0, m01 = 0, m11 = 0, w00 = 0, w10 = 0, w01 = 0, w11 = 0;
                if (cieczObok)
                {
                    m00 = rog(M9, 0, 1, 3, 4); m10 = rog(M9, 1, 2, 4, 5); m01 = rog(M9, 3, 4, 6, 7); m11 = rog(M9, 4, 5, 7, 8);
                    w00 = rog(W9, 0, 1, 3, 4); w10 = rog(W9, 1, 2, 4, 5); w01 = rog(W9, 3, 4, 6, 7); w11 = rog(W9, 4, 5, 7, 8);
                }

                int tile = R[k];
                int water = inb ? waterA[i] : 0;
                int magma = inb ? magmaA[i] : 0;
                int slad = inb ? sladA[i] : 0;                 // 1 = twój wykop, 2 = twój zawał
                bool lustro = water > 0 && inb && ty > 0 && waterA[i - W] == 0;

                // miękkie przejście materiałów: w środku kafla jego własna barwa, przy krawędzi średnia z sąsiadami
                bool miekko = lity && MI[k] == 1;
                int c00 = k * 7, c10 = c00 + 7, c01 = (k + lw) * 7, c11 = c01 + 7;
                if (lity) ustaw(pA, tile);
                else if (brzegowy) ustaw(pB, kafel.matB);
                else pB.mat = kafel.matB;       // pustka bez skały wokół: w TS — materiał z ostatniego kafla brzegowego
                var P = lity ? pA : pB;
                int pMat = P.mat;
                double pSp = P.sp, pCross = P.cross, pStip = P.stip * 0.22;
                double pBr = P.br, pBg = P.bg, pBb = P.bb, pTr = P.tr, pTg = P.tg, pTb = P.tb, pTone = P.toneC;
                double isp = 1 / pSp, sp2 = pSp * 1.45, isp2 = 1 / sp2;
                double pJas = pMat == T.STONE ? 0.75 : 1;
                // raz na kafel: czy w ogóle sięga go granica warstw, czy świeci (poświata), czy ma iskry kruszcu
                bool blisko = false;
                if (gr != null && inbY)
                {
                    int xc = tx < 0 ? 0 : tx >= W ? W - 1 : tx;
                    double d1 = ty + 0.5 - gr.g1[xc], d2 = ty + 0.5 - gr.g2[xc];
                    blisko = (d1 > -2.5 && d1 < 2.5) || (d2 > -2.5 && d2 < 2.5);
                }
                bool swieci = e00 > 0.25 || e10 > 0.25 || e01 > 0.25 || e11 > 0.25;
                // miękka skała i ziemia: krótsze odcinki (kreska rwie się jak w piaskowcu), reszta dłuższe
                double przOff = pMat == T.MIEKKA || pMat == T.SOIL ? 0.5 : 0.42;
                bool iskry = pMat == T.ORE || pMat == T.CRYSTAL || pMat == T.ZLOTO;
                // kamień pod jasną salą to jej posadzka (dwa rzędy podłogi)
                bool posadzka = pMat == T.STONE && soX1 >= 0 && tx >= soX0 && tx <= soX1 && ty >= soY1 && ty <= soY1 + 1;
                // w głębi warstwy kąt jest ten sam we wszystkich rogach — bez interpolacji
                bool katStaly = Math.Abs(a00 - a10) + Math.Abs(a00 - a01) + Math.Abs(a00 - a11) < 1e-5;
                // własny rylec mają tylko kamień nie do ruszenia i kryształ
                bool wlasnyKat = gr == null || pMat == T.STONE || pMat == T.CRYSTAL;
                // płaty: trzy najbliższe ziarna spośród 3×3 komórek wokół środka kafla
                bool platyKafla = !plaski && (lity || brzegowy);
                if (platyKafla)
                {
                    double cx = (tx + 0.5) * PLAT_IOCZKO, cy = (ty + 0.5) * PLAT_IOCZKO;
                    int icx = (int)Math.Floor(cx), icy = (int)Math.Floor(cy);
                    double bb0 = 1e9, bb1 = 1e9, bb2 = 1e9;
                    for (int ddy = -1; ddy <= 1; ddy++)
                        for (int ddx = -1; ddx <= 1; ddx++)
                        {
                            int id = (((icy + ddy) & 63) << 6) | ((icx + ddx) & 63);
                            double qx = icx + ddx + (double)VOR_X[id] - cx, qy = icy + ddy + (double)VOR_Y[id] - cy;
                            var e = qx * qx + qy * qy;
                            if (e < bb0) { bb2 = bb1; PID[2] = PID[1]; bb1 = bb0; PID[1] = PID[0]; bb0 = e; PID[0] = id; }
                            else if (e < bb1) { bb2 = bb1; PID[2] = PID[1]; bb1 = e; PID[1] = id; }
                            else if (e < bb2) { bb2 = e; PID[2] = id; }
                        }
                    for (int n = 0; n < 3; n++)
                    {
                        int id = PID[n];
                        // komórka ziarna względem kafla: id niesie tylko reszty z 64, więc odtwarzamy ją od komórki kafla
                        int ix = icx + ((((id & 63) - (icx & 63)) + 96) & 63) - 32, iy = icy + ((((id >> 6) - (icy & 63)) + 96) & 63) - 32;
                        PL[n * 2] = (float)((ix + (double)VOR_X[id]) * PLAT_OCZKO); PL[n * 2 + 1] = (float)((iy + (double)VOR_Y[id]) * PLAT_OCZKO);
                        PLK[n] = VOR_K[id]; PLJ[n] = VOR_J[id];
                    }
                    for (int p = 0; p < 3; p++)
                    {
                        int a = p == 2 ? 1 : 0, c = p == 0 ? 1 : 2;
                        double ddx = PL[a * 2] - (double)PL[c * 2], ddy = PL[a * 2 + 1] - (double)PL[c * 2 + 1];
                        PLI[p] = (float)(0.5 / Math.Sqrt(ddx * ddx + ddy * ddy + 1e-6));
                        int lo = PID[a] < PID[c] ? PID[a] : PID[c], hi = PID[a] < PID[c] ? PID[c] : PID[a];
                        PLR[p] = (byte)((unchecked((uint)(lo * 73856093 ^ hi * 19349663)) >> 4) % 100 < RS.platy.rysyUdzial * 100 ? 1 : 0);
                    }
                }
                int ws = warstwaMaterialu(pMat);
                double gmR = GM[ws][0], gmG = GM[ws][1], gmB = GM[ws][2];
                // uwarstwienie: spoina co tyle kafli; z daleka rzadziej, żeby nie zlała się w ton
                double bedF = 0, bedS = 0, bedPx = 0;
                if (RS.uwarstwienie.TryGetValue(pMat, out var uw) && uw != null && !plaski)
                {
                    bedF = 1 / uw[0];
                    var krokB = Math.Max(1, Math.Ceiling(7 * bedF / zoom));
                    bedF /= krokB; bedPx = zoom / bedF;
                    // z daleka spoiny gasną — inaczej góra wyglądała jak papier w linie
                    bedS = uw[1] * kontrast * (zoom < 5 ? 0 : zoom > 12 ? 1 : (zoom - 5) / 7);
                }

                for (int py = py0; py < py1; py++)
                {
                    double wyP = top + (py + 0.5) * izoom;
                    double fy = wyP - ty;
                    int gy = py + oy;
                    int row = py * aw;
                    int ny = gy & 255, ny2 = (gy + 71) & 255, ny2b = (gy * 2 + 29) & 255;
                    double fyi = 1 - fy;
                    double fa0 = f00 * fyi + f01 * fy, fa1 = f10 * fyi + f11 * fy;
                    double la0 = l00 * fyi + l01 * fy, la1 = l10 * fyi + l11 * fy;
                    double ea0 = e00 * fyi + e01 * fy, ea1 = e10 * fyi + e11 * fy;
                    double aa0 = a00 * fyi + a01 * fy, aa1 = a10 * fyi + a11 * fy;
                    double ba0 = b00 * fyi + b01 * fy, ba1 = b10 * fyi + b11 * fy;
                    double oa0 = o00 * fyi + o01 * fy, oa1 = o10 * fyi + o11 * fy;
                    double sa0 = t00 * fyi + t01 * fy, sa1 = t10 * fyi + t11 * fy;
                    // ćwiartka między środkami kafli, w której leży wiersz
                    int qy = fy < 0.5 ? 0 : 3;
                    double v = fy < 0.5 ? fy + 0.5 : fy - 0.5;
                    double svM = v * (0.8 + 0.2 * v * (3 - 2 * v)), dvM = 0.8 + 1.2 * v * (1 - v);
                    int wyq = I((ty + fy) * 4.3) & 255;
                    if (miekko)
                        for (int c = 0; c < 7; c++)
                        {
                            KR[c] = (float)(RK[c00 + c] * fyi + RK[c01 + c] * fy);
                            KR[7 + c] = (float)(RK[c10 + c] * fyi + RK[c11 + c] * fy);
                        }
                    double ey = fy < 0.5 ? 1 - fy * 2 : fy * 2 - 1;

                    for (int px = px0; px < px1; px++)
                    {
                        double fx = kolX[px] - (double)tx;
                        int gx = px + ox;
                        int o = (row + px) * 4;

                        double ft = fa0 * (1 - fx) + fa1 * fx;
                        // brzeg pamięci postrzępiony płatami, ale bez dziur w środku tego, co się pamięta
                        double fr = ft <= 0.001 ? 0 : ft > 0.985 ? ft : ft + (smooth[((I(gy * 0.3) & 255) << 8) | (I(gx * 0.2) & 255)] - 0.5) * (ft < 0.5 ? 0.3 : 0.6 * (1 - ft));
                        if (fr <= 0.06) { duch(o, px, py, gx, gy); continue; }        // Otchłań — ciemność bez rysunku
                        double lt = la0 * (1 - fx) + la1 * fx;
                        double mem = fr < 1 ? fr : 1;

                        // gładka ściana: twardość interpolowana między środkami kafli, z drżeniem rylca
                        bool skala = lity; double linia = 0, swP = 0;
                        if (brzegowy)
                        {
                            int qx = fx < 0.5 ? 0 : 1;
                            double u = fx < 0.5 ? fx + 0.5 : fx - 0.5;
                            double s00 = S9[qy + qx], s10 = S9[qy + qx + 1], s01 = S9[qy + 3 + qx], s11 = S9[qy + 4 + qx];
                            // prawie liniowo, odrobinę gładko: schodki z kafli stają się prostym skosem
                            double su = u * (0.8 + 0.2 * u * (3 - 2 * u)), du = 0.8 + 1.2 * u * (1 - u);
                            double gT = s00 + (s10 - s00) * su, gB = s01 + (s11 - s01) * su;
                            double drzy = (smooth[(wyq << 8) | (I((tx + fx) * 4.3) & 255)] - 0.5) * 0.16;
                            double sP = gT + (gB - gT) * svM + drzy;
                            skala = sP > 0.5;
                            if (linie)
                            {
                                double gu = ((s10 - s00) * (1 - svM) + (s11 - s01) * svM) * du;
                                double gv = (gB - gT) * dvM;
                                double gr2 = Math.Sqrt(gu * gu + gv * gv);
                                if (gr2 > 0.02)
                                {
                                    double d = Math.Abs(sP - 0.5) / gr2 * zoom;
                                    double podloga = gv > 0 ? gv / gr2 : 0;    // twardość rośnie w dół: pod spodem skała
                                    double hw = hwS + (hwP - hwS) * podloga * podloga;
                                    double zanik = mem < 0.7 ? mem / 0.7 : 1;
                                    linia = hw + 0.5 - d;
                                    if (linia > 1) linia = 1;
                                    if (linia > 0) linia *= 0.88 * zanik;
                                    // świetlik: jasny brzeg podłogi tuż pod konturem — tam pada światło lampki
                                    if (skala && podloga > 0.3 && d > hw * 0.5)
                                    {
                                        double t = 1 - (d - hw * 0.5) / rimW;
                                        if (t > 0)
                                        {
                                            double swiatloP = swBaza + (1 - swBaza) * (lt > 0.6 ? 1 : lt / 0.6);
                                            swP = t * t * (podloga - 0.3) / 0.7 * swiatloP * zanik;
                                        }
                                    }
                                }
                            }
                        }

                        // ciecz tylko w pustce; o brzegu decyduje poziom uśredniony z sąsiadami, nie kafel
                        int rodzaj = skala ? 1 : 0;
                        if (!skala && cieczObok)
                        {
                            double mP = (m00 * (1 - fx) + m10 * fx) * (1 - fy) + (m01 * (1 - fx) + m11 * fx) * fy;
                            double wP = (w00 * (1 - fx) + w10 * fx) * (1 - fy) + (w01 * (1 - fx) + w11 * fx) * fy;
                            double brzeg = (smooth[(ny << 8) | ((gx * 2) & 255)] - 0.5) * 0.12;
                            if (mP + brzeg > 0.3) rodzaj = 3;
                            else if (wP + brzeg > 0.28 && magma == 0) rodzaj = 2;
                        }
                        double r, g, b;
                        // granice warstw: ciemna linia rylca i jasna tuż pod nią (w pustce słabiej — to tylna ściana)
                        double gC = 0, gJ = 0;
                        if (blisko && rodzaj < 2)
                        {
                            double d1 = (wyP - kolG1[px]) * zoom, d2 = (wyP - kolG2[px]) * zoom;
                            if (d2 > -6 && d2 < d1) d1 = d2;
                            if (d1 > -4 && d1 < 8 && kolX[px] >= rama && kolX[px] < ramaP)
                            {
                                double ad = d1 < 0 ? -d1 : d1;
                                gC = gW + 0.5 - ad; gC = gC < 0 ? 0 : gC > 1 ? 1 : gC;
                                double dj = d1 - gW - 1.6;
                                gJ = 1.1 - (dj < 0 ? -dj : dj); gJ = gJ < 0 ? 0 : gJ > 1 ? 1 : gJ;
                            }
                        }

                        if (rodzaj == 3)
                        {
                            // magma: płynący żar — jaśniejsze żyły wędrują z czasem
                            double plyn = smooth[((I(gy * 0.62 - gx * 0.42 + fala * 40) & 255) << 8) | (I(gx * 0.62 + gy * 0.42 + fala * 23) & 255)];
                            double plyn2 = smooth[((I(gy * 1.2 + gx * 0.75 - fala * 31) & 255) << 8) | (I(gx * 1.2 - gy * 0.75 + fala * 17) & 255)];
                            double zyla = (plyn * 0.62 + plyn2 * 0.38 - 0.4) * 3.4;
                            zyla = zyla < 0 ? 0 : zyla > 1 ? 1 : zyla * zyla * (3 - 2 * zyla);
                            zyla = 0.2 + zyla * 0.8;
                            double moc = 0.55 + (magma != 0 ? magma : 4) / 8.0 * 0.45;
                            r = 150 + 105 * moc * (0.6 + 0.4 * zyla); g = (60 + 150 * zyla) * moc - depth * 20; b = (20 + 60 * zyla * zyla) * moc;
                            edata[o] = C8(r); edata[o + 1] = C8(g * 0.8); edata[o + 2] = C8(b * 0.5); edata[o + 3] = 255;
                        }
                        else if (rodzaj == 2)
                        {
                            // woda: chłodna toń, poziome zmarszczki, jasne lustro na powierzchni
                            double glab = (water != 0 ? water : 3) / 8.0;
                            double fal = JsMath.Sin(gx * 0.35 + fala * 3 + ty * 1.7) * 0.8;
                            bool pas = ((gy + fal) % 4 + 4) % 4 < 1;
                            r = 22 + lt * 30; g = 40 + lt * 26 - glab * 6; b = 52 + lt * 12 + glab * 10;
                            if (pas && noise[(ny2 << 8) | (gx & 255)] > 0.25) { r += 34; g += 62; b += 70; }
                            if (lustro && fy < 0.28) { double kk = 1 - fy / 0.28; r += 150 * kk; g += 170 * kk; b += 170 * kk; }
                            r = r * (0.35 + 0.65 * mem); g = g * (0.35 + 0.65 * mem); b = b * (0.35 + 0.65 * mem);
                        }
                        else if (rodzaj == 1)
                        {
                            int mat = pMat;
                            if (posadzka)
                            {
                                // posadzka sali: ciosane płyty kamienia w przesuniętych rzędach
                                double vv = wyP * 2, ci = Math.Floor(vv);
                                double u = kolX[px] * 0.8 + (I(ci) & 1) * 0.5 + noise[(I(ci) & 255) << 8] * 0.3;
                                double fu = u - Math.Floor(u); fu = fu < 0.5 ? fu : 1 - fu;
                                double fv = vv - ci; fv = fv < 0.5 ? fv : 1 - fv;
                                double dsp = Math.Min(fu * zoom * 1.25, fv * zoom * 0.5);
                                double ltp = lt > 1 ? 1 : lt;
                                double lico = 0.62 + 0.38 * ltp - (fv < 0.25 && vv - ci > 0.5 ? 0.12 : 0) + (smooth[((gy >> 1 & 255) << 8) | (gx >> 1 & 255)] - 0.5) * 0.18;
                                r = (POS[0] + lt * SS[0]) * lico; g = (POS[1] + lt * SS[1]) * lico; b = (POS[2] + lt * SS[2]) * lico;
                                // spoina: ciemna linia rylca; górna krawędź płyty łapie światło
                                double sp2v = 0.9 - dsp;
                                if (sp2v > 0) { double kk = (sp2v > 1 ? 1 : sp2v) * 0.8; r += (KO[0] - r) * kk; g += (KO[1] - g) * kk; b += (KO[2] - b) * kk; }
                                else if (vv - ci < 0.5 && fv * zoom * 0.5 < 2) { double kk = 0.25 * ltp; r += (SW[0] - r) * kk; g += (SW[1] - g) * kk; b += (SW[2] - b) * kk; }
                                // poza pamięcią posadzka gaśnie w półmrok nieznanego, nie w czerń
                                if (mem < 0.7) { double wm = mem / 0.7; r = gmR + 4 + (r - gmR - 4) * wm; g = gmG + 3 + (g - gmG - 3) * wm; b = gmB + 3 + (b - gmB - 3) * wm; }
                            }
                            else if (mat == T.CORE)
                            {
                                // rdzeń: serce, nie kamień — jasny środek i kręgi rozchodzące się z każdym uderzeniem
                                double dxr = tx + fx - w.coreX - 0.5, dyr = ty + fy - w.coreY - 0.5;
                                double dr = Math.Sqrt(dxr * dxr + dyr * dyr);
                                double krag = 0.5 + 0.5 * JsMath.Sin(dr * 5 - time * 0.004);
                                double RR = 1.55 + 0.18 * tetno;
                                double kula = (RR + 0.3 - dr) / 0.6;
                                kula = kula < 0 ? 0 : kula > 1 ? 1 : kula * kula * (3 - 2 * kula);
                                double srodek = Math.Max(0, 1 - dr / 2.2);
                                double pr = 120 + 130 * srodek + 40 * krag, pg = 20 + 80 * srodek * srodek + 20 * krag * srodek, pb = 28 + 56 * srodek * srodek;
                                double blask = Math.Max(0, 1 - dr / 3.6) * (0.5 + 0.5 * tetno);
                                double sr = 30 + 70 * blask, sg = 10 + 12 * blask, sbb = 12 + 12 * blask;
                                r = sr + (pr - sr) * kula; g = sg + (pg - sg) * kula; b = sbb + (pb - sbb) * kula;
                                edata[o] = C8(r); edata[o + 1] = C8(g * 0.6); edata[o + 2] = C8(b * 0.6); edata[o + 3] = C8(255 * (0.25 + 0.6 * tetno) * (0.35 + 0.65 * kula));
                            }
                            else
                            {
                                // skała: ciemna masa rytowana kreską — przy jaskini jaśniejsza i gęstsza (płaskorzeźba)
                                double bl = ba0 * (1 - fx) + ba1 * fx;
                                double ciem = 0.8 + 0.2 * mem;
                                double kBr = pBr, kBg = pBg, kBb = pBb, kTr = pTr, kTg = pTg, kTb = pTb, kT = pTone;
                                if (miekko)
                                {
                                    double ex = fx < 0.5 ? 1 - fx * 2 : fx * 2 - 1;
                                    double t = ex > ey ? ex : ey;
                                    t *= t;
                                    double fxi = 1 - fx;
                                    kBr += (KR[0] * fxi + KR[7] * fx - kBr) * t;
                                    kBg += (KR[1] * fxi + KR[8] * fx - kBg) * t;
                                    kBb += (KR[2] * fxi + KR[9] * fx - kBb) * t;
                                    kTr += (KR[3] * fxi + KR[10] * fx - kTr) * t;
                                    kTg += (KR[4] * fxi + KR[11] * fx - kTg) * t;
                                    kTb += (KR[5] * fxi + KR[12] * fx - kTb) * t;
                                    kT += ((KR[6] * fxi + KR[13] * fx) * far - kT) * t;
                                }
                                double rel = (0.84 + 0.12 * bl) * ciem;
                                r = kBr * rel + lt * SS[0]; g = kBg * rel + lt * SS[1]; b = kBb * rel + lt * SS[2];
                                // płat skały: kamień pęka na wieloboczne płaszczyzny — każda ma własny kierunek kreski
                                double platKat = 0, rysa = 0;
                                if (platyKafla)
                                {
                                    double wxp = kolX[px];
                                    double q0x = wxp - PL[0], q0y = wyP - PL[1], q1x = wxp - PL[2], q1y = wyP - PL[3], q2x = wxp - PL[4], q2y = wyP - PL[5];
                                    double e0 = q0x * q0x + q0y * q0y, e1 = q1x * q1x + q1y * q1y, e2 = q2x * q2x + q2y * q2y;
                                    int n1, n2; double d1, d2;
                                    if (e0 <= e1 && e0 <= e2) { n1 = 0; d1 = e0; if (e1 <= e2) { n2 = 1; d2 = e1; } else { n2 = 2; d2 = e2; } }
                                    else if (e1 <= e2) { n1 = 1; d1 = e1; if (e0 <= e2) { n2 = 0; d2 = e0; } else { n2 = 2; d2 = e2; } }
                                    else { n1 = 2; d1 = e2; if (e0 <= e1) { n2 = 0; d2 = e0; } else { n2 = 1; d2 = e1; } }
                                    platKat = PLK[n1];
                                    double kj = 1 + (double)PLJ[n1];
                                    r *= kj; g *= kj; b *= kj;
                                    int para = n1 + n2 - 1;
                                    if (rysyWidac && PLR[para] == 1)
                                    {
                                        // odległość od dwusiecznej dwóch ziaren (px) — prosta krawędź płatu
                                        double de = (d2 - d1) * PLI[para] * zoom;
                                        if (de < rysaW && smooth[((I(wyP * 2.3) & 255) << 8) | (I(wxp * 2.3) & 255)] > 0.33) rysa = 1 - de / rysaW;
                                    }
                                }
                                double tone = (kT * (0.5 + 0.85 * bl) + lt * 0.16) * (0.2 + 0.8 * mem) * kontrast;
                                if (slad == 1) tone *= 1.25;
                                else if (slad == 2) tone *= 0.7;
                                if (tone > TONE_MAX) tone = TONE_MAX;
                                // spoina warstwy: kreska się na niej urywa, a masa ciemnieje
                                double bed = 0;
                                if (bedS > 0)
                                {
                                    double bpp = (wyP + kolFala[px]) * bedF;
                                    double bi = Math.Floor(bpp + 0.5);
                                    double bt = bpp - bi; if (bt < 0) bt = -bt;
                                    double dpx = bt * bedPx;
                                    if (dpx < 1.2 && smooth[((I(bi * 37) & 255) << 8) | ((gx >> 3) & 255)] > 0.46) bed = (1.2 - dpx) / 1.2 * bedS;
                                    r *= 1 - bed * 0.5; g *= 1 - bed * 0.5; b *= 1 - bed * 0.5;
                                }
                                if (plaski)
                                {
                                    // z daleka: gęsta ukośna kreska co cztery piksele — skała ma fakturę, pustka jest gładka
                                    double kk = Math.Min(1, tone * 1.3) * (((gx + gy) & 3) == 0 ? 0.75 : 0.18);
                                    r += (kTr - r) * kk; g += (kTg - g) * kk; b += (kTb - b) * kk;
                                }
                                else if (tone > 0.02)
                                {
                                    // kierunek rylca: kąt warstwy z gładkiej granicy i odchylenie płatu
                                    double angP;
                                    if (wlasnyKat) angP = katStaly ? a00 : aa0 * (1 - fx) + aa1 * fx;
                                    else angP = KAT_WARSTW[wyP < kolG1[px] ? 0 : wyP < kolG2[px] ? 1 : 2];
                                    angP += platKat;
                                    int ai = I((angP + 1.8) * 71.1);
                                    ai = ai < 0 ? 0 : ai > 256 ? 256 : ai;
                                    double ca = cosT[ai], sa = sinT[ai];
                                    // kreska drży wzdłuż siebie jak prowadzona ręką; pokrycie z odległości od jej osi
                                    double jit = (smooth[(ny2 << 8) | (gx & 255)] - 0.5) * pSp * 0.12;
                                    int gyw = gy;
                                    double uu = (gx * ca + gyw * sa + jit) * isp;
                                    double nr = Math.Floor(uu + 0.5);
                                    double tt = uu - nr; if (tt < 0) tt = -tt;
                                    double hw = tone * pSp * 0.3;
                                    hw = hw < 0.3 ? 0.3 : hw > hwMax ? hwMax : hw;
                                    double cov = hw + 0.5 - tt * pSp;
                                    // kreska rwie się na odcinki różnej długości, a każdy odcinek pęcznieje w środku
                                    if (cov > 0)
                                    {
                                        double wzd = (gyw * ca - gx * sa) * dashF;
                                        double wi = Math.Floor(wzd), wt = wzd - wi;
                                        int rz = (I(nr * 29) & 255) << 8;
                                        double dd0 = smooth[rz | (I(wi) & 255)], dd1 = smooth[rz | ((I(wi) + 1) & 255)];
                                        // pamiętane dawno: odcinki rzedną (kreska rwie się w szkic, nie w kropki)
                                        double przer = dd0 + (dd1 - dd0) * wt - przOff + bl * 0.2 - (mem < 0.9 ? (0.9 - mem) * 0.45 : 0);
                                        if (przer <= 0) cov = 0;
                                        else if (przer < 0.2)
                                        {
                                            double nac = przer / 0.2;
                                            cov = (0.25 + hw * nac) + 0.25 - tt * pSp;
                                            if (cov > 0) cov *= 0.4 + 0.6 * nac;
                                        }
                                    }
                                    cov = cov < 0 ? 0 : cov > 1 ? 1 : cov;
                                    if (tone > pCross)
                                    {
                                        // krzyż pod kątem ok. 63° do kreski i rzadszy
                                        double c2a = ca * 0.4536 - sa * 0.8912, s2a = sa * 0.4536 + ca * 0.8912;
                                        double u2 = (gx * c2a + gyw * s2a + jit * 0.6) * isp2;
                                        double n2 = Math.Floor(u2 + 0.5);
                                        double t2 = u2 - n2; if (t2 < 0) t2 = -t2;
                                        double hw2 = (tone - pCross) * pSp * 0.3;
                                        hw2 = hw2 < 0.28 ? 0.28 : hw2 > hwMax * 0.75 ? hwMax * 0.75 : hw2;
                                        double c2 = hw2 + 0.5 - t2 * sp2;
                                        if (c2 > 0 && smooth[((I(n2 * 53) & 255) << 8) | (I((gyw * c2a - gx * s2a) * dashF) & 255)] > 0.5)
                                        {
                                            // krzyż słabszy i w urywkach
                                            c2 = (c2 > 1 ? 1 : c2) * 0.34;
                                            if (c2 > cov) cov = c2;
                                        }
                                    }
                                    if (pStip > 0 && cov < 0.6 && noise[(ny2b << 8) | ((gx * 2 + 13) & 255)] < pStip * tone) cov = 0.6;
                                    // iskry w rudzie i krysztale: metal i szkło łapią światło
                                    if (iskry && noise[(((gy * 5 + 7) & 255) << 8) | ((gx * 5 + 3) & 255)] > 0.996)
                                    {
                                        r = 255; g = mat == T.ORE || mat == T.ZLOTO ? 230 : 244; b = mat == T.ORE ? 170 : mat == T.ZLOTO ? 120 : 255;
                                        if (mat == T.CRYSTAL) { edata[o] = 200; edata[o + 1] = 190; edata[o + 2] = 255; edata[o + 3] = 255; }
                                        cov = 0;
                                    }
                                    if (bed > 0) cov *= 1 - bed * 1.6 < 0 ? 0 : 1 - bed * 1.6;
                                    if (rysa > 0)
                                    {
                                        // w rysie kreska się urywa, a szczelina ciemnieje
                                        cov *= 1 - rysa;
                                        double krr = rysa * RYSA_SILA * (0.4 + 0.6 * mem);
                                        r *= 1 - krr; g *= 1 - krr; b *= 1 - krr;
                                    }
                                    if (cov > 0)
                                    {
                                        double cr = kTr, cg = kTg, cb = kTb;
                                        if (mem < 0.8)
                                        {
                                            double sz = (cr + cg + cb) / 3;
                                            double ile = (0.8 - mem) / 0.8 * 0.8;
                                            cr += (sz - cr) * ile; cg += (sz - cg) * ile; cb += (sz - cb) * ile;
                                        }
                                        // w głębi masy kreska przygasa, przy jaskini i w świetle jaśnieje
                                        double kk = (0.3 + tone * 0.6 + bl * 0.12 + lt * 0.16) * (0.3 + 0.7 * mem) * pJas;
                                        if (kk > 0.85) kk = 0.85;
                                        kk *= cov;
                                        r += (cr - r) * kk; g += (cg - g) * kk; b += (cb - b) * kk;
                                    }
                                }
                                // na skraju pamięci skała gaśnie w półmrok nieznanego
                                if (mem < 0.45)
                                {
                                    double wid = mem / 0.45, w2 = wid * wid * (3 - 2 * wid);
                                    r = gmR + 4 + (r - gmR - 4) * w2; g = gmG + 3 + (g - gmG - 3) * w2; b = gmB + 3 + (b - gmB - 3) * w2;
                                }
                            }
                            if (gC > 0) { double kk = gC * gSila * mem; r += (GC[0] - r) * kk; g += (GC[1] - g) * kk; b += (GC[2] - b) * kk; }
                            if (gJ > 0) { double kk = gJ * gSila * 0.55 * mem * (0.6 + 0.4 * (lt > 1 ? 1 : lt)); r += (GJ[0] - r) * kk; g += (GJ[1] - g) * kk; b += (GJ[2] - b) * kk; }
                        }
                        else
                        {
                            // jaskinia: gładka, ciepła tylna ściana — ciemniejsza w kątach przy skale, jaśniejsza w otwartej przestrzeni
                            double op = oa0 * (1 - fx) + oa1 * fx;
                            double sp0 = sa0 * (1 - fx) + sa1 * fx;
                            double ops = op * (2 - op) * (0.55 + 0.45 * sp0);
                            double sciana = (smooth[((I(gy * 0.7) & 255) << 8) | (I(gx * 0.7) & 255)] - 0.5) * RS.tynk
                                + (smooth[(ny2 << 8) | ((gx * 3) & 255)] - 0.5) * RS.tynk * 0.35;
                            // pamięć: tylna ściana gaśnie płynnie w półmrok nieznanego — bez progu na brzegu
                            double pam = (mem - 0.06) / 0.6;
                            pam = pam >= 1 ? 1 : pam * (2 - pam);
                            double grzbiet = tile == T.SKY ? World.SURFACE_Y - kolGrzbiet[px] : 1e9;
                            if (tile == T.SKY && wyP >= grzbiet)
                            {
                                // grzbiet góry: ziemia rytowana skośną kreską, u góry kontur rylca
                                double zd = (wyP - grzbiet) * zoom;
                                double z0 = ziarno[((gy & 255) << 8) | (gx & 255)];
                                var mS = MASA[T.SOIL];
                                r = mS[0] * 0.9 + z0 * 10; g = mS[1] * 0.9 + z0 * 8; b = mS[2] * 0.9 + z0 * 6;
                                double kt = ((gx + gy) % 6 + 6) % 6;
                                kt = kt < 1.2 && smooth[(ny2 << 8) | ((gx >> 2) & 255)] > 0.35 ? 0.35 : 0;
                                var tz = MATERIALY[T.SOIL].tint;
                                r += (tz[0] - r) * kt; g += (tz[1] - g) * kt; b += (tz[2] - b) * kt;
                                double kon = 1.2 + zoom * 0.05 - zd;
                                if (kon > 0) { double kk = kon > 1 ? 0.95 : kon * 0.95; r += (KO[0] - r) * kk; g += (KO[1] - g) * kk; b += (KO[2] - b) * kk; }
                            }
                            else if (tile == T.SKY)
                            {
                                // niebo nad górą: zmierzch rytowany poziomą kreską; przy horyzoncie jaśniej
                                double hor = (World.SURFACE_Y - wyP) / 14;
                                double zorza = hor >= 1 ? 0 : (1 - (hor < 0 ? 0 : hor)) * RS.zorza;
                                r = RS.niebo[0] + sciana * 0.4 + zorza * 1.3; g = RS.niebo[1] + sciana * 0.4 + zorza; b = RS.niebo[2] + sciana * 0.4 + zorza * 0.7;
                                int krokN = zoom < 8 ? 3 : 4;
                                double tn = (gy + (smooth[(ny2 << 8) | ((gx >> 2) & 255)] - 0.5) * 1.6) / krokN;
                                tn -= Math.Floor(tn + 0.5); if (tn < 0) tn = -tn;
                                double kn = 0.9 - tn * krokN;
                                if (kn > 0)
                                {
                                    kn *= 0.32 * (smooth[(((gy >> 2) & 255) << 8) | (((gx >> 4) + 40) & 255)] > 0.3 ? 1 : 0.5);
                                    var NK = RS.nieboKreska;
                                    r += (NK[0] - r) * kn; g += (NK[1] - g) * kn; b += (NK[2] - b) * kn;
                                }
                            }
                            else
                            {
                                var gm = GM[ws];
                                // światło mnoży tylną ścianę zamiast ją zalewać — kąty zostają ciemniejsze od środka
                                double lm = 1 + lt * 0.5, ch = (1 - (lt > 1 ? 1 : lt)) * 0.1;
                                double br = (acR + (aoR - acR) * ops + sciana) * lm * (1 - ch) + lt * SP[0] * 0.5;
                                double bg = (acG + (aoG - acG) * ops + sciana * 0.85) * lm + lt * SP[1] * 0.5;
                                double bb = (acB + (aoB - acB) * ops + sciana * 0.7) * lm * (1 + ch * 0.6) + lt * SP[2] * 0.5;
                                // tylna ściana rytowana: w kątach i pod sklepieniem gęsta, ciemna kreska; światło ją rozpuszcza
                                if (!plaski)
                                {
                                    double ltc = lt > 1 ? 1 : lt;
                                    double kat = 1 - ops, dal = (1 - ltc) * 0.7;
                                    double cien = (kat > dal ? kat : dal) * (1 - ltc * 0.45);
                                    if (cien > 0.06)
                                    {
                                        double uw2 = (gx * 0.2 + gy * 0.98 + (smooth[(ny2 << 8) | ((gx >> 1) & 255)] - 0.5) * 1.2) * iwSp;
                                        double tw = uw2 - Math.Floor(uw2 + 0.5); if (tw < 0) tw = -tw;
                                        double cw = 0.25 + cien * 0.75 + 0.5 - tw * wSp;
                                        if (cw > 0)
                                        {
                                            cw = cw > 1 ? 1 : cw;
                                            // odcinki: kreska tylnej ściany rwie się częściej niż w skale
                                            double rw = smooth[(((I(uw2 + 0.5) * 41) & 255) << 8) | (I((gx - gy * 0.2) * dashF * 1.4) & 255)];
                                            if (rw > 0.62 - cien * 0.3)
                                            {
                                                double kw = cw * cien * 0.3;
                                                br -= br * kw; bg -= bg * kw; bb -= bb * kw;
                                            }
                                        }
                                    }
                                }
                                // tylna ściana sali: wielkie ciosy kamienia na zakładkę
                                if (!plaski && soX1 >= 0 && tx >= soX0 && tx <= soX1 && ty >= soY0 && ty <= soY1)
                                {
                                    double wierszC = Math.Floor(wyP * RS.ciosy.wys), fbyR = wyP * RS.ciosy.wys - wierszC;
                                    double bxS = kolX[px] / RS.ciosy.szer + (I(wierszC) & 1) * 0.5, ib = Math.Floor(bxS), fbx = bxS - ib;
                                    double dV = (fbx < 0.5 ? fbx : 1 - fbx) * RS.ciosy.szer * zoom, dH = (fbyR < 0.5 ? fbyR : 1 - fbyR) * zoom / RS.ciosy.wys;
                                    double fuga = 1 - (dV < dH ? dV : dH) / ciosW;
                                    double odc = 1 + ((((uint)unchecked(I(ib) * 73856093 ^ I(wierszC) * 19349663) >> 8) & 255) / 255.0 - 0.5) * RS.ciosy.rozrzut;
                                    double kc = odc;
                                    if (fuga > 0) kc *= 1 - (fuga > 1 ? 1 : fuga) * RS.ciosy.fuga;
                                    else if (fbyR * zoom / RS.ciosy.wys < ciosW * 2.2) kc *= 1 + RS.ciosy.faza;
                                    br *= kc; bg *= kc; bb *= kc;
                                }
                                // pamiętana jaskinia gaśnie w jaśniejszy półmrok niż skała
                                double pj = (mem - 0.06) / 0.2; pj = pj <= 0 ? 1 : pj >= 1 ? 1.6 : 1 + pj * 0.6;
                                double gr0 = gm[0] * pj, gg0 = gm[1] * pj, gb0 = gm[2] * pj;
                                r = gr0 + (br - gr0) * pam; g = gg0 + (bg - gg0) * pam; b = gb0 + (bb - gb0) * pam;
                                if (gC > 0) { double kk = gC * 0.3 * mem; r += (GC[0] - r) * kk; g += (GC[1] - g) * kk; b += (GC[2] - b) * kk; }
                            }
                            if (slad == 1) { r += 5; g += 4; b += 2; }
                            // pył w powietrzu: rzadkie jasne ziarna
                            if (!plaski && noise[(ny << 8) | ((gx * 3 + 17) & 255)] > 0.993 - lt * 0.01) { r += 26 * pam; g += 21 * pam; b += 15 * pam; }

                            if (tile == T.FUNGUS)
                            {
                                // grzybnia: gęste kępy świecących zarodni, gęściej przy podłożu
                                double z1 = noise[(((gy * 2 + 3) & 255) << 8) | ((gx * 2 + 91) & 255)];
                                double gest = 0.28 + fy * 0.34;
                                if (z1 < gest)
                                {
                                    double jas = z1 < gest * 0.35 ? 1 : 0.6;
                                    double zr = (70 + 70 * jas) * pam, zg = (120 + 110 * jas) * pam, zb = (60 + 50 * jas) * pam;
                                    r += (zr - r) * 0.85; g += (zg - g) * 0.85; b += (zb - b) * 0.85;
                                    if (jas == 1) { edata[o] = C8(zr * 0.8); edata[o + 1] = C8(zg); edata[o + 2] = C8(zb * 0.7); edata[o + 3] = 255; }
                                }
                            }
                            else if (tile == T.BONES)
                            {
                                // kości: blade, krótkie kreski na dnie
                                double k1 = noise[(((gy * 3 + 11) & 255) << 8) | ((gx + 57) & 255)];
                                if (fy > 0.4 && k1 < 0.22) { r += (218 - r) * 0.8 * pam; g += (208 - g) * 0.8 * pam; b += (186 - b) * 0.8 * pam; }
                            }
                            else if (tile == T.WEB)
                            {
                                // sieć: cienkie nici na krzyż
                                bool n1 = ((gx + gy * 0.9) % 7 + 7) % 7 < 0.8, n2 = ((gx - gy * 1.1) % 9 + 9) % 9 < 0.8;
                                if (n1 || n2) { r += (214 - r) * 0.55 * pam; g += (208 - g) * 0.55 * pam; b += (228 - b) * 0.55 * pam; }
                            }
                            else if (tile == T.NEST)
                            {
                                // gniazdo: kopczyk słomy i ziemi, gęstszy u dołu
                                double n1 = noise[(((gy * 2 + 5) & 255) << 8) | ((gx * 2 + 23) & 255)];
                                if (n1 < 0.1 + fy * 0.55) { r += (150 - r) * 0.7 * pam; g += (108 - g) * 0.7 * pam; b += (64 - b) * 0.7 * pam; }
                            }
                            else if (tile == T.GLYPH)
                            {
                                // ślad Znaku: złoty, promienisty
                                double ddx = fx - 0.5, dy2 = fy - 0.5;
                                double d = Math.Sqrt(ddx * ddx + dy2 * dy2);
                                bool prom = Math.Abs(JsMath.Sin(JsMath.Atan2(dy2, ddx) * 4)) > 0.8 && d < 0.48;
                                if (d < 0.18 || prom) { r = 250; g = 214; b = 130; edata[o] = 250; edata[o + 1] = 214; edata[o + 2] = 120; edata[o + 3] = 255; }
                            }
                        }

                        // świetlik podłogi, potem kontur rylcem — w tym samym miejscu, w którym ściana naprawdę jest
                        if (swP > 0) { r += (SW[0] - r) * swP; g += (SW[1] - g) * swP; b += (SW[2] - b) * swP; }
                        if (linia > 0) { r += (KO[0] - r) * linia; g += (KO[1] - g) * linia; b += (KO[2] - b) * linia; }
                        data[o] = C8(r); data[o + 1] = C8(g); data[o + 2] = C8(b); data[o + 3] = 255;
                        // do poświaty trafia tylko to, co naprawdę świeci (ogień, grzybnia, Znak — nie lampki)
                        if (swieci && rodzaj < 2)
                        {
                            double le = ea0 * (1 - fx) + ea1 * fx;
                            if (le > 0.25)
                            {
                                double moc = (le - 0.25) / 0.75 * 0.7;
                                if (moc * 255 > edata[o + 3]) { edata[o] = C8(r * moc); edata[o + 1] = C8(g * moc); edata[o + 2] = C8(b * moc); edata[o + 3] = C8(255 * moc); }
                            }
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------------------ fresk

        /// <summary>Fresk (ustawienia → „Rysunek świata”): półki pigmentu, świetlik i sinopia.</summary>
        void malujFresk(World w, KameraRyciny cam, double time)
        {
            double zoom = cam.zoom / scale;
            double left = cam.x - aw / 2.0 / zoom;
            double top = cam.y - ah / 2.0 / zoom;
            int tx0 = (int)Math.Floor(left) - 1, ty0 = (int)Math.Floor(top) - 1;
            int tx1 = (int)Math.Ceiling(left + aw / zoom) + 1, ty1 = (int)Math.Ceiling(top + ah / zoom) + 1;
            int ox = (int)Math.Floor(left * zoom), oy = (int)Math.Floor(top * zoom);
            Parallel.For(ty0, ty1 + 1, () => new Brudnopis(), (ty, _, bp) =>
            {
                FreskWiersz(w, ty, tx0, tx1, zoom, left, top, ox, oy, time, bp);
                return bp;
            }, _ => { });
        }

        void FreskWiersz(World w, int ty, int tx0, int tx1, double zoom, double left, double top, int ox, int oy, double time, Brudnopis bp)
        {
            var data = dane; var edata = edane;
            var noise = this.noise; var smooth = this.smooth; var szkic = this.szkic;
            double fala = time * 0.0016;
            bool plaski = zoom < 2.6;
            double kontrast = ustawienia.kontrast;
            double tetno = 0.5 + 0.5 * JsMath.Sin(time * 0.0025);
            bool linie = zoom >= 1.6;
            double hwP = Math.Max(0.95, zoom / 9), hwS = Math.Max(0.55, zoom / 22);
            var S9 = bp.S9; var M9 = bp.M9; var W9 = bp.W9;
            var pA = bp.pA; var pB = bp.pB; var pig = bp.pig; var KR = bp.kraw;
            int lw = this.lw, W = (int)w.w, Hh = (int)w.h;
            var F = fresh; var L = light; var LT = swiatlo; var B = bliskosc; var S = sol; var R = rys;
            var MP = magmaP; var WP = wodaP; var MI = miek; var RK = rogK;
            var waterA = w.water.d; var magmaA = w.magma.d; var sladA = w.slad.d;
            int aw = this.aw, ah = this.ah;

            // Piksel nieznanego: ciemna ściana, a pod nią szkic sinopii.
            void nieznane(int o, int gx, int gy)
            {
                double ziarnoP = smooth[(((gy * 2) & 255) << 8) | ((gx * 2) & 255)] * 5.0 + noise[((gy & 255) << 8) | (gx & 255)] * 4.0;
                // szkic sinopii, urywany jak kreślony pędzlem
                double k = szkic[(((gy >> 1) & 255) << 8) | ((gx >> 1) & 255)] * FS.szkicSila * (smooth[((((gy >> 2) + 61) & 255) << 8) | (((gx >> 2) + 17) & 255)] > 0.42 ? 1 : 0.25);
                double nr = FS.nieznane[0] + ziarnoP * 0.6, ng = FS.nieznane[1] + ziarnoP * 0.5, nb = FS.nieznane[2] + ziarnoP * 0.45;
                data[o] = C8(nr + (FS.szkic[0] - nr) * k); data[o + 1] = C8(ng + (FS.szkic[1] - ng) * k); data[o + 2] = C8(nb + (FS.szkic[2] - nb) * k);
                data[o + 3] = 255;
            }

            double depth = w.depth(ty);
            void ustaw(Kreska P, int mat)
            {
                pigmentFresku(mat, depth, pig, 0);
                P.mat = mat;
                P.br = pig[0]; P.bg = pig[1]; P.bb = pig[2]; P.tr = pig[3]; P.tg = pig[4]; P.tb = pig[5];
                P.toneC = 0.5; P.sp = 4; P.cross = 1; P.stip = 0;
            }
            double rog(float[] LL, int a, int b, int c, int d)
            {
                double wa = 1 - (double)S9[a], wb = 1 - (double)S9[b], wc = 1 - (double)S9[c], wd = 1 - (double)S9[d];
                var den = wa + wb + wc + wd;
                return den > 0 ? (LL[a] * wa + LL[b] * wb + LL[c] * wc + LL[d] * wd) / den : 0;
            }

            int py0 = (int)Math.Max(0, Rnd((ty - top) * zoom));
            int py1 = (int)Math.Min(ah, Rnd((ty + 1 - top) * zoom));
            if (py1 <= py0) return;
            bool inbY = ty >= 0 && ty < Hh;
            double czerwien = Math.Pow(depth, 1.9);

            for (int tx = tx0; tx <= tx1; tx++)
            {
                int px0 = (int)Math.Max(0, Rnd((tx - left) * zoom));
                int px1 = (int)Math.Min(aw, Rnd((tx + 1 - left) * zoom));
                if (px1 <= px0) continue;
                bool inb = inbY && tx >= 0 && tx < W;
                int i = inb ? ty * W + tx : -1;
                int kx = tx - lx0, ky = ty - ly0;
                int k = ky * lw + kx;
                bool wOknie = kx >= 1 && ky >= 1 && kx < lw - 2 && ky < lh - 2;
                double f00 = wOknie ? F[k] : 0, f10 = wOknie ? F[k + 1] : 0;
                double f01 = wOknie ? F[k + lw] : 0, f11 = wOknie ? F[k + lw + 1] : 0;
                double known = f00 + f10 + f01 + f11;
                if (known <= 0.002)
                {
                    for (int py = py0; py < py1; py++)
                    {
                        int gy = py + oy, row = py * aw;
                        for (int px = px0; px < px1; px++) nieznane((row + px) * 4, px + ox, gy);
                    }
                    continue;
                }
                double l00 = LT[k], l10 = LT[k + 1], l01 = LT[k + lw], l11 = LT[k + lw + 1];
                double e00 = L[k], e10 = L[k + 1], e01 = L[k + lw], e11 = L[k + lw + 1];
                double b00 = B[k], b10 = B[k + 1], b01 = B[k + lw], b11 = B[k + lw + 1];

                double suma = 0, ciecz = 0;
                for (int ddy = -1; ddy <= 1; ddy++)
                {
                    int kk = k + ddy * lw;
                    for (int ddx = -1; ddx <= 1; ddx++)
                    {
                        int j = (ddy + 1) * 3 + ddx + 1;
                        var s = S[kk + ddx];
                        S9[j] = s; suma += s;
                        var m = MP[kk + ddx]; var wo = WP[kk + ddx];
                        M9[j] = m; W9[j] = wo; ciecz += (double)m + wo;
                    }
                }
                bool lity = S9[4] == 1;
                bool brzegowy = suma > 0 && suma < 9;
                bool cieczObok = ciecz > 0;
                double m00 = 0, m10 = 0, m01 = 0, m11 = 0, w00 = 0, w10 = 0, w01 = 0, w11 = 0;
                if (cieczObok)
                {
                    m00 = rog(M9, 0, 1, 3, 4); m10 = rog(M9, 1, 2, 4, 5); m01 = rog(M9, 3, 4, 6, 7); m11 = rog(M9, 4, 5, 7, 8);
                    w00 = rog(W9, 0, 1, 3, 4); w10 = rog(W9, 1, 2, 4, 5); w01 = rog(W9, 3, 4, 6, 7); w11 = rog(W9, 4, 5, 7, 8);
                }
                int tile = R[k];
                int water = inb ? waterA[i] : 0;
                int magma = inb ? magmaA[i] : 0;
                int slad = inb ? sladA[i] : 0;
                bool lustro = water > 0 && inb && ty > 0 && waterA[i - W] == 0;
                bool miekko = lity && MI[k] == 1;
                int c00 = k * 7, c10 = c00 + 7, c01 = (k + lw) * 7, c11 = c01 + 7;
                if (lity) ustaw(pA, tile);
                else if (brzegowy)
                {
                    int nb = S9[7] != 0 ? R[k + lw] : S9[3] != 0 ? R[k - 1] : S9[5] != 0 ? R[k + 1] : S9[1] != 0 ? R[k - lw]
                        : S9[6] != 0 ? R[k + lw - 1] : S9[8] != 0 ? R[k + lw + 1] : S9[0] != 0 ? R[k - lw - 1] : R[k - lw + 1];
                    ustaw(pB, nb);
                }
                var P = lity ? pA : pB;
                int pMat = P.mat;
                double pBr = P.br, pBg = P.bg, pBb = P.bb, pTr = P.tr, pTg = P.tg, pTb = P.tb;

                for (int py = py0; py < py1; py++)
                {
                    double fy = (py / zoom + top) - ty;
                    int gy = py + oy;
                    int row = py * aw;
                    int ny = gy & 255, ny2 = (gy + 71) & 255, nyS = I(gy * 0.55) & 255;
                    double fyi = 1 - fy;
                    double fa0 = f00 * fyi + f01 * fy, fa1 = f10 * fyi + f11 * fy;
                    double la0 = l00 * fyi + l01 * fy, la1 = l10 * fyi + l11 * fy;
                    double ea0 = e00 * fyi + e01 * fy, ea1 = e10 * fyi + e11 * fy;
                    double ba0 = b00 * fyi + b01 * fy, ba1 = b10 * fyi + b11 * fy;
                    int qy = fy < 0.5 ? 0 : 3;
                    double v = fy < 0.5 ? fy + 0.5 : fy - 0.5;
                    double sv = v * v * (3 - 2 * v), dv = 6 * v * (1 - v);
                    int wyq = I((ty + fy) * 4.3) & 255;
                    if (miekko)
                        for (int c = 0; c < 7; c++)
                        {
                            KR[c] = (float)(RK[c00 + c] * fyi + RK[c01 + c] * fy);
                            KR[7 + c] = (float)(RK[c10 + c] * fyi + RK[c11 + c] * fy);
                        }
                    double ey = fy < 0.5 ? 1 - fy * 2 : fy * 2 - 1;

                    for (int px = px0; px < px1; px++)
                    {
                        double fx = (px / zoom + left) - tx;
                        int gx = px + ox;
                        int o = (row + px) * 4;
                        double ft = fa0 * (1 - fx) + fa1 * fx;
                        double fr = ft <= 0.001 ? 0 : ft + (smooth[(nyS << 8) | (I(gx * 0.35) & 255)] - 0.5) * 1.15;
                        if (fr <= 0.06) { nieznane(o, gx, gy); continue; }
                        double lt = la0 * (1 - fx) + la1 * fx;
                        double mem = fr < 1 ? fr : 1;

                        bool skala = lity; double linia = 0, swP = 0;
                        if (brzegowy)
                        {
                            int qx = fx < 0.5 ? 0 : 1;
                            double u = fx < 0.5 ? fx + 0.5 : fx - 0.5;
                            double s00 = S9[qy + qx], s10 = S9[qy + qx + 1], s01 = S9[qy + 3 + qx], s11 = S9[qy + 4 + qx];
                            double su = u * u * (3 - 2 * u);
                            double gT = s00 + (s10 - s00) * su, gB = s01 + (s11 - s01) * su;
                            double drzy = (smooth[(wyq << 8) | (I((tx + fx) * 4.3) & 255)] - 0.5) * 0.16;
                            double sP = gT + (gB - gT) * sv + drzy;
                            skala = sP > 0.5;
                            if (linie)
                            {
                                double gu = ((s10 - s00) * (1 - sv) + (s11 - s01) * sv) * 6 * u * (1 - u);
                                double gv = (gB - gT) * dv;
                                double grd = Math.Sqrt(gu * gu + gv * gv);
                                if (grd > 0.02)
                                {
                                    double d = Math.Abs(sP - 0.5) / grd * zoom;
                                    double podloga = gv > 0 ? gv / grd : 0;
                                    double hw = hwS + (hwP - hwS) * podloga * podloga;
                                    linia = hw + 0.5 - d;
                                    if (linia > 1) linia = 1;
                                    if (linia > 0) linia *= (0.55 + 0.35 * podloga) * (mem < 0.7 ? mem / 0.7 : 1);
                                    // fresk: świetlik — jasny pas na krawędzi podłogi, tuż pod konturem
                                    if (skala && podloga > 0.35)
                                    {
                                        double grub = FS.swietlikGrubosc * zoom + 1;
                                        double t = 1 - (d - hw * 0.6) / grub;
                                        if (t > 0 && d > hw * 0.6) swP = (t > 1 ? 1 : t) * podloga * FS.swietlikSila * (mem < 0.7 ? mem / 0.7 : 1);
                                    }
                                }
                            }
                        }
                        int rodzaj = skala ? 1 : 0;
                        if (!skala && cieczObok)
                        {
                            double mP = (m00 * (1 - fx) + m10 * fx) * (1 - fy) + (m01 * (1 - fx) + m11 * fx) * fy;
                            double wP = (w00 * (1 - fx) + w10 * fx) * (1 - fy) + (w01 * (1 - fx) + w11 * fx) * fy;
                            double brzeg = (smooth[(ny << 8) | ((gx * 2) & 255)] - 0.5) * 0.12;
                            if (mP + brzeg > 0.3) rodzaj = 3;
                            else if (wP + brzeg > 0.28 && magma == 0) rodzaj = 2;
                        }
                        double r, g, b;
                        if (rodzaj == 3)
                        {
                            double plyn = smooth[((I(gy * 0.62 - gx * 0.42 + fala * 40) & 255) << 8) | (I(gx * 0.62 + gy * 0.42 + fala * 23) & 255)];
                            double plyn2 = smooth[((I(gy * 1.2 + gx * 0.75 - fala * 31) & 255) << 8) | (I(gx * 1.2 - gy * 0.75 + fala * 17) & 255)];
                            double zyla = (plyn * 0.62 + plyn2 * 0.38 - 0.4) * 3.4;
                            zyla = zyla < 0 ? 0 : zyla > 1 ? 1 : zyla * zyla * (3 - 2 * zyla);
                            zyla = 0.2 + zyla * 0.8;
                            double moc = 0.55 + (magma != 0 ? magma : 4) / 8.0 * 0.45;
                            r = 150 + 105 * moc * (0.6 + 0.4 * zyla); g = (60 + 150 * zyla) * moc - depth * 20; b = (20 + 60 * zyla * zyla) * moc;
                            edata[o] = C8(r); edata[o + 1] = C8(g * 0.8); edata[o + 2] = C8(b * 0.5); edata[o + 3] = 255;
                        }
                        else if (rodzaj == 2)
                        {
                            double glab = (water != 0 ? water : 3) / 8.0;
                            double fal = JsMath.Sin(gx * 0.35 + fala * 3 + ty * 1.7) * 0.8;
                            bool pas = ((gy + fal) % 4 + 4) % 4 < 1;
                            // lapis z jasnymi falami malowanymi pędzlem
                            r = FS.woda[0] + lt * 30; g = FS.woda[1] + lt * 26 - glab * 6; b = FS.woda[2] + lt * 12 + glab * 8;
                            if (pas && noise[(ny2 << 8) | (gx & 255)] > 0.3) { r += (FS.fala[0] - r) * 0.6; g += (FS.fala[1] - g) * 0.6; b += (FS.fala[2] - b) * 0.6; }
                            if (lustro && fy < 0.28) { double kk = 1 - fy / 0.28; r += 150 * kk; g += 170 * kk; b += 170 * kk; }
                            r = r * (0.35 + 0.65 * mem); g = g * (0.35 + 0.65 * mem); b = b * (0.35 + 0.65 * mem);
                        }
                        else if (rodzaj == 1)
                        {
                            int mat = pMat;
                            if (mat == T.CORE)
                            {
                                double dxr = tx + fx - w.coreX - 0.5, dyr = ty + fy - w.coreY - 0.5;
                                double dr = Math.Sqrt(dxr * dxr + dyr * dyr);
                                double krag = 0.5 + 0.5 * JsMath.Sin(dr * 5 - time * 0.004);
                                double RRk = 1.55 + 0.18 * tetno;
                                double kula = (RRk + 0.3 - dr) / 0.6;
                                kula = kula < 0 ? 0 : kula > 1 ? 1 : kula * kula * (3 - 2 * kula);
                                double srodek = Math.Max(0, 1 - dr / 2.2);
                                double pr = 120 + 130 * srodek + 40 * krag, pg = 20 + 80 * srodek * srodek + 20 * krag * srodek, pb = 28 + 56 * srodek * srodek;
                                double blask = Math.Max(0, 1 - dr / 3.6) * (0.5 + 0.5 * tetno);
                                double sr = 30 + 70 * blask, sg = 10 + 12 * blask, sbb = 12 + 12 * blask;
                                r = sr + (pr - sr) * kula; g = sg + (pg - sg) * kula; b = sbb + (pb - sbb) * kula;
                                edata[o] = C8(r); edata[o + 1] = C8(g * 0.6); edata[o + 2] = C8(b * 0.6); edata[o + 3] = C8(255 * (0.25 + 0.6 * tetno) * (0.35 + 0.65 * kula));
                            }
                            else
                            {
                                // fresk: półki pigmentu jak góra z ikony — najjaśniejsza przy jaskini, w głębi ciemniej
                                double bl = ba0 * (1 - fx) + ba1 * fx;
                                double pr = pBr, pg = pBg, pb = pBb, sr = pTr, sg = pTg, sbb = pTb;
                                if (miekko)
                                {
                                    double ex = fx < 0.5 ? 1 - fx * 2 : fx * 2 - 1;
                                    double t = ex > ey ? ex : ey;
                                    t *= t;
                                    double fxi = 1 - fx;
                                    pr += (KR[0] * fxi + KR[7] * fx - pr) * t;
                                    pg += (KR[1] * fxi + KR[8] * fx - pg) * t;
                                    pb += (KR[2] * fxi + KR[9] * fx - pb) * t;
                                    sr += (KR[3] * fxi + KR[10] * fx - sr) * t;
                                    sg += (KR[4] * fxi + KR[11] * fx - sg) * t;
                                    sbb += (KR[5] * fxi + KR[12] * fx - sbb) * t;
                                }
                                // półki: obiegają jaskinie i schodzą stokiem; jasna górna krawędź, ciemny spód
                                double fal = (smooth[((I(gy * 0.45) & 255) << 8) | (I(gx * 0.3) & 255)] - 0.5) * FS.falowanie;
                                double pole = bl * FS.polkiOdJaskini + (ty + fy) * FS.polkiPion + fal;
                                double f = pole - Math.Floor(pole);
                                double jas = (FS.jasnoscGlebi + (FS.jasnoscKrawedzi - FS.jasnoscGlebi) * bl) * (1 - f * FS.polkaCien * kontrast);
                                // smugi pędzla wzdłuż półek
                                jas *= 1 + (smooth[((gy & 255) << 8) | (((gx >> 2) + (gy >> 3)) & 255)] - 0.5) * 2 * FS.pedzel;
                                r = pr * jas; g = pg * jas; b = pb * jas;
                                // brzegi półek: świetlik u góry, kreska sinopii u dołu (grubość stała na ekranie)
                                double kr = FS.polkaKreska * FS.polkiPion / Math.Max(1, zoom);
                                if (f < kr * 1.4) { double kk = (1 - f / (kr * 1.4)) * FS.polkaSwietlikSila * kontrast; r += (sr - r) * kk; g += (sg - g) * kk; b += (sbb - b) * kk; }
                                else if (f > 1 - kr) { double kk = (1 - (1 - f) / kr) * FS.polkaKreskaSila * kontrast; r += (FS.kontur[0] - r) * kk; g += (FS.kontur[1] - g) * kk; b += (FS.kontur[2] - b) * kk; }
                                // pamięć: pigment blednie ku tynkowi, a gdzieniegdzie odpadł do gołego tynku
                                if (mem < 1)
                                {
                                    double blak = (1 - mem) * 0.65;
                                    r += (FS.tynk[0] - r) * blak; g += (FS.tynk[1] - g) * blak; b += (FS.tynk[2] - b) * blak;
                                    if (smooth[((((gy >> 1) + 97) & 255) << 8) | (((gx >> 1) + 41) & 255)] > 1 - FS.ubytki * (1 - mem))
                                    {
                                        r = FS.tynk[0] * 0.8; g = FS.tynk[1] * 0.8; b = FS.tynk[2] * 0.8;
                                    }
                                }
                                if (swP > 0) { r += (sr - r) * swP; g += (sg - g) * swP; b += (sbb - b) * swP; }
                                double ciem = 0.5 + 0.5 * mem;
                                r = r * ciem + lt * 46; g = g * ciem + lt * 26; b = b * ciem + lt * 10;
                                // na skraju pamięci farba gaśnie w ciemną ścianę
                                if (mem < 0.45)
                                {
                                    double wid = mem / 0.45, w2 = wid * wid * (3 - 2 * wid);
                                    r = FS.nieznane[0] + (r - FS.nieznane[0]) * w2; g = FS.nieznane[1] + (g - FS.nieznane[1]) * w2; b = FS.nieznane[2] + (b - FS.nieznane[2]) * w2;
                                }
                                if (slad == 1) { r *= 1.08; g *= 1.06; b *= 1.04; } else if (slad == 2) { r *= 0.8; g *= 0.8; b *= 0.8; }
                                // ruda i kryształ: drobiny złota i szkła łapią światło
                                if ((mat == T.ORE || mat == T.CRYSTAL || mat == T.ZLOTO) && noise[(((gy * 5 + 7) & 255) << 8) | ((gx * 5 + 3) & 255)] > 0.99)
                                {
                                    r = 255; g = mat == T.ORE || mat == T.ZLOTO ? 214 : 236; b = mat == T.ORE ? 120 : mat == T.ZLOTO ? 90 : 255;
                                    if (mat == T.CRYSTAL) { edata[o] = 200; edata[o + 1] = 190; edata[o + 2] = 255; edata[o + 3] = 255; }
                                }
                            }
                        }
                        else
                        {
                            // jaskinia: gładki półmrok z ledwie widoczną fakturą tylnej ściany
                            double sciana = (smooth[((I(gy * 0.7) & 255) << 8) | (I(gx * 0.7) & 255)] - 0.5) * 12
                                + (smooth[(ny2 << 8) | ((gx * 3) & 255)] - 0.5) * 4;
                            double pam = 0.3 + 0.7 * mem;
                            if (tile == T.SKY) { r = 84 + sciana * 1.2; g = 62 + sciana; b = 30 + sciana * 0.6; }
                            else
                            {
                                r = FS.grota[0] + czerwien * 8 + (sciana * 0.45 + lt * 92) * pam;
                                g = FS.grota[1] + (sciana * 0.38 + lt * 56) * pam;
                                b = FS.grota[2] + (sciana * 0.3 + lt * 24) * pam;
                            }
                            if (slad == 1) { r += 7; g += 5; b += 3; }
                            if (!plaski && noise[(ny << 8) | ((gx * 3 + 17) & 255)] > 0.992 - lt * 0.01) { r += 30 * pam; g += 24 * pam; b += 18 * pam; }
                            if (tile == T.FUNGUS)
                            {
                                double z1 = noise[(((gy * 2 + 3) & 255) << 8) | ((gx * 2 + 91) & 255)];
                                double gest = 0.28 + fy * 0.34;
                                if (z1 < gest)
                                {
                                    double jas = z1 < gest * 0.35 ? 1 : 0.6;
                                    double zr = (70 + 70 * jas) * pam, zg = (120 + 110 * jas) * pam, zb = (60 + 50 * jas) * pam;
                                    r += (zr - r) * 0.85; g += (zg - g) * 0.85; b += (zb - b) * 0.85;
                                    if (jas == 1) { edata[o] = C8(zr * 0.8); edata[o + 1] = C8(zg); edata[o + 2] = C8(zb * 0.7); edata[o + 3] = 255; }
                                }
                            }
                            else if (tile == T.BONES)
                            {
                                double k1 = noise[(((gy * 3 + 11) & 255) << 8) | ((gx + 57) & 255)];
                                if (fy > 0.4 && k1 < 0.22) { r += (218 - r) * 0.8 * pam; g += (208 - g) * 0.8 * pam; b += (186 - b) * 0.8 * pam; }
                            }
                            else if (tile == T.WEB)
                            {
                                bool n1 = ((gx + gy * 0.9) % 7 + 7) % 7 < 0.8, n2 = ((gx - gy * 1.1) % 9 + 9) % 9 < 0.8;
                                if (n1 || n2) { r += (214 - r) * 0.55 * pam; g += (208 - g) * 0.55 * pam; b += (228 - b) * 0.55 * pam; }
                            }
                            else if (tile == T.NEST)
                            {
                                double n1 = noise[(((gy * 2 + 5) & 255) << 8) | ((gx * 2 + 23) & 255)];
                                if (n1 < 0.1 + fy * 0.55) { r += (150 - r) * 0.7 * pam; g += (108 - g) * 0.7 * pam; b += (64 - b) * 0.7 * pam; }
                            }
                            else if (tile == T.GLYPH)
                            {
                                double ddx = fx - 0.5, dy2 = fy - 0.5;
                                double d = Math.Sqrt(ddx * ddx + dy2 * dy2);
                                bool prom = Math.Abs(JsMath.Sin(JsMath.Atan2(dy2, ddx) * 4)) > 0.8 && d < 0.48;
                                if (d < 0.18 || prom) { r = 250; g = 214; b = 130; edata[o] = 250; edata[o + 1] = 214; edata[o + 2] = 120; edata[o + 3] = 255; }
                            }
                        }
                        // kontur rylcem na granicy skały
                        if (linia > 0)
                        {
                            double kk = linia * 0.9; r += (FS.kontur[0] - r) * kk; g += (FS.kontur[1] - g) * kk; b += (FS.kontur[2] - b) * kk;
                        }
                        data[o] = C8(r); data[o + 1] = C8(g); data[o + 2] = C8(b); data[o + 3] = 255;
                        // do poświaty trafia tylko to, co naprawdę świeci
                        double le = ea0 * (1 - fx) + ea1 * fx;
                        if (rodzaj < 2 && le > 0.25)
                        {
                            double moc = (le - 0.25) / 0.75 * 0.7;
                            if (moc * 255 > edata[o + 3]) { edata[o] = C8(r * moc); edata[o + 1] = C8(g * moc); edata[o + 2] = C8(b * moc); edata[o + 3] = C8(255 * moc); }
                        }
                    }
                }
            }
        }
    }
}
