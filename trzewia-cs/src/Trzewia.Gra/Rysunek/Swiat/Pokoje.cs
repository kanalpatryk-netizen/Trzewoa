// Port: alpha-1/src/render/pomieszczenia.ts — POMIESZCZENIA (Alpha, etap 3c): rysunek planów i gotowych pomieszczeń.
// Plan: kontur podwójną kreską, kafle do wykucia przekreślone, nazwa i ile zostało; pod kursorem — rozjaśniony, z podpisem.
// Podgląd szablonu: jasny, gdy wolno, czerwony z powodem, gdy nie. Warsztat: stół, tygiel ze złotem, krzyż złoci się
// z postępem (gotowy unosi się — Kruszce.cs). Kuźnia: palenisko, kowadło z rozżarzoną częścią zbroi, iskry, wieszak;
// etap 3f: rycerz zdejmuje część z wieszaka i zakłada ją (błysk i podpis). Sypialnia: posłania, świeca, „z z z”.
// Gotowe pomieszczenie: obłok pyłu, wyposażenie opada. Lina: żelazny hak w skale, konopie z węzłami, nowa spada
// zwojem i uspokaja się. Animacja idzie zegarem ekranu. Symulacja: Symulacja/Pomieszczenia.cs.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Nastawy.NastawyZbroja;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Co zrobią zaznaczeni, gdy dotkniesz tego miejsca — podpis nad pomieszczeniem pod kursorem.</summary>
    public sealed class PodKursorem { public Pomieszczenie pom = null!; public string akcja = ""; public bool ok; }

    public sealed class Pokoje
    {
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }
        static double Rnd(double v) => Math.Floor(v + 0.5);
        static string SERIF => Fonts.KROJ;

        static Styl ZLOTO_PLANU(double a) => Barwa.Rgba(232, 196, 130, a);
        static Styl CZERWIEN(double a) => Barwa.Rgba(226, 96, 72, a);
        const string DREWNO = "rgba(112,74,42,0.98)", TUSZ = "rgba(20,12,8,0.95)";

        /// <summary>Gdzie w pomieszczeniu stoi wyposażenie (piksele ekranu) — wspólne dla rzeczy i świateł.</summary>
        sealed class Uklad
        {
            public double yp;
            public (double x1, double x2, double y) stol, polka;
            public (double x, double y) tygiel, kowadlo, swieca;
            public (double x, double y, double a) krzyz;
            public (double x, double w, double h) palenisko;
            public (double b1, double b2, double glowa)[] poslania = null!;
        }
        static Uklad uklad(Camera cam, Pomieszczenie pom)
        {
            var z = cam.zoom;
            double X(double tx) => cam.toScreenX(pom.x + tx);
            var yp = cam.toScreenY(pom.y + pom.h);                     // podłoga
            var stolY = yp - z * 1.05;
            return new Uklad
            {
                yp = yp,
                stol = (X(2.15), X(3.9), stolY),
                tygiel = (X(3.45), stolY - z * 0.5),
                krzyz = (X(2.7), stolY - z * 0.5, z * 0.42),
                // kuźnia: palenisko pod lewą ścianą (za robotnikiem), kowadło przed nim, wieszak pod prawą ścianą
                kowadlo = (X(2.8), yp - z * 0.95),
                palenisko = (X(0.5), z * 0.5, z * 1.9),
                polka = pom.rodzaj == "kuznia" ? (X(2.4), X(3.92), yp - z * 2.5) : (X(0.08), X(1.5), yp - z * 2.5),
                // posłania: lewe z poduszką z lewej, prawe — z prawej (głowy pod ścianami)
                poslania = new[] { (X(0.1), X(2.4), -1.0), (X(2.6), X(4.9), 1.0) },
                swieca = (X(2.5), yp - z * 1.9),
            };
        }

        /// <summary>
        /// Tylna ściana, podłoga i rama gotowego pokoju. Kuźnia: okopcona cegła; warsztat: pionowe deski; sypialnia:
        /// przybrudzony tynk z lamperią. Podłoga: płyty w kuźni, deski gdzie indziej; obramowanie skałą.
        /// </summary>
        static void scianaPokoju(IPlotno ctx, Camera cam, Pomieszczenie pom)
        {
            var z = cam.zoom;
            double x0 = cam.toScreenX(pom.x), x1 = cam.toScreenX(pom.x + pom.w);
            double y0 = cam.toScreenY(pom.y), yp = cam.toScreenY(pom.y + pom.h);
            double W = x1 - x0, H = yp - y0;
            ctx.save();
            ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
            var lw = Math.Max(1, z * 0.05);
            if (pom.rodzaj == "kuznia")
            {
                ctx.fillStyle = "rgb(92,52,40)"; ctx.fillRect(x0, y0, W, H);
                // cegły na zakładkę: rząd = pół kafla, cegła = kafel; co któraś ciemniejsza
                var rh = z * 0.5;
                {
                    int r = 0;
                    for (var y = yp - rh; y > y0 - rh; r++, y -= rh)
                    {
                        int c = -1;
                        for (var x = x0 - (r & 1) * z * 0.5; x < x1; c++, x += z)
                        {
                            var ciemna = ((c * 7 + r * 13) & 3) == 0;
                            ctx.fillStyle = ciemna ? "rgba(40,18,12,0.35)" : "rgba(150,90,64,0.12)";
                            ctx.fillRect(x + lw, y + lw, z - lw * 2, rh - lw * 2);
                        }
                    }
                }
                ctx.strokeStyle = "rgba(28,14,10,0.7)"; ctx.lineWidth = lw;
                ctx.beginPath();
                {
                    int r = 0;
                    for (var y = yp; y > y0; r++, y -= rh)
                    {
                        ctx.moveTo(x0, y); ctx.lineTo(x1, y);
                        for (var x = x0 - (r & 1) * z * 0.5; x < x1; x += z) { ctx.moveTo(x, y); ctx.lineTo(x, y - rh); }
                    }
                }
                ctx.stroke();
                // sadza: od paleniska (lewa ściana) w górę i pod stropem
                var sadza = ctx.createLinearGradient(0, y0, 0, yp);
                sadza.addColorStop(0, "rgba(14,8,6,0.75)"); sadza.addColorStop(0.55, "rgba(14,8,6,0.2)"); sadza.addColorStop(1, "rgba(14,8,6,0)");
                ctx.fillStyle = sadza; ctx.fillRect(x0, y0, W, H);
            }
            else if (pom.rodzaj == "warsztat")
            {
                ctx.fillStyle = "rgb(112,80,52)"; ctx.fillRect(x0, y0, W, H);
                // pionowe deski z słojami i sękami
                var dw = z * 0.5;
                ctx.lineWidth = lw;
                int i = 0;
                for (var x = x0; x < x1; i++, x += dw)
                {
                    ctx.fillStyle = (i * 5) % 3 == 0 ? "rgba(60,36,20,0.18)" : (i % 2 != 0 ? "rgba(170,124,80,0.1)" : "rgba(0,0,0,0)");
                    ctx.fillRect(x, y0, dw, H);
                    ctx.strokeStyle = "rgba(36,22,12,0.75)";
                    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, yp); ctx.stroke();
                    ctx.strokeStyle = "rgba(52,32,18,0.3)";
                    ctx.beginPath();
                    for (int k = 1; k <= 2; k++) { var sx = x + dw * k / 3; ctx.moveTo(sx, y0); ctx.bezierCurveTo(sx + dw * 0.08, y0 + H * 0.35, sx - dw * 0.08, y0 + H * 0.65, sx, yp); }
                    ctx.stroke();
                    if (((i * 11) & 3) == 1) { ctx.fillStyle = "rgba(46,28,14,0.6)"; ctx.beginPath(); ctx.ellipse(x + dw * 0.5, y0 + H * (0.3 + ((i * 7) % 5) * 0.1), dw * 0.12, dw * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
                }
            }
            else
            {
                // sypialnia w półmroku: ciepły, przybrudzony tynk
                ctx.fillStyle = "rgb(116,96,76)"; ctx.fillRect(x0, y0, W, H);
                // tynk: plamy wilgoci i rysy, ciemniejsza lamperia u dołu
                var plama = ctx.createRadialGradient(x0 + W * 0.7, y0 + H * 0.2, 0, x0 + W * 0.7, y0 + H * 0.2, W * 0.5);
                plama.addColorStop(0, "rgba(70,56,42,0.3)"); plama.addColorStop(1, "rgba(70,56,42,0)");
                ctx.fillStyle = plama; ctx.fillRect(x0, y0, W, H);
                ctx.fillStyle = "rgba(64,46,32,0.6)"; ctx.fillRect(x0, yp - z * 0.55, W, z * 0.55);
                ctx.strokeStyle = "rgba(60,42,30,0.6)"; ctx.lineWidth = lw;
                ctx.beginPath(); ctx.moveTo(x0, yp - z * 0.55); ctx.lineTo(x1, yp - z * 0.55); ctx.stroke();
                ctx.strokeStyle = "rgba(90,76,58,0.45)";
                ctx.beginPath(); ctx.moveTo(x0 + W * 0.18, y0); ctx.lineTo(x0 + W * 0.22, y0 + H * 0.2); ctx.lineTo(x0 + W * 0.19, y0 + H * 0.33); ctx.stroke();
            }
            // cień w kątach: ściana chowa się pod stropem i przy bokach skały
            var gora = ctx.createLinearGradient(0, y0, 0, y0 + z * 0.8);
            gora.addColorStop(0, "rgba(10,6,4,0.55)"); gora.addColorStop(1, "rgba(10,6,4,0)");
            ctx.fillStyle = gora; ctx.fillRect(x0, y0, W, z * 0.8);
            foreach (var (xs, kier) in new[] { (x0, 1.0), (x1, -1.0) })
            {
                var bok = ctx.createLinearGradient(xs, 0, xs + kier * z * 0.6, 0);
                bok.addColorStop(0, "rgba(10,6,4,0.45)"); bok.addColorStop(1, "rgba(10,6,4,0)");
                ctx.fillStyle = bok; ctx.fillRect(Math.Min(xs, xs + kier * z * 0.6), y0, z * 0.6, H);
            }
            ctx.restore();
            // podłoga: pas na wierzchu litej podłogi — płyty w kuźni, deski gdzie indziej
            var ph = Math.Max(2, z * 0.2);
            ctx.save();
            ctx.lineWidth = lw; ctx.strokeStyle = TUSZ;
            ctx.fillStyle = pom.rodzaj == "kuznia" ? "rgb(88,84,80)" : "rgb(120,86,54)";
            ctx.beginPath(); ctx.rect(x0, yp, W, ph); ctx.fill(); ctx.stroke();
            ctx.beginPath();
            var krok = pom.rodzaj == "kuznia" ? z * 0.9 : z * 0.6;
            for (var x = x0 + krok; x < x1 - 1; x += krok) { ctx.moveTo(x, yp); ctx.lineTo(x, yp + ph); }
            ctx.stroke();
            // obramowanie skałą: poszarpana krawędź wykutego wnętrza tuszem
            ctx.lineWidth = Math.Max(1.2, z * 0.07);
            ctx.beginPath();
            // (TS: Math.sin(n * 12.9898 + pom.x * 78.233) * 43758.5453 % 1 — reszta z dzielenia zachowuje znak)
            double drg(double n) => (JsM.Sin(n * 12.9898 + pom.x * 78.233) * 43758.5453 % 1) * z * 0.06;
            ctx.moveTo(x0, yp);
            { int k = 0; for (var y = yp; y > y0; k++, y -= z * 0.4) ctx.lineTo(x0 + drg(k), y); }
            { int k = 0; for (var x = x0; x < x1; k++, x += z * 0.4) ctx.lineTo(x, y0 + drg(k + 50)); }
            { int k = 0; for (var y = y0; y < yp; k++, y += z * 0.4) ctx.lineTo(x1 + drg(k + 90), y); }
            ctx.lineTo(x1, yp);
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>Półka albo wieszak na lewej ścianie.</summary>
        static void polka(IPlotno ctx, (double x1, double x2, double y) p, double z)
        {
            ctx.fillStyle = DREWNO;
            ctx.beginPath(); ctx.rect(p.x1, p.y, p.x2 - p.x1, z * 0.1); ctx.fill(); ctx.stroke();
        }

        /// <summary>Część zbroi jako mały znak: hełm, naramienniki, napierśnik, nakolanniki, tarcza (środek w x, y, wielkość s).</summary>
        public static void rysujCzesc(IPlotno ctx, string id, double x, double y, double s, Styl wypelnienie, Styl obrys)
        {
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            switch (id)
            {
                case "helm":
                    ctx.arc(0, s * 0.1, s * 0.42, Math.PI, 0);
                    ctx.lineTo(s * 0.42, s * 0.3); ctx.lineTo(-s * 0.42, s * 0.3); ctx.closePath();
                    break;
                case "naramienniki":
                    foreach (var k in new double[] { -1, 1 }) { ctx.moveTo(k * s * 0.08, s * 0.25); ctx.quadraticCurveTo(k * s * 0.1, -s * 0.3, k * s * 0.5, -s * 0.05); ctx.lineTo(k * s * 0.42, s * 0.25); ctx.closePath(); }
                    break;
                case "napiersnik":
                    ctx.moveTo(-s * 0.36, -s * 0.38); ctx.lineTo(s * 0.36, -s * 0.38); ctx.lineTo(s * 0.3, s * 0.18);
                    ctx.quadraticCurveTo(0, s * 0.48, -s * 0.3, s * 0.18); ctx.closePath();
                    break;
                case "nakolanniki":
                    foreach (var k in new double[] { -1, 1 }) { ctx.moveTo(k * s * 0.22 + s * 0.17, 0); ctx.arc(k * s * 0.22, 0, s * 0.17, 0, Math.PI * 2); }
                    break;
                default: // tarcza
                    ctx.moveTo(-s * 0.36, -s * 0.4); ctx.lineTo(s * 0.36, -s * 0.4); ctx.lineTo(s * 0.34, 0);
                    ctx.quadraticCurveTo(s * 0.2, s * 0.36, 0, s * 0.48); ctx.quadraticCurveTo(-s * 0.2, s * 0.36, -s * 0.34, 0); ctx.closePath();
                    break;
            }
            ctx.fillStyle = wypelnienie; ctx.fill();
            ctx.strokeStyle = obrys; ctx.lineWidth = Math.Max(1, s * 0.07); ctx.stroke();
            if (id == "tarcza")
            {
                ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(0, s * 0.3); ctx.moveTo(-s * 0.22, -s * 0.08); ctx.lineTo(s * 0.22, -s * 0.08); ctx.stroke();
            }
            ctx.restore();
        }

        sealed class Anim { public ZdarzeniePom z = null!; public double od; }
        sealed class LinaAnim { public double x, y0, y1, od; }

        readonly ConditionalWeakTable<ZdarzeniePom, object> widziane = new ConditionalWeakTable<ZdarzeniePom, object>();
        List<Anim> animacje = new List<Anim>();
        /// <summary>Kiedy (zegar ekranu) pomieszczenie stało się gotowe — wyposażenie opada na miejsce.</summary>
        readonly Dictionary<double, double> gotoweOd = new Dictionary<double, double>();
        /// <summary>Liny, które właśnie spadły (zegar ekranu): kolumna, od–do — rozwijają się i uspokajają.</summary>
        List<LinaAnim> liny = new List<LinaAnim>();
        static readonly object JEST = new object();

        /// <summary>Bierze świeże zdarzenia z symulacji; krzyż z warsztatu rusza do licznika wiary.</summary>
        public void zbierz(Sim sim, double teraz, Urobki urobki)
        {
            foreach (var z in sim.zdarzeniaPom)
            {
                if (widziane.TryGetValue(z, out _)) continue;
                widziane.Add(z, JEST);
                if (z.rodzaj == "krzyz") urobki.dodaj("wiara", z.ile ?? 0, z.x ?? 0, z.y ?? 0, teraz);
                if (z.rodzaj == "gotowe" && z.pom is double pid) gotoweOd[pid] = teraz;
                if (z.rodzaj == "lina") liny.Add(new LinaAnim { x = z.x ?? 0, y0 = z.y0 ?? 0, y1 = z.y1 ?? 0, od = teraz });
                animacje.Add(new Anim { z = z, od = teraz });
            }
            if (animacje.Count > 0) animacje = animacje.Where(a => teraz - a.od < 2500).ToList();
            if (liny.Count > 0) liny = liny.Where(a => teraz - a.od < LINA_SPADA + LINA_USPOKAJA).ToList();
        }

        /// <summary>Wyposażenie gotowych pomieszczeń — rzeczy, które ciemność zakrywa (przed mrokiem).</summary>
        public void rysujWnetrza(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var z = cam.zoom;
            rysujLiny(ctx, sim, cam, teraz, liny);
            ctx.save();
            ctx.lineJoin = "round";
            foreach (var pom in sim.pomieszczenia)
            {
                if (!pom.gotowe || !Pomieszczenia.czyPokoj(pom.rodzaj) || !widac(cam, pom)) continue;
                double? od = gotoweOd.TryGetValue(pom.id, out var o) ? o : (double?)null;
                var k = od == null || !Nastroj.wolnoRuszac() ? 1 : Math.Min(1, (teraz - od.Value) / 700);
                if (k <= 0) continue;
                var u = uklad(cam, pom);
                ctx.globalAlpha = k;
                scianaPokoju(ctx, cam, pom);
                ctx.save();
                ctx.translate(0, -(1 - k) * (1 - k) * z * 1.2);            // wyposażenie opada na miejsce
                ctx.lineWidth = Math.Max(1, z * 0.06);
                ctx.strokeStyle = TUSZ;
                if (pom.rodzaj == "warsztat")
                {
                    // stół na dwóch nogach, tygiel na jego końcu, półka z gotowymi krzyżami na lewej ścianie
                    var (x1, x2, y) = u.stol;
                    ctx.fillStyle = DREWNO;
                    foreach (var xn in new[] { x1 + z * 0.15, x2 - z * 0.3 }) { ctx.beginPath(); ctx.rect(xn, y, z * 0.15, u.yp - y); ctx.fill(); ctx.stroke(); }
                    ctx.beginPath(); ctx.rect(x1, y, x2 - x1, z * 0.16); ctx.fill(); ctx.stroke();
                    var t0 = u.tygiel;
                    ctx.beginPath(); ctx.moveTo(t0.x - z * 0.28, t0.y); ctx.lineTo(t0.x + z * 0.28, t0.y); ctx.lineTo(t0.x + z * 0.2, y); ctx.lineTo(t0.x - z * 0.2, y); ctx.closePath();
                    ctx.fillStyle = "rgba(58,48,44,0.98)"; ctx.fill(); ctx.stroke();
                    polka(ctx, u.polka, z);
                    var wyrobow = Math.Min(3, sim.stat.dewocjonalia);
                    for (int i = 0; i < wyrobow; i++)
                    {
                        ctx.save(); ctx.translate(u.polka.x1 + z * (0.3 + i * 0.42), u.polka.y - z * 0.27);
                        ctx.beginPath(); Urobki.krzyz(ctx, z * 0.24); ctx.fillStyle = "rgba(222,178,84,0.95)"; ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
                        ctx.restore();
                    }
                }
                else if (pom.rodzaj == "kuznia")
                {
                    // palenisko (kamienny łuk), kowadło na pniu, wieszak z wykutymi częściami
                    var (hx, hw, hh) = u.palenisko;
                    ctx.fillStyle = "rgba(70,60,54,0.98)";
                    ctx.beginPath(); ctx.moveTo(hx - hw, u.yp); ctx.lineTo(hx - hw, u.yp - hh * 0.6); ctx.quadraticCurveTo(hx, u.yp - hh * 1.3, hx + hw, u.yp - hh * 0.6); ctx.lineTo(hx + hw, u.yp); ctx.closePath(); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = "rgba(16,8,6,0.98)";
                    ctx.beginPath(); ctx.moveTo(hx - hw * 0.62, u.yp); ctx.lineTo(hx - hw * 0.62, u.yp - hh * 0.42); ctx.quadraticCurveTo(hx, u.yp - hh * 0.85, hx + hw * 0.62, u.yp - hh * 0.42); ctx.lineTo(hx + hw * 0.62, u.yp); ctx.closePath(); ctx.fill();
                    var (ax, ay) = u.kowadlo;
                    ctx.fillStyle = DREWNO;
                    ctx.beginPath(); ctx.rect(ax - z * 0.3, u.yp - z * 0.55, z * 0.6, z * 0.55); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = "rgba(46,46,52,0.99)";
                    ctx.beginPath();
                    ctx.moveTo(ax - z * 0.22, u.yp - z * 0.55); ctx.lineTo(ax + z * 0.22, u.yp - z * 0.55); ctx.lineTo(ax + z * 0.3, ay + z * 0.22);
                    ctx.lineTo(ax + z * 0.45, ay + z * 0.22); ctx.quadraticCurveTo(ax + z * 0.75, ay + z * 0.12, ax + z * 0.85, ay);
                    ctx.lineTo(ax - z * 0.55, ay); ctx.lineTo(ax - z * 0.55, ay + z * 0.22); ctx.lineTo(ax - z * 0.3, ay + z * 0.22); ctx.closePath();
                    ctx.fill(); ctx.stroke();
                    polka(ctx, u.polka, z);
                    // na wieszaku to, czego nikt nie nosi; część, którą rycerz właśnie zdjął, jest już w jego rękach (rysujNad)
                    var zdjeta = zakladajacy(sim, pom).Any(c => postepZakladania(c) >= ZDEJMUJE);
                    var wieszak = Zbroja.naWieszaku(sim);
                    for (int i = 0; i < wieszak.Count; i++)
                    {
                        if (i == 0 && zdjeta) continue;
                        var (hkx, hky) = hakWieszaka(u, z, i);
                        rysujCzesc(ctx, wieszak[i], hkx, hky, z * 0.42, "rgba(176,182,194,0.98)", TUSZ);
                    }
                }
                else
                {
                    // dwa posłania na długość człowieka i świeca w niszy między nimi
                    foreach (var (b1, b2, glowa) in u.poslania)
                    {
                        var d = b2 - b1;
                        ctx.fillStyle = "rgba(150,120,70,0.98)";
                        ctx.beginPath(); ctx.rect(b1, u.yp - z * 0.3, d, z * 0.3); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = "rgba(112,34,30,0.96)";
                        ctx.beginPath(); ctx.rect(glowa < 0 ? b1 + d * 0.3 : b1, u.yp - z * 0.36, d * 0.7, z * 0.16); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = "rgba(206,190,156,0.98)";
                        ctx.beginPath(); ctx.ellipse(glowa < 0 ? b1 + d * 0.14 : b2 - d * 0.14, u.yp - z * 0.36, d * 0.11, z * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    }
                    // nisza świecy: płytkie, szerokie wgłębienie w tynku, rozjaśnione od płomienia
                    var s = u.swieca;
                    var nisza = new Path2D();
                    nisza.moveTo(s.x - z * 0.42, s.y + z * 0.1); nisza.lineTo(s.x - z * 0.42, s.y - z * 0.2);
                    nisza.quadraticCurveTo(s.x - z * 0.42, s.y - z * 0.5, s.x, s.y - z * 0.52);
                    nisza.quadraticCurveTo(s.x + z * 0.42, s.y - z * 0.5, s.x + z * 0.42, s.y - z * 0.2);
                    nisza.lineTo(s.x + z * 0.42, s.y + z * 0.1); nisza.closePath();
                    var gn = ctx.createRadialGradient(s.x, s.y - z * 0.25, 0, s.x, s.y - z * 0.2, z * 0.55);
                    gn.addColorStop(0, "rgba(150,104,62,0.95)"); gn.addColorStop(1, "rgba(58,40,28,0.95)");
                    ctx.fillStyle = gn; ctx.fill(nisza);
                    ctx.lineWidth = Math.Max(1, z * 0.04); ctx.strokeStyle = "rgba(30,20,14,0.8)"; ctx.stroke(nisza);
                    ctx.fillStyle = "rgba(214,196,160,0.98)";
                    ctx.beginPath(); ctx.rect(s.x - z * 0.05, s.y - z * 0.2, z * 0.1, z * 0.28); ctx.fill(); ctx.stroke();
                }
                ctx.restore();
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        }

        /// <summary>
        /// Nad mrokiem: plany, światła (ogień paleniska, roztopione złoto, iskry, płonąca świeca), „z z z”, zdarzenia
        /// i pomieszczenie pod kursorem.
        /// </summary>
        public void rysujNad(IPlotno ctx, Sim sim, Camera cam, double teraz, PodKursorem? pod)
        {
            var z = cam.zoom;
            var ruch = Nastroj.wolnoRuszac();
            ctx.save();
            foreach (var pom in sim.pomieszczenia)
            {
                if (!widac(cam, pom)) continue;
                if (!pom.gotowe) { rysujPlan(ctx, sim, cam, pom, teraz, pod?.pom == pom ? pod : null); continue; }
                var u = uklad(cam, pom);
                var przy = pracujacy(sim, pom);
                if (pom.rodzaj == "kuznia")
                {
                    // ogień paleniska: zawsze się tli, przy pracy bucha
                    double hx = u.palenisko.x, hy = u.yp - z * 0.35;
                    var migot = ruch ? 0.75 + 0.25 * JsM.Sin(teraz * 0.013) * JsM.Sin(teraz * 0.0071 + 1) : 0.85;
                    var moc = (przy.Count > 0 ? 1 : 0.45) * migot;
                    var R = z * (2 + moc);
                    var g = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
                    g.addColorStop(0, Barwa.Rgba(255, 170, 70, 0.55 * moc)); g.addColorStop(1, "rgba(255,120,40,0)");
                    ctx.fillStyle = g; ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
                    for (int i = 0; i < 5; i++)
                    {
                        var f = ruch ? (teraz * 0.004 + i * 0.21) % 1 : 0.4;
                        double fx = hx + (los(i * 13) - 0.5) * z * 0.5, fh = z * 0.7 * (1 - f) * moc;
                        ctx.fillStyle = Barwa.Rgba(255, Rnd(150 + 90 * (1 - f)), 70, 0.8 * (1 - f));
                        ctx.beginPath(); ctx.ellipse(fx, u.yp - z * 0.1 - f * z * 0.5, z * 0.1, fh * 0.5 + 1, 0, 0, Math.PI * 2); ctx.fill();
                    }
                    // część zbroi na kowadle — rozżarzona, stygnie z postępem
                    double ax = u.kowadlo.x, ay = u.kowadlo.y;
                    if (pom.zaplacone == true)
                    {
                        var cz = POMIESZCZENIA.kuznia.czesci.FirstOrDefault(c => !sim.zbroja.Contains(c.id));
                        if (cz != null)
                        {
                            var zar = 1 - (pom.postep ?? 0) * 0.6;
                            rysujCzesc(ctx, cz.id, ax - z * 0.05, ay - z * 0.25, z * 0.55, Barwa.Rgba(255, Rnd(110 + 80 * (1 - zar)), Rnd(40 + 120 * (1 - zar)), 0.95), "rgba(60,20,8,0.9)");
                        }
                    }
                    foreach (var c in przy) iskryZKowadla(ctx, ax - z * 0.05, ay - z * 0.1, z, c, teraz);
                }
                else if (pom.rodzaj == "warsztat")
                {
                    if (pom.zaplacone == true)
                    {
                        // roztopione złoto w tyglu
                        var t0 = u.tygiel;
                        var migot = ruch ? 0.8 + 0.2 * JsM.Sin(teraz * 0.009) : 0.9;
                        var g = ctx.createRadialGradient(t0.x, t0.y, 0, t0.x, t0.y, z * 1.4);
                        g.addColorStop(0, Barwa.Rgba(255, 214, 110, 0.6 * migot)); g.addColorStop(1, "rgba(255,190,80,0)");
                        ctx.fillStyle = g; ctx.fillRect(t0.x - z * 1.4, t0.y - z * 1.4, z * 2.8, z * 2.8);
                        ctx.fillStyle = Barwa.Rgba(255, 226, 130, migot);
                        ctx.beginPath(); ctx.ellipse(t0.x, t0.y, z * 0.25, z * 0.07, 0, 0, Math.PI * 2); ctx.fill();
                        // krzyż na stole złoci się od dołu z postępem
                        var (kx, ky, a) = u.krzyz;
                        ctx.save();
                        ctx.translate(kx, ky);
                        ctx.beginPath(); Urobki.krzyz(ctx, a);
                        ctx.fillStyle = "rgba(60,44,20,0.9)"; ctx.fill();
                        ctx.save(); ctx.clip();
                        var pp = pom.postep ?? 0;
                        ctx.fillStyle = "rgba(244,204,104,0.98)";
                        ctx.fillRect(-a, a - pp * a * 2, a * 2, pp * a * 2);
                        ctx.restore();
                        ctx.strokeStyle = "rgba(255,236,170,0.9)"; ctx.lineWidth = Math.Max(1, z * 0.05); ctx.stroke();
                        ctx.restore();
                        foreach (var c in przy) iskryZKowadla(ctx, kx, ky, z * 0.6, c, teraz, true);
                    }
                }
                else if (pom.rodzaj == "sypialnia")
                {
                    // płomyk świecy i „z z z” nad śpiącymi
                    var s = u.swieca;
                    var m = ruch ? 0.8 + 0.2 * JsM.Sin(teraz * 0.011) : 0.9;
                    var g = ctx.createRadialGradient(s.x, s.y - z * 0.4, 0, s.x, s.y - z * 0.4, z * 1.8);
                    g.addColorStop(0, Barwa.Rgba(255, 214, 140, 0.45 * m)); g.addColorStop(1, "rgba(255,200,120,0)");
                    ctx.fillStyle = g; ctx.fillRect(s.x - z * 1.8, s.y - z * 2.2, z * 3.6, z * 3.6);
                    ctx.fillStyle = Barwa.Rgba(255, 230, 150, m);
                    ctx.beginPath(); ctx.ellipse(s.x, s.y - z * 0.4, z * 0.06, z * 0.13, 0, 0, Math.PI * 2); ctx.fill();
                    foreach (var c in sim.creatures)
                    {
                        if (c.dead || c.czynnosc != "spi" || c.polecenie?.pom != pom.id) continue;
                        // nad głową leżącego (tułów leży ok. dwóch kafli w stronę, w którą patrzy)
                        var glowa = cam.toScreenX(c.x) - Figury.wysokoscPostaci(c, z) * 1.3 * (c.face >= 0 ? 1 : -1);
                        zzz(ctx, glowa, cam.toScreenY(c.y + 0.5), z, teraz + c.id * 400, ruch);
                    }
                }
                // czego brakuje do pracy
                if (pom.brak != null && przy.Count > 0 && z >= 5)
                {
                    podpis(ctx, pom.brak, cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y) - z * 0.3, z, pom.brak == "zbroja gotowa" ? ZLOTO_PLANU(0.95) : CZERWIEN(0.95));
                }
                if (pod?.pom == pom) obrysPod(ctx, cam, pom, pod, teraz);
            }
            rysujZdarzenia(ctx, sim, cam, teraz);
            ctx.restore();
        }

        /// <summary>Etap 3f: przed postaciami — część zbroi w rękach rycerza i błysk, gdy siądzie na nim.</summary>
        public void rysujPrzod(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var z = cam.zoom;
            ctx.save();
            foreach (var pom in sim.pomieszczenia)
            {
                if (!pom.gotowe || pom.rodzaj != "kuznia" || !widac(cam, pom)) continue;
                var u = uklad(cam, pom);
                foreach (var c in zakladajacy(sim, pom)) czescWRekach(ctx, sim, cam, c, u, teraz);
            }
            foreach (var an in animacje)
            {
                var e = an.z;
                if (e.rodzaj != "zbroja") continue;
                var t = (teraz - an.od) / 1000;
                // część siadła na rycerzu: błysk z promieniami w tym miejscu, krąg światła i podpis, co daje
                var c = e.kto is double kid ? sim.creatureById(kid) : null;
                if (c == null || t > 1.8) continue;
                var cz = e.czesc ?? "";
                var (x, y) = naCiele(cam, c, cz);
                double p = t / 1.8, b = Math.Max(0, 1 - t / 0.5);
                var R = z * (0.5 + 1.8 * Math.Min(1, t * 4));
                var g = ctx.createRadialGradient(x, y, 0, x, y, R);
                g.addColorStop(0, Barwa.Rgba(255, 246, 214, 0.85 * (1 - p))); g.addColorStop(0.35, Barwa.Rgba(255, 226, 160, 0.35 * (1 - p))); g.addColorStop(1, "rgba(255,220,150,0)");
                ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
                if (b > 0)
                {
                    ctx.strokeStyle = Barwa.Rgba(255, 250, 230, 0.95 * b); ctx.lineWidth = Math.Max(1, z * 0.07); ctx.lineCap = "round";
                    ctx.beginPath();
                    for (int i = 0; i < 8; i++)
                    {
                        double a = (i / 8.0) * Math.PI * 2 + 0.3, r0 = z * (0.25 + t * 0.8), r1 = r0 + z * (i % 2 != 0 ? 0.35 : 0.65) * b;
                        ctx.moveTo(x + JsM.Cos(a) * r0, y + JsM.Sin(a) * r0); ctx.lineTo(x + JsM.Cos(a) * r1, y + JsM.Sin(a) * r1);
                    }
                    ctx.stroke();
                }
                var al = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
                ctx.font = $"italic {Js.Js.S(Math.Max(12, Math.Min(16, z * 0.7)))}px {SERIF}";
                ctx.textAlign = "center";
                var tekst = $"{CZESC[cz].nazwa}: {CZESC[cz].skutek}";
                var ty = cam.toScreenY(c.y + 1) - Figury.wysokoscPostaci(c, z) * 1.15 - p * z * 1.2;
                ctx.lineWidth = 3; ctx.strokeStyle = Barwa.Rgba(8, 6, 5, 0.8 * al); ctx.strokeText(tekst, x, ty);
                ctx.fillStyle = ZLOTO_PLANU(0.98 * al); ctx.fillText(tekst, x, ty);
            }
            ctx.restore();
        }

        /// <summary>Obłok pyłu przy gotowym pomieszczeniu, gotowa część zbroi nad kowadłem, gasnąca czerwona aureola.</summary>
        void rysujZdarzenia(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var z = cam.zoom;
            foreach (var an in animacje)
            {
                var e = an.z;
                var t = (teraz - an.od) / 1000;
                if (e.rodzaj == "gotowe")
                {
                    var pom = sim.pomieszczenia.FirstOrDefault(p => p.id == e.pom);
                    if (pom == null || t > 1) continue;
                    for (int i = 0; i < 16; i++)
                    {
                        double px = cam.toScreenX(pom.x + los(i * 7 + pom.id) * pom.w), py = cam.toScreenY(pom.y + pom.h - los(i * 11 + pom.id) * pom.h * 0.6);
                        var r = z * (0.2 + t * 0.6) * (0.6 + los(i));
                        ctx.fillStyle = Barwa.Rgba(196, 176, 140, 0.45 * (1 - t));
                        ctx.beginPath(); ctx.arc(px, py - t * z * 0.6, r, 0, Math.PI * 2); ctx.fill();
                    }
                }
                else if (e.rodzaj == "czesc")
                {
                    if (t > 2.2) continue;
                    var p = Math.Min(1, t / 2.2);
                    double x = cam.toScreenX(e.x ?? 0), y = cam.toScreenY(e.y ?? 0) - p * z * 1.6;
                    var a = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
                    var R = z * (0.6 + 1.2 * Math.Min(1, t * 3));
                    var g = ctx.createRadialGradient(x, y, 0, x, y, R);
                    g.addColorStop(0, Barwa.Rgba(255, 236, 180, 0.7 * a)); g.addColorStop(1, "rgba(255,220,150,0)");
                    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
                    ctx.globalAlpha = a;
                    rysujCzesc(ctx, e.czesc ?? "", x, y, z * 0.7, "rgba(206,212,224,0.98)", "rgba(20,12,8,0.95)");
                    var nazwa = POMIESZCZENIA.kuznia.czesci.FirstOrDefault(c => c.id == e.czesc)?.nazwa ?? "";
                    ctx.font = $"italic {Js.Js.S(Math.Max(12, Math.Min(16, z * 0.7)))}px {SERIF}";
                    ctx.textAlign = "center"; ctx.fillStyle = ZLOTO_PLANU(0.95);
                    ctx.fillText($"{nazwa} dla rycerza", x, y - z * 0.6);
                    ctx.globalAlpha = 1;
                }
                else if (e.rodzaj == "lina")
                {
                    // pył sypie się spod haka, a gdy zwój dotknie dna — obłoczek przy podłodze
                    if (t > 1.6) continue;
                    double ex = e.x ?? 0, ey0 = e.y0 ?? 0, ey1 = e.y1 ?? 0;
                    double x = cam.toScreenX(ex + 0.5), yh = cam.toScreenY(ey0);
                    var p1 = Math.Min(1, t / 0.6);
                    for (int i = 0; i < 9; i++)
                    {
                        double px = x + (los(i * 5 + ey0) - 0.5) * z * 0.8, py = yh + p1 * z * (0.5 + 1.2 * los(i * 3 + ex));
                        ctx.fillStyle = Barwa.Rgba(190, 160, 110, 0.7 * (1 - p1));
                        ctx.beginPath(); ctx.arc(px, py, Math.Max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
                    }
                    var tDol = t - LINA_SPADA / 1000;
                    if (tDol > 0 && tDol < 0.8)
                    {
                        double pd = tDol / 0.8, yd = cam.toScreenY(ey1 + 2);
                        for (int i = 0; i < 6; i++)
                        {
                            ctx.fillStyle = Barwa.Rgba(196, 176, 140, 0.4 * (1 - pd));
                            ctx.beginPath(); ctx.arc(x + (los(i * 7 + ex) - 0.5) * z * (0.6 + pd), yd - pd * z * 0.3, z * (0.12 + pd * 0.25), 0, Math.PI * 2); ctx.fill();
                        }
                    }
                }
                else if (e.rodzaj == "wypoczety")
                {
                    var c = e.kto is double kid ? sim.creatureById(kid) : null;
                    if (c == null || t > 1.4) continue;
                    double x = cam.toScreenX(c.x), y = cam.toScreenY(c.y) - z * 0.6;
                    var p = t / 1.4;
                    // czerwona aureola rośnie i rozpływa się, a na jej miejscu na chwilę jaśnieje
                    ctx.strokeStyle = CZERWIEN(0.9 * (1 - p)); ctx.lineWidth = Math.Max(1.5, z * 0.08);
                    ctx.beginPath(); ctx.ellipse(x, y - p * z * 0.8, z * (0.4 + p * 0.9), z * (0.13 + p * 0.3), 0, 0, Math.PI * 2); ctx.stroke();
                    var g = ctx.createRadialGradient(x, y, 0, x, y, z * 1.2);
                    g.addColorStop(0, Barwa.Rgba(255, 240, 190, 0.5 * JsM.Sin(p * Math.PI))); g.addColorStop(1, "rgba(255,240,190,0)");
                    ctx.fillStyle = g; ctx.fillRect(x - z * 1.2, y - z * 1.2, z * 2.4, z * 2.4);
                }
            }
        }

        /// <summary>Podgląd szablonu pod kursorem: jasny kontur, gdy wolno, czerwony z powodem, gdy nie.</summary>
        public void podglad(IPlotno ctx, Sim sim, Camera cam, ProbaPlanu p, double teraz, string? podpowiedz = null)
        {
            var z = cam.zoom;
            ctx.save();
            Func<double, Styl> barwa = p.ok ? ZLOTO_PLANU : CZERWIEN;
            var w = sim.world;
            ctx.fillStyle = barwa(0.16);
            foreach (var i in p.kafle)
            {
                double x = i % w.w, y = Math.Floor(i / w.w);
                ctx.fillRect(cam.toScreenX(x), cam.toScreenY(y), z, z);
            }
            ctx.setLineDash(Math.Max(3, z * 0.35), Math.Max(2, z * 0.2));
            ctx.lineDashOffset = Nastroj.wolnoRuszac() ? -teraz * 0.02 : 0;
            ctx.strokeStyle = barwa(0.95); ctx.lineWidth = Math.Max(1.6, z * 0.1);
            obrysKafli(ctx, cam, p.kafle, w.w);
            ctx.setLineDash();
            // lina: przerywany zarys liny z haka do podłogi, a przy krawędzi półki — strzałka na nią
            if (p.rodzaj == "lina")
            {
                var k = Pomieszczenia.kotwicaLiny(w, p.x, p.y);
                var (lx, ly) = zaczepienie(p.x, p.y, k);
                ctx.setLineDash(Math.Max(3, z * 0.3), Math.Max(2, z * 0.18));
                ctx.strokeStyle = barwa(0.9); ctx.lineWidth = Math.Max(1.6, z * 0.12);
                ctx.beginPath(); ctx.moveTo(cam.toScreenX(lx), cam.toScreenY(ly)); ctx.lineTo(cam.toScreenX(lx), cam.toScreenY(p.y + p.h)); ctx.stroke();
                ctx.setLineDash();
                if (k != null) hakWSkale(ctx, cam, p.x, p.y, z, k, p.ok ? 0.75 : 0.35);
                if (p.ok && p.kier is double kier && kier != 0 && k?.rodzaj == "krawedz")
                {
                    double ax = cam.toScreenX(p.x + 0.5 + kier * 0.9), ay = cam.toScreenY(p.y + 0.5);
                    ctx.fillStyle = barwa(0.95);
                    ctx.beginPath(); ctx.moveTo(ax + kier * z * 0.35, ay); ctx.lineTo(ax - kier * z * 0.1, ay - z * 0.28); ctx.lineTo(ax - kier * z * 0.1, ay + z * 0.28); ctx.closePath(); ctx.fill();
                }
            }
            // podłoga pod planem
            if (Pomieszczenia.czyPokoj(p.rodzaj))
            {
                ctx.strokeStyle = barwa(0.6); ctx.lineWidth = Math.Max(1, z * 0.06);
                ctx.beginPath(); ctx.moveTo(cam.toScreenX(p.x), cam.toScreenY(p.y + p.h) + 1); ctx.lineTo(cam.toScreenX(p.x + p.w), cam.toScreenY(p.y + p.h) + 1); ctx.stroke();
            }
            var tekst = p.ok ? (podpowiedz ?? $"{NAZWA_POMIESZCZENIA[p.rodzaj]} — dotknij, by wyznaczyć") : (p.powod ?? "tu nie wolno");
            // korytarz i szyb zaczynają się tam, gdzie stoi lud — podpis pod planem
            var yPodpisu = Pomieszczenia.czyPokoj(p.rodzaj) ? cam.toScreenY(p.y) - z * 0.35 : cam.toScreenY(p.y + p.h) + z * 1.1;
            podpis(ctx, tekst, cam.toScreenX(p.x) + (p.w * z) / 2, yPodpisu, z, p.ok ? ZLOTO_PLANU(0.98) : CZERWIEN(0.98));
            ctx.restore();
        }

        /// <summary>Czy pomieszczenie jest w kadrze.</summary>
        static bool widac(Camera cam, Pomieszczenie p)
        {
            var z = cam.zoom;
            double x1 = cam.toScreenX(p.x), y1 = cam.toScreenY(p.y);
            return x1 + p.w * z > -z * 4 && y1 + p.h * z > -z * 4 && x1 < cam.vw + z * 4 && y1 < cam.vh + z * 4;
        }

        /// <summary>Etap 3f: od tej chwili zakładania (0..1) część jest już w rękach rycerza, nie na wieszaku.</summary>
        const double ZDEJMUJE = 0.22;

        /// <summary>Ile rycerz już założył bieżącej części (0..1).</summary>
        static double postepZakladania(Creature c) => Math.Max(0, Math.Min(1, (c.zakladanie ?? 0) / ZBROJA.zakladanieTikow));

        /// <summary>Rycerze, którzy stoją pod wieszakiem tej kuźni i zakładają zbroję.</summary>
        static List<Creature> zakladajacy(Sim sim, Pomieszczenie pom) =>
            sim.creatures.Where(c => !c.dead && c.czynnosc == "zaklada" && c.doKuzni == pom.id).ToList();

        /// <summary>Hak wieszaka, na którym wisi i-ta część (piksele ekranu).</summary>
        static (double x, double y) hakWieszaka(Uklad u, double z, int i) =>
            (u.polka.x1 + z * (0.3 + (i % 3) * 0.48), u.polka.y + z * (0.45 + Math.Floor(i / 3.0) * 0.6));

        /// <summary>Gdzie na rycerzu siada część (piksele ekranu): głowa, barki, pierś, kolana, przedramię z tarczą.</summary>
        static (double x, double y) naCiele(Camera cam, Creature c, string cz)
        {
            var h = Figury.wysokoscPostaci(c, cam.zoom); var kier = c.face >= 0 ? 1 : -1;
            var wys = cz switch { "helm" => 0.92, "naramienniki" => 0.78, "napiersnik" => 0.64, "nakolanniki" => 0.2, "tarcza" => 0.5, _ => double.NaN };
            return (cam.toScreenX(c.x) + kier * h * (cz == "tarcza" ? 0.12 : cz == "nakolanniki" ? 0.1 : 0.05), cam.toScreenY(c.y + 1) - h * wys);
        }

        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }

        /// <summary>
        /// Część zbroi w rękach rycerza: zdjęta z haka unosi się, schodzi na swoje miejsce na ciele, chwilę ją dopasowuje
        /// i część wtapia się w rysunek rycerza.
        /// </summary>
        static void czescWRekach(IPlotno ctx, Sim sim, Camera cam, Creature c, Uklad u, double teraz)
        {
            var k = postepZakladania(c);
            var wieszak = Zbroja.naWieszaku(sim);
            var id = wieszak.Count > 0 ? wieszak[0] : null;
            if (k < ZDEJMUJE || id == null) return;
            var z = cam.zoom;
            var (hx, hy) = hakWieszaka(u, z, 0);
            var (tx, ty) = naCiele(cam, c, id);
            var lot = gladko((k - 0.4) / 0.2);
            var unos = gladko((k - ZDEJMUJE) / 0.18) * z * 0.25;
            var szarp = k > 0.6 && k < 0.9 && Nastroj.wolnoRuszac() ? JsM.Sin(teraz * 0.03 + c.id) * z * 0.04 : 0;
            double x = hx + (tx - hx) * lot + szarp, y = hy - unos * (1 - lot) + (ty - hy) * lot;
            var a = k > 0.88 ? Math.Max(0, 1 - (k - 0.88) / 0.12) : 1;
            var R = z * 0.9;
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 236, 190, 0.3 * a)); g.addColorStop(1, "rgba(255,230,170,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            ctx.globalAlpha = a;
            rysujCzesc(ctx, id, x, y, z * (0.42 + 0.08 * lot), "rgba(196,202,214,0.98)", TUSZ);
            ctx.globalAlpha = 1;
        }

        /// <summary>Ci, którzy stoją przy stole albo kowadle tego pomieszczenia.</summary>
        static List<Creature> pracujacy(Sim sim, Pomieszczenie pom) =>
            sim.creatures.Where(c => !c.dead && c.czynnosc == "buduje" && c.polecenie?.typ == "praca" && c.polecenie.pom == pom.id).ToList();

        /// <summary>Kontur zbioru kafli: tylko krawędzie, za którymi nie ma kafla z tego zbioru.</summary>
        static void obrysKafli(IPlotno ctx, Camera cam, List<double> kafle, double W)
        {
            var z = cam.zoom;
            var zb = new HashSet<double>(kafle);
            ctx.beginPath();
            foreach (var i in kafle)
            {
                double x = i % W, y = Math.Floor(i / W);
                double sx = cam.toScreenX(x), sy = cam.toScreenY(y);
                if (!zb.Contains(i - W)) { ctx.moveTo(sx, sy); ctx.lineTo(sx + z, sy); }
                if (!zb.Contains(i + W)) { ctx.moveTo(sx, sy + z); ctx.lineTo(sx + z, sy + z); }
                if (!zb.Contains(i - 1) || x == 0) { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + z); }
                if (!zb.Contains(i + 1) || x == W - 1) { ctx.moveTo(sx + z, sy); ctx.lineTo(sx + z, sy + z); }
            }
            ctx.stroke();
        }

        /// <summary>Podpis nad planem: kursywa z ciemnym obrysem, żeby była czytelna na skale.</summary>
        static void podpis(IPlotno ctx, string tekst, double x, double y, double z, Styl barwa)
        {
            ctx.font = $"italic {Js.Js.S(Math.Max(12, Math.Min(16, z * 0.7)))}px {SERIF}";
            ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
            ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,7,6,0.85)";
            ctx.strokeText(tekst, x, y);
            ctx.fillStyle = barwa;
            ctx.fillText(tekst, x, y);
        }

        /// <summary>Konopie liny: zgaszona nić i ciemniejszy skręt.</summary>
        const string KONOPIE = "rgba(142,112,78,0.98)", SKRET = "rgba(66,46,28,0.9)";
        /// <summary>Ile trwa spadanie liny z haka i ile jeszcze się kołysze, zanim się uspokoi (ms).</summary>
        const double LINA_SPADA = 650, LINA_USPOKAJA = 1600;

        /// <summary>
        /// Liny (world.lina): każdy pionowy odcinek kafli z liną to jedna lina — z haka u góry odcinka do podłogi pod
        /// nim. Świeże liny spadają: zwój zjeżdża z haka, za nim rozwija się lina, potem kołysze się i uspokaja.
        /// </summary>
        static void rysujLiny(IPlotno ctx, Sim sim, Camera cam, double teraz, List<LinaAnim> anim)
        {
            var w = sim.world;
            var z = cam.zoom;
            double left = Math.Max(0, Math.Floor(cam.x - cam.vw / 2 / z) - 1), right = Math.Min(w.w - 1, Math.Ceiling(cam.x + cam.vw / 2 / z) + 1);
            double top = Math.Max(0, Math.Floor(cam.y - cam.vh / 2 / z) - 1), bottom = Math.Min(w.h - 2, Math.Ceiling(cam.y + cam.vh / 2 / z) + 1);
            var ruch = Nastroj.wolnoRuszac();
            ctx.save();
            ctx.lineCap = "round";
            for (var x = left; x <= right; x++)
            {
                for (var y = top; y <= bottom; y++)
                {
                    var i = y * w.w + x;
                    if (w.lina[i] != 1) continue;
                    // odcinek liny w tej kolumnie: od tego kafla w dół, póki jest lina (a nad nim — skąd zwisa)
                    var ya = y;
                    while (ya - 1 >= 0 && w.lina[i - (y - ya + 1) * w.w] == 1) ya--;
                    var y2 = y;
                    while (y2 + 1 < w.h && w.lina[i + (y2 + 1 - y) * w.w] == 1) y2++;
                    var doPodlogi = w.passable(x, y2 + 1) ? 1 : 0;
                    var a = anim.FirstOrDefault(q => q.x == x && q.y0 <= y2 && q.y1 >= ya);
                    var t = a != null && ruch ? teraz - a.od : double.PositiveInfinity;
                    linaWKolumnie(ctx, cam, x, ya, y2 + doPodlogi, z, t, teraz, ruch, doPodlogi == 1, Pomieszczenia.kotwicaLiny(w, x, ya));
                    y = y2;
                }
            }
            ctx.restore();
        }

        /// <summary>Gdzie lina zwisa (kafle): kolumna liny przy skale i punkt, od którego wisi.</summary>
        static (double lx, double ly) zaczepienie(double x, double yOd, KotwicaLiny? k)
        {
            if (k == null) return (x + 0.5, yOd);
            if (k.rodzaj == "strop") return (x + 0.5, yOd);
            // krawędź półki i ściana: lina zwisa tuż przy skale, od brzegu półki (albo od haka w ścianie) w dół
            return (x + 0.5 + k.strona * 0.28, k.y);
        }

        /// <summary>
        /// Jedna lina w kolumnie `x` (od `yOd` do `yDo`), uczepiona skały w `k`. `t` — ile ms temu spadła (∞ — wisi od
        /// dawna): najpierw zwój zjeżdża w dół, potem lina kołysze się coraz słabiej.
        /// </summary>
        static void linaWKolumnie(IPlotno ctx, Camera cam, double x, double yOd, double yDo, double z, double t, double teraz, bool ruch, bool naPodlodze, KotwicaLiny? k)
        {
            var (lx, ly) = zaczepienie(x, yOd, k);
            double cx = cam.toScreenX(lx), gora = cam.toScreenY(ly), dol = cam.toScreenY(yDo + 1);
            var dl = Math.Max(1, dol - gora);
            var rozwin = t < LINA_SPADA ? Math.Pow(t / LINA_SPADA, 1.6) : 1;
            var koniec = gora + dl * rozwin;
            // kołysanie: po spadnięciu mocne i gasnące, potem ledwie oddech
            var po = t - LINA_SPADA;
            var mocno = t < LINA_SPADA ? 0.5 : po < LINA_USPOKAJA ? 0.5 * (1 - po / LINA_USPOKAJA) : 0;
            var faza = ruch ? teraz * 0.004 + x * 1.7 : 0;
            var amp = z * (0.06 + mocno) * (ruch ? 1 : 0) * (k != null && k.rodzaj != "strop" ? 0.6 : 1);
            double odch(double s) => JsM.Sin(faza + (t < double.PositiveInfinity ? t * 0.012 : 0)) * amp * JsM.Sin(Math.PI * 0.5 * Math.Min(1, s)) * (naPodlodze ? 1 - Math.Max(0, s - 0.85) / 0.15 : 1);
            var kroki = Math.Max(6, (int)Math.Ceiling(dl / Math.Max(3, z * 0.25)));
            var punkty = new List<(double x, double y)>();
            for (int n = 0; n <= kroki; n++)
            {
                var s = (double)n / kroki;
                var py = gora + (koniec - gora) * s;
                punkty.Add((cx + odch((py - gora) / dl), py));
            }
            void sciezka() { ctx.beginPath(); for (int n = 0; n < punkty.Count; n++) { if (n > 0) ctx.lineTo(punkty[n].x, punkty[n].y); else ctx.moveTo(punkty[n].x, punkty[n].y); } }
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(2.4, z * 0.17); sciezka(); ctx.stroke();
            ctx.strokeStyle = KONOPIE; ctx.lineWidth = Math.Max(1.4, z * 0.1); sciezka(); ctx.stroke();
            // skręt konopi: ukośne kreski co kawałek
            ctx.strokeStyle = SKRET; ctx.lineWidth = Math.Max(0.8, z * 0.035);
            ctx.beginPath();
            for (int n = 1; n < punkty.Count; n++)
            {
                var (px, py) = punkty[n];
                ctx.moveTo(px - z * 0.05, py - z * 0.06); ctx.lineTo(px + z * 0.05, py + z * 0.02);
            }
            ctx.stroke();
            // węzły na chwyt — co kafel, w połowie wysokości (tylko tam, gdzie lina już wisi)
            for (var y = yOd; y <= yDo; y++)
            {
                var wy = cam.toScreenY(y + 0.5);
                if (wy < gora + z * 0.2) continue;
                if (wy > koniec) break;
                var wx = cx + odch((wy - gora) / dl);
                ctx.fillStyle = TUSZ; ctx.beginPath(); ctx.ellipse(wx, wy, z * 0.11, z * 0.08, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = KONOPIE; ctx.beginPath(); ctx.ellipse(wx, wy, z * 0.07, z * 0.05, 0, 0, Math.PI * 2); ctx.fill();
            }
            // zwój: zjeżdża z liną, a gdy lina sięga podłogi — leży tam
            if (t < LINA_SPADA) zwoj(ctx, punkty[punkty.Count - 1].x, koniec, z, 1 - rozwin * 0.6);
            else if (naPodlodze) zwoj(ctx, cx + z * 0.12, dol - z * 0.08, z, 0.45);
            hakWSkale(ctx, cam, x, yOd, z, k, 1);
        }

        /// <summary>Hak wbity w skałę tam, gdzie lina się jej uczepiła: w krawędź półki, w strop albo w ścianę.</summary>
        static void hakWSkale(IPlotno ctx, Camera cam, double x, double yOd, double z, KotwicaLiny? k, double alfa)
        {
            var (lx, ly) = zaczepienie(x, yOd, k);
            if (k == null || k.rodzaj == "strop") { hak(ctx, cam.toScreenX(lx), cam.toScreenY(ly), z, alfa); return; }
            var s = k.strona;
            ctx.save();
            ctx.globalAlpha = alfa;
            ctx.lineCap = "round";
            if (k.rodzaj == "krawedz")
            {
                // kołek wbity w półkę, kawałek od brzegu; lina z oczka przez brzeg i w dół
                double kx = cam.toScreenX(k.x + s * 0.4), ky = cam.toScreenY(k.y);
                double rx = cam.toScreenX(k.x), sx = cam.toScreenX(lx);
                foreach (var (barwa, gr) in new[] { (TUSZ, Math.Max(2.4, z * 0.17)), (KONOPIE, Math.Max(1.4, z * 0.1)) })
                {
                    ctx.strokeStyle = barwa; ctx.lineWidth = gr;
                    ctx.beginPath(); ctx.moveTo(kx, ky - z * 0.12); ctx.quadraticCurveTo(rx, ky - z * 0.14, sx, ky + z * 0.08); ctx.stroke();
                }
                ctx.fillStyle = "rgba(70,70,76,0.98)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.05);
                ctx.beginPath(); ctx.rect(kx - z * 0.06, ky - z * 0.3, z * 0.12, z * 0.42); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = "rgba(120,120,128,0.98)"; ctx.lineWidth = Math.Max(1.2, z * 0.06);
                ctx.beginPath(); ctx.arc(kx, ky - z * 0.3, z * 0.09, 0, Math.PI * 2); ctx.stroke();
            }
            else
            {
                // kołek wbity w ścianę z boku; oczko przy ścianie
                double wx = cam.toScreenX(k.x), wy = cam.toScreenY(k.y);
                ctx.fillStyle = "rgba(70,70,76,0.98)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.05);
                ctx.beginPath(); ctx.rect(s > 0 ? wx - z * 0.08 : wx - z * 0.22, wy - z * 0.06, z * 0.3, z * 0.12); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = "rgba(120,120,128,0.98)"; ctx.lineWidth = Math.Max(1.2, z * 0.06);
                ctx.beginPath(); ctx.arc(wx - s * z * 0.12, wy + z * 0.06, z * 0.09, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Żelazny hak wbity w strop nad liną, z oczkiem, przez które przewiązano linę.</summary>
        static void hak(IPlotno ctx, double x, double y, double z, double alfa)
        {
            ctx.save();
            ctx.globalAlpha = alfa;
            ctx.fillStyle = "rgba(70,70,76,0.98)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.05);
            ctx.beginPath(); ctx.rect(x - z * 0.22, y - z * 0.1, z * 0.44, z * 0.12); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "rgba(120,120,128,0.98)"; ctx.lineWidth = Math.Max(1.2, z * 0.06);
            ctx.beginPath(); ctx.arc(x, y + z * 0.08, z * 0.1, 0, Math.PI * 2); ctx.stroke();
            // owinięcie liny wokół oczka
            ctx.strokeStyle = KONOPIE; ctx.lineWidth = Math.Max(1, z * 0.06);
            ctx.beginPath(); ctx.moveTo(x - z * 0.1, y + z * 0.12); ctx.lineTo(x + z * 0.1, y + z * 0.2); ctx.stroke();
            ctx.restore();
        }

        /// <summary>Zwój liny — kilka zwojów konopi (`r` — jak duży, 0..1).</summary>
        static void zwoj(IPlotno ctx, double x, double y, double z, double r)
        {
            ctx.save();
            for (int k = 0; k < 3; k++)
            {
                var rx = z * (0.18 + 0.14 * r) * (1 - k * 0.18); var ry = rx * 0.45;
                ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1.6, z * 0.11);
                ctx.beginPath(); ctx.ellipse(x, y - k * z * 0.05, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = KONOPIE; ctx.lineWidth = Math.Max(1, z * 0.06);
                ctx.beginPath(); ctx.ellipse(x, y - k * z * 0.05, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Plan na skale: podwójny kontur kreską rycinową, kafle do wykucia przekreślone, nazwa i ile zostało.</summary>
        static void rysujPlan(IPlotno ctx, Sim sim, Camera cam, Pomieszczenie pom, double teraz, PodKursorem? pod)
        {
            var podKursorem = pod != null;
            var z = cam.zoom;
            var w = sim.world;
            ctx.save();
            // kafle do wykucia — przekreślone ukośnie, jak na planie budowniczego
            ctx.strokeStyle = ZLOTO_PLANU(podKursorem ? 0.75 : 0.45); ctx.lineWidth = Math.Max(1, z * 0.05);
            ctx.beginPath();
            var m = z * 0.22;
            foreach (var i in pom.kafle)
            {
                double x = i % w.w, y = Math.Floor(i / w.w);
                if (!w.solid(x, y)) continue;
                double sx = cam.toScreenX(x), sy = cam.toScreenY(y);
                ctx.moveTo(sx + m, sy + m); ctx.lineTo(sx + z - m, sy + z - m);
                ctx.moveTo(sx + z - m, sy + m); ctx.lineTo(sx + m, sy + z - m);
            }
            ctx.stroke();
            // podwójny kontur: przerywany i cienki pod nim
            if (podKursorem) { ctx.shadowColor = "rgba(246,206,120,0.9)"; ctx.shadowBlur = 10; }
            ctx.setLineDash(Math.Max(3, z * 0.4), Math.Max(2, z * 0.22));
            ctx.lineDashOffset = Nastroj.wolnoRuszac() ? -teraz * 0.01 : 0;
            ctx.strokeStyle = ZLOTO_PLANU(podKursorem ? 1 : 0.85); ctx.lineWidth = Math.Max(1.4, z * (podKursorem ? 0.12 : 0.08));
            obrysKafli(ctx, cam, pom.kafle, w.w);
            ctx.setLineDash();
            ctx.shadowBlur = 0;
            if (z >= 5)
            {
                var zostalo = Pomieszczenia.zostaloKafli(sim, pom);
                podpis(ctx, $"plan: {NAZWA_POMIESZCZENIA[pom.rodzaj]} · {Js.Js.S(pom.kafle.Count - zostalo)}/{pom.kafle.Count}",
                    cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y) - z * 0.35, z, ZLOTO_PLANU(0.92));
            }
            // pod kursorem: co zrobią zaznaczeni — pod podłogą
            if (pod != null) podpis(ctx, pod.akcja, cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y + pom.h) + z * 0.95, z, pod.ok ? ZLOTO_PLANU(0.98) : CZERWIEN(0.98));
            ctx.restore();
        }

        /// <summary>Gotowe pomieszczenie pod kursorem: jasny kontur i podpis, co zrobią zaznaczeni.</summary>
        static void obrysPod(IPlotno ctx, Camera cam, Pomieszczenie pom, PodKursorem pod, double teraz)
        {
            var z = cam.zoom;
            ctx.save();
            ctx.shadowColor = pod.ok ? "rgba(246,206,120,0.9)" : "rgba(226,96,72,0.9)"; ctx.shadowBlur = 10;
            ctx.strokeStyle = pod.ok ? ZLOTO_PLANU(0.95) : CZERWIEN(0.95); ctx.lineWidth = Math.Max(1.6, z * 0.1);
            ctx.setLineDash(Math.Max(3, z * 0.4), Math.Max(2, z * 0.22));
            ctx.lineDashOffset = Nastroj.wolnoRuszac() ? -teraz * 0.02 : 0;
            ctx.strokeRect(cam.toScreenX(pom.x), cam.toScreenY(pom.y), pom.w * z, pom.h * z);
            ctx.restore();
            podpis(ctx, pod.akcja, cam.toScreenX(pom.x) + (pom.w * z) / 2, cam.toScreenY(pom.y + pom.h) + z * 0.95, z, pod.ok ? ZLOTO_PLANU(0.98) : CZERWIEN(0.98));
        }

        /// <summary>Iskry spod młotka w chwili uderzenia (faza zamachu robotnika — Figury.fazaMlota).</summary>
        static void iskryZKowadla(IPlotno ctx, double x, double y, double z, Creature c, double teraz, bool zlote = false)
        {
            if (!Nastroj.wolnoRuszac()) return;
            var f = Figury.fazaMlota(c);
            if (f < 0.5 || f > 0.72) return;
            var p = (f - 0.5) / 0.22;
            var nr = Math.Floor(teraz / 625) + c.id * 31;
            ctx.save();
            ctx.lineCap = "round"; ctx.lineWidth = Math.Max(1.2, z * 0.06);
            for (int k = 0; k < (zlote ? 5 : 9); k++)
            {
                var a = -Math.PI * (0.08 + 0.84 * los(nr * 7 + k));
                var v = z * (0.4 + 0.9 * los(nr * 3 + k * 11));
                double px = x + JsM.Cos(a) * v * p, py = y + JsM.Sin(a) * v * p + z * 0.5 * p * p;
                ctx.strokeStyle = zlote ? Barwa.Rgba(255, 236, 170, 1 - p) : Barwa.Rgba(255, Rnd(210 - 90 * p), Rnd(120 - 80 * p), 1 - p);
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - JsM.Cos(a) * z * 0.18, py - JsM.Sin(a) * z * 0.18); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>„z z z” nad śpiącym: trzy litery unoszą się i rosną.</summary>
        static void zzz(IPlotno ctx, double x, double y, double z, double teraz, bool ruch)
        {
            ctx.save();
            ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            for (int i = 0; i < 3; i++)
            {
                var f = ruch ? ((teraz * 0.0005 + i / 3.0) % 1) : i / 3.0;
                var s = Math.Max(9, z * (0.35 + f * 0.35));
                ctx.font = $"italic {Js.Js.S(s)}px {SERIF}";
                ctx.fillStyle = Barwa.Rgba(226, 214, 186, 0.9 * JsM.Sin(f * Math.PI));
                ctx.fillText("z", x + z * (0.2 + f * 0.6), y - z * (0.6 + f * 1.2));
            }
            ctx.restore();
        }

        /// <summary>Co zrobią zaznaczeni po dotknięciu tego pomieszczenia (podpis nad nim).</summary>
        public static (string akcja, bool ok) akcjaNaPomieszczeniu(Pomieszczenie pom, double robotnikow, double innych, double rycerzy = 0, double naWieszaku = 0)
        {
            if (!pom.gotowe) return robotnikow != 0 ? ("kujcie ten plan", true) : ("kują tylko robotnicy", false);
            var r = pom.rodzaj;
            if (r == "sypialnia") return ("idźcie spać — sen zdejmie osłabienia", true);
            // etap 3f: rycerz w kuźni zakłada części z wieszaka
            if (r == "kuznia" && rycerzy != 0 && robotnikow == 0)
                return naWieszaku != 0 ? ($"załóż zbroję z wieszaka ({Js.Js.S(naWieszaku)} {(naWieszaku == 1 ? "część" : "części")})", true) : ("nie ma części na wieszaku", false);
            if (robotnikow != 0) return (r == "warsztat" ? "pracuj: krzyże ze złota" : rycerzy != 0 ? "pracuj: zbroja z żelaza (rycerz ją założy)" : "pracuj: zbroja z żelaza", true);
            return (innych != 0 ? "wejdź do środka (pracują tu robotnicy)" : "", true);
        }
    }
}
