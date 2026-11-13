// Duszki (sprite'y postaci) — decyzja użytkownika 12.11 (PLAN.md, punkt 9): gra nie rysuje postaci kodem, tylko wkleja
// gotowe klatki z arkuszy. W TS tego pliku nie ma (tam postać rysuje render/lud/* i figury.ts). Arkusze piecze
// narzedzia/duszki z rysunku gry TS; leżą w dane/grafika/duszki: <nazwa>.json + strony PNG na każdy poziom wielkości.
using System;
using System.Collections.Generic;
using System.Text;
using Trzewia.Plotna;
using Trzewia.Rdzen;

namespace Trzewia.Rysunek.Duszki
{
    /// <summary>
    /// Jedna animacja w arkuszu: klatki od..od+n−1 i sterownik, którym gra wybiera klatkę (tak samo, jak rysunek TS
    /// wybierał pozę): faza kroku, faza wspinaczki, zegar czynności, zegar ekranu albo postęp z gry.
    /// </summary>
    public sealed class AnimacjaDuszka
    {
        public string nazwa = "";
        public int od, n;
        /// <summary>'faza' | 'fazaPion' | 'zegar' | 'czas' | 'postep'</summary>
        public string ster = "";
        /// <summary>zegar i czas: k = frac(x · mnoz + id · przes), x — zegar czynności [s] albo zegar ekranu [ms]</summary>
        public double mnoz, przes;
        /// <summary>czas całej animacji w ms przy zwykłym odtwarzaniu</summary>
        public double ms;
        public bool petla;
        /// <summary>true — zdjęcia w środkach przedziałów (klatka = ⌊u·n⌋); false — od początku do końca (klatka = round(u·(n−1)))</summary>
        public bool srodki;

        /// <summary>Klatka (numer w arkuszu) dla sterownika `u` (pętle: dowolna liczba, liczy się część ułamkowa; przebiegi: 0…1).</summary>
        public int Klatka(double u)
        {
            if (n <= 1) return od;
            if (petla || srodki)
            {
                if (petla) u -= Math.Floor(u); else u = u < 0 ? 0 : u > 1 ? 1 : u;
                var i = (int)Math.Floor(u * n);
                return od + (i < 0 ? 0 : i >= n ? n - 1 : i);
            }
            var k = (int)Math.Round((u < 0 ? 0 : u > 1 ? 1 : u) * (n - 1), MidpointRounding.AwayFromZero);
            return od + k;
        }

        /// <summary>Klatka pętli na zegarze: k = frac(x · mnoz + id · przes).</summary>
        public int KlatkaZegara(double x, double id) => Klatka(x * mnoz + id * przes);
    }

    /// <summary>Jeden poziom wielkości: strony arkusza i miejsce każdej klatki.</summary>
    public sealed class PoziomDuszka
    {
        /// <summary>Wysokość postaci w pikselach, w której upieczono ten poziom (to samo `h`, które dostaje rysunek TS).</summary>
        public double h;
        public string[] strony = Array.Empty<string>();
        IObraz?[] obrazy = Array.Empty<IObraz?>();
        /// <summary>Po 7 liczb na klatkę: strona, x, y, szerokość, wysokość, ox, oy (przesunięcie od punktu zaczepienia — środka stóp).</summary>
        public float[] klatki = Array.Empty<float>();
        /// <summary>Światła klatki (poświata lampki, świecy, księgi): po 7 liczb — x, y, promień w ułamkach h; barwa R, G, B; siła.</summary>
        public float[]?[] swiatla = Array.Empty<float[]?>();

        internal void Przygotuj() { obrazy = new IObraz?[strony.Length]; }

        /// <summary>Strona arkusza — wczytywana przy pierwszym użyciu (większość poziomów i wariantów nigdy nie trafia na ekran).</summary>
        public IObraz Strona(int nr) => obrazy[nr] ??= Plotno.Wczytaj("grafika/duszki/" + strony[nr]);
    }

