using System;
using System.Numerics;

namespace Trzewia.Js
{
    /// <summary>
    /// Math.sin, Math.cos i Math.atan2 dokładnie jak w JavaScripcie gry.
    ///
    /// Dlaczego nie Math.Sin z .NET: .NET woła bibliotekę systemu (glibc na Linuksie, CRT na Windows), a V8 ma własną.
    /// Pomiar 10.11 (200 000 losowych argumentów): .NET na Linuksie różni się od Chromium 153 w ostatnim bicie dla
    /// 0,16% sinusów i 0,08% atan2, a od Node 22 (stary V8, fdlibm) — dla 3,4% sinusów i 18% atan2. Symulacja liczy
    /// sinusem kręte korytarze i ruch Strażników, więc różnica w ostatnim bicie rozjeżdża położenia i testy złote.
    ///
    /// Wzorzec: V8 w Chromium (gra działa w Electronie) — src/base/ieee754.cc woła tam LLVM libc
    /// (LIBC_NAMESPACE::shared::sin/cos/atan2), którego funkcje są POPRAWNIE ZAOKRĄGLONE. Wynik poprawnie zaokrąglony
    /// jest jednoznaczny, więc wystarczy policzyć go dokładnie — tu tak samo na Windows, Linuksie, w Unity i Godocie.
    ///
    /// Jak: szybka ścieżka w arytmetyce double-double (~100 bitów) i sprawdzenie, czy zaokrąglenie jest pewne;
    /// gdy nie (rzadko, około raz na 2^40 argumentów), wolna ścieżka na liczbach całkowitych dowolnej długości
    /// (BigInteger, 400 bitów po przecinku). Stałe (π, 1/n!, atan(j/64)) liczone tak samo, przy pierwszym użyciu.
    /// </summary>
    public static class JsMath
    {
        // ───────────────────────────── double-double ─────────────────────────────

        readonly struct DD
        {
            public readonly double hi, lo;
            public DD(double hi, double lo) { this.hi = hi; this.lo = lo; }
            public static DD operator -(DD a) => new DD(-a.hi, -a.lo);
        }

        static DD TwoSum(double a, double b) { double s = a + b, bb = s - a; return new DD(s, (a - (s - bb)) + (b - bb)); }
        static DD FastTwoSum(double a, double b) { double s = a + b; return new DD(s, b - (s - a)); }

        const double SPLIT = 134217729.0; // 2^27 + 1 (Dekker; bez FMA, żeby wynik nie zależał od procesora)

        static DD TwoProd(double a, double b)
        {
            double p = a * b;
            double t = SPLIT * a, ah = t - (t - a), al = a - ah;
            t = SPLIT * b;
            double bh = t - (t - b), bl = b - bh;
            return new DD(p, ((ah * bh - p) + ah * bl + al * bh) + al * bl);
        }

        static DD Add(DD a, DD b)
        {
            var s = TwoSum(a.hi, b.hi);
            var t = TwoSum(a.lo, b.lo);
            var u = FastTwoSum(s.hi, s.lo + t.hi);
            return FastTwoSum(u.hi, u.lo + t.lo);
        }

        static DD Mul(DD a, DD b)
        {
            var p = TwoProd(a.hi, b.hi);
            return FastTwoSum(p.hi, p.lo + (a.hi * b.lo + a.lo * b.hi));
        }

        static DD MulD(DD a, double b)
        {
            var p = TwoProd(a.hi, b);
            return FastTwoSum(p.hi, p.lo + a.lo * b);
        }

        static DD Div(DD a, DD b)
        {
            double q1 = a.hi / b.hi;
            var r = Add(a, -MulD(b, q1));
            double q2 = r.hi / b.hi;
            r = Add(r, -MulD(b, q2));
            double q3 = r.hi / b.hi;
            return Add(FastTwoSum(q1, q2), new DD(q3, 0));
        }

        /// <summary>Wynik pewny: hi + lo ± błąd zaokrągla się do hi. Inaczej — wolna ścieżka.</summary>
        static bool Pewny(DD w, double blad) => w.hi + (w.lo + blad) == w.hi && w.hi + (w.lo - blad) == w.hi;

        // ───────────────────────────── liczby dowolnej długości ─────────────────────────────

        /// <summary>Bitów po przecinku w wolnej ścieżce.</summary>
        const int P = 400;
        /// <summary>Bitów π (zapas na redukcję argumentów do ~2^600).</summary>
        const int PB = 1100;

