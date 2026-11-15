// Dłoń z otchłani i dłoń anielska jako model 3D rysowany na żywo (decyzja użytkownika 12.11: „dłoń ma być modelem 3D,
// nie plikiem”). W TS gra wklejała klatki z arkuszy WebP (render/dlon.ts: rysujKlatke — 10 klatek na akcję),
// wyrenderowane z modelu alpha-1/scripts/dlon/model.html. Tutaj ten sam model jest siatką ze szkieletem
// (dane/grafika/modele/*.glb — buduje je narzedzia/dlon3d), a klatkę w dowolnej chwili animacji rysuje ta klasa:
// poza szkieletu → skóra → światło → rasteryzator. Kadr, kamera i światła są te same co w main() modelu.
//
// Cienie rzucane i okluzja są zapieczone dla póz kluczowych każdej animacji (plik <model>.swiatlo.gz — liczone
// oryginalnym shaderem na bryłach danej pozy) i mieszane między pozami; silnik (Unity, Godot) policzy je sam.
//
// Różnice wobec klatek z TS (świadome, do raportu): ruch jest płynny (dowolna chwila animacji, nie 10 klatek);
// światło liczone w wierzchołkach (siatka co 0,2 jednostki), bez mikrofaktury porów skóry; skóra między pozami
// ugina się wagami kości, nie zlewaniem brył — przy stawach może się różnić o ułamek jednostki.
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading.Tasks;
using Trzewia.Plotna;
using Trzewia.Rdzen;

namespace Trzewia.Rysunek.Model3D
{
    /// <summary>Gotowa klatka dłoni: obrazek całego kadru (jak klatka arkusza w TS) i jego piksele na jednostkę modelu.</summary>
    public sealed class KlatkaDloni
    {
        public IObraz obraz = null!;
        public double pxNaJedn;
        internal string klucz = "";
        internal long uzyta;
    }

    /// <summary>Światło póz kluczowych jednej animacji: na wierzchołek 3 bajty — cień ciepłego światła, cień łuny, okluzja.</summary>
    sealed class SwiatloKlipu
    {
        public float[] czasy = Array.Empty<float>();
        public byte[] dane = Array.Empty<byte>();
    }

    public sealed class Dlon3D
    {
        /// <summary>Kadr jak ARKUSZ w render/dlon.ts: płaszczyzna obrazu x ∈ [−17, 27], y ∈ [−11, 9] (jednostki modelu).</summary>
        public const double X0 = -17, Y1 = 9, SZER = 44, WYS = 20;
        /// <summary>Nadpróbkowanie (wygładzone krawędzie) — w TS klatki też były renderowane 2× większe i zmniejszane.</summary>
        const int NAD = 2;
        /// <summary>Na ile kroków dzielony jest czas animacji (TS: 10 klatek) — tyle różnych obrazków może powstać na klip.</summary>
        const int KROKOW = 72;
        const int PAMIEC = 6;

        public static readonly Dlon3D Otchlan = new Dlon3D("grafika/modele/dlon-z-otchlani.glb", false);
        public static readonly Dlon3D Anielska = new Dlon3D("grafika/modele/dlon-anielska.glb", true);

        readonly string plik;
        readonly bool aniol;
        Model3D? model;
        bool probowano;
        readonly Dictionary<string, SwiatloKlipu> swiatla = new Dictionary<string, SwiatloKlipu>();
        int wierzcholkowSwiatla;
        readonly Rasteryzator raster = new Rasteryzator();
        float[][] ekran = Array.Empty<float[]>(), barwy = Array.Empty<float[]>();
        float[] macierze = Array.Empty<float>();
        readonly List<KlatkaDloni> pamiec = new List<KlatkaDloni>();
        long licznik;

        Dlon3D(string plik, bool aniol) { this.plik = plik; this.aniol = aniol; }

        public Model3D? Model
        {
            get
            {
                if (!probowano) { probowano = true; model = Model3D.Wczytaj(plik); if (model != null) WczytajSwiatlo(); }
                return model;
            }
        }

