// Port: krag-3-beta/src/render/ludzik.ts (pozy, kałuża i bryzg krwi) i zarlok-sprite.ts (składanie z obrazków) —
// ŻARŁOK, potępiony do scen z Cerberem (zabijanie na kręgu, szczątki w błocie, film): nagi, obrzmiały, oblepiony
// błotem człowiek ze stawami — da się go położyć, wlec, trzymać w paszczy, rozerwać i zjeść. Części ciała
// wypieczono z modelu 3D (dane/grafika/krag/zarlok/*.webp, położenia w dane.json), gra składa je na stawach.
// Układ: biodro w (0, 0), y w górę ujemne, wzrost stojącego `h` (piksele), twarzą w prawo (+x). Kąty kończyn są
// bezwzględne: 0 — w dół, dodatnie — do przodu (ku +x). W C# obrazki są zawsze wczytane, więc dawny rysunek 2D
// z ludzik.ts (zastępczy w TS) nie jest przeniesiony.
using System;
using System.Collections.Generic;
using System.Text;
using Trzewia.Plotna;
using Trzewia.Rdzen;

namespace Trzewia.Rysunek
{
    /// <summary>Poza żarłoka (render/ludzik.ts: PozaLudzika).</summary>
    public struct PozaLudzika
    {
        /// <summary>pochylenie tułowia od pionu (0 — prosto, π/2 — leży twarzą w prawo, −π/2 — na plecach w lewo)</summary>
        public double tulow;
        /// <summary>głowa względem tułowia</summary>
        public double glowa;
        /// <summary>ramiona i łokcie (bezwzględnie / zgięcie) — L dalsza, P bliższa</summary>
        public double ramieL, lokiecL, ramieP, lokiecP;
        /// <summary>uda i kolana</summary>
        public double udoL, kolanoL, udoP, kolanoP;
        /// <summary>otwarte usta 0…1 (krzyk), brzuch 0…1 (obżarstwo)</summary>
        public double usta, brzuch;
        /// <summary>błoto 0…1, krew 0…1 (rany, zachlapanie)</summary>
        public double bloto, krew;
        /// <summary>odcięte kończyny i głowa; polowa: "gora" — tylko od pasa w górę, "dol" — tylko nogi i miednica</summary>
        public bool bezRekiL, bezRekiP, bezNogiL, bezNogiP, bezGlowy, trzewia;
        public string? polowa;
    }

    /// <summary>Punkty ciała żarłoka (do przyczepiania: paszcza trzyma za tułów, łapa przygniata).</summary>
    public struct PunktyLudzika
    {
        public (double x, double y) glowa, kark, dlonL, dlonP, stopaL, stopaP, pas;
        /// <summary>Oprawa (etap 7c): kolana — najniższy punkt klęczącego.</summary>
        public (double x, double y) kolL, kolP;
        /// <summary>Jak nisko pod biodrem sięga najniższa stopa albo kolano (piksele, w dół dodatnie) — tyle biodro nad ziemią.</summary>
        public double Dno => Math.Max(Math.Max(stopaL.y, stopaP.y), Math.Max(kolL.y, kolP.y));
    }

    public static class Ludzik
    {
        public static PozaLudzika pozaStoi() => new PozaLudzika
        {
            tulow = 0.08, glowa = 0.05, ramieL = -0.1, lokiecL = 0.3, ramieP = 0.1, lokiecP = 0.3,
            udoL = -0.05, kolanoL = 0.05, udoP = 0.05, kolanoP = 0.05, usta = 0, brzuch = 0.7, bloto = 0.6, krew = 0,
        };

        // ------------------------------------------------------------- obrazki części (dane/grafika/krag/zarlok)

        sealed class Czesc
        {
            public double x0, y0, S, w, h;
            public IObraz? img;
            public readonly List<IZrodloObrazu> mip = new List<IZrodloObrazu>();
            public readonly List<(int w, int h)> wym = new List<(int, int)>();
        }
        static Dictionary<string, Czesc>? czesci;

