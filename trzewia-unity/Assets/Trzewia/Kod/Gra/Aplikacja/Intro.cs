// Port: alpha-1/src/app/screens/intro.ts — intro: film rusza od razu po otwarciu gry, zanim cokolwiek innego się pokaże,
// a góra ładuje się pod nim; na dole mały znaczek „spacja – pomiń”. Spacja albo Esc pomija; po końcu filmu ekran
// ładowania przechodzi do menu.
// Różnica (PLAN.md 3.7, część 5 punkt 3): zamiast H.264 w <video> — klatki WebP z dane/filmy/intro.klatki
// (narzedzia/intro/spakuj.mjs), dekodowane w osobnym wątku kilka do przodu i pokazywane w rytmie filmu. W TS film to
// warstwa strony nad płótnem (w pikselach CSS) — tu App rysuje ją na wierzchu klatki, też w pikselach CSS.
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyEkran;
using JS = Trzewia.Js.Js;

namespace Trzewia.Aplikacja
{
    public sealed class Intro
    {
        const string PLIK = "filmy/intro.klatki";
        /// <summary>Ile klatek dekoder trzyma przed tą, która jest na ekranie.</summary>
        const int NAPRZOD = 6;

        byte[]? dane;
        int n, szer, wys, poczatekDanych;
        double fps = 30;
        int[] przes = Array.Empty<int>(), dl = Array.Empty<int>();

        bool trwa;
        bool pokazana;              // warstwa jeszcze na ekranie (także w trakcie wygaszania)
        double start, wygasOd = -1;
        volatile int chce;          // numer klatki, którą ekran chce teraz pokazać
        volatile bool koniec;
        readonly ConcurrentDictionary<int, IObraz> gotowe = new ConcurrentDictionary<int, IObraz>();
        Thread? dekoder;
        IObraz? biezacy;
        int biezacyNr = -1;
        bool ruszyl;                // pierwsza klatka już na ekranie (w TS: currentTime > 0)

        /// <summary>Czy film jeszcze zasłania grę.</summary>
        public bool introTrwa() => trwa;

        public void puscIntro()
        {
            if (pokazana) return;
            trwa = true; pokazana = true;
            start = Wydajnosc.Teraz();
            if (!wczytaj()) { pominIntro(); return; }     // w TS: zdarzenie „error” filmu
            dekoder = new Thread(dekoduj) { IsBackground = true, Name = "intro", Priority = ThreadPriority.BelowNormal };
            dekoder.Start();
        }

        bool wczytaj()
        {
            try
            {
                var d = Zasoby.Czytaj(PLIK);
                if (d == null || d.Length < 24 || d[0] != 'T' || d[1] != 'R' || d[2] != 'Z' || d[3] != 'K') return false;
                int u32(int o) => (int)BitConverter.ToUInt32(d, o);
                if (u32(4) != 1) return false;
                fps = u32(8) / 1000.0; szer = u32(12); wys = u32(16); n = u32(20);
                przes = new int[n]; dl = new int[n];
                for (int i = 0; i < n; i++) { przes[i] = u32(24 + i * 8); dl[i] = u32(28 + i * 8); }
                poczatekDanych = 24 + n * 8;
                dane = d;
                return n > 0 && fps > 0;
            }
            catch (Exception e) { Dziennik.Pisz($"intro: {e.Message}"); return false; }
        }

        /// <summary>Wątek dekodera: klatki po kolei, najwyżej NAPRZOD przed tą na ekranie.</summary>
        void dekoduj()
        {
            try
            {
                for (int i = 0; i < n && !koniec; i++)
                {
                    while (!koniec && i > chce + NAPRZOD) Thread.Sleep(4);
                    if (koniec) break;
                    // klatki, których czas już minął, pomijamy (film się nie cofa)
                    if (i < chce) continue;
                    var bajty = new byte[dl[i]];
                    Buffer.BlockCopy(dane!, poczatekDanych + przes[i], bajty, 0, dl[i]);
                    var o = Plotno.Fabryka.Obraz(bajty, $"intro {i}");
                    if (koniec) { (o as IDisposable)?.Dispose(); break; }
                    gotowe[i] = o;
                }
            }
            catch (Exception e) { Dziennik.Pisz($"intro: dekoder — {e.Message}"); }
        }

        public void pominIntro()
        {
            if (!trwa) return;
            trwa = false;
            koniec = true;
            wygasOd = Wydajnosc.Teraz();
        }

        /// <summary>Spacja i Esc pomijają film; klawisz idzie dalej do gry.</summary>
        public void klawisz(Klawisz e)
        {
            if (e.key == " " || e.code == "Space" || e.key == "Escape") pominIntro();
        }