        /// <summary>
        /// Klatka animacji `klip` w chwili `t` (0..1) w rozdzielczości co najmniej `pxNaJedn` pikseli na jednostkę modelu.
        /// Obrazki są pamiętane (kilka ostatnich), więc dłoń stojąca w miejscu nie jest liczona co klatkę.
        /// </summary>
        public KlatkaDloni? Klatka(string klip, double t, double pxNaJedn)
        {
            var m = Model;
            if (m == null) return null;
            // szczeble rozdzielczości co ~19% — przy zmianie powiększenia obrazek nie powstaje co klatkę na nowo
            int szczebel = (int)Math.Ceiling(Math.Log(Math.Clamp(pxNaJedn, 4, 40) / 4) / Math.Log(1.19));
            int px = (int)Math.Ceiling(4 * Math.Pow(1.19, szczebel));
            int krok = (int)Math.Round(Math.Clamp(t, 0, 1) * KROKOW);
            var klucz = klip + "/" + krok + "/" + px;
            foreach (var k in pamiec) if (k.klucz == klucz) { k.uzyta = ++licznik; return k; }
            var piksele = Renderuj(klip, krok / (double)KROKOW, px, out int w, out int h);
            var nowa = new KlatkaDloni { obraz = Plotno.Fabryka.ObrazZPikseli(w, h, piksele), pxNaJedn = px, klucz = klucz, uzyta = ++licznik };
            if (pamiec.Count >= PAMIEC)
            {
                int najst = 0;
                for (int i = 1; i < pamiec.Count; i++) if (pamiec[i].uzyta < pamiec[najst].uzyta) najst = i;
                (pamiec[najst].obraz as IDisposable)?.Dispose();
                pamiec.RemoveAt(najst);
            }
            pamiec.Add(nowa);
            return nowa;
        }

        /// <summary>Plik <model>.swiatlo.gz (narzedzia/dlon3d/buduj.mjs): „TRZS”, wersja, wierzchołków, klipów; klip: nazwa, czasy, bajty.</summary>
        void WczytajSwiatlo()
        {
            var sciezka = plik.Substring(0, plik.Length - 4) + ".swiatlo.gz";
            try
            {
                using var zrodlo = Zasoby.Otworz(sciezka);
                if (zrodlo == null) { Dziennik.Pisz($"brak światła modelu: {sciezka} — dłoń bez cieni"); return; }
                using var gz = new GZipStream(zrodlo, CompressionMode.Decompress);
                using var pamiecStr = new MemoryStream();
                gz.CopyTo(pamiecStr);
                var d = pamiecStr.ToArray();
                int o = 0;
                int I() { int x = BitConverter.ToInt32(d, o); o += 4; return x; }
                if (d.Length < 16 || d[0] != 'T' || d[1] != 'R' || d[2] != 'Z' || d[3] != 'S') throw new FormatException("to nie jest plik światła");
                o = 4;
                if (I() != 1) throw new FormatException("nieznana wersja");
                int n = I(), klipow = I(), razem = 0;
                foreach (var si in model!.siatki) razem += si.n;
                if (n != razem) throw new FormatException($"światło dla {n} wierzchołków, model ma {razem}");
                for (int k = 0; k < klipow; k++)
                {
                    int dl = I();
                    var nazwa = Encoding.UTF8.GetString(d, o, dl); o += dl;
                    int kluczy = I();
                    var sw = new SwiatloKlipu { czasy = new float[kluczy], dane = new byte[kluczy * n * 3] };
                    for (int i = 0; i < kluczy; i++) { sw.czasy[i] = BitConverter.ToSingle(d, o); o += 4; }
                    Buffer.BlockCopy(d, o, sw.dane, 0, sw.dane.Length); o += sw.dane.Length;
                    swiatla[nazwa] = sw;
                }
                wierzcholkowSwiatla = n;
            }
            catch (Exception e) { swiatla.Clear(); Dziennik.Pisz($"światło modelu nieczytelne: {sciezka}: {e.Message}"); }
        }