        static Dictionary<string, Czesc> Czesci()
        {
            if (czesci != null) return czesci;
            czesci = new Dictionary<string, Czesc>();
            var bajty = Zasoby.Czytaj("grafika/krag/zarlok/dane.json");
            if (bajty == null || !(Json.Czytaj(Encoding.UTF8.GetString(bajty)) is Dictionary<string, object?> o)) return czesci;
            foreach (var kv in o)
            {
                if (!(kv.Value is Dictionary<string, object?> d)) continue;
                double L(string k) => d.TryGetValue(k, out var v) && v is double x ? x : 0;
                var c = new Czesc { x0 = L("x0"), y0 = L("y0"), S = L("S"), w = L("w"), h = L("h") };
                if (c.S <= 0) continue;
                c.img = Plotno.Wczytaj("grafika/krag/zarlok/" + kv.Key + ".webp");
                if (!c.img.complete) continue;
                c.mip.Add(c.img); c.wym.Add((c.img.width, c.img.height));
                czesci[kv.Key] = c;
            }
            return czesci;
        }

        /// <summary>Czy obrazki żarłoka są w danych gry.</summary>
        public static bool Gotowy() => Czesci().Count > 0;

        static IZrodloObrazu poziom(Czesc o, double f)
        {
            int n = 0;
            while (f * (1 << n) < 0.55 && n < 6) n++;
            while (o.mip.Count <= n)
            {
                var (w0, h0) = o.wym[o.wym.Count - 1];
                int w = Math.Max(1, (int)Math.Round(w0 / 2.0, MidpointRounding.AwayFromZero)), h = Math.Max(1, (int)Math.Round(h0 / 2.0, MidpointRounding.AwayFromZero));
                var c = Plotno.Nowe(w, h);
                c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
                c.drawImage(o.mip[o.mip.Count - 1], 0, 0, w, h);
                o.mip.Add(c); o.wym.Add((w, h));
            }
            return o.mip[Math.Min(n, o.mip.Count - 1)];
        }

        /// <summary>Część w punkcie `a`, obrócona o `kat` (0 — tak, jak wypieczona); `h` — wzrost w pikselach.</summary>
        static void czesc(IPlotno ctx, string nazwa, double h, (double x, double y) a, double kat)
        {
            if (!Czesci().TryGetValue(nazwa, out var k)) return;
            ctx.save();
            ctx.translate(a.x, a.y);
            if (kat != 0) ctx.rotate(kat);
            ctx.drawImage(poziom(k, h / k.S), k.x0 * h, k.y0 * h, (k.w / k.S) * h, (k.h / k.S) * h);
            ctx.restore();
        }

        static (double x, double y) od((double x, double y) a, double kat, double dl) => (a.x + Math.Sin(kat) * dl, a.y + Math.Cos(kat) * dl);

        // nazwy części: [dalsza][krew]
        static readonly string[,] PRZEDRAMIE = { { "zarlok-przedramie", "zarlok-przedramie-k" }, { "zarlok-przedramie-d", "zarlok-przedramie-d-k" } };
        static readonly string[,] RAMIE = { { "zarlok-ramie", "zarlok-ramie-k" }, { "zarlok-ramie-d", "zarlok-ramie-d-k" } };
        static readonly string[,] PODUDZIE = { { "zarlok-podudzie", "zarlok-podudzie-k" }, { "zarlok-podudzie-d", "zarlok-podudzie-d-k" } };
        static readonly string[,] UDO = { { "zarlok-udo", "zarlok-udo-k" }, { "zarlok-udo-d", "zarlok-udo-d-k" } };
        static readonly string[,] GLOWA = { { "zarlok-glowa-u0", "zarlok-glowa-u0-k" }, { "zarlok-glowa-u1", "zarlok-glowa-u1-k" }, { "zarlok-glowa-u2", "zarlok-glowa-u2-k" } };