    public sealed class Duszek
    {
        public string nazwa = "", postac = "", wariant = "";
        public int wzor;
        /// <summary>Ile razy sylwetka jest wyższa od postaci ludu (rycerz 1,3; Strażnik 2).</summary>
        public double mnoznik = 1;
        public PoziomDuszka[] poziomy = Array.Empty<PoziomDuszka>();
        public Dictionary<string, AnimacjaDuszka> animacje = new Dictionary<string, AnimacjaDuszka>();
        /// <summary>Głowa na każdej klatce: środek (x, y) i promień w ułamkach wysokości postaci, od środka stóp, twarzą w prawo.</summary>
        public float[]?[] glowa = Array.Empty<float[]?>();
        public int klatek;

        public AnimacjaDuszka? Animacja(string n) => animacje.TryGetValue(n, out var a) ? a : null;

        /// <summary>Poziom najbliższy wielkości na ekranie (w skali logarytmicznej): `pikseli` — wysokość postaci w pikselach ekranu.</summary>
        public int Poziom(double pikseli)
        {
            int naj = 0; double odl = double.MaxValue;
            for (int i = 0; i < poziomy.Length; i++)
            {
                var d = Math.Abs(Math.Log(poziomy[i].h / Math.Max(1, pikseli)));
                if (d < odl) { odl = d; naj = i; }
            }
            return naj;
        }

