// Port: alpha-1/src/render/zapiski.ts (pełna kronika), render/legenda.ts (klucz do ryciny), render/tempo.ts (klepsydra)
// i render/dev.ts (rysunki trybu deweloperskiego).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public sealed class TrafienieZapisku { public double x, y, w, h; public ChronicleEntry wpis = null!; }

    public static class Zapiski
    {
        /// <summary>Ile tików trwa jeden „obrót” — jednostka czasu, którą kronika liczy zamiast zegara.</summary>
        const double OBROT = 600;

        public static string czasWpisu(double tick)
        {
            var o = Math.Floor(tick / OBROT);
            return o < 1 ? "na początku" : $"obrót {Js.Js.S(o)}";
        }

        static readonly Dictionary<string, (double r, double g, double b)> BARWY = new Dictionary<string, (double, double, double)>
        {
            ["krew"] = (222, 120, 100), ["wiara"] = (238, 220, 176), ["otchlan"] = (226, 228, 238), ["koniec"] = (248, 230, 200), ["swiat"] = (214, 202, 180),
        };

        /// <summary>
        /// Pełna kronika: wszystko, co góra zapamiętała, od najnowszego. Wpisy z miejscem można kliknąć — wzrok idzie tam,
        /// gdzie się to stało.
        /// </summary>
        public static (List<TrafienieZapisku> trafienia, double maxPrzewin, Obszar zamknij) rysujZapiski(IPlotno ctx, Plate p, Sim sim, double vw, double vh, double przewin)
        {
            var szer = Math.Min(760, vw * 0.82);
            var wys = Math.Min(vh * 0.8, 620);
            var x = p.x + (p.w - szer) / 2;
            var y = p.y + (p.h - wys) / 2;

            ctx.save();
            ctx.fillStyle = "rgba(8,6,5,0.72)";
            ctx.fillRect(0, 0, vw, vh);
            Ink.panel(ctx, x, y, szer, wys, 0.97);

            var tytul = Math.Max(20, Math.Min(30, szer / 22));
            ctx.textAlign = "left";
            ctx.font = $"600 {Js.Js.S(tytul)}px {Ink.SERIF}";
            ctx.fillStyle = "rgba(244,230,202,0.96)";
            ctx.fillText("ZAPISKI", x + 26, y + 20 + tytul);
            Ink.naciecie(ctx, x + szer / 2, y + 32 + tytul, szer - 52, 0.5);

            ctx.font = $"italic {Js.Js.S(Math.Max(14, szer / 52))}px {Ink.SERIF}";
            ctx.fillStyle = "rgba(206,192,166,0.7)";
            ctx.textAlign = "right";
            ctx.fillText("dotknij wpisu, by tam spojrzeć", x + szer - 26, y + 20 + tytul);

            var rozmiar = Math.Max(14, Math.Min(18, szer / 44));
            var lh = rozmiar * 1.62;
            var gora = y + 48 + tytul;
            var dol = y + wys - 26;
            var widocznych = (int)Math.Floor((dol - gora) / lh);
            var wpisy = Enumerable.Reverse(sim.chronicle).ToList();
            var maxPrzewin = Math.Max(0, wpisy.Count - widocznych);
            var od = (int)Math.Max(0, Math.Min(maxPrzewin, Math.Floor(przewin + 0.5)));

            var trafienia = new List<TrafienieZapisku>();
            ctx.save();
            ctx.beginPath();
            ctx.rect(x + 12, gora - lh * 0.8, szer - 24, dol - gora + lh * 0.6);
            ctx.clip();

            for (int i = 0; i < widocznych; i++)
            {
                if (od + i >= wpisy.Count) break;
                var e = wpisy[od + i];
                var ly = gora + i * lh + rozmiar;
                var col = BARWY[e.kind];
                var maMiejsce = e.x != null;

                ctx.textAlign = "left";
                ctx.font = $"italic {Js.Js.S(rozmiar * 0.82)}px {Ink.SERIF}";
                ctx.fillStyle = "rgba(182,170,150,0.72)";
                var stempel = czasWpisu(e.tick);
                ctx.fillText(stempel, x + 26, ly);
                var wciecie = Math.Max(96, ctx.measureText("obrót 000").width + 18);

                ctx.font = $"{Js.Js.S(rozmiar)}px {Ink.SERIF}";
                ctx.fillStyle = Barwa.Rgba(col.r, col.g, col.b, maMiejsce ? 0.96 : 0.8);
                var tekst = e.text;
                var maxW = szer - wciecie - 52;
                while (ctx.measureText(tekst).width > maxW && tekst.Length > 12) tekst = tekst.Substring(0, tekst.Length - 2);
                if (tekst != e.text) tekst += "…";
                ctx.fillText(tekst, x + 26 + wciecie, ly);

                if (maMiejsce)
                {
                    ctx.strokeStyle = Barwa.Rgba(col.r, col.g, col.b, 0.3);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x + 26 + wciecie, ly + rozmiar * 0.28);
                    ctx.lineTo(x + 26 + wciecie + ctx.measureText(tekst).width, ly + rozmiar * 0.28);
                    ctx.stroke();
                    trafienia.Add(new TrafienieZapisku { x = x + 20, y = ly - rozmiar, w = szer - 40, h = lh, wpis = e });
                }
            }
            ctx.restore();

            if (maxPrzewin > 0)
            {                       // rysa na marginesie zamiast paska
                var h = (dol - gora) * ((double)widocznych / wpisy.Count);
                var t = (double)od / maxPrzewin;
                ctx.strokeStyle = "rgba(206,192,166,0.35)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + szer - 14, gora + (dol - gora - h) * t);
                ctx.lineTo(x + szer - 14, gora + (dol - gora - h) * t + h);
                ctx.stroke();
            }

            var zk = Math.Max(16, rozmiar);
            var zamknij = new Obszar(x + szer - 34, y + wys - 34, 28, 28);
            ctx.textAlign = "center";
            ctx.font = $"italic {Js.Js.S(zk)}px {Ink.SERIF}";
            ctx.fillStyle = "rgba(214,200,172,0.8)";
            ctx.fillText("zamknij", x + szer / 2, y + wys - 10);
            ctx.restore();
            return (trafienia, maxPrzewin, zamknij);
        }
    }

    public static class Legenda
    {
        sealed class Pozycja { public Action<IPlotno, double, double, double> rysuj = null!; public string nazwa = "", opis = ""; }

        static readonly Pozycja[] POZYCJE =
        {
            new Pozycja { nazwa = "Ruda", opis = "z niej stawiają ołtarze i wykuwają Żużlowców",
                rysuj = (c, x, y, s) => { c.strokeStyle = "rgba(236,206,140,0.95)"; c.lineWidth = 1.6; for (int i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - s * 0.4 + i * s * 0.25, y + s * 0.3); c.lineTo(x - s * 0.25 + i * s * 0.25, y - s * 0.3); c.stroke(); } } },
            new Pozycja { nazwa = "Grzybnia", opis = "jedzenie, które rośnie ze zwłok",
                rysuj = (c, x, y, s) => { c.strokeStyle = "rgba(122,178,96,0.95)"; c.lineWidth = 1.5; for (int i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * s * 0.28, y + s * 0.3); c.lineTo(x + i * s * 0.28, y - s * 0.05); c.stroke(); c.beginPath(); c.ellipse(x + i * s * 0.28, y - s * 0.05, s * 0.17, s * 0.11, 0, Math.PI, 0); c.stroke(); } } },
            new Pozycja { nazwa = "Kości", opis = "padlina: jedzenie i paliwo dla grzybni",
                rysuj = (c, x, y, s) => { c.strokeStyle = "rgba(226,218,196,0.95)"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - s * 0.35, y + s * 0.2); c.lineTo(x + s * 0.35, y - s * 0.2); c.stroke(); c.beginPath(); c.arc(x - s * 0.35, y + s * 0.2, s * 0.09, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x + s * 0.35, y - s * 0.2, s * 0.09, 0, Math.PI * 2); c.stroke(); } },
            new Pozycja { nazwa = "Ołtarz i kuźnia", opis = "przy nich się modlą — stąd bierze się Wiara",
                rysuj = (c, x, y, s) => { c.strokeStyle = "rgba(240,206,150,0.95)"; c.lineWidth = 1.6; c.strokeRect(x - s * 0.25, y - s * 0.25, s * 0.5, s * 0.5); c.beginPath(); c.moveTo(x, y - s * 0.25); c.lineTo(x, y - s * 0.45); c.stroke(); } },
            new Pozycja { nazwa = "Czysta ciemność", opis = "miejsca, o których nikt nie pamięta",
                rysuj = (c, x, y, s) => { c.fillStyle = "rgba(150,143,128,0.9)"; c.beginPath(); c.moveTo(x - s * 0.4, y - s * 0.3); c.lineTo(x + s * 0.35, y - s * 0.35); c.lineTo(x + s * 0.4, y + s * 0.3); c.lineTo(x - s * 0.3, y + s * 0.35); c.closePath(); c.fill(); } },
            new Pozycja { nazwa = "Podpis przy gnieździe", opis = "imię nacji i liczba żywych",
                rysuj = (c, x, y, s) => { c.strokeStyle = Paleta.rgba(BARWA.atrament, 0.8); c.lineWidth = 1.2; c.beginPath(); c.arc(x - s * 0.3, y + s * 0.2, s * 0.12, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x - s * 0.2, y + s * 0.1); c.lineTo(x + s * 0.1, y - s * 0.2); c.stroke(); c.fillStyle = Paleta.rgba(BARWA.atrament, 0.8); c.fillRect(x + s * 0.12, y - s * 0.33, s * 0.3, s * 0.18); } },
        };

        /// <summary>Klucz do ryciny: co znaczy każdy znak na płycie. Wywoływany klawiszem i z bestiariusza.</summary>
        public static void rysujLegende(IPlotno ctx, Plate p, double w)
        {
            var szer = Math.Min(430, p.w * 0.5);
            var rozmiar = Math.Max(14, Math.Min(18, w / 76));
            var wiersz = rozmiar * 2.5;
            var wys = 52 + POZYCJE.Length * wiersz + rozmiar * 2;
            var x = p.x + p.w / 2 - szer / 2;
            var y = p.y + p.h / 2 - wys / 2;

            Ink.panel(ctx, x, y, szer, wys, 0.94);
            ctx.save();
            ctx.textAlign = "left";
            ctx.font = $"600 {Js.Js.S(rozmiar * 1.15)}px {Ink.SERIF_TYTUL}";
            ctx.fillStyle = Paleta.rgba(BARWA.atramentMocny, 0.95);
            ctx.fillText("CO WIDZISZ NA PŁYCIE", x + 18, y + 28);

            for (int i = 0; i < POZYCJE.Length; i++)
            {
                var poz = POZYCJE[i];
                var yy = y + 52 + i * wiersz;
                poz.rysuj(ctx, x + 36, yy, rozmiar * 1.5);
                ctx.font = $"{Js.Js.S(rozmiar)}px {Ink.SERIF}";
                ctx.fillStyle = Paleta.rgba(BARWA.atramentMocny, 0.92);
                ctx.fillText(poz.nazwa, x + 68, yy + rozmiar * 0.1);
                ctx.font = $"italic {Js.Js.S(rozmiar * 0.8)}px {Ink.SERIF}";
                ctx.fillStyle = Paleta.rgba(BARWA.atrament, 0.7);
                ctx.fillText(poz.opis, x + 68, yy + rozmiar * 1.05);
            }

            ctx.font = $"italic {Js.Js.S(rozmiar * 0.8)}px {Ink.SERIF}";
            ctx.fillStyle = Paleta.rgba(BARWA.atramentCichy, 0.6);
            ctx.textAlign = "center";
            ctx.fillText("dotknij albo naciśnij L jeszcze raz, żeby schować", x + szer / 2, y + wys - rozmiar * 0.8);
            ctx.restore();
        }
    }

    public static class Tempo
    {
        /// <summary>Gdzie leży klepsydra — to także przycisk pauzy (dotknięcie ją przewraca).</summary>
        public static (double x, double y, double r, double s) miejsceKlepsydry(Plate p)
        {
            var s = Math.Max(15, Math.Min(22, p.w * 0.017));
            // wąski ekran nie ma marginesu nad płytą — klepsydra wchodzi do środka, w róg
            var x = p.waski ? p.x + p.w - s * 1.5 : p.x + p.w - s * 1.6;
            var y = p.waski ? p.y + s * 1.6 : p.y - Math.Max(s * 1.35, p.top * 0.3);
            return (x, y, Math.Max(24, s * 1.4), s);
        }

        /// <summary>
        /// Klepsydra przy krawędzi płyty: widać, czy czas stoi, sączy się, czy płynie. Mnożnik (×2, ×½…) pojawia się tylko
        /// w trybie deweloperskim — w grze czas jest jeden. stan: 'stoi' | 'zwalnia' | 'plynie'.
        /// </summary>
        public static void rysujTempo(IPlotno ctx, Plate p, string stan, double mnoznik, double teraz)
        {
            var (x, y, _, s) = miejsceKlepsydry(p);
            var zywa = stan == "plynie" ? 1 : stan == "zwalnia" ? 0.45 : 0;
            var puls = stan == "stoi" ? 0.55 + 0.2 * JsM.Sin(teraz * 0.0024) : 0.9;

            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = Barwa.Rgba(226, 210, 180, puls);
            ctx.lineWidth = 1.5;
            ctx.lineJoin = "round";
            ctx.beginPath();                               // klepsydra: dwa trójkąty i ramki
            ctx.moveTo(-s * 0.42, -s * 0.5); ctx.lineTo(s * 0.42, -s * 0.5);
            ctx.lineTo(-s * 0.42, s * 0.5); ctx.lineTo(s * 0.42, s * 0.5);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-s * 0.5, -s * 0.56); ctx.lineTo(s * 0.5, -s * 0.56);
            ctx.moveTo(-s * 0.5, s * 0.56); ctx.lineTo(s * 0.5, s * 0.56);
            ctx.stroke();

            if (zywa > 0)
            {                                // sypiący się piasek
                var faza = (teraz * 0.004 * zywa) % 1;
                ctx.fillStyle = Barwa.Rgba(240, 222, 186, 0.5 + 0.4 * zywa);
                ctx.fillRect(-0.8, -s * 0.2 + faza * s * 0.6, 1.6, s * 0.22);
            }

            ctx.textAlign = "right";
            ctx.font = $"italic {Js.Js.S(s * 0.82)}px {Ink.SERIF}";
            ctx.fillStyle = Barwa.Rgba(216, 200, 172, stan == "stoi" ? puls : 0.8);
            var podpis = stan == "stoi" ? "czas stoi" : stan == "zwalnia" ? "czas sączy się" : mnoznik == 1 ? "" : $"×{Przyciski.mnoznikNapis(mnoznik)}";
            ctx.fillText(podpis, -s * 0.8, s * 0.36);
            ctx.restore();
        }
    }

    /// <summary>
    /// render/dev.ts — rysunki trybu deweloperskiego: śledzona postać z jej drogą i celem, obrys kafla pod kursorem,
    /// a na życzenie drogi wszystkich postaci. Rysowane w układzie płyty, na wierzchu świata.
    /// </summary>
    public static class RysDev
    {
        const string MONO = "11px ui-monospace,Consolas,monospace";

        static void droga(IPlotno ctx, Sim sim, Camera cam, Creature c)
        {
            if (c.droga == null || c.droga.Count == 0) return;
            var w = sim.world.w;
            ctx.beginPath();
            ctx.moveTo(cam.toScreenX(c.x), cam.toScreenY(c.y - 0.5));
            for (var i = (int)(c.drogaI ?? 0); i < c.droga.Count; i++)
            {
                var k = c.droga[i];
                ctx.lineTo(cam.toScreenX((k % w) + 0.5), cam.toScreenY(Js.Js.ToInt32(k / w) + 0.5));
            }
            ctx.stroke();
        }

        static void podpis(IPlotno ctx, string tekst, double x, double y, string kolor)
        {
            ctx.font = MONO;
            ctx.textAlign = "center";
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(0,0,0,0.85)";
            ctx.strokeText(tekst, x, y);
            ctx.fillStyle = kolor;
            ctx.fillText(tekst, x, y);
        }

        public static void rysujDev(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var DEV = Dziennik.DEV;
            var z = cam.zoom;
            ctx.save();
            // drogi wszystkich (cienko), zanim dojdzie gruba droga śledzonego
            if (DEV.pokazDrogi)
            {
                ctx.strokeStyle = "rgba(160,220,255,0.35)";
                ctx.lineWidth = 1;
                foreach (var q in sim.creatures) if (!q.dead && q.id != DEV.sledzony) droga(ctx, sim, cam, q);
            }
            // kafel pod kursorem
            if (DEV.kursor != null)
            {
                ctx.strokeStyle = "rgba(120,220,255,0.9)";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(cam.toScreenX(DEV.kursor.x), cam.toScreenY(DEV.kursor.y), z, z);
            }
            var c = DEV.sledzony >= 0 ? sim.creatures.FirstOrDefault(q => q.id == DEV.sledzony && !q.dead) : null;
            if (c != null)
            {
                // droga: od miejsca, w którym jest, do końca
                ctx.strokeStyle = "rgba(255,220,90,0.85)";
                ctx.lineWidth = Math.Max(1.5, z * 0.18);
                ctx.setLineDash(z * 0.5, z * 0.35);
                droga(ctx, sim, cam, c);
                ctx.setLineDash();
                // cel zajęcia
                ctx.strokeStyle = "rgba(255,120,90,0.9)";
                ctx.lineWidth = 1.5;
                double tx = cam.toScreenX(c.jx + 0.5), ty = cam.toScreenY(c.jy + 0.5);
                ctx.beginPath(); ctx.moveTo(tx - z * 0.6, ty - z * 0.6); ctx.lineTo(tx + z * 0.6, ty + z * 0.6);
                ctx.moveTo(tx + z * 0.6, ty - z * 0.6); ctx.lineTo(tx - z * 0.6, ty + z * 0.6); ctx.stroke();
                // pierścień wokół postaci i jej numer
                var puls = 1 + 0.15 * JsM.Sin(teraz * 0.008);
                ctx.strokeStyle = "rgba(255,220,90,0.95)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cam.toScreenX(c.x), cam.toScreenY(c.y - 0.6), Math.Max(8, z * 1.3) * puls, 0, Math.PI * 2);
                ctx.stroke();
                podpis(ctx, $"#{Js.Js.S(c.id)}", cam.toScreenX(c.x), cam.toScreenY(c.y - 0.6) - Math.Max(10, z * 1.5), "#ffdc5a");
            }
            ctx.restore();
        }
    }
}
