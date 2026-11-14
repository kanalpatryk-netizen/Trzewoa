// Port: alpha-1/src/render/budowa.ts — „Budowa” (Alpha 1): ciemna płyta obok księgi (klawisz jak „wyznacz
// pomieszczenie”), pod nią „odwołaj rozkaz”, a po dotknięciu płyty — menu kafli z pomieszczeniami: łuk wyrobiska
// z ikoną, rozmiar pod spodem, nazwa; nad kaflami opis „co daje” i „jak postawić” wskazanego (albo wybranego)
// pomieszczenia. Placeholder rysowany w kodzie. Zwraca pola do kliknięcia. Nazwy jednoliterowe jak w źródle.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawyPomieszczenia;

namespace Trzewia.Rysunek
{
    /// <summary>Pole „Budowy” do kliknięcia: 'buduj' | 'odwolaj' | 'menu' | 'szablon'.</summary>
    public sealed class PoleBudowy { public string akcja = ""; public string? szablon; public double x, y, w, h; }

    public sealed class StanBudowy
    {
        public (double x, double y) kursor; public double czas;
        /// <summary>Menu kafli otwarte.</summary>
        public bool menu;
        /// <summary>Wybrany szablon (plan pod kursorem).</summary>
        public string? szablon;
        /// <summary>Ktoś z zaznaczonych ma rozkaz — „odwołaj” jest czynne.</summary>
        public bool maRozkaz;
        public (double darmowe, double cena) liny;
    }

    public static class Budowa
    {
        /// <summary>Co daje pomieszczenie i jak je postawić (opis w menu „Budowa”).</summary>
        static readonly Dictionary<string, (string daje, string jak)> OPIS_POMIESZCZENIA = new Dictionary<string, (string, string)>
        {
            ["sypialnia"] = ("sen w niej zdejmuje osłabienia", "dotknij skały — plan stanie pod kursorem; kują go robotnicy"),
            ["warsztat"] = ("robotnicy zamieniają w nim złoto w wiarę", "dotknij skały — plan stanie pod kursorem; kują go robotnicy"),
            ["kuznia"] = ("z żelaza wykuwa zbroję rycerza", "dotknij skały — plan stanie pod kursorem; kują go robotnicy"),
            ["korytarz"] = ("przejście w bok, na 2 kafle wysokości", "przeciągnij w bok od miejsca, gdzie stoi lud"),
            ["szyb"] = ("proste schody w dół — da się nimi wrócić", "przeciągnij w dół i w bok od miejsca, gdzie stoi lud"),
            ["lina"] = ("lud wchodzi po niej wyżej niż o stopień", "dotknij skały, której uczepi się hak — lina spadnie do podłogi"),
        };

        /// <summary>Rozmiar pod ikoną kafla: „5×3”, „do 30”, „5 za darmo”.</summary>
        static string rozmiarPomieszczenia(string A)
        {
            var M = POMIESZCZENIA;
            if (A == "sypialnia" || A == "warsztat" || A == "kuznia") { var s = Symulacja.Pomieszczenia.szablon(A); return $"{Js.Js.S(s.w)}×{Js.Js.S(s.h)}"; }
            return A == "korytarz" ? $"do {Js.Js.S(M.korytarzMaks)}" : A == "szyb" ? $"do {Js.Js.S(M.szybMaks)}" : $"{Js.Js.S(M.linyDarmowe)} za darmo";
        }

        static List<string> lamLinie(IPlotno ctx, string M, double g)
        {
            var B = new List<string>();
            var C = "";
            foreach (var o in M.Split(' '))
            {
                var E = C != "" ? $"{C} {o}" : o;
                if (ctx.measureText(E).width > g && C != "") { B.Add(C); C = o; } else C = E;
            }
            if (C != "") B.Add(C);
            return B;
        }

        static Styl jasny(double a) => Barwa.Rgba(222, 206, 172, a);