        /// <summary>
        /// Rysuje klatkę stopami w (0, 0) bieżącego układu, twarzą w prawo (zwrot ustawia wołający przez ctx.scale).
        /// `h` — wysokość postaci w jednostkach rysunku (ta sama, którą dostawał rysunek TS). Światła idą pod duszkiem,
        /// addytywnie — tak jak poświata w render/lud/wspolne.ts.
        /// </summary>
        public void Rysuj(IPlotno ctx, int klatka, double h, bool zeSwiatlami = true)
        {
            if (klatka < 0 || klatka >= klatek || poziomy.Length == 0) return;
            var t = ctx.getTransform();
            var skala = Math.Sqrt(t.a * t.a + t.b * t.b);
            if (skala <= 0) skala = 1;
            var p = poziomy[Poziom(h * skala)];
            if (zeSwiatlami && klatka < p.swiatla.Length && p.swiatla[klatka] is { } sw)
            {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                for (int i = 0; i + 6 < sw.Length; i += 7)
                {
                    double x = sw[i] * h, y = sw[i + 1] * h, r = sw[i + 2] * h;
                    var gr = ctx.createRadialGradient(x, y, 0, x, y, r);
                    gr.addColorStop(0, Barwa.Rgba(sw[i + 3], sw[i + 4], sw[i + 5], sw[i + 6]));
                    gr.addColorStop(1, Barwa.Rgba(sw[i + 3], sw[i + 4], sw[i + 5], 0));
                    ctx.fillStyle = gr;
                    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
            int k = klatka * 7;
            double w = p.klatki[k + 3], wys = p.klatki[k + 4];
            if (w <= 0 || wys <= 0) return;      // pusta klatka
            var obraz = p.Strona((int)p.klatki[k]);
            if (!obraz.complete) return;
            var f = h / p.h;
            ctx.drawImage(obraz, p.klatki[k + 1], p.klatki[k + 2], w, wys, p.klatki[k + 5] * f, p.klatki[k + 6] * f, w * f, wys * f);
        }

        // ── wczytywanie ────────────────────────────────────────────────────────────────────────────────────────

        static readonly Dictionary<string, Duszek?> pamiec = new Dictionary<string, Duszek?>();

        /// <summary>Duszek o nazwie pliku (np. „robotnik-3”, „rycerz-6-z2”); null, gdy go nie ma w dane/grafika/duszki.</summary>
        public static Duszek? Daj(string nazwa)
        {
            if (pamiec.TryGetValue(nazwa, out var d)) return d;
            d = Wczytaj(nazwa);
            pamiec[nazwa] = d;
            return d;
        }

        static Duszek? Wczytaj(string nazwa)
        {
            var bajty = Zasoby.Czytaj("grafika/duszki/" + nazwa + ".json");
            if (bajty == null) return null;
            if (!(Json.Czytaj(Encoding.UTF8.GetString(bajty)) is Dictionary<string, object?> o)) return null;
            var d = new Duszek
            {
                nazwa = nazwa,
                postac = o.TryGetValue("postac", out var po) ? po as string ?? "" : "",
                wariant = o.TryGetValue("wariant", out var wa) ? wa as string ?? "" : "",
                wzor = o.TryGetValue("wzor", out var wz) && wz is double wzd ? (int)wzd : 0,
                mnoznik = o.TryGetValue("mnoznik", out var mn) && mn is double mnd ? mnd : 1,
            };
            if (o.TryGetValue("animacje", out var an) && an is Dictionary<string, object?> anim)
            {
                foreach (var kv in anim)
                {
                    if (!(kv.Value is Dictionary<string, object?> a)) continue;
                    double L(string k, double brak = 0) => a.TryGetValue(k, out var v) && v is double x ? x : brak;
                    d.animacje[kv.Key] = new AnimacjaDuszka
                    {
                        nazwa = kv.Key, od = (int)L("od"), n = (int)L("n"), ster = a.TryGetValue("ster", out var st) ? st as string ?? "" : "",
                        mnoz = L("mnoz"), przes = L("przes"), ms = L("ms"),
                        petla = a.TryGetValue("petla", out var pe) && pe is true,
                        srodki = a.TryGetValue("srodki", out var sr) && sr is true,
                    };
                }
            }
            if (o.TryGetValue("glowa", out var gl) && gl is List<object?> glowy)
            {
                d.glowa = new float[]?[glowy.Count];
                for (int i = 0; i < glowy.Count; i++) d.glowa[i] = Liczby(glowy[i]);
            }
            if (o.TryGetValue("poziomy", out var pz) && pz is List<object?> poziomy)
            {
                d.poziomy = new PoziomDuszka[poziomy.Count];
                for (int i = 0; i < poziomy.Count; i++)
                {
                    var p = new PoziomDuszka();
                    d.poziomy[i] = p;
                    if (!(poziomy[i] is Dictionary<string, object?> q)) continue;
                    p.h = q.TryGetValue("h", out var hh) && hh is double hd ? hd : 1;
                    if (q.TryGetValue("strony", out var ss) && ss is List<object?> strony)
                    {
                        p.strony = new string[strony.Count];
                        for (int j = 0; j < strony.Count; j++) p.strony[j] = strony[j] as string ?? "";
                    }
                    if (q.TryGetValue("klatki", out var kk) && kk is List<object?> klatki)
                    {
                        p.klatki = new float[klatki.Count * 7];
                        for (int j = 0; j < klatki.Count; j++)
                        {
                            var l = Liczby(klatki[j]);
                            for (int m = 0; m < 7 && l != null && m < l.Length; m++) p.klatki[j * 7 + m] = l[m];
                        }
                        d.klatek = klatki.Count;
                    }
                    if (q.TryGetValue("swiatla", out var sw) && sw is List<object?> swiatla)
                    {
                        p.swiatla = new float[]?[swiatla.Count];
                        for (int j = 0; j < swiatla.Count; j++)
                        {
                            if (!(swiatla[j] is List<object?> lista) || lista.Count == 0) continue;
                            var w = new List<float>();
                            foreach (var s in lista) { var l = Liczby(s); if (l != null && l.Length >= 7) for (int m = 0; m < 7; m++) w.Add(l[m]); }
                            p.swiatla[j] = w.ToArray();
                        }
                    }
                    p.Przygotuj();
                }
            }
            return d;
        }

        static float[]? Liczby(object? o)
        {
            if (!(o is List<object?> l)) return null;
            var w = new float[l.Count];
            for (int i = 0; i < l.Count; i++) w[i] = l[i] is double x ? (float)x : 0;
            return w;
        }
    }
}
