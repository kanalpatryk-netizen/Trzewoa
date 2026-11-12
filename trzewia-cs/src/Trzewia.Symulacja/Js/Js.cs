using System;
using System.Collections;
using System.Collections.Generic;

namespace Trzewia.Js
{
    /// <summary>
    /// Zachowania JavaScriptu (V8), od których zależy, czy symulacja w C# liczy dokładnie to samo co w TS.
    /// Kod symulacji przeniesiony z TS woła te funkcje zamiast Math.* z .NET wszędzie tam, gdzie wynik mógłby się
    /// różnić choćby ostatnim bitem (PLAN.md, punkt 3.5).
    /// </summary>
    public static class Js
    {
        /// <summary>Liczba w napisie jak `${x}` / String(x) w JS (NaN, Infinity — słownie).</summary>
        public static string S(double x) =>
            double.IsNaN(x) ? "NaN" : double.IsPositiveInfinity(x) ? "Infinity" : double.IsNegativeInfinity(x) ? "-Infinity" : Trzewia.Rdzen.Json.Liczba(x);

        /// <summary>Prawdziwość liczby w JS: 0 i NaN to fałsz.</summary>
        public static bool Tak(double x) => x != 0 && !double.IsNaN(x);
        public static bool Tak(double? x) => x != null && x.Value != 0 && !double.IsNaN(x.Value);

        /// <summary>arr[i] w JS: poza zakresem albo ułamkowy indeks — undefined (tu null).</summary>
        public static double? At(System.Collections.Generic.IReadOnlyList<double>? l, double i)
        {
            if (l == null) return null;
            int k = (int)i;
            return k == i && k >= 0 && k < l.Count ? l[k] : (double?)null;
        }
        public static T? At<T>(System.Collections.Generic.IReadOnlyList<T>? l, double i) where T : class
        {
            if (l == null) return null;
            int k = (int)i;
            return k == i && k >= 0 && k < l.Count ? l[k] : null;
        }

        /// <summary>arr.indexOf(v, od) z JS (od poza zakresem — -1, bez wyjątku).</summary>
        public static int IndexOf(System.Collections.Generic.List<double> l, double v, double od = 0)
        {
            int k = od < 0 ? Math.Max(0, l.Count + (int)Math.Ceiling(od)) : (int)Math.Min(od, l.Count);
            if (k >= l.Count) return -1;
            return l.IndexOf(v, k);
        }

        /// <summary>x.toFixed(f) z JS (tylko do napisów w dzienniku; połówki w górę jak w JS).</summary>
        public static string ToFixed(double x, int f)
        {
            if (double.IsNaN(x)) return "NaN";
            if (double.IsInfinity(x)) return x > 0 ? "Infinity" : "-Infinity";
            if (Math.Abs(x) >= 1e21) return S(x);
            var d = Math.Round((decimal)x, f, MidpointRounding.AwayFromZero);
            return d.ToString("F" + f, System.Globalization.CultureInfo.InvariantCulture);
        }

        public static double Sin(double x) => JsMath.Sin(x);
        public static double Cos(double x) => JsMath.Cos(x);
        public static double Atan2(double y, double x) => JsMath.Atan2(y, x);

        /// <summary>
        /// Math.hypot jak w V8 (builtins/math.tq): największa wartość bezwzględna, dzielenie przez nią i suma kwadratów
        /// z kompensacją Kahana — inaczej niż hypot z biblioteki C.
        /// </summary>
        public static double Hypot(double a, double b)
        {
            if (double.IsNaN(a) || double.IsNaN(b))
            {
                if (double.IsInfinity(a) || double.IsInfinity(b)) return double.PositiveInfinity;
                return double.NaN;
            }
            double aa = Math.Abs(a), ab = Math.Abs(b);
            double max = aa > ab ? aa : ab;
            if (double.IsPositiveInfinity(max)) return double.PositiveInfinity;
            if (max == 0) return 0;
            double sum = 0, kompensacja = 0;
            double n = aa / max, skladnik = n * n - kompensacja, wstepna = sum + skladnik;
            kompensacja = (wstepna - sum) - skladnik;
            sum = wstepna;
            n = ab / max; skladnik = n * n - kompensacja; wstepna = sum + skladnik;
            sum = wstepna;
            return Math.Sqrt(sum) * max;
        }