        // ------------------------------------------------------------------ kamera i światła — jak w main() modelu
        static readonly float[] Vc = Norm(0f, 0.62f, -0.78f);                 // od sceny do widza (rzut prostokątny)
        static readonly float[] Uu = Norm(0f, 1f - Vc[1] * Vc[1], -Vc[1] * Vc[2]);   // „w górę” na obrazie
        static readonly float[] L2 = Norm(-0.75f, 0.3f, 0.6f);                // czerwona łuna otchłani zza dłoni
        static readonly float[] L3 = Norm(0.1f, -1f, -0.15f);                 // odblask otchłani od dołu
        static readonly float[] La = Norm(-0.7f, 0.5f, -0.5f);                // anielska: złote światło od nadgarstka
        static readonly float[] Ha = Norm(La[0] + Vc[0], La[1] + Vc[1], La[2] + Vc[2]);
        const float LX = 25f, LY = 5f, LZ = -8f;                              // ciepłe światło lampek przed palcami

        static float[] Norm(float x, float y, float z) { float l = 1 / MathF.Sqrt(x * x + y * y + z * z); return new[] { x * l, y * l, z * l }; }
        static float Sat(float x) => x < 0 ? 0 : x > 1 ? 1 : x;
        static float Gladki(float a, float b, float x) { float t = Sat((x - a) / (b - a)); return t * t * (3 - 2 * t); }
        static float Aces(float x) => Sat(x * (2.51f * x + 0.03f) / (x * (2.43f * x + 0.59f) + 0.14f));
        static float Gamma(float x) => MathF.Pow(x, 1f / 2.2f);

        /// <summary>Piksele RGBA (alfa wymnożona) całego kadru w rozdzielczości `px` pikseli na jednostkę.</summary>
        public byte[] Renderuj(string klip, double t, int px, out int szer, out int wys)
        {
            var m = Model ?? throw new InvalidOperationException("brak modelu dłoni: " + plik);
            m.klipy.TryGetValue(klip, out var kl);
            if (macierze.Length != m.kosci.Length * 12) macierze = new float[m.kosci.Length * 12];
            m.Poza(kl, (float)(t * (kl?.dlugosc ?? 0)), macierze);
            if (ekran.Length != m.siatki.Length)
            {
                ekran = new float[m.siatki.Length][]; barwy = new float[m.siatki.Length][];
                for (int i = 0; i < m.siatki.Length; i++) { ekran[i] = new float[m.siatki[i].n * 3]; barwy[i] = new float[m.siatki[i].n * 4]; }
            }
            float s = px * NAD;
            raster.Zacznij((int)(SZER * s), (int)(WYS * s));
            // światło pozy: dwa sąsiednie klucze i waga między nimi
            byte[]? sw = null; int sw0 = 0, sw1 = 0; float swU = 0;
            if (swiatla.TryGetValue(klip, out var swk) && swk.czasy.Length > 0)
            {
                sw = swk.dane;
                var cz = swk.czasy; float tt = (float)t;
                int k1 = 0;
                while (k1 < cz.Length - 1 && cz[k1] < tt) k1++;
                int k0 = k1 > 0 && cz[k1] > tt ? k1 - 1 : k1;
                swU = k1 == k0 ? 0 : (tt - cz[k0]) / (cz[k1] - cz[k0]);
                sw0 = k0 * wierzcholkowSwiatla * 3; sw1 = k1 * wierzcholkowSwiatla * 3;
            }
            int pierwszy = 0;
            for (int i = 0; i < m.siatki.Length; i++)
            {
                var si = m.siatki[i];
                var e = ekran[i]; var b = barwy[i];
                bool pazur = si.material != "skora";
                int przes = pierwszy * 3;
                const int PORCJA = 2048;
                Parallel.For(0, (si.n + PORCJA - 1) / PORCJA, nr =>
                {
                    int od = nr * PORCJA, doo = Math.Min(si.n, od + PORCJA);
                    Wierzcholki(si, od, doo, s, pazur, e, b, sw, sw0 + przes, sw1 + przes, swU);
                });
                raster.Rysuj(e, b, si.troj);
                pierwszy += si.n;
            }
            // zaciśnięta pięść: w modelu źródłowym wnętrze pięści jest pełne (uPiesc od zacisku 0,6) — szpara na wylot
            // między kciukiem a palcami, która zostaje po ugięciu skóry kośćmi, dostaje ciemne wnętrze
            if (!aniol && klip == "zacisk" && t >= 0.7) raster.ZatkajDziury(0.05f, 0.03f, 0.028f);
            return raster.Piksele(NAD, out szer, out wys);
        }

