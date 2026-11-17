// Port: krag-3-beta/src/render/krag.ts — KRĄG TRZECI, rysunek kręgu żarłoków (tryb Krag.Wlaczony):
//  - brzeg kręgu zamiast katedry: poszarpane skały z naturalnym łukiem nad szybem; w łuku szczelina w burzowych
//    chmurach, przez którą pada jedyne światło łaski (promień na ołtarz — bez zmian);
//  - z nieba wiecznie leje (ulewa — gęściej, z gradem, brudnym śniegiem i błyskawicami);
//  - grunt: cuchnące błoto, kałuże, kości i szczątki rozszarpanych;
//  - pod ziemią: krople z wykutych stropów;
//  - żarłocy: obżarty — zielonkawe smugi smrodu nad głową; przejedzony leży w kałuży błota z bąblami;
//  - okup dla Cerbera: garść jedzenia leci łukiem do paszczy;
//  - barwa kręgu: rycina przygaszona i podgrzana (zakrzepła krew, zgniła żółć).
// Mechanika: Symulacja/Krag.cs. (Plansza prologu z TS — rysujProlog — nie jest nigdzie wołana; jej rolę przejęła scena
// wejścia, więc nie jest przeniesiona.)
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek kręgu (RysKrag — bo Krag to moduł symulacji).</summary>
    public static class RysKrag
    {
        const string TUSZ = "rgba(14,10,8,0.95)";
        static double los(double n) => Pieklo.los(n);
        static double SURFACE_Y => World.SURFACE_Y;

        /// <summary>Ulewa na ekranie: wygładzona w czasie (żeby deszcz nie skakał).</summary>
        static double mocUlewy(Sim sim, double teraz) => Pieklo.wygladzUlewe(Krag.ulewa(sim), teraz);

        // ---------------------------------------------------------------- brzeg kręgu (zamiast katedry)

        static (double x, double y)[] turnia(double g, double xa, double xb, double wys, double ziarno)
        {
            // poszarpana turnia: zęby skały, występy, szczeliny
            const int n = 16;
            var pts = new (double x, double y)[n + 3];
            pts[0] = (xa - 0.6, g + 0.3);
            for (int i = 0; i <= n; i++)
            {
                var u = (double)i / n;
                var x = xa + (xb - xa) * u;
                var prof = Math.Pow(Math.Sin(u * Math.PI), 0.55);
                var zab = (i % 2 != 0 ? 1 : -1) * (0.6 + los(ziarno + i * 3) * 1.6) * prof;
                pts[i + 1] = (x + (los(ziarno + i * 7) - 0.5) * 1.1, g - wys * prof * (0.82 + 0.25 * los(ziarno + i)) + zab);
            }
            pts[n + 2] = (xb + 0.6, g + 0.3);
            return pts;
        }

        /// <summary>Skały brzegu kręgu nad szybem ze światłem — przed mrokiem.</summary>
        public static void rysujBrzegKregu(IPlotno ctx, Sim sim, Camera cam)
        {
            var k = Katedra.ukladKatedry(sim.world);
            if (k == null) return;
            var z = cam.zoom;
            double X(double x) => cam.toScreenX(x);
            double Y(double y) => cam.toScreenY(y);
            if (X(k.x1 + 4) < 0 || X(k.x0 - 4) > cam.vw || Y(k.szczyt - 3) > cam.vh || Y(k.g + 1) < 0) return;
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            double g = k.g, cx = k.cx; var r = k.rozeta;
            var lw = Math.Max(1.2, z * 0.09);
            // dwie turnie po bokach szybu i łuk nad nim
            double wysL = (g - r.y) + r.r + 2.6, wysP = ((g - r.y) + r.r + 2.6) * 0.92;
            var lewa = turnia(g, cx - 9, cx - 1.2, wysL, 11);
            var prawa = turnia(g, cx + 1.2, cx + 7, wysP, 37);
            var luk = new (double x, double y)[26];
            {
                // łuk: od lewej turni ponad rozetą do prawej, gruby i poszarpany
                double ya = r.y - r.r - 1.6; const int n = 12;
                int j = 0;
                for (int i = 0; i <= n; i++)
                {
                    double u = (double)i / n, x = cx - r.r - 3.2 + (2 * r.r + 6.4) * u;
                    luk[j++] = (x, ya - Math.Sin(u * Math.PI) * 1.4 + (los(70 + i) - 0.5) * 0.7);
                }
                for (int i = n; i >= 0; i--)
                {
                    double u = (double)i / n, x = cx - r.r - 2.4 + (2 * r.r + 4.8) * u;
                    luk[j++] = (x, r.y - r.r * 0.2 + Math.Sin(u * Math.PI) * -r.r * 0.9 + (los(90 + i) - 0.5) * 0.5);
                }
            }
            void kamien((double x, double y)[] pts, double jas)
            {
                ctx.beginPath();
                for (int i = 0; i < pts.Length; i++) { if (i != 0) ctx.lineTo(X(pts[i].x), Y(pts[i].y)); else ctx.moveTo(X(pts[i].x), Y(pts[i].y)); }
                ctx.closePath();
                var gr = ctx.createLinearGradient(0, Y(k.szczyt), 0, Y(g));
                gr.addColorStop(0, Barwa.Rgba(78 * jas, 80 * jas, 72 * jas, 1));
                gr.addColorStop(1, Barwa.Rgba(30 * jas, 31 * jas, 28 * jas, 1));
                ctx.fillStyle = gr; ctx.fill();
                ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
                // spękania i warstwy — kreska tuszem
                ctx.save(); ctx.clip();
                ctx.strokeStyle = "rgba(14,10,8,0.45)"; ctx.lineWidth = Math.Max(0.7, lw * 0.5);
                double x0 = double.PositiveInfinity, x1 = double.NegativeInfinity, y0 = double.PositiveInfinity;
                foreach (var p in pts) { x0 = Math.Min(x0, p.x); x1 = Math.Max(x1, p.x); y0 = Math.Min(y0, p.y); }
                for (int i = 0; i < 18; i++)
                {
                    double sx = x0 + los(i * 13 + x0 * 7) * (x1 - x0), sy = y0 + los(i * 17 + 3) * (g - y0);
                    ctx.beginPath(); ctx.moveTo(X(sx), Y(sy));
                    ctx.lineTo(X(sx + (los(i * 5) - 0.5) * 2.4), Y(sy + 0.6 + los(i * 3) * 1.4));
                    ctx.lineTo(X(sx + (los(i * 9) - 0.5) * 3), Y(sy + 1.6 + los(i * 11) * 1.6));
                    ctx.stroke();
                }
                // mokre lśnienie na krawędziach
                ctx.strokeStyle = "rgba(170,190,180,0.22)"; ctx.lineWidth = Math.Max(1, lw * 1.4);
                ctx.beginPath();
                for (int i = 1; i < pts.Length - 1; i++) { if (i != 1) ctx.lineTo(X(pts[i].x + 0.15), Y(pts[i].y + 0.25)); else ctx.moveTo(X(pts[i].x + 0.15), Y(pts[i].y + 0.25)); }
                ctx.stroke();
                ctx.restore();
            }
            kamien(lewa, 1);
            kamien(prawa, 0.9);
            kamien(luk, 1.05);
            // szczelina w łuku — ciemne niebo (świeci nad mrokiem: rysujBrzegKreguNad)
            ctx.fillStyle = "rgba(10,12,14,1)";
            ctx.beginPath(); ctx.ellipse(X(r.x), Y(r.y), r.r * z * 0.95, r.r * z * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
            // martwe, poskręcane drzewo na lewej turni
            {
                double tx = cx - 7.5, ty = lewa[2].y + 0.6;
                ctx.strokeStyle = "rgba(20,16,12,0.95)";
                void galaz(double x, double y, double kat, double dl, double gr, int n)
                {
                    if (n <= 0 || dl < 0.25) return;
                    double x2 = x + Math.Cos(kat) * dl, y2 = y + Math.Sin(kat) * dl;
                    ctx.lineWidth = Math.Max(0.8, gr * z);
                    ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.quadraticCurveTo(X((x + x2) / 2 + 0.3), Y((y + y2) / 2), X(x2), Y(y2)); ctx.stroke();
                    galaz(x2, y2, kat - 0.5 - los(n * 7 + dl * 10) * 0.3, dl * 0.68, gr * 0.62, n - 1);
                    galaz(x2, y2, kat + 0.45 + los(n * 3 + dl * 10) * 0.3, dl * 0.6, gr * 0.6, n - 1);
                }
                galaz(tx, ty, -Math.PI / 2 - 0.25, 2.6, 0.32, 5);
            }
            ctx.restore();
        }

        /// <summary>Szczelina w chmurach w łuku brzegu — świeci przez mrok (zamiast rozety).</summary>
        public static void rysujBrzegKreguNad(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var k = Katedra.ukladKatedry(sim.world);
            if (k == null) return;
            var z = cam.zoom; var r = k.rozeta;
            double x = cam.toScreenX(r.x), y = cam.toScreenY(r.y);
            if (x < -r.r * z * 4 || x > cam.vw + r.r * z * 4 || y < -r.r * z * 4 || y > cam.vh + r.r * z * 4) return;
            var t = Nastroj.wolnoRuszac() ? teraz / 1000 : 0;
            ctx.save();
            ctx.beginPath(); ctx.ellipse(x, y, r.r * z * 0.95, r.r * z * 0.8, 0, 0, Math.PI * 2); ctx.clip();
            var g = ctx.createRadialGradient(x, y, 0, x, y, r.r * z);
            g.addColorStop(0, "rgba(255,244,200,0.95)"); g.addColorStop(0.45, "rgba(232,206,140,0.75)"); g.addColorStop(1, "rgba(90,96,100,0.5)");
            ctx.fillStyle = g; ctx.fillRect(x - r.r * z, y - r.r * z, r.r * z * 2, r.r * z * 2);
            // płynące chmury w szczelinie
            ctx.fillStyle = "rgba(60,64,66,0.55)";
            for (int i = 0; i < 5; i++)
            {
                var cxp = x + (((t * 0.25 * (1 + i * 0.2) + los(i)) % 1) * 2 - 1) * r.r * z * 1.3;
                ctx.beginPath(); ctx.ellipse(cxp, y + (los(i * 3) - 0.5) * r.r * z * 1.2, r.r * z * 0.5, r.r * z * 0.16, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            // poświata
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            var R = r.r * z * 3;
            var p = ctx.createRadialGradient(x, y, r.r * z * 0.5, x, y, R);
            p.addColorStop(0, "rgba(255,230,170,0.22)"); p.addColorStop(1, "rgba(255,200,120,0)");
            ctx.fillStyle = p; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            ctx.restore();
        }

        // ---------------------------------------------------------------- niebo, deszcz, grad, błyskawice

        /// <summary>
        /// Niebo nad kręgiem (nad mrokiem): wieczny deszcz — dalsza warstwa gęsta i cienka, bliższa gruba; w dole kadru krople
        /// łapią czerwoną łunę. Zawsze trochę gradu i brudnego śniegu, w ulewie dużo więcej. Rozpryski na błocie, przy ziemi
        /// mgła smrodu. Błyskawice — wspólny zegar (Pieklo): błysk na mgnienie wybiela cały krąg.
        /// </summary>
        public static void rysujNieboKregu(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var u = Pieklo.wygladzUlewe(Krag.ulewa(sim), teraz);
            var ruch = Nastroj.wolnoRuszac();
            var t = ruch ? teraz / 1000 : 0;
            var w = sim.world; var z = cam.zoom;
            var W = cam.vw;
            var yNajnizej = cam.toScreenY(SURFACE_Y + 0.3);
            if (yNajnizej <= 0) return;
            var H = Math.Min(cam.vh, yNajnizej);
            var L = Pieklo.luna(teraz);
            var b = Pieklo.blyskawica(teraz, u);
            // obszar nad gruntem (deszcz nie pada w skałę przekroju)
            var krok = Math.Max(4, z * 0.5);
            double grunt(double sx) => cam.toScreenY(SURFACE_Y - Grzbiet.wysokoscGrzbietu(w, cam.toWorldX(sx)));
            ctx.save();
            ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(W + 10, -10);
            for (var x = W + krok; x >= -krok; x -= krok) ctx.lineTo(x, grunt(x) + z * 0.15);
            ctx.closePath(); ctx.clip();
            var wiatr = 0.2 + 0.2 * u + 0.07 * Math.Sin(t * 0.37);
            CanvasGradient kolorDeszczu(double a)
            {
                var g = ctx.createLinearGradient(0, 0, 0, H);
                g.addColorStop(0, Barwa.Rgba(150, 160, 178, a * 0.7));
                g.addColorStop(0.6, Barwa.Rgba(170, 160, 168, a));
                g.addColorStop(1, Barwa.Rgba((int)(210 * L), (int)(120 * L), (int)(100 * L), a));
                return g;
            }
            // dalsza warstwa: gęsta, cienka, wolniejsza
            var n1 = (int)Math.Floor((W / 1280) * (260 + 360 * u) + 0.5);
            ctx.strokeStyle = kolorDeszczu(0.16 + 0.14 * u + 0.3 * b.a); ctx.lineWidth = 1;
            ctx.beginPath();
            for (int i = 0; i < n1; i++)
            {
                var v = 0.8 + los(i * 3) * 0.4;
                var dl = (10 + 8 * u) * v;
                var x = ((los(i) * W * 1.3 + t * 700 * wiatr * v) % (W * 1.3)) - W * 0.15;
                var y = (los(i * 7) * (H + 60) + t * 700 * v) % (H + 60) - 30;
                ctx.moveTo(x, y); ctx.lineTo(x - dl * wiatr, y - dl);
            }
            ctx.stroke();
            // bliższa warstwa: grube, długie strugi
            var n2 = (int)Math.Floor((W / 1280) * (90 + 170 * u) + 0.5);
            ctx.strokeStyle = kolorDeszczu(0.28 + 0.16 * u + 0.4 * b.a); ctx.lineWidth = Math.Max(1.3, Math.Min(2.4, z * 0.06));
            ctx.beginPath();
            for (int i = 0; i < n2; i++)
            {
                var v = 0.9 + los(i * 5 + 1) * 0.5;
                var dl = (22 + 22 * u) * v;
                var x = ((los(i * 11 + 3) * W * 1.3 + t * 1250 * wiatr * v) % (W * 1.3)) - W * 0.15;
                var y = (los(i * 13 + 5) * (H + 80) + t * 1250 * v) % (H + 80) - 40;
                ctx.moveTo(x, y); ctx.lineTo(x - dl * wiatr, y - dl);
            }
            ctx.stroke();
            // grad: białe ziarna, szybkie; brudny śnieg: wolne, szarobrunatne płatki
            ctx.fillStyle = Barwa.Rgba(228, 232, 236, 0.55 + 0.3 * u);
            var nGrad = (int)Math.Floor((W / 1280) * (24 + 110 * u) + 0.5);
            for (int i = 0; i < nGrad; i++)
            {
                double x = (los(i * 11 + 1) * W + t * 260 * wiatr) % W, y = (los(i * 13) * H + t * 1400 * (0.8 + los(i) * 0.4)) % H;
                var r = Math.Max(1.5, z * (0.05 + 0.04 * los(i * 3)));
                ctx.fillRect(x, y, r, r * 1.3);
            }
            ctx.fillStyle = Barwa.Rgba(150, 140, 124, 0.4 + 0.3 * u);
            var nSn = (int)Math.Floor((W / 1280) * (30 + 70 * u) + 0.5);
            for (int i = 0; i < nSn; i++)
            {
                double x = (los(i * 17 + 5) * W + Math.Sin(t * 1.3 + i) * 24 + t * 60 * wiatr) % W, y = (los(i * 19) * H + t * 110 * (0.8 + los(i * 7) * 0.5)) % H;
                ctx.beginPath(); ctx.arc(x, y, Math.Max(1.2, z * 0.06), 0, Math.PI * 2); ctx.fill();
            }
            // rozpryski na błocie: korona kropel tam, gdzie struga uderza w grunt
            if (z >= 6)
            {
                double xa = Math.Floor(cam.toWorldX(0)), xb = Math.Ceiling(cam.toWorldX(W));
                ctx.strokeStyle = Barwa.Rgba(180, 150, 146, 0.22 + 0.14 * u); ctx.lineWidth = 1;
                ctx.beginPath();
                var gestosc = 3 + Math.Floor(3 * u + 0.5);
                for (var k = xa * gestosc; k <= xb * gestosc; k++)
                {
                    var okres = 0.35 + los(k * 7) * 0.4;
                    var f = ((t + los(k * 3) * okres) % okres) / okres;
                    if (f > 0.4) continue;
                    var cykl = Math.Floor((t + los(k * 3) * okres) / okres);
                    var wx = k / gestosc + los(k * 13 + cykl * 7) / gestosc;
                    double sx = cam.toScreenX(wx), sy = cam.toScreenY(SURFACE_Y - Grzbiet.wysokoscGrzbietu(w, wx));
                    double rr = z * (0.05 + 0.13 * f / 0.4), wys = z * 0.13 * Math.Sin((f / 0.4) * Math.PI);
                    ctx.moveTo(sx - rr, sy); ctx.quadraticCurveTo(sx - rr * 0.8, sy - wys, sx - rr * 0.5, sy - wys * 0.6);
                    ctx.moveTo(sx + rr, sy); ctx.quadraticCurveTo(sx + rr * 0.8, sy - wys, sx + rr * 0.5, sy - wys * 0.6);
                }
                ctx.stroke();
            }
            // mgła smrodu przy ziemi: zgniła, żółtozielona, płynie z wiatrem
            var yM = cam.toScreenY(SURFACE_Y - 0.6);
            Pieklo.pasMgly(ctx, W, yM - z * 1.6, yM + z * 0.9, t * 14 + cam.x * z, "rgb(92,96,70)", 0.12 + 0.08 * u);
            Pieklo.pasMgly(ctx, W, yM - z * 0.9, yM + z * 0.7, t * 26 + cam.x * z + 400, "rgb(70,60,48)", 0.18 + 0.08 * u);
            // błysk: wszystko nad ziemią sine i jasne na mgnienie
            if (b.a > 0.01)
            {
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = Barwa.Rgba(96, 106, 136, 0.14 * b.a);
                ctx.fillRect(0, 0, W, H);
                ctx.globalCompositeOperation = "source-over";
            }
            ctx.restore();
            // ulewa przygasza i oziębia cały świat
            if (u > 0.02)
            {
                ctx.save();
                ctx.fillStyle = Barwa.Rgba(22, 28, 40, 0.14 * u);
                ctx.fillRect(0, 0, cam.vw, cam.vh);
                ctx.restore();
            }
        }

        static readonly (double od, double dno, double a)[] WARSTWY_BLOTA = { (-0.14, 0.32, 0.9), (0.32, 0.95, 0.42) };

        /// <summary>
        /// Grunt kręgu (po leju, przed tłumem): cuchnące błoto na całym tarasie — tłusty połysk z łuną, kałuże z kręgami
        /// deszczu, grad leżący w błocie, a w nim kości, czaszki, żebra, gnijące resztki uczt i szczątki tych, których
        /// rozszarpał Cerber, w kałużach krwi.
        /// </summary>
        public static void rysujGruntKregu(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world; double z = cam.zoom, W = cam.vw;
            if (cam.toScreenY(SURFACE_Y - 4) > cam.vh || cam.toScreenY(SURFACE_Y + 1) < 0) return;
            var t = Nastroj.wolnoRuszac() ? teraz / 1000 : 0;
            var u = Pieklo.wygladzUlewe(Krag.ulewa(sim), teraz);
            var L = Pieklo.luna(teraz);
            var b = Pieklo.blyskawica(teraz, u);
            var k = Katedra.ukladKatedry(w);
            double kraniec = w.w - 9;
            double gy(double wx) => cam.toScreenY(SURFACE_Y - Grzbiet.wysokoscGrzbietu(w, wx));
            var krok = Math.Max(3, z * 0.4);
            var xMax = Math.Min(W + krok, cam.toScreenX(kraniec + 0.5));
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            // warstwa błota: gruba i tłusta u góry, w głąb przechodzi w ziemię
            foreach (var (od, dno, a) in WARSTWY_BLOTA)
            {
                ctx.beginPath();
                var pierwszy = true;
                for (var x = -krok; x <= xMax; x += krok)
                {
                    var wx = cam.toWorldX(x);
                    var fala = (Pieklo.szum1(wx * 2.3, 5) - 0.5) * 0.12;
                    var y = gy(wx) + z * (od + fala);
                    if (pierwszy) { ctx.moveTo(x, y); pierwszy = false; } else ctx.lineTo(x, y);
                }
                for (var x = xMax; x >= -krok; x -= krok) ctx.lineTo(x, gy(cam.toWorldX(x)) + z * dno);
                ctx.closePath();
                ctx.fillStyle = Barwa.Rgba(34, 27, 20, a); ctx.fill();
            }
            // tłusty połysk na wierzchu błota: łuna, a w błysku — sino
            ctx.strokeStyle = Barwa.Rgba((int)(170 * L + 160 * b.a), (int)(70 * L + 170 * b.a), (int)(44 + 200 * b.a), 0.32 + 0.4 * b.a);
            ctx.lineWidth = Math.Max(1, z * 0.05);
            ctx.beginPath();
            for (var x = -krok; x <= xMax; x += krok)
            {
                var wx = cam.toWorldX(x);
                if (Pieklo.szum1(wx * 1.7, 9) < 0.45) { ctx.moveTo(x + krok, gy(wx + krok / z) - z * 0.08); continue; }
                ctx.lineTo(x, gy(wx) - z * 0.08 - (Pieklo.szum1(wx * 2.3, 5) - 0.5) * 0.12 * z);
            }
            ctx.stroke();
            double xa = Math.Max(2, Math.Floor(cam.toWorldX(0)) - 2), xb = Math.Min(kraniec - 1, Math.Ceiling(cam.toWorldX(W)) + 2);
            bool zajete(double x) => k != null && x > k.x0 - 3 && x < k.x1 + 2;
            // kałuże: czarna, tłusta woda, w niej czerwone niebo; deszcz bije kręgi
            for (var kx = Math.Floor(xa / 3); kx <= Math.Ceiling(xb / 3); kx++)
            {
                if (los(kx * 71) > 0.42) continue;
                var x = kx * 3 + los(kx) * 2;
                if (zajete(x)) continue;
                var sz = 0.7 + los(kx * 3) * 1.7;
                double sx = cam.toScreenX(x), sy = gy(x) + z * 0.06;
                double rx = sz * z, ry = Math.Max(1.5, z * (0.12 + 0.05 * los(kx * 5)));
                var g = ctx.createLinearGradient(0, sy - ry, 0, sy + ry);
                g.addColorStop(0, Barwa.Rgba((int)(150 * L + 150 * b.a), (int)(48 * L + 160 * b.a), (int)(28 + 190 * b.a), 0.85));
                g.addColorStop(0.5, "rgba(26,12,10,0.95)");
                g.addColorStop(1, "rgba(14,9,8,0.95)");
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "rgba(16,10,8,0.8)"; ctx.lineWidth = Math.Max(1, z * 0.04); ctx.stroke();
                // kręgi od kropel
                if (z >= 8)
                {
                    for (int r = 0; r < 4; r++)
                    {
                        var okr = 0.9 + los(kx * 7 + r) * 0.6;
                        var f = ((t + los(kx * 11 + r * 3) * okr) % okr) / okr;
                        var cykl = Math.Floor((t + los(kx * 11 + r * 3) * okr) / okr);
                        var px = sx + (los(kx * 13 + r * 5 + cykl) - 0.5) * rx * 1.4;
                        ctx.strokeStyle = Barwa.Rgba(210, 170, 160, 0.45 * (1 - f)); ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.ellipse(px, sy, z * 0.05 + f * z * 0.35, (z * 0.05 + f * z * 0.35) * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
                    }
                }
            }
            // drobiazgi w błocie — dopiero z bliska (z daleka to i tak pył)
            if (z >= 10)
            {
                var h = Math.Max(16, z * 1.9 * ustawienia.wielkoscSylwetek);
                for (var x = xa; x <= xb; x++)
                {
                    if (zajete(x)) continue;
                    var r = los(x * 911 + 7);
                    var fx = x + 0.2 + los(x * 3) * 0.6;
                    double sx = cam.toScreenX(fx), sy = gy(fx) + z * 0.04;
                    ctx.save(); ctx.translate(sx, sy);
                    if (r < 0.1) czaszka(ctx, h, los(x * 5));
                    else if (r < 0.24) kosci(ctx, h, x);
                    else if (r < 0.29) zebra(ctx, h, los(x * 7));
                    else if (r < 0.35) zgnilizna(ctx, h, x, t);
                    else if (r < 0.39) skorupy(ctx, h, x);
                    else if (r < 0.42) czaszkaWieprza(ctx, h, los(x * 9));
                    ctx.restore();
                    // grad leży w błocie
                    ctx.fillStyle = "rgba(214,218,222,0.7)";
                    for (int i = 0; i < 3 + Math.Floor(4 * u + 0.5); i++)
                    {
                        double gx = cam.toScreenX(x + los(x * 17 + i)), gyy = gy(x + los(x * 17 + i)) + z * (0.02 + los(x * 19 + i) * 0.12);
                        ctx.fillRect(gx, gyy, Math.Max(1, z * 0.05), Math.Max(1, z * 0.04));
                    }
                }
                // szczątki rozszarpanych: ręka, głowa, trzewia — w kałużach krwi (Cerber żre tu od wieków)
                for (var kx = Math.Floor(xa / 11); kx <= Math.Ceiling(xb / 11); kx++)
                {
                    if (los(kx * 523) > 0.62) continue;
                    var x = kx * 11 + 1 + los(kx * 5) * 8;
                    if (zajete(x) || x > kraniec - 2) continue;
                    double sx = cam.toScreenX(x), sy = gy(x) + z * 0.05;
                    if (sx < -h * 2 || sx > W + h * 2) continue;
                    ctx.save(); ctx.translate(sx, sy);
                    if (los(kx * 3) < 0.5) ctx.scale(-1, 1);
                    Ludzik.kaluzaKrwi(ctx, 0, h * 0.02, h * (0.55 + los(kx * 7) * 0.5), 1, kx);
                    var rodzaj = Math.Floor(los(kx * 17) * 4);
                    if (rodzaj == 0) { ctx.translate(0, -h * 0.05); Ludzik.rysujOderwanaReke(ctx, h, -1.4 + los(kx) * 0.3, 0.4 + los(kx * 9) * 0.8); }
                    else if (rodzaj == 1) { ctx.translate(0, -h * 0.06); Ludzik.rysujOderwanaGlowe(ctx, h, 1.5 + los(kx) * 0.8); }
                    else if (rodzaj == 2) Ludzik.rysujTrzewia(ctx, h * 0.95, (los(kx) - 0.5) * 0.3);
                    else { Ludzik.rysujTrzewia(ctx, h * 0.8, 0.1); ctx.translate(h * 0.45, -h * 0.05); Ludzik.rysujOderwanaReke(ctx, h, -1.5, 1.1); }
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        const string KOSC = "rgb(176,162,134)", KOSC_C = "rgb(120,106,84)";
        const string BLOTO = "rgba(34,27,20,0.92)";

        static void czaszka(IPlotno ctx, double h, double r)
        {
            var s = h * 0.1;
            ctx.rotate((r - 0.5) * 0.8);
            ctx.fillStyle = KOSC; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, s * 0.12);
            ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s, s * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(s * 0.35, -s * 0.1); ctx.lineTo(s * 1.05, -s * 0.05); ctx.lineTo(s * 0.95, s * 0.3); ctx.lineTo(s * 0.3, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(14,8,6,0.95)";
            ctx.beginPath(); ctx.ellipse(s * 0.45, -s * 0.55, s * 0.24, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(s * 0.85, -s * 0.28, s * 0.08, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "rgba(14,8,6,0.9)"; ctx.lineWidth = Math.Max(0.6, s * 0.06);
            ctx.beginPath(); for (int i = 0; i < 4; i++) { ctx.moveTo(s * (0.45 + i * 0.15), s * 0.05); ctx.lineTo(s * (0.45 + i * 0.15), s * 0.25); } ctx.stroke();
            ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 1.4, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        }

        static void kosci(IPlotno ctx, double h, double x)
        {
            var n = 1 + (int)Math.Floor(los(x * 13) * 2);
            for (int i = 0; i < n; i++)
            {
                double dl = h * (0.22 + los(x * 3 + i) * 0.16), kat = (los(x * 7 + i) - 0.5) * 0.7, gr = h * 0.03;
                ctx.save(); ctx.translate((i - 0.5) * h * 0.08, -gr * 0.6); ctx.rotate(kat);
                ctx.strokeStyle = TUSZ; ctx.lineWidth = gr + Math.Max(1.2, gr * 0.4);
                ctx.beginPath(); ctx.moveTo(-dl / 2, 0); ctx.lineTo(dl / 2, 0); ctx.stroke();
                ctx.strokeStyle = KOSC; ctx.lineWidth = gr;
                ctx.beginPath(); ctx.moveTo(-dl / 2, 0); ctx.lineTo(dl / 2, 0); ctx.stroke();
                ctx.fillStyle = KOSC;
                for (int e = -1; e <= 1; e += 2)
                {
                    ctx.beginPath(); ctx.arc(e * dl / 2, -gr * 0.35, gr * 0.75, 0, Math.PI * 2); ctx.arc(e * dl / 2, gr * 0.35, gr * 0.75, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
        }

        static void zebra(IPlotno ctx, double h, double r)
        {
            var s = h * 0.2;
            ctx.scale(r < 0.5 ? 1 : -1, 1);
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1.6, s * 0.11);
            ctx.beginPath(); ctx.moveTo(-s, -s * 0.15); ctx.lineTo(s, -s * 0.25); ctx.stroke();
            for (int i = 0; i < 6; i++) { var x = -s * 0.8 + i * s * 0.32; ctx.beginPath(); ctx.moveTo(x, -s * 0.18); ctx.quadraticCurveTo(x + s * 0.3, -s * 0.9, x + s * 0.1, -s * (0.05 + 0.1 * (i % 2))); ctx.stroke(); }
            ctx.strokeStyle = KOSC; ctx.lineWidth = Math.Max(0.9, s * 0.06);
            ctx.beginPath(); ctx.moveTo(-s, -s * 0.15); ctx.lineTo(s, -s * 0.25); ctx.stroke();
            for (int i = 0; i < 6; i++) { var x = -s * 0.8 + i * s * 0.32; ctx.beginPath(); ctx.moveTo(x, -s * 0.18); ctx.quadraticCurveTo(x + s * 0.3, -s * 0.9, x + s * 0.1, -s * (0.05 + 0.1 * (i % 2))); ctx.stroke(); }
            ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.02, s * 1.2, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
        }

        /// <summary>Gnijące resztki uczty: ochłap mięsa z robactwem, zielonkawy nalot.</summary>
        static void zgnilizna(IPlotno ctx, double h, double x, double t)
        {
            var s = h * 0.13;
            ctx.fillStyle = "rgb(86,36,26)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, s * 0.1);
            ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s * 0.9, -s * 0.8, 0, -s * 0.75); ctx.quadraticCurveTo(s * 1.1, -s * 0.9, s * 1.1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(112,128,64,0.55)";
            ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.5, s * 0.35, s * 0.15, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgb(150,30,24)";
            ctx.beginPath(); ctx.ellipse(s * 0.45, -s * 0.45, s * 0.3, s * 0.18, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(232,226,200,0.9)";
            for (int i = 0; i < 7; i++)
            {
                double px = (los(x * 3 + i) - 0.5) * s * 1.6 + Math.Sin(t * 2 + i) * s * 0.06, py = -s * (0.2 + los(x * 5 + i) * 0.5);
                ctx.fillRect(px, py, Math.Max(1, s * 0.14), Math.Max(1, s * 0.06));
            }
            ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 1.3, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        }

        /// <summary>Skorupy dzbana po winie.</summary>
        static void skorupy(IPlotno ctx, double h, double x)
        {
            var s = h * 0.09;
            ctx.fillStyle = "rgb(122,62,40)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, s * 0.1);
            for (int i = 0; i < 3; i++)
            {
                var px = (i - 1) * s * 1.1 + (los(x + i) - 0.5) * s * 0.4;
                ctx.save(); ctx.translate(px, -s * 0.15); ctx.rotate((los(x * 7 + i) - 0.5) * 1.2);
                ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.quadraticCurveTo(0, -s * (0.7 + 0.4 * los(x * 3 + i)), s * 0.6, 0); ctx.lineTo(s * 0.3, s * 0.15); ctx.lineTo(-s * 0.4, s * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
        }

        /// <summary>Czaszka wieprza — Ciacco, „Wieprz”, żarłok z pieśni VI.</summary>
        static void czaszkaWieprza(IPlotno ctx, double h, double r)
        {
            var s = h * 0.11;
            ctx.scale(r < 0.5 ? 1 : -1, 1); ctx.rotate(-0.15);
            ctx.fillStyle = KOSC; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, s * 0.1);
            ctx.beginPath(); ctx.moveTo(-s, -s * 0.2); ctx.quadraticCurveTo(-s * 0.8, -s * 1.1, 0, -s * 0.9); ctx.lineTo(s * 1.6, -s * 0.35); ctx.lineTo(s * 1.65, s * 0.05); ctx.lineTo(-s * 0.7, s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(14,8,6,0.95)"; ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.5, s * 0.22, s * 0.17, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = KOSC_C; ctx.lineWidth = Math.Max(0.8, s * 0.12);
            ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.05); ctx.quadraticCurveTo(s * 1.2, -s * 0.6, s * 0.9, -s * 0.85); ctx.stroke();
            ctx.fillStyle = BLOTO; ctx.beginPath(); ctx.ellipse(0, s * 0.25, s * 1.8, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        }

        /// <summary>Krople ze stropów wykutych korytarzy (przed mrokiem — widać je tylko w świetle).</summary>
        public static void rysujKrople(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            if (!Nastroj.wolnoRuszac()) return;
            var w = sim.world; var z = cam.zoom;
            var u = mocUlewy(sim, teraz);
            const double okres = 1100;
            var n = (int)Math.Floor(28 + 50 * u + 0.5);
            double xa = Math.Max(1, Math.Floor(cam.toWorldX(0))), xb = Math.Min(w.w - 2, Math.Ceiling(cam.toWorldX(cam.vw)));
            double ya = Math.Max(SURFACE_Y + 1, Math.Floor(cam.toWorldY(0))), yb = Math.Min(w.h - 2, Math.Ceiling(cam.toWorldY(cam.vh)));
            if (xb <= xa || yb <= ya) return;
            ctx.save();
            ctx.strokeStyle = "rgba(170,196,200,0.55)"; ctx.lineWidth = Math.Max(1, z * 0.06);
            for (int i = 0; i < n; i++)
            {
                var cykl = Math.Floor((teraz + los(i * 5) * okres) / okres);
                var f = ((teraz + los(i * 5) * okres) % okres) / okres;
                var x = xa + Math.Floor(los(i * 131 + cykl * 7) * (xb - xa));
                var y0 = ya + Math.Floor(los(i * 71 + cykl * 13) * (yb - ya));
                // strop: pierwszy wolny kafel pod skałą, szukany w górę od y0
                double y = y0, sufit = -1;
                for (int k = 0; k < 24 && y > ya; k++, y--)
                {
                    if (w.passable(x, y) && w.solid(x, y - 1)) { sufit = y; break; }
                }
                if (sufit < 0 || w.ever[(int)w.idx(x, sufit)] == 0) continue;
                var dno = sufit;
                while (dno < w.h - 1 && w.passable(x, dno + 1) && dno - sufit < 30) dno++;
                var fx = x + 0.3 + los(i * 19 + cykl) * 0.4;
                var yy = sufit + (dno + 1 - sufit) * f * f;
                double sx = cam.toScreenX(fx), sy = cam.toScreenY(yy);
                if (f < 0.92)
                {
                    ctx.beginPath(); ctx.moveTo(sx, sy - z * 0.25); ctx.lineTo(sx, sy); ctx.stroke();
                }
                else
                {
                    // rozprysk
                    double k2 = (f - 0.92) / 0.08, py = cam.toScreenY(dno + 1);
                    ctx.beginPath(); ctx.ellipse(sx, py, z * 0.3 * k2, z * 0.06, 0, Math.PI, Math.PI * 2); ctx.stroke();
                }
            }
            ctx.restore();
        }

        // ---------------------------------------------------------------- żarłocy i okup

        /// <summary>Obżarci (smród nad głową), przejedzeni w błocie (kałuża, bąble), okup lecący do paszczy — po postaciach.</summary>
        public static void rysujZarlokow(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var z = cam.zoom;
            var t = Nastroj.wolnoRuszac() ? teraz / 1000 : 0;
            ctx.save();
            ctx.lineCap = "round";
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.race != Race.GOBLIN) continue;
                double sx = cam.toScreenX(c.x), sy = cam.toScreenY(c.y + 1);
                if (sx < -40 || sx > cam.vw + 40 || sy < -40 || sy > cam.vh + 60) continue;
                var blot = (c.wBlocieDo ?? 0) > sim.tick;
                if (blot)
                {
                    ctx.fillStyle = "rgba(78,70,38,0.9)";
                    ctx.beginPath(); ctx.ellipse(sx - z * 0.4, sy, z * 1.5, z * 0.3, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "rgba(20,16,10,0.8)"; ctx.lineWidth = Math.Max(1, z * 0.05); ctx.stroke();
                    ctx.fillStyle = "rgba(150,170,120,0.35)";
                    ctx.beginPath(); ctx.ellipse(sx - z * 0.7, sy - z * 0.08, z * 0.7, z * 0.07, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "rgba(140,150,110,0.6)"; ctx.lineWidth = Math.Max(0.6, z * 0.04);
                    for (int b = 0; b < 3; b++)
                    {
                        var f = (t * 0.7 + b / 3.0) % 1;
                        ctx.beginPath(); ctx.arc(sx - z * 0.9 + b * z * 0.5, sy - z * 0.1 - f * z * 0.25, z * 0.06 * (1 + f), 0, Math.PI * 2); ctx.stroke();
                    }
                }
                var o = Math.Min(1, c.obzarstwo ?? 0);
                if (o > 0.25 && !blot)
                {
                    // smród przejedzenia: zielonkawe falki nad głową
                    ctx.strokeStyle = Barwa.Rgba(150, 206, 70, 0.45 + 0.55 * o); ctx.lineWidth = Math.Max(2, z * 0.14);
                    for (int s = 0; s < 1 + Math.Floor(o * 2 + 0.5); s++)
                    {
                        var f = (t * 0.6 + s * 0.37) % 1;
                        double bx = sx + (s - 1) * z * 0.35, by = sy - z * (2.5 + f * 1.6);
                        ctx.globalAlpha = 1 - f;
                        ctx.beginPath();
                        ctx.moveTo(bx, by + z * 0.8);
                        ctx.bezierCurveTo(bx + z * 0.3, by + z * 0.55, bx - z * 0.3, by + z * 0.25, bx, by);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                }
            }
            // okup: garść jedzenia łukiem do paszczy Cerbera
            var k = sim.lud.krag;
            Creature? boss = null;
            foreach (var c in sim.creatures) if (!c.dead && c.boss != null) { boss = c; break; }
            if (k != null && boss != null)
            {
                var dt = sim.tick - k.okupT;
                if (dt >= 0 && dt < 80)
                {
                    var f = dt / 80;
                    double tx = boss.x + (boss.face >= 0 ? 2.2 : -2.2), ty = boss.y - 2.2;
                    for (int i = 0; i < 5; i++)
                    {
                        var ff = Math.Max(0, Math.Min(1, f * 1.2 - i * 0.04));
                        var x = k.okupX + (tx - k.okupX) * ff + (los(i) - 0.5) * 0.4;
                        var y = k.okupY + (ty - k.okupY) * ff - Math.Sin(ff * Math.PI) * Math.Max(3, Math.Abs(tx - k.okupX) * 0.35) + (los(i * 3) - 0.5) * 0.4;
                        double px = cam.toScreenX(x), py = cam.toScreenY(y);
                        ctx.fillStyle = i % 2 != 0 ? "rgba(170,120,70,0.95)" : "rgba(120,80,48,0.95)";
                        ctx.strokeStyle = TUSZ; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.arc(px, py, Math.Max(2, z * 0.18), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /// <summary>
        /// Barwa kręgu (piekło Dantego): rycina świata przygaszona i podgrzana — cienie w brunatnej czerwieni zakrzepłej
        /// krwi, światła w zgniłej żółci; od dołu kadru grzeje łuna niższych kręgów.
        /// </summary>
        public static void barwaKregu(IPlotno ctx, double x, double y, double w, double h)
        {
            ctx.save();
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = "rgb(198,178,166)";
            ctx.fillRect(x, y, w, h);
            ctx.globalCompositeOperation = "soft-light";
            var g = ctx.createLinearGradient(0, y, 0, y + h);
            g.addColorStop(0, "rgba(70,20,18,0.3)");
            g.addColorStop(1, "rgba(140,34,14,0.42)");
            ctx.fillStyle = g;
            ctx.fillRect(x, y, w, h);
            ctx.restore();
        }
    }
}