        /// <summary>Math.hypot z dowolną liczbą argumentów (ten sam algorytm co dla dwóch).</summary>
        public static double Hypot(params double[] w)
        {
            if (w.Length == 0) return 0;
            bool nan = false; double max = 0;
            var abs = new double[w.Length];
            for (int i = 0; i < w.Length; i++)
            {
                if (double.IsNaN(w[i])) { nan = true; continue; }
                abs[i] = Math.Abs(w[i]);
                if (abs[i] > max) max = abs[i];
            }
            if (double.IsPositiveInfinity(max)) return double.PositiveInfinity;
            if (nan) return double.NaN;
            if (max == 0) return 0;
            double sum = 0, kompensacja = 0;
            for (int i = 0; i < abs.Length; i++)
            {
                double n = abs[i] / max, skladnik = n * n - kompensacja, wstepna = sum + skladnik;
                kompensacja = (wstepna - sum) - skladnik;
                sum = wstepna;
            }
            return Math.Sqrt(sum) * max;
        }

        /// <summary>Math.round jak w V8 (Float64Round): zaokrąglenie w górę i cofnięcie, gdy przeskoczyło o więcej niż ½.</summary>
        public static double Round(double x)
        {
            double r = Math.Ceiling(x);
            return r - 0.5 <= x ? r : r - 1.0;
        }

        /// <summary>Math.sign: −1, +1, ±0 albo NaN (Math.Sign z .NET rzuca wyjątek przy NaN i zwraca int).</summary>
        public static double Sign(double x) => x > 0 ? 1 : x < 0 ? -1 : x;

        /// <summary>x | 0 i każda operacja bitowa: ucięcie do całkowitej i zawinięcie modulo 2^32 (ToInt32).</summary>
        public static int ToInt32(double x)
        {
            if (x > -2147483649.0 && x < 2147483648.0) return (int)x;          // szybka droga: (int) ucina do zera
            if (double.IsNaN(x) || double.IsInfinity(x)) return 0;
            double t = Math.Truncate(x);
            double m = t % 4294967296.0;
            if (m < 0) m += 4294967296.0;
            return unchecked((int)(uint)m);
        }

        /// <summary>x &gt;&gt;&gt; 0 (ToUint32).</summary>
        public static uint ToUint32(double x) => unchecked((uint)ToInt32(x));

        /// <summary>Math.imul: mnożenie 32-bitowe z zawinięciem.</summary>
        public static int Imul(int a, int b) => unchecked(a * b);

        /// <summary>ToInt16 (Int16Array), ToUint8 (Uint8Array).</summary>
        public static short ToInt16(double x) => unchecked((short)ToInt32(x));
        public static byte ToUint8(double x) => unchecked((byte)ToInt32(x));

        /// <summary>
        /// Array.prototype.sort(porównanie) jak w V8 Chromium 153 (third_party/v8/builtins/array-sort.tq, gałąź main
        /// z 11.2026): tablice krótsze niż 16 (JSArray::kMaxInlineSortLength) — wstawianie binarne od początku, z tą samą
        /// kolejnością wywołań porównania co w V8; to ważne przy porównaniu losowym (sim/ruiny.ts: () => rng.next() − 0.5),
        /// bo każde wywołanie zużywa liczbę losową. Dłuższe: V8 robi PowerSort (naturalne biegi, scalanie stabilne) — tu
        /// te same biegi i scalanie stabilne, więc przy spójnym porównaniu wynik jak w V8 (porównania losowego na długich
        /// tablicach gra nie ma). Uwaga: stary V8 (Node 22) sortował krótkie tablice inaczej (biegi + wstawianie).
        /// Wynik porównania NaN liczy się jak 0. Sortuje w miejscu i zwraca tę samą listę.
        /// </summary>
        public static List<T> Sort<T>(List<T> a, Func<T, T, double> porownaj)
        {
            int n = a.Count;
            if (n < 2) return a;
            double Por(T x, T y) { var v = porownaj(x, y); return double.IsNaN(v) ? 0 : v; }
            if (n < 16) { WstawianieBinarne(a, 0, 0, n, Por); return a; }

            int minRun = n;
            int r = 0;
            while (minRun >= 64) { r |= minRun & 1; minRun >>= 1; }
            minRun += r;

            var biegi = new List<(int od, int dl)>();
            int low = 0, pozostalo = n;
            while (pozostalo != 0)
            {
                int dl = Bieg(a, low, low + pozostalo, Por);
                if (dl < minRun)
                {
                    int wymuszony = Math.Min(minRun, pozostalo);
                    WstawianieBinarne(a, low, low + dl, low + wymuszony, Por);
                    dl = wymuszony;
                }
                biegi.Add((low, dl));
                low += dl;
                pozostalo -= dl;
            }
            // scalanie biegów od lewej, stabilnie
            while (biegi.Count > 1)
            {
                var nowe = new List<(int od, int dl)>();
                for (int i = 0; i < biegi.Count; i += 2)
                {
                    if (i + 1 == biegi.Count) { nowe.Add(biegi[i]); break; }
                    Scal(a, biegi[i].od, biegi[i].dl, biegi[i + 1].dl, Por);
                    nowe.Add((biegi[i].od, biegi[i].dl + biegi[i + 1].dl));
                }
                biegi = nowe;
            }
            return a;
        }

