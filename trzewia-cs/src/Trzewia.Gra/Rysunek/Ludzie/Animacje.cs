// Oprawa, etap 7d: ANIMACJE nowej postaci (Postac.cs) — poza i rekwizyty w każdej klatce każdej animacji arkuszy gry.
// Nazwy, liczby klatek i sterowniki zostają jak w starych arkuszach (narzedzia/duszki/lud.ts) — gra wybiera klatki tymi
// samymi regułami (Rysunek/Duszki/DuszkiLudu.cs). Co robi każda animacja — jak w rysunku TS (alpha-1/src/render/lud/
// ruch.ts): grabarz w drodze niesie kilof na ramieniu i latarnię w dalszej dłoni, mnich kostur z krzyżem, rycerz miecz.
// Ruch: chód i bieg ze stopą stojącą na ziemi (odwrotna kinematyka nogi — stopa nie ślizga się), ręce sięgające do celu
// (odwrotna kinematyka ręki — np. obie dłonie na jednym trzonku), pozy kluczowe z łagodnym przejściem między nimi.
// `u` — faza pętli (0…1, klatka w środku przedziału) albo postęp przebiegu (0…1) — tak, jak piekarnia próbkuje arkusz.
using System;
using System.Globalization;

namespace Trzewia.Rysunek.Ludzie
{
    /// <summary>Klatka animacji: poza i to, co postać trzyma.</summary>
    public struct KlatkaPostaci
    {
        public Poza p;
        public Rekwizyty r;
        public KlatkaPostaci(in Poza p, in Rekwizyty r) { this.p = p; this.r = r; }
    }

