// Port: alpha-1/src/atlas/odkrycia.ts (które tablice gracz odkrył — w plikach gracza zamiast localStorage),
// render/tablica.ts (pełna tablica i siatka miniatur) i atlas/okno.ts (okno atlasu nad płytą albo nad menu).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyWygladAtlas;
using static Trzewia.Nastawy.NastawyWygladFreski;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Atlas
{
    /// <summary>
    /// Które tablice gracz już odkrył — pamiętane między partiami, bo atlas to wiedza gracza, nie jednej góry. Nowe
    /// odkrycia czekają w kolejce na pokazanie.
    /// </summary>
    public sealed class Odkrycia
    {
        /// <summary>Plik gracza — osobny dla trybu Kręgu Trzeciego (w TS kręgu: localStorage „trzewia-krag-3-beta:atlas”).</summary>
        readonly string PLIK;
        readonly List<string> znane = new List<string>();
        /// <summary>Odkryte w tej sesji, jeszcze niepokazane.</summary>
        public readonly List<string> kolejka = new List<string>();
        /// <summary>Odkryte po cichu, a gracz jeszcze nie zajrzał do atlasu — przycisk świeci.</summary>
        public int niezobaczone;

        public Odkrycia(string plik = "atlas.json")
        {
            PLIK = plik;
            try
            {
                var raw = Gospodarz.Pliki.Czytaj(PLIK);
                if (raw != null && Json.Czytaj(raw) is List<object?> l) foreach (var x in l) if (x is string s && !znane.Contains(s)) znane.Add(s);
            }
            catch { /* bez plików gracza: atlas żyje tylko w tej sesji */ }
        }

        public bool zna(string id) => znane.Contains(id);

        public int ile => Tablice.TABLICE.Count(t => znane.Contains(t.id));

        /// <summary>Odkrywa tablicę; zwraca true, gdy to naprawdę nowość.</summary>
        public bool odkryj(string id, bool pokaz = true)
        {
            if (znane.Contains(id) || !Tablice.TABLICE.Any(t => t.id == id)) return false;
            znane.Add(id);
            if (pokaz) kolejka.Add(id);
            else niezobaczone++;
            zapisz();
            return true;
        }

        void zapisz()
        {
            try { Gospodarz.Pliki.Zapisz(PLIK, Json.Pisz(znane.Cast<object?>().ToList())); } catch { /* bez pamięci */ }
        }

        static Odkrycia? alfa, kregu;
        /// <summary>Odkrycia bieżącego trybu: Alpha 1 i Krąg Trzeci mają osobne atlasy (osobne gry w TS).</summary>
        public static Odkrycia odkrycia => Symulacja.Krag.Wlaczony ? kregu ??= new Odkrycia("atlas-krag.json") : alfa ??= new Odkrycia("atlas.json");
    }

    public sealed class PoleTablicy { public string akcja = ""; public double x, y, w, h; }

    public static class RysTablica
    {
        public static bool wPolu(PoleTablicy p, double x, double y) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static Odkrycia odkrycia => Odkrycia.odkrycia;

        /// <summary>Rama planszy: podwójna linia i nacięcia w rogach, jak w starym atlasie.</summary>
        static void rama(IPlotno ctx, double x, double y, double w, double h, double alfa = 1)
        {
            ctx.save();
            ctx.fillStyle = "rgba(14,10,9,0.98)";
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = rgba(BARWA.atrament, 0.55 * alfa);
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11);
            ctx.strokeStyle = rgba(BARWA.atrament, 0.22 * alfa);
            ctx.strokeRect(x + 9.5, y + 9.5, w - 19, h - 19);
            var n = Math.Min(18, w * 0.06);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6 * alfa);
            ctx.beginPath();
            foreach (var (cx, cy, sx, sy) in new[] { (x, y, 1.0, 1.0), (x + w, y, -1.0, 1.0), (x, y + h, 1.0, -1.0), (x + w, y + h, -1.0, -1.0) })
            {
                ctx.moveTo(cx + sx * 2, cy + sy * (n + 2)); ctx.lineTo(cx + sx * 2, cy + sy * 2); ctx.lineTo(cx + sx * (n + 2), cy + sy * 2);
            }
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>
        /// Fresk zamiast ryciny (FRESKI.atlas): wycinek malowidła na jasnym tynku. False, gdy tablica fresku nie ma albo
        /// obrazek (czy tynk) jeszcze się wczytuje — wtedy rycina.
        /// </summary>
        static bool rysujFresk(IPlotno ctx, Tablica t, double w, double h)
        {
            if (!FRESKI.atlas.TryGetValue(t.id, out var nazwa) || Freski.obrazFresku(nazwa) == null || Fresk.wzor(ctx) == null) return false;
            var tlo = new Path2D(); tlo.rect(0, 0, w, h);
            Fresk.pigment(ctx, tlo, FRESK.tablicaJasna);
            var m = Math.Min(w, h) * 0.07;
            Freski.wpiszFresk(ctx, nazwa, m, m, w - m * 2, h - m * 2);
            return true;
        }

        static PlotnoRyciny plotno(IPlotno ctx, double w, double h, double t) => new PlotnoRyciny { ctx = ctx, w = w, h = h, t = t, p = 1, takt = 99, taktP = 1 };

        /// <summary>Rycina tablicy w zadanym prostokącie — przycięta, z winietą.</summary>
        static void rycina(IPlotno ctx, Tablica t, double x, double y, double w, double h, double teraz)
        {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.translate(x, y);
            var fresk = rysujFresk(ctx, t, w, h);
            if (!fresk) t.rycina(plotno(ctx, w, h, teraz));
            var g = ctx.createRadialGradient(w / 2, h / 2, Math.Min(w, h) * 0.3, w / 2, h / 2, Math.Max(w, h) * 0.75);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(1, Barwa.Rgba(8, 5, 4, fresk ? 0.45 : 0.7));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
            ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }

        /// <summary>[...tekst] w JS: znaki po punktach kodowych (para zastępcza to jeden znak).</summary>
        static List<string> znaki(string s)
        {
            var l = new List<string>();
            for (int i = 0; i < s.Length; i++)
            {
                if (char.IsHighSurrogate(s[i]) && i + 1 < s.Length) { l.Add(s.Substring(i, 2)); i++; }
                else l.Add(s[i].ToString());
            }
            return l;
        }

        /// <summary>Tytuł rozstrzelonymi wersalikami, jak podpis pod planszą.</summary>
        static void tytul(IPlotno ctx, string tekst, double cx, double y, double rozm)
        {
            ctx.font = $"600 {Js.Js.S(rozm)}px {Ink.SERIF_TYTUL}";
            var litery = znaki(tekst.ToUpperInvariant());
            var odstep = rozm * TABLICA.rozstrzelenie;
            var szer = litery.Sum(l => ctx.measureText(l).width) + odstep * (litery.Count - 1);
            var lx = cx - szer / 2;
            ctx.textAlign = "center";
            foreach (var l in litery)
            {
                var lw = ctx.measureText(l).width;
                ctx.fillText(l, lx + lw / 2, y);
                lx += lw + odstep;
            }
        }

        /// <summary>
        /// Pełna tablica: rycina u góry, pod nią nazwa, łaciński podpis, opis, „kiedy” i koszt. Zwraca wysokość, jakiej
        /// potrzebowała — okno dopasowuje się do treści.
        /// </summary>
        public static double rysujTablice(IPlotno ctx, Tablica t, double x, double y, double w, double maxH, double teraz)
        {
            var TB = TABLICA;
            var rozm = Math.Max(TB.rozmiar.min, Math.Min(TB.rozmiar.max, w / 24));
            var wew = w - 48;
            ctx.save();
            ctx.font = $"{Js.Js.S(rozm)}px {Ink.SERIF}";
            var lOpis = Ink.linieAkapitu(ctx, t.opis, wew);
            ctx.font = $"italic {Js.Js.S(rozm * 0.95)}px {Ink.SERIF}";
            var lKiedy = Ink.linieAkapitu(ctx, t.kiedy, wew - rozm * 1.4);
            var tekstH = rozm * 4.2 + lOpis * rozm * TB.interlinia + rozm * 0.9 + lKiedy * rozm * TB.interliniaKiedy + (t.koszt != null ? rozm * 1.6 : 0) + rozm * 1.2;
            var rycH = Math.Max(TB.rycinaMin, Math.Min(w * TB.rycinaMax, maxH - tekstH - 40));
            var h = rycH + tekstH + 40;
            rama(ctx, x, y, w, h);

            // numer tablicy w rogu — atlas ma porządek, nawet jeśli gracz odkrywa go na wyrywki
            var nr = Array.IndexOf(Tablice.TABLICE, t) + 1;
            ctx.font = $"italic {Js.Js.S(rozm * 0.72)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
            ctx.textAlign = "right";
            ctx.fillText($"Tab. {Ozdoby.rzymska(nr)}", x + w - 18, y + 26);
            ctx.textAlign = "left";
            ctx.fillText(Tablice.NAZWY_GRUP[t.grupa], x + 18, y + 26);

            rycina(ctx, t, x + 18, y + 36, w - 36, rycH, teraz);
            var yy = y + 36 + rycH + rozm * 1.9;
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.97);
            tytul(ctx, t.nazwa, x + w / 2, yy, rozm * TB.tytul);
            yy += rozm * 1.15;
            ctx.font = $"italic {Js.Js.S(rozm * 0.85)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.zarBlady, 0.85);
            ctx.textAlign = "center";
            ctx.fillText(t.lacina, x + w / 2, yy);
            Ink.naciecie(ctx, x + w / 2, yy + rozm * 0.55, Math.Min(220, w * 0.5), 0.3);
            yy += rozm * 1.6;
            ctx.font = $"{Js.Js.S(rozm)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atrament, 0.92);
            Ink.akapit(ctx, t.opis, x + 24, yy, wew, rozm * TB.interlinia);
            yy += lOpis * rozm * TB.interlinia + rozm * 0.5;
            // kiedy tego użyć — to jest to zdanie, po które gracz otwiera tablicę
            ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
            ctx.beginPath();
            ctx.moveTo(x + 26, yy - rozm * 0.62); ctx.lineTo(x + 26 + rozm * 0.6, yy - rozm * 0.34); ctx.lineTo(x + 26, yy - rozm * 0.06);
            ctx.closePath(); ctx.fill();
            ctx.font = $"italic {Js.Js.S(rozm * 0.95)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
            Ink.akapit(ctx, t.kiedy, x + 24 + rozm * 1.2, yy, wew - rozm * 1.2, rozm * TB.interliniaKiedy);
            yy += lKiedy * rozm * TB.interliniaKiedy;
            if (t.koszt != null)
            {
                yy += rozm * 0.4;
                ctx.font = $"{Js.Js.S(rozm * 0.82)}px {Ink.SERIF}";
                ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
                ctx.textAlign = "left";
                ctx.fillText($"Koszt: {t.koszt}", x + 24, yy);
            }
            ctx.restore();
            return h;
        }

        // ---------------------------------------------------------------- miniatury

        static readonly Dictionary<string, IPlotno> pamiecMiniatur = new Dictionary<string, IPlotno>();

        /// <summary>Miniatura z pamięci — dwadzieścia rycin co klatkę to za dużo kreskowania.</summary>
        static IPlotno miniatura(Tablica t, double w, double h)
        {
            var klucz = $"{t.id}:{Js.Js.S(Math.Floor(w + 0.5))}x{Js.Js.S(Math.Floor(h + 0.5))}";
            if (!pamiecMiniatur.TryGetValue(klucz, out var c))
            {
                c = Plotno.Nowe((int)Math.Max(1, Math.Floor(w + 0.5)), (int)Math.Max(1, Math.Floor(h + 0.5)));
                var fresk = rysujFresk(c, t, c.width, c.height);
                if (!fresk) t.rycina(plotno(c, c.width, c.height, 4000));
                // fresk jeszcze się wczytuje: rycina tylko na tę klatkę, za chwilę przyjdzie obrazek
                if (fresk || !FRESKI.atlas.ContainsKey(t.id)) pamiecMiniatur[klucz] = c;
            }
            return c;
        }

        static void malaTablica(IPlotno ctx, Tablica t, double x, double y, double w, double h, bool zaznaczona, double teraz)
        {
            var MN = MINIATURA;
            var znana = odkrycia.zna(t.id);
            var rozm = Math.Max(12, Math.Min(16, w / 9));
            var nr = Array.IndexOf(Tablice.TABLICE, t) + 1;
            ctx.save();
            // wskazana plansza unosi się o włos i dostaje cień — jak kartka wyjęta z teczki
            if (zaznaczona && znana)
            {
                ctx.shadowColor = Barwa.Rgba(0, 0, 0, MN.cienAlfa);
                ctx.shadowBlur = MN.cien;
                ctx.shadowOffsetY = MN.cienY;
                y -= MN.uniesienie;
            }
            rama(ctx, x, y, w, h, zaznaczona ? MN.ramaWskazana : MN.ramaZwykla);
            ctx.shadowColor = "transparent";
            // odcisk płyty: jasna krawędź u góry i z lewej, ciemna u dołu i z prawej
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(236,220,190,0.12)";
            ctx.beginPath(); ctx.moveTo(x + 2.5, y + h - 2.5); ctx.lineTo(x + 2.5, y + 2.5); ctx.lineTo(x + w - 2.5, y + 2.5); ctx.stroke();
            ctx.strokeStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath(); ctx.moveTo(x + w - 2.5, y + 2.5); ctx.lineTo(x + w - 2.5, y + h - 2.5); ctx.lineTo(x + 2.5, y + h - 2.5); ctx.stroke();
            double ax = x + 12, ay = y + 12, aw = w - 24, ah = h - 24 - rozm * 1.8;
            if (znana)
            {
                ctx.drawImage(miniatura(t, aw, ah), ax, ay, aw, ah);
                ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
                ctx.strokeRect(ax + 0.5, ay + 0.5, aw - 1, ah - 1);
                // numer tablicy w małej tabliczce w rogu ryciny
                var num = Ozdoby.rzymska(nr);
                ctx.font = $"{Js.Js.S(Math.Max(9, rozm * 0.62))}px {Ink.SERIF}";
                var nw = ctx.measureText(num).width + 8;
                ctx.fillStyle = "rgba(14,10,9,0.9)";
                ctx.fillRect(ax + 3, ay + 3, nw, rozm * 0.9);
                ctx.strokeStyle = rgba(BARWA.atrament, 0.4);
                ctx.strokeRect(ax + 3.5, ay + 3.5, nw - 1, rozm * 0.9 - 1);
                ctx.fillStyle = rgba(BARWA.atrament, 0.85);
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(num, ax + 3 + nw / 2, ay + 3 + rozm * 0.46);
                ctx.textBaseline = "alphabetic";
            }
            else
            {
                // zapieczętowana: zatarta plansza z woskową pieczęcią, na której jest cudzy znak
                var p = new Path2D();
                p.rect(ax, ay, aw, ah);
                ctx.fillStyle = "rgba(20,15,13,1)";
                ctx.fill(p);
                Ryciny.kreskuj(ctx, p, 0.8, 4, rgba(BARWA.atrament, 0.1), 1);
                Ryciny.kreskuj(ctx, p, -0.8, 7, rgba(BARWA.atrament, 0.05), 1);
                double px = ax + aw / 2, py = ay + ah / 2, pr = Math.Min(aw, ah) * MN.pieczec;
                var puls = (1 - MN.puls) + MN.puls * JsM.Sin(teraz * 0.002 + x * 0.01);
                ctx.beginPath();
                for (int i = 0; i <= 16; i++)
                {
                    var a = (i / 16.0) * Math.PI * 2;
                    var rr = pr * (1 + 0.08 * JsM.Sin(i * 2.7 + nr));
                    if (i == 0) ctx.moveTo(px + JsM.Cos(a) * rr, py + JsM.Sin(a) * rr); else ctx.lineTo(px + JsM.Cos(a) * rr, py + JsM.Sin(a) * rr);
                }
                ctx.closePath();
                var wosk = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr);
                wosk.addColorStop(0, $"rgba({MN.woskJasny},{Js.Js.S(0.9 * puls)})");
                wosk.addColorStop(1, $"rgba({MN.woskCiemny},{Js.Js.S(0.95 * puls)})");
                ctx.fillStyle = wosk;
                ctx.fill();
                ctx.strokeStyle = "rgba(40,6,6,0.8)";
                ctx.stroke();
                ctx.save();
                ctx.translate(px, py);
                ctx.scale(pr * 0.5, pr * 0.5);
                ctx.lineWidth = 1.4 / (pr * 0.5);
                ctx.strokeStyle = "rgba(255,190,160,0.55)";
                ctx.stroke(Tajemnica.glif(40 + nr * 7, 1));
                ctx.restore();
            }
            ctx.font = $"{Js.Js.S(rozm)}px {Ink.SERIF}";
            ctx.textAlign = "center";
            ctx.fillStyle = znana ? rgba(BARWA.atramentMocny, zaznaczona ? 1 : 0.88) : rgba(BARWA.atramentCichy, 0.55);
            ctx.fillText(znana ? t.nazwa : $"Tab. {Ozdoby.rzymska(nr)}", x + w / 2, y + h - 12 - rozm * 0.25);
            if (zaznaczona && znana)
            {
                ctx.strokeStyle = rgba(BARWA.zarBlady, MN.naroznikAlfa);
                ctx.lineWidth = MN.naroznikGrubosc;
                var n = Math.Min(16, w * 0.14);
                ctx.beginPath();
                foreach (var (cx, cy, sx, sy) in new[] { (x, y, 1.0, 1.0), (x + w, y, -1.0, 1.0), (x, y + h, 1.0, -1.0), (x + w, y + h, -1.0, -1.0) })
                {
                    ctx.moveTo(cx + sx * 1, cy + sy * n); ctx.lineTo(cx + sx * 1, cy + sy * 1); ctx.lineTo(cx + sx * n, cy + sy * 1);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Siatka atlasu: grupy tablic jedna pod drugą, miniatury w rzędach. Zwraca pola trafień (id tablicy) i największe możliwe przewinięcie.</summary>
        public static (List<PoleTablicy> pola, double maxPrzewin) rysujAtlas(IPlotno ctx, double x, double y, double w, double h, double przewin, double teraz, (double x, double y) pod)
        {
            var pola = new List<PoleTablicy>();
            var kol = Math.Max(ATLAS.kolumny.min, Math.Min(ATLAS.kolumny.max, Math.Floor(w / ATLAS.kolumny.szerokosc)));
            var odstep = ATLAS.odstep;
            double tw = (w - odstep * (kol - 1)) / kol, th = tw * ATLAS.proporcje;
            var rozm = Math.Max(14, Math.Min(19, w / 40));
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 4, y, w + 8, h);
            ctx.clip();
            var yy = y - przewin;
            var grupy = ATLAS.grupy;
            foreach (var g in grupy)
            {
                var lista = Tablice.TABLICE.Where(t => t.grupa == g).ToList();
                var znane = lista.Count(t => odkrycia.zna(t.id));
                yy += rozm * 1.4;
                Ozdoby.naglowekDzialu(ctx, Tablice.NAZWY_GRUP[g], x, yy - rozm * 0.3, w, rozm * 0.8, 1, 60 + Array.IndexOf(grupy, g) * 11, $"{znane} z {lista.Count}");
                yy += rozm * 0.9;
                for (int i = 0; i < lista.Count; i++)
                {
                    var tx = x + (i % kol) * (tw + odstep);
                    var ty = yy + Math.Floor(i / kol) * (th + odstep);
                    if (ty + th > y - 10 && ty < y + h + 10)
                    {
                        var nad = pod.x >= tx && pod.x <= tx + tw && pod.y >= ty && pod.y <= ty + th && pod.y >= y && pod.y <= y + h;
                        malaTablica(ctx, lista[i], tx, ty, tw, th, nad, teraz);
                        if (ty + th > y && ty < y + h) pola.Add(new PoleTablicy { akcja = lista[i].id, x = tx, y = Math.Max(y, ty), w = tw, h = Math.Min(ty + th, y + h) - Math.Max(y, ty) });
                    }
                }
                yy += Math.Ceiling(lista.Count / kol) * (th + odstep) + rozm * 0.4;
            }
            ctx.restore();
            var calosc = yy + przewin - y;
            return (pola, Math.Max(0, calosc - h));
        }
    }

    /// <summary>Okno atlasu nad płytą albo nad menu: jedna tablica albo cała siatka. Świat pod spodem stoi, dopóki okno jest otwarte.</summary>
    public sealed class OknoAtlasu
    {
        /// <summary>Podmienia {ile} i {z} w napisie.</summary>
        public static string zLiczbami(string tekst, double ile, double z) => ZamienPierwsze(ZamienPierwsze(tekst, "{ile}", Js.Js.S(ile)), "{z}", Js.Js.S(z));
        static string ZamienPierwsze(string s, string a, string b) { var i = s.IndexOf(a, StringComparison.Ordinal); return i < 0 ? s : s.Substring(0, i) + b + s.Substring(i + a.Length); }
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static Odkrycia odkrycia => Odkrycia.odkrycia;

        /// <summary>'zamkniete' | 'tablica' | 'atlas'</summary>
        public string tryb = "zamkniete";
        string id = "";
        bool nowa;
        double przewin, maxPrzewin;
        List<PoleTablicy> pola = new List<PoleTablicy>();
        (double x, double y) kursor = (-1, -1);
        /// <summary>Z atlasu do tablicy i z powrotem — „wstecz” wraca tam, skąd przyszedłeś.</summary>
        bool zAtlasu;
        /// <summary>Odstęp od brzegu ekranu — w menu okno stoi w ozdobnej ramie i nie może na nią wchodzić.</summary>
        public double margines = 16;

        public bool otwarte => tryb != "zamkniete";

        /// <summary>Co teraz leży na stole — zmiana to przewrócona karta, a karta ma swój szelest.</summary>
        public string strona => tryb == "tablica" ? $"tablica:{id}" : tryb;

        public void otworzTablice(string idT, bool nowaT = false)
        {
            if (Tablice.tablica(idT) == null) return;
            id = idT; nowa = nowaT; tryb = "tablica"; zAtlasu = false;
        }

        public void otworzAtlas() { tryb = "atlas"; nowa = false; odkrycia.niezobaczone = 0; }

        public void zamknij() { tryb = "zamkniete"; }

        public void rysuj(IPlotno ctx, double w, double h, double teraz, bool tlo = true)
        {
            var A = ATLAS;
            pola = new List<PoleTablicy>();
            if (!otwarte) return;
            ctx.save();
            if (tlo) { ctx.fillStyle = Barwa.Rgba(6, 4, 3, A.tloAlfa); ctx.fillRect(0, 0, w, h); }
            var rozm = Math.Max(A.rozmiar.min, Math.Min(A.rozmiar.max, w / 60));
            if (tryb == "tablica")
            {
                var t = Tablice.tablica(id)!;
                var tw = Math.Min(A.maxTablica, w - Math.Max(24, margines * 2));
                var gora = (nowa ? rozm * 3.2 : rozm * 2.4) + Math.Max(0, margines - 16);
                double x = (w - tw) / 2, y = Math.Max(8, gora);
                RysTablica.rysujTablice(ctx, t, x, y, tw, h - y - Math.Max(12, margines), teraz);
                if (nowa)
                {
                    ctx.font = $"{Js.Js.S(rozm * 0.85)}px {Ink.SERIF}";
                    ctx.textAlign = "center";
                    ctx.fillStyle = rgba(BARWA.zarBlady, 0.75 + 0.25 * JsM.Sin(teraz * 0.004));
                    ctx.fillText(A.nowaTablica, w / 2, y - rozm * 0.9);
                }
                // nad tablicą: do atlasu i zamknij
                ctx.font = $"italic {Js.Js.S(rozm)}px {Ink.SERIF}";
                var lewy = zAtlasu ? A.wstecz : A.doAtlasu;
                ctx.textAlign = "left";
                ctx.fillStyle = rgba(BARWA.atrament, 0.9);
                var ly = y - rozm * (nowa ? 2.1 : 0.7);
                ctx.fillText(lewy, x, ly);
                pola.Add(new PoleTablicy { akcja = "atlas", x = x - 6, y = ly - rozm, w = ctx.measureText(lewy).width + 12, h = rozm * 1.5 });
                ctx.textAlign = "right";
                var zam = A.zamknij;
                ctx.fillText(zam, x + tw, ly);
                var zw = ctx.measureText(zam).width;
                pola.Add(new PoleTablicy { akcja = "zamknij", x = x + tw - zw - 6, y = ly - rozm, w = zw + 12, h = rozm * 1.5 });
                pola.Add(new PoleTablicy { akcja = "tlo-tablicy", x = x, y = y, w = tw, h = h - y });
            }
            else
            {
                var aw = Math.Min(A.maxSiatka, w - margines * 2);
                var x = (w - aw) / 2;
                var gora = margines + rozm * 0.6;
                // tytuł nie może wejść na „zamknij ×” po prawej — na wąskim ekranie maleje
                ctx.font = $"italic {Js.Js.S(rozm * 0.85)}px {Ink.SERIF}";
                var zwMiejsce = ctx.measureText(A.zamknij).width + 16;
                var rt = Ozdoby.dopasujKartusz(ctx, A.tytul, Math.Max(A.tytulRozmiar.min, Math.Min(A.tytulRozmiar.max, w / 24)), (aw / 2 - zwMiejsce) * 2);
                Ozdoby.kartusz(ctx, w / 2, gora + rt * 1.05, A.tytul, rt, 1);
                // postęp: kreska z kropką na każdą tablicę, zapełnione — odkryte
                var py = gora + rt * 1.7;
                var n = Tablice.TABLICE.Length; var pw = Math.Min(aw * 0.6, n * A.kropkaOdstep);
                for (int i = 0; i < n; i++)
                {
                    var px = w / 2 - pw / 2 + (i + 0.5) * (pw / n);
                    var zna = odkrycia.zna(Tablice.TABLICE[i].id);
                    ctx.fillStyle = zna ? rgba(BARWA.zarBlady, A.kropkaAlfa) : rgba(BARWA.atramentCichy, A.kropkaNieznanaAlfa);
                    ctx.beginPath(); ctx.arc(px, py, zna ? 2.4 : 1.6, 0, Math.PI * 2); ctx.fill();
                }
                ctx.textAlign = "center";
                var postep = zLiczbami(A.postep, odkrycia.ile, Tablice.TABLICE.Length);
                var rp = rozm * 0.85;
                ctx.font = $"italic {Js.Js.S(rp)}px {Ink.SERIF}";
                var pw0 = ctx.measureText(postep).width;
                if (pw0 > aw - 8) { rp *= (aw - 8) / pw0; ctx.font = $"italic {Js.Js.S(rp)}px {Ink.SERIF}"; }
                ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
                ctx.fillText(postep, w / 2, py + rozm * 1.3);
                var y = py + rozm * 2;
                var r = RysTablica.rysujAtlas(ctx, x, y, aw, h - y - (margines > 16 ? margines : rozm * 2), przewin, teraz, kursor);
                maxPrzewin = r.maxPrzewin;
                przewin = Math.Min(przewin, maxPrzewin);
                pola.AddRange(r.pola.Select(p => new PoleTablicy { akcja = "tab:" + p.akcja, x = p.x, y = p.y, w = p.w, h = p.h }));
                ctx.font = $"italic {Js.Js.S(rozm * 0.85)}px {Ink.SERIF}";
                ctx.fillStyle = rgba(BARWA.atrament, 0.9);
                ctx.textAlign = "right";
                var zam = A.zamknij;
                ctx.fillText(zam, x + aw, gora + rozm * 1.2);
                var zw = ctx.measureText(zam).width;
                pola.Add(new PoleTablicy { akcja = "zamknij", x = x + aw - zw - 6, y = gora + rozm * 0.2, w = zw + 12, h = rozm * 1.5 });
                ctx.textAlign = "center";
                ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6);
                // w ramie menu ta sama podpowiedź stoi na dolnym marginesie ramy
                if (margines <= 16) ctx.fillText(A.podpowiedz, w / 2, h - rozm * 0.7);
            }
            ctx.restore();
        }

        public void ruch(double x, double y) { kursor = (x, y); }

        /// <summary>Dotknięcie w otwartym oknie; zwraca true, gdy okno je obsłużyło.</summary>
        public bool dotyk(double x, double y)
        {
            if (!otwarte) return false;
            foreach (var p in pola)
            {
                if (!RysTablica.wPolu(p, x, y)) continue;
                if (p.akcja == "zamknij") { zamknij(); return true; }
                if (p.akcja == "atlas")
                {
                    if (tryb == "tablica") { tryb = "atlas"; nowa = false; }
                    return true;
                }
                if (p.akcja == "tlo-tablicy") return true;
                if (p.akcja.StartsWith("tab:"))
                {
                    var idT = p.akcja.Substring(4);
                    if (odkrycia.zna(idT)) { otworzTablice(idT); zAtlasu = true; }
                    return true;
                }
            }
            // poza tablicą: z tablicy otwartej z atlasu wraca do atlasu, inaczej zamyka
            if (tryb == "tablica" && zAtlasu) tryb = "atlas";
            else zamknij();
            return true;
        }

        public void kolko(double dy)
        {
            if (tryb != "atlas") return;
            przewin = Math.Max(0, Math.Min(maxPrzewin, przewin + dy));
        }

        public bool klawisz(string k)
        {
            if (!otwarte) return false;
            if (k == "Escape" || k == "Enter" || k == " ")
            {
                if (tryb == "tablica" && zAtlasu) tryb = "atlas";
                else zamknij();
                return true;
            }
            if (tryb == "atlas" && (k == "ArrowDown" || k == "ArrowUp")) { kolko(k == "ArrowDown" ? ATLAS.przewinStrzalka : -ATLAS.przewinStrzalka); return true; }
            return true;
        }
    }
}
