// Oprawa walki, etap 2 (docs/plan-oprawy-cerber.md): czytelność. Tylko obraz — symulacja o niczym nie wie.
//
//  - Postać przy bossie zawsze widać. Ta, która na niego nachodzi i rysuje się przed nim (stoi „za” nim), wraca po
//    bossie jako sylwetka w pergaminie (ok. 35% krycia); ta, która rysuje się po nim (stoi „przed” nim), dostaje jasny
//    obrys. Rozpoznanie w Figury.rysujStworzenia (prostokąt postaci × prostokąt ciała bossa), rysunek tu: Duszek.Rysuj
//    oddaje każdą klatkę duszka do Duszek(…) — zapis albo obrys.
//  - Głowy Cerbera: RysCerber.rysujCerbera (gdy rysuje bossa) oddaje punkty trzech głów z szkieletu w tej klatce;
//    nad każdą głową znak I / II / III (kolejność ścinania: pitbull, wilk, doberman) w stylu księgi, połączony z głową
//    cienką kreską; głowa do ścięcia pulsuje (mocniej i czerwono, gdy jej pasek jest pusty i czeka na miecz). Ten sam
//    znak stoi przy jej pasku (Visual/PasekBossa.cs).
//  - Etykiety nad postaciami (efekty „mysl” i „szept” z tekstem): krój księgi, pergamin z ciemnym obrysem, 150 ms
//    pojawiania i znikania, układ bez nachodzenia (ważniejsze i starsze zostają, nowsze wypychane w górę, wszystko
//    w kadrze); na ciele bossa — ciemna podkładka.
// Znaki głów i etykiety rysują się po mapie świateł (NadSwiatlem): to napisy, nie świat — światło ich nie gasi.
// Bez alokacji w klatce: tablice o stałej wielkości, płótno sylwetki i plamki poświaty robione raz, napisy krojów w pamięci.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using C = Trzewia.Visual.VisualConfig.Czytelne;
using SG = Trzewia.Nastawy.NastawyKrag;

namespace Trzewia.Visual
{
    public static class Czytelnosc
    {
        /// <summary>Etap 2 włączony (flaga i F9).</summary>
        public static bool Aktywna => VisualConfig.Aktywne(VisualConfig.Czytelnosc);

        /// <summary>Wysokość ekranu / 1080 — ekran gry ustawia ją co klatkę (wielkości w px @1080p).</summary>
        public static double SkalaUi = 1;
        /// <summary>Lewy górny róg płyty na ekranie (ekran gry) — panel paska bossa i dymek liczą się na ekranie, etykiety na płycie.</summary>
        public static double PlytaX, PlytaY;

        /// <summary>Odwrotność przekształcenia płyty z początku klatki: punkty z układu rysunku → układ płyty.</summary>
        static DOMMatrix odwrotnoscPlyty = DOMMatrix.Jednostkowa;

        /// <summary>
        /// Między PoczatekKlatki a końcem NadSwiatlem: płyta świata rysuje się z czytelnością. Poza tym (np. ekran próby
        /// rysuje postacie osobno) Figury i Efekty rysują po staremu.
        /// </summary>
        public static bool WKlatce;

        /// <summary>Początek rysunku płyty (PlytaSwiata.Rysuj, przed czymkolwiek).</summary>
        public static void PoczatekKlatki(IPlotno ctx)
        {
            WKlatce = true;
            odwrotnoscPlyty = ctx.getTransform().inverse();
            // prostokąt bossa z poprzedniej klatki służy postaciom rysowanym przed nim, dopóki boss nie narysuje się w tej
            BossWidac = bossTeraz;
            bossTeraz = false;
            for (int i = 0; i < 3; i++) glJest[i] = false;
            for (int i = 0; i < ileZapisow; i++) zapisy[i].obraz = null;
            ileZapisow = 0; ileEtykiet = 0; ileZnakow = 0; TrybDuszka = 0;
        }

        // ───────────── boss: prostokąt ciała i punkty głów ─────────────

