// Port: alpha-1/src/render/ozdoby.ts — ozdoby wspólne dla ekranów: rama ryciny z napisami na marginesie, kartusz
// tytułowy, przerywniki, nagłówki działów, znaki pozycji menu, liczebniki rzymskie, rama karty w grze i etykieta
// marginesu. Rysowane jak frontyspis starej księgi — cienka kreska, zwoje, kropki.
using System;
using System.Globalization;
using System.Linq;
using Trzewia.Plotna;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyWygladOzdoby;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Ozdoby
    {
        static string S(double v) => Js.Js.S(v);

        /// <summary>Znaki tekstu jak [...tekst] w JS (punkty kodowe, nie połówki UTF-16).</summary>
        public static string[] Litery(string tekst)
        {
            var e = StringInfo.GetTextElementEnumerator(tekst);
            var l = new System.Collections.Generic.List<string>();
            while (e.MoveNext()) l.Add((string)e.Current);
            return l.ToArray();
        }

        /// <summary>Tekst rozstrzelony litera po literze. Zwraca szerokość całości.</summary>
        public static double rozstrzel(IPlotno ctx, string tekst, double x, double y, double odstep)
        {
            var litery = Litery(tekst);
            var szer = litery.Select(l => ctx.measureText(l).width).ToArray();
            var calosc = szer.Sum() + odstep * (litery.Length - 1);
            var wyr = ctx.textAlign;
            var lx = wyr == "center" ? x - calosc / 2 : wyr == "right" ? x - calosc : x;
            ctx.save();
            ctx.textAlign = "left";
            for (int i = 0; i < litery.Length; i++) { ctx.fillText(litery[i], lx, y); lx += szer[i] + odstep; }
            ctx.restore();
            return calosc;
        }

        /// <summary>Zwój: ślimacznica z kilku obrotów — róg ramy, koniec kartusza.</summary>
        public static void zwoj(IPlotno ctx, double x, double y, double r, double kier, double obroty = 1.6)
        {
            ctx.beginPath();
            const int n = 40;
            for (int i = 0; i <= n; i++)
            {
                var t = (double)i / n;
                var a = kier * t * Math.PI * 2 * obroty;
                var rr = r * (1 - t * 0.85);
                double px = x + JsM.Cos(a) * rr, py = y + JsM.Sin(a) * rr;
                if (i == 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        /// <summary>
        /// Rama ekranu malowana jak obramowanie fresku; napisy na marginesie leżą na tabliczkach ciemnego tynku.
        /// </summary>
        public static void ramaRyciny(IPlotno ctx, double w, double h, double alfa, string napis, string podpis, double teraz = 0)
        {
            var R = RAMA;
            var m = Math.Max(R.margines.min, Math.Min(R.margines.max, w * R.margines.czesc));
            var d = Math.Max(R.pas.min, Math.Min(R.pas.max, w * R.pas.czesc));
            ctx.save();
            ctx.globalAlpha *= alfa;
            Fresk.ramaFresku(ctx, m, m, w - m * 2, h - m * 2, d * 0.62, teraz, 2);
            var rozm = Math.Max(R.napis.min, Math.Min(R.napis.max, w / R.napis.dzielnik));
            ctx.font = $"{S(rozm)}px {Ink.SERIF}";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            foreach (var (tekst, y) in new[] { (napis, m + d / 2), (podpis, h - m - d / 2) })
            {
                if (string.IsNullOrEmpty(tekst)) continue;
                var t = tekst.ToUpperInvariant();
                var odst = rozm * R.napisRozstrzelenie;
                var lit = Litery(t);
                var szer = lit.Sum(l => ctx.measureText(l).width) + odst * (lit.Length - 1);
                var th = rozm * 1.9;
                Fresk.tablica(ctx, w / 2 - szer / 2 - rozm * 1.2, y - th / 2, szer + rozm * 2.4, th);
                ctx.fillStyle = FRESK.tekst;
                ctx.globalAlpha = alfa * R.alfaNapisu * 1.2;
                rozstrzel(ctx, t, w / 2, y + 0.5, odst);
                ctx.globalAlpha = alfa;
            }
            ctx.restore();
        }

        /// <summary>Pełna szerokość kartusza (ze zwojami) dla danego napisu i rozmiaru.</summary>
        public static double szerokoscKartusza(IPlotno ctx, string tekst, double rozmiar)
        {
            var K = KARTUSZ;
            ctx.save();
            ctx.font = $"{S(K.waga)} {S(rozmiar)}px {Ink.SERIF_TYTUL}";
            var lit = Litery(tekst);
            var szer = lit.Sum(l => ctx.measureText(l).width) + rozmiar * K.rozstrzelenie * (lit.Length - 1);
            ctx.restore();
            return szer + rozmiar * K.poszerzenie + rozmiar * K.wysokosc * 1.1;
        }

        /// <summary>Największy rozmiar tytułu (nie większy niż `rozmiar`), przy którym kartusz zmieści się w `maxSzer`.</summary>
        public static double dopasujKartusz(IPlotno ctx, string tekst, double rozmiar, double maxSzer)
        {
            var s = szerokoscKartusza(ctx, tekst, rozmiar);
            return s <= maxSzer ? rozmiar : Math.Max(12, rozmiar * maxSzer / s);
        }

        /// <summary>Kartusz: pas pergaminu zwinięty na końcach, na którym stoi tytuł. Zwraca szerokość napisu.</summary>
        public static double kartusz(IPlotno ctx, double x, double y, string tekst, double rozmiar, double alfa, string nadtytul = "", string podtytul = "")
        {
            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            var K = KARTUSZ;
            ctx.font = $"{S(K.waga)} {S(rozmiar)}px {Ink.SERIF_TYTUL}";
            var odst = rozmiar * K.rozstrzelenie;
            var litery = Litery(tekst);
            var szer = litery.Sum(l => ctx.measureText(l).width) + odst * (litery.Length - 1);
            double pw = szer + rozmiar * K.poszerzenie, ph = rozmiar * K.wysokosc;
            double px = x - pw / 2, py = y - rozmiar * 0.95;
            // wstęga: górna i dolna krawędź lekko wygięte, końce zwinięte w zwoje
            ctx.lineWidth = K.grubosc;
            ctx.strokeStyle = Paleta.rgba(BARWA.atrament, K.alfaWstegi * alfa);
            ctx.beginPath();
            ctx.moveTo(px, py + ph * 0.12);
            ctx.quadraticCurveTo(x, py - ph * 0.1, px + pw, py + ph * 0.12);
            ctx.moveTo(px, py + ph * 0.92);
            ctx.quadraticCurveTo(x, py + ph * 1.12, px + pw, py + ph * 0.92);
            ctx.stroke();
            foreach (var (sx, kx) in new[] { (-1.0, px), (1.0, px + pw) })
            {
                ctx.beginPath();
                ctx.moveTo(kx, py + ph * 0.12);
                ctx.bezierCurveTo(kx + sx * ph * 0.5, py + ph * 0.1, kx + sx * ph * 0.55, py + ph * 0.55, kx + sx * ph * 0.2, py + ph * 0.52);
                ctx.moveTo(kx, py + ph * 0.92);
                ctx.bezierCurveTo(kx + sx * ph * 0.5, py + ph * 0.95, kx + sx * ph * 0.55, py + ph * 0.5, kx + sx * ph * 0.2, py + ph * 0.52);
                ctx.stroke();
                zwoj(ctx, kx + sx * ph * 0.34, py + ph * 0.52, ph * 0.16, sx);
                // kiście linek pod zwojami
                ctx.beginPath();
                ctx.moveTo(kx + sx * ph * 0.34, py + ph * 0.7);
                ctx.lineTo(kx + sx * ph * 0.34, py + ph * 1.25);
                ctx.stroke();
            }
            // litery: rowek cienia, potem światło
            var lx = x - szer / 2;
            ctx.textAlign = "left";
            foreach (var l in litery)
            {
                var lw = ctx.measureText(l).width;
                ctx.fillStyle = Paleta.rgba("#000000", K.alfaCienia * alfa);
                ctx.fillText(l, lx + rozmiar * K.cienX, y + rozmiar * K.cienY);
                ctx.fillStyle = Paleta.rgba(BARWA.atramentMocny, alfa);
                ctx.fillText(l, lx, y);
                lx += lw + odst;
            }
            ctx.textAlign = "center";
            if (!string.IsNullOrEmpty(nadtytul))
            {
                var r = Math.Max(K.nadtytul.min, rozmiar * K.nadtytul.czesc);
                ctx.font = $"{S(r)}px {Ink.SERIF}";
                ctx.fillStyle = Paleta.rgba(BARWA.atrament, K.nadtytul.alfa * alfa);
                rozstrzel(ctx, nadtytul.ToUpperInvariant(), x, py - r * 0.9, r * K.nadtytul.rozstrzelenie);
            }
            if (!string.IsNullOrEmpty(podtytul))
            {
                var r = Math.Max(K.podtytul.min, rozmiar * K.podtytul.czesc);
                ctx.font = $"italic {S(r)}px {Ink.SERIF}";
                ctx.fillStyle = Paleta.rgba(BARWA.atrament, K.podtytul.alfa * alfa);
                ctx.fillText(podtytul, x, py + ph + r * K.podtytul.odstep);
            }
            ctx.restore();
            return szer;
        }

        /// <summary>Przerywnik: kreska, romb pośrodku i dwa drobne zwoje po bokach rombu.</summary>
        public static void przerywnik(IPlotno ctx, double x, double y, double szer, double alfa)
        {
            var P = PRZERYWNIK;
            ctx.save();
            ctx.strokeStyle = Paleta.rgba(BARWA.atrament, P.alfaKreski * alfa);
            ctx.lineWidth = 1;
            Ink.kreska(ctx, x - szer / 2, y, x - P.przerwa, y, 0.6, 24);
            Ink.kreska(ctx, x + P.przerwa, y, x + szer / 2, y, 0.6, 24);
            zwoj(ctx, x - P.zwojOdstep, y, P.zwojPromien, 1, 1.2);
            zwoj(ctx, x + P.zwojOdstep, y, P.zwojPromien, -1, 1.2);
            ctx.fillStyle = Paleta.rgba(BARWA.zarBlady, P.alfaRombu * alfa);
            ctx.beginPath();
            ctx.moveTo(x, y - P.romb); ctx.lineTo(x + P.romb, y); ctx.lineTo(x, y + P.romb); ctx.lineTo(x - P.romb, y);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }

        /// <summary>Nagłówek działu: rozstrzelone kapitaliki, glif i kreska do prawego brzegu.</summary>
        public static void naglowekDzialu(IPlotno ctx, string tekst, double x, double y, double szer, double rozmiar, double alfa, double ziarno, string prawy = "")
        {
            ctx.save();
            ctx.textBaseline = "middle";
            var N = NAGLOWEK_DZIALU;
            // wąsko: pismo maleje, aż napis, dopisek i odrobina kreski zmieszczą się w szerokości
            for (int k = 0; k < 10; k++)
            {
                ctx.font = $"{S(rozmiar)}px {Ink.SERIF}";
                var t0 = tekst.ToUpperInvariant();
                var l0 = Litery(t0);
                var tw0 = l0.Sum(l => ctx.measureText(l).width) + rozmiar * N.rozstrzelenie * (l0.Length - 1);
                ctx.font = $"italic {S(rozmiar * 0.85)}px {Ink.SERIF}";
                var pw = prawy != "" ? ctx.measureText(prawy).width + rozmiar : 0;
                if (rozmiar * N.kolko * N.wciecie + tw0 + pw + rozmiar * 1.6 <= szer || rozmiar < 9) break;
                rozmiar *= 0.92;
            }
            // glif działu w kółku
            var r = rozmiar * N.kolko;
            ctx.strokeStyle = Paleta.rgba(BARWA.zarBlady, N.alfaKolka * alfa);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(x + r, y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.save();
            ctx.translate(x + r, y);
            ctx.scale(r * 0.55, r * 0.55);
            ctx.lineWidth = 1.2 / (r * 0.55);
            ctx.stroke(Tajemnica.glif(ziarno, 1));
            ctx.restore();
            ctx.font = $"{S(rozmiar)}px {Ink.SERIF}";
            ctx.textAlign = "left";
            ctx.fillStyle = Paleta.rgba(BARWA.zarBlady, N.alfaTekstu * alfa);
            var tw = rozstrzel(ctx, tekst.ToUpperInvariant(), x + r * N.wciecie, y + 1, rozmiar * N.rozstrzelenie);
            var koniec = x + szer;
            if (prawy != "")
            {
                ctx.textAlign = "right";
                ctx.font = $"italic {S(rozmiar * 0.85)}px {Ink.SERIF}";
                ctx.fillStyle = Paleta.rgba(BARWA.atramentCichy, N.alfaDopisku * alfa);
                ctx.fillText(prawy, x + szer, y + 1);
                koniec -= ctx.measureText(prawy).width + rozmiar;
            }
            ctx.strokeStyle = Paleta.rgba(BARWA.atrament, N.alfaKreski * alfa);
            Ink.kreska(ctx, x + r * N.wciecie + tw + rozmiar * 0.8, y, koniec, y, 0.5, 30);
            ctx.restore();
        }

        /// <summary>Znak pozycji menu — mała rycina: oko, zwój, klepsydra, dłoń, księga, klucz.</summary>
        public static void znakPozycji(IPlotno ctx, string id, double x, double y, double s)
        {
            ctx.save();
            ctx.translate(x, y);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            switch (id)
            {
                case "wroc":        // strzała w dół, w głąb — wracasz do swoich trzewi
                    ctx.moveTo(0, -s); ctx.lineTo(0, s * 0.8);
                    ctx.moveTo(-s * 0.55, s * 0.25); ctx.lineTo(0, s * 0.85); ctx.lineTo(s * 0.55, s * 0.25);
                    break;
                case "nowa":        // otwierające się oko
                    ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 1.1, s, 0); ctx.quadraticCurveTo(0, s * 1.1, -s, 0);
                    ctx.moveTo(s * 0.34, 0); ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2);
                    for (int i = -2; i <= 2; i++) { ctx.moveTo(i * s * 0.4, -s * 0.72); ctx.lineTo(i * s * 0.5, -s * 1.05); }
                    break;
                case "wczytaj":     // klepsydra
                    ctx.moveTo(-s * 0.6, -s); ctx.lineTo(s * 0.6, -s); ctx.lineTo(-s * 0.6, s); ctx.lineTo(s * 0.6, s); ctx.closePath();
                    break;
                case "samouczek":   // dłoń wskazująca
                    ctx.moveTo(-s, s * 0.3); ctx.lineTo(-s * 0.1, s * 0.3); ctx.lineTo(s, s * 0.3);
                    ctx.moveTo(-s * 0.1, s * 0.3); ctx.lineTo(-s * 0.1, s * 0.9); ctx.lineTo(-s, s * 0.9); ctx.lineTo(-s, s * 0.3);
                    ctx.moveTo(s, s * 0.3); ctx.lineTo(s * 0.55, -s * 0.1);
                    break;
                case "bestiariusz": // otwarta księga
                    ctx.moveTo(0, -s * 0.7); ctx.lineTo(0, s * 0.9);
                    ctx.moveTo(0, -s * 0.7); ctx.quadraticCurveTo(-s * 0.5, -s, -s, -s * 0.75); ctx.lineTo(-s, s * 0.7); ctx.quadraticCurveTo(-s * 0.5, s * 0.5, 0, s * 0.9);
                    ctx.moveTo(0, -s * 0.7); ctx.quadraticCurveTo(s * 0.5, -s, s, -s * 0.75); ctx.lineTo(s, s * 0.7); ctx.quadraticCurveTo(s * 0.5, s * 0.5, 0, s * 0.9);
                    break;
                case "osiagniecia": // pięcioramienna gwiazda — wieniec celów
                    for (int i = 0; i <= 5; i++)
                    {
                        var a = -Math.PI / 2 + i * (Math.PI * 4 / 5);
                        if (i == 0) ctx.moveTo(JsM.Cos(a) * s, JsM.Sin(a) * s);
                        else ctx.lineTo(JsM.Cos(a) * s, JsM.Sin(a) * s);
                    }
                    break;
                default:            // klucz — ustawienia
                    ctx.arc(-s * 0.4, 0, s * 0.45, 0, Math.PI * 2);
                    ctx.moveTo(s * 0.05, 0); ctx.lineTo(s, 0);
                    ctx.moveTo(s * 0.7, 0); ctx.lineTo(s * 0.7, s * 0.4);
                    ctx.moveTo(s * 0.45, 0); ctx.lineTo(s * 0.45, s * 0.3);
                    break;
            }
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>Liczebnik rzymski — numery plansz, pozycji i tablic.</summary>
        public static string rzymska(double n)
        {
            var t = new (double v, string z)[] { (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I") };
            var s = "";
            foreach (var (v, z) in t) while (n >= v) { s += z; n -= v; }
            return s;
        }

        /// <summary>
        /// Rama karty w grze: tablica ciemnego tynku z malowanym brzegiem i — jeśli podany — tytuł rozstrzelonymi
        /// kapitalikami na wstędze czerwieni ziemi przerzuconej przez górny brzeg.
        /// </summary>
        public static void ramaKarty(IPlotno ctx, double x, double y, double w, double h, double alfa = 1, string tytul = "", bool akcent = false)
        {
            var K = KARTA;
            ctx.save();
            Fresk.tablica(ctx, x, y, w, h, false, alfa);
            if (akcent)
            {
                ctx.strokeStyle = Paleta.rgba(BARWA.zarBlady, 0.55 * alfa);
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
            }
            if (tytul != "")
            {
                var r = K.tytulRozmiar;
                ctx.font = $"{S(r)}px {Ink.SERIF}";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                var t = tytul.ToUpperInvariant();
                var odst = r * 0.32;
                var lit = Litery(t);
                var tw = lit.Sum(l => ctx.measureText(l).width) + odst * (lit.Length - 1);
                var pol = Math.Min(tw / 2 + r, w / 2 - 12);
                var wst = new Path2D();
                wst.rect(x + w / 2 - pol, y - r * 0.75, pol * 2, r * 1.5);
                ctx.globalAlpha *= alfa;
                Fresk.pigment(ctx, wst, FRESK.czerwien);
                ctx.strokeStyle = FRESK.sinopia; ctx.lineWidth = 1; ctx.stroke(wst);
                ctx.fillStyle = FRESK.tekst;
                rozstrzel(ctx, t, x + w / 2, y + 0.5, odst);
            }
            ctx.restore();
        }

        /// <summary>Mały napis-etykieta działu na marginesie płyty: rozstrzelone kapitaliki i kreska.</summary>
        public static void etykietaMarginesu(IPlotno ctx, string tekst, double x, double y, double szer, double alfa = 1)
        {
            var r = KARTA.etykietaRozmiar;
            ctx.save();
            ctx.font = $"{S(r)}px {Ink.SERIF}";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = Paleta.rgba(BARWA.zarBlady, KARTA.etykietaAlfa * alfa);
            var tw = rozstrzel(ctx, tekst.ToUpperInvariant(), x, y, r * 0.3);
            if (szer > tw + r * 2)
            {
                ctx.strokeStyle = Paleta.rgba(BARWA.atrament, 0.2 * alfa);
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x + tw + r * 0.8, y + 0.5); ctx.lineTo(x + szer, y + 0.5); ctx.stroke();
            }
            ctx.restore();
        }
    }

    /// <summary>
    /// Port: alpha-1/src/render/freski.ts — duże freski (wycinki prawdziwych malowideł z dane/grafika/freski/): ilustracje
    /// kart, tablic atlasu i ekranu końca, fryz nad kartą, medaliony osiągnięć, złota nisza postaci.
    /// </summary>
    public static class Freski
    {
        static readonly System.Collections.Generic.Dictionary<string, IObraz?> obrazy = new System.Collections.Generic.Dictionary<string, IObraz?>();

        static string? plik(string nazwa)
        {
            foreach (var r in new[] { ".webp", ".jpg" })
                if (Rdzen.Zasoby.Istnieje("grafika/freski/" + nazwa + r)) return "grafika/freski/" + nazwa + r;
            return null;
        }

        /// <summary>Obraz fresku albo null, gdy takiego nie ma.</summary>
        public static IObraz? obrazFresku(string nazwa)
        {
            if (!obrazy.TryGetValue(nazwa, out var o))
            {
                var p = plik(nazwa);
                o = p != null ? Plotno.Wczytaj(p) : null;
                obrazy[nazwa] = o;
            }
            return o != null && o.complete && o.width > 0 ? o : null;
        }

        /// <summary>Czy taki fresk w ogóle jest w grze.</summary>
        public static bool jestFresk(string nazwa) => plik(nazwa) != null;

        /// <summary>Wpisuje cały fresk w prostokąt, bez przycinania; `dol` stawia go na dolnej krawędzi.</summary>
        public static (double x, double y, double w, double h)? wpiszFresk(IPlotno ctx, string nazwa, double x, double y, double w, double h, bool dol = false, double alfa = 1)
        {
            var o = obrazFresku(nazwa);
            if (o == null || w <= 0 || h <= 0) return null;
            var s = Math.Min(w / o.width, h / o.height);
            double fw = o.width * s, fh = o.height * s;
            double fx = x + (w - fw) / 2, fy = dol ? y + h - fh : y + (h - fh) / 2;
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.drawImage(o, fx, fy, fw, fh);
            ctx.restore();
            return (fx, fy, fw, fh);
        }

        /// <summary>Fryz z tancerzami i zwierzętami w poprzek pasa: kafel powtarzany, co drugi odbity.</summary>
        public static void fryz(IPlotno ctx, double x, double y, double w, double h)
        {
            var o = obrazFresku("fryz-tancerze");
            ctx.save();
            var pas = new Path2D(); pas.rect(x, y, w, h);
            ctx.clip(pas);
            if (o != null)
            {
                var kw = o.width * (h / o.height);
                // od środka na boki: postacie na środku karty zawsze te same
                var start = x + w / 2 - kw / 2 - Math.Ceiling((w / 2) / kw) * kw;
                int i = 0;
                for (var kx = start; kx < x + w; i++, kx += kw)
                {
                    ctx.save();
                    if (i % 2 != 0) { ctx.translate(kx + kw, y); ctx.scale(-1, 1); ctx.drawImage(o, 0, 0, kw, h); }
                    else ctx.drawImage(o, kx, y, kw, h);
                    ctx.restore();
                }
                // światło lampki z góry: dół fryzu ciemnieje
                var g = ctx.createLinearGradient(0, y, 0, y + h);
                g.addColorStop(0, "rgba(255,230,190,0.06)"); g.addColorStop(1, "rgba(20,10,6,0.35)");
                ctx.fillStyle = g; ctx.fill(pas);
            }
            else Fresk.pigment(ctx, pas, FRESK.tablicaCiemna);
            ctx.restore();
            ctx.save();
            ctx.fillStyle = FRESK.czerwien;
            ctx.fillRect(x, y + h, w, Math.Max(2, h * 0.06));
            ctx.fillStyle = "rgba(227,214,182,0.55)";
            ctx.fillRect(x, y + h + Math.Max(2, h * 0.06), w, 1);
            ctx.restore();
        }

        /// <summary>Nisza z łukiem na złotym tle, jak na ikonie. Zwraca ścieżkę wnętrza (w niej rysuje się postać).</summary>
        public static Path2D zlotaNisza(IPlotno ctx, double x, double y, double w, double h, double teraz = 0)
        {
            var r = w / 2;
            var nisza = new Path2D();
            nisza.moveTo(x, y + h);
            nisza.lineTo(x, y + r);
            nisza.arc(x + r, y + r, r, Math.PI, 0);
            nisza.lineTo(x + w, y + h);
            nisza.closePath();
            ctx.save();
            Fresk.pigment(ctx, nisza, FRESK.zloto, 0.9, "zloto");
            // blask lampki na złocie: przesuwa się z płomieniem
            var m = 0.5 + 0.5 * JsM.Sin(teraz * 0.0013);
            var g = ctx.createRadialGradient(x + w * (0.4 + 0.2 * m), y + h * 0.35, 1, x + w / 2, y + h * 0.45, h * 0.75);
            g.addColorStop(0, "rgba(255,236,170,0.32)");
            g.addColorStop(1, "rgba(60,30,8,0.38)");
            ctx.fillStyle = g;
            ctx.fill(nisza);
            ctx.restore();
            return nisza;
        }

        /// <summary>Obrzeże niszy: czerwień ziemi, cienka biel i perełki na łuku. Rysowane na postaci.</summary>
        public static void brzegNiszy(IPlotno ctx, Path2D nisza, double x, double y, double w)
        {
            var r = w / 2;
            ctx.save();
            ctx.lineWidth = Math.Max(2.5, w * 0.045);
            ctx.strokeStyle = FRESK.czerwien;
            ctx.stroke(nisza);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(227,214,182,0.7)";
            ctx.stroke(nisza);
            ctx.fillStyle = "rgba(236,224,196,0.9)";
            for (int i = 1; i < 10; i++)
            {
                var a = Math.PI + (i / 10.0) * Math.PI;
                ctx.beginPath(); ctx.arc(x + r + JsM.Cos(a) * (r - w * 0.07), y + r + JsM.Sin(a) * (r - w * 0.07), Math.Max(1, w * 0.018), 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Medalion osiągnięcia: okrągły wycinek fresku w obwódce ugru; niezdobyty — wyblakły i szary.</summary>
        public static void medalion(IPlotno ctx, string nazwa, double x, double y, double r, bool zdobyty, double alfa = 1)
        {
            var o = obrazFresku("medal-" + nazwa);
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.beginPath(); ctx.arc(x + 1, y + 2, r + 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
            if (o != null)
            {
                if (!zdobyty) ctx.filter = "grayscale(1) brightness(0.85)";
                ctx.globalAlpha *= zdobyty ? 1 : 0.6;
                ctx.drawImage(o, x - r, y - r, r * 2, r * 2);
                ctx.filter = "none";
            }
            else { ctx.fillStyle = FRESK.tablicaCiemna; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
            var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r);
            g.addColorStop(0, zdobyty ? "rgba(255,236,200,0.12)" : "rgba(0,0,0,0)");
            g.addColorStop(1, "rgba(20,10,6,0.5)");
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
            ctx.lineWidth = Math.Max(1.5, r * 0.1);
            ctx.strokeStyle = zdobyty ? FRESK.ugier : "rgba(110,92,72,0.8)";
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 1;
            ctx.strokeStyle = zdobyty ? "rgba(240,214,150,0.8)" : "rgba(160,140,116,0.35)";
            ctx.beginPath(); ctx.arc(x, y, r + ctx.lineWidth + r * 0.05, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }
}
