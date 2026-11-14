// Model 3D z pliku glTF 2.0 w jednym pliku (.glb): siatki ze skórą, szkielet i animacje. Czyta tyle formatu, ile
// zapisuje narzedzia/dlon3d (dłoń z otchłani i dłoń anielska — decyzja użytkownika 12.11: dłoń ma być modelem 3D,
// nie klatkami z pliku). W TS tego pliku nie ma: tam dłoń była arkuszem klatek wyrenderowanych z tego samego modelu.
// Czysty C# bez Skii — po przenosinach do silnika ten sam plik .glb wczytuje import silnika, a tej klasy nie trzeba.
using System;
using System.Collections.Generic;
using System.Text;
using Trzewia.Rdzen;

namespace Trzewia.Rysunek.Model3D
{
    /// <summary>Jedna siatka (prymityw glTF): wierzchołki z normalną, barwą, dwiema parami dodatków i wagami do 4 kości.</summary>
    public sealed class Siatka3D
    {
        public string material = "";
        public int n;
        public float[] wierz = Array.Empty<float>(), normalne = Array.Empty<float>();
        /// <summary>barwa RGBA 0..1 (COLOR_0, liniowo)</summary>
        public float[] barwa = Array.Empty<float>();
        public float[] uv0 = Array.Empty<float>(), uv1 = Array.Empty<float>(), wagi = Array.Empty<float>();
        public byte[] kosci = Array.Empty<byte>();
        public int[] troj = Array.Empty<int>();
    }

    /// <summary>Animacja: obroty kości w kolejnych chwilach (między kluczami — po łuku, slerp).</summary>
    public sealed class Klip3D
    {
        public string nazwa = "";
        public float[] czasy = Array.Empty<float>();
        /// <summary>[kość] → kwaterniony kluczy (x, y, z, w po kolei) albo null, gdy klip tej kości nie rusza</summary>
        public float[]?[] obroty = Array.Empty<float[]?>();
        /// <summary>[kość] → skale kluczy (x, y, z) albo null</summary>
        public float[]?[] skale = Array.Empty<float[]?>();
        public float dlugosc;
    }

    public sealed class Model3D
    {
        public Siatka3D[] siatki = Array.Empty<Siatka3D>();
        public string[] kosci = Array.Empty<string>();
        public int[] rodzic = Array.Empty<int>();
        /// <summary>poza spoczynkowa: przesunięcie (3 na kość) i obrót (4 na kość) względem rodzica</summary>
        public float[] spoczT = Array.Empty<float>(), spoczR = Array.Empty<float>();
        /// <summary>skala w pozie spoczynkowej (3 na kość; zwykle 1)</summary>
        public float[] spoczS = Array.Empty<float>();
        /// <summary>macierze odwrotne pozy spoczynkowej, 3×4 wierszami (12 na kość)</summary>
        public float[] odwrotne = Array.Empty<float>();
        public readonly Dictionary<string, Klip3D> klipy = new Dictionary<string, Klip3D>();
        int[] kolejnosc = Array.Empty<int>();

        // ------------------------------------------------------------------ wczytanie
        public static Model3D? Wczytaj(string sciezka)
        {
            var dane = Zasoby.Czytaj(sciezka);
            if (dane == null) { Dziennik.Pisz($"brak modelu: {sciezka}"); return null; }
            try { return ZBajtow(dane); }
            catch (Exception e) { Dziennik.Pisz($"model nieczytelny: {sciezka}: {e.Message}"); return null; }
        }