        /// <summary>Ciemna płyta z rogami z kreski; `g` 0..1 — żar od dołu (podświetlenie), `B` — wybrana (złota obwódka).</summary>
        static void panelCiemny(IPlotno ctx, Obszar M, double g, bool B, double C = 6)
        {
            ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3; ctx.beginPath(); ctx.roundRect(M.x, M.y, M.w, M.h, C);
            var o = ctx.createLinearGradient(0, M.y, 0, M.y + M.h);
            o.addColorStop(0, "#0b0907"); o.addColorStop(0.5, "#15110e"); o.addColorStop(1, "#1d1712"); ctx.fillStyle = o; ctx.fill(); ctx.shadowColor = "transparent"; ctx.save(); ctx.clip();
            var E = ctx.createLinearGradient(0, M.y, 0, M.y + 10);
            E.addColorStop(0, "rgba(0,0,0,0.75)"); E.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = E; ctx.fillRect(M.x, M.y, M.w, 10);
            if (g > 0)
            {
                var I = ctx.createRadialGradient(M.x + M.w / 2, M.y + M.h * 1.05, 2, M.x + M.w / 2, M.y + M.h, Math.Max(M.w, M.h) * 0.9);
                I.addColorStop(0, Barwa.Rgba(255, 160, 70, 0.32 * g)); I.addColorStop(0.5, Barwa.Rgba(200, 110, 40, 0.12 * g)); I.addColorStop(1, "rgba(200,110,40,0)"); ctx.fillStyle = I; ctx.fillRect(M.x, M.y, M.w, M.h);
            }
            ctx.restore(); ctx.lineWidth = 1; ctx.strokeStyle = B ? "rgba(214,170,96,0.85)" : jasny(0.22 + 0.25 * g); ctx.beginPath(); ctx.roundRect(M.x + 0.5, M.y + 0.5, M.w - 1, M.h - 1, C); ctx.stroke();
            ctx.strokeStyle = jasny(0.1 + 0.12 * g); ctx.beginPath(); ctx.roundRect(M.x + 3.5, M.y + 3.5, M.w - 7, M.h - 7, Math.Max(2, C - 3)); ctx.stroke();
            ctx.strokeStyle = B ? "rgba(214,170,96,0.9)" : jasny(0.35 + 0.3 * g);
            var Q = Math.Min(8, Math.Min(M.w / 6, M.h / 4));
            ctx.beginPath();
            foreach (var (I, Y, i, w) in new[] { (M.x + 3.5, M.y + 3.5, 1.0, 1.0), (M.x + M.w - 3.5, M.y + 3.5, -1.0, 1.0), (M.x + 3.5, M.y + M.h - 3.5, 1.0, -1.0), (M.x + M.w - 3.5, M.y + M.h - 3.5, -1.0, -1.0) })
            { ctx.moveTo(I + i * Q, Y); ctx.lineTo(I, Y); ctx.lineTo(I, Y + w * Q); }
            ctx.stroke(); ctx.restore();
        }

        /// <summary>Kapitaliki rozstrzelone wąską spacją (toUpperCase().split("").join(" ")).</summary>
        static void napisRozstrzelony(IPlotno ctx, string M, double g, double B, double C, Styl o, string E = "left", double? Q = null)
        {
            ctx.save(); ctx.font = $"600 {Js.Js.S(C)}px {Ink.SERIF_TYTUL}"; ctx.textAlign = E; ctx.textBaseline = "alphabetic"; ctx.fillStyle = o; ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 2;
            ctx.fillText(string.Join(" ", M.ToUpperInvariant().ToCharArray()), g, B, Q); ctx.restore();
        }

        /// <summary>Wygładzone podświetlenia (0..1) — płyty i kafle rozjaśniają się łagodnie.</summary>
        sealed class Wygladzone { public double v, t; }
        static readonly Dictionary<string, Wygladzone> wygladzone = new Dictionary<string, Wygladzone>();
        static double wygladz(string A, double M, double g)
        {
            if (!wygladzone.TryGetValue(A, out var B)) B = new Wygladzone { v = 0, t = g };
            var C = Math.Min(100, Math.Max(0, g - B.t));
            B.v += (M - B.v) * Math.Min(1, C / 140); B.t = g; wygladzone[A] = B;
            return B.v;
        }