        /// <summary>
        /// Oprawa (etap 7c): punkty ciała w pozie bez rysowania (biodro w (0, 0), wzrost `h`) — gdzie dłonie (ochłap
        /// trzymany w rękach), stopy i kolana (postać stoi na ziemi, nie wisi nad nią). Te same stawy co rysujLudzika.
        /// </summary>
        public static PunktyLudzika punkty(double h, PozaLudzika p)
        {
            (double x, double y) biodro = (0, 0);
            var tulKat = Math.PI - p.tulow;
            var kark = od(biodro, tulKat, h * 0.34);
            (double x, double y) barkL = (kark.x - Math.Cos(p.tulow) * h * 0.03, kark.y + h * 0.02);
            (double x, double y) barkP = (kark.x + Math.Cos(p.tulow) * h * 0.03, kark.y + h * 0.02);
            var lokL = od(barkL, p.ramieL, h * 0.17); var dlonL = od(lokL, p.ramieL + p.lokiecL, h * 0.16);
            var lokP = od(barkP, p.ramieP, h * 0.17); var dlonP = od(lokP, p.ramieP + p.lokiecP, h * 0.16);
            var kolL = od(biodro, p.udoL, h * 0.25); var stopaL = od(kolL, p.udoL - p.kolanoL, h * 0.25);
            var kolP = od(biodro, p.udoP, h * 0.25); var stopaP = od(kolP, p.udoP - p.kolanoP, h * 0.25);
            var glowaS = od(kark, tulKat - p.glowa, h * 0.1);
            return new PunktyLudzika { glowa = glowaS, kark = kark, dlonL = dlonL, dlonP = dlonP, stopaL = stopaL, stopaP = stopaP, kolL = kolL, kolP = kolP, pas = ((biodro.x + kark.x) / 2, (biodro.y + kark.y) / 2) };
        }

        /// <summary>Rysuje żarłoka z obrazków (biodro w (0, 0), wzrost `h`); zwraca punkty ciała.</summary>
        public static PunktyLudzika rysujLudzika(IPlotno ctx, double h, PozaLudzika p)
        {
            bool gora = p.polowa != "dol", dol = p.polowa != "gora";
            var k = p.krew > 0.4 ? 1 : 0;
            (double x, double y) biodro = (0, 0);
            var tulKat = Math.PI - p.tulow;
            var kark = od(biodro, tulKat, h * 0.34);
            (double x, double y) barkL = (kark.x - Math.Cos(p.tulow) * h * 0.03, kark.y + h * 0.02);
            (double x, double y) barkP = (kark.x + Math.Cos(p.tulow) * h * 0.03, kark.y + h * 0.02);
            var lokL = od(barkL, p.ramieL, h * 0.17); var dlonL = od(lokL, p.ramieL + p.lokiecL, h * 0.16);
            var lokP = od(barkP, p.ramieP, h * 0.17); var dlonP = od(lokP, p.ramieP + p.lokiecP, h * 0.16);
            var kolL = od(biodro, p.udoL, h * 0.25); var stopaL = od(kolL, p.udoL - p.kolanoL, h * 0.25);
            var kolP = od(biodro, p.udoP, h * 0.25); var stopaP = od(kolP, p.udoP - p.kolanoP, h * 0.25);
            var glowaS = od(kark, tulKat - p.glowa, h * 0.1);
            // stawy chowają się pod rodzicem: najpierw przedramię i podudzie, na nich ramię i udo, a tułów zakrywa nasady
            // ud i dalszego ramienia — bez „kulek” w stawach jak u manekina
            void reka((double x, double y) bark, (double x, double y) lok, double ramie, double lokiec, int d, bool bez)
            {
                if (bez) { czesc(ctx, "zarlok-kikut-reki", h, bark, -ramie); return; }
                czesc(ctx, PRZEDRAMIE[d, k], h, lok, -(ramie + lokiec));
                czesc(ctx, RAMIE[d, k], h, bark, -ramie);
            }
            void noga((double x, double y) kol, double udo, double kolano, int d, bool bez)
            {
                if (bez) { czesc(ctx, "zarlok-kikut-nogi", h, biodro, -udo); return; }
                czesc(ctx, PODUDZIE[d, k], h, kol, -(udo - kolano));
                czesc(ctx, UDO[d, k], h, biodro, -udo);
            }
            // dalsza ręka, obie nogi (bliższa przed dalszą), tułów na nasadach ud, głowa, bliższa ręka na wierzchu
            if (gora) reka(barkL, lokL, p.ramieL, p.lokiecL, 1, p.bezRekiL);
            if (dol) noga(kolL, p.udoL, p.kolanoL, 1, p.bezNogiL);
            if (dol) noga(kolP, p.udoP, p.kolanoP, 0, p.bezNogiP);
            // tułów (cały, rozpruty, górna albo dolna połowa po rozerwaniu)
            var tulow = p.polowa == "gora" ? "zarlok-tulow-gora" : p.polowa == "dol" ? "zarlok-tulow-dol" : p.trzewia ? "zarlok-tulow-rozpruty" : k == 1 ? "zarlok-tulow-k" : "zarlok-tulow";
            czesc(ctx, tulow, h, biodro, p.tulow);
            // głowa (usta: zamknięte, otwarte, krzyk) albo kikut szyi
            if (gora && !p.bezGlowy) czesc(ctx, GLOWA[p.usta > 0.7 ? 2 : p.usta > 0.25 ? 1 : 0, k], h, kark, p.tulow + p.glowa);
            else if (gora) czesc(ctx, "zarlok-kikut-nogi", h, kark, p.tulow + Math.PI);
            // bliższa ręka
            if (gora) reka(barkP, lokP, p.ramieP, p.lokiecP, 0, p.bezRekiP);
            return new PunktyLudzika { glowa = glowaS, kark = kark, dlonL = dlonL, dlonP = dlonP, stopaL = stopaL, stopaP = stopaP, kolL = kolL, kolP = kolP, pas = ((biodro.x + kark.x) / 2, (biodro.y + kark.y) / 2) };
        }

