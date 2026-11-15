using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Trzewia.Rdzen;

namespace Trzewia.Nastawy
{
    /// <summary>
    /// Liczby gry z plików (decyzja użytkownika 9.11: „mają mieć możliwość nadmiany”). Domyślne są w kodzie
    /// (Nastawy/*.cs, wygenerowane z TS); przy starcie gra czyta dane/nastawy/&lt;plik&gt;.json, jeśli jest — tylko
    /// wpisane w nim liczby zastępują te z kodu. Nazwy jak w kodzie gry: { "SWIAT": { "jaskinie": { "prog": 0.65 } } }.
    /// Literówka albo zły typ: liczba zostaje z kodu, a do listy ostrzeżeń trafia, co się nie zgadza.
    /// `Trzewia.exe --wypisz-nastawy` zapisuje wszystkie obecne liczby jako punkt wyjścia do zmian.
    /// Testy złote i testy balansu chodzą zawsze na liczbach z kodu.
    /// </summary>
    public static class NastawyJson
    {
        /// <summary>Wszystkie nastawy jednego pliku jako JSON (z wcięciami).</summary>
        public static string Wypisz(Type plik)
        {
            var d = new Dictionary<string, object?>();
            // pola tylko do odczytu to typy z TS (listy dozwolonych napisów), nie liczby gry
            foreach (var f in plik.GetFields(BindingFlags.Public | BindingFlags.Static))
                if (!f.IsInitOnly && !f.IsLiteral) d[f.Name] = DoModelu(f.GetValue(null));
            return Json.Pisz(d, 2);
        }

        /// <summary>Nakłada liczby z JSON na nastawy pliku. Zwraca ostrzeżenia (puste — wszystko się zgadza).</summary>
        public static List<string> Wczytaj(Type plik, string json, string nazwaPliku)
        {
            var ostrzezenia = new List<string>();
            object? korzen;
            try { korzen = Json.Czytaj(json); }
            catch (Exception e) { ostrzezenia.Add($"{nazwaPliku}: nieczytelny JSON ({e.Message}) — liczby z kodu"); return ostrzezenia; }
            if (!(korzen is Dictionary<string, object?> d)) { ostrzezenia.Add($"{nazwaPliku}: oczekiwano obiektu"); return ostrzezenia; }
            foreach (var kv in d)
            {
                var f = plik.GetField(kv.Key, BindingFlags.Public | BindingFlags.Static);
                if (f == null || f.IsLiteral || f.IsInitOnly) { ostrzezenia.Add($"{nazwaPliku}: nie ma nastawy „{kv.Key}”"); continue; }
                var stara = f.GetValue(null);
                if (Naloz(f.FieldType, stara, kv.Value, $"{nazwaPliku}: {kv.Key}", ostrzezenia, out var nowa) && !f.IsInitOnly) f.SetValue(null, nowa);
            }
            return ostrzezenia;
        }

        /// <summary>Czyta wszystkie pliki z folderu (dane/nastawy); przez czytnik gospodarza, żeby działało też w silniku.</summary>
        public static List<string> WczytajWszystkie(Func<string, string?> czytaj)
        {
            var ost = new List<string>();
            foreach (var p in Rejestr.Pliki)
            {
                var t = czytaj($"nastawy/{p.Key}.json");
                if (t != null) ost.AddRange(Wczytaj(p.Value, t, p.Key + ".json"));
            }
            return ost;
        }

        static bool IsKlasa(Type t) => t.IsClass && t != typeof(string);

        static object? DoModelu(object? v)
        {
            switch (v)
            {
                case null: return null;
                case double or bool or string: return v;
                case int i: return (double)i;
                case IDictionary slownik:
                    {
                        var d = new Dictionary<string, object?>();
                        foreach (DictionaryEntry e in slownik) d[Convert.ToString(e.Key, System.Globalization.CultureInfo.InvariantCulture)!] = DoModelu(e.Value);
                        return d;
                    }
                case Array a:
                    {
                        var l = new List<object?>();
                        foreach (var x in a) l.Add(DoModelu(x));
                        return l;
                    }
                default:
                    {
                        var d = new Dictionary<string, object?>();
                        foreach (var f in v.GetType().GetFields(BindingFlags.Public | BindingFlags.Instance))
                        {
                            var w = f.GetValue(v);
                            if (w != null) d[f.Name] = DoModelu(w);
                        }
                        return d;
                    }
            }
        }