        /// <summary>Ustawiane przez RysPomnik.rysujCerberaBossa na czas rysunku bossa: RysCerber oddaje wtedy swoje punkty.</summary>
        public static bool ZbierajBossa;
        static bool bossTeraz;
        /// <summary>Czy boss jest na płycie (w tej klatce albo w poprzedniej) — i jego prostokąt w układzie płyty.</summary>
        public static bool BossWidac;
        public static double BossX0, BossY0, BossX1, BossY1;
        static readonly double[] glX = new double[3], glY = new double[3], znX = new double[3], znY = new double[3];
        static readonly bool[] glJest = new bool[3];
        static readonly int[] porzadek = new int[3];
        /// <summary>Wysokość Cerbera na płycie (px).</summary>
        static double wysBossa;

        /// <summary>
        /// Cerber-boss narysowany. Punkty w układzie jego rysunku (stopy w 0, 0): `gx`, `gy` — kotwice trzech głów
        /// (indeks = numer głowy: 0 doberman, 1 wilk, 2 pitbull), `jest` — głowa na karku (nieścięta); `x0…y1` — obrys ciała.
        /// </summary>
        public static void ZapiszCerbera(IPlotno ctx, double hRys, double[] gx, double[] gy, bool[] jest, double x0, double y0, double x1, double y1)
        {
            var t = odwrotnoscPlyty.multiply(ctx.getTransform());
            wysBossa = hRys * Math.Sqrt(t.c * t.c + t.d * t.d);
            for (int i = 0; i < 3; i++)
            {
                glJest[i] = jest[i];
                var (x, y) = t.transformPoint(gx[i], gy[i]);
                glX[i] = x; glY[i] = y;
            }
            double ax = double.MaxValue, ay = double.MaxValue, bx = double.MinValue, by = double.MinValue;
            void rog(double x, double y)
            {
                var (px, py) = t.transformPoint(x, y);
                ax = Math.Min(ax, px); ay = Math.Min(ay, py); bx = Math.Max(bx, px); by = Math.Max(by, py);
            }
            rog(x0, y0); rog(x1, y0); rog(x0, y1); rog(x1, y1);
            BossX0 = ax; BossY0 = ay; BossX1 = bx; BossY1 = by;
            bossTeraz = true; BossWidac = true;
        }

        /// <summary>
        /// Etap 6 (ZapowiedzGlow): kotwica głowy `nr` z ostatniego rysunku Cerbera (układ płyty) i środek jego ciała — żeby
        /// zapowiedź ataku wyszła z paszczy, a nie z miejsca zgadniętego z kafli. Fałsz — głowy nie ma albo boss niewidoczny.
        /// </summary>
        public static bool PunktGlowy(int nr, out double x, out double y, out double srodekX)
        {
            x = glX[nr]; y = glY[nr]; srodekX = (BossX0 + BossX1) / 2;
            return BossWidac && glJest[nr];
        }

        /// <summary>Czy prostokąt (układ płyty) nachodzi na ciało bossa.</summary>
        public static bool NaBossie(double x0, double y0, double x1, double y1) =>
            BossWidac && x1 > BossX0 && x0 < BossX1 && y1 > BossY0 && y0 < BossY1;

        // ───────────── postacie przy bossie: sylwetka po nim albo obrys ─────────────

        /// <summary>
        /// Co robić z klatkami duszka rysowanej teraz postaci (ustawia Figury.rysujStworzenia): 0 — nic; 1 — zapamiętać
        /// (postać za bossem: po bossie wraca jako sylwetka); 2 — obrysować na jasno (postać przed bossem).
        /// </summary>
        public static int TrybDuszka;

        struct Zapis { public IObraz? obraz; public double sx, sy, w, h, dx, dy, dw, dh, alfa; public DOMMatrix t; }
        static readonly Zapis[] zapisy = new Zapis[48];
        static int ileZapisow;
        static IPlotno? plotnoSylwetki;
        static readonly double[] KIERUNKI_OBRYSU = { 1, 0, -1, 0, 0, 1, 0, -1, 0.71, 0.71, -0.71, 0.71, 0.71, -0.71, -0.71, -0.71 };

