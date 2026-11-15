// Port: alpha-1/src/render/fresk.ts — interfejs jak ściana krypty: ciemny tynk w świetle lampki, ramy malowane pasami
// czerwieni ziemi i ugru, kontury sinopią, krążki z wycinkami fresków. Ciemność w kątach oddycha, a na ramach co jakiś
// czas wychodzi z tynku pismo, którego nikt nie umie przeczytać. Tu też tynk świata (fresk) i migotanie lampek.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyWygladFreskSwiata;
using static Trzewia.Nastawy.NastawyWygladNastroj;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Fresk
    {
        // ------------------------------------------------------------------ faktury

        static readonly Dictionary<string, IObraz> obrazy = new Dictionary<string, IObraz>();
        static readonly ConditionalWeakTable<IPlotno, Dictionary<string, CanvasPattern>> wzory = new ConditionalWeakTable<IPlotno, Dictionary<string, CanvasPattern>>();

        static IObraz? obraz(string f)
        {
            if (!obrazy.TryGetValue(f, out var o)) { o = Plotno.Wczytaj("grafika/tekstury/" + f + ".jpg"); obrazy[f] = o; }
            return o.complete ? o : null;
        }

        /// <summary>Wzór faktury dla danego płótna (albo null, póki obrazka nie ma) — 'tynk' albo 'zloto'.</summary>
        public static CanvasPattern? wzor(IPlotno ctx, string f = "tynk")
        {
            var m = wzory.GetOrCreateValue(ctx);
            if (m.TryGetValue(f, out var gotowy)) return gotowy;
            var o = obraz(f);
            if (o == null) return null;
            var p = ctx.createPattern(o, "repeat");
            if (p == null) return null;
            m[f] = p;
            return p;
        }

        /// <summary>Wypełnia ścieżkę pigmentem z fakturą tynku (faktura przyciemnia: mnożenie).</summary>
        public static void pigment(IPlotno ctx, Path2D sciezka, Styl kolor, double sila = 1, string f = "tynk")
        {
            ctx.fillStyle = kolor;
            ctx.fill(sciezka);
            var p = wzor(ctx, f);
            if (p == null || sila <= 0) return;
            ctx.save();
            ctx.globalCompositeOperation = "multiply";
            ctx.globalAlpha *= sila;
            ctx.fillStyle = p;
            ctx.fill(sciezka);
            ctx.restore();
        }

        /// <summary>
        /// Faktura tynku na świecie gry: mnożona na rysunek góry, zakotwiczona w świecie (kafel faktury to
        /// FRESK_SWIATA.tynkKafli kafli), więc jedzie razem ze skałą przy ruchu kamery.
        /// </summary>
        public static void tynkSwiata(IPlotno ctx, Camera cam)
        {
            var p = wzor(ctx, "tynk");
            if (p == null) return;
            var s = (FRESK_SWIATA.tynkKafli * cam.zoom) / 256;
            double tx = cam.vw / 2 - cam.x * cam.zoom, ty = cam.vh / 2 - cam.y * cam.zoom;
            ctx.save();
            ctx.globalCompositeOperation = "multiply";
            ctx.globalAlpha = FRESK_SWIATA.tynkKrycie;
            p.setTransform(new DOMMatrix(s, 0, 0, s, tx, ty));
            ctx.fillStyle = p;
            ctx.fillRect(0, 0, cam.vw, cam.vh);
            // wzór jest wspólny dla całego płótna — inne rysunki na nim nie mogą dostać przesunięcia
            p.setTransform();
            ctx.restore();
        }

        // ------------------------------------------------------------------ ściana

        static readonly Dictionary<string, IPlotno> sciany = new Dictionary<string, IPlotno>();

        /// <summary>Migotanie płomienia lampki 0..1 — kilka nieparzystych sinusów.</summary>
        public static double migotLampy(double t) =>
            0.5 + 0.22 * JsM.Sin(t * 0.0071) * JsM.Sin(t * 0.0029 + 1.3) + 0.12 * JsM.Sin(t * 0.0173 + 0.4) + 0.08 * JsM.Sin(t * 0.031);

        /// <summary>
        /// Ściana krypty pod całym ekranem. Tynk liczy się raz na rozmiar; co klatkę dochodzi tylko ciemność w kątach, która
        /// oddycha (`oddech` 0..1) i drga razem z płomieniem lampki.
        /// </summary>
        public static void scianaKrypty(IPlotno ctx, double w, double h, double teraz, double oddech = 0.5, double swX = 0.5, double swY = 0.42)
        {
            var t = ctx.getTransform();
            var k = Math.Min(2, Math.Max(1, Math.Sqrt(t.a * t.a + t.b * t.b)));
            var klucz = $"{Math.Round(w, MidpointRounding.AwayFromZero)}x{Math.Round(h, MidpointRounding.AwayFromZero)}@{k}";
            if (!sciany.TryGetValue(klucz, out var c))
            {
                var p = wzor(ctx);
                c = Plotno.Nowe((int)Math.Max(1, Math.Round(w * k, MidpointRounding.AwayFromZero)), (int)Math.Max(1, Math.Round(h * k, MidpointRounding.AwayFromZero)));
                var g = c;
                g.setTransform(k, 0, 0, k, 0, 0);
                g.fillStyle = FRESK.sciana;
                g.fillRect(0, 0, w, h);
                var pw = p != null ? wzor(g) : null;
                if (pw != null)
                {
                    g.globalCompositeOperation = "multiply";
                    g.fillStyle = pw; g.fillRect(0, 0, w, h);
                    // druga warstwa, przesunięta i słabsza — kafel tynku się nie powtarza tak wyraźnie
                    g.globalAlpha = 0.45;
                    g.translate(97, 53); g.rotate(0.5);
                    g.fillRect(-w, -h, w * 3, h * 3);
                    g.setTransform(k, 0, 0, k, 0, 0);
                    g.globalAlpha = 1;
                    g.globalCompositeOperation = "source-over";
                }
                // zacieki i plamy wilgoci: ciemniejsze smugi spływające od góry
                for (int i = 0; i < 14; i++)
                {
                    double x = ((i * 0.618 + 0.13) % 1) * w, dl = h * (0.25 + ((i * 0.37) % 1) * 0.5);
                    var gr = g.createLinearGradient(0, 0, 0, dl);
                    gr.addColorStop(0, "rgba(20,12,8,0.22)"); gr.addColorStop(1, "rgba(20,12,8,0)");
                    g.fillStyle = gr;
                    g.fillRect(x, 0, 6 + ((i * 7) % 5) * 7, dl);
                }
                // ściana bez faktury (obrazek jeszcze się wczytuje) — nie zapamiętujemy
                if (pw != null)
                {
                    if (sciany.Count > 6) { foreach (var s in sciany.Values) s.Dispose(); sciany.Clear(); }
                    sciany[klucz] = c;
                }
            }
            ctx.drawImage(c, 0, 0, w, h);
            // ciemność w kątach: oddycha z rdzeniem i drga z płomieniem — zasięg światła nigdy nie stoi
            var m = migotLampy(teraz);
            var R = Math.Max(w, h) * (0.58 + 0.05 * oddech + 0.03 * m);
            double cx = w * swX, cy = h * swY;
            var gk = ctx.createRadialGradient(cx, cy, R * 0.22, cx, cy, R);
            gk.addColorStop(0, $"rgba({FRESK.mrok},0)");
            gk.addColorStop(0.55, $"rgba({FRESK.mrok},{Js.Js.S(0.3 * FRESK.mrokAlfa)})");
            gk.addColorStop(1, $"rgba({FRESK.mrok},{Js.Js.S(FRESK.mrokAlfa)})");
            ctx.fillStyle = gk;
            ctx.fillRect(0, 0, w, h);
            // ciepło lampki w środku ściany
            ctx.save();
            ctx.globalCompositeOperation = "soft-light";
            var l = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7);
            l.addColorStop(0, Barwa.Rgba(255, 170, 90, 0.18 + 0.08 * m));
            l.addColorStop(1, "rgba(255,170,90,0)");
            ctx.fillStyle = l;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
            // pył w świetle i pismo, które samo pojawia się w tynku (teraz = 0 — ściana stoi)
            if (teraz > 0 && Nastroj.wolnoRuszac())
            {
                Nastroj.pyl(ctx, w, h, teraz, cx, cy);
                Nastroj.napisyNaScianie(ctx, w, h, teraz);
            }
        }

        // ------------------------------------------------------------------ ramy i tablice

        static Path2D pierscien(double x, double y, double w, double h, double d0, double d1)
        {
            var p = new Path2D();
            p.rect(x + d0, y + d0, w - d0 * 2, h - d0 * 2);
            p.rect(x + d1, y + d1, w - d1 * 2, h - d1 * 2);
            return p;
        }

        static void wypelnijPierscien(IPlotno ctx, Path2D p, string kolor, double sila = 1)
        {
            ctx.save();
            ctx.clip(p, "evenodd");
            var r = new Path2D(); r.rect(-1e4, -1e4, 2e4, 2e4);
            pigment(ctx, r, kolor, sila);
            ctx.restore();
        }

        /// <summary>
        /// Rama malowana jak obramowanie fresku: szeroki pas czerwieni ziemi, nitka bieli wapiennej, węższy pas ugru i kontur
        /// sinopią. Na czerwonym pasie rząd perełek; `pismo` — ile znaków nieznanego pisma wyłania się z pasa.
        /// </summary>
        public static void ramaFresku(IPlotno ctx, double x, double y, double w, double h, double pas = 10, double teraz = 0, int pismo = 0)
        {
            double nic = pas * 0.16, u = pas * 0.5;
            ctx.save();
            // cień ramy na ścianie
            ctx.strokeStyle = "rgba(8,4,2,0.55)";
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 1, y + 1, w + 2, h + 2);
            wypelnijPierscien(ctx, pierscien(x, y, w, h, 0, pas), FRESK.czerwien);
            wypelnijPierscien(ctx, pierscien(x, y, w, h, pas, pas + nic), FRESK.biel, 0.5);
            wypelnijPierscien(ctx, pierscien(x, y, w, h, pas + nic, pas + nic + u), FRESK.ugier);
            ctx.strokeStyle = FRESK.sinopia;
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2);
            var wew = pas + nic + u;
            ctx.strokeRect(x + wew - 0.6, y + wew - 0.6, w - wew * 2 + 1.2, h - wew * 2 + 1.2);
            // perełki na czerwonym pasie
            if (pas >= 7)
            {
                ctx.fillStyle = "rgba(227,214,182,0.42)";
                double krok = Math.Max(16, pas * 2.4), r = Math.Max(0.9, pas * 0.11), s = pas / 2;
                for (var px = x + krok; px < x + w - krok * 0.5; px += krok)
                {
                    ctx.beginPath(); ctx.arc(px, y + s, r, 0, Math.PI * 2); ctx.arc(px, y + h - s, r, 0, Math.PI * 2); ctx.fill();
                }
                for (var py = y + krok; py < y + h - krok * 0.5; py += krok)
                {
                    ctx.beginPath(); ctx.arc(x + s, py, r, 0, Math.PI * 2); ctx.arc(x + w - s, py, r, 0, Math.PI * 2); ctx.fill();
                }
            }
            // rogi: kwadrat ugru z krzyżykiem bieli
            foreach (var (cx, cy) in new[] { (x, y), (x + w - pas, y), (x, y + h - pas), (x + w - pas, y + h - pas) })
            {
                var r = new Path2D(); r.rect(cx, cy, pas, pas);
                pigment(ctx, r, FRESK.ugier);
                ctx.strokeStyle = FRESK.sinopia; ctx.lineWidth = 1; ctx.stroke(r);
                ctx.strokeStyle = "rgba(227,214,182,0.6)"; ctx.lineWidth = Math.Max(1, pas * 0.12);
                ctx.beginPath();
                ctx.moveTo(cx + pas / 2, cy + pas * 0.22); ctx.lineTo(cx + pas / 2, cy + pas * 0.78);
                ctx.moveTo(cx + pas * 0.22, cy + pas / 2); ctx.lineTo(cx + pas * 0.78, cy + pas / 2);
                ctx.stroke();
            }
            if (pismo > 0 && pas >= 8) pismoNaRamie(ctx, x, y, w, h, pas, teraz, pismo);
            ctx.restore();
        }

        /// <summary>Nieznane pismo na czerwonym pasie ramy: kilka znaków wyłania się z tynku, trwa chwilę i gaśnie.</summary>
        static void pismoNaRamie(IPlotno ctx, double x, double y, double w, double h, double pas, double teraz, int ile)
        {
            const double okres = 9000;
            for (int n = 0; n < ile; n++)
            {
                var cykl = Math.Floor((teraz + n * 3700) / okres);
                var f = ((teraz + n * 3700) % okres) / okres;
                var jasnosc = f < 0.5 ? JsM.Sin((f / 0.5) * Math.PI) : 0;
                if (jasnosc <= 0.01) continue;
                double los(double k) { var s0 = JsM.Sin(cykl * 12.9898 + n * 78.233 + k * 37.719) * 43758.5453; return s0 - Math.Floor(s0); }
                var bok = (int)Math.Floor(los(1) * 4);
                var dl = 5 + (int)Math.Floor(los(2) * 5);
                double s = pas * 0.3, krok = s * 2.6;
                var pozioma = bok < 2;
                var dlBoku = pozioma ? w : h;
                var start = pas * 3 + los(3) * Math.Max(1, dlBoku - pas * 6 - dl * krok);
                ctx.save();
                double zr = FRESK.zar[0], zg = FRESK.zar[1], zb = FRESK.zar[2];
                ctx.strokeStyle = Barwa.Rgba(zr, zg, zb, 0.75 * jasnosc);
                ctx.shadowColor = Barwa.Rgba(zr, zg, zb, 0.65 * jasnosc);
                ctx.shadowBlur = Math.Max(4, pas * 0.8);
                ctx.lineWidth = Math.Max(0.8, pas * 0.09);
                ctx.lineCap = "round";
                for (int i = 0; i < dl; i++)
                {
                    var px = pozioma ? x + start + i * krok : (bok == 2 ? x + pas / 2 : x + w - pas / 2);
                    var py = pozioma ? (bok == 0 ? y + pas / 2 : y + h - pas / 2) : y + start + i * krok;
                    ctx.save();
                    ctx.translate(px, py);
                    ctx.scale(s, s);
                    ctx.lineWidth /= s;
                    ctx.stroke(Tajemnica.glif(cykl * 31 + n * 7 + i, 1));
                    ctx.restore();
                }
                ctx.restore();
            }
        }

        /// <summary>Tablica tynku: ciemna (jasny tekst, światło lampki pośrodku) albo jasna (tekst sinopią).</summary>
        public static void tablica(IPlotno ctx, double x, double y, double w, double h, bool jasna = false, double alfa = 1)
        {
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(x + 2, y + 4, w, h);
            var p = new Path2D(); p.rect(x, y, w, h);
            // jasny tynk dostaje słabszą fakturę — pismo na nim ma się czytać, nie ginąć w plamach
            pigment(ctx, p, jasna ? FRESK.tablicaJasna : FRESK.tablicaCiemna, jasna ? 0.6 : 1);
            // światło lampki z góry, ciemność w dolnych rogach
            var g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.25, 0, x + w * 0.5, y + h * 0.4, Math.Max(w, h) * 0.8);
            g.addColorStop(0, jasna ? "rgba(255,240,210,0.18)" : "rgba(255,190,120,0.1)");
            g.addColorStop(1, jasna ? "rgba(10,6,4,0.22)" : "rgba(10,6,4,0.35)");
            ctx.fillStyle = g;
            ctx.fill(p);
            var pas = Math.Max(3, Math.Min(6, Math.Min(w, h) * 0.03));
            ctx.lineWidth = pas;
            ctx.strokeStyle = FRESK.czerwien;
            ctx.strokeRect(x + pas / 2, y + pas / 2, w - pas, h - pas);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(227,214,182,0.45)";
            ctx.strokeRect(x + pas + 1.5, y + pas + 1.5, w - pas * 2 - 3, h - pas * 2 - 3);
            ctx.strokeStyle = FRESK.sinopia;
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            ctx.restore();
        }

        /// <summary>
        /// Krążek tynku z obrzeżem sinopii — podkład pod ryt albo przycisk. Pod kursorem (albo wybrany) płynnie się rozjaśnia,
        /// dostaje ciepłą poświatę, a po obrzeżu krąży błysk. `stan`: 'zwykly' | 'pod' | 'wlaczony' | 'uspiony'.
        /// </summary>
        public static double krazek(IPlotno ctx, double x, double y, double r, string stan = "zwykly", string? klucz = null)
        {
            double cel = stan == "pod" || stan == "wlaczony" ? 1 : 0;
            var sw = klucz != null ? Nastroj.plynnie(klucz, cel) : cel;
            ctx.save();
            if (sw > 0.01)
            {
                var g0 = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 2);
                g0.addColorStop(0, Barwa.Rgba(226, 160, 90, NASTROJ.poswiataKrazka * sw));
                g0.addColorStop(1, "rgba(226,160,90,0)");
                ctx.fillStyle = g0;
                ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
            }
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath(); ctx.arc(x + 1, y + 3, r + 1.5, 0, Math.PI * 2); ctx.fill();
            var p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2);
            pigment(ctx, p, stan == "wlaczony" ? FRESK.krazekWlaczony : FRESK.krazek);
            var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
            g.addColorStop(0, Barwa.Rgba(255, 226, 180, 0.05 + 0.15 * sw));
            g.addColorStop(1, "rgba(16,8,4,0.55)");
            ctx.fillStyle = g; ctx.fill(p);
            ctx.lineWidth = Math.Max(1.6, r * 0.09);
            ctx.strokeStyle = FRESK.sinopia;
            ctx.stroke(p);
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = Barwa.Rgba(206, 170, 112, 0.2 + 0.5 * sw);
            ctx.beginPath(); ctx.arc(x, y, r + 2.2, 0, Math.PI * 2); ctx.stroke();
            if (sw > 0.05 && Nastroj.wolnoRuszac())
            {
                // błysk krąży po obrzeżu
                var a = Wydajnosc.Teraz() * 0.0014 + x * 0.01;
                double zr = FRESK.zar[0], zg = FRESK.zar[1], zb = FRESK.zar[2];
                ctx.lineCap = "round";
                ctx.lineWidth = 1.8;
                ctx.shadowColor = Barwa.Rgba(zr, zg, zb, 0.8 * sw);
                ctx.shadowBlur = 6;
                ctx.strokeStyle = Barwa.Rgba(250, 206, 140, NASTROJ.blyskKrazka * sw);
                ctx.beginPath(); ctx.arc(x, y, r + 2.2, a, a + 0.8); ctx.stroke();
            }
            if (stan == "uspiony") { ctx.fillStyle = "rgba(12,7,5,0.5)"; ctx.fill(p); }
            ctx.restore();
            return sw;
        }

        // ------------------------------------------------------------------ ikony z fresków

        static readonly Dictionary<string, IObraz> ikony = new Dictionary<string, IObraz>();

        static IObraz? ikona(string nazwa)
        {
            if (!maIkone(nazwa)) return null;
            if (!ikony.TryGetValue(nazwa, out var o)) { o = Plotno.Wczytaj("grafika/ikony/" + nazwa + ".jpg"); ikony[nazwa] = o; }
            return o.complete ? o : null;
        }

        /// <summary>Czy jest wycinek fresku dla tej ikony (ryt-szept, przycisk-kamera…).</summary>
        public static bool maIkone(string nazwa) => Zasoby.Istnieje("grafika/ikony/" + nazwa + ".jpg");

        /// <summary>Krążek z wycinkiem fresku w środku. Zwraca false, gdy wycinka nie ma.</summary>
        public static bool krazekZIkona(IPlotno ctx, string nazwa, double x, double y, double r, string stan = "zwykly")
        {
            if (!maIkone(nazwa)) return false;
            var sw = krazek(ctx, x, y, r, stan, nazwa);
            var o = ikona(nazwa);
            if (o == null) return true;
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, Math.PI * 2); ctx.clip();
            if (stan == "uspiony") ctx.globalAlpha *= 0.45;
            ctx.drawImage(o, x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
            // w spoczynku wycinek tonie w cieniu i traci barwę; pod kursorem wraca do światła
            var cien = 1 - sw;
            if (cien > 0.01)
            {
                ctx.globalCompositeOperation = "saturation";
                ctx.fillStyle = Barwa.Rgba(128, 128, 128, NASTROJ.ikonaSzarosc * cien);
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
                ctx.globalCompositeOperation = "source-over";
                ctx.fillStyle = Barwa.Rgba(10, 6, 4, NASTROJ.ikonaCien * cien);
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
            }
            // wycinek leży w tynku krążka, nie na nim: cień przy brzegu
            var g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 0.88);
            g.addColorStop(0, "rgba(20,10,6,0)"); g.addColorStop(1, "rgba(20,10,6,0.5)");
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
            ctx.save();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = FRESK.sinopia;
            ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
            return true;
        }

        // ------------------------------------------------------------------ napisy

        /// <summary>
        /// Tytuł malowany bielą wapienną z cieniem sinopii, pod nim rozstrzelony napis ugrem między dwoma krzyżykami. Zwraca
        /// dolną krawędź całego bloku.
        /// </summary>
        public static double tytulFresku(IPlotno ctx, double x, double y, string tekst, double rozmiar, double alfa, string podpis = "", string krojTytulu = "serif", string krojTekstu = "serif")
        {
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.font = $"600 {Js.Js.S(rozmiar)}px {krojTytulu}";
            var odstep = rozmiar * 0.19;
            var litery = Litery(tekst);
            var szer = litery.Sum(l => ctx.measureText(l).width) + odstep * (litery.Length - 1);
            var lx = x - szer / 2;
            ctx.textAlign = "left";
            foreach (var l in litery)
            {
                ctx.fillStyle = "rgba(8,4,2,0.7)";
                ctx.fillText(l, lx + rozmiar * 0.025, y + rozmiar * 0.04);
                ctx.fillStyle = FRESK.sinopia;
                ctx.fillText(l, lx + rozmiar * 0.012, y + rozmiar * 0.022);
                ctx.fillStyle = FRESK.tekst;
                ctx.fillText(l, lx, y);
                lx += ctx.measureText(l).width + odstep;
            }
            var dol = y + rozmiar * 0.12;
            if (podpis != "")
            {
                var r = Math.Max(10, rozmiar * 0.14);
                ctx.font = $"{Js.Js.S(r)}px {krojTekstu}";
                var t = $"✠  {podpis.ToUpperInvariant()}  ✠";
                var od = r * 0.32;
                var lit = Litery(t);
                var sz = lit.Sum(l => ctx.measureText(l).width) + od * (t.Length - 1);
                var px = x - sz / 2;
                var py = y + rozmiar * 0.42;
                ctx.fillStyle = FRESK.ugier;
                foreach (var l in lit) { ctx.fillText(l, px, py); px += ctx.measureText(l).width + od; }
                dol = py + r * 0.4;
            }
            ctx.restore();
            return dol;
        }

        /// <summary>Litery napisu jak [...tekst] w JS (punkty kodowe, nie jednostki UTF-16).</summary>
        static string[] Litery(string s)
        {
            var w = new List<string>();
            var e = System.Globalization.StringInfo.GetTextElementEnumerator(s);
            for (int i = 0; i < s.Length;)
            {
                var cp = char.ConvertToUtf32(s, i);
                var n = char.IsSurrogatePair(s, i) ? 2 : 1;
                w.Add(s.Substring(i, n)); i += n;
            }
            return w.ToArray();
        }
    }
}