        static int DlugoscBitow(BigInteger m)
        {
            if (m.IsZero) return 0;
            var b = BigInteger.Abs(m).ToByteArray();
            int n = b.Length - 1;
            while (n > 0 && b[n] == 0) n--;
            int bity = n * 8, g = b[n];
            while (g != 0) { bity++; g >>= 1; }
            return bity;
        }

        /// <summary>
        /// (m + ε)·2^e poprawnie zaokrąglone do double (do najbliższej, remis — do parzystej); m &gt; 0 i ma co najmniej
        /// 60 bitów; resztka — m jest ucięte (prawdziwa wartość nieco większa niż m·2^e, ale mniejsza niż (m+1)·2^e).
        /// </summary>
        static double DoDouble(BigInteger m, int e, bool resztka)
        {
            int L = DlugoscBitow(m);
            int przesun = L - 53;
            BigInteger mant;
            if (przesun > 0)
            {
                mant = m >> przesun;
                var reszta = m - (mant << przesun);
                var pol = BigInteger.One << (przesun - 1);
                int c = reszta.CompareTo(pol);
                if (c > 0 || (c == 0 && (resztka || !mant.IsEven))) mant += 1;
                if (mant == (BigInteger.One << 53)) { mant >>= 1; przesun++; }
            }
            else { mant = m << -przesun; }
            int wykladnik = e + przesun;            // wartość = mant · 2^wykladnik, mant w [2^52, 2^53)
            int wyk = wykladnik + 52 + 1023;
            if (wyk <= 0 || wyk >= 2047) return (double)mant * Math.Pow(2, wykladnik);   // poza zakresem zwykłych liczb (nie w grze)
            long bity = ((long)wyk << 52) | ((long)mant & 0xFFFFFFFFFFFFFL);
            return BitConverter.Int64BitsToDouble(bity);
        }

        /// <summary>Wartość stałoprzecinkowa (V / 2^skala) jako double; znak osobno.</summary>
        static double ZeStalego(BigInteger v, int skala)
        {
            if (v.IsZero) return 0;
            bool ujemna = v.Sign < 0;
            var d = DoDouble(BigInteger.Abs(v), -skala, true);
            return ujemna ? -d : d;
        }

        /// <summary>Double jako dokładna wartość stałoprzecinkowa (· 2^skala; wolno ucinać tylko poniżej 2^-skala).</summary>
        static BigInteger DoStalego(double x, int skala)
        {
            long bity = BitConverter.DoubleToInt64Bits(x);
            bool ujemna = bity < 0;
            int wyk = (int)((bity >> 52) & 0x7FF);
            long mant = bity & 0xFFFFFFFFFFFFFL;
            if (wyk == 0) wyk = 1; else mant |= 1L << 52;
            int e = wyk - 1075 + skala;
            var m = new BigInteger(mant);
            m = e >= 0 ? m << e : m >> -e;
            return ujemna ? -m : m;
        }

        /// <summary>atan(1/n) · 2^skala (szereg).</summary>
        static BigInteger AtanOdwrotnosci(int n, int skala)
        {
            var x = (BigInteger.One << skala) / n;
            var n2 = new BigInteger(n) * n;
            BigInteger suma = x, wyraz = x;
            for (int k = 1; !wyraz.IsZero; k++)
            {
                wyraz /= n2;
                var t = wyraz / (2 * k + 1);
                if (t.IsZero) break;
                suma += (k & 1) == 1 ? -t : t;
            }
            return suma;
        }

        static BigInteger? piStale;
        /// <summary>π · 2^PB (Machin: π = 16·atan(1/5) − 4·atan(1/239)), z zapasem bitów.</summary>
        static BigInteger Pi
        {
            get
            {
                if (piStale is BigInteger p) return p;
                int s = PB + 32;
                var v = 16 * AtanOdwrotnosci(5, s) - 4 * AtanOdwrotnosci(239, s);
                piStale = v >> 32;
                return piStale.Value;
            }
        }

        static BigInteger Isqrt(BigInteger n)
        {
            if (n.Sign <= 0) return BigInteger.Zero;
            var x = BigInteger.One << ((DlugoscBitow(n) + 1) / 2);
            while (true)
            {
                var y = (x + n / x) >> 1;
                if (y >= x) return x;
                x = y;
            }
        }

