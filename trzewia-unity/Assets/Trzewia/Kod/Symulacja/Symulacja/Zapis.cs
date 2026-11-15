// Port: alpha-1/src/core/save.ts — serialize, restore, applyTaints. Wersja zapisu 5 i ten sam JSON co w TS: zapis z gry
// w przeglądarce wczytuje się tutaj i odwrotnie (test: testy/Trzewia.Testy/ZapisTesty.cs). Miejsce zapisu (localStorage
// w TS: saveToStorage, loadFromStorage, hasSave) to sprawa gospodarza — w C# plik w Dokumenty\My Games\Trzewia.
//
// TS buduje zapis z obiektów wprost ({ ...c }) i wczytuje go jako zwykłe obiekty z JSON.parse. Tu robi to odbicie
// (reflection) po polach publicznych: pole C# nazywa się jak pole TS, null w polu = undefined w TS (pomijane w JSON).
// Działa także w Unity (IL2CPP — typy zapisu nie mogą być wycinane przez linker) i w Godot (.NET).
using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.Serialization;
using Trzewia.Js;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.Moce;
using static Trzewia.Symulacja.Pielgrzymka;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>
    /// Zapis stanu. Przy grze o pokoleniach i przypływach to nie wygoda, tylko narzędzie:
    /// bez niego nie da się wrócić do tej samej sytuacji i sprawdzić, co zmieniła decyzja.
    /// </summary>
    public static class Zapis
    {
        /// <summary>Klucz zapisu w localStorage (TS) — gospodarz może go użyć jako nazwy pliku.</summary>
        public const string KEY = "trzewia-alpha-1:zapis";
        // Alpha, etap 3: góra z warstwami jest szersza (192 kafle zamiast 176) — stare zapisy się nie wczytają
        // (etap 3d: drugi otwór z wiadrem, ołtarz i kamienna podłoga sali — znów nowa góra; etap 3e: ruiny z zabytkami)
        // (25.10: droga wiernych jako szyb ze schodami — nowa góra: wnęka przy sali i szyb bez kamienia)
        public const int VERSION = 5;

        /// <summary>Base64 bajtów — to samo co btoa w TS (toB64), znak w znak.</summary>
        static string toB64(byte[] b) => Convert.ToBase64String(b);

        /// <summary>Int32Array w TS idzie do base64 jako jego bajty w pamięci (little-endian) — Buffer.BlockCopy daje to samo.</summary>
        static string toB64(int[] a)
        {
            var b = new byte[a.Length * 4];
            Buffer.BlockCopy(a, 0, b, 0, b.Length);
            return Convert.ToBase64String(b);
        }

        /// <summary>atob i przepisanie bajt po bajcie — tylko tyle, ile jest w obu (reszta tablicy zostaje).</summary>
        static void fromB64(object? b64, byte[] bytes)
        {
            var bin = Atob(b64);
            Array.Copy(bin, bytes, Math.Min(bytes.Length, bin.Length));
        }

        static void fromB64(object? b64, int[] liczby)
        {
            var bin = Atob(b64);
            var bytes = new byte[liczby.Length * 4];
            Buffer.BlockCopy(liczby, 0, bytes, 0, bytes.Length);
            Array.Copy(bin, bytes, Math.Min(bytes.Length, bin.Length));
            Buffer.BlockCopy(bytes, 0, liczby, 0, bytes.Length);
        }

        /// <summary>atob: brak napisu albo zły base64 — wyjątek (w TS atob też rzuca, a restore go nie łapie).</summary>
        static byte[] Atob(object? b64) => Convert.FromBase64String(b64 as string ?? throw new FormatException("zapis: brak danych mapy"));

        public static string serialize(Sim sim)
        {
            var w = sim.world;
            // kolejność kluczy jak w TS (dla czytelności pliku — wczytanie od niej nie zależy)
            var o = new Dictionary<string, object?>
            {
                ["v"] = (double)VERSION,
                ["seed"] = sim.seed,
                ["tick"] = sim.tick,
                ["wiara"] = sim.wiara, ["krew"] = sim.krew, ["zelazo"] = sim.zelazo, ["zloto"] = sim.zloto, ["sen"] = sim.sen,
                ["pomieszczenia"] = DoJson(sim.pomieszczenia), ["nrPomieszczenia"] = sim.nrPomieszczenia, ["zbroja"] = DoJson(sim.zbroja),
                ["wiadroOdblokowane"] = sim.wiadroOdblokowane, ["rytual"] = DoJson(sim.rytual), ["koszmar"] = sim.koszmar,
                ["stat"] = DoJson(sim.stat), ["dug"] = sim.dug,
                // v4.1 beta: skutki odroczone i karty z łańcuchów przeżywają zapis (inaczej dług znikał po wczytaniu)
                ["odroczone"] = DoJson(sim.wydarzenia.odroczone), ["czekajace"] = DoJson(sim.wydarzenia.czekajace),
                ["lud"] = DoJson(sim.lud), ["kupione"] = DoJson(sim.wydarzenia.kupione),
                ["fungusBudget"] = sim.fungusBudget, ["nextTide"] = sim.nextTide, ["ending"] = sim.ending, ["przybyszow"] = sim.przybyszow,
                ["taints"] = DoJson(sim.taints), ["nextId"] = sim.nextId, ["allForges"] = DoJson(sim.allForges),
            };
            // chronicle.slice(-120)
            var kronika = sim.chronicle;
            o["chronicle"] = DoJson(kronika.GetRange(Math.Max(0, kronika.Count - 120), Math.Min(120, kronika.Count)));
            var klany = new List<object?>();
            foreach (var c in sim.clans)
            {
                var k = Obiekt(c, null);
                var pary = new List<object?>();
                foreach (var kv in c.grudge) pary.Add(new List<object?> { kv.Key, kv.Value });
                k["grudge"] = pary;   // { ...c, grudge: [...c.grudge] }
                klany.Add(k);
            }
            o["clans"] = klany;
            // droga to rachunek na chwilę — po wczytaniu i tak wyznaczy się na nowo
            var stworzenia = new List<object?>();
            foreach (var c in sim.creatures) if (!c.dead) stworzenia.Add(Obiekt(c, BEZ_DROGI));
            o["creatures"] = stworzenia;
            o["tile"] = toB64(w.tile.d); o["water"] = toB64(w.water.d); o["magma"] = toB64(w.magma.d);
            o["mem"] = toB64(w.mem.d); o["ever"] = toB64(w.ever.d); o["lastSeen"] = toB64(w.lastSeen.d); o["slad"] = toB64(w.slad.d);
            // liny (w zapisach z 3d pole nazywało się „drabina” — szczeble wczytują się jako liny)
            o["lina"] = toB64(w.lina.d);
            var kucie = new List<object?>();
            foreach (var kv in w.kucie) kucie.Add(new List<object?> { kv.Key, kv.Value });
            o["kucie"] = kucie;
            return Json.Pisz(o);
        }

        static readonly HashSet<string> BEZ_DROGI = new HashSet<string> { "droga", "drogaI", "drogaKopie" };

        public static Sim? restore(string json)
        {
            object? dane;
            try { dane = Json.Czytaj(json); } catch (Exception) { return null; }
            if (!(dane is Dictionary<string, object?> data) || !(Pole(data, "v") is double v) || v != VERSION) return null;

            var sim = new Sim(Liczba(data, "seed"));          // ta sama góra, potem nadpisana stanem
            var w = sim.world;
            fromB64(Pole(data, "tile"), w.tile.d); fromB64(Pole(data, "water"), w.water.d); fromB64(Pole(data, "magma"), w.magma.d);
            // Remake v1: w górze nie ma już wody ani lawy — stary zapis wraca suchy i zimny
            if (!SWIAT.plyny) { Array.Clear(w.water.d, 0, w.water.d.Length); Array.Clear(w.magma.d, 0, w.magma.d.Length); }
            fromB64(Pole(data, "mem"), w.mem.d); fromB64(Pole(data, "ever"), w.ever.d); fromB64(Pole(data, "lastSeen"), w.lastSeen.d);
            if (Prawda(Pole(data, "slad"))) fromB64(Pole(data, "slad"), w.slad.d);
            if (Prawda(Pole(data, "lina"))) fromB64(Pole(data, "lina"), w.lina.d);
            else if (Prawda(Pole(data, "drabina"))) fromB64(Pole(data, "drabina"), w.lina.d);
            // for (const [i, f] of data.kucie) — wpis, który nie jest tablicą, w TS rzuca; tu jest pomijany
            if (Pole(data, "kucie") is List<object?> kucie)
                foreach (var e in kucie)
                    if (e is List<object?> p && p.Count >= 2 && p[0] is double i && p[1] is double f) w.kucie.set(i, f);

            sim.tick = Liczba(data, "tick");
            sim.wiara = Liczba(data, "wiara"); sim.krew = Liczba(data, "krew"); sim.sen = Liczba(data, "sen");
            // Alpha, etap 3b: zapis sprzed kruszców nie zna liczników — zaczynają od zera
            sim.zelazo = Pole(data, "zelazo") is double ze ? ze : 0;
            sim.zloto = Pole(data, "zloto") is double zl ? zl : 0;
            // etap 3c: pomieszczenia i zbroja (zapis sprzed nich — pusto)
            if (Pole(data, "pomieszczenia") is List<object?>) sim.pomieszczenia = (List<Pomieszczenie>)ZJson(Pole(data, "pomieszczenia"), typeof(List<Pomieszczenie>))!;
            if (Pole(data, "nrPomieszczenia") is double nr) sim.nrPomieszczenia = nr;
            if (Pole(data, "zbroja") is List<object?>) sim.zbroja = (List<string>)ZJson(Pole(data, "zbroja"), typeof(List<string>))!;
            sim.wiadroOdblokowane = Pole(data, "wiadroOdblokowane") is true;
            sim.koszmar = true;     // Remake v2: tylko Koszmar — także stare zapisy z łaskawej i surowej góry
            // { ...sim.stat, ...data.stat } — pola z zapisu nadpisują świeże, reszta zostaje
            if (Pole(data, "stat") is Dictionary<string, object?> stat) Scal(sim.stat, stat);
            if (Prawda(Pole(data, "dug"))) sim.dug = Liczba(data, "dug");
            if (Pole(data, "odroczone") is List<object?>) sim.wydarzenia.odroczone = (List<Odroczony>)ZJson(Pole(data, "odroczone"), typeof(List<Odroczony>))!;
            if (Pole(data, "czekajace") is List<object?>) sim.wydarzenia.czekajace = (List<CzekajacaKarta>)ZJson(Pole(data, "czekajace"), typeof(List<CzekajacaKarta>))!;
            if (Pole(data, "lud") is Dictionary<string, object?> lud) Scal(sim.lud, lud);
            if (Pole(data, "kupione") is Dictionary<string, object?>) sim.wydarzenia.kupione = (Dictionary<string, double>)ZJson(Pole(data, "kupione"), typeof(Dictionary<string, double>))!;
            if (Pole(data, "rytual") is Dictionary<string, object?> rytual) Scal(sim.rytual, rytual);   // stare zapisy nie znają nowych pól
            sim.fungusBudget = Liczba(data, "fungusBudget"); sim.nextTide = Liczba(data, "nextTide"); sim.ending = Pole(data, "ending") as string;
            sim.przybyszow = Pole(data, "przybyszow") == null ? 0 : Liczba(data, "przybyszow");
            sim.taints = (List<List<string>>)ZJson(Pole(data, "taints"), typeof(List<List<string>>))!;
            sim.allForges = Pole(data, "allForges") == null ? new List<double>() : (List<double>)ZJson(Pole(data, "allForges"), typeof(List<double>))!;
            sim.chronicle = Pole(data, "chronicle") == null ? new List<ChronicleEntry>() : (List<ChronicleEntry>)ZJson(Pole(data, "chronicle"), typeof(List<ChronicleEntry>))!;

            sim.clans = new List<Clan>();
            foreach (var e in (List<object?>)Pole(data, "clans")!)
            {
                var c = (Dictionary<string, object?>)e!;
                var k = (Clan)ZObiektu(c, typeof(Clan), null, POMIN_GRUDGE);
                // { ...c, grudge: new Map(c.grudge), rytual: c.rytual ?? 0, pekniecia: c.pekniecia ?? 0 }
                k.grudge = new JsMap<double, double>();
                if (Pole(c, "grudge") is List<object?> pary)
                    foreach (var p in pary)
                        if (p is List<object?> para) k.grudge.set(Liczba(para.Count > 0 ? para[0] : BRAK), Liczba(para.Count > 1 ? para[1] : BRAK));
                k.rytual = Pole(c, "rytual") == null ? 0 : Liczba(c, "rytual");
                k.pekniecia = Pole(c, "pekniecia") == null ? 0 : Liczba(c, "pekniecia");
                sim.clans.Add(k);
            }
            // najazd z powierzchni wycięty — ludzie ze starego zapisu nie wracają do góry
            sim.creatures = new List<Creature>();
            foreach (var e in (List<object?>)Pole(data, "creatures")!)
            {
                var c = (Creature)ZJson(e, typeof(Creature))!;
                if (c.race != Race.HUMAN) sim.creatures.Add(c);
            }
            foreach (var k in sim.clans) if (k.race == Race.HUMAN && !k.dead) { k.dead = true; k.pop = 0; }
            sim.byId = new JsMap<double, Creature>();
            foreach (var c in sim.creatures) sim.byId.set(c.id, c);
            // numer nie może wrócić do już zajętego — inaczej nowe stworzenie nadpisze stare w byId
            double maxId = 0;
            foreach (var c in sim.creatures) if (c.id > maxId) maxId = c.id;
            sim.nextId = Math.Max(Pole(data, "nextId") == null ? 1 : Liczba(data, "nextId"), maxId + 1);
            sim.target.clear();
            sim.particles.Clear();

            // skazy z zapisu muszą wrócić do tablicy ras — one żyją poza symulacją
            applyTaints(sim);
            schodyDrogi(sim);       // schody drogi wiernych liczy się z mapy — nie ma ich w zapisie
            w.countUnknown(sim.tick);
            return sim;
        }

        static readonly HashSet<string> POMIN_GRUDGE = new HashSet<string> { "grudge" };

        /// <summary>Skazy żyją w tablicy ras, więc po wczytaniu trzeba je nałożyć na nowo.</summary>
        static void applyTaints(Sim sim)
        {
            for (int race = 0; race < sim.taints.Count; race++)
            {
                var list = sim.taints[race];
                if (list == null) continue;   // forEach pomija dziury
                foreach (var tool in list) applyTaintEffect(race, tool);
            }
        }

        // ── JSON ↔ obiekty ─────────────────────────────────────────────────────────────────────────────────────

        /// <summary>Znacznik „klucza nie ma” (undefined) — odróżnia go od null z pliku.</summary>
        static readonly object BRAK = new object();

        /// <summary>Pole zapisu; brak klucza i null z pliku czytają się tu tak samo (null) — rozróżnia je tylko Liczba(d, klucz).</summary>
        static object? Pole(Dictionary<string, object?> d, string klucz) => d.TryGetValue(klucz, out var w) ? w : null;

        /// <summary>
        /// Liczba z pola zapisu tak, jak przeszłaby przez rachunki w JS: brak klucza (undefined) → NaN,
        /// null (tak JSON.stringify zapisuje NaN i ±Infinity) → 0, bo null w rachunkach JS działa jak 0.
        /// </summary>
        static double Liczba(Dictionary<string, object?> d, string klucz) => d.TryGetValue(klucz, out var w) ? Liczba(w) : double.NaN;

        static double Liczba(object? j) => j switch
        {
            double d => d,
            null => 0,
            bool b => b ? 1 : 0,
            // Number("…") — w zapisie liczby nie są napisami; tu tylko prosty przypadek: pusty napis to 0, reszta jak parseFloat całości
            string s => s.Trim().Length == 0 ? 0 : double.TryParse(s.Trim(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var n) ? n : double.NaN,
            _ => double.NaN,   // BRAK (undefined), obiekt, tablica (w JS: NaN albo liczba z jedynego elementu — w zapisie nie występuje)
        };

        /// <summary>Prawdziwość wartości z JSON jak w JS (if (data.slad)).</summary>
        static bool Prawda(object? j) => j switch
        {
            null => false,
            bool b => b,
            double d => JS.Tak(d),
            string s => s.Length > 0,
            _ => !ReferenceEquals(j, BRAK),
        };

        sealed class OpisTypu
        {
            public FieldInfo[] pola = Array.Empty<FieldInfo>();
            public Dictionary<string, FieldInfo> poNazwie = new Dictionary<string, FieldInfo>();
        }

        static readonly ConcurrentDictionary<Type, OpisTypu> OPISY = new ConcurrentDictionary<Type, OpisTypu>();

        static OpisTypu Opis(Type t) => OPISY.GetOrAdd(t, typ =>
        {
            var o = new OpisTypu { pola = typ.GetFields(BindingFlags.Public | BindingFlags.Instance) };
            foreach (var f in o.pola) o.poNazwie[f.Name] = f;
            return o;
        });

        /// <summary>{ ...obiekt } dla JSON.stringify: pola publiczne bez null (undefined) i bez funkcji.</summary>
        static Dictionary<string, object?> Obiekt(object v, HashSet<string>? pomin)
        {
            var d = new Dictionary<string, object?>();
            foreach (var f in Opis(v.GetType()).pola)
            {
                if (pomin != null && pomin.Contains(f.Name)) continue;
                var x = f.GetValue(v);
                if (x == null || x is Delegate) continue;
                d[f.Name] = DoJson(x);
            }
            return d;
        }

        /// <summary>Wartość tak, jak zapisze ją JSON.stringify (Map i Set → {}, tablica typowana → obiekt z indeksami).</summary>
        static object? DoJson(object? v)
        {
            switch (v)
            {
                case null: return null;
                case double _: case int _: case bool _: case string _: return v;
                case float f: return (double)f;
                case Delegate _: return null;   // w tablicy JSON.stringify pisze null (w obiekcie pole pomija Obiekt)
            }
            var t = v.GetType();
            if (t.IsGenericType && (t.GetGenericTypeDefinition() == typeof(JsMap<,>) || t.GetGenericTypeDefinition() == typeof(HashSet<>)))
                return new Dictionary<string, object?>();
            if (t.Namespace == typeof(Uint8Array).Namespace && t.GetField("d")?.GetValue(v) is Array typowana)
            {
                var d = new Dictionary<string, object?>();
                for (int i = 0; i < typowana.Length; i++) d[i.ToString(System.Globalization.CultureInfo.InvariantCulture)] = Convert.ToDouble(typowana.GetValue(i), System.Globalization.CultureInfo.InvariantCulture);
                return d;
            }
            if (v is IDictionary slownik)
            {
                var d = new Dictionary<string, object?>();
                foreach (DictionaryEntry e in slownik)
                {
                    if (e.Value == null || e.Value is Delegate) continue;
                    d[Convert.ToString(e.Key, System.Globalization.CultureInfo.InvariantCulture)!] = DoJson(e.Value);
                }
                return d;
            }
            if (v is IEnumerable lista)
            {
                var l = new List<object?>();
                foreach (var x in lista) l.Add(DoJson(x));
                return l;
            }
            return Obiekt(v, null);
        }

        /// <summary>{ ...cel, ...dane } w miejscu: pola z zapisu nadpisują te w obiekcie (klucze nieznane C# — pomijane).</summary>
        static void Scal(object cel, Dictionary<string, object?> dane) => ZObiektu(dane, cel.GetType(), cel, null);

        static object ZObiektu(Dictionary<string, object?> d, Type t, object? cel, HashSet<string>? pomin)
        {
            var o = cel ?? Nowy(t);
            var opis = Opis(t);
            foreach (var kv in d)
            {
                if (pomin != null && pomin.Contains(kv.Key)) continue;
                // klucz nieznany C# — w TS zostałby w obiekcie jako dodatkowe pole, którego gra nie czyta
                if (!opis.poNazwie.TryGetValue(kv.Key, out var f) || f.IsInitOnly || typeof(Delegate).IsAssignableFrom(f.FieldType)) continue;
                f.SetValue(o, ZJson(kv.Value, f.FieldType));
            }
            return o;
        }

        static object Nowy(Type t)
        {
            var k = t.GetConstructor(Type.EmptyTypes);
            return k != null ? k.Invoke(null) : FormatterServices.GetUninitializedObject(t);
        }

        /// <summary>Wartość z JSON.parse w polu typu C#.</summary>
        static object? ZJson(object? j, Type t)
        {
            var pod = Nullable.GetUnderlyingType(t);
            if (pod != null) return j == null ? null : ZJson(j, pod);
            if (t == typeof(double)) return Liczba(j);
            if (t == typeof(int)) return JS.ToInt32(Liczba(j));
            if (t == typeof(bool)) return Prawda(j);
            if (t == typeof(string)) return j as string;
            if (t == typeof(object)) return j;
            if (j == null) return t.IsValueType ? Activator.CreateInstance(t) : null;
            if (t.IsArray)
            {
                if (!(j is List<object?> l)) return null;
                var el = t.GetElementType()!;
                var a = Array.CreateInstance(el, l.Count);
                for (int i = 0; i < l.Count; i++) a.SetValue(ZJson(l[i], el), i);
                return a;
            }
            if (t.IsGenericType)
            {
                var g = t.GetGenericTypeDefinition();
                var args = t.GetGenericArguments();
                if (g == typeof(List<>))
                {
                    if (!(j is List<object?> l)) return null;
                    var lista = (IList)Activator.CreateInstance(t)!;
                    foreach (var x in l) lista.Add(ZJson(x, args[0]));
                    return lista;
                }
                if (g == typeof(Dictionary<,>) && args[0] == typeof(string))
                {
                    if (!(j is Dictionary<string, object?> d)) return null;
                    var slownik = (IDictionary)Activator.CreateInstance(t)!;
                    foreach (var kv in d) slownik[kv.Key] = ZJson(kv.Value, args[1]);
                    return slownik;
                }
                // Map w JSON.stringify to {} — po wczytaniu w TS byłby tu zwykły obiekt; w zapisie Map nie ma (poza grudge i kucie)
                if (g == typeof(JsMap<,>) || g == typeof(HashSet<>)) return Activator.CreateInstance(t);
            }
            if (j is Dictionary<string, object?> obiekt) return ZObiektu(obiekt, t, null, null);
            return t.IsValueType ? Activator.CreateInstance(t) : null;
        }
    }
}