        /// <summary>V8 CountAndMakeRun: najdłuższy bieg rosnący (≤) albo ściśle malejący (&gt;), malejący odwrócony.</summary>
        static int Bieg<T>(List<T> a, int lowArg, int high, Func<T, T, double> por)
        {
            int low = lowArg + 1;
            if (low == high) return 1;
            int dl = 2;
            var elLow = a[low];
            var elPrzed = a[low - 1];
            double order = por(elLow, elPrzed);
            bool malejacy = order < 0;
            var poprzedni = elLow;
            for (int idx = low + 1; idx < high; ++idx)
            {
                var biezacy = a[idx];
                order = por(biezacy, poprzedni);
                if (malejacy) { if (order >= 0) break; }
                else { if (order < 0) break; }
                poprzedni = biezacy;
                ++dl;
            }
            if (malejacy) a.Reverse(lowArg, dl);
            return dl;
        }

        /// <summary>V8 BinaryInsertionSort: [low, start) już posortowane, wstawia resztę aż do high.</summary>
        static void WstawianieBinarne<T>(List<T> a, int low, int startArg, int high, Func<T, T, double> por)
        {
            int start = low == startArg ? startArg + 1 : startArg;
            for (; start < high; ++start)
            {
                int left = low, right = start;
                var pivot = a[start];
                while (left < right)
                {
                    int mid = left + ((right - left) >> 1);
                    double order = por(pivot, a[mid]);
                    if (order < 0) right = mid; else left = mid + 1;
                }
                for (int p = start; p > left; --p) a[p] = a[p - 1];
                a[left] = pivot;
            }
        }

        static void Scal<T>(List<T> a, int od, int dl1, int dl2, Func<T, T, double> por)
        {
            var lewa = a.GetRange(od, dl1);
            int i = 0, j = od + dl1, k = od, koniec = od + dl1 + dl2;
            while (i < lewa.Count && j < koniec)
            {
                // równe — najpierw z lewej (stabilnie)
                if (por(a[j], lewa[i]) < 0) a[k++] = a[j++];
                else a[k++] = lewa[i++];
            }
            while (i < lewa.Count) a[k++] = lewa[i++];
        }
    }

    /// <summary>
    /// Map z JavaScriptu: kolejność przeglądania = kolejność dodania, usunięty klucz dodany znowu idzie na koniec.
    /// Dictionary z .NET po usunięciu wstawia nowe klucze w zwolnione miejsca — przeglądanie szłoby w innej kolejności.
    /// </summary>
    public sealed class JsMap<K, V> : IEnumerable<KeyValuePair<K, V>> where K : notnull
    {
        sealed class Wpis { public K k = default!; public V v = default!; public bool usuniety; }

        readonly Dictionary<K, Wpis> slownik = new Dictionary<K, Wpis>();
        readonly List<Wpis> wpisy = new List<Wpis>();
        int przegladow, dziur;

