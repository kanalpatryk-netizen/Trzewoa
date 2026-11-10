using System;
using System.Collections.Generic;

namespace Trzewia.Plotna
{
    /// <summary>
    /// Budowanie ścieżki jak w Canvas 2D — wspólne dla bieżącej ścieżki płótna (w warstwie rysunku) i dla Path2D.
    /// Tu jest cała logika przeglądarki: pomijanie liczb nieskończonych, „lineTo bez punktu działa jak moveTo”, kąty
    /// łuków i elips według Chrome (third_party/blink/.../canvas_path.cc), promienie roundRect według specyfikacji.
    /// Warstwa rysunku (Skia, a w przyszłości silnik) dostaje już tylko proste polecenia (p…).
    /// </summary>
    public abstract class BudowniczySciezki
    {
        /// <summary>Czy jest bieżący punkt (podścieżka).</summary>
        protected bool maPunkt;

        protected abstract void pMoveTo(float x, float y);
        protected abstract void pLineTo(float x, float y);
        protected abstract void pQuadTo(float cx, float cy, float x, float y);
        protected abstract void pCubicTo(float c1x, float c1y, float c2x, float c2y, float x, float y);
        protected abstract void pClose();
        /// <summary>
        /// Łuk elipsy (kąty w radianach, już dopasowane jak w Chrome: koniec − start to cały łuk, ±2π dla pełnej).
        /// Gdy jest bieżący punkt — najpierw odcinek do początku łuku, inaczej przejście do niego.
        /// </summary>
        protected abstract void pLuk(float cx, float cy, float rx, float ry, float obrot, float start, float koniec);
        protected abstract void pArcTo(float x1, float y1, float x2, float y2, float r);
        /// <summary>Zaokrąglony prostokąt (szerokość i wysokość dodatnie), promienie: lewy górny, prawy górny, prawy dolny, lewy dolny.</summary>
        protected abstract void pRoundRect(float x, float y, float w, float h, float lg, float pg, float pd, float ld);
        protected abstract void pAddPath(Path2D p, DOMMatrix? m);
        protected abstract void pWyczysc();
        public abstract bool Pusta { get; }

        protected void Wyczysc() { pWyczysc(); maPunkt = false; }

        static bool S(double a) => !double.IsNaN(a) && !double.IsInfinity(a);

        public void moveTo(double x, double y)
        {
            if (!S(x) || !S(y)) return;
            pMoveTo((float)x, (float)y);
            maPunkt = true;
        }

        public void lineTo(double x, double y)
        {
            if (!S(x) || !S(y)) return;
            if (!maPunkt) { moveTo(x, y); return; }
            pLineTo((float)x, (float)y);
        }

        public void quadraticCurveTo(double cx, double cy, double x, double y)
        {
            if (!S(cx) || !S(cy) || !S(x) || !S(y)) return;
            if (!maPunkt) moveTo(cx, cy);
            pQuadTo((float)cx, (float)cy, (float)x, (float)y);
        }

        public void bezierCurveTo(double c1x, double c1y, double c2x, double c2y, double x, double y)
        {
            if (!S(c1x) || !S(c1y) || !S(c2x) || !S(c2y) || !S(x) || !S(y)) return;
            if (!maPunkt) moveTo(c1x, c1y);
            pCubicTo((float)c1x, (float)c1y, (float)c2x, (float)c2y, (float)x, (float)y);
        }

        public void closePath()
        {
            if (Pusta) return;
            pClose();
        }

        /// <summary>rect: zamknięty prostokąt od (x, y); następna linia zaczyna się w (x, y).</summary>
        public void rect(double x, double y, double w, double h)
        {
            if (!S(x) || !S(y) || !S(w) || !S(h)) return;
            float fx = (float)x, fy = (float)y, fw = (float)w, fh = (float)h;
            pMoveTo(fx, fy);
            pLineTo(fx + fw, fy);
            pLineTo(fx + fw, fy + fh);
            pLineTo(fx, fy + fh);
            pClose();
            maPunkt = true;
        }

