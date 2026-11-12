using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Trzewia.Rdzen
{
    /// <summary>
    /// Mały JSON bez bibliotek (Unity i Godot nie muszą nic doinstalowywać): czytanie do słowników i list,
    /// pisanie z liczbami jak w JavaScripcie (1.5, 1e+21) — ustawienia, klawisze, a od etapu 2 zapis gry
    /// w formacie core/save.ts. Obiekt: Dictionary&lt;string, object?&gt; (kolejność kluczy jak w pliku),
    /// tablica: List&lt;object?&gt;, liczba: double, napis: string, true/false: bool, null: null.
    /// </summary>
    public static class Json
    {
        public static object? Czytaj(string tekst)
        {
            int i = 0;
            var w = Wartosc(tekst, ref i);
            Biale(tekst, ref i);
            if (i != tekst.Length) throw new FormatException($"JSON: nadmiarowe znaki na pozycji {i}");
            return w;
        }

        static void Biale(string s, ref int i) { while (i < s.Length && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r')) i++; }

        static object? Wartosc(string s, ref int i)
        {
            Biale(s, ref i);
            if (i >= s.Length) throw new FormatException("JSON: nagły koniec");
            char c = s[i];
            if (c == '{')
            {
                var d = new Dictionary<string, object?>();
                i++;
                Biale(s, ref i);
                if (s[i] == '}') { i++; return d; }
                while (true)
                {
                    Biale(s, ref i);
                    var k = Napis(s, ref i);
                    Biale(s, ref i);
                    if (s[i++] != ':') throw new FormatException($"JSON: brak „:” na pozycji {i}");
                    d[k] = Wartosc(s, ref i);
                    Biale(s, ref i);
                    if (s[i] == ',') { i++; continue; }
                    if (s[i] == '}') { i++; return d; }
                    throw new FormatException($"JSON: oczekiwano „,” albo „}}” na pozycji {i}");
                }
            }
            if (c == '[')
            {
                var l = new List<object?>();
                i++;
                Biale(s, ref i);
                if (s[i] == ']') { i++; return l; }
                while (true)
                {
                    l.Add(Wartosc(s, ref i));
                    Biale(s, ref i);
                    if (s[i] == ',') { i++; continue; }
                    if (s[i] == ']') { i++; return l; }
                    throw new FormatException($"JSON: oczekiwano „,” albo „]” na pozycji {i}");
                }
            }
            if (c == '"') return Napis(s, ref i);
            if (s.Length - i >= 4 && string.CompareOrdinal(s, i, "true", 0, 4) == 0) { i += 4; return true; }
            if (s.Length - i >= 5 && string.CompareOrdinal(s, i, "false", 0, 5) == 0) { i += 5; return false; }
            if (s.Length - i >= 4 && string.CompareOrdinal(s, i, "null", 0, 4) == 0) { i += 4; return null; }
            int od = i;
            while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
            if (od == i) throw new FormatException($"JSON: niezrozumiały znak „{c}” na pozycji {i}");
            return double.Parse(s.Substring(od, i - od), NumberStyles.Float, CultureInfo.InvariantCulture);
        }

        static string Napis(string s, ref int i)
        {
            if (s[i] != '"') throw new FormatException($"JSON: oczekiwano napisu na pozycji {i}");
            i++;
            var sb = new StringBuilder();
            while (s[i] != '"')
            {
                char c = s[i++];
                if (c != '\\') { sb.Append(c); continue; }
                char e = s[i++];
                switch (e)
                {
                    case 'n': sb.Append('\n'); break;
                    case 't': sb.Append('\t'); break;
                    case 'r': sb.Append('\r'); break;
                    case 'b': sb.Append('\b'); break;
                    case 'f': sb.Append('\f'); break;
                    case 'u': sb.Append((char)Convert.ToInt32(s.Substring(i, 4), 16)); i += 4; break;
                    default: sb.Append(e); break;
                }
            }
            i++;
            return sb.ToString();
        }

        /// <summary>Pisze wartość (słownik, lista, liczba, napis, bool, null) jak JSON.stringify(w, null, wciecie).</summary>
        public static string Pisz(object? w, int wciecie = 0)
        {
            var sb = new StringBuilder();
            Pisz(sb, w, wciecie, 0);
            return sb.ToString();
        }

        static void Pisz(StringBuilder sb, object? w, int wc, int poziom)
        {
            switch (w)
            {
                case null: sb.Append("null"); return;
                case bool b: sb.Append(b ? "true" : "false"); return;
                case string s: NapisJson(sb, s); return;
                case double d: sb.Append(Liczba(d)); return;
                case float f: sb.Append(Liczba(f)); return;
                case int n: sb.Append(n.ToString(CultureInfo.InvariantCulture)); return;
                case long n: sb.Append(Liczba(n)); return;
                case IDictionary<string, object?> d:
                    {
                        sb.Append('{');
                        bool pierwszy = true;
                        foreach (var kv in d)
                        {
                            if (!pierwszy) sb.Append(',');
                            pierwszy = false;
                            Nowa(sb, wc, poziom + 1);
                            NapisJson(sb, kv.Key);
                            sb.Append(wc > 0 ? ": " : ":");
                            Pisz(sb, kv.Value, wc, poziom + 1);
                        }
                        if (!pierwszy) Nowa(sb, wc, poziom);
                        sb.Append('}');
                        return;
                    }
                case System.Collections.IEnumerable l:
                    {
                        sb.Append('[');
                        bool pierwszy = true;
                        foreach (var x in l)
                        {
                            if (!pierwszy) sb.Append(',');
                            pierwszy = false;
                            Nowa(sb, wc, poziom + 1);
                            Pisz(sb, x, wc, poziom + 1);
                        }
                        if (!pierwszy) Nowa(sb, wc, poziom);
                        sb.Append(']');
                        return;
                    }
                default: throw new ArgumentException($"JSON: nie umiem zapisać {w.GetType().Name}");
            }
        }

        static void Nowa(StringBuilder sb, int wc, int poziom)
        {
            if (wc <= 0) return;
            sb.Append('\n').Append(' ', wc * poziom);
        }

        static void NapisJson(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (var c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    default:
                        if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        else sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
        }

        /// <summary>Liczba jak String(x) w JavaScripcie: najkrótszy zapis, wykładnik od 1e21 i poniżej 1e-6.</summary>
        public static string Liczba(double x)
        {
            if (double.IsNaN(x) || double.IsInfinity(x)) return "null";   // JSON.stringify(NaN) → null
            if (x == 0) return "0";
            var r = x.ToString("R", CultureInfo.InvariantCulture);
            // rozbiór na cyfry i wykładnik dziesiętny, potem zapis według reguł Number.prototype.toString
            bool minus = r[0] == '-';
            if (minus) r = r.Substring(1);
            int e = 0;
            int ei = r.IndexOfAny(new[] { 'E', 'e' });
            if (ei >= 0) { e = int.Parse(r.Substring(ei + 1), CultureInfo.InvariantCulture); r = r.Substring(0, ei); }
            int kropka = r.IndexOf('.');
            string cyfry = kropka >= 0 ? r.Remove(kropka, 1) : r;
            int n = (kropka >= 0 ? kropka : r.Length) + e;   // pozycja kropki względem cyfr
            int zera = 0;
            while (zera < cyfry.Length - 1 && cyfry[zera] == '0') zera++;
            cyfry = cyfry.Substring(zera); n -= zera;
            cyfry = cyfry.TrimEnd('0');
            if (cyfry.Length == 0) return "0";
            int k = cyfry.Length;
            var sb = new StringBuilder();
            if (minus) sb.Append('-');
            if (k <= n && n <= 21) sb.Append(cyfry).Append('0', n - k);
            else if (0 < n && n <= 21) sb.Append(cyfry, 0, n).Append('.').Append(cyfry, n, k - n);
            else if (-6 < n && n <= 0) sb.Append("0.").Append('0', -n).Append(cyfry);
            else
            {
                sb.Append(cyfry[0]);
                if (k > 1) sb.Append('.').Append(cyfry, 1, k - 1);
                sb.Append('e').Append(n - 1 >= 0 ? "+" : "-").Append(Math.Abs(n - 1).ToString(CultureInfo.InvariantCulture));
            }
            return sb.ToString();
        }
    }
}