        public static Model3D ZBajtow(byte[] d)
        {
            if (d.Length < 20 || BitConverter.ToUInt32(d, 0) != 0x46546C67) throw new FormatException("to nie jest plik .glb");
            int dlJson = BitConverter.ToInt32(d, 12);
            if (BitConverter.ToUInt32(d, 16) != 0x4E4F534A) throw new FormatException("pierwsza część .glb nie jest opisem JSON");
            var j = Json.Czytaj(Encoding.UTF8.GetString(d, 20, dlJson)) as Dictionary<string, object?> ?? throw new FormatException("opis .glb nie jest obiektem");
            int bin = 20 + dlJson + 8;
            if (bin > d.Length || BitConverter.ToUInt32(d, bin - 4) != 0x004E4942) throw new FormatException("w .glb nie ma części binarnej");
            var akc = Lista(j, "accessors");
            var widoki = Lista(j, "bufferViews");

            // jeden akcesor jako liczby zmiennoprzecinkowe (całkowite znormalizowane → 0..1)
            float[] Liczby(int nr, out int skladowych)
            {
                var a = Obiekt(akc[nr]);
                var w = Obiekt(widoki[Calk(a, "bufferView")]);
                int od = bin + Calk(w, "byteOffset", 0) + Calk(a, "byteOffset", 0);
                int ile = Calk(a, "count");
                var rodzaj = a["type"] as string;
                skladowych = rodzaj == "SCALAR" ? 1 : rodzaj == "VEC2" ? 2 : rodzaj == "VEC3" ? 3 : rodzaj == "VEC4" ? 4 : rodzaj == "MAT4" ? 16 : throw new FormatException("typ " + rodzaj);
                int typ = Calk(a, "componentType");
                int bajtow = typ == 5126 || typ == 5125 ? 4 : typ == 5123 ? 2 : typ == 5121 ? 1 : throw new FormatException("składowa " + typ);
                int krok = Calk(w, "byteStride", bajtow * skladowych);
                bool norm = a.TryGetValue("normalized", out var nn) && nn is bool nb && nb;
                var wynik = new float[ile * skladowych];
                for (int i = 0; i < ile; i++)
                    for (int k = 0; k < skladowych; k++)
                    {
                        int p = od + i * krok + k * bajtow;
                        wynik[i * skladowych + k] =
                            typ == 5126 ? BitConverter.ToSingle(d, p) :
                            typ == 5125 ? BitConverter.ToUInt32(d, p) :
                            typ == 5123 ? (norm ? BitConverter.ToUInt16(d, p) / 65535f : BitConverter.ToUInt16(d, p)) :
                            (norm ? d[p] / 255f : d[p]);
                    }
                return wynik;
            }
            float[] L(int nr) => Liczby(nr, out _);

            var m = new Model3D();
            // węzeł z siatką i skórą
            var wezly = Lista(j, "nodes");
            int nrSiatki = -1, nrSkory = -1;
            foreach (var w in wezly)
            {
                var o = Obiekt(w);
                if (o.ContainsKey("mesh") && o.ContainsKey("skin")) { nrSiatki = Calk(o, "mesh"); nrSkory = Calk(o, "skin"); break; }
            }
            if (nrSiatki < 0) throw new FormatException("w modelu nie ma siatki ze skórą");
            var materialy = j.TryGetValue("materials", out var mat) ? mat as List<object?> : null;

            var siatki = new List<Siatka3D>();
            foreach (var pr in Lista(Obiekt(Lista(j, "meshes")[nrSiatki]), "primitives"))
            {
                var p = Obiekt(pr);
                var at = Obiekt(p["attributes"]);
                var s = new Siatka3D();
                s.wierz = L(Calk(at, "POSITION"));
                s.n = s.wierz.Length / 3;
                s.normalne = L(Calk(at, "NORMAL"));
                var barwa = Liczby(Calk(at, "COLOR_0"), out int skl);
                if (skl == 4) s.barwa = barwa;
                else { s.barwa = new float[s.n * 4]; for (int i = 0; i < s.n; i++) { s.barwa[i * 4] = barwa[i * 3]; s.barwa[i * 4 + 1] = barwa[i * 3 + 1]; s.barwa[i * 4 + 2] = barwa[i * 3 + 2]; s.barwa[i * 4 + 3] = 1; } }
                s.uv0 = at.ContainsKey("TEXCOORD_0") ? L(Calk(at, "TEXCOORD_0")) : new float[s.n * 2];
                s.uv1 = at.ContainsKey("TEXCOORD_1") ? L(Calk(at, "TEXCOORD_1")) : new float[s.n * 2];
                var ko = L(Calk(at, "JOINTS_0"));
                s.kosci = new byte[ko.Length];
                for (int i = 0; i < ko.Length; i++) s.kosci[i] = (byte)ko[i];
                s.wagi = L(Calk(at, "WEIGHTS_0"));
                var ind = L(Calk(p, "indices"));
                s.troj = new int[ind.Length];
                for (int i = 0; i < ind.Length; i++) s.troj[i] = (int)ind[i];
                if (materialy != null && p.ContainsKey("material"))
                    s.material = Obiekt(materialy[Calk(p, "material")]).TryGetValue("name", out var nm) ? nm as string ?? "" : "";
                siatki.Add(s);
            }
            m.siatki = siatki.ToArray();

            // szkielet: kości w kolejności skóry
            var skora = Obiekt(Lista(j, "skins")[nrSkory]);
            var stawy = new List<int>();
            foreach (var x in Lista(skora, "joints")) stawy.Add((int)(double)x!);
            int nk = stawy.Count;
            var koscWezla = new Dictionary<int, int>();
            for (int i = 0; i < nk; i++) koscWezla[stawy[i]] = i;
            m.kosci = new string[nk]; m.rodzic = new int[nk]; m.spoczT = new float[nk * 3]; m.spoczR = new float[nk * 4]; m.spoczS = new float[nk * 3];
            for (int i = 0; i < nk; i++) m.rodzic[i] = -1;
            for (int i = 0; i < nk * 3; i++) m.spoczS[i] = 1;
            for (int i = 0; i < nk; i++)
            {
                var w = Obiekt(wezly[stawy[i]]);
                m.kosci[i] = w.TryGetValue("name", out var nm) ? nm as string ?? "" : "";
                if (w.TryGetValue("translation", out var t) && t is List<object?> tl) for (int k = 0; k < 3; k++) m.spoczT[i * 3 + k] = (float)(double)tl[k]!;
                if (w.TryGetValue("rotation", out var r) && r is List<object?> rl) for (int k = 0; k < 4; k++) m.spoczR[i * 4 + k] = (float)(double)rl[k]!;
                else m.spoczR[i * 4 + 3] = 1;
                if (w.TryGetValue("scale", out var sk) && sk is List<object?> sl) for (int k = 0; k < 3; k++) m.spoczS[i * 3 + k] = (float)(double)sl[k]!;
                if (w.TryGetValue("children", out var dz) && dz is List<object?> dl)
                    foreach (var c in dl) if (koscWezla.TryGetValue((int)(double)c!, out var kc)) m.rodzic[kc] = i;
            }
            // rodzice przed dziećmi
            var kol = new List<int>();
            var gotowe = new bool[nk];
            while (kol.Count < nk)
            {
                int przed = kol.Count;
                for (int i = 0; i < nk; i++)
                    if (!gotowe[i] && (m.rodzic[i] < 0 || gotowe[m.rodzic[i]])) { gotowe[i] = true; kol.Add(i); }
                if (kol.Count == przed) throw new FormatException("szkielet ma pętlę");
            }
            m.kolejnosc = kol.ToArray();
            // macierze odwrotne: glTF podaje 4×4 kolumnami — tu 3×4 wierszami
            var ibm = L(Calk(skora, "inverseBindMatrices"));
            m.odwrotne = new float[nk * 12];
            for (int i = 0; i < nk; i++)
                for (int w = 0; w < 3; w++)
                    for (int k = 0; k < 4; k++) m.odwrotne[i * 12 + w * 4 + k] = ibm[i * 16 + k * 4 + w];

            if (j.TryGetValue("animations", out var an) && an is List<object?> animacje)
                foreach (var ao in animacje)
                {
                    var a = Obiekt(ao);
                    var klip = new Klip3D { nazwa = a.TryGetValue("name", out var nm) ? nm as string ?? "" : "", obroty = new float[]?[nk], skale = new float[]?[nk] };
                    var probniki = Lista(a, "samplers");
                    foreach (var ko in Lista(a, "channels"))
                    {
                        var kan = Obiekt(ko);
                        var cel = Obiekt(kan["target"]);
                        var sciezka = cel["path"] as string;
                        if (sciezka != "rotation" && sciezka != "scale") continue;
                        if (!koscWezla.TryGetValue(Calk(cel, "node"), out var kosc)) continue;
                        var pr = Obiekt(probniki[Calk(kan, "sampler")]);
                        var czasy = L(Calk(pr, "input"));
                        if (klip.czasy.Length == 0) klip.czasy = czasy;
                        else if (klip.czasy.Length != czasy.Length) throw new FormatException("klip z różnymi osiami czasu");
                        if (sciezka == "rotation") klip.obroty[kosc] = L(Calk(pr, "output")); else klip.skale[kosc] = L(Calk(pr, "output"));
                    }
                    klip.dlugosc = klip.czasy.Length > 0 ? klip.czasy[klip.czasy.Length - 1] : 0;
                    m.klipy[klip.nazwa] = klip;
                }
            return m;
        }