        public void arcTo(double x1, double y1, double x2, double y2, double r)
        {
            if (!S(x1) || !S(y1) || !S(x2) || !S(y2) || !S(r)) return;
            if (r < 0) throw new ArgumentOutOfRangeException(nameof(r), "arcTo: ujemny promień");
            if (!maPunkt) moveTo(x1, y1);
            pArcTo((float)x1, (float)y1, (float)x2, (float)y2, (float)r);
        }

        public void arc(double x, double y, double r, double start, double koniec, bool przeciwnie = false) =>
            ellipse(x, y, r, r, 0, start, koniec, przeciwnie);

        const float DwaPi = (float)(2 * Math.PI);

        static float Fmod(float a, float b) => a % b;   // jak fmodf w C: znak dzielnej

        /// <summary>Chrome: AdjustEndAngle — kąt końca dopasowany do kierunku i pełnego obrotu.</summary>
        static float DopasujKoniec(float start, float koniec, bool przeciwnie)
        {
            if (!przeciwnie && koniec - start >= DwaPi) return start + DwaPi;
            if (przeciwnie && start - koniec >= DwaPi) return start - DwaPi;
            if (!przeciwnie && start > koniec) return start + (DwaPi - Fmod(start - koniec, DwaPi));
            if (przeciwnie && start < koniec) return start - (DwaPi - Fmod(koniec - start, DwaPi));
            return koniec;
        }

        /// <summary>Chrome: CanonicalizeAngle — start w [0, 2π), koniec przesunięty o to samo.</summary>
        static void Kanonizuj(ref float start, ref float koniec)
        {
            float nowy = Fmod(start, DwaPi);
            if (nowy < 0) nowy += DwaPi;
            koniec += nowy - start;
            start = nowy;
        }

        public void ellipse(double x, double y, double rx, double ry, double obrot, double start, double koniec, bool przeciwnie = false)
        {
            if (!S(x) || !S(y) || !S(rx) || !S(ry) || !S(obrot) || !S(start) || !S(koniec)) return;
            if (rx < 0 || ry < 0) throw new ArgumentOutOfRangeException(nameof(rx), "ellipse: ujemny promień");
            float s = (float)start, k = (float)koniec;
            Kanonizuj(ref s, ref k);
            float dk = DopasujKoniec(s, k, przeciwnie);
            if (rx == 0 || ry == 0 || s == dk)
            {
                // Chrome: DegenerateEllipse — sama linia do punktów na (zdegenerowanej) elipsie
                Punkt((float)x, (float)y, (float)rx, (float)ry, (float)obrot, s, out var p0x, out var p0y);
                Punkt((float)x, (float)y, (float)rx, (float)ry, (float)obrot, dk, out var p1x, out var p1y);
                lineTo(p0x, p0y);
                lineTo(p1x, p1y);
                return;
            }
            pLuk((float)x, (float)y, (float)rx, (float)ry, (float)obrot, s, dk);
            maPunkt = true;
        }

        static void Punkt(float x, float y, float rx, float ry, float obrot, float kat, out float px, out float py)
        {
            float ex = rx * MathF.Cos(kat), ey = ry * MathF.Sin(kat);
            float c = MathF.Cos(obrot), sn = MathF.Sin(obrot);
            px = x + ex * c - ey * sn; py = y + ex * sn + ey * c;
        }

        /// <summary>roundRect(x, y, w, h, promienie): 1–4 promienie jak w Canvas 2D; za duże zmniejszone jak w specyfikacji.</summary>
        public void roundRect(double x, double y, double w, double h, params double[] r)
        {
            if (!S(x) || !S(y) || !S(w) || !S(h)) return;
            double lg, pg, pd, ld;
            switch (r.Length)
            {
                case 0: lg = pg = pd = ld = 0; break;
                case 1: lg = pg = pd = ld = r[0]; break;
                case 2: lg = pd = r[0]; pg = ld = r[1]; break;
                case 3: lg = r[0]; pg = ld = r[1]; pd = r[2]; break;
                default: lg = r[0]; pg = r[1]; pd = r[2]; ld = r[3]; break;
            }
            if (lg < 0 || pg < 0 || pd < 0 || ld < 0) throw new ArgumentOutOfRangeException(nameof(r), "roundRect: ujemny promień");
            double aw = Math.Abs(w), ah = Math.Abs(h);
            double skala = 1;
            if (lg + pg > 0) skala = Math.Min(skala, aw / (lg + pg));
            if (ld + pd > 0) skala = Math.Min(skala, aw / (ld + pd));
            if (lg + ld > 0) skala = Math.Min(skala, ah / (lg + ld));
            if (pg + pd > 0) skala = Math.Min(skala, ah / (pg + pd));
            if (skala < 1) { lg *= skala; pg *= skala; pd *= skala; ld *= skala; }
            pRoundRect((float)Math.Min(x, x + w), (float)Math.Min(y, y + h), (float)aw, (float)ah, (float)lg, (float)pg, (float)pd, (float)ld);
            pMoveTo((float)x, (float)y);
            maPunkt = true;
        }

