// Port: alpha-1/src/render/rozkazy.ts (szkice rozkazów wydanych w pauzie i baner pauzy) i render/alarm.ts (karta
// sytuacji przy auto-pauzie).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Przycisk banera pauzy ('cofnij' | 'skresl' | 'pusc') — gra sprawdza trafienie po środku i wymiarach.</summary>
    public sealed class PoleBanera { public string akcja = ""; public double x, y, w, h; }

    /// <summary>Pole karty alarmu: 'planuj' | 'pusc' | 'wycisz' | 'tablica' | 'pokaz'.</summary>
    public sealed class PoleAlarmu { public string akcja = ""; public double x, y, w, h; }

    public static class RysRozkazy
    {
        static readonly Dictionary<string, (double r, double g, double b)> BARWY = new Dictionary<string, (double, double, double)>
        {
            ["draz"] = (236, 226, 204), ["zawal"] = (206, 156, 96), ["woda"] = (132, 186, 226), ["zar"] = (255, 152, 64),
            ["ruda"] = (236, 204, 128), ["grzyb"] = (156, 214, 122), ["kosci"] = (224, 218, 200), ["trucizna"] = (204, 184, 244),
            ["objawienie"] = (250, 216, 136), ["panika"] = (230, 120, 100),
        };

        static string etykieta(Rozkaz o) => Moce.TOOLS[o.czasownik].FirstOrDefault(t => t.id == o.narzedzie)?.label ?? o.narzedzie;

        /// <summary>
        /// Szkice rozkazów wydanych w pauzie: przerywana kreska rylca w miejscu, w którym wola stanie się ciałem.
        /// Kreska płynie powoli — plan jest żywy, ale jeszcze nie jest czynem.
        /// </summary>
        public static void rysujRozkazy(IPlotno ctx, Sim sim, Camera cam, IReadOnlyList<Rozkaz> lista, double teraz)
        {
            if (lista.Count == 0) return;
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            double sx(double x) => (x - left) * z;
            double sy(double y) => (y - top) * z;
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineDashOffset = -teraz * 0.02;
            var rozm = Math.Max(13, Math.Min(18, z * 0.9));
            ctx.font = $"italic {Js.Js.S(rozm)}px {Ink.SERIF}";
            ctx.textAlign = "center";

            void podpis(string tekst, double x, double y, (double r, double g, double b) kol)
            {
                ctx.lineWidth = 3;
                ctx.strokeStyle = "rgba(10,7,6,0.85)";
                ctx.strokeText(tekst, x, y);
                ctx.fillStyle = Barwa.Rgba(kol.r, kol.g, kol.b, 0.95);
                ctx.fillText(tekst, x, y);
            }

            foreach (var o in lista)
            {
                var kol = BARWY.TryGetValue(o.narzedzie, out var kk) ? kk : (240, 226, 200);
                Styl k(double a) => Barwa.Rgba(kol.r, kol.g, kol.b, a);
                double x = o.x + 0.5, y = o.y + 0.5;
                if (o.kto != null)
                {
                    var c = sim.creatureById(o.kto.Value);
                    if (c != null && !c.dead) { x = c.x; y = c.y - 0.4; }
                }
                double px = sx(x), py = sy(y);
                if (px < -80 || py < -80 || px > cam.vw + 80 || py > cam.vh + 80) continue;

                if (o.czasownik == "zasiej")
                {
                    var r = 2 * z;
                    ctx.setLineDash(Math.Max(3, z * 0.35), Math.Max(3, z * 0.3));
                    ctx.lineWidth = Math.Max(1.4, z * 0.1);
                    ctx.strokeStyle = k(0.95);
                    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash();
                    // wnętrze szkicu: ukośne kreskowanie
                    ctx.save();
                    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
                    ctx.strokeStyle = k(0.35);
                    ctx.lineWidth = 1;
                    var krok = Math.Max(4, z * 0.5);
                    ctx.beginPath();
                    for (var d = -r * 2; d < r * 2; d += krok) { ctx.moveTo(px + d - r, py - r); ctx.lineTo(px + d + r, py + r); }
                    ctx.stroke();
                    ctx.restore();
                    podpis(etykieta(o), px, py - r - 6, kol);
                }
                else if (o.czasownik == "znak")
                {
                    // gwiazda Znaku i słaby krąg tych, którzy go zobaczą
                    ctx.setLineDash(2, 7);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = k(0.3);
                    ctx.beginPath(); ctx.arc(px, py, 26 * z, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash();
                    ctx.strokeStyle = k(0.95);
                    ctx.lineWidth = Math.Max(1.5, z * 0.1);
                    var u = Math.Max(8, z * 0.9);
                    ctx.beginPath();
                    for (int i = 0; i < 8; i++)
                    {
                        var a = (i / 8.0) * Math.PI * 2 + teraz * 0.0004;
                        ctx.moveTo(px + JsM.Cos(a) * u * 0.4, py + JsM.Sin(a) * u * 0.4);
                        ctx.lineTo(px + JsM.Cos(a) * u * 1.2, py + JsM.Sin(a) * u * 1.2);
                    }
                    ctx.stroke();
                    podpis(etykieta(o), px, py - u * 1.6, kol);
                }
                else
                {
                    // szept celuje w jedno stworzenie — pierścień idzie za nim
                    var r = Math.Max(14, z * 1.4);
                    ctx.setLineDash(4, 4);
                    ctx.lineWidth = 1.6;
                    ctx.strokeStyle = "rgba(226,214,250,0.95)";
                    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash();
                    podpis($"„{etykieta(o)}”", px, py - r - 6, (230, 220, 250));
                }
            }
            ctx.restore();
        }

        static string odmianaRozkazu(int n)
        {
            if (n == 1) return "rozkaz czeka";
            int d = n % 10, s = n % 100;
            return d >= 2 && d <= 4 && (s < 12 || s > 14) ? "rozkazy czekają" : "rozkazów czeka";
        }

        /// <summary>
        /// Baner pauzy przy dolnej krawędzi płyty: czas stoi, ile rozkazów czeka i co już zarezerwowano, a pod ręką
        /// „cofnij”, „skreśl” i „puść czas”.
        /// </summary>
        public static List<PoleBanera> rysujBanerPauzy(IPlotno ctx, Plate p, Sim sim, int ile, double teraz, double nadPrzyciskami)
        {
            var rozm = Math.Max(15, Math.Min(20, p.w / 58));
            var puls = 0.6 + 0.4 * JsM.Sin(teraz * 0.003);
            var r = sim.rezerwa;
            var koszty = new List<string>();
            if (r.krew > 0) koszty.Add($"{Js.Js.S(Math.Floor(r.krew + 0.5))} krwi");
            if (r.wiara > 0) koszty.Add($"{Js.Js.S(Math.Floor(r.wiara + 0.5))} wiary");
            if (r.otchlan > 0) koszty.Add($"{Js.Js.S(Math.Floor(r.otchlan + 0.5))} otchłani");
            const string tytul = "CZAS STOI";
            var linia = ile > 0 ? $"{ile} {odmianaRozkazu(ile)}{(koszty.Count > 0 ? " · zarezerwowane: " + string.Join(", ", koszty) : "")}"
                : "Wydawaj rozkazy — staną się naraz, gdy puścisz czas.";

            ctx.save();
            ctx.font = $"{Js.Js.S(rozm * 0.95)}px {Ink.SERIF}";
            var przyciski = ile > 0
                ? new[] { ("cofnij", "cofnij"), ("skresl", "skreśl wszystko"), ("pusc", "puść czas ▸") }
                : new[] { ("pusc", "puść czas ▸") };
            var szerP = przyciski.Select(b => ctx.measureText(b.Item2).width + rozm * 1.4).ToArray();
            ctx.font = $"italic {Js.Js.S(rozm * 0.9)}px {Ink.SERIF}";
            var szerL = ctx.measureText(linia).width;
            var szer = Math.Min(p.w - 20, Math.Max(szerL + rozm * 2, szerP.Sum() + rozm * 3));
            var wys = rozm * 4.6;
            var x = p.x + (p.w - szer) / 2;
            var y = p.y + p.h - wys - 12 - nadPrzyciskami;

            ctx.fillStyle = "rgba(10,7,6,0.9)";
            ctx.fillRect(x, y, szer, wys);
            ctx.strokeStyle = Barwa.Rgba(224, 176, 104, 0.45 + 0.35 * puls);
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x + 3.5, y + 3.5, szer - 7, wys - 7);

            ctx.textAlign = "center";
            ctx.font = $"{Js.Js.S(rozm * 0.78)}px {Ink.SERIF}";
            ctx.fillStyle = Barwa.Rgba(232, 186, 112, 0.75 + 0.25 * puls);
            ctx.fillText(string.Join(" ", tytul.ToCharArray()), p.x + p.w / 2, y + rozm * 1.2);
            ctx.font = $"italic {Js.Js.S(rozm * 0.9)}px {Ink.SERIF}";
            ctx.fillStyle = "rgba(236,224,200,0.95)";
            var tekst = linia;
            while (ctx.measureText(tekst).width > szer - rozm && tekst.Length > 10) tekst = tekst.Substring(0, tekst.Length - 2);
            ctx.fillText(tekst == linia ? linia : tekst + "…", p.x + p.w / 2, y + rozm * 2.35);

            var pola = new List<PoleBanera>();
            ctx.font = $"{Js.Js.S(rozm * 0.95)}px {Ink.SERIF}";
            var razem = szerP.Sum() + (przyciski.Length - 1) * rozm * 0.6;
            var bx = p.x + (p.w - razem) / 2;
            var by = y + rozm * 3.55;
            for (int i = 0; i < przyciski.Length; i++)
            {
                var (akcja, napis) = przyciski[i]; double bw = szerP[i], bh = rozm * 1.6;
                var glowny = akcja == "pusc";
                ctx.fillStyle = glowny ? Barwa.Rgba(224, 176, 104, 0.14 + 0.1 * puls) : "rgba(255,255,255,0.03)";
                ctx.fillRect(bx, by - bh / 2, bw, bh);
                ctx.strokeStyle = glowny ? Barwa.Rgba(224, 176, 104, 0.7 + 0.3 * puls) : "rgba(206,192,166,0.45)";
                ctx.lineWidth = 1;
                ctx.strokeRect(bx + 0.5, by - bh / 2 + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = glowny ? "rgba(248,236,210,1)" : "rgba(216,204,180,0.95)";
                ctx.fillText(napis, bx + bw / 2, by + rozm * 0.32);
                pola.Add(new PoleBanera { akcja = akcja, x = bx + bw / 2, y = by, w = bw, h = bh });
                bx += bw + rozm * 0.6;
            }
            ctx.restore();
            return pola;
        }

        /// <summary>
        /// Karta sytuacji przy auto-pauzie: co się stało, dlaczego to ważne i co możesz z tym zrobić. Gra stoi, dopóki
        /// nie zdecydujesz — „planuj” zamyka kartę i zostawia pauzę, „puść czas” rusza świat od razu.
        /// </summary>
        public static List<PoleAlarmu> rysujAlarm(IPlotno ctx, Plate p, Aplikacja.Alarm a, double teraz)
        {
            var rozm = Math.Max(15, Math.Min(21, p.w / 54));
            var szer = p.waski ? p.w - 16 : Math.Min(520, p.w * 0.6);
            var wew = szer - 44;
            ctx.save();
            ctx.font = $"italic {Js.Js.S(rozm * 0.92)}px {Ink.SERIF}";
            var lTekst = Ink.linieAkapitu(ctx, a.tekst, wew);
            ctx.font = $"{Js.Js.S(rozm)}px {Ink.SERIF}";
            var lRada = Ink.linieAkapitu(ctx, a.rada, wew - rozm * 1.2);
            var wys = rozm * (1.2 + 1.9 + 0.4) + lTekst * rozm * 1.22 + rozm * 1.5 + lRada * rozm * 1.3 + rozm * 3.4;
            var x = p.x + (p.w - szer) / 2;
            var y = p.y + (p.waski ? 10 : Math.Max(12, p.h * 0.06));
            var puls = 0.5 + 0.5 * JsM.Sin(teraz * 0.004);

            Ink.panel(ctx, x, y, szer, wys, 0.96);
            ctx.strokeStyle = a.kryzys ? Barwa.Rgba(214, 96, 76, 0.5 + 0.4 * puls) : Barwa.Rgba(224, 176, 104, 0.4 + 0.3 * puls);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - 3, y - 3, szer + 6, wys + 6);

            var lx = x + 22;
            var yy = y + rozm * 1.25;
            ctx.textAlign = "left";
            ctx.font = $"{Js.Js.S(rozm * 0.7)}px {Ink.SERIF}";
            ctx.fillStyle = a.kryzys ? "rgba(226,120,100,0.95)" : Paleta.rgba(BARWA.zarBlady, 0.9);
            var naglowek = string.Join(" ", (a.kryzys ? "KRYZYS · CZAS STANĄŁ" : "WYDARZENIE · CZAS STANĄŁ").ToCharArray());
            ctx.fillText(naglowek, lx, yy);
            // „pokaż miejsce ›” po prawej od nagłówka; kamera jedzie tam tylko na prośbę gracza
            var pola = new List<PoleAlarmu>();
            var nw = ctx.measureText(naglowek).width;
            void pokaz(double wiersz, double zajete)
            {
                if (a.cel == null) return;
                ctx.save();
                ctx.font = $"italic {Js.Js.S(rozm * 0.85)}px {Ink.SERIF}";
                const string link = "pokaż miejsce ›";
                var lw = ctx.measureText(link).width;
                if (lx + zajete + rozm + lw <= x + szer - 18)
                {
                    ctx.textAlign = "right";
                    ctx.fillStyle = Paleta.rgba(BARWA.zarBlady, 0.95);
                    ctx.fillText(link, x + szer - 18, wiersz);
                    pola.Add(new PoleAlarmu { akcja = "pokaz", x = x + szer - 18 - lw / 2, y = wiersz - rozm * 0.3, w = lw + 16, h = Math.Max(rozm * 1.6, 30) });
                }
                ctx.restore();
            }
            if (!p.waski) pokaz(yy, nw);
            yy += rozm * 1.6;
            ctx.font = $"{Js.Js.S(rozm * 1.3)}px {Ink.SERIF}";
            ctx.fillStyle = Paleta.rgba(BARWA.atramentMocny, 1);
            ctx.fillText(a.tytul, lx, yy);
            yy += rozm * 1.15;
            ctx.font = $"italic {Js.Js.S(rozm * 0.92)}px {Ink.SERIF}";
            ctx.fillStyle = Paleta.rgba(BARWA.atrament, 0.85);
            Ink.akapit(ctx, a.tekst, lx, yy, wew, rozm * 1.22);
            yy += lTekst * rozm * 1.22 + rozm * 0.55;

            // co możesz zrobić — wyróżnione, bo po to jest ta karta
            ctx.font = $"{Js.Js.S(rozm * 0.7)}px {Ink.SERIF}";
            ctx.fillStyle = Paleta.rgba(BARWA.zarBlady, 0.95);
            ctx.fillText("C O   M O Ż E S Z", lx, yy);
            if (p.waski) pokaz(yy, ctx.measureText("C O   M O Ż E S Z").width);
            yy += rozm * 1.25;
            ctx.fillStyle = Paleta.rgba(BARWA.zarBlady, 0.9);
            ctx.beginPath();
            ctx.moveTo(lx + 2, yy - rozm * 0.62); ctx.lineTo(lx + rozm * 0.62, yy - rozm * 0.34); ctx.lineTo(lx + 2, yy - rozm * 0.06);
            ctx.closePath(); ctx.fill();
            ctx.font = $"{Js.Js.S(rozm)}px {Ink.SERIF}";
            ctx.fillStyle = Paleta.rgba(BARWA.atramentMocny, 0.97);
            Ink.akapit(ctx, a.rada, lx + rozm * 1.2, yy, wew - rozm * 1.2, rozm * 1.3);

            // przyciski
            var by = y + wys - rozm * 1.3;
            double przycisk(string akcja, string tekst, double px0, bool glowny)
            {
                ctx.font = $"{Js.Js.S(rozm * 0.98)}px {Ink.SERIF}";
                double bw = ctx.measureText(tekst).width + rozm * 1.5, bh = rozm * 1.8;
                var bx = px0 - bw;
                ctx.fillStyle = glowny ? Barwa.Rgba(224, 176, 104, 0.16 + 0.1 * puls) : "rgba(255,255,255,0.03)";
                ctx.fillRect(bx, by - bh * 0.68, bw, bh);
                ctx.strokeStyle = glowny ? Barwa.Rgba(224, 176, 104, 0.7 + 0.3 * puls) : "rgba(206,192,166,0.5)";
                ctx.lineWidth = 1.2;
                ctx.strokeRect(bx + 0.5, by - bh * 0.68 + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = glowny ? "rgba(250,238,212,1)" : "rgba(220,208,184,0.95)";
                ctx.textAlign = "center";
                ctx.fillText(tekst, bx + bw / 2, by);
                pola.Add(new PoleAlarmu { akcja = akcja, x = bx + bw / 2, y = by - bh * 0.18, w = bw, h = bh });
                return bx - rozm * 0.6;
            }
            var px = x + szer - 18;
            px = przycisk("planuj", "Planuj →", px, true);
            px = przycisk("pusc", "puść czas", px, false);
            if (a.tablica != null) px = przycisk("tablica", "tablica", px, false);
            ctx.font = $"italic {Js.Js.S(Math.Max(12, rozm * 0.7))}px {Ink.SERIF}";
            ctx.textAlign = "left";
            ctx.fillStyle = Paleta.rgba(BARWA.atramentCichy, 0.8);
            const string t = "nie zatrzymuj przy tym";
            var tw = ctx.measureText(t).width;
            if (lx + tw < px - rozm * 3)
            {
                ctx.fillText(t, lx, by);
                pola.Add(new PoleAlarmu { akcja = "wycisz", x = lx + tw / 2, y = by - rozm * 0.3, w = tw + 12, h = rozm * 1.6 });
            }
            ctx.restore();
            return pola;
        }
    }
}
