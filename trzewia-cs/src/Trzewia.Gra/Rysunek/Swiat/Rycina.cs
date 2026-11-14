// Port: alpha-1/src/render/rycina.ts i render/bloom.ts — rycina świata na płycie i poświata świateł.
// Jak w TS: odbitkę liczy osobny wątek (Task w tle — Engraver liczy ją dodatkowo równolegle na rdzeniach), a gra w każdej
// klatce rysuje najnowszy gotowy obraz, przełożony z kamery, dla której powstał, na bieżącą (przy przesuwaniu jedzie
// razem ze skałą, przy kręceniu kółkiem rośnie albo maleje, aż przyjdzie nowy). Gdy ostatni obraz przykrywa mniej niż
// 30% płyty (pierwsza klatka, skok kamery) albo wątek jest wyłączony (ustawienia → rycinaWWatku), odbitka liczy się
// od razu w tej klatce. Różnica wobec TS: wątek czyta świat bezpośrednio (bez migawki tablic) — symulacja może w tym
// czasie zmienić pojedyncze kafle; obraz z takiej klatki poprawia następna odbitka.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;

namespace Trzewia.Rysunek
{
    /// <summary>Poświata źródeł światła (render/bloom.ts): ogień i biolumina dostają miękki rozlew.</summary>
    public sealed class Poswiata
    {
        IPlotno? buf;
        int w = 1, h = 1;
        /// <summary>Wersja źródła, z której policzono rozmyty bufor (−1 — trzeba liczyć).</summary>
        int wersja = -1;
        readonly int podzial;
        public Poswiata(int podzial = 4) { this.podzial = podzial; }

        public void resize(double ww, double hh)
        {
            w = (int)Math.Max(1, Math.Round(ww / podzial, MidpointRounding.AwayFromZero));
            h = (int)Math.Max(1, Math.Round(hh / podzial, MidpointRounding.AwayFromZero));
            if (buf == null) buf = Plotno.Nowe(w, h);
            else { buf.width = w; buf.height = h; }
            wersja = -1;
        }

        /// <summary>
        /// Rysuje rozmyty, rozjaśniony obraz źródła na wierzchu — tylko jasne miejsca zostają. Rozmycie liczy się tylko dla
        /// nowej wersji źródła.
        /// </summary>
        public void nalozy(IPlotno cel, IZrodloObrazu zrodlo, double x, double y, double ww, double hh, double moc = 0.55, int? wersjaZr = null)
        {
            if (moc <= 0) return;
            if (buf == null) resize(ww, hh);
            var b = buf!;
            if (wersjaZr == null || wersjaZr != wersja)
            {
                b.clearRect(0, 0, w, h);
                b.filter = "blur(2px) brightness(1.65) contrast(1.5)";
                b.drawImage(zrodlo, 0, 0, w, h);
                b.filter = "none";
                wersja = wersjaZr ?? -1;
            }
            cel.save();
            cel.globalCompositeOperation = "lighter";
            cel.globalAlpha = moc;
            cel.imageSmoothingEnabled = true;
            cel.drawImage(b, x, y, ww, hh);
            cel.restore();
        }
    }

    /// <summary>Rycina świata na płycie: odbitka (Engraver), jej obraz pod bieżącą kamerą i poświata.</summary>
    public sealed class Rycina
    {
        /// <summary>Brzeg płyty, którego obraz jeszcze nie przykrywa — barwa nieznanej skały.</summary>
        const string TLO = "rgb(36,28,22)";
        public readonly Engraver lokalna = new Engraver();
        /// <summary>Świat malowany jak fresk zamiast ryciny — ustawienia → „Rysunek świata”.</summary>
        public bool fresk;
        readonly Poswiata posw = new Poswiata();
        IObraz? obraz, emis;
        KameraRyciny kam;
        bool jest;
        byte[] emisPm = Array.Empty<byte>();
        /// <summary>Odbitka liczona w tle i kamera, dla której ją zamówiono.</summary>
        System.Threading.Tasks.Task? wLocie;
        KameraRyciny kamWLocie;
        long t0WLocie;
        /// <summary>Gdy ostatni obraz przykrywa mniejszą część płyty (skok kamery), rycina liczy się od razu w tej klatce.</summary>
        const double PROG_POKRYCIA = 0.3;
        /// <summary>
        /// Zapas obrazu na każdym brzegu (px logiczne): przy przesuwaniu kamery obraz sprzed klatki–dwóch dalej przykrywa
        /// płytę. Wielokrotność 2 — rycina w pół rozdzielczości trafia w tę samą siatkę pikseli świata.
        /// </summary>
        const double ZAPAS = 32;
        static KameraRyciny ZZapasem(Camera c) => new KameraRyciny(c.x, c.y, c.zoom, c.vw + ZAPAS * 2, c.vh + ZAPAS * 2);