        static Dictionary<string, object?> Obiekt(object? o) => o as Dictionary<string, object?> ?? throw new FormatException("glTF: oczekiwany obiekt");
        static List<object?> Lista(Dictionary<string, object?> o, string klucz) =>
            o.TryGetValue(klucz, out var w) && w is List<object?> l ? l : throw new FormatException("glTF: brak tablicy " + klucz);
        static int Calk(Dictionary<string, object?> o, string klucz) =>
            o.TryGetValue(klucz, out var w) && w is double x ? (int)x : throw new FormatException("glTF: brak liczby " + klucz);
        static int Calk(Dictionary<string, object?> o, string klucz, int brak) => o.TryGetValue(klucz, out var w) && w is double x ? (int)x : brak;

        // ------------------------------------------------------------------ poza
        /// <summary>
        /// Macierze skóry dla klipu w chwili t (null — poza spoczynkowa): 3×4 wierszami, 12 liczb na kość;
        /// punkt po = M · (punkt w pozie spoczynkowej, 1).
        /// </summary>
        public void Poza(Klip3D? klip, float t, float[] macierze)
        {
            int nk = kosci.Length;
            Span<float> glob = stackalloc float[nk * 12];
            Span<float> q = stackalloc float[4];
            Span<float> lok = stackalloc float[12];
            // klucze po obu stronach chwili t
            int k0 = 0, k1 = 0; float u = 0;
            if (klip != null && klip.czasy.Length > 0)
            {
                var cz = klip.czasy;
                if (t <= cz[0]) { k0 = k1 = 0; }
                else if (t >= cz[cz.Length - 1]) { k0 = k1 = cz.Length - 1; }
                else
                {
                    k1 = 1;
                    while (cz[k1] < t) k1++;
                    k0 = k1 - 1;
                    u = (t - cz[k0]) / (cz[k1] - cz[k0]);
                }
            }
            foreach (int i in kolejnosc)
            {
                var ob = klip?.obroty[i];
                if (ob == null) { for (int k = 0; k < 4; k++) q[k] = spoczR[i * 4 + k]; }
                else Slerp(ob, k0 * 4, k1 * 4, u, q);
                Obrot(q, lok);
                // skala (kolumnami macierzy obrotu): z klipu albo spoczynkowa
                var sk = klip?.skale[i];
                float sx = spoczS[i * 3], sy = spoczS[i * 3 + 1], sz = spoczS[i * 3 + 2];
                if (sk != null)
                {
                    sx = sk[k0 * 3] + (sk[k1 * 3] - sk[k0 * 3]) * u; sy = sk[k0 * 3 + 1] + (sk[k1 * 3 + 1] - sk[k0 * 3 + 1]) * u; sz = sk[k0 * 3 + 2] + (sk[k1 * 3 + 2] - sk[k0 * 3 + 2]) * u;
                }
                if (sx != 1 || sy != 1 || sz != 1) { lok[0] *= sx; lok[4] *= sx; lok[8] *= sx; lok[1] *= sy; lok[5] *= sy; lok[9] *= sy; lok[2] *= sz; lok[6] *= sz; lok[10] *= sz; }
                lok[3] = spoczT[i * 3]; lok[7] = spoczT[i * 3 + 1]; lok[11] = spoczT[i * 3 + 2];
                var g = glob.Slice(i * 12, 12);
                if (rodzic[i] < 0) lok.CopyTo(g);
                else Mnoz(glob.Slice(rodzic[i] * 12, 12), lok, g);
            }
            for (int i = 0; i < nk; i++)
                Mnoz(glob.Slice(i * 12, 12), odwrotne.AsSpan(i * 12, 12), macierze.AsSpan(i * 12, 12));
        }

