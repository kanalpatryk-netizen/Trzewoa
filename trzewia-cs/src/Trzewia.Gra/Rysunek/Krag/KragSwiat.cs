// Port: krag-3-beta/src/render/krag-swiat.ts — KRĄG TRZECI, świat dookoła trzewi:
//  - LEJ: nad powierzchnią widać wnętrze leja piekła — tarasy wyższych kręgów jak rzędy amfiteatru (Przedsionek
//    z chorągwią, Otchłań z zamkiem, krąg II z wichrem), a na drugim brzegu naszego tarasu żarłocy w błocie;
//  - PRZEPAŚĆ do kręgu czwartego na prawej krawędzi tarasu, w dole żarzy się miasto Dis;
//  - CERBER krąży po kręgu (Symulacja/Krag.cs: cerberNaPowierzchni) i zabija potępionych (Zabijanie);
//  - TRZEWIA: w ścianach wykutych korytarzy tkwią wciągani przez ziemię żarłocy — twarze, ręce, brzuchy.
// (Tłum żarłoków rysowany kodem — rysujTlum i zarlok — nie jest w TS nigdzie wołany: tłum rysuje Potepieni.)
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    public static class KragSwiat
    {
        const string TUSZ = "rgba(14,10,8,0.95)";
        static double los(double n) => Pieklo.los(n);
        static double SURFACE_Y => World.SURFACE_Y;

        /// <summary>Wstęp kręgu przesuwa zegar Cerbera, gdy symulacja stoi (null — tik gry); `tlum` — czy rysować tłum.</summary>
        public static double? WIDOK_tik = null;
        public static bool WIDOK_tlum = true;

        /// <summary>Grunt powierzchni (y kafli) w kolumnie x.</summary>
        public static double gruntKregu(Sim sim, double x) =>
            SURFACE_Y - Grzbiet.wysokoscGrzbietu(sim.world, Math.Max(0, Math.Min(sim.world.w - 1, Math.Floor(x))));

        // ---------------------------------------------------------------- lej piekła

        /// <summary>Rzędy leja: wysokość półki nad naszym tarasem (kafle), wygięcie ku brzegom kadru, nazwa.</summary>
        static readonly (double h, double wyg, string nazwa)[] RZEDY = { (66, 74, "otchlan"), (49, 54, "limbus"), (32, 35, "wicher"), (15, 16, "trzeci") };
        /// <summary>Ściana każdego rzędu: góra (chłodny kamień w burzy), dół (rozgrzany łuną z dna).</summary>
        static readonly (double r, double g, double b)[][] SCIANY =
        {
            new[] { (20.0, 18.0, 22.0), (76.0, 28.0, 19.0) },
            new[] { (24.0, 21.0, 25.0), (98.0, 34.0, 21.0) },
            new[] { (29.0, 25.0, 28.0), (122.0, 42.0, 24.0) },
            new[] { (34.0, 29.0, 30.0), (146.0, 52.0, 27.0) },
        };
        static readonly double[] WARSTWY_SKALY = { 0.28, 0.52, 0.74 };

        // bufory punktów leja (bez alokacji na klatkę)
        static double[] xs = new double[0], krawedz = new double[0], grB = new double[0], dolB = new double[0];

        /// <summary>
        /// Wnętrze leja piekła nad tarasem trzeciego kręgu (po rycinie świata, przed resztą). Patrzymy z wnętrza misy:
        /// rzędy wyższych kręgów wyginają się w górę ku brzegom kadru, poszarpane jak urwiska u Gustave'a Doré, od spodu
        /// rozgrzane czerwoną łuną niższych kręgów. Nad wszystkim burzowy strop, z którego leje i bije piorun.
        /// </summary>
        public static void rysujLej(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var yG = cam.toScreenY(SURFACE_Y - 1.5);
            if (yG <= 0) return;
            var ruch = Nastroj.wolnoRuszac();
            var t = ruch ? teraz / 1000 : 0;
            double W = cam.vw, z = cam.zoom;
            var cxS = cam.toScreenX(sim.world.w / 2.0);
            const double par = 0.35;                                   // paralaksa: tło jedzie wolniej niż świat
            var zz = z * (1 - par);                                    // pikseli na kafel w leju
            var yS = cam.toScreenY(SURFACE_Y);
            double Y(double wy) => yS + (wy - SURFACE_Y) * zz;
            var u = Pieklo.wygladzUlewe(Krag.ulewa(sim), teraz);
            var L = Pieklo.luna(teraz);
            var b = Pieklo.blyskawica(teraz, u);
            double fx(double x) => (x - cxS) / zz;   // współrzędna leja: kafle od środka (cechy skały jadą z nim)
            double gora(int r, double x)
            {
                var (h, wyg, _) = RZEDY[r];
                var uu = (x - cxS) / Math.Max(1, W * 0.75);
                var k = fx(x);
                var zab = (Pieklo.szum1(k * 0.42, r * 7 + 1) - 0.5) * 3 + (Pieklo.szum1(k * 1.6, r * 7 + 3) - 0.5) * 1.1 + (Pieklo.szum1(k * 5.2, r * 7 + 5) - 0.5) * 0.35;
                return Y(SURFACE_Y - h) - uu * uu * wyg * zz - zab * zz;
            }
            const double KROK = 8;
            int n = 0;
            for (var x = -KROK * 2; x <= W + KROK * 2; x += KROK) n++;
            if (xs.Length != n) { xs = new double[n]; krawedz = new double[n]; grB = new double[n]; dolB = new double[n]; }
            { int i = 0; for (var x = -KROK * 2; x <= W + KROK * 2; x += KROK) xs[i++] = x; }
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, W, yG); ctx.clip();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            // ciemność nad lejem (skalny strop ziemi), w dół coraz mocniej czerwona łuna niższych kręgów
            var tlo = ctx.createLinearGradient(0, Math.Min(0, Y(SURFACE_Y - 90)), 0, yG);
            tlo.addColorStop(0, "rgb(2,2,4)");
            tlo.addColorStop(0.45, "rgb(9,6,9)");
            tlo.addColorStop(0.78, Barwa.Rgba((int)(36 * L), (int)(13 * L), (int)(11 * L)));
            tlo.addColorStop(1, Barwa.Rgba((int)(104 * L), (int)(32 * L), (int)(15 * L)));
            ctx.fillStyle = tlo; ctx.fillRect(0, 0, W, yG);
            // rzędy kręgów, od najdalszego
            for (int r = 0; r < RZEDY.Length; r++)
            {
                var nazwa = RZEDY[r].nazwa;
                var gr = grB; var dol = dolB;
                for (int i = 0; i < n; i++) { gr[i] = gora(r, xs[i]); dol[i] = r + 1 < RZEDY.Length ? gora(r + 1, xs[i]) : yG + 2; krawedz[i] = gr[i]; }
                // ściana pod półką
                ctx.beginPath();
                for (int i = 0; i < n; i++) { if (i != 0) ctx.lineTo(xs[i], gr[i]); else ctx.moveTo(xs[i], gr[i]); }
                for (int i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], dol[i]);
                ctx.closePath();
                var iS = (int)Math.Floor((cxS + KROK * 2) / KROK + 0.5);
                var ic = Math.Max(0, Math.Min(n - 1, iS));
                double yA = gr[ic], yB = dol[ic];
                var kg = SCIANY[r][0]; var kd = SCIANY[r][1];
                var g = ctx.createLinearGradient(0, yA, 0, Math.Max(yA + 1, yB));
                g.addColorStop(0, Barwa.Rgba(kg.r, kg.g, kg.b));
                g.addColorStop(0.5, Barwa.Rgba((int)(kg.r * 1.1 + kd.r * 0.12), (int)(kg.g * 1.05 + kd.g * 0.08), (int)(kg.b * 1.05 + kd.b * 0.06)));
                g.addColorStop(0.82, Barwa.Rgba((int)((kg.r + kd.r) * 0.5), (int)((kg.g + kd.g) * 0.48), (int)((kg.b + kd.b) * 0.48)));
                g.addColorStop(1, Barwa.Rgba((int)(kd.r * L), (int)(kd.g * L), (int)(kd.b * L)));
                ctx.fillStyle = g; ctx.fill();
                ctx.save();
                // cień nawisu tuż pod krawędzią półki
                ctx.fillStyle = "rgba(0,0,0,0.42)";
                ctx.beginPath();
                for (int i = 0; i < n; i++) { if (i != 0) ctx.lineTo(xs[i], gr[i]); else ctx.moveTo(xs[i], gr[i]); }
                for (int i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], gr[i] + zz * (0.9 + 0.8 * Pieklo.szum1(fx(xs[i]) * 0.9, r + 40)));
                ctx.closePath(); ctx.fill();
                // warstwy skały (poziome uskoki) i pionowe rysy — miejsca stałe w leju, jadą z paralaksą
                ctx.strokeStyle = "rgba(6,3,3,0.38)"; ctx.lineWidth = 1;
                foreach (var f in WARSTWY_SKALY)
                {
                    ctx.beginPath();
                    for (int i = 0; i < n; i++)
                    {
                        var y = gr[i] + (dol[i] - gr[i]) * (f + (Pieklo.szum1(fx(xs[i]) * 0.6, r * 13 + f * 10) - 0.5) * 0.12);
                        if (i != 0) ctx.lineTo(xs[i], y); else ctx.moveTo(xs[i], y);
                    }
                    ctx.stroke();
                }
                double k0 = Math.Floor(fx(-20)), k1 = Math.Ceiling(fx(W + 20));
                var lico = Barwa.Rgba((int)(220 * L), (int)(90 * L), (int)(50 * L), 0.07);
                int idx(double x) => Math.Max(0, Math.Min(n - 1, (int)Math.Floor((x + KROK * 2) / KROK + 0.5)));
                // filary skały (jak bazaltowe organy): jasne lico od łuny, ciemny bok — urwisko, nie gładka wstęga
                for (var k = Math.Floor(k0 / 2) * 2; k <= k1; k += 2)
                {
                    var s = los(k * 13 + r * 3);
                    if (s > 0.45) continue;
                    var x = cxS + (k + los(k * 5 + r) * 1.6) * zz;
                    var i = idx(x);
                    var sz = zz * (0.9 + s * 3.5);
                    double y0 = gr[i] + zz * 0.3 + (dol[i] - gr[i]) * los(k * 41 + r) * 0.35, y1 = dol[i] - (dol[i] - gr[i]) * los(k * 43 + r) * 0.3;
                    if (y1 - y0 < 4) continue;
                    ctx.fillStyle = lico; ctx.fillRect(x, y0 + (y1 - y0) * 0.35, sz * 0.45, (y1 - y0) * 0.65);
                    ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(x + sz * 0.45, y0, sz * 0.4, y1 - y0);
                }
                var mokre = Barwa.Rgba((int)(150 * L), (int)(60 * L), (int)(34 * L), 0.16);
                for (var k = k0; k <= k1; k++)
                {
                    if (los(k * 31 + r * 7) > 0.32) continue;
                    var x = cxS + (k + los(k * 3 + r)) * zz;
                    var i = idx(x);
                    double y0 = gr[i] + zz * 0.8, y1 = dol[i] - 2;
                    if (y1 - y0 < 6) continue;
                    var dl = (y1 - y0) * (0.35 + los(k * 13 + r) * 0.6);
                    ctx.strokeStyle = "rgba(4,2,2,0.5)"; ctx.lineWidth = Math.Max(1, zz * 0.12);
                    ctx.beginPath(); ctx.moveTo(x, y0);
                    ctx.lineTo(x + (los(k * 5) - 0.5) * zz * 0.8, y0 + dl * 0.5);
                    ctx.lineTo(x + (los(k * 9) - 0.5) * zz * 1.2, y0 + dl);
                    ctx.stroke();
                    // mokre lico obok rysy łapie łunę
                    ctx.strokeStyle = mokre; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(x + 1.5, y0 + dl * 0.45); ctx.lineTo(x + 1.5 + (los(k * 9) - 0.5) * zz * 1.2, y0 + dl); ctx.stroke();
                }
                // smugi deszczu spływające po ścianie (ciemne zacieki)
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                for (var k = k0; k <= k1; k++)
                {
                    if (los(k * 17 + r * 5) > 0.22) continue;
                    var x = cxS + (k + los(k * 19)) * zz;
                    var i = idx(x);
                    var y0 = gr[i] + (dol[i] - gr[i]) * los(k * 23) * 0.3;
                    ctx.fillRect(x, y0, Math.Max(1, zz * (0.1 + los(k * 29) * 0.25)), (dol[i] - y0) * (0.25 + los(k) * 0.5));
                }
                ctx.restore();
                // krawędź półki: sine światło burzy z góry
                ctx.strokeStyle = Barwa.Rgba(150, 146, 160, 0.2 + 0.5 * b.a); ctx.lineWidth = Math.Max(1, zz * 0.1);
                ctx.beginPath();
                for (int i = 0; i < n; i++) { if (i != 0) ctx.lineTo(xs[i], gr[i]); else ctx.moveTo(xs[i], gr[i]); }
                ctx.stroke();
                // życie na półkach
                if (nazwa == "otchlan") przedsionek(ctx, n, gr, zz, t, cxS);
                else if (nazwa == "limbus") limbus(ctx, n, gr, zz, t, cxS, b.a);
                else if (nazwa == "wicher") wicher(ctx, n, gr, zz, t, W);
                else zarlocyNaDrugimBrzegu(ctx, n, gr, zz, t, cxS, L, b.a);
            }
            // mgła i deszcz w głębi: łuna dna rozlewa się nad horyzontem
            var mg = ctx.createLinearGradient(0, yG - zz * 16, 0, yG);
            mg.addColorStop(0, "rgba(70,24,14,0)"); mg.addColorStop(1, Barwa.Rgba((int)(120 * L), (int)(40 * L), (int)(18 * L), 0.55));
            ctx.fillStyle = mg; ctx.fillRect(0, yG - zz * 16, W, zz * 16);
            var Hs = yG;
            // zasłony deszczu zwisające z chmur — trzy, szerokie
            ctx.save();
            for (int i = 0; i < 3; i++)
            {
                var x = ((los(i * 41) * W * 1.4 + t * (8 + 5 * los(i)) + cam.x * z * 0.1) % (W * 1.4)) - W * 0.2;
                var sz = W * (0.1 + los(i * 7) * 0.12);
                double y0 = Hs * 0.25, y1 = yG;
                ctx.fillStyle = Barwa.Rgba(120, 124, 140, 0.04 + 0.05 * u);
                ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + sz, y0); ctx.lineTo(x + sz - (y1 - y0) * 0.25, y1); ctx.lineTo(x - (y1 - y0) * 0.25, y1); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
            // błysk: cały lej na mgnienie widać jak za dnia, sino
            if (b.a > 0.01)
            {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = Barwa.Rgba(80, 90, 120, 0.42 * b.a);
                ctx.fillRect(0, 0, W, yG);
                ctx.restore();
            }
            // burzowy strop i strzępy chmur (przyklejone do górnej części nieba)
            var dx = t * 7 + cam.x * z * 0.12;
            Pieklo.pasChmur(ctx, W, -Hs * 0.2, Hs * 0.38, dx, 1.25, 1);
            Pieklo.pasChmur(ctx, W, Hs * 0.1, Hs * 0.5, dx * 1.9 + 300, 0.8, 0.38 + 0.22 * u);
            if (b.a > 0.01)
            {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                Pieklo.pasChmur(ctx, W, -Hs * 0.2, Hs * 0.38, dx, 1.25, 0.65 * b.a);
                ctx.restore();
                // piorun z chmur w półkę
                if (b.f < 0.42)
                {
                    var x0 = b.x * W;
                    var i = Math.Max(0, Math.Min(n - 1, (int)Math.Floor((x0 + KROK * 2) / KROK + 0.5)));
                    Pieklo.piorun(ctx, x0, Hs * 0.3, Math.Min(yG, krawedz[i] + 4), b.a, b.nr, Math.Max(1.2, zz * 0.12));
                }
            }
            // iskry z otchłani: żar wznosi się nad horyzontem
            Pieklo.iskry(ctx, 0, W, yG - Math.Min(yG, zz * 24), yG, (int)Math.Floor(W / 34 + 0.5), t, 3);
            ctx.restore();
        }

        static Barwa SKORA_TLUM(double a) => Barwa.Rgba(196, 170, 150, a);

        static double naKrawedzi(int n, double[] gr, double x)
        {
            var i = Math.Max(0, Math.Min(n - 1, (int)Math.Floor((x - xs[0]) / (xs[1] - xs[0]) + 0.5)));
            return gr[i];
        }

        /// <summary>Przedsionek: nijacy biegną gęsiego za białą chorągwią (pieśń III), wzdłuż Acheronu.</summary>
        static void przedsionek(IPlotno ctx, int n, double[] gr, double zz, double t, double cxS)
        {
            const double dl = 160;
            var czolo = ((t * 3.2) % dl) - dl / 2;
            ctx.lineWidth = Math.Max(1, zz * 0.16);
            for (int j = 0; j < 90; j++)
            {
                var k = czolo - 1.2 - j * 0.55 - los(j) * 0.4;
                var x = cxS + k * zz;
                if (x < -10 || x > xs[n - 1]) continue;
                var y = naKrawedzi(n, gr, x);
                var bieg = Math.Sin(t * 9 + j * 1.7);
                ctx.strokeStyle = SKORA_TLUM(0.5);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bieg * zz * 0.25, y - zz * 0.7); ctx.lineTo(x + zz * 0.15, y - zz * 1.25); ctx.stroke();
                ctx.fillStyle = SKORA_TLUM(0.55);
                ctx.fillRect(x + zz * 0.05, y - zz * 1.55, Math.Max(1, zz * 0.28), Math.Max(1, zz * 0.28));
            }
            // chorągiew na czele
            var xc = cxS + czolo * zz;
            var yc = naKrawedzi(n, gr, xc);
            ctx.strokeStyle = "rgba(150,140,130,0.7)"; ctx.lineWidth = Math.Max(1, zz * 0.1);
            ctx.beginPath(); ctx.moveTo(xc, yc); ctx.lineTo(xc, yc - zz * 3.2); ctx.stroke();
            ctx.fillStyle = "rgba(226,222,210,0.75)";
            ctx.beginPath(); ctx.moveTo(xc, yc - zz * 3.2);
            ctx.quadraticCurveTo(xc + zz * 0.9, yc - zz * (3 + 0.3 * Math.Sin(t * 6)), xc + zz * 1.8, yc - zz * 2.9);
            ctx.lineTo(xc + zz * 1.7, yc - zz * 2.3); ctx.quadraticCurveTo(xc + zz * 0.9, yc - zz * (2.5 + 0.3 * Math.Sin(t * 6 + 1)), xc, yc - zz * 2.4);
            ctx.closePath(); ctx.fill();
        }

        /// <summary>Otchłań (krąg I): szlachetny zamek o siedmiu murach w półkuli bladego światła, nieruchome cienie mędrców.</summary>
        static void limbus(IPlotno ctx, int n, double[] gr, double zz, double t, double cxS, double blysk)
        {
            var x = cxS - 38 * zz;
            if (x < -zz * 30 || x > xs[n - 1] + zz * 30) return;
            var y = naKrawedzi(n, gr, x);
            // półkula światła
            var R = zz * 13;
            var gl = ctx.createRadialGradient(x, y, zz * 2, x, y, R);
            gl.addColorStop(0, Barwa.Rgba(236, 224, 180, 0.3 + 0.03 * Math.Sin(t))); gl.addColorStop(0.6, "rgba(200,190,150,0.1)"); gl.addColorStop(1, "rgba(200,190,150,0)");
            ctx.fillStyle = gl;
            ctx.beginPath(); ctx.arc(x, y, R, Math.PI, Math.PI * 2); ctx.fill();
            // zamek: siedem murów (schodkami), baszty
            ctx.fillStyle = Barwa.Rgba((int)(26 + 60 * blysk), (int)(24 + 60 * blysk), (int)(26 + 66 * blysk), 0.96);
            for (int m = 0; m < 3; m++)
            {
                double sz = zz * (9 - m * 2.4), wy = zz * (1.1 + m * 0.9);
                ctx.fillRect(x - sz / 2, y - wy, sz, wy);
                for (int b = 0; b <= 4; b++)
                {
                    var bx = x - sz / 2 + (sz * b) / 4;
                    ctx.fillRect(bx - zz * 0.35, y - wy - zz * (0.9 + 0.3 * (b % 2)), zz * 0.7, zz * (0.9 + 0.3 * (b % 2)) + 1);
                }
            }
            ctx.fillRect(x - zz * 0.5, y - zz * 5.4, zz, zz * 1.8);
            ctx.beginPath(); ctx.moveTo(x - zz * 0.7, y - zz * 5.4); ctx.lineTo(x, y - zz * 6.6); ctx.lineTo(x + zz * 0.7, y - zz * 5.4); ctx.fill();
            // okna świecą
            ctx.fillStyle = "rgba(246,226,170,0.7)";
            for (int i = 0; i < 6; i++) ctx.fillRect(x - zz * 3 + i * zz * 1.2, y - zz * 1.9, Math.Max(1, zz * 0.18), Math.Max(1, zz * 0.3));
            // cienie mędrców na łące przed zamkiem
            ctx.fillStyle = "rgba(30,28,30,0.8)";
            for (int i = 0; i < 26; i++)
            {
                var px = x - zz * 14 + i * zz * 1.1 + los(i * 7) * zz * 0.5;
                if (Math.Abs(px - x) < zz * 5) continue;
                var py = naKrawedzi(n, gr, px);
                ctx.fillRect(px, py - zz * 1.3, Math.Max(1, zz * 0.3), zz * 1.3);
                ctx.fillRect(px - zz * 0.02, py - zz * 1.65, Math.Max(1, zz * 0.32), Math.Max(1, zz * 0.32));
            }
        }

        /// <summary>
        /// Krąg II: „piekielny wicher, który nie ustaje, niesie duchy w swym porywie” (pieśń V) — pas burzy nad półką,
        /// smugi wiatru i setki ciał koziołkujących w powietrzu, jak szpaki stadem.
        /// </summary>
        static void wicher(IPlotno ctx, int n, double[] gr, double zz, double t, double W)
        {
            double srodek(double x) => naKrawedzi(n, gr, x) - zz * 6.5;
            // ciemny pas wichru
            ctx.save();
            ctx.fillStyle = "rgba(10,8,12,0.25)";
            ctx.beginPath();
            for (int i = 0; i < n; i++) { var y = srodek(xs[i]) - zz * (4 + Math.Sin(xs[i] * 0.01 + t * 0.7) * 1.2); if (i != 0) ctx.lineTo(xs[i], y); else ctx.moveTo(xs[i], y); }
            for (int i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], srodek(xs[i]) + zz * (3.5 + Math.Sin(xs[i] * 0.013 + t * 0.9) * 1.2));
            ctx.closePath(); ctx.fill();
            // smugi wiatru
            for (int i = 0; i < 18; i++)
            {
                var p = (t * 0.07 * (0.7 + los(i) * 0.7) + los(i * 5)) % 1;
                var x = -W * 0.3 + p * W * 1.6;
                var y = srodek(x) + (los(i * 9) - 0.5) * zz * 7 + Math.Sin(t * 0.9 + i) * zz;
                var dl = zz * (10 + los(i * 3) * 12);
                ctx.strokeStyle = Barwa.Rgba(196, 190, 206, 0.08 + 0.1 * los(i * 11)); ctx.lineWidth = Math.Max(1, zz * (0.08 + 0.1 * los(i)));
                ctx.beginPath(); ctx.moveTo(x, y);
                ctx.bezierCurveTo(x - dl * 0.3, y - zz * 1.4, x - dl * 0.6, y + zz * 1.6, x - dl, y + Math.Sin(i) * zz);
                ctx.stroke();
            }
            // ciała niesione wichrem
            var ile = Math.Min(220, (int)Math.Floor(W / Math.Max(2.5, zz * 0.45) + 0.5));
            ctx.lineCap = "round";
            for (int i = 0; i < ile; i++)
            {
                var v = zz * (2.5 + los(i * 3) * 3.5);
                var x = ((los(i) * W * 1.5 + t * v) % (W * 1.5)) - W * 0.25;
                var y = srodek(x) + Math.Sin(x * 0.012 + i * 0.7 + t * 1.3) * zz * 2.6 + (los(i * 7) - 0.5) * zz * 6;
                var kat = t * (1.5 + los(i * 13) * 3) * (i % 2 != 0 ? 1 : -1) + i;
                var s = zz * (1.05 + los(i * 17) * 0.6);
                var a = 0.4 + 0.35 * los(i * 19);
                double c = Math.Cos(kat), sn = Math.Sin(kat);
                // oś ciała: od głowy (−) do bioder (+); kończyny rozrzucone wichrem, machają
                (double, double) P(double d, double bb) => (x + c * d * s - sn * bb * s, y + sn * d * s + c * bb * s);
                var mach = Math.Sin(t * 7 + i * 1.3) * 0.18;
                var kark = P(-0.32, 0); var biodra = P(0.28, 0);
                ctx.strokeStyle = SKORA_TLUM(a); ctx.lineWidth = Math.Max(1, s * 0.17);
                ctx.beginPath();
                ctx.moveTo(kark.Item1, kark.Item2); ctx.lineTo(biodra.Item1, biodra.Item2);
                var n1 = P(0.78, 0.22 + mach); var n2 = P(0.74, -0.2 - mach);
                ctx.moveTo(biodra.Item1, biodra.Item2); ctx.lineTo(n1.Item1, n1.Item2);
                ctx.moveTo(biodra.Item1, biodra.Item2); ctx.lineTo(n2.Item1, n2.Item2);
                var r1 = P(-0.05, 0.42 - mach); var r2 = P(-0.55, -0.32 + mach);
                ctx.moveTo(kark.Item1, kark.Item2); ctx.lineTo(r1.Item1, r1.Item2);
                ctx.moveTo(kark.Item1, kark.Item2); ctx.lineTo(r2.Item1, r2.Item2);
                ctx.stroke();
                var gl = P(-0.5, 0);
                ctx.fillStyle = SKORA_TLUM(a);
                ctx.beginPath(); ctx.arc(gl.Item1, gl.Item2, Math.Max(0.9, s * 0.15), 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Drugi brzeg naszego kręgu: żarłocy leżą w błocie gęsto jak ściernisko, kałuże łapią łunę i błysk.</summary>
        static void zarlocyNaDrugimBrzegu(IPlotno ctx, int n, double[] gr, double zz, double t, double cxS, double L, double blysk)
        {
            double k0 = Math.Floor((xs[0] - cxS) / zz), k1 = Math.Ceiling((xs[n - 1] - cxS) / zz);
            var kaluza = Barwa.Rgba((int)(130 * L + 120 * blysk), (int)(44 * L + 120 * blysk), (int)(26 + 140 * blysk), 0.45);
            var skora = SKORA_TLUM(0.55);
            for (var k = k0; k <= k1; k++)
            {
                var x = cxS + (k + los(k * 7)) * zz;
                var y = naKrawedzi(n, gr, x);
                // kałuża
                if (los(k * 23) < 0.18)
                {
                    ctx.fillStyle = kaluza;
                    ctx.beginPath(); ctx.ellipse(x, y + zz * 0.2, zz * (1 + los(k) * 1.6), zz * 0.16, 0, 0, Math.PI * 2); ctx.fill();
                }
                // ciało: leży (najczęściej), klęczy albo siedzi skulone
                var r = los(k * 11);
                ctx.fillStyle = skora;
                if (r < 0.55)
                {
                    ctx.beginPath(); ctx.ellipse(x, y - zz * 0.15, zz * 0.55, zz * 0.17, (los(k) - 0.5) * 0.3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(x + zz * 0.62, y - zz * 0.16, zz * 0.15, 0, Math.PI * 2); ctx.fill();
                }
                else if (r < 0.8)
                {
                    var kol = Math.Sin(t * 1.2 + k) * 0.1;
                    ctx.save(); ctx.translate(x, y); ctx.rotate(kol);
                    ctx.fillRect(-zz * 0.14, -zz * 0.95, zz * 0.3, zz * 0.95);
                    ctx.beginPath(); ctx.arc(0, -zz * 1.1, zz * 0.16, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            }
        }

        /// <summary>Prawa krawędź tarasu: przepaść do kręgu czwartego, w dole żarzy się miasto Dis (po rycinie, nad lejem).</summary>
        public static void rysujPrzepasc(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world; var z = cam.zoom;
            double xk = w.w - 9;
            var sx = cam.toScreenX(xk);
            if (sx > cam.vw + 4) return;
            var t = Nastroj.wolnoRuszac() ? teraz / 1000 : 0;
            var L = Pieklo.luna(teraz);
            var yTop = cam.toScreenY(gruntKregu(sim, xk - 1) - 0.2);
            ctx.save();
            // urwisko: poszarpana krawędź tarasu, za nią ciemność z łuną z dołu
            ctx.beginPath();
            ctx.moveTo(sx, Math.Max(-10, yTop));
            for (int i = 0; i <= 40; i++)
            {
                var wy = gruntKregu(sim, xk) + i * 6;
                ctx.lineTo(sx + (los(i * 17) - 0.3) * z * 1.6 + i * z * 0.25, cam.toScreenY(wy));
            }
            ctx.lineTo(cam.vw + 50, cam.toScreenY(gruntKregu(sim, xk) + 240));
            ctx.lineTo(cam.vw + 50, Math.Max(-10, yTop - z * 20));
            ctx.closePath();
            var g = ctx.createLinearGradient(0, yTop - z * 20, 0, yTop + z * 160);
            g.addColorStop(0, "rgb(8,6,8)"); g.addColorStop(0.35, "rgb(22,9,8)"); g.addColorStop(0.7, Barwa.Rgba((int)(90 * L), (int)(24 * L), 12)); g.addColorStop(1, Barwa.Rgba((int)(170 * L), (int)(52 * L), 16));
            ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = "rgba(150,90,70,0.45)"; ctx.lineWidth = Math.Max(1, z * 0.1); ctx.stroke();
            ctx.clip();
            // w dole: mury i wieże miasta Dis, rozpalone do czerwoności (pieśń VIII)
            var yD = yTop + z * 120;
            ctx.fillStyle = "rgba(16,6,6,0.95)";
            for (int i = 0; i < 26; i++)
            {
                var bx = sx + z * (2 + i * 1.6 + los(i) * 0.8);
                var bh = z * (3 + los(i * 3) * 9);
                ctx.fillRect(bx, yD - bh, z * (0.8 + los(i * 5) * 0.9), bh + z * 60);
                if (los(i * 7) < 0.4) { ctx.beginPath(); ctx.moveTo(bx - z * 0.2, yD - bh); ctx.lineTo(bx + z * 0.5, yD - bh - z * 1.6); ctx.lineTo(bx + z * 1.2, yD - bh); ctx.fill(); }
            }
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (int i = 0; i < 26; i++)
            {
                if (los(i * 11) > 0.6) continue;
                double bx = sx + z * (2.3 + i * 1.6 + los(i) * 0.8), by = yD - z * (2 + los(i * 3) * 6);
                ctx.fillStyle = Barwa.Rgba(255, (int)(90 + 60 * los(i)), 30, 0.5 + 0.3 * Math.Sin(t * 3 + i));
                ctx.fillRect(bx, by, Math.Max(1, z * 0.25), Math.Max(1, z * 0.4));
            }
            double r = z * 46, ly = yD;
            var lg = ctx.createRadialGradient(sx + z * 18, ly, 0, sx + z * 18, ly, r);
            lg.addColorStop(0, Barwa.Rgba(255, 90, 30, (0.42 + 0.08 * Math.Sin(t * 1.7)) * L)); lg.addColorStop(0.4, "rgba(200,50,20,0.18)"); lg.addColorStop(1, "rgba(200,70,30,0)");
            ctx.fillStyle = lg; ctx.fillRect(sx - r, ly - r, r * 3, r * 2);
            ctx.restore();
            // dym kłębami w górę i iskry
            ctx.fillStyle = "rgba(30,14,12,0.35)";
            for (int i = 0; i < 12; i++)
            {
                var f = (t * 0.05 + los(i * 3)) % 1;
                double cx = sx + z * (4 + los(i) * 26) + Math.Sin(t * 0.4 + i) * z * 2, cy = yD - f * z * 110;
                ctx.beginPath(); ctx.arc(cx, cy, z * (2 + f * 6), 0, Math.PI * 2); ctx.fill();
            }
            Pieklo.iskry(ctx, sx, sx + z * 40, yTop, yD, 40, t, 7);
            // deszcz spada w przepaść
            ctx.strokeStyle = "rgba(170,150,150,0.22)"; ctx.lineWidth = 1;
            ctx.beginPath();
            for (int i = 0; i < 60; i++)
            {
                double x = sx + los(i * 7) * z * 20, y = yTop + ((los(i * 3) * z * 120 + t * 500) % (z * 120));
                ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 10);
            }
            ctx.stroke();
            ctx.restore();
        }

        static readonly PozaCerbera pozaNaKregu = new PozaCerbera();

        /// <summary>Cerber na tarasie kręgu: chodzi od żarłoka do żarłoka, szarpie, zabija, wyje w deszcz (nad mrokiem).</summary>
        public static void rysujCerberaNaKregu(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var c = Krag.cerberNaPowierzchni(sim, WIDOK_tik);
            if (!c.jest) return;
            double z = cam.zoom, h = z * 4.4;
            double sx = cam.toScreenX(c.x), sy = cam.toScreenY(gruntKregu(sim, c.x)) + z * 0.1;
            if (sx < -h * 2 || sx > cam.vw + h * 2 || sy < -h || sy > cam.vh + h * 0.5) return;
            var t = teraz / 1000;
            var p = pozaNaKregu.Zeruj();
            p.czas = teraz;
            p.krok = c.idzie; p.faza = c.x * 2.2;
            p.oddech = 0.5 + 0.5 * Math.Sin(t * 4);
            p.ogon = Math.Sin(t * 1.4) * 0.7;
            for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = 0.1 * Math.Sin(t * 1.6 + i * 2); g.paszcza = 0.15 + 0.1 * Math.Max(0, Math.Sin(t * 5 + i)); }
            ctx.save();
            ctx.translate(sx, sy);
            ctx.scale(c.zwrot, 1);
            if (c.szarpie > 0)
            {
                // zabija żarłoka leżącego przed nim — jeden z pięciu sposobów (Zabijanie)
                Zabijanie.scenaZabijania(ctx, h, Math.Max(16, z * 1.9 * ustawienia.wielkoscSylwetek), z * 4, c.wariant, c.szarpie, teraz);
                ctx.restore();
                return;
            }
            RysCerber.rysujCerbera(ctx, h, p);
            ctx.restore();
        }

        // ---------------------------------------------------------------- trzewia: ciała w ścianach

        /// <summary>Ciała wciągane przez ziemię w ścianach i posadzkach wykutych korytarzy (przed mrokiem).</summary>
        public static void rysujCialaWScianach(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var z = cam.zoom;
            if (z < 6) return;
            var w = sim.world;
            var t = Nastroj.wolnoRuszac() ? teraz / 1000 : 0;
            double x0 = Math.Max(1, Math.Floor(cam.toWorldX(0))), x1 = Math.Min(w.w - 2, Math.Ceiling(cam.toWorldX(cam.vw)));
            double y0 = Math.Max(SURFACE_Y + 2, Math.Floor(cam.toWorldY(0))), y1 = Math.Min(w.h - 2, Math.Ceiling(cam.toWorldY(cam.vh)));
            const string skora = "rgb(138,128,106)";
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            for (var y = y0; y <= y1; y++)
            {
                for (var x = x0; x <= x1; x++)
                {
                    var i = (int)w.idx(x, y);
                    if (w.ever[i] == 0 || !w.passable(x, y)) continue;
                    var r = los(x * 7349 + y * 211);
                    if (r > 0.07) continue;
                    bool lewa = w.solid(x - 1, y), prawa = w.solid(x + 1, y), dol = w.solid(x, y + 1);
                    var fala = Math.Sin(t * 0.9 + x + y);
                    var lw = Math.Max(0.8, z * 0.06);
                    ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
                    if ((lewa || prawa) && r < 0.045)
                    {
                        // twarz i ręka wychodzące ze ściany
                        var kier = lewa ? 1 : -1;
                        double sx = cam.toScreenX(lewa ? x : x + 1), sy = cam.toScreenY(y + 0.45);
                        ctx.save(); ctx.translate(sx, sy); ctx.scale(kier, 1);
                        ctx.fillStyle = skora;
                        ctx.beginPath(); ctx.ellipse(z * 0.12, 0, z * 0.2, z * 0.26, 0, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = TUSZ;
                        ctx.beginPath(); ctx.ellipse(z * 0.2, z * 0.06, z * 0.04, z * 0.07 * (0.7 + 0.3 * fala), 0, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(z * 0.18, -z * 0.09, z * 0.025, 0, Math.PI * 2); ctx.fill();
                        // ręka
                        ctx.strokeStyle = skora; ctx.lineWidth = z * 0.09;
                        ctx.beginPath(); ctx.moveTo(0, z * 0.32); ctx.quadraticCurveTo(z * 0.35, z * 0.3, z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.stroke();
                        ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
                        ctx.beginPath(); ctx.moveTo(0, z * 0.32); ctx.quadraticCurveTo(z * 0.35, z * 0.3, z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.stroke();
                        for (int k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(z * (0.55 + 0.08 * fala), z * (0.1 + 0.05 * fala)); ctx.lineTo(z * (0.66 + 0.08 * fala), z * (0.02 + k * 0.06)); ctx.stroke(); }
                        ctx.restore();
                    }
                    else if (dol && !lewa && !prawa)
                    {
                        // brzuch i głowa żarłoka na wpół wciągnięte w posadzkę
                        double sx = cam.toScreenX(x + 0.5), sy = cam.toScreenY(y + 1);
                        ctx.fillStyle = skora;
                        ctx.beginPath(); ctx.ellipse(sx, sy, z * 0.34, z * (0.14 + 0.01 * fala), 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.beginPath(); ctx.arc(sx + z * 0.42, sy, z * 0.11, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }
    }
}