        /// <summary>addPath (Path2D): dokłada inną ścieżkę, opcjonalnie przekształconą.</summary>
        public void addPath(Path2D inna, DOMMatrix? m = null)
        {
            pAddPath(inna, m);
            if (!inna.Pusta) maPunkt = true;
        }
    }

    /// <summary>
    /// Path2D: ścieżka zapamiętana jako lista prostych poleceń. Warstwa rysunku zamienia ją na swoją (np. SKPath)
    /// i trzyma gotową w <see cref="Uchwyt"/>, dopóki <see cref="Wersja"/> się nie zmieni — stała ścieżka (ikona,
    /// kształt postaci) zamienia się raz.
    /// </summary>
    public sealed class Path2D : BudowniczySciezki
    {
        public enum Polecenie : byte { Move, Line, Quad, Cubic, Close, Luk, ArcTo, RoundRect, Dodaj }

        readonly List<Polecenie> polecenia = new List<Polecenie>();
        readonly List<float> liczby = new List<float>();
        readonly List<(Path2D sciezka, DOMMatrix? m)> dolaczone = new List<(Path2D, DOMMatrix?)>();

        public IReadOnlyList<Polecenie> Polecenia => polecenia;
        /// <summary>Liczby poleceń po kolei: Move/Line 2, Quad 4, Cubic 6, Close 0, Luk 7, ArcTo 5, RoundRect 8, Dodaj 0.</summary>
        public IReadOnlyList<float> Liczby => liczby;
        public IReadOnlyList<(Path2D sciezka, DOMMatrix? m)> Dolaczone => dolaczone;
        public int Wersja { get; private set; }
        public object? Uchwyt;
        public int UchwytWersja = -1;

        public Path2D() { }
        public Path2D(Path2D inna) { addPath(inna); }

        public override bool Pusta => polecenia.Count == 0;

        void Dopisz(Polecenie p, params float[] l) { polecenia.Add(p); liczby.AddRange(l); Wersja++; }

        protected override void pMoveTo(float x, float y) => Dopisz(Polecenie.Move, x, y);
        protected override void pLineTo(float x, float y) => Dopisz(Polecenie.Line, x, y);
        protected override void pQuadTo(float cx, float cy, float x, float y) => Dopisz(Polecenie.Quad, cx, cy, x, y);
        protected override void pCubicTo(float a, float b, float c, float d, float x, float y) => Dopisz(Polecenie.Cubic, a, b, c, d, x, y);
        protected override void pClose() => Dopisz(Polecenie.Close);
        protected override void pLuk(float cx, float cy, float rx, float ry, float obrot, float start, float koniec) => Dopisz(Polecenie.Luk, cx, cy, rx, ry, obrot, start, koniec);
        protected override void pArcTo(float x1, float y1, float x2, float y2, float r) => Dopisz(Polecenie.ArcTo, x1, y1, x2, y2, r);
        protected override void pRoundRect(float x, float y, float w, float h, float lg, float pg, float pd, float ld) => Dopisz(Polecenie.RoundRect, x, y, w, h, lg, pg, pd, ld);
        protected override void pAddPath(Path2D p, DOMMatrix? m) { dolaczone.Add((p, m)); Dopisz(Polecenie.Dodaj); }
        protected override void pWyczysc() { polecenia.Clear(); liczby.Clear(); dolaczone.Clear(); Wersja++; }
    }
}
