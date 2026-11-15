// Programowy rasteryzator trójkątów z buforem głębi: model 3D → obrazek RGBA. Rzut prostokątny (jak w modelu dłoni),
// barwy liczone w wierzchołkach i mieszane po trójkącie, wygładzanie krawędzi przez nadpróbkowanie (obraz rysowany
// `nad` razy większy i zmniejszany uśrednianiem). Czysty C#, bez Skii — w silniku tę robotę robi karta graficzna.
using System;

namespace Trzewia.Rysunek.Model3D
{
    public sealed class Rasteryzator
    {
        int w, h;
        float[] glebia = Array.Empty<float>();
        /// <summary>barwa RGBA (alfa wymnożona) na piksel bufora</summary>
        float[] kolor = Array.Empty<float>();

        public int Szer => w;
        public int Wys => h;

        public void Zacznij(int szer, int wys)
        {
            w = szer; h = wys;
            if (glebia.Length < w * h) { glebia = new float[w * h]; kolor = new float[w * h * 4]; }
            Array.Fill(glebia, float.NegativeInfinity, 0, w * h);
            Array.Clear(kolor, 0, w * h * 4);
        }

        /// <summary>
        /// Rysuje siatkę: `ekran` — x, y (piksele bufora, y w dół), z (większe = bliżej widza) na wierzchołek;
        /// `barwy` — RGBA z wymnożoną alfą na wierzchołek. Trójkąty odwrócone tyłem do widza są pomijane.
        /// </summary>
        public void Rysuj(float[] ekran, float[] barwy, int[] troj)
        {
            var gl = glebia; var kol = kolor;
            int szer = w, wys = h;
            for (int t = 0; t < troj.Length; t += 3)
            {
                int ia = troj[t] * 3, ib = troj[t + 1] * 3, ic = troj[t + 2] * 3;
                float ax = ekran[ia], ay = ekran[ia + 1], bx = ekran[ib], by = ekran[ib + 1], cx = ekran[ic], cy = ekran[ic + 1];
                // pole ze znakiem: przodem do widza są trójkąty zgodne z ruchem wskazówek zegara na ekranie (y w dół)
                float pole = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
                if (pole <= 1e-8f) continue;
                float minX = MathF.Min(ax, MathF.Min(bx, cx)), maxX = MathF.Max(ax, MathF.Max(bx, cx));
                float minY = MathF.Min(ay, MathF.Min(by, cy)), maxY = MathF.Max(ay, MathF.Max(by, cy));
                int x0 = Math.Max(0, (int)MathF.Ceiling(minX - 0.5f)), x1 = Math.Min(szer - 1, (int)MathF.Floor(maxX - 0.5f));
                int y0 = Math.Max(0, (int)MathF.Ceiling(minY - 0.5f)), y1 = Math.Min(wys - 1, (int)MathF.Floor(maxY - 0.5f));
                if (x0 > x1 || y0 > y1) continue;
                float az = ekran[ia + 2], bz = ekran[ib + 2], cz = ekran[ic + 2];
                float odwr = 1 / pole;
                // wagi barycentryczne: wa przy A (krawędź BC), wb przy B (krawędź CA), wc = 1 − wa − wb
                float waDx = (by - cy) * odwr, waDy = (cx - bx) * odwr;       // pochodne po x i po y
                float wbDx = (cy - ay) * odwr, wbDy = (ax - cx) * odwr;
                float px = x0 + 0.5f, py = y0 + 0.5f;
                float wa0 = ((cx - bx) * (py - by) - (cy - by) * (px - bx)) * odwr;
                float wb0 = ((ax - cx) * (py - cy) - (ay - cy) * (px - cx)) * odwr;
                int ka = troj[t] * 4, kb = troj[t + 1] * 4, kc = troj[t + 2] * 4;
                for (int y = y0; y <= y1; y++)
                {
                    float wa = wa0, wb = wb0;
                    int o = y * szer + x0;
                    for (int x = x0; x <= x1; x++, o++, wa += waDx, wb += wbDx)
                    {
                        float wc = 1 - wa - wb;
                        if (wa < 0 || wb < 0 || wc < 0) continue;
                        float z = az * wa + bz * wb + cz * wc;
                        if (z <= gl[o]) continue;
                        gl[o] = z;
                        int k = o * 4;
                        kol[k] = barwy[ka] * wa + barwy[kb] * wb + barwy[kc] * wc;
                        kol[k + 1] = barwy[ka + 1] * wa + barwy[kb + 1] * wb + barwy[kc + 1] * wc;
                        kol[k + 2] = barwy[ka + 2] * wa + barwy[kb + 2] * wb + barwy[kc + 2] * wc;
                        kol[k + 3] = barwy[ka + 3] * wa + barwy[kb + 3] * wb + barwy[kc + 3] * wc;
                    }
                    wa0 += waDy; wb0 += wbDy;
                }
            }
        }