        /// <summary>Oderwana głowa (szczątki): kikut szyi w (0, 0), `kat` — obrót.</summary>
        public static void rysujOderwanaGlowe(IPlotno ctx, double h, double kat) => czesc(ctx, "zarlok-glowa-oderwana", h, (0, 0), kat);

        /// <summary>Kupa trzewi na ziemi (szczątki), środek w (0, 0).</summary>
        public static void rysujTrzewia(IPlotno ctx, double h, double kat = 0) => czesc(ctx, "zarlok-trzewia", h, (0, 0), kat);

        /// <summary>Oderwana ręka (szczątki): poszarpany bark w (0, 0), ręka w kierunku `kat` (0 — w dół), zgięta w łokciu.</summary>
        public static void rysujOderwanaReke(IPlotno ctx, double h, double kat, double zgiecie = 0.5)
        {
            (double x, double y) lok = (-Math.Sin(kat) * h * 0.17, Math.Cos(kat) * h * 0.17);
            czesc(ctx, "zarlok-ramie-k", h, (0, 0), kat);
            czesc(ctx, "zarlok-przedramie-k", h, lok, kat + zgiecie);
            czesc(ctx, "zarlok-kikut-reki", h, (0, 0), kat + Math.PI);
        }

        /// <summary>Dowolna wypieczona część żarłoka po nazwie (np. zbliżenie głowy do filmu).</summary>
        public static void rysujCzescZarloka(IPlotno ctx, string nazwa, double h, (double x, double y) a, double kat) => czesc(ctx, nazwa, h, a, kat);

        // ---------------------------------------------------------------- pozy w czasie