        void zwolnij()
        {
            foreach (var o in gotowe.Values) (o as IDisposable)?.Dispose();
            gotowe.Clear();
            (biezacy as IDisposable)?.Dispose();
            biezacy = null;
        }

        /// <summary>CSS „ease” (cubic-bezier(0.25, 0.1, 0.25, 1)) dla przejść warstwy i znaczka.</summary>
        static double ease(double t)
        {
            t = Math.Max(0, Math.Min(1, t));
            double a = 0, b = 1;
            for (int i = 0; i < 30; i++)
            {
                var s = (a + b) / 2;
                var x = 3 * (1 - s) * (1 - s) * s * 0.25 + 3 * (1 - s) * s * s * 0.25 + s * s * s;
                if (x < t) a = s; else b = s;
            }
            var u = (a + b) / 2;
            return 3 * (1 - u) * (1 - u) * u * 0.1 + 3 * (1 - u) * u * u * 1 + u * u * u;
        }

        /// <summary>Warstwa filmu w pikselach CSS (w × h — okno), na wierzchu wszystkiego.</summary>
        public void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            if (!pokazana) return;
            double alfa = 1;
            if (!trwa)
            {
                var t = (teraz - wygasOd) / INTRO.wygaszenieMs;
                if (t >= 1) { pokazana = false; zwolnij(); return; }
                alfa = 1 - ease(t);
            }
            var wiek = teraz - start;
            if (trwa && dane != null)
            {
                var nr = (int)Math.Floor(wiek / 1000 * fps);
                // film się skończył
                if (nr >= n) { pominIntro(); alfa = 1; }
                else
                {
                    chce = Math.Max(chce, nr);
                    // najnowsza gotowa klatka nie późniejsza niż ta, której czas teraz
                    for (int k = nr; k > biezacyNr; k--)
                    {
                        if (!gotowe.TryRemove(k, out var o)) continue;
                        (biezacy as IDisposable)?.Dispose();
                        biezacy = o; biezacyNr = k; ruszyl = true;
                        break;
                    }
                    // starsze, już niepotrzebne
                    foreach (var k in gotowe.Keys) if (k < biezacyNr && gotowe.TryRemove(k, out var st)) (st as IDisposable)?.Dispose();
                }
                // film, który nie ruszył (zła taśma, brak pliku), nie trzyma gry za zasłoną
                if (trwa && !ruszyl && wiek > INTRO.bezpiecznikMs) pominIntro();
            }
            ctx.save();
            ctx.globalAlpha = alfa;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, w, h);
            if (biezacy != null && biezacy.width > 0)
            {
                // object-fit: contain
                var k = Math.Min(w / biezacy.width, h / biezacy.height);
                double dw = biezacy.width * k, dh = biezacy.height * k;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(biezacy, (w - dw) / 2, (h - dh) / 2, dw, dh);
            }
            // mały znaczek na dole: klawisz „spacja” w ramce i „– pomiń” obok (rozjaśnia się po chwili do 0,75)
            var zn = 0.75 * ease((wiek - INTRO.znaczekOdMs) / INTRO.znaczekRozjasnienieMs);
            if (zn > 0)
            {
                ctx.globalAlpha = alfa * zn;
                const double rozm = 13, lh = 17;
                ctx.font = $"{JS.S(rozm)}px {Fonts.KROJ}";
                var kw = ctx.measureText(INTRO.klawisz).width + 14 + 2;
                ctx.font = $"italic {JS.S(rozm)}px {Fonts.KROJ}";
                var pomin = $"– {INTRO.pomin}";
                var pw = ctx.measureText(pomin).width;
                double bw = 9 + kw + 6 + pw + 9, bh = 4 + lh + 2 + 4;
                double bx = w / 2 - bw / 2, by = h - 24 - bh;
                Panele.zaokraglony(ctx, bx, by, bw, bh, 7);
                ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fill();
                var ky = by + 4;
                Panele.zaokraglony(ctx, bx + 9 + 0.5, ky + 0.5, kw - 1, lh + 1, 4);
                ctx.strokeStyle = Paleta.rgba(BARWA.atrament, 0.85); ctx.lineWidth = 1; ctx.stroke();
                ctx.textBaseline = "middle"; ctx.textAlign = "left";
                ctx.font = $"{JS.S(rozm)}px {Fonts.KROJ}";
                ctx.fillStyle = BARWA.atrament;
                ctx.fillText(INTRO.klawisz, bx + 9 + 8, ky + (lh + 2) / 2);
                ctx.font = $"italic {JS.S(rozm)}px {Fonts.KROJ}";
                ctx.fillStyle = Paleta.rgba(BARWA.atramentCichy, 1);
                ctx.fillText(pomin, bx + 9 + kw + 6, ky + (lh + 2) / 2);
            }
            ctx.restore();
        }
    }
}
