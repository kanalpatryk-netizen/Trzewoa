// Oprawa walki, etap 2 (docs/plan-oprawy-cerber.md): w walce z bossem kamera płynnie bliżej (ok. 1,25× przybliżenia
// sprzed walki), ze środkiem między bossem a najbliższymi postaciami; po walce wraca. Kamera to tylko widok — symulacja
// o niej nie wie, a kliknięcia liczą się przez tę samą kamerę, więc trafiają tam, gdzie gracz patrzy.
//
// Dwa przypadki:
//  - kamera za życiem z autoprzybliżeniem (sama dobiera przybliżenie co klatkę) — tu tylko `Mnoznik` jej celu;
//  - każda inna (zwykle ręczna: po rozpadzie pieczęci gra sama wiezie kamerę do pieca i oddaje ją graczowi) — tu
//    przybliżenie wokół ogniska (jego miejsce na ekranie stoi), a dopóki gracz nie przesunie widoku, także środek jedzie
//    ku ognisku. Gdy przybliżenie zmieni ktoś inny (kółko myszy, gra wiezie kamerę przy konaniu) — kamera oddana,
//    bez powrotu: gracz albo gra wiedzą lepiej.
using System;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using C = Trzewia.Visual.VisualConfig.Czytelne;

namespace Trzewia.Visual
{
    public static class KameraBossa
    {
        /// <summary>Mnożnik celu autoprzybliżenia kamery za życiem (1 poza walką i bez oprawy).</summary>
        public static double Mnoznik = 1;

        static bool prowadzi, porzucone, centruje;
        static double zoomPrzed, ostZoom, ostX, ostY;
        static readonly double[] najD = new double[8];
        static readonly Creature?[] najC = new Creature?[8];

        /// <summary>Czy trwa walka z bossem (wychodzi albo walczy) — i kim jest boss.</summary>
        public static bool WalkaZBossem(Sim sim, out Creature? boss)
        {
            boss = null;
            var f = sim.lud.pomnik?.faza;
            if (f != "walka" && f != "wychodzi") return false;
            foreach (var c in sim.creatures) if (!c.dead && c.boss != null) { boss = c; return true; }
            return false;
        }

        /// <summary>Ognisko: środek między bossem a średnim miejscem najbliższych mu postaci ludu (bez nich — boss).</summary>
        public static (double x, double y) Ognisko(Sim sim, Creature boss)
        {
            int n = Math.Min(Math.Max(1, C.IluNajblizszych), najD.Length), ile = 0;
            double bx = boss.x, by = boss.y - 1.5, granica = C.BliskoBossa * C.BliskoBossa;
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.boss != null || Lud.rolaPostaci(c) == null) continue;
                double dx = c.x - bx, dy = c.y - by, d = dx * dx + dy * dy;
                if (d > granica) continue;
                // wstawianie do krótkiej listy najbliższych
                var i = Math.Min(ile, n - 1);
                if (ile >= n && d >= najD[n - 1]) continue;
                while (i > 0 && najD[i - 1] > d) { najD[i] = najD[i - 1]; najC[i] = najC[i - 1]; i--; }
                najD[i] = d; najC[i] = c;
                if (ile < n) ile++;
            }
            if (ile == 0) return (bx, by);
            double sx = 0, sy = 0;
            for (int i = 0; i < ile; i++) { sx += najC[i]!.x; sy += najC[i]!.y - 0.8; najC[i] = null; }
            return ((bx + sx / ile) / 2, (by + sy / ile) / 2);
        }

        /// <summary>
        /// Co klatkę (ekran gry, po kamerze za życiem). `autoZoom` — kamera za życiem sama dobiera przybliżenie;
        /// `stoj` — gracz trzyma czasownik albo maluje (kamera nie może uciec spod kursora).
        /// </summary>
        public static void Krok(Sim sim, Camera cam, double dt, bool autoZoom, bool stoj)
        {
            if (dt <= 0) return;
            Creature? boss = null;
            var walka = Czytelnosc.Aktywna && WalkaZBossem(sim, out boss);
            var k = 1 - Math.Exp(-dt / Math.Max(1, C.ZoomMs));
            if (autoZoom)
            {
                Mnoznik += ((walka ? C.ZoomBossa : 1) - Mnoznik) * k;
                if (Math.Abs(Mnoznik - 1) < 1e-4) Mnoznik = 1;
                prowadzi = false;
                return;
            }
            Mnoznik = 1;
            if (stoj) { if (prowadzi) { ostZoom = cam.zoom; ostX = cam.x; ostY = cam.y; } return; }
            var w = sim.world;
            if (!walka || boss == null)
            {
                porzucone = false;
                if (!prowadzi) return;
                // po walce: powrót do przybliżenia sprzed walki (wokół środka kadru)
                if (Math.Abs(cam.zoom - ostZoom) > 1e-6) { prowadzi = false; return; }
                var z = cam.zoom + (zoomPrzed - cam.zoom) * k;
                if (Math.Abs(z - zoomPrzed) < 0.01) { z = zoomPrzed; prowadzi = false; }
                cam.zoom = z;
                cam.clamp(w.w, w.h);
                ostZoom = cam.zoom;
                return;
            }
            if (!prowadzi)
            {
                if (porzucone) return;
                prowadzi = true; centruje = true;
                zoomPrzed = cam.zoom; ostZoom = cam.zoom; ostX = cam.x; ostY = cam.y;
            }
            // ktoś inny zmienił przybliżenie — kamera oddana; przesunął widok — już tylko przybliżenie, bez środka
            if (Math.Abs(cam.zoom - ostZoom) > 1e-6) { prowadzi = false; porzucone = true; return; }
            if (Math.Abs(cam.x - ostX) > 1e-6 || Math.Abs(cam.y - ostY) > 1e-6) centruje = false;
            var (fx, fy) = Ognisko(sim, boss);
            double z0 = cam.zoom, z1 = z0 + (zoomPrzed * C.ZoomBossa - z0) * k;
            if (z1 > 0)
            {
                cam.x = fx - (fx - cam.x) * z0 / z1;
                cam.y = fy - (fy - cam.y) * z0 / z1;
                cam.zoom = z1;
            }
            if (centruje) cam.drift(fx, fy, k);
            cam.clamp(w.w, w.h);
            ostZoom = cam.zoom; ostX = cam.x; ostY = cam.y;
        }
    }
}