        /// <summary>Leży twarzą w błocie, drga; `t` — sekundy.</summary>
        public static PozaLudzika pozaLezy(double t, double z = 0)
        {
            var d = Math.Sin(t * 1.3 + z) * 0.08;
            var p = pozaStoi();
            p.tulow = Math.PI / 2 + 0.05; p.glowa = -0.2 + d; p.ramieL = Math.PI / 2 + 0.25; p.lokiecL = 0.25; p.ramieP = Math.PI / 2 - 0.25 + d; p.lokiecP = 0.55;
            p.udoL = -Math.PI / 2 + 0.1; p.kolanoL = -0.2; p.udoP = -Math.PI / 2 + 0.25; p.kolanoP = -0.5 + d; p.bloto = 1;
            return p;
        }
        /// <summary>Czołga się (ucieka), `t` — sekundy, `v` — tempo.</summary>
        public static PozaLudzika pozaCzolga(double t, double v = 1, double z = 0)
        {
            var f = t * 5 * v + z;
            var p = pozaStoi();
            p.tulow = Math.PI / 2 - 0.25; p.glowa = -0.5; p.ramieL = Math.PI / 2 + 0.6 + Math.Sin(f) * 0.6; p.lokiecL = -0.6; p.ramieP = Math.PI / 2 + 0.6 - Math.Sin(f) * 0.6; p.lokiecP = -0.6;
            p.udoL = -1.0 + Math.Sin(f) * 0.4; p.kolanoL = -1.2; p.udoP = -1.0 - Math.Sin(f) * 0.4; p.kolanoP = -1.2; p.usta = 0.6 + 0.4 * Math.Abs(Math.Sin(f * 0.7)); p.bloto = 1;
            return p;
        }
        /// <summary>Klęczy i wyje w deszcz.</summary>
        // (oprawa, etap 7c: klęczy naprawdę — podudzia leżą w błocie za kolanami; dawniej uda szły poziomo przed siebie,
        // a podudzia pionowo w dół, jak u kogoś, kto siedzi na niewidzialnym krześle)
        public static PozaLudzika pozaWyje(double t, double z = 0)
        {
            var k = Math.Sin(t * 0.9 + z) * 0.1;
            var p = pozaStoi();
            p.tulow = -0.2 + k; p.glowa = -0.6; p.ramieL = -0.4; p.lokiecL = 0.2; p.ramieP = 0.5 + k; p.lokiecP = 0.6;
            p.udoL = 0.9; p.kolanoL = 2.4; p.udoP = 0.75; p.kolanoP = 2.3; p.usta = 0.8 + 0.2 * Math.Sin(t * 3 + z); p.bloto = 1;
            return p;
        }
        /// <summary>Siedzi w błocie i żre (ręka do ust).</summary>
        // (oprawa, etap 7c: siedzi na ziemi z kolanami w górze — dawniej na niewidzialnym krześle)
        public static PozaLudzika pozaZre(double t, double z = 0)
        {
            var r = (Math.Sin(t * 2.5 + z) + 1) / 2;
            var p = pozaStoi();
            p.tulow = 0.35; p.glowa = 0.3; p.ramieP = 1.6 - r * 0.6; p.lokiecP = 1.6 + r * 0.8; p.ramieL = 0.9; p.lokiecL = 0.7;
            p.udoL = 1.9; p.kolanoL = 2.6; p.udoP = 1.7; p.kolanoP = 2.3; p.usta = r; p.bloto = 1;
            return p;
        }
        /// <summary>Bije się / sięga po ochłap (zamach ręką).</summary>
        public static PozaLudzika pozaSzarpie(double t, double z = 0)
        {
            var f = Math.Sin(t * 6 + z);
            var p = pozaStoi();
            p.tulow = 0.6; p.glowa = -0.1; p.ramieP = 1.8 + f * 0.6; p.lokiecP = 0.3; p.ramieL = 1.2 - f * 0.5; p.lokiecL = 0.5;
            p.udoL = 1.2; p.kolanoL = 1.6; p.udoP = 0.6; p.kolanoP = 1.2; p.usta = 0.6 + 0.4 * Math.Abs(f); p.bloto = 1;
            return p;
        }
        /// <summary>Trzymany w paszczy za tułów: zwisa, kończyny młócą (`moc` 0…1 — szarpanie), `t` — sekundy.</summary>
        public static PozaLudzika pozaWPaszczy(double t, double moc = 1)
        {
            var f = t * 14;
            var p = pozaStoi();
            p.tulow = Math.PI / 2 + Math.Sin(t * 9) * 0.5 * moc; p.glowa = -0.6 + Math.Sin(f) * 0.4 * moc;
            p.ramieL = 0.4 + Math.Sin(f) * 1.0 * moc; p.lokiecL = 0.6; p.ramieP = -0.3 + Math.Sin(f + 1) * 1.1 * moc; p.lokiecP = 0.8;
            p.udoL = Math.Sin(f + 2) * 0.9 * moc; p.kolanoL = 0.4; p.udoP = Math.Sin(f + 3) * 0.9 * moc; p.kolanoP = 0.6;
            p.usta = 0.9 * moc; p.bloto = 0.8; p.krew = 0.7;
            return p;
        }
        /// <summary>Bezwładny trup (po zabiciu).</summary>
        public static PozaLudzika pozaTrup(double z = 0)
        {
            var p = pozaStoi();
            p.tulow = Math.PI / 2 + 0.3; p.glowa = 0.6; p.ramieL = 2.4; p.lokiecL = 0.2; p.ramieP = -0.4 + z * 0.1; p.lokiecP = 0.1;
            p.udoL = -1.2; p.kolanoL = 0.1; p.udoP = -1.6; p.kolanoP = -0.3; p.usta = 0.7; p.bloto = 1; p.krew = 1;
            return p;
        }
        /// <summary>Wstaje z błota (`k` 0…1: z leżenia na kolana i do stania).</summary>
        public static PozaLudzika pozaWstaje(double k)
        {
            var a = pozaLezy(0); var b = pozaStoi();
            double m(double x, double y) => x + (y - x) * k;
            b.tulow = m(a.tulow, b.tulow); b.glowa = m(a.glowa, b.glowa); b.ramieL = m(a.ramieL, 0.4); b.lokiecL = m(a.lokiecL, 0.5); b.ramieP = m(a.ramieP, 0.6); b.lokiecP = m(a.lokiecP, 0.4);
            b.udoL = m(a.udoL, -0.05); b.kolanoL = m(a.kolanoL, 0.05); b.udoP = m(a.udoP, 0.4 * (1 - k)); b.kolanoP = m(a.kolanoP, 0.05); b.bloto = 1;
            return b;
        }
        /// <summary>Błąka się: zgarbiony, ciężki krok, ręce zwisają.</summary>
        public static PozaLudzika pozaIdzie(double t, double z = 0)
        {
            var f = t * 4 + z;
            var p = pozaStoi();
            p.tulow = 0.35; p.glowa = 0.3; p.ramieL = -0.2 - Math.Sin(f) * 0.35; p.lokiecL = 0.3; p.ramieP = 0.1 + Math.Sin(f) * 0.35; p.lokiecP = 0.3;
            p.udoL = Math.Sin(f) * 0.45; p.kolanoL = 0.15 + Math.Max(0, Math.Cos(f)) * 0.6; p.udoP = -Math.Sin(f) * 0.45; p.kolanoP = 0.15 + Math.Max(0, -Math.Cos(f)) * 0.6; p.usta = 0.3; p.bloto = 1;
            return p;
        }