        int[] stos = Array.Empty<int>();
        /// <summary>
        /// Zatyka dziury na wylot: piksele bez siatki, do których nie da się dojść od brzegu obrazu, dostają podaną barwę
        /// (ciemne wnętrze). Do zaciśniętej pięści — w modelu źródłowym jej wnętrze jest wypełnione, a skóra ugięta
        /// kośćmi zostawia między kciukiem a palcami szparę na kilka pikseli.
        /// </summary>
        public void ZatkajDziury(float r, float g, float b)
        {
            int n = w * h;
            if (stos.Length < n) stos = new int[n];
            // 1 — puste i połączone z brzegiem (głębia zostaje −∞, znacznik w kanale alfa: −1)
            int ile = 0;
            void Dodaj(int o) { if (float.IsNegativeInfinity(glebia[o]) && kolor[o * 4 + 3] == 0) { kolor[o * 4 + 3] = -1; stos[ile++] = o; } }
            for (int x = 0; x < w; x++) { Dodaj(x); Dodaj((h - 1) * w + x); }
            for (int y = 0; y < h; y++) { Dodaj(y * w); Dodaj(y * w + w - 1); }
            while (ile > 0)
            {
                int o = stos[--ile], x = o % w, y = o / w;
                if (x > 0) Dodaj(o - 1);
                if (x < w - 1) Dodaj(o + 1);
                if (y > 0) Dodaj(o - w);
                if (y < h - 1) Dodaj(o + w);
            }
            for (int o = 0; o < n; o++)
            {
                if (!float.IsNegativeInfinity(glebia[o])) continue;
                int k = o * 4;
                if (kolor[k + 3] < 0) { kolor[k + 3] = 0; continue; }
                kolor[k] = r; kolor[k + 1] = g; kolor[k + 2] = b; kolor[k + 3] = 1;
            }
        }

        /// <summary>Zmniejsza bufor `nad` razy (uśrednianie) do pikseli RGBA 8-bitowych z wymnożoną alfą.</summary>
        public byte[] Piksele(int nad, out int szer, out int wys)
        {
            szer = w / nad; wys = h / nad;
            var wynik = new byte[szer * wys * 4];
            float skala = 255f / (nad * nad);
            for (int y = 0; y < wys; y++)
                for (int x = 0; x < szer; x++)
                {
                    float r = 0, g = 0, b = 0, a = 0;
                    for (int j = 0; j < nad; j++)
                    {
                        int o = ((y * nad + j) * w + x * nad) * 4;
                        for (int i = 0; i < nad; i++, o += 4) { r += kolor[o]; g += kolor[o + 1]; b += kolor[o + 2]; a += kolor[o + 3]; }
                    }
                    int k = (y * szer + x) * 4;
                    float af = a * skala;
                    byte ab = (byte)MathF.Min(255f, af + 0.5f);
                    // barwa nie jaśniejsza od alfy (wymnożona alfa)
                    wynik[k] = (byte)MathF.Min(ab, r * skala + 0.5f);
                    wynik[k + 1] = (byte)MathF.Min(ab, g * skala + 0.5f);
                    wynik[k + 2] = (byte)MathF.Min(ab, b * skala + 0.5f);
                    wynik[k + 3] = ab;
                }
            return wynik;
        }
    }
}