        public int size => slownik.Count;
        public bool has(K k) => slownik.ContainsKey(k);

        public V get(K k) => slownik.TryGetValue(k, out var w) ? w.v : default!;
        /// <summary>map.get(k) ?? d — brak klucza (undefined) daje `d`.</summary>
        public V getOr(K k, V d) => slownik.TryGetValue(k, out var w) ? w.v : d;
        public bool TryGet(K k, out V v)
        {
            if (slownik.TryGetValue(k, out var w)) { v = w.v; return true; }
            v = default!; return false;
        }

        public JsMap<K, V> set(K k, V v)
        {
            if (slownik.TryGetValue(k, out var w)) w.v = v;
            else { w = new Wpis { k = k, v = v }; slownik[k] = w; wpisy.Add(w); }
            return this;
        }

        public bool delete(K k)
        {
            if (!slownik.TryGetValue(k, out var w)) return false;
            w.usuniety = true;
            slownik.Remove(k);
            dziur++;
            Uprzataj();
            return true;
        }

        public void clear()
        {
            foreach (var w in wpisy) w.usuniety = true;
            dziur = wpisy.Count;
            slownik.Clear();
            Uprzataj();
        }

        /// <summary>Usunięte wpisy wyrzuca z listy dopiero, gdy nikt jej nie przegląda (jak tablica V8 po przejściu).</summary>
        void Uprzataj()
        {
            if (przegladow > 0 || dziur == 0) return;
            if (dziur == wpisy.Count) wpisy.Clear();
            else if (dziur * 2 >= wpisy.Count) wpisy.RemoveAll(w => w.usuniety);
            else return;
            dziur = 0;
        }

        /// <summary>
        /// Przeglądanie jak for…of po Map w JS: widzi wpisy dodane w trakcie (na końcu), pomija usunięte w trakcie,
        /// a zmiana wartości już istniejącego klucza nie przesuwa go.
        /// </summary>
        public IEnumerator<KeyValuePair<K, V>> GetEnumerator()
        {
            przegladow++;
            try
            {
                for (int i = 0; i < wpisy.Count; i++)
                {
                    var w = wpisy[i];
                    if (!w.usuniety) yield return new KeyValuePair<K, V>(w.k, w.v);
                }
            }
            finally { przegladow--; Uprzataj(); }
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        public IEnumerable<K> keys() { foreach (var p in this) yield return p.Key; }
        public IEnumerable<V> values() { foreach (var p in this) yield return p.Value; }
    }

    /// <summary>Set z JavaScriptu — kolejność dodania, jak JsMap.</summary>
    public sealed class JsSet<T> : IEnumerable<T> where T : notnull
    {
        readonly JsMap<T, bool> m = new JsMap<T, bool>();
        public JsSet() { }
        public JsSet(IEnumerable<T> z) { foreach (var x in z) m.set(x, true); }
        public int size => m.size;
        public bool has(T x) => m.has(x);
        public JsSet<T> add(T x) { if (!m.has(x)) m.set(x, true); return this; }
        public bool delete(T x) => m.delete(x);
        public void clear() => m.clear();
        public IEnumerator<T> GetEnumerator() => m.keys().GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    // ───────────────────────────── tablice typowane ─────────────────────────────
    // Odczyt zawsze jako double (jak w JS — inaczej dzielenie dwóch wartości z Uint8Array w C# byłoby całkowite),
    // zapis z konwersją jak w JS (Float32 — zaokrąglenie do float, Uint8/Int16/Int32/Uint32 — ucięcie i zawinięcie).
    // Odczyt poza zakresem w JS daje undefined (NaN w rachunkach) — tu NaN; zapis poza zakresem jest pomijany.

    public sealed class Float32Array
    {
        public readonly float[] d;
        public Float32Array(int n) { d = new float[n]; }
        public int length => d.Length;
        public double this[int i]
        {
            get => (uint)i < (uint)d.Length ? d[i] : double.NaN;
            set { if ((uint)i < (uint)d.Length) d[i] = (float)value; }
        }
        /// <summary>Indeks jak w JS: ułamkowy albo poza zakresem — odczyt NaN (undefined), zapis pomijany.</summary>
        public double this[double i]
        {
            get { int k = (int)i; return k == i && (uint)k < (uint)d.Length ? d[k] : double.NaN; }
            set { int k = (int)i; if (k == i && (uint)k < (uint)d.Length) d[k] = (float)value; }
        }
        public void fill(double v) { var f = (float)v; for (int i = 0; i < d.Length; i++) d[i] = f; }
    }