        // ---------------------------------------------------------------- krew

        /// <summary>Kałuża krwi (rośnie z `k` 0…1).</summary>
        public static void kaluzaKrwi(IPlotno ctx, double x, double y, double r, double k, double ziarno = 0)
        {
            if (k <= 0) return;
            ctx.save();
            ctx.fillStyle = "rgba(96,8,6,0.88)";
            ctx.beginPath(); ctx.ellipse(x, y, r * k, r * 0.18 * k, 0, 0, Math.PI * 2); ctx.fill();
            for (int i = 0; i < 4; i++)
            {
                var a = ((ziarno * 7 + i * 13) % 10) / 10 * Math.PI * 2;
                ctx.beginPath(); ctx.ellipse(x + Math.Cos(a) * r * k * 0.9, y + Math.Sin(a) * r * 0.12 * k, r * 0.25 * k, r * 0.06 * k, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = "rgba(200,60,50,0.25)";
            ctx.beginPath(); ctx.ellipse(x - r * 0.3 * k, y - r * 0.03, r * 0.4 * k, r * 0.04 * k, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        /// <summary>Bryzg krwi z punktu (kropla po kropli, `k` 0…1 od chwili rany), kierunek `kat` (rad), siła `moc`.</summary>
        public static void bryzgKrwi(IPlotno ctx, double x, double y, double h, double k, double kat, double moc = 1, double ziarno = 0, double dno = double.PositiveInfinity)
        {
            if (k <= 0 || k >= 1) return;
            ctx.save();
            ctx.fillStyle = "rgb(128,14,10)";
            var n = (int)Math.Floor(14 * moc + 0.5);
            for (int i = 0; i < n; i++)
            {
                double r1 = ((ziarno * 31 + i * 17) % 100) / 100, r2 = ((ziarno * 13 + i * 29) % 100) / 100;
                var a = kat + (r1 - 0.5) * 1.4;
                var v = h * (0.4 + r2 * 0.9) * moc;
                double px = x + Math.Cos(a) * v * k, py = y + Math.Sin(a) * v * k + k * k * h * 0.8;
                var r = Math.Max(1, h * (0.008 + r2 * 0.014) * (1 - k * 0.5));
                // kropla, która doleciała do gruntu, rozpłaszcza się na nim
                if (py > dno) { ctx.beginPath(); ctx.ellipse(px, dno, r * 2.4, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); continue; }
                ctx.beginPath(); ctx.ellipse(px, py, r * 1.6, r, a, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }
}