        /// <summary>Duszek.Rysuj: klatka postaci, która właśnie idzie na płytę (te same liczby co jej drawImage).</summary>
        public static void Duszek(IPlotno ctx, IObraz obraz, double sx, double sy, double w, double h, double dx, double dy, double dw, double dh)
        {
            if (TrybDuszka == 1)
            {
                if (ileZapisow >= zapisy.Length) return;
                zapisy[ileZapisow++] = new Zapis { obraz = obraz, sx = sx, sy = sy, w = w, h = h, dx = dx, dy = dy, dw = dw, dh = dh, alfa = ctx.globalAlpha, t = ctx.getTransform() };
                return;
            }
            if (TrybDuszka != 2) return;
            var t = ctx.getTransform();
            var g = sylwetka(obraz, sx, sy, w, h, dw, dh, t, out var pw, out var ph, out var kx, out var ky);
            var o = C.ObrysPx * Math.Max(0.75, SkalaUi);
            var a = ctx.globalAlpha;
            ctx.globalAlpha = a * C.ObrysAlfa;
            for (int i = 0; i < KIERUNKI_OBRYSU.Length; i += 2)
                ctx.drawImage(g, 0, 0, pw, ph, dx - 1 / kx + KIERUNKI_OBRYSU[i] * o / kx, dy - 1 / ky + KIERUNKI_OBRYSU[i + 1] * o / ky, pw / kx, ph / ky);
            ctx.globalAlpha = a;
        }

        /// <summary>Po narysowaniu bossa: zapamiętane postacie za nim jeszcze raz — jako sylwetki w pergaminie.</summary>
        public static void SylwetkiPoBossie(IPlotno ctx)
        {
            if (ileZapisow == 0) return;
            ctx.save();
            for (int i = 0; i < ileZapisow; i++)
            {
                ref var z = ref zapisy[i];
                if (z.obraz == null) continue;
                var g = sylwetka(z.obraz, z.sx, z.sy, z.w, z.h, z.dw, z.dh, z.t, out var pw, out var ph, out var kx, out var ky);
                ctx.setTransform(z.t);
                ctx.globalAlpha = z.alfa * C.SylwetkaAlfa;
                ctx.drawImage(g, 0, 0, pw, ph, z.dx - 1 / kx, z.dy - 1 / ky, pw / kx, ph / ky);
                z.obraz = null;
            }
            ctx.restore();
            ileZapisow = 0;
        }

        /// <summary>Klatka duszka zalana pergaminem na płótnie pomocniczym w pikselach ekranu (z marginesem 1 px).</summary>
        static IPlotno sylwetka(IObraz obraz, double sx, double sy, double w, double h, double dw, double dh, DOMMatrix t,
            out int pw, out int ph, out double kx, out double ky)
        {
            kx = Math.Sqrt(t.a * t.a + t.b * t.b); ky = Math.Sqrt(t.c * t.c + t.d * t.d);
            if (kx <= 0) kx = 1;
            if (ky <= 0) ky = 1;
            pw = (int)Math.Ceiling(dw * kx) + 2; ph = (int)Math.Ceiling(dh * ky) + 2;
            var g = plotnoSylwetki ??= Plotno.Nowe(Math.Max(64, pw), Math.Max(64, ph));
            if (g.width < pw || g.height < ph) { g.width = Math.Max(g.width, pw); g.height = Math.Max(g.height, ph); }
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalCompositeOperation = "source-over";
            g.clearRect(0, 0, pw, ph);
            g.drawImage(obraz, sx, sy, w, h, 1, 1, pw - 2, ph - 2);
            g.globalCompositeOperation = "source-in";
            g.fillStyle = Pergamin(1);
            g.fillRect(0, 0, pw, ph);
            g.globalCompositeOperation = "source-over";
            return g;
        }

        // ───────────── barwy i kroje ─────────────