        /// <summary>Skóra (wagi kości) i światło dla wierzchołków od..do: pozycja na ekranie i barwa.</summary>
        void Wierzcholki(Siatka3D si, int od, int doo, float s, bool pazur, float[] e, float[] b, byte[]? sw, int sw0, int sw1, float swU)
        {
            var mac = macierze;
            Span<float> M = stackalloc float[12];
            for (int i = od; i < doo; i++)
            {
                // macierz wierzchołka: suma macierzy kości z wagami
                M.Clear();
                for (int k = 0; k < 4; k++)
                {
                    float wg = si.wagi[i * 4 + k];
                    if (wg <= 0) continue;
                    int o = si.kosci[i * 4 + k] * 12;
                    for (int q = 0; q < 12; q++) M[q] += mac[o + q] * wg;
                }
                float x0 = si.wierz[i * 3], y0 = si.wierz[i * 3 + 1], z0 = si.wierz[i * 3 + 2];
                float px = M[0] * x0 + M[1] * y0 + M[2] * z0 + M[3];
                float py = M[4] * x0 + M[5] * y0 + M[6] * z0 + M[7];
                float pz = M[8] * x0 + M[9] * y0 + M[10] * z0 + M[11];
                float a0 = si.normalne[i * 3], a1 = si.normalne[i * 3 + 1], a2 = si.normalne[i * 3 + 2];
                float nx = M[0] * a0 + M[1] * a1 + M[2] * a2, ny = M[4] * a0 + M[5] * a1 + M[6] * a2, nz = M[8] * a0 + M[9] * a1 + M[10] * a2;
                float nl = 1 / MathF.Sqrt(nx * nx + ny * ny + nz * nz + 1e-12f);
                nx *= nl; ny *= nl; nz *= nl;

                e[i * 3] = (px - (float)X0) * s;
                e[i * 3 + 1] = ((float)Y1 - (py * Uu[1] + pz * Uu[2])) * s;
                e[i * 3 + 2] = py * Vc[1] + pz * Vc[2];

                float ar = si.barwa[i * 4], ag = si.barwa[i * 4 + 1], ab = si.barwa[i * 4 + 2], alfa = si.barwa[i * 4 + 3];
                float ao = si.uv0[i * 2], wkl = si.uv0[i * 2 + 1], dod = si.uv1[i * 2];
                // światło pozy (cienie rzucane i okluzja tej pozy) — bez pliku światła: bez cieni, okluzja z otwartej dłoni
                float c1 = 1, c2 = 1;
                if (sw != null)
                {
                    int a = sw0 + i * 3, c = sw1 + i * 3;
                    c1 = (sw[a] + (sw[c] - sw[a]) * swU) / 255f;
                    c2 = (sw[a + 1] + (sw[c + 1] - sw[a + 1]) * swU) / 255f;
                    float aoPozy = (sw[a + 2] + (sw[c + 2] - sw[a + 2]) * swU) / 255f;
                    // barwa w modelu ma wymnożoną okluzję otwartej dłoni — podmiana na okluzję tej pozy
                    float popr = pazur ? 1 : aniol ? (0.66f + 0.34f * aoPozy) / (0.66f + 0.34f * ao) : (0.7f + 0.3f * aoPozy) / (0.7f + 0.3f * ao);
                    ar *= popr; ag *= popr; ab *= popr;
                    ao = aoPozy;
                }
                float nV = Sat(nx * Vc[0] + ny * Vc[1] + nz * Vc[2]);
                float r, g, bl;
                if (aniol)
                {
                    // dłoń anielska: złote światło od nadgarstka, ciepła skóra, perłowe paznokcie, złota poświata na obrysie
                    float nLa = nx * La[0] + ny * La[1] + nz * La[2];
                    float difA = Sat((nLa + 0.15f) / 1.15f);
                    float fresA = MathF.Pow(1 - nV, 3.5f);
                    float nH = Sat(nx * Ha[0] + ny * Ha[1] + nz * Ha[2]);
                    float cienA = 0.45f + 0.55f * c1;
                    if (pazur)
                    {
                        float sw_ = 1.45f * difA * cienA;
                        r = ar * (1f * sw_ + 0.3f + 0.15f * ao); g = ag * (0.88f * sw_ + 0.13f + 0.115f * ao); bl = ab * (0.68f * sw_ + 0.08f + 0.1f * ao);
                        float sp = MathF.Pow(nH, 60f) * 0.22f * c1;
                        r += 1f * sp; g += 0.93f * sp; bl += 0.8f * sp;
                    }
                    else
                    {
                        float sss = MathF.Pow(Sat((nLa + 0.75f) / 1.75f), 2f) * 0.4f;
                        float sw_ = 1.55f * difA * cienA;
                        r = ar * (1f * sw_ + 1f * sss + 0.15f * ao); g = ag * (0.88f * sw_ + 0.42f * sss + 0.115f * ao); bl = ab * (0.68f * sw_ + 0.26f * sss + 0.1f * ao);
                        float sp = MathF.Pow(nH, 24f) * 0.25f * c1;
                        r += 1f * sp; g += 0.92f * sp; bl += 0.75f * sp;
                    }
                    r += 1f * 0.4f * fresA; g += 0.8f * 0.4f * fresA; bl += 0.42f * 0.4f * fresA;
                    // ku ramieniu dłoń roztapia się w świetle
                    float roz = (1 - Gladki(-15f, -3f, px)) * 0.6f;
                    r += (1.4f - r) * roz; g += (1.16f - g) * roz; bl += (0.84f - bl) * roz;
                    r = Gamma(Aces(r * 0.64f)); g = Gamma(Aces(g * 0.64f)); bl = Gamma(Aces(bl * 0.64f));
                }
                else
                {
                    float dx = LX - px, dy = LY - py, dz = LZ - pz;
                    float dist2 = dx * dx + dy * dy + dz * dz, odl = 1 / MathF.Sqrt(dist2);
                    float l1x = dx * odl, l1y = dy * odl, l1z = dz * odl;
                    float att = 1 / (1 + 0.0035f * dist2);
                    float sh = c1 * att * 1.9f;
                    float nL1 = nx * l1x + ny * l1y + nz * l1z;
                    float nL2 = nx * L2[0] + ny * L2[1] + nz * L2[2];
                    // H = normalize(L1 + V)
                    float hx = l1x + Vc[0], hy = l1y + Vc[1], hz = l1z + Vc[2];
                    float hl = 1 / MathF.Sqrt(hx * hx + hy * hy + hz * hz);
                    hx *= hl; hy *= hl; hz *= hl;
                    float nH = Sat(nx * hx + ny * hy + nz * hz);
                    if (pazur)
                    {
                        // róg: ciemny, z wąskim połyskiem; ostrze prześwituje bursztynem pod światło lampek
                        float dif = Sat(nL1) * sh;
                        float spec = MathF.Pow(nH, 30f) * 0.09f * sh;
                        float fres = MathF.Pow(1 - nV, 4f);
                        float sw_ = 1.6f * (0.25f + 0.75f * dif);
                        r = ar * (1f * sw_ + 0.15f * ao) + 1f * spec;
                        g = ag * (0.72f * sw_ + 0.15f * ao) + 0.86f * spec;
                        bl = ab * (0.5f * sw_ + 0.15f * ao) + 0.7f * spec;
                        float prz = Gladki(0.8f, 1f, dod) * MathF.Pow(Sat(-nL1 * 0.5f + 0.5f), 2f) * 0.08f * att * 1.9f;
                        r += 0.5f * prz; g += 0.2f * prz; bl += 0.06f * prz;
                        float luna = 1f * fres * Sat(nL2 + 0.6f) * (0.3f + 0.7f * c2);
                        r += 1f * luna; g += 0.1f * luna; bl += 0.04f * luna;
                        // reflect(−V, n) · L2
                        float rx = -Vc[0] + 2 * nV0(nx, ny, nz) * nx, ry = -Vc[1] + 2 * nV0(nx, ny, nz) * ny, rz = -Vc[2] + 2 * nV0(nx, ny, nz) * nz;
                        float odb = MathF.Pow(Sat(rx * L2[0] + ry * L2[1] + rz * L2[2]), 24f) * 1.2f;
                        r += 0.6f * odb; g += 0.05f * odb; bl += 0.02f * odb;
                    }
                    else
                    {
                        // skóra: popielata, martwa; ciepłe światło od palców, czerwona łuna na obrysie i od dołu
                        float volar = dod;
                        float dif = Sat((nL1 + 0.45f) / 1.45f);
                        float sss = MathF.Pow(Sat((nL1 + 0.9f) / 1.9f), 3f) * 0.16f * att * 1.9f * (1 - 0.6f * volar);
                        float sw_ = 1.5f * dif * sh;
                        r = ar * (1f * sw_ + 0.8f * sss); g = ag * (0.7f * sw_ + 0.22f * sss); bl = ab * (0.46f * sw_ + 0.14f * sss);
                        float fres = MathF.Pow(1 - nV, 3.4f);
                        float luna = 1.1f * fres * Sat(nL2 + 0.3f) * (0.15f + 0.85f * c2);
                        r += 1f * luna; g += 0.07f * luna; bl += 0.03f * luna;
                        float l2 = 1.6f * Sat(nL2) * (0.1f + 0.9f * c2);
                        r += ar * 1f * l2; g += ag * 0.1f * l2; bl += ab * 0.06f * l2;
                        float l3 = 0.4f * Sat(nx * L3[0] + ny * L3[1] + nz * L3[2]) * ao;
                        r += ar * 0.8f * l3; g += ag * 0.1f * l3; bl += ab * 0.06f * l3;
                        r += ar * 0.06f * ao; g += ag * 0.06f * ao; bl += ab * 0.08f * ao;
                        float odb = 0.22f * volar * ao * (0.4f + 0.6f * wkl);
                        r += ar * 0.46f * odb; g += ag * 0.32f * odb; bl += ab * 0.3f * odb;
                        // tłusty połysk na kostkach i ścięgnach
                        float hV = Sat(hx * Vc[0] + hy * Vc[1] + hz * Vc[2]);
                        float spec = MathF.Pow(nH, 34f) * (0.04f + 0.96f * MathF.Pow(1 - hV, 5f)) * 0.9f * sh * wkl;
                        r += 1f * spec; g += 0.78f * spec; bl += 0.55f * spec;
                    }
                    // w głąb otchłani ramię ciemnieje
                    float ciemno = 0.1f + 0.9f * Gladki(-14f, 6f, px);
                    r = Gamma(Aces(r * ciemno * 1.1f)); g = Gamma(Aces(g * ciemno * 1.1f)); bl = Gamma(Aces(bl * ciemno * 1.1f));
                }
                b[i * 4] = r * alfa; b[i * 4 + 1] = g * alfa; b[i * 4 + 2] = bl * alfa; b[i * 4 + 3] = alfa;
            }
        }

        /// <summary>n · V bez obcięcia (do odbicia).</summary>
        static float nV0(float nx, float ny, float nz) => nx * Vc[0] + ny * Vc[1] + nz * Vc[2];
    }
}
