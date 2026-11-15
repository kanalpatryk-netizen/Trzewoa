// Port: alpha-1/src/render/konwoj.ts — KONWÓJ Z JEDZENIEM (Alpha 0.2): skąd się bierze wiadro. Nad szybem wiadra stoi
// drewniany kozioł z bloczkiem, przez który biegnie lina. Przed każdą dostawą z prawej, zza brzegu góry, przyjeżdża wóz
// z parą koni: kłusem po grzbiecie, z latarnią na tyczce, woźnica w kapeluszu na koźle, z tyłu na ładunku pomocnik
// w kapturze. Przy koźle wóz zawraca, pomocnik zeskakuje i spuszcza wiadro na linie, ręka za ręką, póki wiadro zjeżdża —
// a gdy wiadro jeszcze stoi na dnie, zsyła do niego po linie worek. Potem wskakuje na wóz i konwój odjeżdża. Gdy konwoju
// nie ma, wolny koniec liny jest uwiązany do nogi kozła. Wszystko liczy się z tiku gry i z tego, kiedy wypada następna
// dostawa (sim.lud.wiadra.nastepne). Tylko rysunek. Kamień, drewno i konie — przed mrokiem; płomień latarni — nad mrokiem.
using System;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyWiadro;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static partial class Konwoj
    {
        const string TUSZ = "rgba(20,12,8,0.95)";
        /// <summary>Długość konwoju (kafle): od tyłu wozu do pysków koni.</summary>
        const double DL = 7.6;
        static Nastawy.Typ_KONWOJ KW => KONWOJ;
        /// <summary>Postój (tiki): zapowiedź i najdłuższy zjazd wiadra, z zapasem — tyle pomocnik spuszcza linę.</summary>
        static double postoj() => WIADRO.zapowiedz + WIADRO.zjazdMaks + 100;
        /// <summary>Przyjazd i odjazd trwają po tyle (tiki) — razem z postojem i zawracaniem mieszczą się między dostawami.</summary>
        static double jazda() => Math.Max(240, Math.Floor((WIADRO.co - postoj() - KW.zawracanie) / 2) - 10);

        /// <summary>Tani skrót liczby — stałe kształty (rysunek nie sięga po los gry).</summary>
        static double los(double n0)
        {
            int n = Js.Js.ToInt32(n0);
            int h = unchecked((n ^ (int)0x9e3779b9) * (int)0x85ebca6b);
            h = unchecked((h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35);
            return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
        }
        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }

        /// <summary>Kolumna liny wiadra (środek szybu) i bloczek na kozle — kafle; null, gdy góra nie ma szybu wiadra.</summary>
        public static (double x, double y)? bloczekWiadra(World w)
        {
            if (!KW.wlaczony || !SWIAT.warstwy.wlaczone || w.salaOltarza.x1 < 0) return null;
            return (w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer / 2, World.SURFACE_Y - KW.koziol.wys);
        }

        /// <summary>Równy plac przy koźle, na którym staje wóz (x kafli) — tu grzbiet schodzi do powierzchni.</summary>
        public static (double x0, double x1)? placKonwoju(World w)
        {
            var b = bloczekWiadra(w);
            return b != null ? (b.Value.x - KW.koziol.rozstaw - 0.5, b.Value.x + KW.postoj + DL + 1) : ((double, double)?)null;
        }

        /// <summary>Gdzie jest konwój: środek (x kafli), zwrot (−1 w lewo … 1 w prawo), faza i jej postęp.</summary>
        sealed class Stan { public string faza = ""; public double xc, zwrot, q, t, droga, tempo, postoj; }

        /// <summary>Przebyta część drogi przy przyjeździe: równy kłus, na ostatniej piątej części hamuje.</summary>
        static double hamowanie(double q) => q <= 0.8 ? q / 0.9 : (0.8 + (q - 0.8) - ((q - 0.8) * (q - 0.8)) / 0.4) / 0.9;

        static Stan? stan(Sim sim, double tick)
        {
            var b = bloczekWiadra(sim.world);
            if (b == null) return null;
            var N = sim.lud.wiadra?.nastepne ?? WIADRO.pierwsze;
            double xStoi = b.Value.x + KW.postoj + DL / 2, xStart = KW.start + DL / 2, dlugosc = xStart - xStoi;
            double Z = KW.zawracanie, d = N - tick, JAZDA = jazda(), POSTOJ = postoj();
            if (d <= JAZDA + Z)
            {
                if (d > Z)
                {
                    double q0 = 1 - (d - Z) / JAZDA, f = hamowanie(q0);
                    return new Stan { faza = "przyjazd", xc = xStart - dlugosc * f, zwrot = -1, q = q0, t = 0, droga = dlugosc * f, tempo = q0 < 0.8 ? 1 : (1 - q0) / 0.2, postoj = xStoi };
                }
                var q = 1 - Math.Max(0, d) / Z;
                return new Stan { faza = "zawraca", xc = xStoi, zwrot = -JsM.Cos(Math.PI * q), q = q, t = 0, droga = dlugosc + q * 1.4, tempo = 0.45 * JsM.Sin(Math.PI * q), postoj = xStoi };
            }
            var t = tick - (N - WIADRO.co);
            if (t >= 0 && t < POSTOJ) return new Stan { faza = "postoj", xc = xStoi, zwrot = 1, q = t / POSTOJ, t = t, droga = 0, tempo = 0, postoj = xStoi };
            if (t >= POSTOJ && t < POSTOJ + JAZDA)
            {
                double q = (t - POSTOJ) / JAZDA, f = 1 - hamowanie(1 - q);
                return new Stan { faza = "odjazd", xc = xStoi + dlugosc * f, zwrot = 1, q = q, t = t, droga = dlugosc * f, tempo = q > 0.2 ? 1 : q / 0.2, postoj = xStoi };
            }
            return null;
        }

        /// <summary>Latarnia na tyczce wozu (kafle) — mrok wycina wokół niej światło; null, gdy konwoju nie ma.</summary>
        public static (double x, double y)? latarniaKonwoju(Sim sim, Func<double, double> grunt)
        {
            var s = stan(sim, sim.tick);
            if (s == null) return null;
            double kier = s.zwrot >= 0 ? 1 : -1, y0 = grunt(s.xc);
            var U = ukladWozu(xl => grunt(s.xc + kier * xl) - y0);
            var (lx, ly) = U.zWozu(U.latarnia.x, U.latarnia.y);
            return (s.xc + s.zwrot * lx, y0 + ly);
        }

        /// <summary>Pomocnik: 0 — siedzi na wozie, 1 — stoi przy koźle (zeskok i powrót płynnie).</summary>
        static double naZiemi(Stan s)
        {
            if (s.faza != "postoj") return 0;
            return gladko(s.t / KW.zeskok) * (1 - gladko((s.t - (postoj() - KW.zeskok)) / KW.zeskok));
        }

        /// <summary>
        /// Kozioł, lina do pomocnika (albo uwiązana do nogi kozła), worek zsyłany po linie, wóz, konie i ludzie — przed mrokiem.
        /// `grunt` — wysokość ziemi z ryciny (garby grzbietu), żeby koła i kopyta stały na ziemi.
        /// </summary>
        public static void rysujKonwoj(IPlotno ctx, Sim sim, Camera cam, double teraz, Func<double, double> grunt)
        {
            var w = sim.world;
            var bb = bloczekWiadra(w);
            if (bb == null) return;
            var b = bb.Value;
            var z = cam.zoom;
            var s = stan(sim, sim.tick);
            var ruch = Nastroj.wolnoRuszac();
            var ziemia = World.SURFACE_Y;
            // w kadrze: kozioł albo konwój
            bool widacKozla = cam.toScreenX(b.x + 2) > 0 && cam.toScreenX(b.x - 2) < cam.vw && cam.toScreenY(b.y - 1) < cam.vh && cam.toScreenY(ziemia) > 0;
            bool widacWozu = s != null && cam.toScreenX(s.xc + DL / 2 + 1) > 0 && cam.toScreenX(s.xc - DL / 2 - 1) < cam.vw && cam.toScreenY(ziemia - 3.2) < cam.vh && cam.toScreenY(ziemia + 0.5) > 0;
            if (!widacKozla && !widacWozu) return;
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            double X(double x) => cam.toScreenX(x);
            double Y(double y) => cam.toScreenY(y);
            double rk = KW.koziol.rozstaw, bx = b.x + 0.22, by = b.y;          // bloczek: lina do szybu schodzi po jego lewej
            var pomoc = s != null ? naZiemi(s) : 0;
            // gdzie stoi pomocnik i gdzie trzyma linę (kafle)
            var px = s != null ? s.postoj - DL / 2 - 0.5 : 0;
            var jedzie = Wiadro.wiadra(sim).FirstOrDefault(wd => wd.szyb == true && (wd.faza == "zjezdza" || wd.faza == "odjezdza"));
            var ciagnie = pomoc > 0.95 && jedzie != null && ruch;
            var reka = ciagnie ? JsM.Sin(teraz * 0.009) : 0;
            var dlon = (x: px - 0.32, y: ziemia - 1.28 - 0.1 * reka);

            if (widacKozla)
            {
                // lina: od bloczka do dłoni pomocnika (i zwój u jego stóp) albo uwiązana do nogi kozła
                var knaga = (x: b.x + rk * 0.62, y: ziemia - 1.35);
                var gr = Math.Max(1, z * 0.08);
                void lina(double x1, double y1, double x2, double y2, double ugiecie)
                {
                    ctx.strokeStyle = "rgba(20,12,8,0.85)"; ctx.lineWidth = gr + 1.2;
                    ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.quadraticCurveTo(X((x1 + x2) / 2 + ugiecie * 0.3), Y((y1 + y2) / 2 + ugiecie), X(x2), Y(y2)); ctx.stroke();
                    ctx.strokeStyle = "rgba(176,140,92,0.95)"; ctx.lineWidth = gr; ctx.stroke();
                }
                if (pomoc > 0.5 && s != null)
                {
                    lina(bx + 0.2, by, dlon.x, dlon.y, 0.15);
                    lina(dlon.x, dlon.y, px + 0.25, ziemia - 0.12, 0.25);
                    zwoj(ctx, X(px + 0.45), Y(ziemia), z);
                }
                else
                {
                    lina(bx + 0.2, by, knaga.x, knaga.y, 0.1);
                    ctx.strokeStyle = "rgba(150,114,70,1)"; ctx.lineWidth = Math.Max(0.8, z * 0.05);
                    for (int i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X(knaga.x), Y(knaga.y + 0.08 + i * 0.09), z * 0.12, z * 0.05, 0, 0, Math.PI * 2); ctx.stroke(); }
                    lina(knaga.x, knaga.y + 0.3, knaga.x + 0.15, knaga.y + 0.85, 0.1);
                }
                koziol(ctx, X, Y, z, b.x, by, rk, ziemia, bx);
                // worek po linie: gdy wiadro jeszcze stoi na dnie, dostawa zjeżdża do niego na haku
                var wd = Wiadro.wiadra(sim).FirstOrDefault(q => q.szyb == true && q.faza == "stoi");
                if (s != null && s.faza == "postoj" && wd != null && wd.od < sim.tick - s.t)
                {
                    var f = (s.t - KW.worek.od) / KW.worek.trwa;
                    if (f > 0 && f < 1)
                    {
                        var yk = (wd.y + 1) - 1.6 * 0.95;
                        var y = by + 0.4 + (yk - by - 0.6) * gladko(f);
                        worek(ctx, X(b.x), Y(y), z, ruch ? JsM.Sin(teraz * 0.004) * 0.08 : 0);
                    }
                }
            }
            if (s != null && widacWozu) woz(ctx, cam, teraz, s, grunt, pomoc, reka, ruch);
            ctx.restore();
        }

        /// <summary>Kozioł z dwóch bali, z poprzeczką, na szczycie bloczek; na prawej nodze knaga.</summary>
        static void koziol(IPlotno ctx, Func<double, double> X, Func<double, double> Y, double z, double x, double by, double rk, double ziemia, double bx)
        {
            var szczyt = by - 0.18;
            void bal(double x0, double y0, double x1, double y1, double gr)
            {
                double dx = X(x1) - X(x0), dy = Y(y1) - Y(y0), d = Math.Sqrt(dx * dx + dy * dy);
                if (d == 0) d = 1;
                double nx = (-dy / d) * gr * z / 2, ny = (dx / d) * gr * z / 2;
                ctx.beginPath();
                ctx.moveTo(X(x0) + nx, Y(y0) + ny); ctx.lineTo(X(x1) + nx, Y(y1) + ny); ctx.lineTo(X(x1) - nx, Y(y1) - ny); ctx.lineTo(X(x0) - nx, Y(y0) - ny);
                ctx.closePath();
                ctx.fillStyle = "rgba(96,68,42,1)"; ctx.fill();
                ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.7, z * 0.045); ctx.stroke();
                ctx.strokeStyle = "rgba(150,112,72,0.55)"; ctx.lineWidth = Math.Max(0.5, z * 0.025);
                ctx.beginPath(); ctx.moveTo(X(x0) + nx * 0.4, Y(y0) + ny * 0.4); ctx.lineTo(X(x1) + nx * 0.4, Y(y1) + ny * 0.4); ctx.stroke();
            }
            bal(x - rk, ziemia, x + 0.05, szczyt, 0.2);
            bal(x + rk, ziemia, x + 0.15, szczyt, 0.2);
            bal(x - rk * 0.62, ziemia - 1.5, x + rk * 0.62, ziemia - 1.5, 0.14);
            // bloczek: drewniane koło w żelaznej oprawie
            ctx.fillStyle = "rgba(70,52,36,1)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.7, z * 0.045);
            ctx.beginPath(); ctx.rect(X(bx - 0.12), Y(szczyt - 0.06), z * 0.24, z * 0.3); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(X(bx), Y(by), z * 0.22, 0, Math.PI * 2); ctx.fillStyle = "rgba(110,80,50,1)"; ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(X(bx), Y(by), z * 0.07, 0, Math.PI * 2); ctx.fillStyle = "rgba(52,50,52,1)"; ctx.fill();
        }

        /// <summary>Zwój liny na ziemi.</summary>
        static void zwoj(IPlotno ctx, double x, double y, double z)
        {
            ctx.strokeStyle = "rgba(20,12,8,0.85)"; ctx.lineWidth = Math.Max(1.4, z * 0.1);
            for (int pass = 0; pass < 2; pass++)
            {
                if (pass == 1) { ctx.strokeStyle = "rgba(176,140,92,0.95)"; ctx.lineWidth = Math.Max(0.8, z * 0.06); }
                for (int i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * z * 0.04, y - z * 0.05 - i * z * 0.06, z * (0.3 - i * 0.05), z * 0.07, 0.05, 0, Math.PI * 2); ctx.stroke(); }
            }
        }

        /// <summary>Worek na haku, zjeżdżający po linie.</summary>
        static void worek(IPlotno ctx, double x, double y, double z, double kolys)
        {
            ctx.save();
            ctx.translate(x, y); ctx.rotate(kolys); ctx.scale(z * 1.3, z * 1.3);
            ctx.lineWidth = 0.05;
            ctx.strokeStyle = "rgba(58,56,56,1)";
            ctx.beginPath(); ctx.arc(0, -0.12, 0.08, Math.PI, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -0.05); ctx.lineTo(0, 0.08); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-0.08, 0.1); ctx.quadraticCurveTo(-0.36, 0.25, -0.3, 0.62); ctx.quadraticCurveTo(0, 0.74, 0.3, 0.62); ctx.quadraticCurveTo(0.36, 0.25, 0.08, 0.1);
            ctx.closePath();
            var g = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
            g.addColorStop(0, "rgba(92,68,42,1)"); g.addColorStop(0.45, "rgba(132,100,62,1)"); g.addColorStop(1, "rgba(78,56,34,1)");
            ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.045; ctx.stroke();
            ctx.strokeStyle = "rgba(96,74,48,0.8)"; ctx.lineWidth = 0.03;
            ctx.beginPath(); ctx.moveTo(-0.12, 0.3); ctx.quadraticCurveTo(0, 0.36, 0.12, 0.3); ctx.stroke();
            ctx.restore();
        }

        // ---------------------------------------------------------------- wóz, konie, ludzie

        sealed class Masc { public double[] siersc = null!, ciemne = null!, jasne = null!; }
        static readonly Masc KON_BLISKI = new Masc { siersc = new double[] { 116, 76, 46 }, ciemne = new double[] { 46, 30, 20 }, jasne = new double[] { 168, 128, 88 } };
        static readonly Masc KON_DALSZY = new Masc { siersc = new double[] { 86, 60, 42 }, ciemne = new double[] { 36, 24, 18 }, jasne = new double[] { 124, 94, 70 } };
        static Barwa rgb(double[] c, double a = 1) => Barwa.Rgba(c[0], c[1], c[2], a);

        /// <summary>Układ wozu w układzie konwoju: koła, skrzynia, przechył na garbach.</summary>
        sealed class Uklad
        {
            public double ogon, kolaT, kolaP, rT, rP, yT, kat, dno, gora, c, sn;
            public (double x, double y) latarnia;
            /// <summary>Punkt skrzyni (układ wozu przed obrotem) w układzie konwoju.</summary>
            public (double x, double y) zWozu(double x, double y) => (kolaT + (x - kolaT) * c - (y - yT) * sn, yT + (x - kolaT) * sn + (y - yT) * c);
        }

        static Uklad ukladWozu(Func<double, double> pod)
        {
            var U = new Uklad();
            U.ogon = -DL / 2;
            U.kolaT = U.ogon + 0.95; U.kolaP = U.ogon + 3.15; U.rT = 0.62; U.rP = 0.5;
            U.yT = pod(U.kolaT) - U.rT;
            U.kat = JsM.Atan2(pod(U.kolaP) - pod(U.kolaT), U.kolaP - U.kolaT);
            U.dno = U.yT - 0.18; U.gora = U.dno - 0.64;
            U.c = JsM.Cos(U.kat); U.sn = JsM.Sin(U.kat);
            U.latarnia = (U.ogon + 4.1, U.gora - 1.04);
            return U;
        }

        /// <summary>
        /// Wóz z parą koni w układzie konwoju: (0, 0) — środek konwoju na ziemi, oś x ku koniom, y w dół, kafle; zwrot odbija
        /// rysunek w poziomie (w zawracaniu ściska go przez zero — wóz obraca się w głąb).
        /// </summary>
        static void woz(IPlotno ctx, Camera cam, double teraz, Stan s, Func<double, double> grunt, double pomoc, double reka, bool ruch)
        {
            var z = cam.zoom;
            double kier = s.zwrot >= 0 ? 1 : -1;
            var y0 = grunt(s.xc);
            double pod(double xl) => grunt(s.xc + kier * xl) - y0;
            var glebia = s.faza == "zawraca" ? JsM.Sin(Math.PI * s.q) : 0;
            ctx.save();
            ctx.translate(cam.toScreenX(s.xc), cam.toScreenY(y0) - glebia * z * 0.25);
            // w połowie zawracania wóz widać od czoła — wąski, ale nie kreską
            ctx.scale(z * kier * Math.Max(0.14, Math.Abs(s.zwrot)), z * (1 - 0.06 * glebia));
            var lw = 1 / z;
            var U = ukladWozu(pod);
            double ogon = U.ogon, kolaT = U.kolaT, kolaP = U.kolaP, rT = U.rT, rP = U.rP, yT = U.yT, kat = U.kat, dno = U.dno, gora = U.gora;
            // cień pod konwojem
            ctx.fillStyle = "rgba(10,6,4,0.35)";
            ctx.beginPath(); ctx.ellipse(-0.3, pod(-0.3) + 0.02, DL * 0.52, 0.12, 0, 0, Math.PI * 2); ctx.fill();

            // nogi i koła idą z przebytą drogą — także przy ograniczonym ruchu
            var krok = s.droga;
            var tempo = s.tempo;
            const double kon = 2.15, konD = 2.45;           // środki koni (bliski i dalszy)
            var faza = (krok / 2.3) * Math.PI * 2;
            var stoja = s.faza == "postoj" && ruch;

            // dalszy koń, za nim dyszel; potem wóz i bliższy koń
            ctx.save();
            ctx.translate(konD, pod(konD) - 0.13);
            kon_(ctx, faza + 0.6, tempo, teraz, lw, KON_DALSZY, dx => pod(konD + dx) - pod(konD), stoja, 1);
            ctx.restore();
            var osP = U.zWozu(kolaP, yT + rT - rP);
            ctx.strokeStyle = "rgba(60,42,26,1)"; ctx.lineWidth = 0.1;
            ctx.beginPath(); ctx.moveTo(osP.x, osP.y); ctx.lineTo(kon + 0.62, pod(kon) - 1.18); ctx.stroke();
            ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.03; ctx.stroke();

            ctx.save();
            ctx.translate(kolaT, yT); ctx.rotate(kat); ctx.translate(-kolaT, -yT);
            // podwozie
            ctx.strokeStyle = "rgba(56,38,24,1)"; ctx.lineWidth = 0.09;
            ctx.beginPath(); ctx.moveTo(kolaT, yT + 0.04); ctx.lineTo(kolaP, yT + rT - rP + 0.02); ctx.stroke();
            // ładunek: worki i beczka nad burtą
            for (int i = 0; i < 4; i++)
            {
                double wx = ogon + 1.0 + i * 0.62, ww = 0.36 + 0.05 * los(i);
                ctx.beginPath();
                ctx.moveTo(wx - ww, gora + 0.05);
                ctx.quadraticCurveTo(wx - ww * 1.05, gora - 0.42 - 0.06 * los(i * 3), wx, gora - 0.48 - 0.06 * los(i * 5));
                ctx.quadraticCurveTo(wx + ww * 1.05, gora - 0.42, wx + ww, gora + 0.05);
                ctx.closePath();
                ctx.fillStyle = i % 2 != 0 ? "rgba(146,118,82,1)" : "rgba(160,132,92,1)"; ctx.fill();
                ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04; ctx.stroke();
                ctx.strokeStyle = "rgba(96,74,48,0.7)"; ctx.lineWidth = 0.025;
                ctx.beginPath(); ctx.moveTo(wx - ww * 0.5, gora - 0.2); ctx.quadraticCurveTo(wx, gora - 0.12, wx + ww * 0.5, gora - 0.22); ctx.stroke();
            }
            var bk = ogon + 3.38;
            ctx.beginPath(); ctx.moveTo(bk - 0.28, gora); ctx.quadraticCurveTo(bk - 0.34, gora - 0.34, bk - 0.28, gora - 0.66); ctx.lineTo(bk + 0.28, gora - 0.66); ctx.quadraticCurveTo(bk + 0.34, gora - 0.34, bk + 0.28, gora); ctx.closePath();
            ctx.fillStyle = "rgba(112,76,44,1)"; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04; ctx.stroke();
            ctx.strokeStyle = "rgba(56,54,56,1)"; ctx.lineWidth = 0.06;
            foreach (var f in new[] { 0.2, 0.55 }) { ctx.beginPath(); ctx.moveTo(bk - 0.32, gora - 0.66 * f - 0.04); ctx.lineTo(bk + 0.32, gora - 0.66 * f - 0.04); ctx.stroke(); }
            // skrzynia: deski, kłonice
            ctx.beginPath(); ctx.rect(ogon + 0.05, gora, 3.9, dno - gora);
            var gd = ctx.createLinearGradient(0, gora, 0, dno);
            gd.addColorStop(0, "rgba(128,90,54,1)"); gd.addColorStop(1, "rgba(84,58,34,1)");
            ctx.fillStyle = gd; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.05; ctx.stroke();
            ctx.strokeStyle = "rgba(44,28,16,0.75)"; ctx.lineWidth = 0.03;
            ctx.beginPath(); foreach (var f in new[] { 0.34, 0.67 }) { ctx.moveTo(ogon + 0.05, gora + (dno - gora) * f); ctx.lineTo(ogon + 3.95, gora + (dno - gora) * f); } ctx.stroke();
            ctx.fillStyle = "rgba(70,46,26,1)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.035;
            foreach (var f in new[] { 0.05, 1.35, 2.65, 3.85 }) { ctx.beginPath(); ctx.rect(ogon + f, gora - 0.14, 0.1, dno - gora + 0.14); ctx.fill(); ctx.stroke(); }
            // kozioł woźnicy i latarnia na tyczce
            ctx.fillStyle = "rgba(96,66,40,1)";
            ctx.beginPath(); ctx.rect(ogon + 3.35, gora - 0.38, 0.62, 0.1); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "rgba(54,40,30,1)"; ctx.lineWidth = 0.06;
            ctx.beginPath(); ctx.moveTo(ogon + 3.95, gora); ctx.lineTo(ogon + 3.95, gora - 1.32); ctx.lineTo(ogon + 4.1, gora - 1.32); ctx.lineTo(ogon + 4.1, gora - 1.22); ctx.stroke();
            var (lx, ly) = U.latarnia;
            ctx.fillStyle = "rgba(44,40,38,1)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.035;
            ctx.beginPath(); ctx.moveTo(lx - 0.1, ly + 0.14); ctx.lineTo(lx + 0.1, ly + 0.14); ctx.lineTo(lx + 0.07, ly - 0.16); ctx.lineTo(lx - 0.07, ly - 0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(230,180,100,1)"; ctx.beginPath(); ctx.rect(lx - 0.05, ly - 0.1, 0.1, 0.19); ctx.fill();
            // woźnica w kapeluszu na koźle, z lejcami
            czlowiek(ctx, ogon + 3.62, gora - 0.38, "siedzi", 1, teraz, tempo, "kapelusz", 0);
            // koła: szprychy obracają się z drogą
            kolo(ctx, kolaT, yT, rT, krok / rT);
            kolo(ctx, kolaP, yT + rT - rP, rP, krok / rP);
            ctx.restore();

            // bliższy koń, postronek do skrzyni i lejce do rąk woźnicy
            ctx.save();
            ctx.translate(kon, pod(kon));
            kon_(ctx, faza, tempo, teraz, lw, KON_BLISKI, dx => pod(kon + dx) - pod(kon), stoja, 0);
            ctx.restore();
            var przodSkrzyni = U.zWozu(ogon + 3.95, dno - 0.16);
            ctx.strokeStyle = "rgba(40,26,16,1)"; ctx.lineWidth = 0.05;
            ctx.beginPath(); ctx.moveTo(kon + 0.74, pod(kon) - 1.26); ctx.lineTo(przodSkrzyni.x, przodSkrzyni.y); ctx.stroke();
            var rece = U.zWozu(ogon + 3.62 + 0.34, gora - 0.38 - 0.32);
            ctx.strokeStyle = "rgba(30,20,14,0.9)"; ctx.lineWidth = 0.025;
            ctx.beginPath(); ctx.moveTo(kon + 1.47, pod(kon) - 1.74);
            ctx.quadraticCurveTo((kon + 1.47 + rece.x) / 2, Math.Max(pod(kon) - 1.5, rece.y + 0.25), rece.x, rece.y); ctx.stroke();
            // pomocnik: na tyle wozu albo na ziemi przy koźle (twarzą do kozła), ręka za ręką spuszcza linę
            var naWozie = U.zWozu(ogon + 0.3, gora);
            var naZiemiP = (x: ogon - 0.5, y: pod(ogon - 0.5));
            if (pomoc <= 0) czlowiek(ctx, naWozie.x, naWozie.y, "siedzi", -1, teraz, tempo, "kaptur", 0);
            else if (pomoc >= 1) czlowiek(ctx, naZiemiP.x, naZiemiP.y, "stoi", -1, teraz, 0, "kaptur", reka);
            else
            {
                var x = naWozie.x + (naZiemiP.x - naWozie.x) * pomoc;
                var y = naWozie.y + (naZiemiP.y - naWozie.y) * pomoc - JsM.Sin(pomoc * Math.PI) * 0.35;
                czlowiek(ctx, x, y, pomoc < 0.5 ? "siedzi" : "stoi", -1, teraz, 0, "kaptur", 0);
            }
            ctx.restore();
        }

        /// <summary>Koło wozu: obręcz, szprychy (obrót `obr`), piasta.</summary>
        static void kolo(IPlotno ctx, double x, double y, double r, double obr)
        {
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = "rgba(52,36,22,1)"; ctx.lineWidth = 0.06;
            ctx.beginPath();
            for (int i = 0; i < 8; i++) { var a = obr + (i / 8.0) * Math.PI * 2; ctx.moveTo(JsM.Cos(a) * r * 0.18, JsM.Sin(a) * r * 0.18); ctx.lineTo(JsM.Cos(a) * r * 0.86, JsM.Sin(a) * r * 0.86); }
            ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.strokeStyle = "rgba(88,60,36,1)"; ctx.lineWidth = r * 0.16; ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(40,38,40,1)"; ctx.lineWidth = 0.05; ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.025; ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fillStyle = "rgba(60,44,30,1)"; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.03; ctx.stroke();
            ctx.restore();
        }

        /// <summary>
        /// Noga konia: od stawu `b` (w tułowiu) do kopyta `f`, staw pośrodku (przednia zgina kolano do przodu, tylna skokowy do
        /// tyłu). Zwęża się od mięśnia przy tułowiu do cienkiej nadpęcia; u dołu pęcina i kopyto.
        /// </summary>
        static void noga(IPlotno ctx, double bx, double by, double fx, double fy, double l1, double l2, bool przod, Barwa siersc, Barwa ciemne, double grub)
        {
            double dx = fx - bx, dy = fy - by, d = Math.Sqrt(dx * dx + dy * dy);
            var max = (l1 + l2) * 0.999;
            if (d > max) { fx = bx + (dx / d) * max; fy = by + (dy / d) * max; dx = fx - bx; dy = fy - by; d = max; }
            double a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.Sqrt(Math.Max(0, l1 * l1 - a * a));
            double mx = bx + (dx * a) / d, my = by + (dy * a) / d;
            double s = przod ? 1 : -1;
            double kx = mx + (-dy / d) * h * s, ky = my + (dx / d) * h * s;
            // obrys nogi: z boku odcinków udo–staw i staw–pęcina, szerokość maleje w dół
            (double, double)[] pas(double x0, double y0, double x1, double y1, double w0, double w1)
            {
                double ex = x1 - x0, ey = y1 - y0, el = Math.Sqrt(ex * ex + ey * ey);
                if (el == 0) el = 1;
                double nx = -ey / el, ny = ex / el;
                return new[] { (x0 + nx * w0, y0 + ny * w0), (x1 + nx * w1, y1 + ny * w1), (x1 - nx * w1, y1 - ny * w1), (x0 - nx * w0, y0 - ny * w0) };
            }
            var p1 = pas(bx, by, kx, ky, grub * 0.17, grub * 0.075); var p2 = pas(kx, ky, fx, fy - 0.12, grub * 0.065, grub * 0.05);
            // udo w barwie sierści, nadpęcie ciemne (jak u gniadosza)
            ctx.beginPath();
            ctx.moveTo(p1[0].Item1, p1[0].Item2); ctx.lineTo(p1[1].Item1, p1[1].Item2); ctx.lineTo(p2[1].Item1, p2[1].Item2); ctx.lineTo(p2[2].Item1, p2[2].Item2);
            ctx.lineTo(p1[2].Item1, p1[2].Item2); ctx.lineTo(p1[3].Item1, p1[3].Item2); ctx.closePath();
            ctx.fillStyle = siersc; ctx.fill();
            ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.03; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p2[0].Item1, p2[0].Item2); ctx.lineTo(p2[1].Item1, p2[1].Item2); ctx.lineTo(p2[2].Item1, p2[2].Item2); ctx.lineTo(p2[3].Item1, p2[3].Item2); ctx.closePath();
            ctx.fillStyle = ciemne; ctx.fill();
            // staw (kolano, skokowy) i pęcina
            ctx.fillStyle = ciemne;
            ctx.beginPath(); ctx.arc(kx, ky, grub * 0.07, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(fx, fy - 0.15, 0.06, 0.05, 0, 0, Math.PI * 2); ctx.fill();
            // kopyto
            ctx.fillStyle = "rgba(28,22,20,1)";
            ctx.beginPath(); ctx.moveTo(fx - 0.075, fy); ctx.lineTo(fx + 0.1, fy); ctx.lineTo(fx + 0.06, fy - 0.12); ctx.lineTo(fx - 0.06, fy - 0.12); ctx.closePath(); ctx.fill();
        }

        /// <summary>
        /// Koń z boku (pysk w prawo), (0, 0) — ziemia pod środkiem tułowia, kafle. Kłus: nogi po przekątnej w parze, tułów
        /// podskakuje, głowa kiwa; na postoju kopyta stoją, ogon się kołysze, czasem kiwnie łbem.
        /// </summary>
        static void kon_(IPlotno ctx, double faza, double tempo, double teraz, double lw, Masc B, Func<double, double> podKopytem, bool zyje, int nr)
        {
            var bob = -0.05 * tempo * (0.5 + 0.5 * JsM.Cos(faza * 2));
            var kiw = tempo * 0.05 * JsM.Sin(faza * 2) + (zyje ? 0.06 * Math.Pow(Math.Max(0, JsM.Sin(teraz * 0.0013 + nr * 2)), 6) : 0);
            Barwa siersc = rgb(B.siersc), ciemne = rgb(B.ciemne), jasne = rgb(B.jasne);
            double A = 0.36 * tempo, unies = 0.3 * tempo;
            void nogi(bool dalsze)
            {
                var sz = dalsze ? 0.78 : 1;
                var kol = rgb(B.siersc.Select(c => c * sz).ToArray()); var ciem = rgb(B.ciemne.Select(c => c * sz).ToArray());
                foreach (var (px, py, l1, l2, przod, ph) in new[] {
                    (0.66, -1.12, 0.6, 0.56, true, dalsze ? Math.PI : 0),
                    (-0.72, -1.18, 0.62, 0.6, false, dalsze ? 0 : Math.PI) })
                {
                    double q = faza + ph, bxN = px + (dalsze ? -0.12 : 0);
                    double fx = bxN + A * JsM.Sin(q), lift = unies * Math.Max(0, JsM.Cos(q));
                    noga(ctx, bxN, py + bob, fx, podKopytem(fx) - lift, l1, l2, przod, kol, ciem, przod ? 1 : 1.15);
                }
            }
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            nogi(true);
            // ogon: gęsty, spływa z zadu
            var machaj = zyje ? JsM.Sin(teraz * 0.0021 + nr) * 0.12 : tempo * 0.18 * JsM.Sin(faza);
            ctx.fillStyle = ciemne;
            ctx.beginPath();
            ctx.moveTo(-1.08, -1.5 + bob);
            ctx.quadraticCurveTo(-1.42 - tempo * 0.25, -1.3 + bob, -1.36 + machaj, -0.62);
            ctx.quadraticCurveTo(-1.22 + machaj, -0.6, -1.18 + machaj * 0.6, -0.72);
            ctx.quadraticCurveTo(-1.22 - tempo * 0.1, -1.18 + bob, -1.04, -1.36 + bob);
            ctx.closePath(); ctx.fill();
            ctx.save();
            ctx.translate(0, bob);
            // tułów z zadem i łopatką
            ctx.beginPath();
            ctx.moveTo(-1.1, -1.42);
            ctx.bezierCurveTo(-0.95, -1.68, -0.4, -1.64, 0.05, -1.56);
            ctx.bezierCurveTo(0.32, -1.53, 0.5, -1.64, 0.64, -1.68);
            ctx.lineTo(1.02, -1.34);
            ctx.bezierCurveTo(1.1, -1.17, 1.05, -1.0, 0.9, -0.92);
            ctx.bezierCurveTo(0.5, -0.84, -0.3, -0.82, -0.62, -0.92);
            ctx.bezierCurveTo(-0.88, -0.96, -1.2, -1.1, -1.18, -1.3);
            ctx.bezierCurveTo(-1.17, -1.36, -1.14, -1.4, -1.1, -1.42);
            ctx.closePath();
            var gt = ctx.createLinearGradient(0, -1.68, 0, -0.82);
            gt.addColorStop(0, jasne); gt.addColorStop(0.4, siersc); gt.addColorStop(1, ciemne);
            ctx.fillStyle = gt; ctx.fill();
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.035, lw * 0.9); ctx.stroke();
            // mięśnie: łuk zadu i linia łopatki
            ctx.strokeStyle = "rgba(30,18,10,0.45)"; ctx.lineWidth = 0.03;
            ctx.beginPath(); ctx.moveTo(-0.5, -1.55); ctx.quadraticCurveTo(-0.45, -1.15, -0.78, -1.0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0.5, -1.6); ctx.quadraticCurveTo(0.62, -1.3, 0.8, -1.02); ctx.stroke();
            // szyja i łeb (kiwają się razem)
            ctx.translate(0.55, -1.55); ctx.rotate(kiw); ctx.translate(-0.55, 1.55);
            ctx.beginPath();
            ctx.moveTo(0.36, -1.62);
            ctx.bezierCurveTo(0.6, -1.98, 0.9, -2.18, 1.1, -2.28);
            ctx.lineTo(1.28, -2.1);
            ctx.bezierCurveTo(1.16, -1.84, 1.1, -1.56, 1.02, -1.3);
            ctx.closePath();
            ctx.fillStyle = siersc; ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(1.06, -2.3);
            ctx.bezierCurveTo(1.3, -2.36, 1.56, -2.08, 1.74, -1.84);
            ctx.bezierCurveTo(1.8, -1.75, 1.71, -1.64, 1.58, -1.66);
            ctx.bezierCurveTo(1.44, -1.7, 1.31, -1.86, 1.2, -1.96);
            ctx.bezierCurveTo(1.13, -2.04, 1.08, -2.18, 1.06, -2.3);
            ctx.closePath();
            ctx.fillStyle = siersc; ctx.fill(); ctx.stroke();
            // chrapy jaśniejsze, ucho, oko, grzywa, uździenica
            ctx.fillStyle = rgb(B.ciemne, 0.6);
            ctx.beginPath(); ctx.ellipse(1.66, -1.74, 0.08, 0.06, 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(1.06, -2.3); ctx.lineTo(1.02, -2.5); ctx.lineTo(1.16, -2.32); ctx.closePath(); ctx.fillStyle = ciemne; ctx.fill();
            ctx.fillStyle = "rgba(12,8,6,1)"; ctx.beginPath(); ctx.arc(1.32, -2.1, 0.035, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = ciemne;
            ctx.beginPath();
            ctx.moveTo(0.3, -1.64); ctx.bezierCurveTo(0.55, -2.02, 0.84, -2.22, 1.08, -2.32);
            ctx.lineTo(1.0, -2.2); ctx.bezierCurveTo(0.78, -2.06, 0.58, -1.86, 0.42, -1.6); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(30,20,14,0.95)"; ctx.lineWidth = 0.03;
            ctx.beginPath(); ctx.moveTo(1.14, -2.22); ctx.lineTo(1.5, -1.74); ctx.moveTo(1.38, -2.04); ctx.lineTo(1.62, -1.78); ctx.stroke();
            // chomąto na szyi
            ctx.strokeStyle = "rgba(66,40,22,1)"; ctx.lineWidth = 0.14;
            ctx.beginPath(); ctx.ellipse(0.78, -1.46, 0.11, 0.32, -0.35, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = "rgba(150,120,70,0.8)"; ctx.lineWidth = 0.03;
            ctx.beginPath(); ctx.ellipse(0.78, -1.46, 0.11, 0.32, -0.35, -1.2, 0.6); ctx.stroke();
            ctx.restore();
            // bliższe nogi przed tułowiem
            nogi(false);
        }

        /// <summary>
        /// Człowiek konwoju w płaszczu: woźnica w kapeluszu albo pomocnik w kapturze; (0, 0) — stopy (siedzący — siedzisko),
        /// kafle, twarzą w stronę `zwrot` (1 — ku koniom). Pomocnik na ziemi trzyma linę w uniesionych dłoniach.
        /// </summary>
        static void czlowiek(IPlotno ctx, double x, double y, string poza, double zwrot, double teraz, double tempo, string glowa, double reka)
        {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(zwrot, 1);
            var plaszcz = glowa == "kapelusz" ? "rgba(74,62,52,1)" : "rgba(92,70,48,1)";
            var ciemny = glowa == "kapelusz" ? "rgba(44,36,32,1)" : "rgba(58,44,30,1)";
            var bob = -0.03 * tempo * Math.Abs(JsM.Sin(teraz * 0.012));
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04;
            if (poza == "siedzi")
            {
                // nogi zwieszone przed siedziskiem
                ctx.strokeStyle = ciemny; ctx.lineWidth = 0.11;
                ctx.beginPath(); ctx.moveTo(0.05, -0.02); ctx.lineTo(0.32, 0.02); ctx.lineTo(0.36, 0.48); ctx.stroke();
                ctx.translate(0, bob);
                ctx.beginPath();
                ctx.moveTo(-0.2, 0); ctx.lineTo(-0.16, -0.62); ctx.quadraticCurveTo(0.02, -0.78, 0.16, -0.62); ctx.lineTo(0.28, 0.02); ctx.closePath();
            }
            else
            {
                ctx.beginPath();
                ctx.moveTo(-0.26, -0.02); ctx.quadraticCurveTo(-0.24, -0.7, -0.16, -1.3); ctx.quadraticCurveTo(0.02, -1.42, 0.17, -1.3); ctx.quadraticCurveTo(0.26, -0.7, 0.3, -0.02); ctx.closePath();
            }
            var top = poza == "siedzi" ? -0.68 : -1.36;
            var gp = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
            gp.addColorStop(0, ciemny); gp.addColorStop(0.6, plaszcz); gp.addColorStop(1, ciemny);
            ctx.fillStyle = gp; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = 0.04; ctx.stroke();
            // sznur w pasie
            ctx.strokeStyle = "rgba(150,120,80,0.9)"; ctx.lineWidth = 0.035;
            var pas = poza == "siedzi" ? -0.16 : -0.78;
            ctx.beginPath(); ctx.moveTo(-0.2, pas); ctx.lineTo(0.22, pas + 0.02); ctx.stroke();
            // ręce: woźnica trzyma lejce przed sobą, pomocnik — linę nad głową, jedna dłoń za drugą
            const string skora = "rgba(176,136,108,1)";
            var dlonie = poza == "siedzi" ? new[] { (0.34, top + 0.36), (0.3, top + 0.4) }
                : new[] { (0.3 + 0.03 * reka, top + 0.08 - 0.12 * reka), (0.22 - 0.03 * reka, top + 0.2 + 0.12 * reka) };
            ctx.strokeStyle = plaszcz; ctx.lineWidth = 0.1;
            foreach (var (hx, hy) in dlonie) { ctx.beginPath(); ctx.moveTo(0.04, top + 0.16); ctx.quadraticCurveTo((hx + 0.04) / 2 + 0.06, (hy + top) / 2 + 0.12, hx, hy); ctx.stroke(); }
            ctx.fillStyle = skora;
            foreach (var (hx, hy) in dlonie) { ctx.beginPath(); ctx.arc(hx, hy, 0.05, 0, Math.PI * 2); ctx.fill(); }
            // głowa: twarz w cieniu, kapelusz z rondem albo kaptur
            double gx = 0.03, gy = top - 0.14;
            ctx.fillStyle = "rgba(150,112,88,1)";
            ctx.beginPath(); ctx.arc(gx + 0.04, gy + 0.02, 0.12, 0, Math.PI * 2); ctx.fill();
            if (glowa == "kapelusz")
            {
                ctx.fillStyle = "rgba(40,32,28,1)";
                ctx.beginPath(); ctx.ellipse(gx + 0.02, gy - 0.08, 0.27, 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(gx - 0.12, gy - 0.09); ctx.quadraticCurveTo(gx - 0.1, gy - 0.3, gx + 0.03, gy - 0.3); ctx.quadraticCurveTo(gx + 0.16, gy - 0.3, gx + 0.16, gy - 0.09); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            else
            {
                ctx.fillStyle = plaszcz;
                ctx.beginPath(); ctx.moveTo(gx - 0.2, gy + 0.18); ctx.quadraticCurveTo(gx - 0.24, gy - 0.22, gx + 0.02, gy - 0.26); ctx.quadraticCurveTo(gx + 0.22, gy - 0.22, gx + 0.2, gy + 0.02);
                ctx.quadraticCurveTo(gx + 0.12, gy - 0.06, gx + 0.08, gy + 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Nad mrokiem: płomień latarni i jej ciepła łuna.</summary>
        public static void rysujKonwojNad(IPlotno ctx, Sim sim, Camera cam, double teraz, Func<double, double> grunt)
        {
            var l = latarniaKonwoju(sim, grunt);
            if (l == null) return;
            double z = cam.zoom, x = cam.toScreenX(l.Value.x), y = cam.toScreenY(l.Value.y);
            if (x < -z * 4 || x > cam.vw + z * 4 || y < -z * 4 || y > cam.vh + z * 4) return;
            var drg = Nastroj.wolnoRuszac() ? Fresk.migotLampy(teraz + 4127) : 0.5;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var R = z * (1.6 + 0.15 * drg);
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 196, 110, 0.36 + 0.08 * drg)); g.addColorStop(1, "rgba(255,160,80,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            ctx.fillStyle = "rgba(255,232,170,0.9)";
            ctx.beginPath(); ctx.ellipse(x, y, z * 0.05, z * 0.08, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
}