    public sealed class Uint8Array
    {
        public readonly byte[] d;
        public Uint8Array(int n) { d = new byte[n]; }
        public Uint8Array(byte[] z) { d = z; }
        public int length => d.Length;
        public double this[int i]
        {
            get => (uint)i < (uint)d.Length ? d[i] : double.NaN;
            set { if ((uint)i < (uint)d.Length) d[i] = Js.ToUint8(value); }
        }
        /// <summary>Indeks jak w JS: ułamkowy albo poza zakresem — odczyt NaN (undefined), zapis pomijany.</summary>
        public double this[double i]
        {
            get { int k = (int)i; return k == i && (uint)k < (uint)d.Length ? d[k] : double.NaN; }
            set { int k = (int)i; if (k == i && (uint)k < (uint)d.Length) d[k] = Js.ToUint8(value); }
        }
        public void fill(double v) { var b = Js.ToUint8(v); for (int i = 0; i < d.Length; i++) d[i] = b; }
        public void set(Uint8Array z) => Array.Copy(z.d, d, Math.Min(z.d.Length, d.Length));
    }

    public sealed class Int16Array
    {
        public readonly short[] d;
        public Int16Array(int n) { d = new short[n]; }
        public int length => d.Length;
        public double this[int i]
        {
            get => (uint)i < (uint)d.Length ? d[i] : double.NaN;
            set { if ((uint)i < (uint)d.Length) d[i] = Js.ToInt16(value); }
        }
        /// <summary>Indeks jak w JS: ułamkowy albo poza zakresem — odczyt NaN (undefined), zapis pomijany.</summary>
        public double this[double i]
        {
            get { int k = (int)i; return k == i && (uint)k < (uint)d.Length ? d[k] : double.NaN; }
            set { int k = (int)i; if (k == i && (uint)k < (uint)d.Length) d[k] = Js.ToInt16(value); }
        }
        public void fill(double v) { var b = Js.ToInt16(v); for (int i = 0; i < d.Length; i++) d[i] = b; }
    }

    public sealed class Int32Array
    {
        public readonly int[] d;
        public Int32Array(int n) { d = new int[n]; }
        public int length => d.Length;
        public double this[int i]
        {
            get => (uint)i < (uint)d.Length ? d[i] : double.NaN;
            set { if ((uint)i < (uint)d.Length) d[i] = Js.ToInt32(value); }
        }
        /// <summary>Indeks jak w JS: ułamkowy albo poza zakresem — odczyt NaN (undefined), zapis pomijany.</summary>
        public double this[double i]
        {
            get { int k = (int)i; return k == i && (uint)k < (uint)d.Length ? d[k] : double.NaN; }
            set { int k = (int)i; if (k == i && (uint)k < (uint)d.Length) d[k] = Js.ToInt32(value); }
        }
        public void fill(double v) { var b = Js.ToInt32(v); for (int i = 0; i < d.Length; i++) d[i] = b; }
    }

    public sealed class Uint32Array
    {
        public readonly uint[] d;
        public Uint32Array(int n) { d = new uint[n]; }
        public int length => d.Length;
        public double this[int i]
        {
            get => (uint)i < (uint)d.Length ? d[i] : double.NaN;
            set { if ((uint)i < (uint)d.Length) d[i] = Js.ToUint32(value); }
        }
        /// <summary>Indeks jak w JS: ułamkowy albo poza zakresem — odczyt NaN (undefined), zapis pomijany.</summary>
        public double this[double i]
        {
            get { int k = (int)i; return k == i && (uint)k < (uint)d.Length ? d[k] : double.NaN; }
            set { int k = (int)i; if (k == i && (uint)k < (uint)d.Length) d[k] = Js.ToUint32(value); }
        }
        public void fill(double v) { var b = Js.ToUint32(v); for (int i = 0; i < d.Length; i++) d[i] = b; }
    }
}