        /// <summary>sin i cos stałoprzecinkowe (·2^P) dla |r| ≤ ~π/4 (r · 2^P).</summary>
        static void SinCosStale(BigInteger r, out BigInteger sin, out BigInteger cos)
        {
            var jeden = BigInteger.One << P;
            var r2 = (r * r) >> P;
            BigInteger s = r, c = jeden, ws = r, wc = jeden;
            for (int n = 1; n < 200; n++)
            {
                ws = -(ws * r2 >> P) / ((2 * n) * (2 * n + 1));
                wc = -(wc * r2 >> P) / ((2 * n - 1) * (2 * n));
                if (ws.IsZero && wc.IsZero) break;
                s += ws; c += wc;
            }
            sin = s; cos = c;
        }

        /// <summary>Redukcja x = k·π/2 + r w liczbach dowolnej długości: r · 2^P i k mod 4.</summary>
        static BigInteger RedukcjaStala(double x, out int cwiartka)
        {
            var X = DoStalego(x, PB);                    // x · 2^PB, dokładnie dla |x| ≥ 2^-48
            var pol = Pi >> 1;                            // π/2 · 2^PB
            var k = BigInteger.Divide(X + (pol >> 1) * X.Sign, pol);   // najbliższa całkowita
            var r = X - k * pol;
            cwiartka = (int)(((k % 4) + 4) % 4);
            return r >> (PB - P);
        }

        static double SinWolno(double x)
        {
            var r = RedukcjaStala(x, out var q);
            SinCosStale(r, out var s, out var c);
            var v = q switch { 0 => s, 1 => c, 2 => -s, _ => -c };
            return ZeStalego(v, P);
        }

        static double CosWolno(double x)
        {
            var r = RedukcjaStala(x, out var q);
            SinCosStale(r, out var s, out var c);
            var v = q switch { 0 => c, 1 => -s, 2 => -c, _ => s };
            return ZeStalego(v, P);
        }

        /// <summary>atan(a) · 2^P dla 0 ≤ a ≤ 1 podanego jako a · 2^P (połowienie kąta, potem szereg).</summary>
        static BigInteger AtanStale(BigInteger a)
        {
            var jeden = BigInteger.One << P;
            int polowien = 0;
            // atan(a) = 2·atan(a / (1 + √(1 + a²))), aż a < 2^-12
            while (a > (jeden >> 12))
            {
                var pierw = Isqrt((jeden << P) + a * a);     // √(1 + a²) · 2^P
                a = (a << P) / (jeden + pierw);
                polowien++;
            }
            var a2 = (a * a) >> P;
            BigInteger suma = a, wyraz = a;
            for (int k = 1; k < 200; k++)
            {
                wyraz = (wyraz * a2) >> P;
                var t = wyraz / (2 * k + 1);
                if (t.IsZero) break;
                suma += (k & 1) == 1 ? -t : t;
            }
            return suma << polowien;
        }

        // ───────────────────────────── stałe szybkiej ścieżki ─────────────────────────────

        static DD DDZeStalego(BigInteger v, int skala)
        {
            double hi = ZeStalego(v, skala);
            var resztaV = v - DoStalego(hi, skala);
            return new DD(hi, ZeStalego(resztaV, skala));
        }

        sealed class Stale
        {
            /// <summary>π/2 w kawałkach po 25 bitów (k·kawałek dokładnie dla |k| &lt; 2^28) i reszta.</summary>
            public readonly double[] pio2 = new double[7];
            public readonly DD pio2DD, piDD;
            public readonly DD[] odwrSilni = new DD[32];
            public readonly DD[] atanTab = new DD[65];
            public readonly DD[] odwr = new DD[22];

            public Stale()
            {
                var pi = Pi;   // · 2^PB
                piDD = DDZeStalego(pi, PB);
                var pol = pi >> 1;
                pio2DD = DDZeStalego(pol, PB);
                // kawałki π/2: każdy ma najwyżej 25 bitów znaczących
                var reszta = pol;
                for (int i = 0; i < 6; i++)
                {
                    int L = DlugoscBitow(reszta);
                    int odetnij = Math.Max(0, L - 25);
                    var kawalek = (reszta >> odetnij) << odetnij;
                    pio2[i] = ZeStalego(kawalek, PB);
                    reszta -= DoStalego(pio2[i], PB);
                }
                pio2[6] = ZeStalego(reszta, PB);
                // 1/n!
                var silnia = BigInteger.One;
                for (int n = 0; n < odwrSilni.Length; n++)
                {
                    if (n > 0) silnia *= n;
                    odwrSilni[n] = DDZeStalego((BigInteger.One << (P + 64)) / silnia, P + 64);
                }
                // 1/n do szeregu atan
                for (int n = 1; n < odwr.Length; n++) odwr[n] = DDZeStalego((BigInteger.One << (P + 64)) / n, P + 64);
                // atan(j/64)
                for (int j = 0; j <= 64; j++)
                    atanTab[j] = DDZeStalego(AtanStale((new BigInteger(j) << P) / 64), P);
            }
        }

