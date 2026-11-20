// Etap 6 (Symulacja/GlowyCerbera.cs): zapowiedź ataku każdej głowy Cerbera — rośnie przez „czas” zamachu i dochodzi do
// pełna w chwili rany, żeby dało się odskoczyć albo nakarmić tę głowę:
//  - pitbull gryzie: czerwony łuk przed paszczą (0,5 s),
//  - doberman zieje ogniem: linia ognia w stronę, w którą patrzy (0,7 s),
//  - wilk wyje: pierścień wokół Cerbera — kto w nim stoi, zostanie ogłuszony (0,8 s); drugi, przerywany pierścień
//    zaciska się do niego.
// To informacja z gry (nie ozdoba) — rysuje się zawsze, gdy działa etap 6, także bez oprawy (F9).
using System;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyWalka;

namespace Trzewia.Visual
{
    public static class ZapowiedzGlow
    {
        /// <summary>Wysokość głowy nad stopami (kafle): 0 doberman, 1 wilk, 2 pitbull — jak Walka.WYS_GLOWY.</summary>
        static readonly double[] WYS = { 3.1, 2.6, 1.9 };

        public static void Rysuj(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            if (!GlowyCerbera.Aktywne) return;
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.boss != "demon") continue;
                var R = c.ruch;
                if (R?.glowa is not double gl) continue;
                var def = RUCHY_BOSSA[R.id];
                if (def == null) continue;
                var zap = GlowyCerbera.Zapowiedz(R.id) * 120;
                if (zap <= 0) continue;
                // chwila rany: w walce według wzorów — trafT; w starej — tik trafienia z danych
                var h = Walka.tikTrafieniaBossa(def);
                if (h == null) continue;
                var hitT = R.od + (R.trafT ?? h.Value);
                var tik = ZegarGry.tikZUlamkiem(sim, teraz);
                var t0 = hitT - zap;
                if (tik < t0 || tik > hitT + 10) continue;
                var u = Math.Max(0, Math.Min(1, (tik - t0) / zap));
                var po = tik > hitT ? 1 - (tik - hitT) / 10 : 1;           // po ranie gaśnie przez 10 tików
                var z = cam.zoom;
                var kier = c.face >= 0 ? 1 : -1;
                double fx = cam.toScreenX(c.x), fy = cam.toScreenY(c.y + 1);
                // paszcza z rysunku Cerbera (oprawa, etap 2 zbiera kotwice głów), a z niej — w którą stronę patrzy;
                // bez oprawy — z kafli (wysokość głowy nad stopami)
                var nrG = (int)gl;
                double hx, hy;
                if (Czytelnosc.PunktGlowy(nrG, out var px, out var py, out var srodek))
                {
                    hx = px; hy = py;
                    if (Math.Abs(px - srodek) > z * 0.3) kier = px > srodek ? 1 : -1;
                }
                else { hx = fx + kier * z * 1.2; hy = fy - z * WYS[nrG]; }
                ctx.save();
                ctx.lineCap = "round";
                switch ((int)gl)
                {
                    case GlowyCerbera.PITBULL:
                        {
                            // łuk przed paszczą: zasięg ugryzienia, od dołu do przodu
                            var zas = def.zasieg ?? 2.2;
                            double cx = hx - kier * z * 0.4, cy = hy;
                            double a0 = kier > 0 ? -0.9 : Math.PI - 0.5, a1 = kier > 0 ? 0.5 : Math.PI + 0.9;
                            ctx.globalAlpha = po;
                            ctx.fillStyle = Barwa.Rgba(220, 40, 26, 0.10 + 0.16 * u);
                            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, z * zas, a0, a1); ctx.closePath(); ctx.fill();
                            ctx.strokeStyle = Barwa.Rgba(255, 70 + 120 * u * u, 50, 0.45 + 0.5 * u);
                            ctx.lineWidth = Math.Max(1.5, z * (0.08 + 0.14 * u));
                            ctx.beginPath(); ctx.arc(cx, cy, z * zas, a0, a0 + (a1 - a0) * Math.Max(0.15, u)); ctx.stroke();
                            break;
                        }
                    case GlowyCerbera.DOBERMAN:
                        {
                            // linia ognia: z paszczy dobermana skośnie w dół, na długość płomienia
                            var zas = def.zasieg ?? 5;
                            double x0 = hx, y0 = hy, x1 = hx + kier * z * zas, y1 = fy - z * 0.8;
                            ctx.globalAlpha = po;
                            ctx.strokeStyle = Barwa.Rgba(255, 150, 60, 0.25);
                            ctx.lineWidth = Math.Max(2, z * 0.5);
                            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
                            ctx.strokeStyle = Barwa.Rgba(255, 110 + 120 * u, 40, 0.55 + 0.45 * u);
                            ctx.lineWidth = Math.Max(1.5, z * (0.08 + 0.12 * u));
                            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u); ctx.stroke();
                            break;
                        }
                    case GlowyCerbera.WILK:
                        {
                            // pierścień wycia: promień ogłuszenia; drugi, przerywany, zaciska się do niego
                            var r = z * GlowyCerbera.WYCIE_PROMIEN;
                            double cx = fx, cy = fy - z * 1;
                            ctx.globalAlpha = po;
                            ctx.fillStyle = Barwa.Rgba(230, 210, 255, 0.05 + 0.08 * u);
                            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                            ctx.strokeStyle = Barwa.Rgba(235, 220, 255, 0.35 + 0.55 * u);
                            ctx.lineWidth = Math.Max(1.5, z * (0.06 + 0.1 * u));
                            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                            ctx.setLineDash(new[] { z * 0.4, z * 0.3 });
                            ctx.strokeStyle = Barwa.Rgba(255, 255, 255, 0.25 + 0.4 * u);
                            ctx.lineWidth = Math.Max(1, z * 0.05);
                            ctx.beginPath(); ctx.arc(cx, cy, r * (1 + 0.6 * (1 - u)), 0, Math.PI * 2); ctx.stroke();
                            ctx.setLineDash(Array.Empty<double>());
                            break;
                        }
                }
                ctx.restore();
            }
        }
    }
}
