// Port: alpha-1/src/render/dlon.ts — dłoń z otchłani (Koszmar): łuna, wyrwa w posadzce, dłoń wznosząca się z głębi,
// chwyt, zabrani w pięści, cięcie liny wiadra. Jedna zmiana wobec TS (decyzja użytkownika 12.11): dłoń nie jest klatką
// z arkusza WebP, tylko modelem 3D rysowanym na żywo (Rysunek/Model3D/Dlon3D.cs) — w tym samym kadrze, tej samej
// wielkości i w tych samych miejscach; `zacisk` wybiera chwilę animacji płynnie (TS: zaokrąglenie do jednej z 10 klatek).
using System;
using Trzewia.Plotna;
using Trzewia.Rysunek.Model3D;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek dłoni z otchłani (RysDlon — bo Dlon to moduł symulacji, sim/dlon.ts).</summary>
    public static class RysDlon
    {
        static double gladko(double t) { var u = Math.Max(0, Math.Min(1, t)); return u * u * (3 - 2 * u); }

        // ---------------------------------------------------------------- kadr (dawniej: arkusz klatek)

        /// <summary>
        /// Kadr dłoni: płaszczyzna obrazu x ∈ [−17, 27], y ∈ [−11, 9] w jednostkach modelu; nadgarstek to (0, 0), palce
        /// celują w +x, kciuk jest u dołu. (W TS: arkusz 10 klatek 792×360 px, 18 px na jednostkę.)
        /// </summary>
        public static class ARKUSZ
        {
            public const int kolumny = 2, klatek = 10, szer = 792, wys = 360;
            public const double x0 = -17, y1 = 9, pxNaJedn = 18;
        }
        /// <summary>Miejsce chwytu (między palcami a kciukiem) w otwartej dłoni i środek zaciśniętej pięści — jednostki modelu.</summary>
        static readonly (double x, double y) CHWYT_OTWARTA = (16.4, -5.6);
        static readonly (double x, double y) CHWYT_PIESC = (9.6, -3.2);
        /// <summary>Koniec najdłuższego szponu (od nadgarstka) — do wychylania się z ciemności (palce krótsze niż dawniej).</summary>
        const double ZASIEG_SZPONOW = 23.1;
        /// <summary>Kafle świata na jednostkę modelu przy DLON.wielkosc = 1 (dłoń z szponami ok. 5,4 kafla).</summary>
        public const double KAFLE_NA_JEDN = 0.21;

        /// <summary>Miejsce chwytu dla danego zacisku (0 — otwarta, 1 — pięść), w jednostkach modelu.</summary>
        public static (double x, double y) chwyt(double zacisk)
        {
            var k = gladko(zacisk);
            return (CHWYT_OTWARTA.x + (CHWYT_PIESC.x - CHWYT_OTWARTA.x) * k, CHWYT_OTWARTA.y + (CHWYT_PIESC.y - CHWYT_OTWARTA.y) * k);
        }

        /// <summary>
        /// Rysuje dłoń z otchłani: nadgarstek w (sx, sy) na ekranie, palce w kierunku `kat`, `skala` — piksele
        /// ekranu na jednostkę modelu. `lustro` −1 odbija dłoń w poprzek (kciuk po drugiej stronie).
        /// Wokół obrysu tli się czerwona łuna otchłani (`luna` — jej siła).
        /// </summary>
        public static bool rysujKlatkeDloni(IPlotno ctx, double sx, double sy, double kat, double skala, double zacisk, double lustro, double alfa, double luna = 1) =>
            rysujKlatke(ctx, Dlon3D.Otchlan, "zacisk", sx, sy, kat, skala, zacisk, lustro, alfa, luna > 0 ? Barwa.Rgba(200, 24, 12, 0.4 * luna) : (Barwa?)null);

        /// <summary>
        /// Klatka dłoni (ten sam kadr dla dłoni z otchłani i anielskiej — etap 4): nadgarstek w (sx, sy), palce w kierunku
        /// `kat`, `skala` — piksele na jednostkę modelu; `poswiata` — barwa blasku wokół obrysu (albo null).
        /// `klip` — animacja modelu („zacisk”, „rzut”, „tarcza”, „zawal”), `zacisk` — jej chwila 0..1 (w TS: klatka arkusza).
        /// </summary>
        public static bool rysujKlatke(IPlotno ctx, Dlon3D model, string klip, double sx, double sy, double kat, double skala, double zacisk, double lustro, double alfa, Barwa? poswiata)
        {
            // rozdzielczość klatki: tyle pikseli urządzenia na jednostkę modelu, ile wypadnie na ekranie
            var m = ctx.getTransform();
            var urz = Math.Sqrt(m.a * m.a + m.b * m.b);
            if (!(urz > 0)) urz = 1;
            var kl = model.Klatka(klip, zacisk, skala * urz);
            if (kl == null) return false;
            var s = skala / kl.pxNaJedn;
            double wx = -ARKUSZ.x0 * kl.pxNaJedn, wy = ARKUSZ.y1 * kl.pxNaJedn;   // nadgarstek w pikselach klatki
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.translate(sx, sy);
            ctx.rotate(kat);
            ctx.scale(s, s * lustro);
            // poświata wąska — szeroka zjadała kształt dłoni (z daleka czerwona smuga bez szponów)
            if (poswiata != null)
            {
                ctx.shadowColor = poswiata.Value;
                ctx.shadowBlur = Math.Max(4, skala * 0.4);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(kl.obraz, -wx, -wy);
            ctx.restore();
            return true;
        }

        // ---------------------------------------------------------------- łuna otchłani

        /// <summary>Czerwona łuna sącząca się z otchłani (spod brzegu) — szeroka, pulsuje jak oddech.</summary>
        public static void lunaOtchlani(IPlotno ctx, double x, double y, double r, double kat, double sila, double teraz, bool ruch = true)
        {
            if (sila <= 0.01 || r <= 1) return;
            var puls = ruch ? 0.84 + 0.12 * Math.Sin(teraz * 0.0037) + 0.05 * Math.Sin(teraz * 0.0131) : 0.9;
            var a = sila * puls;
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.translate(x, y);
            ctx.rotate(kat);
            ctx.scale(1, 0.62);                                    // spłaszczona wzdłuż brzegu
            var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            g.addColorStop(0, Barwa.Rgba(196, 34, 16, 0.62 * a));
            g.addColorStop(0.3, Barwa.Rgba(132, 16, 8, 0.42 * a));
            g.addColorStop(0.7, Barwa.Rgba(64, 4, 2, 0.18 * a));
            g.addColorStop(1, "rgba(30,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(-r, -r, r * 2, r * 2);
            ctx.restore();
        }

        /// <summary>
        /// Wyrwa w posadzce tam, gdzie dłoń z otchłani przebija się na wierzch (`bx, by` — brzeg w kaflach, `a` — jak bardzo
        /// otwarta): poszarpana dziura z żarem w głębi, pęknięcia po posadzce i odłamki wyrzucone w chwili przebicia (`t` tiki).
        /// </summary>
        static void wyrwa(IPlotno ctx, Camera cam, double bx, double by, double z, double a, double t, bool ruch)
        {
            if (a <= 0.01) return;
            double x = cam.toScreenX(bx), y = cam.toScreenY(by);
            double rx = z * (0.6 + 0.8 * a), ry = z * (0.18 + 0.12 * a);
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            // pęknięcia rozchodzą się po posadzce
            ctx.strokeStyle = Barwa.Rgba(14, 8, 6, 0.85 * a); ctx.lineWidth = Math.Max(1, z * 0.06);
            ctx.beginPath();
            for (int i = 0; i < 6; i++)
            {
                double s = i < 3 ? -1 : 1, dl = z * (0.9 + 0.5 * ((i * 7) % 3)) * a;
                double px = x + s * rx * 0.8, py = y;
                ctx.moveTo(px, py);
                for (int k = 1; k <= 3; k++) { px += s * dl / 3; py += (((i * 5 + k * 3) % 5) - 2) * z * 0.04; ctx.lineTo(px, py); }
            }
            ctx.stroke();
            // dziura: poszarpany brzeg, w głębi żar otchłani
            const int n = 12;
            ctx.beginPath();
            for (int i = 0; i < n; i++)
            {
                double kat = (i / (double)n) * Math.PI * 2, r = 0.78 + 0.22 * (((i * 7) % 5) / 4.0);
                ctx.lineTo(x + Math.Cos(kat) * rx * r, y + Math.Sin(kat) * ry * r);
            }
            ctx.closePath();
            var g = ctx.createRadialGradient(x, y + ry * 0.3, 0, x, y, rx);
            g.addColorStop(0, Barwa.Rgba(120, 18, 10, 0.95 * a)); g.addColorStop(0.6, Barwa.Rgba(30, 6, 4, 0.95 * a)); g.addColorStop(1, Barwa.Rgba(8, 4, 3, 0.95 * a));
            ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = Barwa.Rgba(170, 150, 126, 0.6 * a); ctx.lineWidth = Math.Max(1, z * 0.05); ctx.stroke();
            // odłamki wyrzucone przy przebiciu
            if (t < 90)
            {
                var u = t / 90;
                for (int i = 0; i < 9; i++)
                {
                    double kat = -Math.PI / 2 + (i - 4) * 0.28, v = z * (1.4 + (i % 3) * 0.5);
                    double px = x + Math.Cos(kat) * v * u * 1.3, py = y + Math.Sin(kat) * v * u * 1.3 + z * 3 * u * u;
                    var r = z * (0.08 + (i % 3) * 0.04);
                    ctx.save(); ctx.translate(px, py); ctx.rotate(ruch ? u * 6 + i : i);
                    ctx.fillStyle = Barwa.Rgba(110, 96, 82, 1 - u); ctx.strokeStyle = Barwa.Rgba(14, 8, 6, 1 - u); ctx.lineWidth = Math.Max(0.8, z * 0.03);
                    ctx.beginPath(); ctx.moveTo(-r, -r * 0.6); ctx.lineTo(r * 0.8, -r); ctx.lineTo(r, r * 0.5); ctx.lineTo(-r * 0.5, r); ctx.closePath(); ctx.fill(); ctx.stroke();
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        // ---------------------------------------------------------------- zabrani w pięści

        /// <summary>
        /// Zabrany w pięści: pas i nogi zakrywają palce, nad kłykciami widać tułów, głowę i ręce wyrzucone
        /// w górę. (x, y) — pas; `kat` obraca sylwetkę tak, żeby „w górę” było w stronę palców.
        /// </summary>
        static void wPiesci(IPlotno ctx, double x, double y, double hgt, double kat, double szarpanie, double alfa)
        {
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.translate(x, y);
            ctx.rotate(kat);
            ctx.lineCap = "round";
            var u = hgt / 10;
            void ramie(double s, double a)
            {
                double bx = s * u, by = -u * 4.4;
                double lx = bx + s * Math.Sin(a) * u * 2.2, ly = by - Math.Cos(a) * u * 2.2;
                double hx = lx + s * Math.Sin(a * 0.6) * u * 2, hy = ly - Math.Cos(a * 0.6) * u * 2;
                ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(lx, ly); ctx.lineTo(hx, hy);
            }
            double a1 = 0.55 + 0.35 * Math.Sin(szarpanie), a2 = 0.4 + 0.4 * Math.Sin(szarpanie * 1.3 + 1.7);
            foreach (var (kolor, grub) in new[] { ("rgba(214,190,150,0.5)", 1.1), ("rgba(28,20,16,0.96)", 0.8) })
            {
                ctx.strokeStyle = kolor; ctx.lineWidth = u * grub;
                ramie(-1, a1); ctx.stroke();
                ramie(1, a2); ctx.stroke();
            }
            ctx.fillStyle = "rgba(28,20,16,0.96)";
            ctx.strokeStyle = "rgba(214,190,150,0.5)"; ctx.lineWidth = Math.Max(0.8, u * 0.25);
            ctx.beginPath(); ctx.ellipse(0, -u * 2.4, u * 1.3, u * 2.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(Math.Sin(szarpanie * 0.7) * u * 0.3, -u * 6.1, u * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        // ---------------------------------------------------------------- warstwa (to, co pod brzegiem, tonie w ciemności)

        static IPlotno? warstwa;
        /// <summary>Pomocnicze płótno w pikselach urządzenia — tam dłoń dostaje maskę otchłani i czerwone podświetlenie.</summary>
        internal static IPlotno dajWarstwe(ref IPlotno? warstwa, int pw, int ph)
        {
            warstwa ??= Plotno.Nowe(Math.Max(1, pw), Math.Max(1, ph));
            if (warstwa.width < pw || warstwa.height < ph)
            {
                // (kolejno, jak w TS: szerokość już po zmianie wchodzi do drugiego porównania — tu bez znaczenia)
                int nw = Math.Max(warstwa.width, pw), nh = Math.Max(warstwa.height, ph);
                warstwa.width = nw;
                warstwa.height = nh;
            }
            var g = warstwa;
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalAlpha = 1;
            g.globalCompositeOperation = "source-over";
            g.clearRect(0, 0, pw, ph);
            return g;
        }

        // ---------------------------------------------------------------- całość

        public static void rysujDlon(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var d = sim.lud.dlon;
            if (!DLON.wlaczona || d == null || d.faza == "brak") return;
            var z = cam.zoom;
            var t = sim.tick - d.od;
            var ruch = !ustawienia.ograniczRuch;

            // oś: z głębi otchłani pod ofiarą (O) w górę, do miejsca chwytu (C)
            double dx = d.cx - d.ox, dy = d.cy - d.oy;
            var dl = Math.Sqrt(dx * dx + dy * dy);
            if (dl == 0) dl = 1;
            dx /= dl; dy /= dl;
            double lustro = dx < 0 ? -1 : 1;
            var k = KAFLE_NA_JEDN * DLON.wielkosc;             // kafle świata na jednostkę modelu
            // punkt modelu (x w stronę palców, y w stronę grzbietu dłoni) → świat
            (double x, double y) doSwiata(double wx, double wy, double mx, double my) =>
                (wx + (mx * dx + my * lustro * dy) * k, wy + (mx * dy - my * lustro * dx) * k);
            (double x, double y) naOsi(double s) => (d.ox + dx * s, d.oy + dy * s);
            double sOsi((double x, double y) p) => (p.x - d.ox) * dx + (p.y - d.oy) * dy;
            // etap 4: po linę — szpony stają obok niej (od strony, z której dłoń wyszła) i przejeżdżają w poprzek
            var lina = d.cel == "lina";
            double bok = Math.Sign(d.bx - d.cx);
            if (bok == 0) bok = 1;
            const double CIECIE_obok = 1.6, CIECIE_dalej = 1.3, CIECIE_nizej = 0.35;
            // gdzie musi być nadgarstek, żeby miejsce chwytu (przy danym zacisku) wypadło na ofiarach (albo w punkcie `tx, ty`)
            (double x, double y) nadgarstekNaCelu(double zac, double? tx0 = null, double? ty0 = null)
            {
                var tx = tx0 ?? (lina ? d.cx + bok * CIECIE_obok : d.cx);
                var ty = ty0 ?? (lina ? d.cy + CIECIE_nizej : d.cy);
                var g = chwyt(zac);
                var p = doSwiata(0, 0, g.x, g.y);
                return (tx - p.x, ty - p.y);
            }

            // brzeg otchłani na osi; dłoń „wysunięta o przes” = nadgarstek tyle kafli poniżej chwytu
            var sBrzeg = sOsi((d.bx, d.by));
            var cel = nadgarstekNaCelu(0);
            var sSzponow = sOsi(cel) + ZASIEG_SZPONOW * k;      // gdzie są szpony w chwili chwytu
            (double x, double y) nizej(double przes) => (cel.x - dx * przes, cel.y - dy * przes);
            var przesDno = sSzponow - (sBrzeg - 3);             // szpony głęboko pod brzegiem
            var przesWych = Math.Max(1.5, sSzponow - Math.Min(sBrzeg + 1.5, dl - 2.2));   // szpony tuż nad brzegiem
            var przesStart = Math.Max(przesDno, przesWych + 4);
            var glebia = nizej(przesStart + 6);
            // Wysokość dłoni: 0..1 — wznosi się z głębi, 1..2 — sięga po ofiary.
            (double x, double y) polozenie(double u) => u <= 1
                ? nizej(przesStart + (przesWych - przesStart) * gladko(u))
                : nizej(przesWych * (1 - gladko(u - 1)));
            (double x, double y) mix((double x, double y) a, (double x, double y) b, double u) => (a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);

            // łuna otchłani pod ofiarą: rozpala się, gdy dłoń rusza z głębi, gaśnie, gdy się w niej skryje
            double sila = 1;
            if (d.faza == "wstaje") sila = gladko(t / 110);
            else if (d.faza == "chwyta") sila = 1 + 0.35 * Math.Sin(Math.Min(1, t / DLON.chwyta) * Math.PI);
            else if (d.faza == "cofa") sila = 1 - 0.45 * gladko(t / DLON.cofa);
            else if (d.faza == "gasnie") sila = 0.55 * (1 - gladko(t / DLON.gasnie));
            var katOsi = Math.Atan2(dy, dx);
            var zrodlo = naOsi(sBrzeg - 1.2);
            lunaOtchlani(ctx, cam.toScreenX(zrodlo.x), cam.toScreenY(zrodlo.y), DLON.lunaPromien * z, katOsi + Math.PI / 2, sila, teraz, ruch);
            // dłoń przebija posadzkę: wyrwa, pęknięcia i odłamki (dawniej wyrastała z litej podłogi bez śladu)
            wyrwa(ctx, cam, d.bx, d.by, z, Math.Min(1, sila), d.faza == "wstaje" ? t : 1e9, ruch);

            // nadgarstek: z głębi pod brzegiem w górę do miejsca chwytu i z powrotem w dół
            (double x, double y) w; double zacisk = 0, alfa = 1;
            // palce drgają, gdy dłoń się zbliża — jak u kogoś, kto już czuje zdobycz
            var drganie = ruch ? 0.06 + 0.05 * Math.Sin(teraz * 0.011) : 0.06;
            var odpedzona = d.odpedzona == true;
            if (d.faza == "wstaje")
            {
                w = polozenie(t / DLON.wstaje);
                // wznosi się zrywami, jak coś ciężkiego, co pnie się przez skałę
                if (ruch) { var zryw = 0.18 * Math.Sin(t * 0.045) * (1 - t / DLON.wstaje); w = (w.x + dx * zryw, w.y + dy * zryw); }
                zacisk = drganie;
                alfa = gladko(t / 50);
            }
            else if (d.faza == "siega")
            {
                var u = t / DLON.siega;
                w = polozenie(1 + u);
                zacisk = drganie * (1 - gladko(u));
            }
            else if (d.faza == "chwyta" && lina)
            {
                // zamach: szpony nabierają rozpędu i dokładnie z końcem fazy przecinają linę (wtedy symulacja ją tnie)
                var u = Math.Min(1, t / DLON.chwyta);
                var kk = u * u;
                zacisk = 0.12 + 0.18 * Math.Sin(u * Math.PI * 0.5);
                w = nadgarstekNaCelu(zacisk, d.cx + bok * CIECIE_obok * (1 - kk), d.cy + CIECIE_nizej - 0.25 * Math.Sin(u * Math.PI));
            }
            else if (d.faza == "chwyta")
            {
                zacisk = gladko(t / (DLON.chwyta * 0.85));
                w = nadgarstekNaCelu(zacisk);                      // pięść zamyka się na nich, nie obok
            }
            else if (d.faza == "cofa" && lina && !odpedzona)
            {
                // szpony przejeżdżają dalej, za linę, i dłoń — wciąż otwarta — zapada się w podłogę
                var u = gladko(t / DLON.cofa);
                var dalej = gladko(t / 45);
                var start = nadgarstekNaCelu(0.3, d.cx - bok * CIECIE_dalej * dalej, d.cy + CIECIE_nizej + 0.3 * dalej);
                zacisk = 0.3 - 0.2 * u;
                w = mix(start, glebia, gladko((t - 40) / (DLON.cofa - 40)));
                alfa = 1 - gladko((u - 0.6) / 0.4);
            }
            else if (d.faza == "cofa")
            {
                var u = gladko(t / DLON.cofa);
                var start = odpedzona ? polozenie(d.odpedzonaU ?? 1) : nadgarstekNaCelu(1);
                zacisk = odpedzona ? 0.1 + 0.3 * u : 1;          // odepchnięta kurczy palce, jak oparzona
                w = mix(start, glebia, u);
                alfa = 1 - gladko((u - 0.6) / 0.4);
            }
            else return;
            if (alfa <= 0.01) return;

            var katD = katOsi + (ruch ? Math.Sin(teraz * 0.0045) * 0.025 : 0);
            var skala = z * k;
            double sx = cam.toScreenX(w.x), sy = cam.toScreenY(w.y);

            // co rysujemy: zabranych za pięścią (głowy i ręce nad kłykciami), potem dłoń
            void rysuj(IPlotno g)
            {
                if (d.faza == "cofa" && d.zabrani.Count > 0)
                {
                    var hgt = Math.Max(16, z * 1.9 * ustawienia.wielkoscSylwetek) * 0.9;
                    var katPostaci = Math.Atan2(dx, -dy);
                    for (int i = 0; i < d.zabrani.Count; i++)
                    {
                        var o = (i - (d.zabrani.Count - 1) / 2.0) * 4.2;
                        var p = doSwiata(w.x, w.y, 12.4, -2 + o);
                        wPiesci(g, cam.toScreenX(p.x), cam.toScreenY(p.y), hgt, katPostaci + (ruch ? Math.Sin(teraz * 0.004 + i * 2) * 0.12 : 0), ruch ? teraz * 0.012 + i * 2.3 : 0, 1);
                    }
                }
                rysujKlatkeDloni(g, sx, sy, katD, skala, zacisk, lustro, 1, Math.Min(1, sila));
            }

            // prostokąt klatki na ekranie (z zapasem na łunę wokół obrysu)
            var zapas = Math.Max(6, skala * 0.9) * 2 + 4;
            double x0 = double.PositiveInfinity, y0 = double.PositiveInfinity, x1 = double.NegativeInfinity, y1 = double.NegativeInfinity;
            double jx1 = ARKUSZ.x0 + ARKUSZ.szer / ARKUSZ.pxNaJedn, jy0 = ARKUSZ.y1 - ARKUSZ.wys / ARKUSZ.pxNaJedn;
            foreach (var (mx, my) in new[] { (ARKUSZ.x0, ARKUSZ.y1), (jx1, ARKUSZ.y1), (ARKUSZ.x0, jy0), (jx1, jy0) })
            {
                var p = doSwiata(w.x, w.y, mx, my);
                double px = cam.toScreenX(p.x), py = cam.toScreenY(p.y);
                x0 = Math.Min(x0, px); y0 = Math.Min(y0, py); x1 = Math.Max(x1, px); y1 = Math.Max(y1, py);
            }
            x0 = Math.Floor(x0 - zapas); y0 = Math.Floor(y0 - zapas); x1 = Math.Ceiling(x1 + zapas); y1 = Math.Ceiling(y1 + zapas);
            var m = ctx.getTransform();
            var sc = Math.Sqrt(m.a * m.a + m.b * m.b);
            if (!(sc > 0)) sc = 1;
            sc = Math.Min(sc, 2048 / Math.Max(1, Math.Max(x1 - x0, y1 - y0)));
            int pw = (int)Math.Ceiling((x1 - x0) * sc), ph = (int)Math.Ceiling((y1 - y0) * sc);
            var gw = dajWarstwe(ref warstwa, pw, ph);
            gw.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
            rysuj(gw);
            // pod brzegiem otchłani dłoń tonie w ciemności…
            (double x, double y) ekr((double x, double y) p) => (cam.toScreenX(p.x), cam.toScreenY(p.y));
            var a = ekr(naOsi(sBrzeg - 3.5)); var b = ekr(naOsi(sBrzeg + 0.4));
            gw.globalCompositeOperation = "destination-out";
            var ciemno = gw.createLinearGradient(a.x, a.y, b.x, b.y);
            ciemno.addColorStop(0, "rgba(0,0,0,0.9)");
            ciemno.addColorStop(0.55, "rgba(0,0,0,0.55)");
            ciemno.addColorStop(1, "rgba(0,0,0,0)");
            gw.fillStyle = ciemno;
            gw.fillRect(x0, y0, x1 - x0, y1 - y0);
            // …a od brzegu bije na nią czerwień otchłani
            gw.globalCompositeOperation = "source-atop";
            var c1 = ekr(naOsi(sBrzeg - 1)); var c2 = ekr(naOsi(sBrzeg + 4));
            var czerwien = gw.createLinearGradient(c1.x, c1.y, c2.x, c2.y);
            czerwien.addColorStop(0, Barwa.Rgba(150, 18, 8, 0.36 * Math.Min(1, sila)));
            czerwien.addColorStop(1, "rgba(150,18,8,0)");
            gw.fillStyle = czerwien;
            gw.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.drawImage(gw, 0, 0, pw, ph, x0, y0, pw / sc, ph / sc);
            ctx.restore();
            // etap 4: trzy smugi pazurów w poprzek liny — w chwili cięcia błyskają i gasną
            if (lina && d.faza == "cofa" && !odpedzona && t < 70) smugiPazurow(ctx, cam.toScreenX(d.cx), cam.toScreenY(d.cy + CIECIE_nizej * 0.5), z, bok, t / 70);
        }

        /// <summary>Trzy równoległe smugi pazurów (w poprzek liny, od strony `bok`), `u` 0..1 — od błysku do zgaśnięcia.</summary>
        static void smugiPazurow(IPlotno ctx, double x, double y, double z, double bok, double u)
        {
            var a = 1 - gladko(u);
            double dl = z * 1.6, wys = z * 0.32;
            ctx.save();
            ctx.lineCap = "round";
            ctx.globalCompositeOperation = "lighter";
            for (int i = -1; i <= 1; i++)
            {
                var oy = i * z * 0.28;
                double x1 = x + bok * dl * 0.55, x2 = x - bok * dl * 0.55;
                // smuga: łuk lekko w dół, gruba w środku — najpierw czerwona poświata, potem biały ślad szponu
                foreach (var (kolor, gr) in new[] { (Barwa.Rgba(255, 60, 30, 0.55 * a), Math.Max(2, z * 0.16)), (Barwa.Rgba(255, 236, 214, 0.95 * a), Math.Max(1, z * 0.05)) })
                {
                    ctx.strokeStyle = kolor; ctx.lineWidth = gr;
                    ctx.beginPath(); ctx.moveTo(x1, y + oy - wys * 0.6); ctx.quadraticCurveTo(x, y + oy + wys * 0.4, x2, y + oy - wys * 0.1); ctx.stroke();
                }
            }
            ctx.restore();
        }
    }
}
