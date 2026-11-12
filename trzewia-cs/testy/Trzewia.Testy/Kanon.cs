using System.Collections;
using System.Globalization;
using System.Reflection;
using System.Text;
using Trzewia.Js;
using Trzewia.Rdzen;

namespace Trzewia.Testy;

/// <summary>
/// Kanoniczny zapis stanu symulacji — ten sam co w narzedzia/wzorce/stan.ts (TS liczy go w Chromium). Obiekty: pola
/// publiczne po nazwie (posortowane), bez null; JsMap — lista par; słowniki — obiekty; tablice typowane dłuższe niż 64 —
/// skrót FNV-1a; Rng — jego stan; liczby — jak String(x) w JS.
/// </summary>
public static class Kanon
{
    static readonly HashSet<string> POMIN = new() { "byId", "hash", "zajete", "hashW", "hashH", "CELL", "pozWpisu", "fungusList", "podsumowanie", "noise", "ziarno", "flip", "slowaKafli" };

    static uint Fnv32(Func<int, double> el, int n)
    {
        uint h = 0x811c9dc5;
        for (int i = 0; i < n; i++)
        {
            int v = Trzewia.Js.Js.ToInt32(el(i));
            for (int b = 0; b < 4; b++) { h ^= (uint)((v >> (8 * b)) & 255); h = unchecked(h * 0x01000193); }
        }
        return h;
    }

    static string Liczba(double x) =>
        double.IsNaN(x) ? "\"NaN\"" : double.IsPositiveInfinity(x) ? "\"Infinity\"" : double.IsNegativeInfinity(x) ? "\"-Infinity\"" : Json.Liczba(x);

    static string Napis(string s)
    {
        var sb = new StringBuilder("\"");
        foreach (var ch in s)
        {
            switch (ch)
            {
                case '"': sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (ch < 0x20) sb.Append("\\u").Append(((int)ch).ToString("x4", CultureInfo.InvariantCulture));
                    else sb.Append(ch);
                    break;
            }
        }
        return sb.Append('"').ToString();
    }

    static string Tablica(Func<int, double> el, int n)
    {
        if (n > 64) return $"\"#{n}:{Fnv32(el, n)}\"";
        var sb = new StringBuilder("[");
        for (int i = 0; i < n; i++) { if (i > 0) sb.Append(','); sb.Append(Liczba(el(i))); }
        return sb.Append(']').ToString();
    }

    public static string Zapisz(object? v)
    {
        var sb = new StringBuilder();
        Pisz(sb, v);
        return sb.ToString();
    }

