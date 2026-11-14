// Port: alpha-1/src/render/promien.ts — PROMIEŃ Z ROZETY (Alpha 0.2): światło, które pada z rozety katedry w dół przez
// skrzyżowanie, przez otwór w posadzce, szybem do sali i na ołtarz. Liczony piksel po pikselu w małym buforze
// i rozciągany na ekran: miękki brzeg rozmyty tym mocniej, im dalej od otworu; smugi od maswerku rozety (pod nią
// w barwach witraży); pasma mgły i pyłu spływają w dół; szyb przycina promień; plamy światła na posadzkach i krzyżu.
// Nastawy: PROMIEN (Nastawy/Katedra.cs). Mrok wzdłuż promienia wycina Mrok.cs.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyKatedra;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Promien
    {
        static Nastawy.Typ_PROMIEN P => PROMIEN;

        /// <summary>Tani skrót liczby — stałe położenia pyłu (rysunek nie sięga po los gry).</summary>
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }

        static double lerp(double a, double b, double t) => a + (b - a) * t;
        static double gladko(double a, double b, double x)
        {
            var t = Math.Max(0, Math.Min(1, (x - a) / (b - a)));
            return t * t * (3 - 2 * t);
        }

        /// <summary>Szum wartości 64×64, gładki i zawinięty — mgła w promieniu (w TS: Float32Array).</summary>
        const int SZ = 64;
        static readonly float[] szum = Szum();
        static float[] Szum() { var s = new float[SZ * SZ]; for (int i = 0; i < s.Length; i++) s[i] = (float)los(i * 7 + 3); return s; }
        static double mgla(double x, double y)
        {
            double xi = Math.Floor(x), yi = Math.Floor(y), fx = x - xi, fy = y - yi;
            int x0 = Js.Js.ToInt32(xi) & (SZ - 1), y0 = Js.Js.ToInt32(yi) & (SZ - 1), x1 = (x0 + 1) & (SZ - 1), y1 = (y0 + 1) & (SZ - 1);
            double sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
            double a = szum[y0 * SZ + x0], b = szum[y0 * SZ + x1], c = szum[y1 * SZ + x0], d = szum[y1 * SZ + x1];
            return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
        }

        /// <summary>Barwy smug pod rozetą (od lewej): witraże rozety — złoto, rubin, błękit, złoto w środku i z powrotem.</summary>
        static readonly double[][] BARWY_SMUG = {
            new double[] { 255, 214, 140 }, new double[] { 255, 176, 150 }, new double[] { 176, 196, 255 }, new double[] { 255, 226, 170 },
            new double[] { 176, 196, 255 }, new double[] { 255, 176, 150 }, new double[] { 255, 214, 140 },
        };
        static readonly double[] BIEL = { 255, 236, 200 };

        /// <summary>Profil smug w poprzek promienia (u od −1 do 1): ostry pod rozetą i rozmyty niżej — jasność i barwa.</summary>
        const int PROFIL = 128;
        static readonly float[] ostryJ = new float[PROFIL], ostryR = new float[PROFIL], ostryG = new float[PROFIL], ostryB = new float[PROFIL];
        static readonly float[] mietyJ = new float[PROFIL];
        static void liczProfil(double teraz, bool ruch)
        {
            int n = (int)P.smugi.ile;
            double sumaO = 0, sumaM = 0;
            for (int i = 0; i < PROFIL; i++)
            {
                var u = ((double)i / (PROFIL - 1)) * 2 - 1;
                double jo = 0.42, jm = 0.6, r = 0, g = 0, b = 0;
                for (int k = 0; k < n; k++)
                {
                    var uk = -0.86 + (1.72 * k) / (n - 1);
                    var a = (k == (n >> 1) ? 1.15 : 0.85 + 0.3 * los(k * 5 + 1)) * (ruch ? 1 + P.smugi.migot * JsM.Sin(teraz * (0.0006 + 0.00025 * k) + k * 2.1) : 1);
                    double d = (u - uk) / 0.085, dm = (u - uk) / 0.2;
                    double e = a * Math.Exp(-d * d), em = a * Math.Exp(-dm * dm);
                    jo += e; jm += em * 0.55;
                    var c = BARWY_SMUG[k % BARWY_SMUG.Length];
                    r += e * c[0]; g += e * c[1]; b += e * c[2];
                }
                ostryJ[i] = (float)jo; mietyJ[i] = (float)jm;
                double w = 0.42 * BIEL[0] + r, wg = 0.42 * BIEL[1] + g, wb = 0.42 * BIEL[2] + b;
                ostryR[i] = (float)(w / jo); ostryG[i] = (float)(wg / jo); ostryB[i] = (float)(wb / jo);
                sumaO += jo; sumaM += jm;
            }
            // średnio jedna jasność — smugi przesuwają światło w poprzek, nie dokładają go
            double so = PROFIL / sumaO, sm = PROFIL / sumaM;
            for (int i = 0; i < PROFIL; i++) { ostryJ[i] = (float)(ostryJ[i] * so); mietyJ[i] = (float)(mietyJ[i] * sm); }
        }

        static byte[] dane = new byte[0];
        static IObraz? obraz;

        /// <summary>Zapis do Uint8ClampedArray: obcięcie i zaokrąglenie połówek do parzystej.</summary>
        static byte C8(double v) => !(v > 0) ? (byte)0 : v >= 255 ? (byte)255 : (byte)Math.Round(v, MidpointRounding.ToEven);

        /// <summary>Promień z rozety — nad mrokiem (światło dodawane do obrazu).</summary>
        public static void rysujPromien(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world;
            var k = Katedra.ukladKatedry(w);
            if (k == null) return;
            var z = cam.zoom;
            var ruch = Nastroj.wolnoRuszac();
            // stacje promienia (y kafli): pod rozetą, posadzka katedry, wylot szybu w sali, posadzka sali nad ołtarzem
            double yR = k.rozeta.y, yK = k.posadzka, yS = w.szybDol, yP = w.oltarz.y + 1;
            double cx = k.cx, ax = w.oltarz.x + 0.5;
            var Sz = P.szerokosc; var Ro = P.rozmycie; var Ja = P.jasnosc;
            var marg = Sz.sala + Ro[3] + 0.3;
            double x0 = Math.Min(cx, ax) - marg, x1 = Math.Max(cx, ax) + marg, y0 = yR - 0.2, y1 = yP + 0.2;
            double sx0 = cam.toScreenX(x0), sy0 = cam.toScreenY(y0), sw = (x1 - x0) * z, sh = (y1 - y0) * z;
            if (sx0 + sw < 0 || sy0 + sh < 0 || sx0 > cam.vw || sy0 > cam.vh) return;

            var R = P.rozdzielczosc;
            int W = (int)Math.Ceiling((x1 - x0) * R), H = (int)Math.Ceiling((y1 - y0) * R);
            if (dane.Length != W * H * 4) dane = new byte[W * H * 4];
            var d = dane;
            liczProfil(teraz, ruch);
            var t = ruch ? teraz / 1000 : 0;
            var splyw = t * P.mgla.splyw;
            var oddech = ruch ? 0.96 + 0.04 * JsM.Sin(teraz * 0.00031) * JsM.Sin(teraz * 0.00017 + 1) : 1;
            var smg = P.mgla.sila;

            for (int j = 0; j < H; j++)
            {
                var y = y0 + (j + 0.5) / R;
                // parametry wiersza: środek, pół szerokości, rozmycie brzegu, jasność, barwa witraży i kontrast smug, przycięcie
                double c = cx, hw, s, jas, barwa, kontrast, cl = -1e9, cr = 1e9;
                if (y < yK)
                {
                    var f = (y - yR) / (yK - yR);
                    hw = lerp(Sz.rozeta, Sz.posadzka, f); s = lerp(Ro[0], Ro[1], f); jas = lerp(Ja[0], Ja[1], f);
                    barwa = lerp(1, 0.3, f); kontrast = lerp(P.smugi.kontrastGora, 0.4, f);
                    // światło wychodzi z całej rozety — u góry promień narasta od jej środka
                    jas *= gladko(yR - 0.6, yR + 1.1, y);
                }
                else if (y < yS)
                {
                    var f = (y - yK) / (yS - yK);
                    // w szybie: jaśniejszy środek, przy ścianach przygasa — promień w szybie, nie świecąca rura
                    hw = (k.otwor.x1 - k.otwor.x0) / 2; s = Ro[1]; jas = lerp(Ja[1], Ja[2], f);
                    barwa = lerp(0.3, 0.08, f); kontrast = lerp(0.4, 0.28, f);
                    cl = k.otwor.x0; cr = k.otwor.x1;
                }
                else
                {
                    var f = (y - yS) / (yP - yS);
                    c = lerp(cx, ax, f);
                    hw = lerp((k.otwor.x1 - k.otwor.x0) / 2, Sz.sala, f); s = lerp(Ro[2], Ro[3], f); jas = lerp(Ja[2], Ja[3], f);
                    barwa = lerp(0.08, 0, f); kontrast = lerp(0.28, P.smugi.kontrastDol, f);
                    // przy posadzce sali światło kończy się na podłodze
                    jas *= 1 - gladko(yP - 0.25, yP + 0.05, y);
                }
                jas *= oddech;
                var mieszaj = gladko(0, 1, (y - yR) / 6);       // im dalej od rozety, tym smugi bardziej rozmyte
                var row = j * W * 4;
                for (int i = 0; i < W; i++)
                {
                    var x = x0 + (i + 0.5) / R;
                    var o = row + i * 4;
                    var v = gladko(hw + s, hw - s, Math.Abs(x - c));
                    if (v > 0 && (x < cl || x > cr)) v *= gladko(0.12, 0, x < cl ? cl - x : x - cr);
                    if (v <= 0.002) { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = 255; continue; }
                    var u = Math.Max(-1, Math.Min(1, (x - c) / hw));
                    var pi = (int)Math.Floor((u + 1) * 0.5 * (PROFIL - 1) + 0.5);
                    var smuga = lerp(ostryJ[pi], mietyJ[pi], mieszaj);
                    var swiatlo = v * jas * (1 + kontrast * (smuga - 1)) * (1 - smg / 2 + smg * mgla(x * 0.9, (y - splyw) * 0.32))
                        * (0.92 + 0.16 * mgla(x * 0.35 + 17, (y - splyw * 0.6) * 0.09 + 5));
                    var b = barwa * (1 - mieszaj * 0.5);
                    double r = lerp(BIEL[0], ostryR[pi], b), gg = lerp(BIEL[1], ostryG[pi], b), bb = lerp(BIEL[2], ostryB[pi], b);
                    var drz = los(o) - 0.5;                         // drżenie: bez schodków w gradiencie
                    d[o] = C8(r * swiatlo + drz);
                    d[o + 1] = C8(gg * swiatlo + drz);
                    d[o + 2] = C8(bb * swiatlo + drz);
                    d[o + 3] = 255;
                }
            }
            (obraz as IDisposable)?.Dispose();
            obraz = Plotno.Fabryka.ObrazZPikseli(W, H, d);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(obraz, sx0, sy0, sw, sh);

            // plamy: na balustradzie otworu w katedrze i na posadzce sali, blask na krzyżu ołtarza
            plama(ctx, cam.toScreenX(cx), cam.toScreenY(yK - 0.45), z * 2.5, z * 0.75, "rgba(255,226,176,0.16)");
            plama(ctx, cam.toScreenX(ax), cam.toScreenY(yP - 0.05), z * 3.3, z * 0.55, "rgba(255,230,180,0.3)");
            var krzyzY = cam.toScreenY(yP) - z * 2.6;
            plama(ctx, cam.toScreenX(ax), krzyzY, z * 2.4, z * 2.4, "rgba(255,236,190,0.13)");

            // pył: drobiny opadają powoli i krążą na boki, w szybie trzymają się jego ścian
            int ile = (int)P.pyl.ile; var dl = yP - yR;
            for (int n = 0; n < ile; n++)
            {
                var f = ((los(n * 3) + (ruch ? (teraz / 1000) * P.pyl.opad * (0.5 + los(n * 5)) / dl : 0)) % 1);
                var y = yR + 0.8 + f * (dl - 1);
                var wSzybie = y >= yK && y < yS;
                var hwy = y < yK ? Sz.rozeta : y < yS ? (k.otwor.x1 - k.otwor.x0) / 2 - 0.15 : lerp((k.otwor.x1 - k.otwor.x0) / 2, Sz.sala, (y - yS) / (yP - yS));
                var cy = y < yS ? cx : lerp(cx, ax, (y - yS) / (yP - yS));
                var x = cy + (los(n * 7) * 2 - 1) * hwy * 0.85 + (ruch ? JsM.Sin(teraz * 0.0006 + n * 1.3) * 0.25 : 0);
                if (wSzybie) x = Math.Max(k.otwor.x0 + 0.1, Math.Min(k.otwor.x1 - 0.1, x));
                var mig = ruch ? 0.5 + 0.5 * JsM.Sin(teraz * (0.002 + 0.002 * los(n * 11)) + n) : 0.7;
                var al = 0.55 * mig * Math.Pow(JsM.Sin(f * Math.PI), 0.5);
                if (al < 0.03) continue;
                ctx.fillStyle = Barwa.Rgba(255, 246, 222, al);
                ctx.beginPath(); ctx.arc(cam.toScreenX(x), cam.toScreenY(y), Math.Max(0.6, z * (0.03 + 0.025 * los(n * 13))), 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Miękka eliptyczna plama światła.</summary>
        static void plama(IPlotno ctx, double x, double y, double rx, double ry, string barwa)
        {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ry / rx);
            var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
            g.addColorStop(0, barwa); g.addColorStop(1, "rgba(255,230,180,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
}