        static Stale? stale;
        static Stale S => stale ??= new Stale();

        // ───────────────────────────── sin, cos ─────────────────────────────

        /// <summary>Redukcja w double-double: r = x − k·π/2 dla |x| &lt; 2^28; fałsz, gdy r za małe na pewny wynik.</summary>
        static bool Redukcja(double x, out DD r, out int cwiartka, out double k)
        {
            var s = S;
            k = Math.Round(x * (2 / Math.PI));
            cwiartka = (int)(((long)k % 4 + 4) % 4);
            if (k == 0) { r = new DD(x, 0); return true; }
            // x − k·p0 jest dokładne (Sterbenz), dalsze kawałki zbierane w double-double
            var acc = new DD(x - k * s.pio2[0], 0);
            for (int i = 1; i < 7; i++) acc = Add(acc, new DD(-k * s.pio2[i], 0));
            r = acc;
            // błąd bezwzględny ~|k|·2^-150 — za mało bitów, gdy x prawie trafia w wielokrotność π/2
            return Math.Abs(r.hi) > 1e-12;
        }

        static DD SinDD(DD r)
        {
            var c = S.odwrSilni;
            var z = Mul(r, r);
            var p = c[29];
            // p = −1/3! + z/5! − z²/7! + … (Horner od r^29); sin r = r + r·z·p
            for (int n = 27; n >= 3; n -= 2) p = Add((n & 2) == 0 ? c[n] : -c[n], Mul(p, z));
            return Add(r, Mul(Mul(r, z), p));
        }

        static DD CosDD(DD r)
        {
            var c = S.odwrSilni;
            var z = Mul(r, r);
            // p = −1/2! + z/4! − …; cos r = 1 + z·p
            var p = c[28];
            for (int n = 26; n >= 2; n -= 2) p = Add((n & 2) == 0 ? c[n] : -c[n], Mul(p, z));
            return Add(new DD(1, 0), Mul(z, p));
        }

        /// <summary>
        /// Granica błędu szybkiej ścieżki: względny ~2^-98 z szeregu i bezwzględny z redukcji — po odjęciu k·p0
        /// pośrednie wartości mają do (1 + |k|·2^-24) i każde dodawanie double-double gubi ~2^-104 z nich.
        /// </summary>
        static double Blad(DD w, double k) => Math.Abs(w.hi) * 4e-30 + (1 + Math.Abs(k) * 6e-8) * 1e-30;

        /// <summary>Math.sin jak w V8 (poprawnie zaokrąglony).</summary>
        public static double Sin(double x)
        {
            if (double.IsNaN(x) || double.IsInfinity(x)) return double.NaN;
            double ax = Math.Abs(x);
            if (ax < 1.4901161193847656e-08) return x;   // |x| < 2^-26: sin x zaokrągla się do x (także −0)
            if (ax >= 268435456.0) return SinWolno(x);    // |x| ≥ 2^28 — w grze nie występuje
            if (!Redukcja(x, out var r, out var q, out var k)) return SinWolno(x);
            var w = q switch { 0 => SinDD(r), 1 => CosDD(r), 2 => -SinDD(r), _ => -CosDD(r) };
            return Pewny(w, Blad(w, k)) ? w.hi : SinWolno(x);
        }

        /// <summary>Math.cos jak w V8 (poprawnie zaokrąglony).</summary>
        public static double Cos(double x)
        {
            if (double.IsNaN(x) || double.IsInfinity(x)) return double.NaN;
            double ax = Math.Abs(x);
            if (ax < 7.450580596923828e-09) return 1;    // |x| < 2^-27: cos x zaokrągla się do 1
            if (ax >= 268435456.0) return CosWolno(x);
            if (!Redukcja(x, out var r, out var q, out var k)) return CosWolno(x);
            var w = q switch { 0 => CosDD(r), 1 => -SinDD(r), 2 => -CosDD(r), _ => SinDD(r) };
            return Pewny(w, Blad(w, k)) ? w.hi : CosWolno(x);
        }

        // ───────────────────────────── atan2 ─────────────────────────────