        /// <summary>Płyta „Budowa”, „odwołaj rozkaz” i (gdy otwarte) menu kafli.</summary>
        public static List<PoleBudowy> rysujBudowe(IPlotno ctx, Plate M, double g, StanBudowy B)
        {
            var C = Przyciski.ukladDolu(M, g); var o = new List<PoleBudowy>();
            bool E(Obszar D) => B.kursor.x >= D.x && B.kursor.x <= D.x + D.w && B.kursor.y >= D.y && B.kursor.y <= D.y + D.h;
            var Q = C.buduj; var I = wygladz("buduj", E(Q) || B.menu ? 1 : 0, B.czas);
            panelCiemny(ctx, Q, I, B.menu);
            var Y = Math.Min(Q.h * 0.7, Q.w * 0.34);
            IkonyHud.ikonaBudowy(ctx, Q.x + 12 + Y / 2, Q.y + Q.h / 2, Y, 0.6 + 0.4 * I);
            double i = Q.x + 20 + Y, w = Math.Max(13, Math.Min(19, Q.h * 0.24));
            napisRozstrzelony(ctx, "Budowa", i, Q.y + Q.h * 0.5, w, B.menu ? "rgba(236,200,130,1)" : jasny(0.78 + 0.2 * I), "left", Q.x + Q.w - i - 8);
            ctx.save(); ctx.font = $"italic {Js.Js.S(Math.Max(11, w * 0.72))}px {Ink.SERIF}"; ctx.textAlign = "left"; ctx.fillStyle = jasny(0.45);
            ctx.fillText(B.menu ? B.szablon != null ? NAZWA_POMIESZCZENIA[B.szablon] : "co wykuć?" : "wykuj w skale", i, Q.y + Q.h * 0.5 + w * 1.15, Q.x + Q.w - i - 8);
            ctx.font = $"{Js.Js.S(Math.Max(10, w * 0.62))}px {Ink.SERIF}"; ctx.textAlign = "right"; ctx.fillStyle = jasny(0.3);
            ctx.fillText(Keybinds.nazwaKlawisza(Keybinds.klawisze[Akcja.planuj]).ToUpperInvariant(), Q.x + Q.w - 9, Q.y + Math.Max(15, w * 0.95)); ctx.restore();
            o.Add(new PoleBudowy { akcja = "buduj", x = Q.x, y = Q.y, w = Q.w, h = Q.h });
            var G = C.odwolaj; var h = wygladz("odwolaj", B.maRozkaz && E(G) ? 1 : 0, B.czas);
            panelCiemny(ctx, G, h, false, 5);
            var a = G.h * 0.62;
            IkonyHud.ikonaOdwolaj(ctx, G.x + 10 + a / 2, G.y + G.h / 2, a, B.maRozkaz ? 0.65 + 0.35 * h : 0.25); ctx.save();
            var k = Math.Max(12, Math.Min(15, G.h * 0.4));
            ctx.font = $"italic {Js.Js.S(k)}px {Ink.SERIF}"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = B.maRozkaz ? jasny(0.75 + 0.25 * h) : jasny(0.25);
            ctx.fillText("odwołaj rozkaz", G.x + 16 + a, G.y + G.h / 2 + 1, G.x + G.w - (G.x + 16 + a) - 6); ctx.restore();
            o.Add(new PoleBudowy { akcja = "odwolaj", x = G.x, y = G.y, w = G.w, h = G.h });
            if (B.menu) o.AddRange(menuBudowy(ctx, M, Q, B));
            return o;
        }

        static Path2D lukKafla(double A, double M, double g, double B)
        {
            var C = g / 2; var o = new Path2D();
            o.moveTo(A, M + B); o.lineTo(A, M + C * 0.55); o.quadraticCurveTo(A, M, A + C, M); o.quadraticCurveTo(A + g, M, A + g, M + C * 0.55); o.lineTo(A + g, M + B); o.closePath();
            return o;
        }