        static void Slerp(float[] k, int a, int b, float u, Span<float> q)
        {
            float ax = k[a], ay = k[a + 1], az = k[a + 2], aw = k[a + 3];
            if (a == b || u <= 0) { q[0] = ax; q[1] = ay; q[2] = az; q[3] = aw; return; }
            float bx = k[b], by = k[b + 1], bz = k[b + 2], bw = k[b + 3];
            float c = ax * bx + ay * by + az * bz + aw * bw;
            if (c < 0) { c = -c; bx = -bx; by = -by; bz = -bz; bw = -bw; }
            float wa, wb;
            if (c > 0.9995f) { wa = 1 - u; wb = u; }
            else
            {
                float kat = MathF.Acos(c), s = MathF.Sin(kat);
                wa = MathF.Sin((1 - u) * kat) / s; wb = MathF.Sin(u * kat) / s;
            }
            float x = ax * wa + bx * wb, y = ay * wa + by * wb, z = az * wa + bz * wb, w = aw * wa + bw * wb;
            float l = 1 / MathF.Sqrt(x * x + y * y + z * z + w * w);
            q[0] = x * l; q[1] = y * l; q[2] = z * l; q[3] = w * l;
        }

        /// <summary>Macierz obrotu (3×4 wierszami, bez przesunięcia) z kwaternionu.</summary>
        static void Obrot(ReadOnlySpan<float> q, Span<float> m)
        {
            float x = q[0], y = q[1], z = q[2], w = q[3];
            m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y - z * w); m[2] = 2 * (x * z + y * w); m[3] = 0;
            m[4] = 2 * (x * y + z * w); m[5] = 1 - 2 * (x * x + z * z); m[6] = 2 * (y * z - x * w); m[7] = 0;
            m[8] = 2 * (x * z - y * w); m[9] = 2 * (y * z + x * w); m[10] = 1 - 2 * (x * x + y * y); m[11] = 0;
        }

        /// <summary>c = a · b dla macierzy 3×4 (czwarty wiersz 0 0 0 1).</summary>
        static void Mnoz(ReadOnlySpan<float> a, ReadOnlySpan<float> b, Span<float> c)
        {
            for (int w = 0; w < 3; w++)
            {
                float a0 = a[w * 4], a1 = a[w * 4 + 1], a2 = a[w * 4 + 2], a3 = a[w * 4 + 3];
                c[w * 4] = a0 * b[0] + a1 * b[4] + a2 * b[8];
                c[w * 4 + 1] = a0 * b[1] + a1 * b[5] + a2 * b[9];
                c[w * 4 + 2] = a0 * b[2] + a1 * b[6] + a2 * b[10];
                c[w * 4 + 3] = a0 * b[3] + a1 * b[7] + a2 * b[11] + a3;
            }
        }
    }
}
