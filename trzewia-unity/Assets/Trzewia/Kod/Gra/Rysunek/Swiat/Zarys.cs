// Port: alpha-1/src/render/zarys.ts i alpha-1/src/render/pielgrzymka.ts.
// Zarys własnego ciała: boki i dno góry widoczne zawsze; rdzeń zawsze widoczny (Alpha, etap 5: zamiast niego pomnik).
// Droga pielgrzymów jak szkic w atlasie: kropki tam, gdzie da się przejść, szewrony wyryte w skale tam, gdzie trzeba
// ją wydrążyć. Plan szybu drogi wiernych — przerywany złoty zarys niewykutej części i znak „tu zacznij”.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyPomnik;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Zarys
    {
        /// <summary>rgba(hex, a) z render/palette.ts.</summary>
        static Styl rgba(string hex, double a)
        {
            var n = Convert.ToInt32(hex.Substring(1), 16);
            return Barwa.Rgba((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
        }

        /// <summary>
        /// Zarys własnego ciała: krawędzie góry widoczne zawsze, także tam, gdzie nikt nie był. Rdzeń też jest zawsze
        /// widoczny, bo to jedyny cel, jaki ta gra ma.
        /// </summary>
        public static void rysujZarys(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world;
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            double right = left + cam.vw / z, bottom = top + cam.vh / z;

            ctx.save();
            ctx.lineWidth = Math.Max(1, z * 0.08);
            ctx.strokeStyle = rgba(BARWA.atrament, 0.3);
            // boki i dno góry
            ctx.beginPath();
            if (left < 1) { ctx.moveTo((0 - left) * z, 0); ctx.lineTo((0 - left) * z, cam.vh); }
            if (right > w.w - 1) { ctx.moveTo((w.w - left) * z, 0); ctx.lineTo((w.w - left) * z, cam.vh); }
            if (bottom > w.h - 1) { ctx.moveTo(0, (w.h - top) * z); ctx.lineTo(cam.vw, (w.h - top) * z); }
            ctx.stroke();

            // rdzeń — widoczny zawsze (Alpha, etap 5: zamiast niego pomnik — też zawsze)
            if (POMNIK.wlaczony) { ctx.restore(); return; }
            double cx = (w.coreX + 0.5 - left) * z, cy = (w.coreY + 0.5 - top) * z;
            var puls = 0.55 + 0.45 * JsM.Sin(teraz * 0.0022);
            if (cx > -80 && cy > -80 && cx < cam.vw + 80 && cy < cam.vh + 80)
            {
                var r = Math.Max(10, z * 1.6);
                var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
                g.addColorStop(0, Barwa.Rgba(190, 40, 36, 0.3 + puls * 0.25));
                g.addColorStop(1, "rgba(190,40,36,0)");
                ctx.fillStyle = g;
                ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
                ctx.strokeStyle = Barwa.Rgba(226, 96, 76, 0.5 + puls * 0.4);
                ctx.lineWidth = Math.Max(1.4, z * 0.1);
                ctx.beginPath();
                ctx.arc(cx, cy, r * (0.9 + puls * 0.12), 0, Math.PI * 2);
                ctx.stroke();
                ctx.font = $"italic {Js.Js.S(Math.Max(13, z * 0.8))}px \"Trzewia Tekst\", Georgia, serif";
                ctx.fillStyle = Barwa.Rgba(226, 140, 120, 0.55 + puls * 0.3);
                ctx.textAlign = "center";
                ctx.fillText("rdzeń", cx, cy - r * 1.5);
            }
            ctx.restore();
        }

        /// <summary>
        /// Droga pielgrzymów narysowana na płycie jak szkic w atlasie: kropki tam, gdzie już da się przejść, znaki
        /// wyryte w skale tam, gdzie trzeba ją wydrążyć. Wyraźniejsza przy Kształtowaniu.
        /// </summary>
        public static void rysujDrogePielgrzymow(IPlotno ctx, Sim sim, Camera cam, PlanDrogi plan, double teraz, bool wyrazna)
        {
            var w = sim.world;
            var s = plan.sciezka;
            if (s.Count < 2) return;
            // skała, którą ktoś już wydrążył, nie jest już do kopania — kreska gaśnie za kilofem
            var kop = new HashSet<double>(plan.kopac.Where(i => Pielgrzymka.doKopania(w.tile[i])));
            if (kop.Count == 0) return;
            var z = cam.zoom;
            double px(double i) => cam.toScreenX((i % w.w) + 0.5);
            double py(double i) => cam.toScreenY(Math.Floor(i / w.w) + 0.5);
            var moc = wyrazna ? 1 : 0.55;
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            // przejście, które już jest: rzadkie kropki
            ctx.fillStyle = Barwa.Rgba(236, 214, 160, 0.5 * moc);
            var krok = Math.Max(1, (int)Math.Floor(6 / Math.Max(1, z) + 0.5));
            for (int k = 0; k < s.Count; k += krok)
            {
                if (kop.Contains(s[k])) continue;
                ctx.beginPath();
                ctx.arc(px(s[k]), py(s[k]), Math.Max(1, z * 0.12), 0, Math.PI * 2);
                ctx.fill();
            }
            // skała do wydrążenia: delikatne znaki wyryte w skale co kafel — szewrony w stronę przedsionka
            int ile = s.Count; var sz = Math.Max(2.5, z * 0.26);
            for (int k = 0; k < ile; k++)
            {
                var i = s[k];
                if (!kop.Contains(i)) continue;
                var a = s[Math.Max(0, k - 2)]; var b = s[Math.Min(ile - 1, k + 2)];
                double dx = px(a) - px(b), dy = py(a) - py(b);
                var d = Math.Sqrt(dx * dx + dy * dy); if (d == 0) d = 1;
                dx /= d; dy /= d;
                double x = px(i), y = py(i), nx = -dy, ny = dx;
                void szewron(double ox, double oy)
                {
                    ctx.beginPath();
                    ctx.moveTo(x + ox - dx * sz * 0.5 + nx * sz * 0.6, y + oy - dy * sz * 0.5 + ny * sz * 0.6);
                    ctx.lineTo(x + ox + dx * sz * 0.4, y + oy + dy * sz * 0.4);
                    ctx.lineTo(x + ox - dx * sz * 0.5 - nx * sz * 0.6, y + oy - dy * sz * 0.5 - ny * sz * 0.6);
                    ctx.stroke();
                }
                ctx.lineWidth = Math.Max(1, z * 0.07);
                ctx.strokeStyle = Barwa.Rgba(22, 14, 10, 0.7 * moc);
                szewron(0, 0);
                ctx.lineWidth = Math.Max(0.8, z * 0.04);
                ctx.strokeStyle = Barwa.Rgba(232, 200, 142, 0.6 * moc);
                szewron(0, Math.Max(0.8, z * 0.06));
            }
            // oba końce: gniazdo i przedsionek
            void koniec(double i)
            {
                double x = px(i), y = py(i);
                ctx.strokeStyle = Barwa.Rgba(250, 210, 140, 0.7 * moc);
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.arc(x, y, Math.Max(4, z * 0.9), 0, Math.PI * 2); ctx.stroke();
            }
            koniec(s[0]);
            koniec(s[s.Count - 1]);
            ctx.restore();
        }

        static Styl ZLOTO(double a) => Barwa.Rgba(232, 196, 130, a);
        const string TUSZ = "rgba(20,12,8,0.95)";
        const string DREWNO = "rgba(112,74,42,0.95)";

        /// <summary>Widoczne rzędy i kolumny odcinka szybu (kafle) — reszty nie rysuje się wcale.</summary>
        static (double x0, double x1, double y0, double y1)? widoczne(Prost s, Camera cam)
        {
            if (s.x1 < s.x0) return null;
            var z = cam.zoom;
            double lewa = cam.x - cam.vw / 2 / z, gora = cam.y - cam.vh / 2 / z;
            double x0 = Math.Max(s.x0, Math.Floor(lewa)), x1 = Math.Min(s.x1, Math.Ceiling(lewa + cam.vw / z));
            double y0 = Math.Max(s.y0, Math.Floor(gora)), y1 = Math.Min(s.y1, Math.Ceiling(gora + cam.vh / z));
            return x0 > x1 || y0 > y1 ? null : (x0, x1, y0, y1);
        }

        /// <summary>
        /// Plan szybu drogi wiernych — zawsze widoczny (nad mrokiem): niewykuta część jako plan pomieszczenia (przerywany
        /// złoty zarys, przekreślone kafle skały), a we wnęce, dopóki nikt nie zaczął, znak „tu zacznij”: rusztowanie
        /// z belek, kilof i strzałka w dół kredą.
        /// </summary>
        public static void rysujPlanDrogi(IPlotno ctx, Sim sim, Camera cam, PlanDrogi plan, double teraz)
        {
            var w = sim.world;
            var s = w.odcinkiDrogi.Count > 0 ? w.odcinkiDrogi[0] : null;
            if (plan.szyb == null || s == null) return;
            var z = cam.zoom;
            var start = w.salaOltarza.y1 + 1;
            ctx.save();
            // każdy odcinek osobno (6.11: zakręt przez komnatę z kotłem): najwyższy rząd, w którym jeszcze stoi jego skała
            foreach (var o in w.odcinkiDrogi)
            {
                double gora = -1;
                for (var y = Math.Max(o.y0, start); y <= o.y1 && gora < 0; y++) for (var x = o.x0; x <= o.x1; x++) if (Pielgrzymka.doKopania(w.tile[w.idx(x, y)])) { gora = y; break; }
                if (gora < 0) continue;
                var v = widoczne(o, cam);
                if (v is { } vv)
                {
                    ctx.strokeStyle = ZLOTO(0.32); ctx.lineWidth = Math.Max(1, z * 0.04);
                    ctx.beginPath();
                    var m = z * 0.24;
                    for (var y = Math.Max(vv.y0, gora); y <= vv.y1; y++) for (var x = vv.x0; x <= vv.x1; x++)
                        {
                            if (!Pielgrzymka.doKopania(w.tile[w.idx(x, y)])) continue;
                            double sx = cam.toScreenX(x), sy = cam.toScreenY(y);
                            ctx.moveTo(sx + m, sy + m); ctx.lineTo(sx + z - m, sy + z - m);
                        }
                    ctx.stroke();
                }
                // zarys: od najwyższego niewykutego rzędu do dna odcinka
                ctx.setLineDash(Math.Max(3, z * 0.4), Math.Max(2, z * 0.22));
                ctx.strokeStyle = ZLOTO(0.85); ctx.lineWidth = Math.Max(1.4, z * 0.08);
                ctx.strokeRect(cam.toScreenX(o.x0), cam.toScreenY(gora), (o.x1 - o.x0 + 1) * z, (o.y1 - gora + 1) * z);
                ctx.setLineDash();
            }
            // wnęka „tu zacznij”: dopóki pierwszy rząd szybu pod nią stoi cały
            var nikt = true;
            for (var x = s.x0; x <= s.x1; x++) if (!Pielgrzymka.doKopania(w.tile[w.idx(x, start)])) nikt = false;
            if (nikt)
            {
                var puls = 0.55 + 0.45 * JsM.Sin(teraz * 0.005);
                double lx = cam.toScreenX(s.x0), px = cam.toScreenX(s.x1 + 1), gy = cam.toScreenY(s.y0), dy = cam.toScreenY(start);
                // pierwszy rząd do wykucia — pulsuje złotem
                ctx.fillStyle = ZLOTO(0.12 + 0.16 * puls); ctx.fillRect(lx, dy, px - lx, z);
                ctx.strokeStyle = ZLOTO(0.55 + 0.4 * puls); ctx.lineWidth = Math.Max(1.4, z * 0.09); ctx.strokeRect(lx, dy, px - lx, z);
                // rama z belek nad wnęką: dwa słupy, oczep i zastrzały
                void belka(double ax, double ay, double bx, double by, double g)
                {
                    ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(2.4, z * g * 1.6);
                    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
                    ctx.strokeStyle = DREWNO; ctx.lineWidth = Math.Max(1.4, z * g); ctx.stroke();
                }
                double l = lx + z * 0.25, r = px - z * 0.25, g0 = gy + z * 0.18;
                belka(l, dy, l, g0, 0.14); belka(r, dy, r, g0, 0.14); belka(l - z * 0.15, g0, r + z * 0.15, g0, 0.14);
                belka(l, g0 + z * 0.55, l + z * 0.55, g0, 0.08); belka(r, g0 + z * 0.55, r - z * 0.55, g0, 0.08);
                // lampka na oczepie
                var cx = (lx + px) / 2;
                var blask = ctx.createRadialGradient(cx, g0 + z * 0.45, 0, cx, g0 + z * 0.45, z * 2.2);
                blask.addColorStop(0, Barwa.Rgba(255, 214, 140, 0.35 + 0.15 * puls)); blask.addColorStop(1, "rgba(255,214,140,0)");
                ctx.fillStyle = blask; ctx.fillRect(cx - z * 2.2, g0 - z * 1.8, z * 4.4, z * 4.4);
                ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.05);
                ctx.beginPath(); ctx.moveTo(cx, g0); ctx.lineTo(cx, g0 + z * 0.3); ctx.stroke();
                ctx.fillStyle = Barwa.Rgba(255, 220, 150, 0.8 + 0.2 * puls); ctx.beginPath(); ctx.arc(cx, g0 + z * 0.45, Math.Max(2, z * 0.14), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // kilof wbity w pierwszy rząd i strzałka kredą w dół
                ctx.shadowColor = ZLOTO(0.9); ctx.shadowBlur = 8 * puls;
                ctx.strokeStyle = Barwa.Rgba(240, 226, 196, 0.6 + 0.4 * puls); ctx.lineWidth = Math.Max(1.6, z * 0.1);
                double a1 = dy + z * (0.75 + 0.1 * puls), a0 = a1 - z * 1.1, sx2 = lx + z * 0.9;
                ctx.beginPath(); ctx.moveTo(sx2, a0); ctx.lineTo(sx2, a1); ctx.moveTo(sx2 - z * 0.32, a1 - z * 0.32); ctx.lineTo(sx2, a1); ctx.lineTo(sx2 + z * 0.32, a1 - z * 0.32); ctx.stroke();
                double kx = px - z * 1.1, ky = dy + z * 0.15;
                ctx.beginPath(); ctx.moveTo(kx - z * 0.45, ky - z * 0.55); ctx.lineTo(kx + z * 0.25, ky + z * 0.35); ctx.stroke();
                ctx.beginPath(); ctx.arc(kx - z * 0.45, ky - z * 0.25, z * 0.42, Math.PI * 1.2, Math.PI * 1.95); ctx.stroke();
                ctx.shadowBlur = 0;
            }
            ctx.restore();
        }
    }
}