    static void Pisz(StringBuilder sb, object? v)
    {
        switch (v)
        {
            case null: sb.Append("null"); return;
            case double d: sb.Append(Liczba(d)); return;
            case float f: sb.Append(Liczba(f)); return;
            case int i: sb.Append(Liczba(i)); return;
            case uint u: sb.Append(Liczba(u)); return;
            case long l: sb.Append(Liczba(l)); return;
            case bool b: sb.Append(b ? "true" : "false"); return;
            case string s: sb.Append(Napis(s)); return;
            case Uint8Array a: sb.Append(Tablica(i => a[i], a.length)); return;
            case Int16Array a: sb.Append(Tablica(i => a[i], a.length)); return;
            case Int32Array a: sb.Append(Tablica(i => a[i], a.length)); return;
            case Uint32Array a: sb.Append(Tablica(i => a[i], a.length)); return;
            case Float32Array a: sb.Append(Tablica(i => a[i], a.length)); return;
            case Rng r: sb.Append(Liczba(r.Stan)); return;
            case Delegate: sb.Append("null"); return;
        }
        var typ = v.GetType();
        if (typ.IsGenericType && typ.GetGenericTypeDefinition() == typeof(JsMap<,>))
        {
            sb.Append('[');
            var pierwszy = true;
            foreach (var kv in (IEnumerable)v)
            {
                var t = kv.GetType();
                if (!pierwszy) sb.Append(',');
                pierwszy = false;
                sb.Append('[');
                Pisz(sb, t.GetProperty("Key")!.GetValue(kv));
                sb.Append(',');
                Pisz(sb, t.GetProperty("Value")!.GetValue(kv));
                sb.Append(']');
            }
            sb.Append(']');
            return;
        }
        if (v is IDictionary slownik)
        {
            var wpisy = new List<(string k, object? w)>();
            foreach (DictionaryEntry e in slownik)
            {
                if (e.Value == null) continue;
                var k = e.Key is double dk ? Json.Liczba(dk) : Convert.ToString(e.Key, CultureInfo.InvariantCulture)!;
                if (POMIN.Contains(k)) continue;   // jak w TS: słownik to zwykły obiekt, a obiekty pomijają te klucze
                wpisy.Add((k, e.Value));
            }
            wpisy.Sort((a, b) => string.CompareOrdinal(a.k, b.k));
            sb.Append('{');
            for (int i = 0; i < wpisy.Count; i++) { if (i > 0) sb.Append(','); sb.Append(Napis(wpisy[i].k)).Append(':'); Pisz(sb, wpisy[i].w); }
            sb.Append('}');
            return;
        }
        if (v is IEnumerable lista)
        {
            sb.Append('[');
            var pierwszy = true;
            foreach (var x in lista) { if (!pierwszy) sb.Append(','); pierwszy = false; Pisz(sb, x); }
            sb.Append(']');
            return;
        }
        // obiekt: pola publiczne
        var pola = new List<(string n, object w)>();
        foreach (var p in typ.GetFields(BindingFlags.Public | BindingFlags.Instance))
        {
            if (POMIN.Contains(p.Name)) continue;
            var w = p.GetValue(v);
            if (w == null || w is Delegate) continue;
            pola.Add((p.Name, w));
        }
        pola.Sort((a, b) => string.CompareOrdinal(a.n, b.n));
        sb.Append('{');
        for (int i = 0; i < pola.Count; i++) { if (i > 0) sb.Append(','); sb.Append(Napis(pola[i].n)).Append(':'); Pisz(sb, pola[i].w); }
        sb.Append('}');
    }

    /// <summary>Pierwsze miejsca (ścieżki), w których dwa kanoniczne zapisy się różnią.</summary>
    public static List<string> Roznice(string a, string b, int ile = 12)
    {
        var wynik = new List<string>();
        using var da = System.Text.Json.JsonDocument.Parse(a);
        using var db = System.Text.Json.JsonDocument.Parse(b);
        Porownaj(da.RootElement, db.RootElement, "", wynik, ile);
        return wynik;
    }

    static void Porownaj(System.Text.Json.JsonElement a, System.Text.Json.JsonElement b, string sciezka, List<string> wynik, int ile)
    {
        if (wynik.Count >= ile) return;
        if (a.ValueKind != b.ValueKind) { wynik.Add($"{sciezka}: TS {Skrot(a)} / C# {Skrot(b)}"); return; }
        switch (a.ValueKind)
        {
            case System.Text.Json.JsonValueKind.Object:
            {
                var ka = a.EnumerateObject().Select(p => p.Name).ToList();
                var kb = b.EnumerateObject().Select(p => p.Name).ToList();
                foreach (var k in ka.Except(kb)) { if (wynik.Count >= ile) return; wynik.Add($"{sciezka}.{k}: tylko w TS = {Skrot(a.GetProperty(k))}"); }
                foreach (var k in kb.Except(ka)) { if (wynik.Count >= ile) return; wynik.Add($"{sciezka}.{k}: tylko w C# = {Skrot(b.GetProperty(k))}"); }
                foreach (var k in ka.Intersect(kb)) Porownaj(a.GetProperty(k), b.GetProperty(k), $"{sciezka}.{k}", wynik, ile);
                return;
            }
            case System.Text.Json.JsonValueKind.Array:
            {
                var la = a.GetArrayLength(); var lb = b.GetArrayLength();
                if (la != lb) wynik.Add($"{sciezka}: długość TS {la} / C# {lb}");
                for (int i = 0; i < Math.Min(la, lb); i++) Porownaj(a[i], b[i], $"{sciezka}[{i}]", wynik, ile);
                return;
            }
            default:
                if (a.GetRawText() != b.GetRawText()) wynik.Add($"{sciezka}: TS {a.GetRawText()} / C# {b.GetRawText()}");
                return;
        }
    }

    static string Skrot(System.Text.Json.JsonElement e)
    {
        var t = e.GetRawText();
        return t.Length > 120 ? t.Substring(0, 120) + "…" : t;
    }
}