    public static partial class Animacje
    {
        const double TAU = Math.PI * 2;
        static double Frac(double x) => x - Math.Floor(x);
        internal static double Gl(double t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
        static double Lerp(double a, double b, double t) => a + (b - a) * t;
        static double Norm(double a) { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; }
        static double Clamp01(double t) => t < 0 ? 0 : t > 1 ? 1 : t;

        // ── poza z opisu: "tulow=.1 ramieP=2.4" (na bazie) ─────────────────────────────────────────────────────────
        public static Poza Z(string opis) => Z(opis, Poza.Stoi());

        public static Poza Z(string opis, in Poza baza)
        {
            var p = baza;
            foreach (var cz in opis.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var i = cz.IndexOf('=');
                if (i <= 0) throw new ArgumentException("poza: " + cz);
                var k = cz.Substring(0, i);
                var v = double.Parse(cz.Substring(i + 1), CultureInfo.InvariantCulture);
                switch (k)
                {
                    case "tulow": p.tulow = v; break;
                    case "glowa": p.glowa = v; break;
                    case "ramieL": p.ramieL = v; break;
                    case "lokiecL": p.lokiecL = v; break;
                    case "dlonL": p.dlonL = v; break;
                    case "ramieP": p.ramieP = v; break;
                    case "lokiecP": p.lokiecP = v; break;
                    case "dlonP": p.dlonP = v; break;
                    case "udoL": p.udoL = v; break;
                    case "kolanoL": p.kolanoL = v; break;
                    case "stopaL": p.stopaL = v; break;
                    case "udoP": p.udoP = v; break;
                    case "kolanoP": p.kolanoP = v; break;
                    case "stopaP": p.stopaP = v; break;
                    case "biodroX": p.biodroX = v; break;
                    case "biodroY": p.biodroY = v; break;
                    case "obrot": p.obrot = v; break;
                    case "wzlot": p.wzlot = v; break;
                    case "odwrot": p.odwrot = v; break;
                    case "usta": p.usta = v; break;
                    case "plaszcz": p.plaszcz = v; break;
                    case "brzuch": p.brzuch = v; break;
                    default: throw new ArgumentException("poza: nie znam „" + k + "”");
                }
            }
            return p;
        }

        // ── klucze ───────────────────────────────────────────────────────────────────────────────────────────
        /// <summary>Przejście do następnego klucza: 0 — łagodnie, 1 — przyspiesza (cios), 2 — zwalnia, 3 — równo.</summary>
        static double Krzywa(double t, int rodzaj) => rodzaj switch
        {
            1 => t * t,
            2 => 1 - (1 - t) * (1 - t),
            3 => t,
            _ => t * t * (3 - 2 * t),
        };

        /// <summary>Poza w chwili `t` między kluczami (t rośnie; przed pierwszym — pierwszy, po ostatnim — ostatni).</summary>
        static Poza Klucze(double t, params (double t, Poza p, int k)[] kl)
        {
            if (t <= kl[0].t) return kl[0].p;
            for (int i = 0; i + 1 < kl.Length; i++)
            {
                if (t < kl[i + 1].t)
                {
                    var e = Krzywa((t - kl[i].t) / (kl[i + 1].t - kl[i].t), kl[i + 1].k);
                    return Poza.Miesz(kl[i].p, kl[i + 1].p, e);
                }
            }
            return kl[kl.Length - 1].p;
        }

        /// <summary>Liczba w chwili `t` między kluczami (jak Klucze, łagodnie).</summary>
        static double KluczeL(double t, params (double t, double v)[] kl)
        {
            if (t <= kl[0].t) return kl[0].v;
            for (int i = 0; i + 1 < kl.Length; i++)
                if (t < kl[i + 1].t) return Lerp(kl[i].v, kl[i + 1].v, Gl((t - kl[i].t) / (kl[i + 1].t - kl[i].t)));
            return kl[kl.Length - 1].v;
        }

        // ── odwrotna kinematyka ─────────────────────────────────────────────────────────────────────────────────
        /// <summary>
        /// Dwa odcinki od (0, 0) do (dx, dy) (y w dół): kąty kości (0 — w dół, + — naprzód). `stawNaprzod`: kolano wychodzi
        /// naprzód; łokieć (false) — w tył. Za daleko — wyprostowane w stronę celu.
        /// </summary>
        static (double a1, double a2) IK2(double dx, double dy, double l1, double l2, bool stawNaprzod)
        {
            var d = Math.Sqrt(dx * dx + dy * dy);
            var dm = Math.Max(Math.Abs(l1 - l2) + 1e-4, Math.Min(d, (l1 + l2) * 0.9995));
            var fi = Math.Atan2(dx, dy);
            var c = (l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm);
            var al = Math.Acos(c < -1 ? -1 : c > 1 ? 1 : c);
            var a1 = stawNaprzod ? fi + al : fi - al;
            double tx = Math.Sin(fi) * dm, ty = Math.Cos(fi) * dm, jx = Math.Sin(a1) * l1, jy = Math.Cos(a1) * l1;
            return (a1, Math.Atan2(tx - jx, ty - jy));
        }

        /// <summary>Dłoń w punkcie (dx, dy) względem barku (ułamki wzrostu; x naprzód, y w dół; układ postaci bez obrotu).</summary>
        public static void Siegnij(ref Poza p, bool blizsza, double dx, double dy)
        {
            var (a1, a2) = IK2(dx, dy, Postac.RAMIE, Postac.PRZEDRAMIE, false);
            // ramię w górę: ciągłość kąta (wokół π, nie skok do −π)
            if (a1 < -Math.PI * 0.75) a1 += TAU;
            if (blizsza) { p.ramieP = a1; p.lokiecP = Norm(a2 - a1); } else { p.ramieL = a1; p.lokiecL = Norm(a2 - a1); }
        }

        /// <summary>Bark (bliższy albo dalszy) w układzie bioder bez obrotu.</summary>
        static (double x, double y) Bark(in Poza p, bool blizsza)
        {
            var q = Postac.PunktyWzgledne(p);
            return blizsza ? q.barkP : q.barkL;
        }

        /// <summary>Dłoń w punkcie układu bioder (bez obrotu): (0, 0) — biodro, y w dół.</summary>
        static void SiegnijDo(ref Poza p, bool blizsza, (double x, double y) cel)
        {
            var b = Bark(p, blizsza);
            Siegnij(ref p, blizsza, cel.x - b.x, cel.y - b.y);
        }

        /// <summary>Gdzie jest dłoń (układ bioder bez obrotu).</summary>
        static (double x, double y) Dlon(in Poza p, bool blizsza)
        {
            var q = Postac.PunktyWzgledne(p);
            return blizsza ? q.dlonP : q.dlonL;
        }

        /// <summary>Narzędzie w dłoni pod kątem bezwzględnym (jak kość: 0 — w dół, π/2 — naprzód, π — w górę).</summary>
        static void Trzyma(ref Poza p, bool blizsza, double kat)
        {
            if (blizsza) p.dlonP = Norm(kat - (p.ramieP + p.lokiecP));
            else p.dlonL = Norm(kat - (p.ramieL + p.lokiecL));
        }

        /// <summary>Dalsza dłoń na tym samym trzonku co bliższa: `dalej` ułamków wzrostu wzdłuż trzonka od bliższej dłoni.</summary>
        static void Oburacz(ref Poza p, double kat, double dalej)
        {
            var d = Dlon(p, true);
            SiegnijDo(ref p, false, (d.x + Math.Sin(kat) * dalej, d.y + Math.Cos(kat) * dalej));
            Trzyma(ref p, false, kat);
        }

        /// <summary>Kostka w (x, y) względem środka stóp (y w dół, ziemia 0), stopa pod kątem `k` (0 — płasko, + — palce w dół).</summary>
        static void Stan(ref Poza p, bool blizsza, double x, double y, double k)
        {
            var hy = -(p.biodroY ?? 0.5);
            var hx = p.biodroX + (blizsza ? 0.01 : -0.01);
            var (a1, a2) = IK2(x - hx, y - hy, Postac.UDO, Postac.PODUDZIE, true);
            var stopa = k - 0.35 * a2;
            if (blizsza) { p.udoP = a1; p.kolanoP = Norm(a1 - a2); p.stopaP = stopa; }
            else { p.udoL = a1; p.kolanoL = Norm(a1 - a2); p.stopaL = stopa; }
        }

        // ── chód ─────────────────────────────────────────────────────────────────────────────────────────────
        /// <summary>Parametry kroku: długość cyklu S (wzrost na cykl — tyle przechodzi ciało), udział podparcia, uniesienie stopy…</summary>
        public sealed class Krok
        {
            public double S = 0.8, beta = 0.6, unies = 0.075, biodro = 0.452, kolys = 0.022, fazaKolys;
            public double pochyl = 0.07, wymach = 0.34, lokiec = 0.3, lokiecW = 0.3, glowa, piety = 0.25, odbicie = 0.6;
            public Krok Kopia() => (Krok)MemberwiseClone();
        }

        public static readonly Krok CHOD = new Krok();
        public static readonly Krok BIEG = new Krok
        {
            beta = 0.38, unies = 0.17, biodro = 0.43, kolys = 0.025, fazaKolys = 0.44, pochyl = 0.24, wymach = 0.62, lokiec = 1.45,
            lokiecW = 0.25, piety = 0.1, odbicie = 0.75,
        };

        /// <summary>
        /// Kostka i kąt stopy w fazie `f` kroku tej nogi: podparcie (stopa stoi i jedzie w tył równo z ziemią — pięta,
        /// cała stopa, palce), potem przeniesienie łukiem naprzód. x względem punktu pod biodrem, y w dół (ziemia 0).
        /// </summary>
        static (double x, double y, double k) KostkaWKroku(double f, Krok c)
        {
            f = Frac(f);
            const double a = 0.028, b = Postac.STOPA - 0.028, K = Postac.KOSTKA;
            double xs(double ff) => c.S * c.beta / 2 - c.S * ff;
            (double x, double y, double k) podparcie(double ff)
            {
                const double pieta = 0.08;
                var odbOd = c.beta * 0.66;
                if (ff < pieta)
                {
                    // pięta na ziemi, palce opadają
                    var kk = -c.piety * (1 - Gl(ff / pieta));
                    double hx = -a * Math.Cos(kk) - K * Math.Sin(kk), hy = -a * Math.Sin(kk) + K * Math.Cos(kk);
                    return (xs(ff) - a - hx, -hy, kk);
                }
                if (ff > odbOd)
                {
                    // palce na ziemi, pięta się unosi
                    var kk = c.odbicie * Gl((ff - odbOd) / (c.beta - odbOd));
                    double tx = b * Math.Cos(kk) - K * Math.Sin(kk), ty = b * Math.Sin(kk) + K * Math.Cos(kk);
                    return (xs(ff) + b - tx, -ty, kk);
                }
                return (xs(ff), -K, 0);
            }
            if (f < c.beta) return podparcie(f);
            var s = (f - c.beta) / (1 - c.beta);
            var p0 = podparcie(c.beta - 1e-9); var p1 = podparcie(0);
            var e = Gl(s);
            var x = p0.x + (p1.x - p0.x) * e;
            var y = p0.y + (p1.y - p0.y) * s - c.unies * Math.Sin(Math.PI * Math.Pow(s, 0.8));
            var k = s < 0.35 ? Lerp(p0.k, 0.15, Gl(s / 0.35)) : Lerp(0.15, p1.k, Gl((s - 0.35) / 0.65));
            return (x, y, k);
        }

        /// <summary>Chód (bieg, przysiad) w fazie `u` cyklu: nogi z kinematyki, ręce w przeciwfazie, tułów i biodra kołyszą się.</summary>
        public static Poza Chod(double u, Krok c, in Poza baza, bool rece = true)
        {
            var p = baza;
            p.biodroX = 0;
            p.biodroY = c.biodro - c.kolys * Math.Cos(2 * TAU * (u - c.fazaKolys));
            p.obrot = 0; p.wzlot = 0;
            var (xl, yl, kl) = KostkaWKroku(u, c);
            var (xp, yp, kp) = KostkaWKroku(u + 0.5, c);
            Stan(ref p, false, xl, yl, kl);
            Stan(ref p, true, xp, yp, kp);
            p.tulow = baza.tulow + c.pochyl + 0.012 * Math.Cos(2 * TAU * u);
            p.glowa = baza.glowa - c.pochyl * 0.45 + c.glowa;
            if (rece)
            {
                var w = Math.Cos(TAU * u);
                p.ramieP = baza.ramieP + c.wymach * w; p.ramieL = baza.ramieL - c.wymach * w;
                p.lokiecP = c.lokiec + c.lokiecW * Math.Max(0, w); p.lokiecL = c.lokiec + c.lokiecW * Math.Max(0, -w);
            }
            return p;
        }

        // ── poza wyjściowa roli ─────────────────────────────────────────────────────────────────────────────────
        /// <summary>Stoi: ludzie w trzewiach góry są zgarbieni (TS: nastrój) — grabarz i mnich bardziej, rycerz prosto.</summary>
        public static Poza Baza(Stroj s)
        {
            var p = Poza.Stoi();
            switch (s.rola)
            {
                case "robotnik": p.tulow += 0.07; p.glowa += 0.02; break;
                case "pobozny": p.tulow += 0.04; p.glowa += 0.1; break;
                case "zarlok": p.tulow += 0.12; p.glowa += 0.05; break;
            }
            return p;
        }

        /// <summary>Rekwizyty roli w drodze i w spoczynku: kilof na ramieniu i latarnia (grabarz), kostur (mnich), miecz (rycerz).</summary>
        static Rekwizyty WDrodze(Stroj s) => s.rola switch
        {
            "robotnik" => new Rekwizyty { wP = Narzedzie.Kilof, lampa = 1 },
            "pobozny" => new Rekwizyty { wP = Narzedzie.Kostur },
            "rycerz" => new Rekwizyty { wP = Narzedzie.Miecz },
            _ => default,
        };

        /// <summary>
        /// Ręce w drodze: grabarz — bliższa dłoń trzyma trzonek kilofa przy piersi (kilof na ramieniu), dalsza wysuwa
        /// latarnię przed siebie; mnich — bliższa dłoń na kosturze; rycerz — miecz nisko przed sobą. `ruch` 0 — stoi,
        /// 1 — idzie, 1,6 — biegnie; `q` — faza kroku.
        /// </summary>
        static void RekiWDrodze(ref Poza p, Stroj s, double q, double ruch, double unies = 0)
        {
            switch (s.rola)
            {
                case "robotnik":
                    Siegnij(ref p, true, 0.07 + 0.006 * ruch * Math.Sin(q), 0.085 - 0.004 * ruch * Math.Cos(2 * q));
                    Trzyma(ref p, true, Math.PI + 0.62);
                    Siegnij(ref p, false, 0.16 + 0.03 * ruch * Math.Sin(q + Math.PI) + unies * 0.05, 0.2 - unies * 0.24 - 0.012 * ruch);
                    break;
                case "pobozny":
                    Siegnij(ref p, true, 0.12 + 0.05 * ruch * Math.Cos(q), 0.2 - 0.02 * ruch);
                    Trzyma(ref p, true, Math.PI - 0.04 - 0.1 * ruch * Math.Cos(q));
                    break;
                case "rycerz":
                    Siegnij(ref p, true, 0.1 + 0.03 * ruch * Math.Cos(q), 0.24 - 0.02 * ruch);
                    Trzyma(ref p, true, 0.95 + 0.1 * ruch);
                    if (s.Tarcza) Siegnij(ref p, false, 0.14 - 0.02 * ruch * Math.Cos(q), 0.17);
                    break;
            }
        }

        // ── sterownik: klatka animacji o nazwie z arkusza ───────────────────────────────────────────────────────────
        /// <summary>Poza i rekwizyty w klatce animacji `nazwa` (np. „idzie”, „kopie”, „ciecieZGory”, „idzie-niesie”).</summary>
        public static KlatkaPostaci Klatka(Stroj s, string nazwa, double u)
        {
            var niesie = nazwa.EndsWith("-niesie", StringComparison.Ordinal);
            var n = niesie ? nazwa.Substring(0, nazwa.Length - 7) : nazwa;
            KlatkaPostaci k;
            switch (n)
            {
                case "stoi": k = Stoi(s, u, 0); break;
                case "stoi-gest": k = Stoi(s, 0.25, Math.Sin(Math.PI * Clamp01(u))); break;
                case "idzie": k = Idzie(s, u, CHOD, 1); break;
                case "biegnie": k = Idzie(s, u, BIEG, 1.6); break;
                case "schody-gora": k = Schody(s, u, true); break;
                case "schody-dol": k = Schody(s, u, false); break;
                case "wspina": k = Wspina(s, u); break;
                case "spada": k = Spada(s, u); break;
                case "czolga": k = Czolga(s, u); break;
                case "kuca-stoi": k = Kuca(s, u, false); break;
                case "kuca-idzie": k = Kuca(s, u, true); break;
                case "kopie": k = Kilofem(s, u, false); break;
                case "walczy": k = s.rola == "pobozny" ? KosturemWalczy(s, u) : Kilofem(s, u, true); break;
                case "buduje": k = Buduje(s, u); break;
                case "modli": k = Modli(s, u, 0); break;
                case "modli-wznosi": k = Modli(s, 0.25, Math.Sin(Math.PI * Clamp01(u))); break;
                case "je": k = Je(s, u); break;
                case "spi": k = Spi(s); break;
                case "odmawia": k = Odmawia(s, u); break;
                case "skleja": k = Skleja(s, u); break;
                case "kreci": k = Kreci(s, u); break;
                case "czyta": k = Czyta(s, 0.3, 1 - Clamp01(u)); break;
                case "czyta-trwa": k = Czyta(s, u, 0); break;
                default: k = Rycerz(s, n, u); break;
            }
            if (niesie) Niesie(ref k, n);
            return k;
        }

        // ── spoczynek ────────────────────────────────────────────────────────────────────────────────────────
        /// <summary>Stoi i oddycha (u — faza oddechu); `gest` 0…1 — grabarz unosi latarnię i rozgląda się, mnich żegna się, rycerz unosi miecz.</summary>
        static KlatkaPostaci Stoi(Stroj s, double u, double gest)
        {
            var p = Baza(s);
            var odd = Math.Sin(TAU * u);
            p.tulow += 0.012 * odd; p.glowa -= 0.012 * odd;
            p.ramieL += 0.015 * odd; p.ramieP -= 0.01 * odd;
            // rozstaw stóp: dalsza noga trochę naprzód
            p.udoL = 0.06; p.kolanoL = 0.06; p.udoP = -0.04; p.kolanoP = 0.03;
            if (s.rola == "rycerz") { p.udoL = 0.12; p.kolanoL = 0.1; p.udoP = -0.1; p.kolanoP = 0.06; p.plaszcz = 0.1 * odd; }
            var r = WDrodze(s);
            RekiWDrodze(ref p, s, 0, 0, s.rola == "robotnik" ? gest : 0);
            if (gest > 0)
            {
                switch (s.rola)
                {
                    case "robotnik": p.glowa -= gest * 0.3; p.tulow -= gest * 0.04; break;
                    case "pobozny":
                        // znak krzyża dalszą dłonią: czoło
                        var p2 = p; Siegnij(ref p2, false, 0.09, -0.1);
                        p = Poza.Miesz(p, p2, gest); p.glowa += gest * 0.1;
                        break;
                    case "rycerz":
                        // unosi miecz przed twarz, ogląda ostrze
                        var p3 = p; Siegnij(ref p3, true, 0.16, 0.08); Trzyma(ref p3, true, Math.PI - 0.12);
                        p = Poza.Miesz(p, p3, gest); p.glowa -= gest * 0.12;
                        break;
                    default: p.glowa -= gest * 0.2; break;
                }
            }
            return new KlatkaPostaci(p, r);
        }

        static KlatkaPostaci Idzie(Stroj s, double u, Krok c, double ruch)
        {
            if (s.rola == "rycerz")
            {
                // ciężki krok w zbroi: mniej wymachu, głowa nieruchoma
                c = c.Kopia(); c.wymach *= 0.7; c.unies *= 0.85; c.glowa = c.pochyl * 0.3;
            }
            var p = Chod(u, c, Baza(s));
            if (s.rola == "rycerz") p.plaszcz = 0.3 * ruch;
            RekiWDrodze(ref p, s, TAU * u, ruch);
            return new KlatkaPostaci(p, WDrodze(s));
        }

        static KlatkaPostaci Schody(Stroj s, double u, bool wGore)
        {
            // schody kręcone: idzie w miejscu, wysoko unosi kolana (w górę — pochylony, w dół — odchylony, ugięte kolana)
            var c = CHOD.Kopia();
            c.S = 0.32; c.unies = wGore ? 0.15 : 0.1; c.pochyl = wGore ? 0.16 : -0.03; c.biodro = wGore ? 0.455 : 0.44; c.wymach = 0.2;
            var p = Chod(u, c, Baza(s));
            RekiWDrodze(ref p, s, TAU * u, 0.6);
            return new KlatkaPostaci(p, WDrodze(s));
        }

        static KlatkaPostaci Kuca(Stroj s, double u, bool idzie)
        {
            // niski korytarz: przysiad, tułów nisko pochylony, głowa w górę
            var c = CHOD.Kopia();
            c.biodro = 0.3; c.kolys = 0.012; c.unies = 0.05; c.pochyl = 0.72; c.wymach = 0.22; c.glowa = -0.55;
            if (!idzie) { c.S = 0; }
            var p = Chod(idzie ? u : 0.25, c, Baza(s));
            if (!idzie)
            {
                var odd = Math.Sin(TAU * u);
                p.biodroY = 0.3 + 0.004 * odd; p.tulow += 0.015 * odd;
                Stan(ref p, false, 0.1, -Postac.KOSTKA, 0); Stan(ref p, true, -0.08, -Postac.KOSTKA, 0);
            }
            var r = WDrodze(s);
            switch (s.rola)
            {
                case "robotnik":
                    // latarnia wysunięta nisko przed siebie, kilof w bliższej dłoni nisko
                    Siegnij(ref p, false, 0.24, 0.12);
                    Siegnij(ref p, true, 0.12, 0.2); Trzyma(ref p, true, 1.2);
                    break;
                case "pobozny":
                    Siegnij(ref p, true, 0.22, 0.1); Trzyma(ref p, true, 1.75);
                    break;
                case "rycerz":
                    Siegnij(ref p, true, 0.18, 0.16); Trzyma(ref p, true, 1.6);
                    break;
            }
            return new KlatkaPostaci(p, r);
        }

        static KlatkaPostaci Wspina(Stroj s, double u)
        {
            // wspinaczka (TS: wspina): przodem do ściany, dłonie na zmianę sięgają w górę, kolana podciągnięte
            var q = TAU * u;
            var p = Baza(s);
            p.biodroY = 0.47 + 0.015 * Math.Sin(2 * q);
            p.ramieP = 2.75 + 0.3 * Math.Sin(q); p.lokiecP = 0.45 - 0.4 * Math.Sin(q);
            p.ramieL = 2.75 + 0.3 * Math.Sin(q + Math.PI); p.lokiecL = 0.45 - 0.4 * Math.Sin(q + Math.PI);
            p.udoP = 0.72 + 0.42 * Math.Sin(q + Math.PI); p.kolanoP = 1.3 + 0.3 * Math.Sin(q + Math.PI); p.stopaP = 0.3;
            p.udoL = 0.72 + 0.42 * Math.Sin(q); p.kolanoL = 1.3 + 0.3 * Math.Sin(q); p.stopaL = 0.3;
            p.tulow = 0.1 + 0.03 * Math.Sin(2 * q); p.glowa = -0.42;
            var r = default(Rekwizyty);
            // grabarz: latarnia u pasa — świeci, ale dłonie wolne (rycerz: miecz w pochwie)
            if (s.rola == "robotnik") r.lampa = 3;
            // rycerz: miecz w pochwie, tarcza na plecach (nie nad głową)
            if (s.rola == "rycerz") { r.pochwa = true; r.tarcza = false; }
            return new KlatkaPostaci(p, r);
        }

        static KlatkaPostaci Spada(Stroj s, double u)
        {
            // spada: wymachuje rękami i nogami (pętla — same pełne okresy)
            var t = TAU * u;
            var p = Baza(s);
            p.biodroY = 0.5;
            p.ramieP = 2.4 + 0.5 * Math.Sin(t + 0.4); p.lokiecP = 0.55 + 0.35 * Math.Sin(2 * t + 1.1);
            p.ramieL = 2.1 + 0.5 * Math.Sin(t + 2.6); p.lokiecL = 0.6 + 0.35 * Math.Sin(2 * t + 2.9);
            p.udoP = 0.55 + 0.3 * Math.Sin(t + 1.7); p.kolanoP = 1.0 + 0.35 * Math.Sin(2 * t + 0.3); p.stopaP = 0.4;
            p.udoL = -0.1 + 0.3 * Math.Sin(t + 3.9); p.kolanoL = 0.8 + 0.3 * Math.Sin(2 * t + 2.2); p.stopaL = 0.3;
            p.tulow = -0.15; p.glowa = -0.35; p.usta = 0.9;
            p.plaszcz = -0.8;
            var r = default(Rekwizyty);
            if (s.rola == "robotnik") r.lampa = 3;
            if (s.rola == "rycerz") { r.pochwa = true; r.tarcza = false; }
            return new KlatkaPostaci(p, r);
        }

        static KlatkaPostaci Czolga(Stroj s, double u)
        {
            // na czworakach pod kratą: tułów poziomo, ręka i przeciwne kolano naprzód razem
            var q = TAU * u;
            var p = Baza(s);
            p.tulow = 1.32; p.glowa = -0.95;
            p.udoL = 0.08 + 0.26 * Math.Sin(q); p.kolanoL = p.udoL + 1.5; p.stopaL = 0.3;
            p.udoP = 0.08 + 0.26 * Math.Sin(q + Math.PI); p.kolanoP = p.udoP + 1.5; p.stopaP = 0.3;
            p.ramieP = 0.0 + 0.3 * Math.Sin(q); p.lokiecP = 0.12 + 0.12 * Math.Max(0, Math.Cos(q));
            p.ramieL = 0.0 + 0.3 * Math.Sin(q + Math.PI); p.lokiecL = 0.12 + 0.12 * Math.Max(0, Math.Cos(q + Math.PI));
            var r = default(Rekwizyty);
            if (s.rola == "robotnik") { r.lampa = 2; r.lampaX = 0.42; }
            if (s.rola == "rycerz") r.pochwa = true;
            return new KlatkaPostaci(p, r);
        }

        // ── praca ────────────────────────────────────────────────────────────────────────────────────────────
        /// <summary>
        /// Kilof oburącz w ścianę przed sobą (kopie) albo w cel (walczy): klatki 0–1 kilof w ścianie, 2–6 w górę nad głowę,
        /// 7 — cios (środek klatki 7/12 to chwila trafienia: ZAMACH_TRAF w DuszkiLudu), 8–11 kilof wbity przed siebie.
        /// </summary>
        static KlatkaPostaci Kilofem(Stroj s, double u, bool walczy)
        {
            var baza = Baza(s);
            baza.udoL = 0.3; baza.kolanoL = 0.26; baza.udoP = -0.24; baza.kolanoP = 0.14;
            // (dłoń względem barku x, y; kąt trzonka; tułów; głowa)
            var kl = new (double t, double dx, double dy, double kat, double tul, double gl)[]
            {
                (0.00, 0.27, 0.1, 1.62, 0.3, 0.0),
                (0.14, 0.2, 0.1, 1.95, 0.2, -0.04),
                (0.34, 0.06, -0.1, 2.85, 0.04, -0.12),
                (0.48, -0.02, -0.2, 3.55, -0.08, -0.2),
                (0.54, -0.03, -0.21, 3.72, -0.1, -0.22),
                (0.6, 0.16, -0.1, 2.35, 0.12, -0.08),
                (0.625, 0.27, 0.06, 1.6, 0.3, 0.02),
                (0.7, 0.28, 0.1, 1.58, 0.32, 0.02),
                (1.00, 0.27, 0.1, 1.62, 0.3, 0.0),
            };
            if (walczy) for (int i = 0; i < kl.Length; i++) kl[i].dy -= 0.04;
            int j = 0;
            while (j + 2 < kl.Length && u >= kl[j + 1].t) j++;
            var a = kl[j]; var b = kl[j + 1];
            var t = (u - a.t) / (b.t - a.t);
            // zamach w dół przyspiesza, reszta łagodnie
            var e = a.t >= 0.54 && b.t <= 0.625 ? t * t : Gl(t);
            var p = baza;
            p.tulow = Lerp(a.tul, b.tul, e) + baza.tulow * 0.3;
            p.glowa = Lerp(a.gl, b.gl, e);
            // kolana uginają się przy ciosie
            var cios = Math.Max(0, 1 - Math.Abs(u - 0.66) / 0.18);
            p.kolanoL += 0.18 * cios; p.kolanoP += 0.14 * cios;
            Siegnij(ref p, true, Lerp(a.dx, b.dx, e), Lerp(a.dy, b.dy, e));
            var kat = Lerp(a.kat, b.kat, e);
            Trzyma(ref p, true, kat);
            Oburacz(ref p, kat, 0.1);
            p.usta = cios * 0.4;
            var r = new Rekwizyty { wP = Narzedzie.Kilof };
            if (s.rola == "robotnik") { r.lampa = 2; r.lampaX = -0.2; }
            if (s.rola == "rycerz") r.pochwa = true;
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Mnich walczy kosturem: pchnięcia krzyżem przed siebie (krzyż rozbłyska przy pchnięciu).</summary>
        static KlatkaPostaci KosturemWalczy(Stroj s, double u)
        {
            var baza = Baza(s);
            baza.udoL = 0.28; baza.kolanoL = 0.22; baza.udoP = -0.22; baza.kolanoP = 0.12;
            var wysun = KluczeL(u, (0, 0.0), (0.3, -0.04), (0.42, -0.05), (0.55, 1.0), (0.66, 1.0), (1.0, 0.0));
            var p = baza;
            p.tulow = baza.tulow + 0.05 + 0.16 * wysun; p.glowa = 0.02 - 0.08 * wysun;
            Siegnij(ref p, true, 0.12 + 0.17 * wysun, 0.12 - 0.04 * wysun);
            var kat = Math.PI / 2 + 0.28 - 0.18 * wysun;
            Trzyma(ref p, true, kat);
            // dalsza dłoń niżej na drzewcu (z tyłu)
            Oburacz(ref p, kat, -0.12);
            p.usta = 0.3 * wysun;
            return new KlatkaPostaci(p, new Rekwizyty { wP = Narzedzie.Kostur });
        }

        /// <summary>Buduje: klęczy na jednym kolanie i bije młotkiem przed sobą przy ziemi (trafienie w ~0,6 cyklu).</summary>
        static KlatkaPostaci Buduje(Stroj s, double u)
        {
            var p = Baza(s);
            p.udoL = 1.45; p.kolanoL = 1.5; p.stopaL = -0.4;
            p.udoP = 0.05; p.kolanoP = 1.62; p.stopaP = 0.5;
            p.tulow = 0.42; p.glowa = 0.15;
            var w = KluczeL(u, (0, 0.0), (0.45, 1.0), (0.52, 1.0), (0.6, -0.08), (0.7, 0.0), (1.0, 0.0));
            // w = 1 — młotek w górze, 0 — przy ziemi
            Siegnij(ref p, true, 0.22 - 0.06 * w, 0.27 - 0.32 * w);
            Trzyma(ref p, true, Math.PI / 2 + 0.25 + 1.15 * w);
            // dalsza dłoń przytrzymuje kamień przy ziemi
            Siegnij(ref p, false, 0.3, 0.32);
            var r = new Rekwizyty { wP = Narzedzie.Mlot };
            if (s.rola == "robotnik") { r.lampa = 2; r.lampaX = -0.22; }
            if (s.rola == "rycerz") r.pochwa = true;
            return new KlatkaPostaci(p, r);
        }

        /// <summary>
        /// Modlitwa: klęczy, dłonie złożone przed twarzą; mnich kołysze się naprzód i w tył (świeca przed nim), rycerz klęczy
        /// na jednym kolanie z mieczem wbitym przed sobą. `wznosi` 0…1 — ręce wzniesione do nieba (orant).
        /// </summary>
        static KlatkaPostaci Modli(Stroj s, double u, double wznosi)
        {
            var p = Baza(s);
            var odd = Math.Sin(TAU * u);
            var r = default(Rekwizyty);
            if (s.rola == "rycerz")
            {
                // na jednym kolanie: dalsza noga zgięta przed sobą, bliższe kolano na ziemi
                p.udoL = 1.5; p.kolanoL = 1.55; p.stopaL = -0.45;
                p.udoP = 0.1; p.kolanoP = 1.62; p.stopaP = 0.6;
                p.tulow = 0.06 + 0.01 * odd; p.glowa = 0.32;
                // miecz sztychem w ziemię przed sobą, obie dłonie na głowicy
                Siegnij(ref p, true, 0.2, 0.08);
                Trzyma(ref p, true, 0.04);
                Siegnij(ref p, false, 0.2, 0.06);
                r.wP = Narzedzie.Miecz; r.tarcza = false;
                return new KlatkaPostaci(p, r);
            }
            // na obu kolanach: uda pionowo, podudzia na ziemi
            p.udoL = 0.12; p.kolanoL = 1.66; p.stopaL = 0.6;
            p.udoP = 0.04; p.kolanoP = 1.6; p.stopaP = 0.6;
            var kol = s.rola == "pobozny" ? 0.07 : 0.015;
            p.tulow = 0.08 + kol * odd; p.glowa = 0.22 + kol * 1.1 * odd;
            var zlozone = p;
            Siegnij(ref zlozone, true, 0.15, 0.06); Siegnij(ref zlozone, false, 0.15, 0.07);
            zlozone.dlonP = 0.6; zlozone.dlonL = 0.6;
            if (wznosi > 0)
            {
                var orant = p;
                orant.tulow = -0.04; orant.glowa = -0.32;
                Siegnij(ref orant, true, 0.16, -0.25); Siegnij(ref orant, false, 0.12, -0.27);
                p = Poza.Miesz(zlozone, orant, wznosi);
            }
            else p = zlozone;
            p.usta = s.rola == "pobozny" ? 0.18 * Math.Max(0, Math.Sin(TAU * u * 3)) : 0;
            if (s.rola == "pobozny") { r.swieca = true; r.swiecaX = 0.36; }
            if (s.rola == "robotnik") { r.lampa = 2; r.lampaX = -0.2; }
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Je: w przysiadzie, bliższa dłoń z grzybem do ust i z powrotem, żuje (TS: je).</summary>
        static KlatkaPostaci Je(Stroj s, double u)
        {
            var p = Baza(s);
            p.udoL = 1.35; p.kolanoL = 2.3; p.stopaL = 0.1;
            p.udoP = 1.25; p.kolanoP = 2.25; p.stopaP = 0.1;
            p.tulow = 0.26;
            var doUst = u < 0.3 ? Gl(u / 0.3) : u < 0.62 ? 1 : 1 - Gl((u - 0.62) / 0.38);
            Siegnij(ref p, true, Lerp(0.17, 0.1, doUst), Lerp(0.16, -0.05, doUst));
            p.dlonP = Lerp(0.3, 2.2, doUst);
            Siegnij(ref p, false, 0.15, 0.17);
            p.glowa = Lerp(0.14, 0.02, doUst);
            p.usta = doUst > 0.9 ? 0.25 + 0.25 * Math.Abs(Math.Sin(TAU * u * 4)) : 0;
            var r = new Rekwizyty { wP = Narzedzie.Grzyb };
            if (s.rola == "robotnik") { r.lampa = 2; r.lampaX = -0.2; }
            if (s.rola == "rycerz") r.pochwa = true;
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Śpi: leży na plecach, ręce na brzuchu, nogi lekko ugięte.</summary>
        static KlatkaPostaci Spi(Stroj s)
        {
            var p = Poza.Stoi();
            p.obrot = -Math.PI / 2;
            // ciało w lewo od środka klatki jak w starym arkuszu: głowa ok. 1,35 wzrostu w lewo (trupy przesuwają leżącego
            // o 0,95 wzrostu, aureola liczy od głowy)
            p.biodroX = -0.95;
            p.tulow = 0.02; p.glowa = -0.1;
            p.udoL = 0.25; p.kolanoL = 0.5; p.udoP = 0.1; p.kolanoP = 0.4;
            p.ramieP = 0.12; p.lokiecP = 0.3; p.ramieL = 0.05; p.lokiecL = 0.25;
            var r = default(Rekwizyty);
            if (s.rola == "robotnik") { r.lampa = 2; r.lampaX = -0.2; }
            if (s.rola == "rycerz") r.pochwa = true;
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Odmowa rozkazu (TS: odmawia): kręci głową, macha dłonią „nie, nie”, potem rozkłada ręce.</summary>
        static KlatkaPostaci Odmawia(Stroj s, double k)
        {
            var spocz = Baza(s);
            spocz.udoL = 0.06; spocz.kolanoL = 0.06; spocz.udoP = -0.04; spocz.kolanoP = 0.03;
            spocz.ramieP = 0.04; spocz.lokiecP = 0.06; spocz.ramieL = -0.06; spocz.lokiecL = 0.05;
            var wejscie = Gl(k / 0.1); var powrot = 1 - Gl((k - 0.86) / 0.14);
            var nie = Gl((0.62 - k) / 0.1) * wejscie;
            var ramiona = Gl((k - 0.5) / 0.12) * powrot;
            var czas = k * 2600;
            var zakaz = spocz;
            Siegnij(ref zakaz, true, 0.2 + 0.06 * Math.Sin(czas * 0.021), -0.09 + 0.02 * Math.Sin(czas * 0.042));
            zakaz.dlonP = 1.9; zakaz.ramieL = 0.12; zakaz.lokiecL = 0.35; zakaz.tulow = spocz.tulow - 0.05;
            var wzrusz = spocz;
            Siegnij(ref wzrusz, true, 0.2, 0.02); Siegnij(ref wzrusz, false, 0.18, 0.035);
            wzrusz.dlonP = 1.2; wzrusz.dlonL = 1.2; wzrusz.tulow = spocz.tulow - 0.08;
            var p = Poza.Miesz(Poza.Miesz(spocz, zakaz, nie), wzrusz, ramiona);
            p.glowa = 0.04 + Math.Sin(czas * 0.028) * 0.17 * nie + 0.18 * ramiona;
            p.usta = nie * 0.3 * Math.Max(0, Math.Sin(czas * 0.018));
            var r = default(Rekwizyty);
            if (s.rola == "robotnik") r.lampa = 1;
            if (s.rola == "rycerz") r.pochwa = true;
            // grabarz trzyma latarnię dalszą dłonią — przy wzruszeniu ramion też
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Skleja linę wiadra: wisi, dalsza dłoń trzyma się nad głową, bliższa wiąże supeł i co chwilę szarpie.</summary>
        static KlatkaPostaci Skleja(Stroj s, double u)
        {
            var p = Baza(s);
            var q = TAU * u * 5;
            var szarp = Math.Pow(Math.Max(0, Math.Sin(TAU * u)), 8);
            p.biodroY = 0.47;
            p.ramieL = 2.95; p.lokiecL = 0.18;
            Siegnij(ref p, true, 0.07 + 0.05 * Math.Cos(q) - szarp * 0.03, -0.2 + 0.045 * Math.Sin(q) + szarp * 0.06);
            p.dlonP = 0.8;
            p.udoP = 0.62; p.kolanoP = 1.25; p.stopaP = 0.3;
            p.udoL = 0.12 + 0.03 * Math.Sin(TAU * u); p.kolanoL = 0.35; p.stopaL = 0.2;
            p.tulow = 0.06 + 0.02 * Math.Sin(q); p.glowa = -0.32 + szarp * 0.1;
            p.usta = 0.3 * szarp;
            var r = default(Rekwizyty);
            if (s.rola == "robotnik") r.lampa = 3;
            if (s.rola == "rycerz") { r.pochwa = true; r.tarcza = false; }
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Kręci korbą kołowrotu: obie dłonie na rączce, która chodzi w kółko przed nim na wysokości pasa.</summary>
        static KlatkaPostaci Kreci(Stroj s, double u)
        {
            var p = Baza(s);
            var q = TAU * u;
            p.udoP = 0.32; p.kolanoP = 0.34; p.udoL = -0.16; p.kolanoL = 0.18;
            p.tulow = 0.2 + 0.07 * Math.Sin(q); p.glowa = 0.14 + 0.04 * Math.Sin(q);
            const double kx = 0.3, ky = 0.2, rr = 0.075;
            Siegnij(ref p, true, kx + rr * Math.Cos(q), ky + rr * Math.Sin(q));
            Siegnij(ref p, false, kx - 0.02 + rr * Math.Cos(q), ky + 0.01 + rr * Math.Sin(q));
            p.dlonP = 1.0; p.dlonL = 1.0;
            var r = default(Rekwizyty);
            if (s.rola == "robotnik") { r.lampa = 2; r.lampaX = -0.2; }
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Czyta księgę (mnich przeciw bossowi): `blysk` 1 — księga wzniesiona i rozbłyśnięta, 0 — czyta przed sobą.</summary>
        static KlatkaPostaci Czyta(Stroj s, double u, double blysk)
        {
            var p = Baza(s);
            p.udoL = 0.2; p.kolanoL = 0.12; p.udoP = -0.18; p.kolanoP = 0.12;
            var pch = blysk;
            Siegnij(ref p, true, 0.17 + pch * 0.09, 0.0 - pch * 0.12);
            Siegnij(ref p, false, 0.15 + pch * 0.09, 0.02 - pch * 0.12);
            p.dlonP = 1.6; p.dlonL = 1.6;
            p.tulow = 0.02 - 0.06 * pch; p.glowa = 0.18 - 0.3 * pch;
            p.usta = 0.25 + 0.2 * Math.Max(0, Math.Sin(TAU * u * 2));
            var r = new Rekwizyty { wP = Narzedzie.Ksiega, otwarta = 1, blask = 0.45 + 0.15 * Math.Sin(TAU * u) + blysk * 0.55 };
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Robotnik z workiem na plecach: bliższa dłoń na rzemieniu przy barku, pochylony (bez kilofa w ręce).</summary>
        static void Niesie(ref KlatkaPostaci k, string n)
        {
            k.r.worek = true;
            if (n == "stoi" || n == "idzie" || n == "biegnie" || n == "schody-gora" || n == "schody-dol")
            {
                k.p.ramieP = -0.32; k.p.lokiecP = 2.35; k.p.dlonP = 0.3;
                k.p.tulow += 0.06;
                k.r.wP = Narzedzie.Brak;
            }
        }
    }
}