        static List<PoleBudowy> menuBudowy(IPlotno ctx, Plate M, Obszar g, StanBudowy B)
        {
            var C = new List<PoleBudowy>(); var E = SZABLONY.Length; var Q = Math.Ceiling(E / 3.0);
            double I = Math.Max(64, Math.Min(88, M.h * 0.145)), Y = I * 1.12, i = 10, w = 16, G = Math.Max(12, Math.Min(14, I * 0.17)), h = G * 2.2, a = G * 4.3, k = G * 1.7;
            double D = 3 * I + 2 * i + w * 2, l = w + h + a + Q * (Y + k) + (Q - 1) * i * 0.5 + w * 0.5;
            double U = Math.Max(M.x + 8, Math.Min(M.x + M.w - D - 8, g.x + g.w / 2 - D / 2)), K = Math.Max(M.y + 8, g.y - 14 - l);
            panelCiemny(ctx, new Obszar(U, K, D, l), 0, false, 8); C.Add(new PoleBudowy { akcja = "menu", x = U, y = K, w = D, h = l + 14 }); ctx.save();
            var S = K + w + G * 1.05;
            napisRozstrzelony(ctx, "Budowa", U + D / 2, S, G * 1.15, jasny(0.85), "center"); ctx.font = $"600 {Js.Js.S(G * 1.15)}px {Ink.SERIF_TYTUL}";
            var J = ctx.measureText("B U D O W A").width;
            ctx.strokeStyle = jasny(0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(U + w, S - G * 0.35); ctx.lineTo(U + D / 2 - J / 2 - 10, S - G * 0.35); ctx.moveTo(U + D / 2 + J / 2 + 10, S - G * 0.35); ctx.lineTo(U + D - w, S - G * 0.35); ctx.stroke(); ctx.restore();
            string? m = null;
            var s = SZABLONY.Select((q, F) => (s: q, kx: U + w + F % 3 * (I + i), ky: K + w + h + a + Math.Floor(F / 3.0) * (Y + k + i * 0.5))).ToList();
            foreach (var q in s) if (B.kursor.x >= q.kx && B.kursor.x <= q.kx + I && B.kursor.y >= q.ky && B.kursor.y <= q.ky + Y + k) m = q.s;
            var R = m ?? B.szablon;
            ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            var V = K + w + h + G * 0.9;
            if (R != null)
            {
                ctx.font = $"italic {Js.Js.S(G * 1.05)}px {Ink.SERIF}"; ctx.fillStyle = "rgba(236,200,130,0.95)";
                var q = NAZWA_POMIESZCZENIA[R];
                ctx.fillText(q.Substring(0, 1).ToUpperInvariant() + q.Substring(1) + " — " + OPIS_POMIESZCZENIA[R].daje + ".", U + w, V, D - w * 2); ctx.font = $"italic {Js.Js.S(G * 0.92)}px {Ink.SERIF}"; ctx.fillStyle = jasny(0.55);
                var F = R == "lina" ? $"{OPIS_POMIESZCZENIA["lina"].jak}; {(B.liny.darmowe > 0 ? $"za darmo — zostało {Js.Js.S(B.liny.darmowe)}" : $"każda kosztuje {Js.Js.S(B.liny.cena)} krwi")}." : $"{OPIS_POMIESZCZENIA[R].jak}.";
                var linie = lamLinie(ctx, F, D - w * 2);
                for (int Z = 0; Z < linie.Count && Z < 2; Z++) ctx.fillText(linie[Z], U + w, V + G * (1.3 + Z * 1.15));
            }
            else
            {
                ctx.font = $"italic {Js.Js.S(G * 0.95)}px {Ink.SERIF}"; ctx.fillStyle = jasny(0.55);
                var linie = lamLinie(ctx, "Wybierz, co wykuć, i wskaż miejsce w skale. Plan kują robotnicy, którym go wskażesz; prawy przycisk na planie — skreśla go.", D - w * 2);
                for (int F = 0; F < linie.Count && F < 3; F++) ctx.fillText(linie[F], U + w, V + F * G * 1.15);
            }
            ctx.restore();
            foreach (var q in s)
            {
                bool F = B.szablon == q.s, y = m == q.s; var Z = wygladz($"kafel-{q.s}", F ? 1 : y ? 0.75 : 0, B.czas); var p = lukKafla(q.kx, q.ky, I, Y);
                ctx.save();
                var c = ctx.createLinearGradient(0, q.ky, 0, q.ky + Y);
                c.addColorStop(0, "#050403"); c.addColorStop(1, "#14100c"); ctx.fillStyle = c; ctx.fill(p); ctx.save(); ctx.clip(p);
                if (Z > 0.01)
                {
                    var j = ctx.createRadialGradient(q.kx + I / 2, q.ky + Y, 2, q.kx + I / 2, q.ky + Y * 0.75, I * 0.85);
                    j.addColorStop(0, Barwa.Rgba(255, 160, 70, 0.36 * Z)); j.addColorStop(0.6, Barwa.Rgba(170, 90, 30, 0.12 * Z)); j.addColorStop(1, "rgba(170,90,30,0)"); ctx.fillStyle = j; ctx.fillRect(q.kx, q.ky, I, Y);
                }
                var t = ctx.createLinearGradient(0, q.ky, 0, q.ky + I * 0.4);
                t.addColorStop(0, "rgba(0,0,0,0.8)"); t.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = t; ctx.fillRect(q.kx, q.ky, I, I * 0.4);
                IkonyHud.ikonaPomieszczenia(ctx, q.s, q.kx + I / 2, q.ky + Y * 0.56, I * 0.8, B.czas, 0.5 + 0.5 * Z); ctx.restore();
                ctx.lineWidth = F ? 1.4 : 1; ctx.strokeStyle = F ? "rgba(214,170,96,0.95)" : jasny(0.2 + 0.35 * Z); ctx.stroke(p);
                if (F)
                {
                    ctx.strokeStyle = "rgba(214,170,96,0.8)"; ctx.beginPath();
                    foreach (var jj in new double[] { -1, 1 })
                    {
                        var e = q.kx + I / 2 + jj * (I / 2 + 4);
                        ctx.moveTo(e, q.ky + Y * 0.45); ctx.lineTo(e, q.ky + Y * 0.75);
                    }
                    ctx.stroke();
                }
                ctx.font = $"italic {Js.Js.S(Math.Max(10, I * 0.13))}px {Ink.SERIF}"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = jasny(0.3 + 0.2 * Z);
                ctx.fillText(rozmiarPomieszczenia(q.s), q.kx + I / 2, q.ky + Y - 5); ctx.restore();
                napisRozstrzelony(ctx, NAZWA_POMIESZCZENIA[q.s], q.kx + I / 2, q.ky + Y + G * 1.25, G * 0.78, F ? "rgba(236,200,130,1)" : jasny(0.5 + 0.4 * Z), "center", I + i);
                C.Add(new PoleBudowy { akcja = "szablon", szablon = q.s, x = q.kx - 3, y = q.ky - 3, w = I + 6, h = Y + k + 3 });
            }
            return C;
        }
    }
}