        public double scale => lokalna.scale;
        public bool niedokonczona => lokalna.niedokonczona;
        /// <summary>Ile milisekund zajęła ostatnia odbitka (licznik F3).</summary>
        public double msOdbitki;

        public void resize(double vw, double vh, double? skala = null)
        {
            Czekaj();
            lokalna.resize(vw + ZAPAS * 2, vh + ZAPAS * 2, skala);
            posw.resize(vw, vh);
            jest = false;
        }

        /// <summary>
        /// Co klatkę, przed rysowaniem płyty. `chce` — gra chce nowej odbitki (kamera ruszona, świat zmieniony, upływ
        /// czasu). Zwraca true, gdy odbitkę policzono — gra notuje wtedy kamerę i czas.
        /// </summary>
        public bool klatka(Sim sim, Camera cam, double teraz, bool chce)
        {
            var c = ZZapasem(cam);
            Odbierz();
            if (!Rdzen.SettingsStore.ustawienia.rycinaWWatku)
            {
                Czekaj();
                if (!chce && jest) return false;
                liczTutaj(sim, c, teraz);
                return true;
            }
            if (!jest || pokrycie(KameraRyciny.Z(cam)) < PROG_POKRYCIA)
            {
                Czekaj();
                liczTutaj(sim, c, teraz);
                return true;
            }
            if (!chce || wLocie != null) return false;
            // zamówienie: światło ludu i grzbiet z wątku gry, reszta w tle
            var e = lokalna;
            e.fresk = fresk;
            e.zrodla = RycinaZrodla.zrodlaSwiatla(sim);
            e.rowne = Grzbiet.rowneW(sim.world);
            var w = sim.world; var tick = sim.tick;
            kamWLocie = c;
            t0WLocie = System.Diagnostics.Stopwatch.GetTimestamp();
            wLocie = System.Threading.Tasks.Task.Run(() => e.rebuild(w, tick, c, teraz));
            return true;
        }

        /// <summary>Gotowa odbitka z wątku: obraz pod jej kamerą.</summary>
        void Odbierz()
        {
            if (wLocie == null || !wLocie.IsCompleted) return;
            var t = wLocie; wLocie = null;
            if (t.IsFaulted) { Rdzen.Dziennik.Pisz("rycina w tle: " + t.Exception?.GetBaseException().Message); return; }
            Obrazy(kamWLocie);
            msOdbitki = (System.Diagnostics.Stopwatch.GetTimestamp() - t0WLocie) * 1000.0 / System.Diagnostics.Stopwatch.Frequency;
        }

        /// <summary>Czeka na odbitkę w tle (przed liczeniem w tej klatce albo zmianą rozmiaru — bufory są wspólne).</summary>
        void Czekaj()
        {
            if (wLocie == null) return;
            try { wLocie.Wait(); } catch (AggregateException) { }
            Odbierz();
        }

        /// <summary>Jaka część płyty bieżącej kamery leży pod ostatnim obrazem (0..1).</summary>
        double pokrycie(KameraRyciny cam)
        {
            if (!jest) return 0;
            var r = naPlycie(cam);
            double x0 = Math.Max(0, r.x), y0 = Math.Max(0, r.y), x1 = Math.Min(cam.vw, r.x + r.w), y1 = Math.Min(cam.vh, r.y + r.h);
            if (x1 <= x0 || y1 <= y0) return 0;
            return ((x1 - x0) * (y1 - y0)) / (cam.vw * cam.vh);
        }

        void liczTutaj(Sim sim, KameraRyciny cam, double teraz)
        {
            var t0 = System.Diagnostics.Stopwatch.GetTimestamp();
            var e = lokalna;
            e.fresk = fresk;
            e.zrodla = RycinaZrodla.zrodlaSwiatla(sim);
            e.rowne = Grzbiet.rowneW(sim.world);
            e.rebuild(sim.world, sim.tick, cam, teraz);
            Obrazy(cam);
            msOdbitki = (System.Diagnostics.Stopwatch.GetTimestamp() - t0) * 1000.0 / System.Diagnostics.Stopwatch.Frequency;
        }