        /// <summary>Nowa wartość typu t z JSON (dla obiektów — nakłada na starą). Fałsz — nic nie zmieniać.</summary>
        static bool Naloz(Type t, object? stara, object? json, string gdzie, List<string> ost, out object? nowa)
        {
            nowa = stara;
            var podstawowy = Nullable.GetUnderlyingType(t) ?? t;
            if (json == null)
            {
                if (Nullable.GetUnderlyingType(t) != null || !t.IsValueType) { nowa = null; return true; }
                ost.Add($"{gdzie}: null w miejscu liczby"); return false;
            }
            if (podstawowy == typeof(double))
            {
                if (json is double x) { nowa = x; return true; }
                ost.Add($"{gdzie}: oczekiwano liczby"); return false;
            }
            if (podstawowy == typeof(bool))
            {
                if (json is bool b) { nowa = b; return true; }
                ost.Add($"{gdzie}: oczekiwano true/false"); return false;
            }
            if (t == typeof(string))
            {
                if (json is string s) { nowa = s; return true; }
                ost.Add($"{gdzie}: oczekiwano napisu"); return false;
            }
            if (t.IsArray)
            {
                if (!(json is List<object?> l)) { ost.Add($"{gdzie}: oczekiwano tablicy"); return false; }
                var el = t.GetElementType()!;
                var a = Array.CreateInstance(el, l.Count);
                var staraTab = stara as Array;
                for (int i = 0; i < l.Count; i++)
                {
                    var poprzedni = staraTab != null && i < staraTab.Length ? staraTab.GetValue(i) : (IsKlasa(el) && el.GetConstructor(Type.EmptyTypes) != null ? Activator.CreateInstance(el) : null);
                    if (!Naloz(el, poprzedni, l[i], $"{gdzie}[{i}]", ost, out var w)) return false;
                    a.SetValue(w, i);
                }
                nowa = a; return true;
            }
            if (t.IsGenericType && t.GetGenericTypeDefinition() == typeof(Dictionary<,>))
            {
                if (!(json is Dictionary<string, object?> jd)) { ost.Add($"{gdzie}: oczekiwano obiektu"); return false; }
                var args = t.GetGenericArguments();
                var slownik = (IDictionary)(stara ?? Activator.CreateInstance(t)!);
                foreach (var kv in jd)
                {
                    object klucz = args[0] == typeof(int) ? (object)int.Parse(kv.Key) : kv.Key;
                    var poprzedni = slownik.Contains(klucz) ? slownik[klucz] : null;
                    if (Naloz(args[1], poprzedni, kv.Value, $"{gdzie}.{kv.Key}", ost, out var w)) slownik[klucz] = w;
                }
                nowa = slownik; return true;
            }
            if (IsKlasa(t))
            {
                if (!(json is Dictionary<string, object?> jd)) { ost.Add($"{gdzie}: oczekiwano obiektu"); return false; }
                var obiekt = stara ?? Activator.CreateInstance(t)!;
                foreach (var kv in jd)
                {
                    var f = t.GetField(kv.Key, BindingFlags.Public | BindingFlags.Instance);
                    if (f == null) { ost.Add($"{gdzie}: nie ma pola „{kv.Key}”"); continue; }
                    if (Naloz(f.FieldType, f.GetValue(obiekt), kv.Value, $"{gdzie}.{kv.Key}", ost, out var w)) f.SetValue(obiekt, w);
                }
                nowa = obiekt; return true;
            }
            ost.Add($"{gdzie}: nieobsługiwany typ {t.Name}");
            return false;
        }
    }
}
