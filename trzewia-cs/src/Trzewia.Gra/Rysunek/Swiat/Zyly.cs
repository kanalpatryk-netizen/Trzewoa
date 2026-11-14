// Port: alpha-1/src/render/zyly.ts — kruszec w skale, rysowany tuszem jak postacie i jak okaz w atlasie górniczym.
//
// Żelazo (T.ORE) to gniazdo kanciastych bryłek w ciemnej, rdzawej masie rudy: stalowe ścianki w świetle i w cieniu
// (cień kreskowany rylcem), kontur tuszem, błysk metalu na grani; z bryłek ciekną zacieki rdzy, za skrajem leżą okruchy.
// Złoto (T.ZLOTO) to żyła w jasnej soczewce kwarcu: pień przez kafle kruszcu (drzewo rozpinające), gałązki zwężone do
// ostrza, ogony w skałę, samorodki; większe samorodki co jakiś czas powoli błyskają (bez błysków przy „ograniczonym ruchu”).
//
// Każde skupisko rysuje się raz do własnej odbitki w skali ekranu i dalej tylko się ją przykłada; skupisko zmienione
// kilofem (albo z nową pustką obok) ma inny klucz. Widać tylko kruszec, który pokazuje rycina. Rysowane pod mrokiem.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Zyly
    {
        static class ZYLY
        {
            /// <summary>Poniżej tego przybliżenia (pikseli na kafel) żyły zostają samą barwą kreski ryciny.</summary>
            public const double odZoomu = 4.5;
            /// <summary>Ponad tyle pikseli urządzenia na kafel odbitka już nie rośnie (dalej się skaluje).</summary>
            public const double maxSkala = 72;
            /// <summary>Tyle ms na klatkę wolno rysować odbitki; reszta czeka do następnej klatki.</summary>
            public const double msNaKlatke = 4;
            /// <summary>W nowej skali przerysowuje się dopiero, gdy przybliżenie stoi tyle ms…</summary>
            public const double spokojMs = 180;
            /// <summary>…albo gdy skala rozjechała się o więcej niż tyle.</summary>
            public const double maxRozjazd = 0.35;
            /// <summary>Zapas odbitki wokół skupiska (kafle).</summary>
            public const double zapas = 0.75;
            /// <summary>Tyle kafla kruszec trzyma się z dala od pustki.</summary>
            public const double odPustki = 0.07;
            public const double kryciePamieci = 0.66, krycieDawne = 0.32;
            public const double blyskOdWielkosci = 0.12, blyskOd = 5, blyskDo = 11, blyskCzesc = 0.1;
        }

        /// <summary>Barwy kruszców.</summary>
        static class B
        {
            public static readonly double[] stalCien = { 32, 28, 27 }, stalPol = { 72, 63, 58 }, stalSwiatlo = { 116, 101, 88 }, blyskStali = { 172, 152, 130 };
            public static readonly double[] rdza = { 150, 74, 32 }, rdzaPlama = { 118, 62, 28 };
            public static readonly double[] rudaMasa = { 58, 36, 26 };
            public static readonly double[] tusz = { 14, 10, 8 };
            public static readonly double[] zlotoCien = { 132, 86, 24 }, zloto = { 212, 164, 60 }, zlotoJasne = { 240, 204, 116 }, zlotoSwiatlo = { 250, 236, 196 };
            public static readonly double[] kwarc = { 238, 228, 200 };
        }
        /// <summary>Kierunek światła tuszu (render/lud/tusz.ts: SW).</summary>
        const double SWx = 0.45, SWy = -0.89;

        static Styl rgb(double[] c, double a = 1) => Barwa.Rgba(c[0], c[1], c[2], a);
        static double Rnd(double v) => Math.Floor(v + 0.5);
        static Styl mieszaj(double[] a, double[] b, double t) =>
            Barwa.Rgba(Rnd(a[0] + (b[0] - a[0]) * t), Rnd(a[1] + (b[1] - a[1]) * t), Rnd(a[2] + (b[2] - a[2]) * t));

        static int I(double v) => Js.Js.ToInt32(v);
        /// <summary>Stały skrót trzech liczb całkowitych → 0..1: to samo miejsce zawsze dostaje te same bryłki.</summary>
        static double los(double a, double b, double c)
        {
            unchecked
            {
                int h = ((I(a) ^ 0x27d4eb2d) * (int)0x85ebca6b) ^ (I(b + 0x165667b1) * (int)0xc2b2ae35) ^ (I(c + 0x3c6ef372) * 0x27d4eb2f);
                h = (h ^ (int)((uint)h >> 15)) * 0x2c1b3c6d;
                h = (h ^ (int)((uint)h >> 12)) * 0x297a2d39;
                return (uint)(h ^ (int)((uint)h >> 15)) / 4294967296.0;
            }
        }

        // ---------------------------------------------------------------- co widać

        /// <summary>Świeżość pamięci ostatnio sprawdzonego kafla (0..1) — obok wyniku `kruszecW`.</summary>
        static double swiezosc = 0;

        static double swiezoscW(World w, int i, int x, int y, double tick)
        {
            if (y <= w.surface[x] + 1) return 1;
            if (w.ever[i] == 0) return 0;
            var f = 1 - (tick - w.lastSeen[i]) / World.MEM_SPAN;
            if (f < 0) f = 0;
            if (w.slad[i] != 0 && f < 0.42) f = 0.42;
            return f;
        }

        /// <summary>Jaki kruszec rycina rysuje w kaflu: 1 żelazo, 2 złoto, 0 nic.</summary>
        static int kruszecW(World w, int i, int x, int y, double tick)
        {
            var f = swiezoscW(w, i, x, y, tick);
            if (f <= 0.01) return 0;
            var t = f > 0.82 ? w.tile[i] : w.mem[i];
            swiezosc = f;
            return t == T.ORE ? 1 : t == T.ZLOTO ? 2 : 0;
        }

        /// <summary>Czy rycina rysuje w kaflu pustkę — tam kruszec nie wchodzi. Nieznane to skała.</summary>
        static bool pustkaW(World w, int i, int x, int y, double tick)
        {
            var f = swiezoscW(w, i, x, y, tick);
            if (f <= 0.01) return false;
            return Tiles.PASSABLE[f > 0.82 ? w.tile[i] : w.mem[i]] == 1;
        }

        // ---------------------------------------------------------------- odbitki skupisk

        sealed class Odbitka
        {
            public IPlotno c = null!;
            /// <summary>Pikseli odbitki na kafel.</summary>
            public double skala;
            /// <summary>Lewy górny róg odbitki w kaflach świata.</summary>
            public double x0, y0;
            /// <summary>Złoto: samorodki, które błyskają — po cztery liczby: x, y (kafle), faza 0..1, okres (s).</summary>
            public List<double> blyski = null!;
            public int uzyta;
        }

        static World? swiat = null;
        static readonly Dictionary<long, Odbitka> odbitki = new Dictionary<long, Odbitka>();
        static int[] znak = new int[0];
        static int[] znakP = new int[0];
        static int pokolenie = 0, nrSkupiska = 0;
        static int klatka = 0;
        static double ostatniaSkala = 0, zmianaSkali = 0;
        static readonly List<int> stos = new List<int>(), kafle = new List<int>(), pustki = new List<int>();
        static readonly List<double> blyskiKlatki = new List<double>();
        static readonly int[,] OSIEM = { { -1, -1 }, { 0, -1 }, { 1, -1 }, { -1, 0 }, { 1, 0 }, { -1, 1 }, { 0, 1 }, { 1, 1 } };

        static double chwilaTeraz() => global::Trzewia.Rdzen.Wydajnosc.Teraz();

        /// <summary>
        /// Kruszec w skale, w świecie (pod mrokiem). Wołane co klatkę po rycinie: odbitki skupisk w widoku i błyski złota.
        /// </summary>
        public static void rysujZyly(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world; var z = cam.zoom;
            if (z < ZYLY.odZoomu) return;
            int W = (int)w.w, H = (int)w.h;
            if (w != swiat || znak.Length != W * H)
            {
                swiat = w; odbitki.Clear();
                znak = new int[W * H];
                znakP = new int[W * H];
            }
            klatka++;
            pokolenie++;
            var tick = sim.tick;
            // piksele urządzenia na piksel płyty: odbitka leży na ekranie jeden do jednego
            var m = ctx.getTransform();
            var ds = Math.Sqrt(m.a * m.a + m.b * m.b); if (ds == 0) ds = 1;
            var skala = Math.Min(ZYLY.maxSkala, z * ds);
            var chwila = chwilaTeraz();
            if (Math.Abs(skala - ostatniaSkala) > 1e-6) { ostatniaSkala = skala; zmianaSkali = chwila; }
            var spokoj = chwila - zmianaSkali > ZYLY.spokojMs;
            int tx0 = (int)Math.Max(0, Math.Floor(cam.toWorldX(0)) - 1), tx1 = (int)Math.Min(W - 1, Math.Ceiling(cam.toWorldX(cam.vw)) + 1);
            int ty0 = (int)Math.Max(0, Math.Floor(cam.toWorldY(0)) - 1), ty1 = (int)Math.Min(H - 1, Math.Ceiling(cam.toWorldY(cam.vh)) + 1);
            var koniec = chwila + ZYLY.msNaKlatke;
            int zbudowane = 0;
            blyskiKlatki.Clear();
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            for (int y = ty0; y <= ty1; y++)
            {
                for (int x = tx0; x <= tx1; x++)
                {
                    int i = y * W + x;
                    if (znak[i] == pokolenie) continue;
                    var r = kruszecW(w, i, x, y, tick);
                    if (r == 0) continue;
                    // całe skupisko, także poza ekranem — przecięte brzegiem miałoby inny klucz przy każdym przesunięciu
                    znak[i] = pokolenie;
                    stos.Clear(); kafle.Clear(); pustki.Clear();
                    stos.Add(i);
                    var jasn = swiezosc;
                    while (stos.Count > 0 && kafle.Count < 400)
                    {
                        var j = stos[stos.Count - 1]; stos.RemoveAt(stos.Count - 1);
                        kafle.Add(j);
                        int jx = j % W, jy = j / W;
                        for (int o8 = 0; o8 < 8; o8++)
                        {
                            int xx = jx + OSIEM[o8, 0], yy = jy + OSIEM[o8, 1];
                            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                            var q = yy * W + xx;
                            if (znak[q] == pokolenie) continue;
                            if (kruszecW(w, q, xx, yy, tick) != r) continue;
                            znak[q] = pokolenie;
                            if (swiezosc > jasn) jasn = swiezosc;
                            stos.Add(q);
                        }
                    }
                    kafle.Sort();
                    // pustka tuż obok skupiska: tam kruszec się urywa (wykuty sąsiad zmienia klucz)
                    nrSkupiska++;
                    foreach (var j in kafle)
                    {
                        int jx = j % W, jy = j / W;
                        for (int o8 = 0; o8 < 8; o8++)
                        {
                            int xx = jx + OSIEM[o8, 0], yy = jy + OSIEM[o8, 1];
                            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
                            var q = yy * W + xx;
                            if (znakP[q] == nrSkupiska || znak[q] == pokolenie) continue;
                            znakP[q] = nrSkupiska;
                            if (pustkaW(w, q, xx, yy, tick)) pustki.Add(q);
                        }
                    }
                    var klucz = skrot(r);
                    if (!odbitki.TryGetValue(klucz, out var o))
                    {
                        // nowe skupisko: rysuje się od razu, chyba że klatka już wyczerpała czas — wtedy w następnej
                        if (zbudowane > 0 && chwilaTeraz() > koniec) continue;
                        o = zbuduj(r, kafle, pustki, W, skala); zbudowane++;
                    }
                    else
                    {
                        var rozjazd = Math.Abs(o.skala - skala) / skala;
                        if (rozjazd > 0.015 && (spokoj || rozjazd > ZYLY.maxRozjazd) && chwilaTeraz() < koniec) { o = zbuduj(r, kafle, pustki, W, skala, o); zbudowane++; }
                    }
                    odbitki[klucz] = o;
                    o.uzyta = klatka;
                    double sx = cam.toScreenX(o.x0), sy = cam.toScreenY(o.y0);
                    double dw = (o.c.width / o.skala) * z, dh = (o.c.height / o.skala) * z;
                    if (sx > cam.vw || sy > cam.vh || sx + dw < 0 || sy + dh < 0) continue;
                    // pamięć blednie: świeżo widziany kruszec pełny, pamiętany przygaszony, im dawniej, tym słabiej
                    var krycie = jasn > 0.82 ? 1 : ZYLY.krycieDawne + (ZYLY.kryciePamieci - ZYLY.krycieDawne) * (jasn / 0.82);
                    ctx.globalAlpha = krycie;
                    ctx.drawImage(o.c, sx, sy, dw, dh);
                    if (o.blyski.Count > 0 && krycie > 0.9) blyskiKlatki.AddRange(o.blyski);
                }
            }
            ctx.globalAlpha = 1;
            if (blyskiKlatki.Count > 0 && Nastroj.wolnoRuszac()) rysujBlyski(ctx, cam, teraz);
            ctx.restore();
            // sprzątanie: odbitki skupisk dawno niewidzianych (albo rozkopanych) idą precz
            if (klatka % 120 == 0 || odbitki.Count > 600)
            {
                var precz = new List<long>();
                foreach (var kv in odbitki) if (klatka - kv.Value.uzyta > 400) precz.Add(kv.Key);
                foreach (var k in precz) { odbitki[k].c.Dispose(); odbitki.Remove(k); }
            }
        }

        /// <summary>Skrót skupiska z `kafle` i `pustki` (i rodzaju kruszcu).</summary>
        static long skrot(int r)
        {
            unchecked
            {
                int h1 = (int)0x811c9dc5 ^ r, h2 = I(0x9e3779b9 + (double)r);
                foreach (var j in kafle) { h1 = (h1 ^ j) * 0x01000193; h2 = (h2 ^ I(j + 0x7f4a7c15)) * (int)0x85ebca6b; h2 ^= (int)((uint)h2 >> 13); }
                h1 = (h1 ^ 0x5bd1e995) * 0x01000193;
                foreach (var j in pustki) { h1 = (h1 ^ j) * 0x01000193; h2 = (h2 ^ I(j + 0x3c6ef372)) * (int)0xc2b2ae35; h2 ^= (int)((uint)h2 >> 15); }
                return (long)(uint)h1 * 1048576 + ((uint)h2 & 0xfffff);
            }
        }

        /// <summary>Błysk samorodka: miękka poświata i jasny punkt, raz na kilka sekund.</summary>
        static void rysujBlyski(IPlotno ctx, Camera cam, double teraz)
        {
            double z = cam.zoom, s = teraz / 1000;
            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";
            for (int k = 0; k < blyskiKlatki.Count; k += 4)
            {
                var t = (s / blyskiKlatki[k + 3] + blyskiKlatki[k + 2]) % 1;
                if (t > ZYLY.blyskCzesc) continue;
                var b = JsM.Sin((t / ZYLY.blyskCzesc) * Math.PI);
                double x = cam.toScreenX(blyskiKlatki[k]), y = cam.toScreenY(blyskiKlatki[k + 1]);
                if (x < -z || y < -z || x > cam.vw + z || y > cam.vh + z) continue;
                var L = (0.12 + 0.26 * b) * z;
                var g = ctx.createRadialGradient(x, y, 0, x, y, L * 0.5);
                g.addColorStop(0, Barwa.Rgba(255, 236, 170, 0.5 * b));
                g.addColorStop(1, "rgba(255,214,120,0)");
                // sama miękka poświata i jasny punkt — krzyżyki promieni czytały się jak plusiki interfejsu
                ctx.fillStyle = g;
                ctx.fillRect(x - L, y - L, L * 2, L * 2);
                ctx.fillStyle = Barwa.Rgba(255, 246, 214, 0.8 * b);
                ctx.beginPath(); ctx.arc(x, y, Math.Max(0.8, z * 0.025), 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = "source-over";
        }

        // ---------------------------------------------------------------- budowa odbitki

        static IPlotno? warstwa = null;
        static IPlotno? wzorKreski = null;
        static IPlotno? wzorKwarcu = null;

        /// <summary>Rysuje skupisko do odbitki (nowej albo starej, przerysowanej w nowej skali).</summary>
        static Odbitka zbuduj(int rodzaj, List<int> kafle, List<int> pustki, int W, double skala, Odbitka? stara = null)
        {
            int minx = 1000000000, maxx = -1000000000, miny = 1000000000, maxy = -1000000000;
            foreach (var i in kafle)
            {
                int x = i % W, y = i / W;
                if (x < minx) minx = x; if (x > maxx) maxx = x;
                if (y < miny) miny = y; if (y > maxy) maxy = y;
            }
            var Z = ZYLY.zapas;
            double x0 = minx - Z, y0 = miny - Z, szer = maxx - minx + 1 + 2 * Z, wys = maxy - miny + 1 + 2 * Z;
            int cw = Math.Max(1, (int)Math.Ceiling(szer * skala)), ch = Math.Max(1, (int)Math.Ceiling(wys * skala));
            IPlotno c;
            if (stara != null) { c = stara.c; c.width = cw; c.height = ch; }
            else c = Plotno.Nowe(cw, ch);
            var g = c;
            g.setTransform(skala, 0, 0, skala, -x0 * skala, -y0 * skala);
            g.lineCap = "round";
            g.lineJoin = "round";
            var zbior = new HashSet<int>(kafle);
            var pusto = new HashSet<int>(pustki);
            var blyski = new List<double>();
            if (rodzaj == 1) rysujZelazo(g, kafle, zbior, pusto, W, skala, kreskowanie(g, skala));
            else rysujZloto(g, kafle, zbior, pusto, W, skala, blyski);
            // kruszec nie wchodzi w pustkę: brzeg jaskini (kreska tuszu i jasna warga) zostaje na wierzchu
            g.globalCompositeOperation = "destination-out";
            g.fillStyle = "#000";
            var od = ZYLY.odPustki;
            foreach (var q in pustki)
            {
                int x = q % W, y = q / W;
                g.fillRect(x - od, y - od, 1 + 2 * od, 1 + 2 * od);
            }
            g.globalCompositeOperation = "source-over";
            return new Odbitka { c = c, skala = skala, x0 = x0, y0 = y0, blyski = blyski, uzyta = klatka };
        }

        /// <summary>Kreskowanie cienia: cienkie ukośne kreski co trzy piksele urządzenia, niezależnie od przybliżenia.</summary>
        static CanvasPattern? kreskowanie(IPlotno g, double skala)
        {
            if (wzorKreski == null)
            {
                wzorKreski = Plotno.Nowe(6, 6);
                var k = wzorKreski;
                k.strokeStyle = rgb(B.tusz, 0.62);
                k.lineWidth = 0.9;
                k.beginPath();
                for (int d = -6; d <= 12; d += 3) { k.moveTo(d, 6); k.lineTo(d + 6, 0); }
                k.stroke();
            }
            var p = g.createPattern(wzorKreski, "repeat");
            p?.setTransform(new DOMMatrix(1 / skala, 0, 0, 1 / skala, 0, 0));
            return p;
        }

        /// <summary>Rzadka, stroma kreska w kwarcu (co pięć pikseli urządzenia).</summary>
        static Styl kreskaKwarcu(IPlotno g, double skala)
        {
            if (wzorKwarcu == null)
            {
                wzorKwarcu = Plotno.Nowe(5, 10);
                var k = wzorKwarcu;
                k.strokeStyle = "rgba(120,104,80,0.34)";
                k.lineWidth = 0.8;
                k.beginPath();
                for (int d = -5; d <= 10; d += 5) { k.moveTo(d, 0); k.lineTo(d + 5, 10); }
                k.stroke();
            }
            var p = g.createPattern(wzorKwarcu, "repeat");
            if (p == null) return "rgba(0,0,0,0)";
            p.setTransform(new DOMMatrix(1 / skala, 0, 0, 1 / skala, 0, 0));
            return p;
        }

        /// <summary>
        /// Sierp światłocienia dla sumy kształtów: część `S`, której nie zasłania kopia `S` przesunięta o (dx, dy)
        /// (przez pomocniczą warstwę — bez szwów tam, gdzie wstęgi się nakładają).
        /// </summary>
        static void sierpSumy(IPlotno g, Path2D S, double dx, double dy, Styl styl)
        {
            if (warstwa == null) warstwa = Plotno.Nowe(g.width, g.height);
            if (warstwa.width != g.width || warstwa.height != g.height) { warstwa.width = g.width; warstwa.height = g.height; }
            var v = warstwa;
            v.setTransform(1, 0, 0, 1, 0, 0);
            v.clearRect(0, 0, warstwa.width, warstwa.height);
            v.setTransform(g.getTransform());
            v.fillStyle = styl;
            v.fill(S);
            v.globalCompositeOperation = "destination-out";
            v.translate(dx, dy);
            v.fill(S);
            v.globalCompositeOperation = "source-over";
            g.save();
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.drawImage(warstwa, 0, 0);
            g.restore();
        }

        /// <summary>Sierp światłocienia jednego kształtu: obcięcie do kształtu i dopełnienie przesuniętej kopii.</summary>
        static void sierp(IPlotno g, Path2D S, double cx, double cy, double dx, double dy, Styl styl)
        {
            var p = new Path2D();
            p.rect(cx - 3, cy - 3, 6, 6);
            p.addPath(S, new DOMMatrix(1, 0, 0, 1, dx, dy));
            g.fillStyle = styl;
            g.fill(p, "evenodd");
        }

        // ---------------------------------------------------------------- żelazo

        sealed class Brylka { public double x, y, r, s; }

        /// <summary>Gniazdo żelaza: przyrdzewiała skała, masa rudy, zacieki, okruchy i kanciaste bryłki.</summary>
        static void rysujZelazo(IPlotno g, List<int> kafle, HashSet<int> zbior, HashSet<int> pusto, int W, double skala, CanvasPattern? kreska)
        {
            var px = 1 / skala;
            bool maly = skala < 11, duzy = skala >= 17;
            bool jest(int x, int y) => zbior.Contains(y * W + x);
            var kandydaci = new List<Brylka>();
            var drobiny = new List<Brylka>();
            // siatka świata dwa oczka na kafel w każdą stronę: bryłki nie wiedzą, gdzie kończy się kafel
            foreach (var i in kafle)
            {
                int x = i % W, y = i / W;
                int wok = 0;
                for (int o8 = 0; o8 < 8; o8++) if (jest(x + OSIEM[o8, 0], y + OSIEM[o8, 1])) wok++;
                // w głębi gniazda bryłki większe, na jego skraju drobniejsze
                var rdzen = 0.82 + 0.28 * (wok / 8.0);
                for (int a = 0; a < 2; a++)
                {
                    for (int b = 0; b < 2; b++)
                    {
                        int gx = x * 2 + a, gy = y * 2 + b;
                        double u = los(gx, gy, 1), v = los(gx, gy, 4);
                        if (u < 0.2) continue;
                        double bx = (gx + 0.5 + (los(gx, gy, 2) - 0.5) * 0.8) / 2, by = (gy + 0.5 + (los(gx, gy, 3) - 0.5) * 0.8) / 2;
                        var r = (u < 0.55 ? 0.15 + v * 0.06 : 0.23 + v * 0.1) * rdzen;
                        if (maly) r = Math.Max(r, 0.19);
                        kandydaci.Add(new Brylka { x = bx, y = by, r = r, s = gx * 977 + gy });
                    }
                }
                // każdy kafel kruszcu ma choć jedną porządną bryłkę — inaczej kafel czytałby się jak skała
                var r0 = (maly ? 0.29 : 0.25) + los(x, y, 5) * 0.08;
                kandydaci.Add(new Brylka { x = x + 0.3 + los(x, y, 6) * 0.4, y = y + 0.3 + los(x, y, 7) * 0.4, r = r0, s = -(i + 1) });
                if (maly) continue;
                // drobiny: kilka okruchów w skale tuż za skrajem gniazda
                for (int o8 = 0; o8 < 8; o8++)
                {
                    int dx = OSIEM[o8, 0], dy = OSIEM[o8, 1];
                    if ((dx != 0 && dy != 0) || jest(x + dx, y + dy) || los(x * 4 + dx, y * 4 + dy, 8) > 0.6) continue;
                    var ile = 1 + (int)Math.Floor(los(x * 4 + dx, y * 4 + dy, 9) * 2);
                    for (int k = 0; k < ile; k++)
                    {
                        double s = ((double)i * 8 + (dx + 1) * 3 + dy + 1) * 4 + k;
                        double wz = (los(s, 1, 10) - 0.5) * 0.9, wg = 0.12 + los(s, 1, 11) * 0.3;
                        double bx = x + 0.5 + (dx != 0 ? dx * (0.5 + wg) : wz), by = y + 0.5 + (dy != 0 ? dy * (0.5 + wg) : wz);
                        drobiny.Add(new Brylka { x = bx, y = by, r = 0.03 + los(s, 1, 12) * 0.03, s = s });
                    }
                }
            }
            // od największych: bryłka, która za bardzo wchodzi na większą, odpada — ale się stykają i zachodzą
            Js.Js.Sort(kandydaci, (a, b) => { var d = b.r - a.r; return d != 0 ? d : a.s - b.s; });
            var bryly = new List<Brylka>();
            foreach (var k in kandydaci)
            {
                var ok = true;
                foreach (var q in bryly)
                {
                    double dx = k.x - q.x, dy = k.y - q.y;
                    var gr = 0.55 * (k.r + q.r);
                    if (dx * dx + dy * dy < gr * gr) { ok = false; break; }
                }
                if (ok || k.s < 0) bryly.Add(k);
            }

            // ruda: ciemna, rdzawa masa spaja bryłki w jedno gniazdo — obwiedziona kreską jak wtrącenie na rycinie
            Path2D plama = new Path2D(), masa = new Path2D(), masaObrys = new Path2D();
            var oM = Math.Max(1 * px, 0.022);
            void kolo(double x, double y, double rx, double ry)
            {
                masa.moveTo(x + rx, y); masa.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
                masaObrys.moveTo(x + rx + oM, y); masaObrys.ellipse(x, y, rx + oM, ry + oM, 0, 0, Math.PI * 2);
                plama.moveTo(x + rx * 1.6, y); plama.ellipse(x, y, rx * 1.6, ry * 1.6, 0, 0, Math.PI * 2);
            }
            int[,] CZTERY = { { 1, 0 }, { 0, 1 }, { 1, 1 }, { -1, 1 } };
            foreach (var i in kafle)
            {
                int x = i % W, y = i / W;
                var r = 0.5 + los(x, y, 20) * 0.12;
                kolo(x + 0.5 + (los(x, y, 21) - 0.5) * 0.16, y + 0.5 + (los(x, y, 22) - 0.5) * 0.12, r * 1.06, r * 0.94);
                for (int q = 0; q < 4; q++)
                {
                    int dx = CZTERY[q, 0], dy = CZTERY[q, 1];
                    if (jest(x + dx, y + dy)) kolo(x + 0.5 + dx / 2.0, y + 0.5 + dy / 2.0, dx != 0 && dy != 0 ? 0.42 : 0.5, dx != 0 && dy != 0 ? 0.42 : 0.5);
                }
            }
            foreach (var b in bryly) if (b.r >= 0.16) kolo(b.x, b.y, b.r * 1.2 + 0.04, b.r * 1.05 + 0.03);
            g.fillStyle = rgb(B.rdzaPlama, 0.14);
            g.fill(plama);
            g.fillStyle = rgb(B.tusz, 0.32);
            g.fill(masaObrys);
            g.save();
            g.globalCompositeOperation = "destination-out";
            g.fill(masa);
            g.restore();
            g.fillStyle = rgb(B.rudaMasa, 0.7);
            g.fill(masa);
            // ziarno masy: drobne rdzawe i ciemne cętki (z bliska)
            if (duzy)
            {
                foreach (var i in kafle)
                {
                    int x = i % W, y = i / W;
                    for (int k = 0; k < 7; k++)
                    {
                        double cx = x + los(i, k, 23), cy = y + los(i, k, 24);
                        g.fillStyle = los(i, k, 25) < 0.5 ? rgb(B.rdza, 0.7) : rgb(B.tusz, 0.55);
                        g.fillRect(cx, cy, 1.4 * px, 1.4 * px);
                    }
                }
            }
            // zacieki rdzy spod większych bryłek — w dół (nie do pustki)
            if (!maly)
            {
                g.strokeStyle = rgb(B.rdza, 0.28);
                foreach (var b in bryly)
                {
                    if (b.r < 0.13 || los(b.s, 3, 3) > 0.45) continue;
                    double x = b.x + (los(b.s, 3, 4) - 0.5) * b.r, y = b.y + b.r * 0.6;
                    var dl = 0.22 + los(b.s, 3, 5) * 0.32;
                    if (pusto.Contains((int)(Math.Floor(y + dl) * W + Math.Floor(x)))) continue;
                    g.lineWidth = Math.Max(1.2 * px, b.r * 0.16);
                    g.beginPath();
                    g.moveTo(x, y);
                    g.quadraticCurveTo(x + (los(b.s, 3, 6) - 0.5) * 0.12, y + dl * 0.5, x + (los(b.s, 3, 7) - 0.5) * 0.08, y + dl);
                    g.stroke();
                }
            }
            // okruchy rudy w skale za skrajem gniazda
            foreach (var d in drobiny)
            {
                var n = 3 + (int)Math.Floor(los(d.s, 1, 1) * 2);
                g.beginPath();
                for (int k = 0; k < n; k++)
                {
                    var a = ((double)k / n) * Math.PI * 2 + los(d.s, k, 2);
                    var rr = d.r * (0.7 + los(d.s, k, 3) * 0.5);
                    if (k == 0) g.moveTo(d.x + JsM.Cos(a) * rr, d.y + JsM.Sin(a) * rr);
                    else g.lineTo(d.x + JsM.Cos(a) * rr, d.y + JsM.Sin(a) * rr);
                }
                g.closePath();
                g.strokeStyle = rgb(B.tusz, 0.9);
                g.lineWidth = Math.Max(1.2 * px, d.r * 0.4);
                g.stroke();
                g.fillStyle = rgb(B.stalPol);
                g.fill();
                g.fillStyle = rgb(B.stalSwiatlo, 0.95);
                var pd = Math.Max(px, d.r * 0.45);
                g.fillRect(d.x + SWx * d.r * 0.35 - pd / 2, d.y + SWy * d.r * 0.35 - pd / 2, pd, pd);
            }
            // z tyłu do przodu: niższa bryłka zachodzi na wyższą jak w usypisku
            Js.Js.Sort(bryly, (a, b) => a.y + a.r * 0.3 - (b.y + b.r * 0.3));
            foreach (var b in bryly) rysujBrylke(g, b, px, duzy, kreska);
        }

        static readonly List<double> wx = new List<double>(), wy = new List<double>();

        /// <summary>Kanciasta bryłka: ścianki od światła do cienia (cień kreskowany), kontur tuszem, błysk na grani.</summary>
        static void rysujBrylke(IPlotno g, Brylka b, double px, bool duzy, CanvasPattern? kreska)
        {
            var s = b.s;
            var nv = 5 + (int)Math.Floor(los(s, 7, 0) * 3);
            var a0 = los(s, 7, 1) * Math.PI * 2;
            // spłaszczona wzdłuż warstw skały, trochę obrócona
            var wyd = 1.05 + los(s, 7, 4) * 0.35;
            var obr = (los(s, 7, 5) - 0.5) * 0.6;
            double co = JsM.Cos(obr), si = JsM.Sin(obr);
            wx.Clear(); wy.Clear();
            for (int k = 0; k < nv; k++)
            {
                var a = a0 + ((double)k / nv) * Math.PI * 2 + (los(s, k, 2) - 0.5) * (Math.PI / nv) * 0.9;
                var rr = b.r * (0.74 + los(s, k, 3) * 0.4);
                double ex = JsM.Cos(a) * rr * wyd, ey = JsM.Sin(a) * rr * 0.92 / wyd;
                wx.Add(b.x + ex * co - ey * si);
                wy.Add(b.y + ex * si + ey * co);
            }
            var obrys = new Path2D();
            obrys.moveTo(wx[0], wy[0]);
            for (int k = 1; k < nv; k++) obrys.lineTo(wx[k], wy[k]);
            obrys.closePath();
            // gniazdo: ciemna masa rudy wokół bryłki, u dołu głębsza — bryłka siedzi w skale, nie leży na niej
            g.strokeStyle = rgb(B.rudaMasa, 0.9);
            g.lineWidth = Math.Max(2 * px, b.r * 0.24);
            g.stroke(obrys);
            if (duzy)
            {
                g.save();
                g.translate(0, b.r * 0.12);
                g.strokeStyle = rgb(B.tusz, 0.35);
                g.stroke(obrys);
                g.restore();
            }
            g.fillStyle = rgb(B.stalPol);
            g.fill(obrys);
            // każda bryłka trochę inna: jaśniejsza albo ciemniejsza stal, co czwarta pod patyną rdzy
            double ton = 0.86 + los(s, 7, 6) * 0.26, patyna = los(s, 7, 7) < 0.25 ? 0.22 : 0;
            // ścianki: wierzchołek trochę od światła, więc jasne ścianki są szerokie, a cień zbiera się u dołu
            double ax = b.x - SWx * b.r * 0.16, ay = b.y - SWy * b.r * 0.16;
            double najj = -2; int kj = 0;
            for (int k = 0; k < nv; k++)
            {
                var k2 = (k + 1) % nv;
                double mx = (wx[k] + wx[k2]) / 2 - b.x, my = (wy[k] + wy[k2]) / 2 - b.y;
                var dl = Math.Sqrt(mx * mx + my * my); if (dl == 0) dl = 1;
                var d = (mx * SWx + my * SWy) / dl;
                if (d > najj) { najj = d; kj = k; }
                var t = 0.5 + 0.62 * d;
                t = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
                var sciana = new Path2D();
                sciana.moveTo(ax, ay); sciana.lineTo(wx[k], wy[k]); sciana.lineTo(wx[k2], wy[k2]);
                sciana.closePath();
                // dolne ścianki łapią rdzę, a niektóre bryłki całe są przyrdzewiałe; ścianka w pełnym świetle lśni
                var rdzawa = (my / dl > 0.55 ? 0.3 : 0) + patyna;
                var baza = t < 0.5 ? B.stalCien : B.stalPol; var cel = t < 0.5 ? B.stalPol : B.stalSwiatlo;
                var tt = t < 0.5 ? t * 2 : (t - 0.5) * 2;
                var c0 = new[] { (baza[0] + (cel[0] - baza[0]) * tt) * ton, (baza[1] + (cel[1] - baza[1]) * tt) * ton, (baza[2] + (cel[2] - baza[2]) * tt) * ton };
                g.fillStyle = t > 0.88 ? mieszaj(c0, B.blyskStali, 0.12) : mieszaj(c0, B.rdza, rdzawa);
                g.fill(sciana);
                // cień kreskowany rylcem — jak skała ryciny
                if (duzy && kreska != null && t < 0.4) { g.fillStyle = kreska; g.fill(sciana); }
            }
            // granie ścianek cienką kreską
            if (duzy)
            {
                g.strokeStyle = rgb(B.tusz, 0.3);
                g.lineWidth = Math.Max(0.7 * px, b.r * 0.04);
                g.beginPath();
                for (int k = 0; k < nv; k++) { g.moveTo(ax, ay); g.lineTo(wx[k], wy[k]); }
                g.stroke();
            }
            // kontur tuszem: dookoła cienki, od strony cienia dociśnięty
            var wK = Math.Max(1 * px, b.r * 0.08);
            g.strokeStyle = rgb(B.tusz, 0.8);
            g.lineWidth = wK;
            g.stroke(obrys);
            g.lineWidth = wK * 2;
            g.beginPath();
            for (int k = 0; k < nv; k++)
            {
                var k2 = (k + 1) % nv;
                double mx = (wx[k] + wx[k2]) / 2 - b.x, my = (wy[k] + wy[k2]) / 2 - b.y;
                var h = Math.Sqrt(mx * mx + my * my); if (h == 0) h = 1;
                if ((mx * SWx + my * SWy) / h < -0.2) { g.moveTo(wx[k], wy[k]); g.lineTo(wx[k2], wy[k2]); }
            }
            g.stroke();
            // błysk metalu na grani zwróconej do światła
            if (b.r >= 0.17 && los(s, 9, 9) < 0.35)
            {
                var k2 = (kj + 1) % nv;
                const double t0 = 0.3, t1 = 0.62, ins = 0.22;
                double x0 = wx[kj] + (wx[k2] - wx[kj]) * t0, y0 = wy[kj] + (wy[k2] - wy[kj]) * t0;
                double x1 = wx[kj] + (wx[k2] - wx[kj]) * t1, y1 = wy[kj] + (wy[k2] - wy[kj]) * t1;
                g.strokeStyle = rgb(B.blyskStali, 0.55);
                g.lineWidth = Math.Max(0.8 * px, b.r * 0.07);
                g.beginPath();
                g.moveTo(x0 + (ax - x0) * ins, y0 + (ay - y0) * ins);
                g.lineTo(x1 + (ax - x1) * ins, y1 + (ay - y1) * ins);
                g.stroke();
            }
        }

        // ---------------------------------------------------------------- złoto

        static readonly List<double> wst = new List<double>();

        /// <summary>
        /// Wstęga wzdłuż łamanej (xs, ys) o półszerokościach hs (+ dod), dopisywana zawsze w tym samym obiegu co łuk
        /// „arc” — wypełnienie „nonzero” daje sumę wstęg i kół. Koło na końcu łączy pień z sąsiednim odcinkiem.
        /// </summary>
        static void wstega(Path2D p, List<double> xs, List<double> ys, List<double> hs, double dod, bool kolkoA, bool kolkoB)
        {
            int n = xs.Count;
            wst.Clear();
            var L = new List<double>(); var P = new List<double>();
            for (int k = 0; k < n; k++)
            {
                int k0 = k > 0 ? k - 1 : k, k1 = k < n - 1 ? k + 1 : k;
                double dx = xs[k1] - xs[k0], dy = ys[k1] - ys[k0];
                var d = Math.Sqrt(dx * dx + dy * dy); if (d == 0) d = 1;
                dx /= d; dy /= d;
                var h = Math.Max(0, hs[k]) + dod;
                L.Add(xs[k] - dy * h); L.Add(ys[k] + dx * h); P.Add(xs[k] + dy * h); P.Add(ys[k] - dx * h);
            }
            for (int k = 0; k < L.Count; k += 2) { wst.Add(L[k]); wst.Add(L[k + 1]); }
            for (int k = P.Count - 2; k >= 0; k -= 2) { wst.Add(P[k]); wst.Add(P[k + 1]); }
            double pole = 0;
            for (int k = 0; k < wst.Count; k += 2)
            {
                var k2 = (k + 2) % wst.Count;
                pole += wst[k] * wst[k2 + 1] - wst[k2] * wst[k + 1];
            }
            if (pole >= 0)
            {
                p.moveTo(wst[0], wst[1]);
                for (int k = 2; k < wst.Count; k += 2) p.lineTo(wst[k], wst[k + 1]);
            }
            else
            {
                p.moveTo(wst[wst.Count - 2], wst[wst.Count - 1]);
                for (int k = wst.Count - 4; k >= 0; k -= 2) p.lineTo(wst[k], wst[k + 1]);
            }
            p.closePath();
            double h0 = Math.Max(0, hs[0]) + dod, h1 = Math.Max(0, hs[n - 1]) + dod;
            if (kolkoA && h0 > 0) { p.moveTo(xs[0] + h0, ys[0]); p.arc(xs[0], ys[0], h0, 0, Math.PI * 2); }
            if (kolkoB && h1 > 0) { p.moveTo(xs[n - 1] + h1, ys[n - 1]); p.arc(xs[n - 1], ys[n - 1], h1, 0, Math.PI * 2); }
        }

        sealed class Zylka { public List<double> xs = null!, ys = null!, hs = null!; public bool pien; }
        sealed class Samorodek { public double x, y, r, s; }

        /// <summary>
        /// Łamana od (ax, ay) do (bx, by), pogięta w poprzek, wygładzona jednym ścięciem rogów; półszerokość od h0 do h1,
        /// po drodze pęcznieje i zwęża się (soczewki złota w szczelinie).
        /// </summary>
        static Zylka lamana(double ax, double ay, double bx, double by, double h0, double h1, double s, double giecie, double puchnie)
        {
            double dx = bx - ax, dy = by - ay, dl = Math.Sqrt(dx * dx + dy * dy); if (dl == 0) dl = 1;
            double nx = -dy / dl, ny = dx / dl;
            var xs0 = new double[5]; var ys0 = new double[5]; var hs0 = new double[5];
            for (int k = 0; k <= 4; k++)
            {
                var t = k / 4.0;
                var o = k == 0 || k == 4 ? 0 : (los(s, k, 40) - 0.5) * giecie * dl;
                xs0[k] = ax + dx * t + nx * o; ys0[k] = ay + dy * t + ny * o;
                hs0[k] = (h0 + (h1 - h0) * t) * (k == 0 || k == 4 ? 1 : 1 + (los(s, k, 41) - 0.4) * puchnie);
            }
            // ścięcie rogów (Chaikin): łagodne zakola zamiast zygzaka
            var xs = new List<double> { xs0[0] }; var ys = new List<double> { ys0[0] }; var hs = new List<double> { hs0[0] };
            for (int k = 0; k < 4; k++)
            {
                foreach (var t in new[] { 0.25, 0.75 })
                {
                    xs.Add(xs0[k] + (xs0[k + 1] - xs0[k]) * t); ys.Add(ys0[k] + (ys0[k + 1] - ys0[k]) * t); hs.Add(hs0[k] + (hs0[k + 1] - hs0[k]) * t);
                }
            }
            xs.Add(xs0[4]); ys.Add(ys0[4]); hs.Add(hs0[4]);
            return new Zylka { xs = xs, ys = ys, hs = hs, pien = true };
        }

        /// <summary>Żyła złota: kwarc, w nim pień przez wszystkie kafle (drzewo rozpinające), gałązki, ogony i samorodki.</summary>
        static void rysujZloto(IPlotno g, List<int> kafle, HashSet<int> zbior, HashSet<int> pusto, int W, double skala, List<double> blyski)
        {
            var px = 1 / skala;
            bool maly = skala < 11, duzy = skala >= 17;
            bool jest(int x, int y) => zbior.Contains(y * W + x);
            bool pustoW(double x, double y) => pusto.Contains((int)(Math.Floor(y) * W + Math.Floor(x)));
            // z daleka żyła nie może się rozpaść na nitki: najmniejsza półszerokość w pikselach
            var hwMin = (maly ? 1.5 : duzy ? 1.1 : 1.3) * px;
            int n = kafle.Count;
            var wezX = new List<double>(); var wezY = new List<double>(); var wezH = new List<double>();
            var nr = new Dictionary<int, int>();
            for (int k = 0; k < n; k++)
            {
                int i = kafle[k], x = i % W, y = i / W;
                nr[i] = k;
                wezX.Add(x + 0.5 + (los(x, y, 51) - 0.5) * 0.44);
                wezY.Add(y + 0.5 + (los(x, y, 52) - 0.5) * 0.34);
                // cienka żyła w szczelinie, nie sznurek
                wezH.Add(Math.Max(hwMin, (maly ? 0.062 : 0.034) + los(x, y, 53) * 0.02));
            }
            // drzewo rozpinające po sąsiadach (Kruskal): poziomo najtaniej, po skosie drożej, w pionie najdrożej
            var krawedzie = new List<(int a, int b, double waga)>();
            var KIER = new (int dx, int dy, double waga)[] { (1, 0, 1), (0, 1, 2.2), (1, 1, 1.3), (-1, 1, 1.3) };
            for (int k = 0; k < n; k++)
            {
                int i = kafle[k], x = i % W, y = i / W;
                foreach (var (dx, dy, waga) in KIER)
                {
                    if (!jest(x + dx, y + dy)) continue;
                    krawedzie.Add((k, nr[(y + dy) * W + x + dx], waga * (0.7 + 0.6 * los(x * 4 + dx + 1, y * 4 + dy, 54))));
                }
            }
            Js.Js.Sort(krawedzie, (a, b) => a.waga - b.waga);
            var rodzic = new int[n];
            for (int k = 0; k < n; k++) rodzic[k] = k;
            int szef(int k) { while (rodzic[k] != k) { rodzic[k] = rodzic[rodzic[k]]; k = rodzic[k]; } return k; }
            var sasiad = new List<List<int>>();
            for (int k = 0; k < n; k++) sasiad.Add(new List<int>());
            var zylki = new List<Zylka>();
            var samorodki = new List<Samorodek>();
            // Gałązka od (ox, oy) w kierunku a: w pustkę nie (odbija na drugą stronę), zwęża się do ostrza, czasem widlasta.
            void galazka(double ox, double oy, double a, double dl, double h0, double s, double odbij)
            {
                double ex = ox + JsM.Cos(a) * dl, ey = oy + JsM.Sin(a) * dl;
                if (pustoW(ex, ey) || pustoW((ox + ex) / 2, (oy + ey) / 2))
                {
                    a = odbij - a;
                    ex = ox + JsM.Cos(a) * dl; ey = oy + JsM.Sin(a) * dl;
                    if (pustoW(ex, ey) || pustoW((ox + ex) / 2, (oy + ey) / 2)) return;
                }
                var zz = lamana(ox, oy, ex, ey, h0, maly ? hwMin * 0.7 : 0, s, 0.3, 0.3);
                zz.pien = false;
                zylki.Add(zz);
                if (!duzy) return;
                if (los(s, 1, 42) < 0.42)
                {
                    var zw = (los(s, 1, 43) < 0.5 ? -1 : 1) * (0.5 + los(s, 1, 44) * 0.35);
                    double fx = zz.xs[5], fy = zz.ys[5], d2 = dl * (0.35 + los(s, 1, 45) * 0.25);
                    double gx = fx + JsM.Cos(a + zw) * d2, gy = fy + JsM.Sin(a + zw) * d2;
                    if (!pustoW(gx, gy)) { var z2 = lamana(fx, fy, gx, gy, zz.hs[5] * 0.8, 0, s + 7, 0.3, 0.2); z2.pien = false; zylki.Add(z2); }
                }
                else if (los(s, 1, 46) < 0.3) samorodki.Add(new Samorodek { x = ex, y = ey, r = 0.04 + los(s, 1, 47) * 0.025, s = s * 3 + 1 });
            }
            foreach (var (a, b, _) in krawedzie)
            {
                int ra = szef(a), rb = szef(b);
                if (ra == rb) continue;
                rodzic[ra] = rb;
                sasiad[a].Add(b); sasiad[b].Add(a);
                double s = (double)kafle[a] * 4 + (kafle[b] - kafle[a] + W + 1);
                var zl = lamana(wezX[a], wezY[a], wezX[b], wezY[b], wezH[a], wezH[b], s, 0.3, maly ? 0.3 : 0.5);
                zylki.Add(zl);
                // z bliska: drobne ząbki wzdłuż żyły — złoto rośnie w szczelinie kryształkami, nie jak gładki drut
                if (duzy)
                {
                    for (int j = 1; j < zl.xs.Count - 1; j += 2)
                    {
                        if (los(s, j, 30) < 0.4) continue;
                        var kj = JsM.Atan2(zl.ys[j + 1] - zl.ys[j - 1], zl.xs[j + 1] - zl.xs[j - 1]);
                        var a2 = kj + (los(s, j, 31) < 0.5 ? -1 : 1) * (0.8 + los(s, j, 32) * 0.5);
                        var d2 = 0.05 + los(s, j, 33) * 0.07 + zl.hs[j] * 0.6;
                        double ex = zl.xs[j] + JsM.Cos(a2) * d2, ey = zl.ys[j] + JsM.Sin(a2) * d2;
                        if (pustoW(ex, ey)) continue;
                        var zab = lamana(zl.xs[j], zl.ys[j], ex, ey, zl.hs[j] * 0.55, 0, s * 3 + j, 0, 0);
                        zab.pien = false;
                        zylki.Add(zab);
                    }
                }
                // gałązka z połowy odcinka, w bok i trochę naprzód
                double ddx = wezX[b] - wezX[a], ddy = wezY[b] - wezY[a], kat = JsM.Atan2(ddy, ddx);
                if (los(s, 2, 48) < (duzy ? 0.85 : 0.55))
                {
                    var strona = los(s, 2, 49) < 0.5 ? -1 : 1;
                    var m = 3 + (int)Math.Floor(los(s, 2, 50) * 3);
                    galazka(zl.xs[m], zl.ys[m], kat + strona * (0.9 + los(s, 2, 51) * 0.5), (maly ? 0.3 : 0.22) + los(s, 2, 52) * 0.22, Math.Max(hwMin * 0.8, zl.hs[m] * 0.6), s * 5 + 3, 2 * kat);
                }
                // samorodek gdzieś na odcinku, zwykle tam, gdzie żyła spuchła
                if (los(s, 2, 53) < 0.42)
                {
                    var m = 1 + (int)Math.Floor(los(s, 2, 55) * (zl.hs.Count - 2));
                    if (los(s, 2, 56) < 0.6) for (int k = 2; k < zl.hs.Count - 1; k++) if (zl.hs[k] > zl.hs[m]) m = k;
                    samorodki.Add(new Samorodek { x = zl.xs[m], y = zl.ys[m], r = (maly ? 0.16 : 0.11) + los(s, 2, 54) * 0.08, s = s * 5 + 4 });
                }
            }
            for (int k = 0; k < n; k++)
            {
                int i = kafle[k], x = i % W, y = i / W;
                var sas = sasiad[k];
                // koniec żyły nie urywa się kołem: ogon wychodzi w skałę i zwęża się do ostrza
                if (sas.Count <= 1)
                {
                    var kier = sas.Count > 0 ? JsM.Atan2(wezY[k] - wezY[sas[0]], wezX[k] - wezX[sas[0]]) : (los(x, y, 55) < 0.5 ? 0 : Math.PI);
                    var ile = sas.Count > 0 ? 1 : 2;
                    for (int j = 0; j < ile; j++)
                    {
                        var a = kier + j * Math.PI + (los(x, y, 56 + j) - 0.5) * 0.7;
                        var dl = 0.3 + los(x, y, 58 + j) * 0.22;
                        double ex = wezX[k] + JsM.Cos(a) * dl, ey = wezY[k] + JsM.Sin(a) * dl;
                        if (pustoW(ex, ey)) continue;
                        zylki.Add(lamana(wezX[k], wezY[k], ex, ey, wezH[k], maly ? hwMin * 0.7 : 0, (double)i * 4 + j, 0.25, 0.3));
                    }
                }
                // gałązka z węzła w poprzek pasa
                if (!maly && sas.Count <= 2 && los(x, y, 60) < 0.75)
                {
                    var a = (los(x, y, 61) < 0.5 ? -1 : 1) * (Math.PI / 2 + (los(x, y, 62) - 0.5) * 1.2);
                    galazka(wezX[k], wezY[k], a, 0.24 + los(x, y, 63) * 0.2, wezH[k] * 0.6, (double)i * 9 + 2, 0);
                }
                // samorodek w węźle
                if (los(x, y, 64) < (maly ? 0.45 : 0.3))
                {
                    samorodki.Add(new Samorodek { x = wezX[k] + (los(x, y, 65) - 0.5) * 0.14, y = wezY[k] + (los(x, y, 66) - 0.5) * 0.08, r = (maly ? 0.18 : 0.13) + los(x, y, 67) * 0.09, s = (double)i * 9 + 7 });
                }
            }

            // kwarc: jasna, kanciasta soczewka wokół pnia
            Path2D kwarc = new Path2D(), kwarcObrys = new Path2D();
            var oK = Math.Max(1 * px, 0.022);
            for (int k = 0; k < zylki.Count; k++)
            {
                var zl = zylki[k];
                if (!zl.pien) continue;
                var hq = new List<double>(zl.hs.Count);
                for (int j = 0; j < zl.hs.Count; j++)
                    hq.Add(Math.Max(duzy ? 0 : 2.6 * px, 0.15 + 0.05 * JsM.Sin(j * 0.9 + k * 1.7) + zl.hs[j] * 0.4) * (j == zl.hs.Count - 1 && zl.hs[j] <= hwMin ? 0.3 : 1));
                wstega(kwarc, zl.xs, zl.ys, hq, 0, false, false);
                wstega(kwarcObrys, zl.xs, zl.ys, hq, oK, false, false);
            }
            // w węzłach kryształ: wielokąt o kilku ścianach (obieg jak łuk — suma bez dziur)
            for (int k = 0; k < n; k++)
            {
                int i = kafle[k], nw = 6 + (int)Math.Floor(los(i, 3, 58) * 3);
                var a0 = los(i, 3, 59) * Math.PI;
                var r = 0.2 + los(i, 3, 57) * 0.06;
                foreach (var (P, d) in new[] { (kwarc, 0.0), (kwarcObrys, oK) })
                {
                    for (int j = 0; j < nw; j++)
                    {
                        double a = a0 + ((double)j / nw) * Math.PI * 2, rr = r * (0.8 + los(i, j, 60) * 0.35) + d;
                        double x = wezX[k] + JsM.Cos(a) * rr * 1.25, y = wezY[k] + JsM.Sin(a) * rr * 0.85;
                        if (j == 0) P.moveTo(x, y); else P.lineTo(x, y);
                    }
                    P.closePath();
                }
            }
            // brzeg kwarcu: sam pierścień tuszu; kwarc ledwie widać: jaśniejsza szczelina, nie biała otoczka wokół złota
            g.fillStyle = rgb(B.tusz, 0.22);
            g.fill(kwarcObrys);
            g.save();
            g.globalCompositeOperation = "destination-out";
            g.fill(kwarc);
            g.restore();
            g.fillStyle = rgb(B.kwarc, 0.26);
            g.fill(kwarc);
            if (!maly)
            {
                g.fillStyle = kreskaKwarcu(g, skala);
                g.fill(kwarc);
            }

            // żyła: kontur tuszem (suma poszerzonych wstęg), ciało, sierp cienia i sierp blasku
            Path2D zyla = new Path2D(), obrys = new Path2D();
            var oT = Math.Max(1.1 * px, 0.02);
            foreach (var zl in zylki)
            {
                wstega(zyla, zl.xs, zl.ys, zl.hs, 0, true, zl.pien);
                wstega(obrys, zl.xs, zl.ys, zl.hs, oT, true, zl.pien);
            }
            g.fillStyle = rgb(B.tusz, 0.8);
            g.fill(obrys);
            g.fillStyle = rgb(B.zloto);
            g.fill(zyla);
            // złoto w szczelinie jest płaskie: tylko wąski cień przy dolnym brzegu, a blask w urywkach wzdłuż żyły
            var dS = Math.Max(0.8 * px, 0.02);
            sierpSumy(g, zyla, SWx * dS, SWy * dS, rgb(B.zlotoCien));
            g.strokeStyle = rgb(B.zlotoSwiatlo, 0.92);
            for (int k = 0; k < zylki.Count; k++)
            {
                var zl = zylki[k]; int ile = zl.xs.Count;
                if (ile < 4) continue;
                int j0 = 1 + (int)Math.Floor(los(k, ile, 94) * (ile - 4)), j1 = j0 + 2 + (int)Math.Floor(los(k, ile, 95) * 2);
                double hsr = 0;
                for (int j = j0; j <= j1 && j < ile; j++) hsr += zl.hs[j];
                hsr /= j1 - j0 + 1;
                if (hsr < 1.1 * px) continue;
                g.lineWidth = Math.Max(0.8 * px, hsr * 0.5);
                g.beginPath();
                for (int j = j0; j <= j1 && j < ile; j++)
                {
                    double x = zl.xs[j] + SWx * hsr * 0.4, y = zl.ys[j] + SWy * hsr * 0.4;
                    if (j == j0) g.moveTo(x, y); else g.lineTo(x, y);
                }
                g.stroke();
            }

            // samorodki: od mniejszych, duże na wierzchu
            Js.Js.Sort(samorodki, (a, b) => a.r - b.r);
            foreach (var sm in samorodki)
            {
                if (pustoW(sm.x, sm.y)) continue;
                // z daleka samorodki grubsze — to po nich gracz poznaje złoto
                var r = Math.Max(sm.r * (duzy ? 1 : 1.25), maly ? 2.6 * px : 1.8 * px);
                rysujSamorodek(g, sm.x, sm.y, r, sm.s, px, duzy);
                if (r >= ZYLY.blyskOdWielkosci)
                {
                    blyski.Add(sm.x + SWx * r * 0.4); blyski.Add(sm.y + SWy * r * 0.35);
                    blyski.Add(los(sm.s, 1, 1)); blyski.Add(ZYLY.blyskOd + los(sm.s, 2, 2) * (ZYLY.blyskDo - ZYLY.blyskOd));
                }
            }
            // okruchy złota w kwarcu
            if (!maly)
            {
                for (int k = 0; k < n; k++)
                {
                    var i = kafle[k];
                    var ile = 4 + (int)Math.Floor(los(i, 9, 90) * 4);
                    for (int j = 0; j < ile; j++)
                    {
                        double x = wezX[k] + (los(i, j, 91) - 0.5) * 0.9, y = wezY[k] + (los(i, j, 92) - 0.5) * 0.5;
                        if (pustoW(x, y)) continue;
                        var r = Math.Max(1 * px, 0.014 + los(i, j, 93) * 0.014);
                        g.fillStyle = rgb(B.tusz, 0.8);
                        g.beginPath(); g.arc(x, y, r + 0.7 * px, 0, Math.PI * 2); g.fill();
                        g.fillStyle = rgb(B.zlotoJasne);
                        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
                    }
                }
            }
        }

        /// <summary>Samorodek: obły, guzowaty; sierp cienia, jasny bok, blask i kontur tuszem jak u postaci.</summary>
        static void rysujSamorodek(IPlotno g, double x, double y, double r, double s, double px, bool duzy)
        {
            // guzowaty, spłaszczony, z kilkoma ostrymi rogami — bryłka rodzimego złota, nie kropla
            var n = 7 + (int)Math.Floor(los(s, 4, 3) * 4);
            var pxs = new double[n]; var pys = new double[n];
            var a0 = los(s, 4, 4) * Math.PI * 2;
            double wyd = 1.15 + los(s, 4, 5) * 0.3, obr = (los(s, 4, 6) - 0.5) * 0.7;
            double co = JsM.Cos(obr), si = JsM.Sin(obr);
            for (int j = 0; j < n; j++)
            {
                var a = a0 + ((double)j / n) * Math.PI * 2 + (los(s, j, 8) - 0.5) * (Math.PI / n);
                var rr = r * (0.66 + los(s, j, 5) * 0.56);
                double ex = JsM.Cos(a) * rr * wyd, ey = JsM.Sin(a) * rr * 0.86 / wyd;
                pxs[j] = x + ex * co - ey * si; pys[j] = y + ex * si + ey * co;
            }
            var p = new Path2D();
            p.moveTo((pxs[n - 1] + pxs[0]) / 2, (pys[n - 1] + pys[0]) / 2);
            for (int j = 0; j < n; j++)
            {
                var j2 = (j + 1) % n;
                if (los(s, j, 9) < 0.3) { p.lineTo(pxs[j], pys[j]); p.lineTo((pxs[j] + pxs[j2]) / 2, (pys[j] + pys[j2]) / 2); }
                else p.quadraticCurveTo(pxs[j], pys[j], (pxs[j] + pxs[j2]) / 2, (pys[j] + pys[j2]) / 2);
            }
            p.closePath();
            // kontur pod spodem: połowa kreski wychodzi na zewnątrz
            g.strokeStyle = rgb(B.tusz, 0.95);
            g.lineWidth = Math.Max(2.2 * px, r * 0.34);
            g.stroke(p);
            g.fillStyle = rgb(B.zloto);
            g.fill(p);
            g.save();
            g.clip(p);
            sierp(g, p, x, y, SWx * r * 0.42, SWy * r * 0.42, rgb(B.zlotoCien));
            sierp(g, p, x, y, -SWx * r * 0.34, -SWy * r * 0.34, rgb(B.zlotoJasne));
            // dołki w złocie (z bliska): kute, nie lane
            if (duzy && r > 0.08)
            {
                g.fillStyle = rgb(B.zlotoCien, 0.8);
                for (int j = 0; j < 2; j++)
                {
                    double dx = (los(s, j, 6) - 0.5) * r, dy = (los(s, j, 7) - 0.5) * r * 0.6;
                    g.beginPath(); g.ellipse(x + dx, y + dy, r * 0.13, r * 0.08, 0.4, 0, Math.PI * 2); g.fill();
                }
            }
            // blask: plamka przy jasnym brzegu
            g.fillStyle = rgb(B.zlotoSwiatlo, 0.95);
            g.beginPath();
            g.ellipse(x + SWx * r * 0.42, y + SWy * r * 0.36, Math.Max(0.9 * px, r * 0.24), Math.Max(0.7 * px, r * 0.14), -0.5, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
    }
}