        /// <summary>atan(a) w double-double dla 0 ≤ a ≤ 1: atan(j/64) z tablicy + szereg dla małej reszty.</summary>
        static DD AtanDD(DD a)
        {
            var s = S;
            int j = (int)Math.Round(a.hi * 64);
            DD t;
            if (j == 0) t = a;
            else
            {
                var c = new DD(j / 64.0, 0);
                t = Div(Add(a, -c), Add(new DD(1, 0), Mul(a, c)));   // atan(a) = atan(c) + atan((a−c)/(1+a·c))
            }
            var z = Mul(t, t);
            // szereg: t − t³/3 + t⁵/5 − … (|t| ≤ 1/128 → wystarczy do t^21)
            // p = 1/3 − z/5 + z²/7 − … ± z⁹/21 (Horner od końca); atan t = t − t·z·p
            var p = s.odwr[21];
            for (int n = 19; n >= 3; n -= 2) p = Add(s.odwr[n], -Mul(p, z));
            var szereg = Add(t, -Mul(Mul(t, z), p));
            return j == 0 ? szereg : Add(s.atanTab[j], szereg);
        }

        static double Atan2Wolno(double y, double x)
        {
            // dokładnie: kąt w liczbach dowolnej długości
            var X = DoStalego(Math.Abs(x), PB);
            var Y = DoStalego(Math.Abs(y), PB);
            bool zamiana = Y > X;
            var a = zamiana ? (X << P) / Y : (Y << P) / X;   // a · 2^P, 0 ≤ a ≤ 1
            var kat = AtanStale(a);                         // · 2^P
            var pi = Pi >> (PB - P);
            if (zamiana) kat = (pi >> 1) - kat;
            if (x < 0) kat = pi - kat;
            if (y < 0) kat = -kat;
            return ZeStalego(kat, P);
        }

        /// <summary>Math.atan2 jak w V8 (poprawnie zaokrąglony; przypadki szczególne jak w specyfikacji ECMAScript).</summary>
        public static double Atan2(double y, double x)
        {
            if (double.IsNaN(x) || double.IsNaN(y)) return double.NaN;
            bool yUj = y < 0 || (y == 0 && double.IsNegative(y));
            bool xUj = x < 0 || (x == 0 && double.IsNegative(x));
            const double PI = Math.PI, PI_2 = Math.PI / 2, PI_4 = Math.PI / 4;
            if (y == 0) return xUj ? (yUj ? -PI : PI) : y;                     // ±0 albo ±π
            if (x == 0) return yUj ? -PI_2 : PI_2;
            if (double.IsInfinity(x))
            {
                if (double.IsInfinity(y)) return xUj ? (yUj ? -3 * PI_4 : 3 * PI_4) : (yUj ? -PI_4 : PI_4);
                return xUj ? (yUj ? -PI : PI) : (yUj ? -0.0 : 0.0);
            }
            if (double.IsInfinity(y)) return yUj ? -PI_2 : PI_2;
            double ax = Math.Abs(x), ay = Math.Abs(y);
            // skrajne proporcje (2^±400) — poza grą; wolna ścieżka ich też nie obejmie dokładnie, więc wprost
            if (ay > ax * 1e120 || ax > ay * 1e120 || ax < 1e-290 || ay < 1e-290 || ax > 1e290 || ay > 1e290)
                return Math.Atan2(y, x);
            bool zamiana = ay > ax;
            double licz = zamiana ? ax : ay, mian = zamiana ? ay : ax;
            // a = licz / mian w double-double (reszta dzielenia dokładnie)
            double q = licz / mian;
            var resz = Add(new DD(licz, 0), -TwoProd(q, mian));
            var a = FastTwoSum(q, resz.hi / mian);
            var s = S;
            var kat = AtanDD(a);
            if (zamiana) kat = Add(s.pio2DD, -kat);
            if (xUj) kat = Add(s.piDD, -kat);
            if (yUj) kat = -kat;
            return Pewny(kat, Math.Abs(kat.hi) * 4e-30) ? kat.hi + 0.0 : Atan2Wolno(y, x);
        }

        /// <summary>Do testów: wolna ścieżka wprost (porównanie z szybką).</summary>
        public static double SinDokladnie(double x) => double.IsNaN(x) || double.IsInfinity(x) ? double.NaN : x == 0 ? x : SinWolno(x);
        public static double CosDokladnie(double x) => double.IsNaN(x) || double.IsInfinity(x) ? double.NaN : x == 0 ? 1 : CosWolno(x);
        public static double Atan2Dokladnie(double y, double x) => y == 0 || x == 0 || double.IsNaN(x + y) || double.IsInfinity(x) || double.IsInfinity(y) ? Atan2(y, x) : Atan2Wolno(y, x);
    }
}