        /// <summary>Obrazy (rycina i źródła światła) z buforów Engravera — po odbitce, gdy wątek już nie pisze.</summary>
        void Obrazy(KameraRyciny cam)
        {
            var e = lokalna;
            (obraz as IDisposable)?.Dispose();
            (emis as IDisposable)?.Dispose();
            obraz = Plotno.Fabryka.ObrazZPikseli(e.aw, e.ah, e.dane);
            // ImageData w TS ma alfę prostą — płótno wymnaża ją przy putImageData; tu obraz chce wymnożonej
            var n = e.edane.Length;
            if (emisPm.Length != n) emisPm = new byte[n];
            var src = e.edane;
            for (int i = 0; i < n; i += 4)
            {
                int a = src[i + 3];
                if (a == 0) { emisPm[i] = 0; emisPm[i + 1] = 0; emisPm[i + 2] = 0; emisPm[i + 3] = 0; continue; }
                emisPm[i] = (byte)((src[i] * a + 127) / 255); emisPm[i + 1] = (byte)((src[i + 1] * a + 127) / 255);
                emisPm[i + 2] = (byte)((src[i + 2] * a + 127) / 255); emisPm[i + 3] = (byte)a;
            }
            emis = Plotno.Fabryka.ObrazZPikseli(e.aw, e.ah, emisPm);
            kam = cam;
            dxO = e.dx; dyO = e.dy; awO = e.aw; ahO = e.ah; skalaO = e.scale; wersjaO = e.wersja;
            jest = true;
        }

        /// <summary>Przesunięcie i rozmiar obrazu, który jest na płycie (Engraver w tle liczy już następny).</summary>
        double dxO, dyO, skalaO = 1;
        int awO, ahO, wersjaO;

        struct Prostokat { public double x, y, w, h; }

        /// <summary>Prostokąt płyty kamery `k` (jej lewy górny róg w świecie) na płycie bieżącej kamery.</summary>
        static Prostokat plytaKamery(KameraRyciny k, KameraRyciny cam)
        {
            if (k.TakaSama(cam)) return new Prostokat { x = 0, y = 0, w = cam.vw, h = cam.vh };
            var s = cam.zoom / k.zoom;
            double X0 = k.x - k.vw / 2 / k.zoom, Y0 = k.y - k.vh / 2 / k.zoom;
            return new Prostokat { x = (X0 - cam.x) * cam.zoom + cam.vw / 2, y = (Y0 - cam.y) * cam.zoom + cam.vh / 2, w = k.vw * s, h = k.vh * s };
        }

        /// <summary>Prostokąt obrazu (dx, dy, bw, bh na płycie swojej kamery) na płycie bieżącej kamery.</summary>
        Prostokat naPlycie(KameraRyciny cam)
        {
            double ddx = dxO, ddy = dyO, bw = awO * skalaO, bh = ahO * skalaO;
            if (kam.TakaSama(cam)) return new Prostokat { x = ddx, y = ddy, w = bw, h = bh };
            var p = plytaKamery(kam, cam); var s = cam.zoom / kam.zoom;
            return new Prostokat { x = p.x + ddx * s, y = p.y + ddy * s, w = bw * s, h = bh * s };
        }

        /// <summary>Rycina na płycie (układ płyty): obraz pod bieżącą kamerą; jasność > 1 — drugi raz w trybie „lighter”.</summary>
        public void rysuj(IPlotno ctx, Camera cam, double jasnosc)
        {
            var c = KameraRyciny.Z(cam);
            if (!jest || obraz == null) { ctx.fillStyle = TLO; ctx.fillRect(0, 0, cam.vw, cam.vh); return; }
            var r = naPlycie(c);
            if (r.x > 0 || r.y > 0 || r.x + r.w < cam.vw || r.y + r.h < cam.vh) { ctx.fillStyle = TLO; ctx.fillRect(0, 0, cam.vw, cam.vh); }
            ctx.drawImage(obraz, r.x, r.y, r.w, r.h);
            // jasność ryciny: ta sama rycina jeszcze raz w trybie „lighter” mnoży kolory o (1 + nadwyżka)
            if (jasnosc > 1)
            {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = Math.Min(1, jasnosc - 1);
                ctx.drawImage(obraz, r.x, r.y, r.w, r.h);
                ctx.restore();
            }
        }

        /// <summary>
        /// Poświata świateł z tej samej odbitki: `podMrokiem` — w miejscu ryciny, moc 0,5; nad mrokiem — na całą płytę
        /// swojej kamery, moc 0,3. Rozmycie liczy się raz na odbitkę.
        /// </summary>
        public void poswiata(IPlotno ctx, Camera cam, bool podMrokiem)
        {
            var moc = podMrokiem ? 0.5 : 0.3;
            if (!jest || emis == null) return;
            var c = KameraRyciny.Z(cam);
            var r = podMrokiem ? naPlycie(c) : plytaKamery(kam, c);
            posw.nalozy(ctx, emis, r.x, r.y, r.w, r.h, moc, wersjaO);
        }
    }
}