        public static Barwa Pergamin(double a) => Barwa.Rgba(C.BarwaPergaminu[0], C.BarwaPergaminu[1], C.BarwaPergaminu[2], a);
        public static Barwa Atrament(double a) => Barwa.Rgba(C.BarwaAtramentu[0], C.BarwaAtramentu[1], C.BarwaAtramentu[2], a);

        static readonly Dictionary<int, string> kroje = new Dictionary<int, string>();
        /// <summary>Napis kroju (rodzina + wielkość w pół-pikselach) — liczony raz na wielkość.</summary>
        public static string Kroj(string rodzina, double px, bool kursywa = false)
        {
            var klucz = (int)Math.Round(px * 2) * 8 + (kursywa ? 1 : 0) + (rodzina == Ink.SERIF_PISMO ? 2 : rodzina == Ink.SERIF_TYTUL ? 4 : 0);
            if (!kroje.TryGetValue(klucz, out var k))
            {
                k = $"{(kursywa ? "italic " : "")}{Js.Js.S(Math.Round(px * 2) / 2)}px {rodzina}";
                kroje[klucz] = k;
            }
            return k;
        }

        // ───────────── znaki głów ─────────────

        static readonly string[] CYFRY = { "I", "II", "III" };
        static IPlotno? plamkaZlota, plamkaCzerwona;

        static IPlotno plamka(ref IPlotno? p, double r, double g, double b)
        {
            if (p != null) return p;
            const int R = 64;
            p = Plotno.Nowe(R * 2, R * 2);
            var gr = p.createRadialGradient(R, R, 0, R, R, R);
            gr.addColorStop(0, Barwa.Rgba(r, g, b, 1)); gr.addColorStop(0.45, Barwa.Rgba(r, g, b, 0.45)); gr.addColorStop(1, Barwa.Rgba(r, g, b, 0));
            p.fillStyle = gr; p.fillRect(0, 0, R * 2, R * 2);
            return p;
        }

        /// <summary>Numer znaku głowy `nr` (0 doberman, 1 wilk, 2 pitbull): pozycja w kolejności ścinania (0 → „I”).</summary>
        public static int NumerZnaku(int nr) => Math.Max(0, Array.IndexOf(SG.SCIECIE_GLOW.kolejnosc, (double)nr));

