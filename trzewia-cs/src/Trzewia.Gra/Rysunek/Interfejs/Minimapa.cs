// Port: alpha-1/src/render/minimapa.ts, render/znaczniki.ts (cel podpowiedzi) i render/lud.ts (znaczniki ludu).
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Minimapa
    {
        /// <summary>Gdzie na ekranie leży pasek mapy — potrzebne i do rysowania, i do kliknięcia.</summary>
        public static Obszar obszarMinimapy(Plate p)
        {
            var szer = Math.Max(34, Math.Min(78, p.right + 34));
            return new Obszar(p.x + p.w + 12, p.y + 6, szer, p.h - 12);
        }

        /// <summary>
        /// Pasek mapy: cała góra w miniaturze, kropki nacji, rdzeń i ramka aktualnego widoku.
        /// Bez niego po dwóch przeciągnięciach nie wiadomo, gdzie się jest.
        /// </summary>
        public static void rysujMinimape(IPlotno ctx, Sim sim, Camera cam, Plate p, double teraz)
        {
            var o = obszarMinimapy(p);
            var w = sim.world;
            double sx = o.w / w.w, sy = o.h / w.h;

            ctx.save();
            ctx.fillStyle = "rgba(10,7,6,0.88)";
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeStyle = Paleta.rgba(BARWA.atrament, 0.4);
            ctx.lineWidth = 1;
            ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);

            // zarys góry — znasz swój kształt, nawet jeśli nie pamiętasz wnętrza
            ctx.beginPath();
            ctx.moveTo(o.x, o.y + w.surface[0] * sy);
            for (var x = 0; x < w.w; x += 2) ctx.lineTo(o.x + x * sx, o.y + w.surface[x] * sy);
            ctx.lineTo(o.x + o.w, o.y + o.h);
            ctx.lineTo(o.x, o.y + o.h);
            ctx.closePath();
            ctx.fillStyle = "rgba(38,28,24,0.85)";
            ctx.fill();
            ctx.strokeStyle = Paleta.rgba(BARWA.atrament, 0.55);
            ctx.stroke();

            // to, co pamiętane — jaśniejsze plamy; próbkujemy rzadko, bo to tylko podgląd
            ctx.fillStyle = Paleta.rgba(BARWA.atrament, 0.3);
            const int krok = 3;
            for (var y = 0; y < w.h; y += krok)
            {
                for (var x = 0; x < w.w; x += krok)
                {
                    var i = w.idx(x, y);
                    if (w.ever[i] == 0) continue;
                    var swieze = sim.tick - w.lastSeen[i] < 9000;
                    if (!swieze) continue;
                    ctx.fillRect(o.x + x * sx, o.y + y * sy, Math.Max(1, krok * sx), Math.Max(1, krok * sy));
                }
            }

            // gniazda nacji
            foreach (var k in sim.clans)
            {
                if (k.dead || k.pop <= 0) continue;
                // wiesz tylko to, co wiedzą twoi mieszkańcy — nacji w nieznanym nie widać
                var i = w.idx(k.hx, k.hy);
                if (w.ever[i] == 0 || sim.tick - w.lastSeen[i] > 9000) continue;
                var c = Races.RACES[k.race].color;
                ctx.fillStyle = Barwa.Rgba(c[0], c[1], c[2], 0.95);
                ctx.beginPath();
                ctx.arc(o.x + k.hx * sx, o.y + k.hy * sy, Math.Max(1.6, Math.Min(3.4, 1 + k.pop * 0.05)), 0, Math.PI * 2);
                ctx.fill();
            }

            // rdzeń — jedyny wyjątek: swój własny rdzeń znasz bez niczyjej pomocy
            var puls = 0.6 + 0.4 * JsM.Sin(teraz * 0.003);
            ctx.fillStyle = Barwa.Rgba(190, 40, 36, 0.6 + puls * 0.4);
            ctx.beginPath();
            ctx.arc(o.x + w.coreX * sx, o.y + w.coreY * sy, 3 + puls * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = Barwa.Rgba(230, 120, 96, 0.5 + puls * 0.3);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(o.x + w.coreX * sx, o.y + w.coreY * sy, 6 + puls * 2, 0, Math.PI * 2);
            ctx.stroke();

            // ramka aktualnego widoku
            double vx = (cam.x - cam.vw / 2 / cam.zoom) * sx, vy = (cam.y - cam.vh / 2 / cam.zoom) * sy;
            double vw = (cam.vw / cam.zoom) * sx, vh = (cam.vh / cam.zoom) * sy;
            ctx.strokeStyle = Paleta.rgba(BARWA.atramentMocny, 0.9);
            ctx.lineWidth = 1.2;
            ctx.strokeRect(o.x + Math.Max(0, vx), o.y + Math.Max(0, vy), Math.Min(vw, o.w), Math.Min(vh, o.h));

            ctx.font = $"{Js.Js.S(Math.Max(12, o.w * 0.17))}px {Ink.SERIF}";
            ctx.fillStyle = Paleta.rgba(BARWA.atramentCichy, 0.6);
            ctx.textAlign = "center";
            ctx.fillText(Krag.T("pomnik", "pieczęć"), o.x + o.w / 2, o.y + o.h - 4);
            ctx.restore();
        }

        /// <summary>Zamienia kliknięcie w pasek na miejsce w świecie.</summary>
        public static (double x, double y)? miejsceZMinimapy(Sim sim, Plate p, double x, double y)
        {
            var o = obszarMinimapy(p);
            if (x < o.x || x > o.x + o.w || y < o.y || y > o.y + o.h) return null;
            var w = sim.world;
            return (((x - o.x) / o.w) * w.w, ((y - o.y) / o.h) * w.h);
        }
    }

    /// <summary>Cel podpowiedzi (render/znaczniki.ts: Cel).</summary>
    public sealed class Cel { public double x, y, r; public string? tekst; public double? klan; }

    public static class Znaczniki
    {
        /// <summary>
        /// Strzałka przy krawędzi płyty, gdy cel jest poza kadrem (współrzędne płyty), albo null, gdy cel widać.
        /// Rysunek (podswietlCel) i dotyk (ekran gry: dotknięcie strzałki wiezie tam kamerę) liczą ją tak samo.
        /// </summary>
        public static (double x, double y, double kat)? strzalkaCelu(Camera cam, Cel cel)
        {
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            double sx = (cel.x - left) * z, sy = (cel.y - top) * z;
            if (sx > 0 && sy > 0 && sx < cam.vw && sy < cam.vh) return null;
            double cx = cam.vw / 2, cy = cam.vh / 2;
            var kat = JsM.Atan2(sy - cy, sx - cx);
            return (cx + JsM.Cos(kat) * (cam.vw / 2 - 52), cy + JsM.Sin(kat) * (cam.vh / 2 - 52), kat);
        }

        /// <summary>Od kiedy wisi ten sam cel (tekst i miejsce) — podpowiedź odświeża się co kilka sekund nowym obiektem.</summary>
        static string wiekKlucz = ""; static double wiekOd = 0;

        /// <summary>Podświetlenie celu: pierścień, a gdy cel poza kadrem — strzałka na krawędzi. Jedyne „patrz tutaj”.</summary>
        public static void podswietlCel(IPlotno ctx, Camera cam, Cel cel, double teraz)
        {
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            double sx = (cel.x - left) * z, sy = (cel.y - top) * z;
            var klucz = $"{cel.tekst ?? ""}|{Js.Js.S(Math.Floor(cel.x + 0.5))}|{Js.Js.S(Math.Floor(cel.y + 0.5))}";
            if (klucz != wiekKlucz) { wiekKlucz = klucz; wiekOd = teraz; }
            // świeży cel woła, a po kilku sekundach przygasa — rytuał trwa minutami i pierścień nad kryptą wisiał jak znacznik debugowy
            var wiek = (teraz - wiekOd) / 1000;
            var glos = wiek < 6 ? 1 : Math.Max(0.4, 1 - (wiek - 6) * 0.2);
            var puls = (0.6 + 0.4 * JsM.Sin(teraz * 0.004)) * glos;
            // pierścień nie większy niż kawałek kadru — dawniej dwa wielkie okręgi z nacięciami zasłaniały scenę
            var r = Math.Min(Math.Max(18, cel.r * z), Math.Min(cam.vw, cam.vh) * 0.11);

            var wKadrze = sx > 0 && sy > 0 && sx < cam.vw && sy < cam.vh;
            ctx.save();
            if (wKadrze)
            {
                // jeden cienki, oddychający pierścień i delikatna poświata pod nim
                ctx.strokeStyle = Paleta.rgba(BARWA.zarBlady, 0.12 * glos + 0.08 * puls);
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(sx, sy, r * (0.94 + 0.08 * puls), 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = Paleta.rgba(BARWA.zarBlady, 0.3 * glos + 0.25 * puls);
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(sx, sy, r * (0.94 + 0.08 * puls), 0, Math.PI * 2);
                ctx.stroke();
                // cztery nacięcia celownika
                for (int i = 0; i < 4; i++)
                {
                    var a = i * Math.PI / 2 + Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(sx + JsM.Cos(a) * r * 1.35, sy + JsM.Sin(a) * r * 1.35);
                    ctx.lineTo(sx + JsM.Cos(a) * r * 1.7, sy + JsM.Sin(a) * r * 1.7);
                    ctx.stroke();
                }
            }
            else
            {
                // strzałka przy krawędzi
                var s = strzalkaCelu(cam, cel);
                if (s == null) { ctx.restore(); return; }
                var (px, py, kat) = s.Value;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(kat);
                ctx.fillStyle = Paleta.rgba(BARWA.zarBlady, 0.6 + 0.35 * puls);
                ctx.beginPath();
                ctx.moveTo(18, 0); ctx.lineTo(-11, -10); ctx.lineTo(-4, 0); ctx.lineTo(-11, 10);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>render/lud.ts — znaczniki ludu na mapie: obozy (namiot bez podpisu, Alpha 0.2).</summary>
        public static void rysujZnacznikiLudu(IPlotno ctx, Sim sim, Camera cam)
        {
            var z = cam.zoom;
            ctx.save();
            foreach (var o in sim.lud.spizarnie)
            {
                double x = cam.toScreenX(o.x + 0.5), y = cam.toScreenY(o.y + 1);
                var r = Math.Max(7, z * 0.9);
                // namiot: wypełniony trójkąt z ciemnym wejściem — widać go na każdym przybliżeniu
                ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y - r * 1.3); ctx.lineTo(x + r, y); ctx.closePath();
                ctx.fillStyle = "rgba(150,104,60,0.88)"; ctx.fill();
                ctx.strokeStyle = "rgba(240,214,164,0.98)"; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = "rgba(12,8,7,0.95)";
                ctx.beginPath(); ctx.moveTo(x - r * 0.25, y); ctx.lineTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.25, y); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }
    }
}