        /// <summary>
        /// Znak głowy w stylu księgi: krążek pergaminu z rzymską cyfrą atramentem. `stan`: 0 — czeka w kolejce, 1 — tę teraz
        /// bijemy, 2 — pusty pasek, czeka na miecz, 3 — ścięta. `puls` 0…1. `alfa` — krycie całości.
        /// </summary>
        public static void ZnakGlowy(IPlotno ctx, double x, double y, double r, int numer, int stan, double puls, double alfa = 1)
        {
            ctx.save();
            ctx.globalAlpha *= alfa;
            if (stan == 1 || stan == 2)
            {
                // pierścień: bieżąca — złoty, oddycha; czekająca na miecz — czerwony, szybciej i szerzej
                var rr = r * (stan == 2 ? 1.28 + 0.22 * puls : 1.2 + 0.1 * puls);
                ctx.lineWidth = Math.Max(1.5, r * (stan == 2 ? 0.26 : 0.18));
                ctx.strokeStyle = stan == 2 ? Barwa.Rgba(232, 64, 40, 0.55 + 0.45 * puls) : Barwa.Rgba(236, 188, 106, 0.55 + 0.4 * puls);
                ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
            }
            // krążek: ciemny brzeg, pergamin w środku (ścięta — przygaszony)
            ctx.fillStyle = Atrament(0.92);
            ctx.beginPath(); ctx.arc(x, y, r + Math.Max(1.2, r * 0.12), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = stan == 3 ? Barwa.Rgba(120, 100, 86, 1) : stan == 0 ? Barwa.Rgba(206, 192, 162, 1) : Pergamin(1);
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = stan == 3 ? Barwa.Rgba(70, 40, 30, 0.9) : Barwa.Rgba(120, 82, 44, 0.9);
            ctx.lineWidth = Math.Max(0.8, r * 0.08);
            ctx.beginPath(); ctx.arc(x, y, r * 0.82, 0, Math.PI * 2); ctx.stroke();
            ctx.font = Kroj(Ink.SERIF_TYTUL, r * (numer == 2 ? 1.05 : 1.25));
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = stan == 3 ? Barwa.Rgba(52, 30, 22, 0.85) : stan == 2 ? Barwa.Rgba(120, 14, 8, 1) : Atrament(1);
            ctx.fillText(CYFRY[Math.Max(0, Math.Min(2, numer))], x, y + r * 0.06);
            if (stan == 3)
            {
                // ścięta: skreślona ukośnie
                ctx.strokeStyle = Barwa.Rgba(150, 26, 18, 0.95);
                ctx.lineWidth = Math.Max(1.2, r * 0.16); ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(x - r * 0.75, y + r * 0.75); ctx.lineTo(x + r * 0.75, y - r * 0.75); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Puls głowy do ścięcia 0…1 (zegar ekranu; przy „ogranicz ruch” stoi).</summary>
        public static double Puls(double czas, bool czeka)
        {
            if (Rdzen.SettingsStore.ustawienia.ograniczRuch) return 0.7;
            var hz = czeka ? C.PulsCzekaHz : C.PulsHz;
            return 0.5 + 0.5 * Math.Sin(czas * 0.001 * hz * Math.PI * 2);
        }

        /// <summary>Znaki nad głowami Cerbera (po mapie świateł). Pozycje rozsuwane, żeby znaki nie nachodziły na siebie.</summary>
        static void rysujZnakiGlow(IPlotno ctx, Sim sim, double czas)
        {
            if (!bossTeraz || !Krag.Wlaczony) return;
            Creature? boss = null;
            foreach (var c in sim.creatures) if (!c.dead && c.boss == "demon") { boss = c; break; }
            if (boss == null) return;
            if (sim.lud.pomnik?.faza == "kona") return;
            var st = Walka.glowyCerbera(boss);
            var czeka = Walka.glowaCzeka(boss);
            var r = Math.Max(C.ZnakMin * SkalaUi, Math.Min(C.ZnakMax * SkalaUi, wysBossa * C.ZnakGlowy));
            // Głowy leżą blisko siebie, jedna nad drugą — znaki stają w jednym rzędzie nad najwyższą z nich, w kolejności
            // głów od lewej do prawej (kreski się nie krzyżują), rozsunięte na co najmniej średnicę × odstęp.
            var gora = double.MaxValue;
            int ile = 0;
            for (int i = 0; i < 3; i++)
            {
                if (!glJest[i]) continue;
                gora = Math.Min(gora, glY[i]);
                porzadek[ile++] = i;
            }
            if (ile == 0) return;
            for (int i = 1; i < ile; i++)
            {
                var k = porzadek[i]; var j = i - 1;
                while (j >= 0 && glX[porzadek[j]] > glX[k]) { porzadek[j + 1] = porzadek[j]; j--; }
                porzadek[j + 1] = k;
            }
            var rzad = gora - wysBossa * C.ZnakNad - r;
            var min = r * 2 * C.ZnakOdstep;
            double srodek = 0;
            for (int i = 0; i < ile; i++) srodek += glX[porzadek[i]];
            srodek /= ile;
            // od lewej: każdy co najmniej `min` za poprzednim; potem cały rząd przesunięty, by jego środek stał nad głowami
            for (int i = 0; i < ile; i++)
            {
                var g = porzadek[i];
                znX[g] = i == 0 ? glX[g] : Math.Max(glX[g], znX[porzadek[i - 1]] + min);
                znY[g] = rzad;
            }
            double sr = 0;
            for (int i = 0; i < ile; i++) sr += znX[porzadek[i]];
            var przes = srodek - sr / ile;
            for (int i = 0; i < ile; i++) znX[porzadek[i]] += przes;
            ctx.save();
            for (int i = 0; i < 3; i++)
            {
                if (!glJest[i]) continue;
                var numer = NumerZnaku(i);
                var biezaca = st.biezaca == i;
                var stan = biezaca ? (czeka ? 2 : 1) : 0;
                var puls = biezaca ? Puls(czas, czeka) : 0;
                // głowa do ścięcia pulsuje: poświata wokół łba
                if (biezaca)
                {
                    var R = wysBossa * C.PoswiataGlowy * (0.9 + 0.2 * puls);
                    var p = czeka ? plamka(ref plamkaCzerwona, 255, 60, 30) : plamka(ref plamkaZlota, 255, 206, 120);
                    ctx.globalCompositeOperation = "lighter";
                    ctx.globalAlpha = (czeka ? C.PoswiataCzekaAlfa : C.PoswiataAlfa) * (0.55 + 0.45 * puls);
                    ctx.drawImage(p, glX[i] - R, glY[i] - R, R * 2, R * 2);
                    ctx.globalCompositeOperation = "source-over";
                    ctx.globalAlpha = 1;
                }
                // kreska od znaku do głowy: ciemna z jasnym rdzeniem (widać ją na ciemnym i na jasnym), kończy się nad ślepiami
                double kx = glX[i], ky = glY[i] - wysBossa * 0.035;
                ctx.lineCap = "round";
                ctx.strokeStyle = Atrament(0.8); ctx.lineWidth = Math.Max(2.4, r * 0.24);
                ctx.beginPath(); ctx.moveTo(znX[i], znY[i] + r); ctx.lineTo(kx, ky); ctx.stroke();
                ctx.strokeStyle = biezaca && czeka ? Barwa.Rgba(232, 80, 52, 0.95) : Pergamin(0.85); ctx.lineWidth = Math.Max(1, r * 0.1);
                ctx.stroke();
                ctx.fillStyle = Pergamin(0.95);
                ctx.beginPath(); ctx.arc(kx, ky, Math.Max(1.6, r * 0.16), 0, Math.PI * 2); ctx.fill();
                ZnakGlowy(ctx, znX[i], znY[i], r, numer, stan, puls);
                if (ileZnakow < 3)
                {
                    var rr = r * 1.5;
                    przeszkody[ileZnakow * 4] = znX[i] - rr; przeszkody[ileZnakow * 4 + 1] = znY[i] - rr;
                    przeszkody[ileZnakow * 4 + 2] = rr * 2; przeszkody[ileZnakow * 4 + 3] = rr * 2;
                    ileZnakow++;
                }
            }
            ctx.restore();
        }

        // ───────────── etykiety nad postaciami ─────────────

        struct Etykieta { public string tekst; public double x, y, waga, wiek, alfa, w, h, lx, ly; }
        static readonly Etykieta[] etykiety = new Etykieta[40];
        static readonly int[] kolejnosc = new int[40];
        static int ileEtykiet;

        /// <summary>
        /// Etykieta nad postacią (Efekty: „mysl”, „szept”) — zamiast rysować od razu, czeka na układ po mapie świateł.
        /// (x, y) — środek dolnej krawędzi w układzie płyty; `waga` — ważniejsze zostają na miejscu; `wiek` — tiki od
        /// pojawienia (starsze zostają, młodsze ustępują); `alfa` — krycie (pojawianie i znikanie).
        /// </summary>
        public static void DodajEtykiete(string tekst, double x, double y, double waga, double wiek, double alfa)
        {
            if (ileEtykiet >= etykiety.Length || alfa <= 0.01) return;
            etykiety[ileEtykiet++] = new Etykieta { tekst = tekst, x = x, y = y, waga = waga, wiek = wiek, alfa = alfa };
        }

        /// <summary>Krycie etykiety z jej wieku i długości życia (tiki, 120 na sekundę): 150 ms pojawiania i znikania.</summary>
        public static double AlfaEtykiety(double t, double max)
        {
            double ms = C.EtykietaMs, tikMs = 1000.0 / 120;
            return Math.Max(0, Math.Min(1, t * tikMs / ms)) * Math.Max(0, Math.Min(1, (max - t) * tikMs / ms));
        }

        /// <summary>Wielkość pisma etykiet (px) przy bieżącym ekranie.</summary>
        public static double WielkoscEtykiet => Math.Max(C.EtykietaMin, C.EtykietaPx * SkalaUi);

        /// <summary>Czy dwa prostokąty (x, y, szer., wys.) nachodzą na siebie.</summary>
        public static bool Nachodza(double ax, double ay, double aw, double ah, double bx, double by, double bw, double bh) =>
            ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;

        /// <summary>
        /// Układ etykiet: sortowanie (waga, wiek), każda kolejna wypychana w górę ponad te, na które nachodzi, potem
        /// przycięta do kadru (gdy wyjdzie górą — w dół, pod te, na które nachodzi). Wynik w lx, ly (lewy górny róg).
        /// Publiczne dla testu (żadne dwie etykiety nie nachodzą na siebie).
        /// </summary>
        public static void UlozEtykiety(double vw, double vh, double odstep)
        {
            int n = ileEtykiet;
            for (int i = 0; i < n; i++) kolejnosc[i] = i;
            // przez wstawianie (n małe, bez alokacji): większa waga, potem starsza, potem wcześniej dodana
            for (int i = 1; i < n; i++)
            {
                var k = kolejnosc[i]; var j = i - 1;
                while (j >= 0 && przed(k, kolejnosc[j])) { kolejnosc[j + 1] = kolejnosc[j]; j--; }
                kolejnosc[j + 1] = k;
            }
            for (int i = 0; i < n; i++)
            {
                ref var e = ref etykiety[kolejnosc[i]];
                var x0 = Math.Max(4, Math.Min(vw - 4 - e.w, e.x - e.w / 2));
                var y0 = Math.Min(vh - 4 - e.h, e.y - e.h);
                for (int it = 0; it < 24; it++)
                {
                    if (!konflikt(i, x0, y0, e.w, e.h, odstep, out var gora, out _)) break;
                    y0 = gora - odstep - e.h;
                }
                if (y0 < 4)
                {
                    y0 = 4;
                    for (int it = 0; it < 24; it++)
                    {
                        if (!konflikt(i, x0, y0, e.w, e.h, odstep, out _, out var dol)) break;
                        y0 = dol + odstep;
                    }
                }
                e.lx = x0; e.ly = y0;
            }
        }

        static bool przed(int a, int b)
        {
            ref var ea = ref etykiety[a]; ref var eb = ref etykiety[b];
            if (ea.waga != eb.waga) return ea.waga > eb.waga;
            if (ea.wiek != eb.wiek) return ea.wiek > eb.wiek;
            return a < b;
        }

        /// <summary>
        /// Czy prostokąt nachodzi na już ułożoną etykietę (spośród `ile` pierwszych w kolejności) albo na znak głowy bossa;
        /// `gora`, `dol` — pionowe granice tego, na co nachodzi.
        /// </summary>
        static bool konflikt(int ile, double x, double y, double w, double h, double odstep, out double gora, out double dol)
        {
            for (int i = 0; i < ileZnakow; i++)
                if (Nachodza(x, y - odstep * 0.5, w, h + odstep, przeszkody[i * 4], przeszkody[i * 4 + 1], przeszkody[i * 4 + 2], przeszkody[i * 4 + 3]))
                { gora = przeszkody[i * 4 + 1]; dol = gora + przeszkody[i * 4 + 3]; return true; }
            // pasek bossa i dymek pod nim (z poprzedniej klatki — rysują się po płycie) zakryłyby etykietę
            if (PasekBossa.PanelW > 0 && Nachodza(x, y, w, h, PasekBossa.PanelX - PlytaX, PasekBossa.PanelY - PlytaY, PasekBossa.PanelW, PasekBossa.PanelH))
            { gora = PasekBossa.PanelY - PlytaY; dol = gora + PasekBossa.PanelH; return true; }
            if (PasekBossa.DymekW > 0 && Nachodza(x, y, w, h, PasekBossa.DymekX - PlytaX, PasekBossa.DymekY - PlytaY - 12, PasekBossa.DymekW, PasekBossa.DymekH + 12))
            { gora = PasekBossa.DymekY - PlytaY - 12; dol = gora + PasekBossa.DymekH + 12; return true; }
            for (int i = 0; i < ile; i++)
            {
                ref var e = ref etykiety[kolejnosc[i]];
                if (Nachodza(x, y - odstep * 0.5, w, h + odstep, e.lx, e.ly, e.w, e.h)) { gora = e.ly; dol = e.ly + e.h; return true; }
            }
            gora = dol = 0;
            return false;
        }

        /// <summary>Znaki głów tej klatki jako przeszkody dla etykiet: x, y, szer., wys. (po cztery liczby).</summary>
        static readonly double[] przeszkody = new double[12];
        static int ileZnakow;

        /// <summary>Test: ułożone etykiety tej klatki (lewy górny róg, szerokość, wysokość).</summary>
        public static IEnumerable<(double x, double y, double w, double h)> UlozoneEtykiety()
        {
            for (int i = 0; i < ileEtykiet; i++) yield return (etykiety[i].lx, etykiety[i].ly, etykiety[i].w, etykiety[i].h);
        }

        /// <summary>Mierzy, układa i rysuje etykiety tej klatki (publiczne dla testu układu).</summary>
        public static void RysujEtykiety(IPlotno ctx, double vw, double vh)
        {
            if (ileEtykiet == 0) return;
            var px = WielkoscEtykiet;
            ctx.save();
            ctx.font = Kroj(Ink.SERIF_PISMO, px);
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            var pad = px * 0.32;
            for (int i = 0; i < ileEtykiet; i++)
            {
                etykiety[i].w = ctx.measureText(etykiety[i].tekst).width + pad * 2;
                etykiety[i].h = px * 1.2;
            }
            UlozEtykiety(vw, vh, C.EtykietaOdstep * SkalaUi);
            var obrys = Math.Max(2, C.EtykietaObrys * SkalaUi);
            ctx.lineJoin = "round"; ctx.lineWidth = obrys;
            for (int i = 0; i < ileEtykiet; i++)
            {
                ref var e = ref etykiety[i];
                // na ciele bossa — ciemna, półprzezroczysta podkładka (inaczej napis ginie na ciemnej sierści i ranach)
                if (NaBossie(e.lx, e.ly, e.lx + e.w, e.ly + e.h))
                {
                    ctx.fillStyle = Atrament(C.PodkladkaAlfa * e.alfa);
                    zaokraglony(ctx, e.lx, e.ly, e.w, e.h, e.h * 0.3);
                    ctx.fill();
                }
                double cx = e.lx + e.w / 2, cy = e.ly + e.h / 2;
                ctx.strokeStyle = Atrament(0.92 * e.alfa);
                ctx.strokeText(e.tekst, cx, cy);
                ctx.fillStyle = Pergamin(e.alfa);
                ctx.fillText(e.tekst, cx, cy);
            }
            ctx.restore();
        }

        /// <summary>Prostokąt z zaokrąglonymi rogami jako bieżąca ścieżka (bez tablicy promieni roundRect).</summary>
        public static void zaokraglony(IPlotno ctx, double x, double y, double w, double h, double r)
        {
            r = Math.Max(0, Math.Min(r, Math.Min(w, h) / 2));
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        // ───────────── po mapie świateł ─────────────

        /// <summary>PlytaSwiata, po warstwie światła: znaki głów, potem etykiety (napisy na wierzchu świata).</summary>
        public static void NadSwiatlem(IPlotno ctx, Sim sim, Camera cam, double czas)
        {
            rysujZnakiGlow(ctx, sim, czas);
            RysujEtykiety(ctx, cam.vw, cam.vh);
            WKlatce = false;
            TrybDuszka = 0;
        }
    }
}
