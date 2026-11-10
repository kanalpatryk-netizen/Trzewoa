using System;
using System.Collections.Generic;
using System.IO;
using SkiaSharp;
using Trzewia.Plotna;

namespace Trzewia.Skia
{
    /// <summary>
    /// IPlotno na SkiaSharp — rysunek na karcie graficznej (gdy gospodarz dał <see cref="FabrykaSkia.Kontekst"/>)
    /// albo procesorem. Chrome też rysuje Canvas 2D Skią, więc obraz jest bardzo bliski. Zachowania przeglądarki
    /// odtworzone według kodu Chrome:
    /// <list type="bullet">
    /// <item>bieżąca ścieżka w przestrzeni użytkownika: zmiana przekształcenia przelicza ją odwrotnością zmiany;</item>
    /// <item>tryby „bez granic” (source-in, source-out, destination-in, destination-atop, copy) czyszczą płótno poza
    /// kształtem — przez warstwę, jak CompositedDraw w Chrome;</item>
    /// <item>cień i filtr w warstwie w pikselach płótna (niezależnie od przekształcenia), sigma cienia = shadowBlur / 2;</item>
    /// <item>tekst: linia bazowa i wyrównanie jak w Chrome, składanie HarfBuzzem, zapasowe kroje dla brakujących znaków.</item>
    /// </list>
    /// </summary>
    public sealed class PlotnoSkia : IPlotno
    {
        SKSurface? wlasna;
        SKCanvas c = null!;
        int szer, wys;
        /// <summary>Płótno zmienione od ostatniej migawki (drawImage tego płótna bierze wtedy nową).</summary>
        bool zmienione = true;
        SKImage? migawka;

        struct Stan
        {
            public Styl fill, stroke;
            public double alpha;
            public SKBlendMode tryb;
            public string trybNazwa;
            public bool bezGranic;
            public double lineWidth, miterLimit, dashOffset;
            public SKStrokeCap cap;
            public SKStrokeJoin join;
            public float[]? dash;
            public SKPathEffect? dashEfekt;
            public double shadowBlur, shadowX, shadowY;
            public Barwa shadowColor;
            public Kroj kroj;
            public string font, textAlign, textBaseline;
            public string filter;
            public SKImageFilter? filtr;
            public bool smoothing;
            public string smoothingQuality;
        }

        Stan s;
        readonly Stack<Stan> stos = new Stack<Stan>();
        readonly SciezkaSkia sciezka = new SciezkaSkia();
        readonly SKPaint farba = new SKPaint { IsAntialias = true };
        readonly SKPaint warstwa = new SKPaint();
        readonly SKPath pomocnicza = new SKPath();

        /// <summary>Płótno pomocnicze (jak document.createElement('canvas') o rozmiarze w × h), przezroczyste.</summary>
        public PlotnoSkia(int w, int h) { UstawRozmiar(w, h); }

        /// <summary>Płótno rysujące na cudzym SKCanvas (okno gry) — rozmiar w pikselach.</summary>
        public PlotnoSkia(SKCanvas cel, int w, int h) { UstawCel(cel, w, h); }

        public IPlotno getContext(string rodzaj = "2d") => this;
        public IPlotno canvas => this;
        public SKCanvas Canvas => c;

        public int width { get => szer; set => UstawRozmiar(value, wys); }
        public int height { get => wys; set => UstawRozmiar(szer, value); }

        /// <summary>Jak ustawienie canvas.width/height: nowe, puste płótno i stan od nowa (także przy tym samym rozmiarze).</summary>
        public void UstawRozmiar(int w, int h)
        {
            w = Math.Max(0, w); h = Math.Max(0, h);
            migawka?.Dispose(); migawka = null;
            wlasna?.Dispose();
            var info = new SKImageInfo(Math.Max(1, w), Math.Max(1, h), SKColorType.Rgba8888, SKAlphaType.Premul);
            wlasna = (FabrykaSkia.Kontekst != null ? SKSurface.Create(FabrykaSkia.Kontekst, true, info) : null) ?? SKSurface.Create(info);
            c = wlasna.Canvas;
            c.Clear(SKColors.Transparent);
            szer = w; wys = h;
            Resetuj();
        }

        /// <summary>Płótno okna: nowy SKCanvas (po zmianie rozmiaru okna) i stan od nowa.</summary>
        public void UstawCel(SKCanvas cel, int w, int h)
        {
            migawka?.Dispose(); migawka = null;
            wlasna?.Dispose(); wlasna = null;
            c = cel;
            szer = w; wys = h;
            Resetuj();
        }

        void Resetuj()
        {
            c.RestoreToCount(1);
            c.ResetMatrix();
            stos.Clear();
            sciezka.Czysc();
            s = new Stan
            {
                fill = Styl.Czarny, stroke = Styl.Czarny, alpha = 1, tryb = SKBlendMode.SrcOver, trybNazwa = "source-over",
                lineWidth = 1, miterLimit = 10, cap = SKStrokeCap.Butt, join = SKStrokeJoin.Miter,
                shadowColor = Barwa.Przezroczysta,
                kroj = Kroj.Domyslny, font = "10px sans-serif", textAlign = "start", textBaseline = "alphabetic",
                filter = "none", smoothing = true, smoothingQuality = "low",
            };
            zmienione = true;
        }

        // ───────────────────────────── stan ─────────────────────────────

        public void save() { stos.Push(s); c.Save(); }

        public void restore()
        {
            if (stos.Count == 0) return;
            var stara = c.TotalMatrix;
            s = stos.Pop();
            c.Restore();
            PrzeliczSciezke(stara, c.TotalMatrix);
        }

        public Styl fillStyle { get => s.fill; set { if (!value.Pusty) s.fill = value; } }
        public Styl strokeStyle { get => s.stroke; set { if (!value.Pusty) s.stroke = value; } }

        public double globalAlpha
        {
            get => s.alpha;
            set { if (value >= 0 && value <= 1) s.alpha = value; }
        }

        public string globalCompositeOperation
        {
            get => s.trybNazwa;
            set
            {
                SKBlendMode? t = value switch
                {
                    "source-over" => SKBlendMode.SrcOver, "lighter" => SKBlendMode.Plus, "multiply" => SKBlendMode.Multiply,
                    "screen" => SKBlendMode.Screen, "overlay" => SKBlendMode.Overlay, "darken" => SKBlendMode.Darken,
                    "lighten" => SKBlendMode.Lighten, "color-dodge" => SKBlendMode.ColorDodge, "color-burn" => SKBlendMode.ColorBurn,
                    "hard-light" => SKBlendMode.HardLight, "soft-light" => SKBlendMode.SoftLight, "difference" => SKBlendMode.Difference,
                    "exclusion" => SKBlendMode.Exclusion, "hue" => SKBlendMode.Hue, "saturation" => SKBlendMode.Saturation,
                    "color" => SKBlendMode.Color, "luminosity" => SKBlendMode.Luminosity, "source-atop" => SKBlendMode.SrcATop,
                    "destination-over" => SKBlendMode.DstOver, "destination-out" => SKBlendMode.DstOut, "xor" => SKBlendMode.Xor,
                    "source-in" => SKBlendMode.SrcIn, "source-out" => SKBlendMode.SrcOut, "destination-in" => SKBlendMode.DstIn,
                    "destination-atop" => SKBlendMode.DstATop, "copy" => SKBlendMode.Src,
                    _ => null,
                };
                if (t == null) return;
                s.tryb = t.Value;
                s.trybNazwa = value;
                // Chrome: IsFullCanvasCompositeMode — te tryby zmieniają też piksele poza kształtem
                s.bezGranic = value is "source-in" or "source-out" or "destination-in" or "destination-atop" or "copy";
            }
        }

        public double lineWidth { get => s.lineWidth; set { if (value > 0 && !double.IsInfinity(value)) s.lineWidth = value; } }

        public string lineCap
        {
            get => s.cap switch { SKStrokeCap.Round => "round", SKStrokeCap.Square => "square", _ => "butt" };
            set { if (value == "butt") s.cap = SKStrokeCap.Butt; else if (value == "round") s.cap = SKStrokeCap.Round; else if (value == "square") s.cap = SKStrokeCap.Square; }
        }

        public string lineJoin
        {
            get => s.join switch { SKStrokeJoin.Round => "round", SKStrokeJoin.Bevel => "bevel", _ => "miter" };
            set { if (value == "miter") s.join = SKStrokeJoin.Miter; else if (value == "round") s.join = SKStrokeJoin.Round; else if (value == "bevel") s.join = SKStrokeJoin.Bevel; }
        }

        public double miterLimit { get => s.miterLimit; set { if (value > 0 && !double.IsInfinity(value)) s.miterLimit = value; } }

        public void setLineDash(params double[] odcinki)
        {
            foreach (var o in odcinki) if (o < 0 || double.IsNaN(o) || double.IsInfinity(o)) return;
            if (odcinki.Length == 0) { s.dash = null; s.dashEfekt = null; return; }
            // nieparzysta liczba odcinków — przeglądarka powtarza listę
            var n = odcinki.Length % 2 == 1 ? odcinki.Length * 2 : odcinki.Length;
            var d = new float[n];
            for (int i = 0; i < n; i++) d[i] = (float)odcinki[i % odcinki.Length];
            s.dash = d;
            s.dashEfekt = null;
        }

        public double[] getLineDash()
        {
            if (s.dash == null) return Array.Empty<double>();
            var w = new double[s.dash.Length];
            for (int i = 0; i < w.Length; i++) w[i] = s.dash[i];
            return w;
        }

        public double lineDashOffset
        {
            get => s.dashOffset;
            set { if (!double.IsNaN(value) && !double.IsInfinity(value)) { s.dashOffset = value; s.dashEfekt = null; } }
        }

        public double shadowBlur { get => s.shadowBlur; set { if (value >= 0 && !double.IsInfinity(value)) s.shadowBlur = value; } }
        public double shadowOffsetX { get => s.shadowX; set { if (!double.IsNaN(value) && !double.IsInfinity(value)) s.shadowX = value; } }
        public double shadowOffsetY { get => s.shadowY; set { if (!double.IsNaN(value) && !double.IsInfinity(value)) s.shadowY = value; } }

        public Styl shadowColor
        {
            get => s.shadowColor;
            set { if (!value.Pusty && value.Gradient == null && value.Wzor == null) s.shadowColor = value.Barwa; }
        }

        public string font
        {
            get => s.font;
            set { var k = Kroj.Czytaj(value); if (k != null) { s.kroj = k; s.font = value; } }
        }

        public string textAlign
        {
            get => s.textAlign;
            set { if (value is "start" or "end" or "left" or "right" or "center") s.textAlign = value; }
        }

        public string textBaseline
        {
            get => s.textBaseline;
            set { if (value is "top" or "hanging" or "middle" or "alphabetic" or "ideographic" or "bottom") s.textBaseline = value; }
        }

        public string filter
        {
            get => s.filter;
            set
            {
                if (value == s.filter) return;
                if (value == "none") { s.filter = value; s.filtr = null; return; }
                var f = Filtry.Czytaj(value, out var dobry);
                if (!dobry) return;
                s.filter = value;
                s.filtr = f;
            }
        }

        public bool imageSmoothingEnabled { get => s.smoothing; set => s.smoothing = value; }

        public string imageSmoothingQuality
        {
            get => s.smoothingQuality;
            set { if (value is "low" or "medium" or "high") s.smoothingQuality = value; }
        }

        // ───────────────────────────── przekształcenia ─────────────────────────────

        /// <summary>
        /// Chrome trzyma bieżącą ścieżkę w przestrzeni użytkownika: gdy przekształcenie się zmienia, ścieżka jest
        /// przeliczana odwrotnością zmiany — punkty dodane wcześniej zostają tam, gdzie były na płótnie.
        /// </summary>
        void PrzeliczSciezke(SKMatrix stara, SKMatrix nowa)
        {
            if (sciezka.Pusta || stara == nowa) return;
            if (!nowa.TryInvert(out var odwr)) return;
            sciezka.Sciezka.Transform(SKMatrix.Concat(odwr, stara));
        }

        void UstawMacierz(SKMatrix nowa)
        {
            var stara = c.TotalMatrix;
            c.SetMatrix(nowa);
            PrzeliczSciezke(stara, nowa);
        }

        static bool S(double v) => !double.IsNaN(v) && !double.IsInfinity(v);

        public void translate(double x, double y) { if (S(x) && S(y)) UstawMacierz(c.TotalMatrix.PreConcat(SKMatrix.CreateTranslation((float)x, (float)y))); }
        public void scale(double x, double y) { if (S(x) && S(y)) UstawMacierz(c.TotalMatrix.PreConcat(SKMatrix.CreateScale((float)x, (float)y))); }
        public void rotate(double kat) { if (S(kat)) UstawMacierz(c.TotalMatrix.PreConcat(SKMatrix.CreateRotation((float)kat))); }
        public void transform(double a, double b, double cc, double d, double e, double f) =>
            UstawMacierz(c.TotalMatrix.PreConcat(Macierz.Sk(new DOMMatrix(a, b, cc, d, e, f))));
        public void setTransform(double a, double b, double cc, double d, double e, double f) => UstawMacierz(Macierz.Sk(new DOMMatrix(a, b, cc, d, e, f)));
        public void setTransform(DOMMatrix m) => UstawMacierz(Macierz.Sk(m));
        public void resetTransform() => UstawMacierz(SKMatrix.Identity);
        public DOMMatrix getTransform() => Macierz.Z(c.TotalMatrix);

        // ───────────────────────────── ścieżka ─────────────────────────────

        public void beginPath() => sciezka.Czysc();
        public void moveTo(double x, double y) => sciezka.moveTo(x, y);
        public void lineTo(double x, double y) => sciezka.lineTo(x, y);
        public void quadraticCurveTo(double cx, double cy, double x, double y) => sciezka.quadraticCurveTo(cx, cy, x, y);
        public void bezierCurveTo(double a, double b, double cc, double d, double x, double y) => sciezka.bezierCurveTo(a, b, cc, d, x, y);
        public void closePath() => sciezka.closePath();
        public void rect(double x, double y, double w, double h) => sciezka.rect(x, y, w, h);
        public void roundRect(double x, double y, double w, double h, params double[] r) => sciezka.roundRect(x, y, w, h, r);
        public void arc(double x, double y, double r, double a0, double a1, bool przeciwnie = false) => sciezka.arc(x, y, r, a0, a1, przeciwnie);
        public void arcTo(double x1, double y1, double x2, double y2, double r) => sciezka.arcTo(x1, y1, x2, y2, r);
        public void ellipse(double x, double y, double rx, double ry, double obrot, double a0, double a1, bool przeciwnie = false) =>
            sciezka.ellipse(x, y, rx, ry, obrot, a0, a1, przeciwnie);

        // ───────────────────────────── rysowanie ─────────────────────────────

        static SKShader? ShaderGradientu(CanvasGradient g)
        {
            if (g.Uchwyt is SKShader gotowy && g.UchwytWersja == g.Wersja) return gotowy;
            (g.Uchwyt as SKShader)?.Dispose();
            var p = g.Przystanki;
            var barwy = new SKColorF[p.Count];
            var poz = new float[p.Count];
            for (int i = 0; i < barwy.Length; i++) { barwy[i] = Macierz.Sk(p[i].b); poz[i] = (float)p[i].t; }
            var sh = g.Kolowy
                ? SKShader.CreateTwoPointConicalGradient(new SKPoint((float)g.x0, (float)g.y0), (float)g.r0, new SKPoint((float)g.x1, (float)g.y1), (float)g.r1, barwy, null, poz, SKShaderTileMode.Clamp)
                : SKShader.CreateLinearGradient(new SKPoint((float)g.x0, (float)g.y0), new SKPoint((float)g.x1, (float)g.y1), barwy, null, poz, SKShaderTileMode.Clamp);
            g.Uchwyt = sh;
            g.UchwytWersja = g.Wersja;
            return sh;
        }

        static SKShader? ShaderWzoru(CanvasPattern w)
        {
            if (w.Uchwyt is SKShader gotowy) return gotowy;
            var img = FabrykaSkia.Obraz(w.Zrodlo);
            if (img == null) return null;
            var pw = w.Powtorzenie;
            var x = pw == "repeat" || pw == "repeat-x" || pw == "" ? SKShaderTileMode.Repeat : SKShaderTileMode.Decal;
            var y = pw == "repeat" || pw == "repeat-y" || pw == "" ? SKShaderTileMode.Repeat : SKShaderTileMode.Decal;
            var sh = img.ToShader(x, y, new SKSamplingOptions(SKFilterMode.Linear));
            w.Uchwyt = sh;
            return sh;
        }

        /// <summary>
        /// Farba z bieżącego stylu: barwa, gradient albo wzór, przezroczystość globalAlpha; dla linii — grubość, końce,
        /// złącza, przerywanie. Fałsz — nie ma czego rysować (gradient bez przystanków).
        /// </summary>
        bool UstawFarbe(in Styl st, bool obrys)
        {
            var p = farba;
            p.Shader = null;
            p.ImageFilter = null;
            p.PathEffect = null;
            p.IsAntialias = true;
            float a = (float)s.alpha;
            if (st.Gradient is CanvasGradient g)
            {
                if (g.Przystanki.Count == 0) return false;
                if (g.Przystanki.Count == 1) { var b = g.Przystanki[0].b; p.ColorF = new SKColorF(b.r, b.g, b.b, b.a * a); }
                else { p.Shader = ShaderGradientu(g); p.ColorF = new SKColorF(0, 0, 0, a); }
            }
            else if (st.Wzor is CanvasPattern w)
            {
                var sh = ShaderWzoru(w);
                if (sh == null) return false;
                p.Shader = sh; p.ColorF = new SKColorF(0, 0, 0, a);
            }
            else { var b = st.Barwa; p.ColorF = new SKColorF(b.r, b.g, b.b, b.a * a); }
            if (obrys)
            {
                p.Style = SKPaintStyle.Stroke;
                p.StrokeWidth = (float)s.lineWidth;
                p.StrokeCap = s.cap;
                p.StrokeJoin = s.join;
                p.StrokeMiter = (float)s.miterLimit;
                if (s.dash != null)
                {
                    if (s.dashEfekt == null) s.dashEfekt = SKPathEffect.CreateDash(s.dash, (float)s.dashOffset);
                    p.PathEffect = s.dashEfekt;
                }
            }
            else p.Style = SKPaintStyle.Fill;
            return true;
        }

        bool Cien => s.shadowColor.a > 0 && (s.shadowBlur > 0 || s.shadowX != 0 || s.shadowY != 0);

        /// <summary>
        /// Przed rysunkiem: zwykle tylko tryb mieszania na farbie. Cień, filtr i tryby „bez granic” idą przez warstwę
        /// w pikselach płótna (Chrome: CompositedDraw) — cień i filtr nie zależą wtedy od przekształcenia.
        /// Zwraca, czy otwarto warstwę (wtedy <see cref="Po"/> ją zamyka).
        /// </summary>
        bool Przed(SKPaint p)
        {
            zmienione = true;
            bool cien = Cien;
            if (!s.bezGranic && s.filtr == null && !cien)
            {
                p.BlendMode = s.tryb;
                return false;
            }
            var ctm = c.TotalMatrix;
            c.ResetMatrix();
            warstwa.BlendMode = s.tryb;
            SKImageFilter? cienF = null;
            if (cien)
            {
                // sigma = shadowBlur / 2 (Chrome: BlurRadiusToStdDev)
                float sig = (float)(s.shadowBlur / 2);
                cienF = SKImageFilter.CreateDropShadow((float)s.shadowX, (float)s.shadowY, sig, sig, (SKColor)Macierz.Sk(s.shadowColor), s.filtr);
            }
            warstwa.ImageFilter = cienF ?? s.filtr;
            c.SaveLayer(warstwa);
            warstwa.ImageFilter = null;
            cienF?.Dispose();
            c.SetMatrix(ctm);
            p.BlendMode = SKBlendMode.SrcOver;
            return true;
        }

        void Po(bool otwarta) { if (otwarta) c.Restore(); }

        void RysujSciezke(SKPath sc, bool obrys)
        {
            if (!UstawFarbe(obrys ? s.stroke : s.fill, obrys)) return;
            var w = Przed(farba);
            c.DrawPath(sc, farba);
            Po(w);
        }

        static SKPathFillType Regula(string r) => r == "evenodd" ? SKPathFillType.EvenOdd : SKPathFillType.Winding;

        public void fill(string regula = "nonzero") { sciezka.Sciezka.FillType = Regula(regula); RysujSciezke(sciezka.Sciezka, false); }
        public void fill(Path2D p, string regula = "nonzero") { var sk = SciezkaSkia.Sk(p); sk.FillType = Regula(regula); RysujSciezke(sk, false); }
        public void stroke() { sciezka.Sciezka.FillType = SKPathFillType.Winding; RysujSciezke(sciezka.Sciezka, true); }
        public void stroke(Path2D p) => RysujSciezke(SciezkaSkia.Sk(p), true);

        public void clip(string regula = "nonzero")
        {
            sciezka.Sciezka.FillType = Regula(regula);
            c.ClipPath(sciezka.Sciezka, SKClipOperation.Intersect, true);
        }

        public void clip(Path2D p, string regula = "nonzero")
        {
            var sk = SciezkaSkia.Sk(p);
            sk.FillType = Regula(regula);
            c.ClipPath(sk, SKClipOperation.Intersect, true);
        }

        static SKRect Prostokat(double x, double y, double w, double h) =>
            SKRect.Create((float)Math.Min(x, x + w), (float)Math.Min(y, y + h), (float)Math.Abs(w), (float)Math.Abs(h));

        static bool S4(double x, double y, double w, double h) => S(x) && S(y) && S(w) && S(h);

        public void fillRect(double x, double y, double w, double h)
        {
            if (!S4(x, y, w, h) || w == 0 || h == 0) return;
            if (!UstawFarbe(s.fill, false)) return;
            var o = Przed(farba);
            c.DrawRect(Prostokat(x, y, w, h), farba);
            Po(o);
        }

        public void strokeRect(double x, double y, double w, double h)
        {
            if (!S4(x, y, w, h) || (w == 0 && h == 0)) return;
            pomocnicza.Rewind();
            float fx = (float)x, fy = (float)y, fw = (float)w, fh = (float)h;
            if (w == 0 || h == 0) { pomocnicza.MoveTo(fx, fy); pomocnicza.LineTo(fx + fw, fy + fh); }
            else { pomocnicza.MoveTo(fx, fy); pomocnicza.LineTo(fx + fw, fy); pomocnicza.LineTo(fx + fw, fy + fh); pomocnicza.LineTo(fx, fy + fh); pomocnicza.Close(); }
            RysujSciezke(pomocnicza, true);
        }

        readonly SKPaint czyszczenie = new SKPaint { BlendMode = SKBlendMode.Clear, IsAntialias = true };

        /// <summary>clearRect: piksele w prostokącie przezroczyste (bez trybu mieszania, alfy i cienia; z przycięciem).</summary>
        public void clearRect(double x, double y, double w, double h)
        {
            if (!S4(x, y, w, h) || w == 0 || h == 0) return;
            zmienione = true;
            c.DrawRect(Prostokat(x, y, w, h), czyszczenie);
        }

        // ───────────────────────────── tekst ─────────────────────────────

        static readonly char[] Biale = { '\n', '\r', '\t', '\f' };

        static string BezBialych(string t) =>
            t.IndexOfAny(Biale) < 0 ? t : t.Replace('\n', ' ').Replace('\r', ' ').Replace('\t', ' ').Replace('\f', ' ');

        public TextMetrics measureText(string tekst) => new TextMetrics(Tekst.Uloz(s.kroj, BezBialych(tekst)).Szerokosc);

        public void fillText(string tekst, double x, double y, double? maxWidth = null) => RysujTekst(tekst, x, y, maxWidth, false);
        public void strokeText(string tekst, double x, double y, double? maxWidth = null) => RysujTekst(tekst, x, y, maxWidth, true);

        void RysujTekst(string tekst, double x, double y, double? maxWidth, bool obrys)
        {
            if (!S(x) || !S(y)) return;
            if (maxWidth is double mw && (mw <= 0 || double.IsNaN(mw))) return;
            var u = Tekst.Uloz(s.kroj, BezBialych(tekst));
            if (u.Blob == null) return;
            if (!UstawFarbe(obrys ? s.stroke : s.fill, obrys)) return;
            float w = u.Szerokosc;
            float dx = s.textAlign switch { "center" => -w / 2, "right" => -w, "end" => -w, _ => 0 };
            float dy = s.kroj.PrzesuniecieBazowej(s.textBaseline);
            var o = Przed(farba);
            if (maxWidth is double m && w > m)
            {
                // za szeroki napis przeglądarka ściska w poziomie
                c.Save();
                c.Translate((float)x, (float)y);
                c.Scale((float)(m / w), 1);
                c.DrawText(u.Blob, dx, dy, farba);
                c.Restore();
            }
            else c.DrawText(u.Blob, (float)x + dx, (float)y + dy, farba);
            Po(o);
        }

        // ───────────────────────────── obrazy ─────────────────────────────

        /// <summary>Obraz płótna do drawImage innego płótna (migawka trzymana, dopóki płótno się nie zmieni).</summary>
        public SKImage? Migawka()
        {
            if (wlasna == null) return null;
            if (zmienione || migawka == null)
            {
                migawka?.Dispose();
                migawka = wlasna.Snapshot();
                zmienione = false;
            }
            return migawka;
        }

        SKSamplingOptions Probkowanie(bool zmniejsza)
        {
            if (!s.smoothing) return new SKSamplingOptions(SKFilterMode.Nearest, SKMipmapMode.None);
            return s.smoothingQuality switch
            {
                "medium" => new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Nearest),
                "high" => zmniejsza ? new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear) : new SKSamplingOptions(SKCubicResampler.Mitchell),
                _ => new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.None),
            };
        }

        public void drawImage(IZrodloObrazu obraz, double dx, double dy) =>
            drawImage(obraz, 0, 0, obraz.width, obraz.height, dx, dy, obraz.width, obraz.height);

        public void drawImage(IZrodloObrazu obraz, double dx, double dy, double dw, double dh) =>
            drawImage(obraz, 0, 0, obraz.width, obraz.height, dx, dy, dw, dh);

        public void drawImage(IZrodloObrazu obraz, double sx, double sy, double sw, double sh, double dx, double dy, double dw, double dh)
        {
            if (!S4(sx, sy, sw, sh) || !S4(dx, dy, dw, dh)) return;
            if (sw == 0 || sh == 0 || dw == 0 || dh == 0) return;
            var img = FabrykaSkia.Obraz(obraz);
            if (img == null) return;
            var zr = Prostokat(sx, sy, sw, sh);
            var cel = Prostokat(dx, dy, dw, dh);
            // źródło poza obrazkiem: Chrome przycina je i tak samo zmniejsza cel
            var pelny = SKRect.Create(0, 0, img.Width, img.Height);
            if (!pelny.Contains(zr))
            {
                var przyc = SKRect.Intersect(zr, pelny);
                if (przyc.IsEmpty) return;
                float kx = cel.Width / zr.Width, ky = cel.Height / zr.Height;
                cel = new SKRect(cel.Left + (przyc.Left - zr.Left) * kx, cel.Top + (przyc.Top - zr.Top) * ky,
                                 cel.Right - (zr.Right - przyc.Right) * kx, cel.Bottom - (zr.Bottom - przyc.Bottom) * ky);
                zr = przyc;
            }
            var p = farba;
            p.Shader = null; p.PathEffect = null; p.ImageFilter = null;
            p.Style = SKPaintStyle.Fill;
            p.ColorF = new SKColorF(0, 0, 0, (float)s.alpha);
            var m = c.TotalMatrix;
            bool zmniejsza = Math.Abs(cel.Width * m.ScaleX) < zr.Width || Math.Abs(cel.Height * m.ScaleY) < zr.Height;
            var o = Przed(p);
            c.DrawImage(img, zr, cel, Probkowanie(zmniejsza), p);
            Po(o);
        }

        public CanvasGradient createLinearGradient(double x0, double y0, double x1, double y1) => new CanvasGradient(false, x0, y0, 0, x1, y1, 0);
        public CanvasGradient createRadialGradient(double x0, double y0, double r0, double x1, double y1, double r1) => new CanvasGradient(true, x0, y0, r0, x1, y1, r1);
        public CanvasPattern? createPattern(IZrodloObrazu obraz, string powtorzenie) =>
            FabrykaSkia.Obraz(obraz) == null ? null : new CanvasPattern(obraz, powtorzenie);

        public bool ZapiszPng(string plik)
        {
            using var img = wlasna?.Snapshot();
            if (img == null) return false;
            using var raster = img.ToRasterImage(true);
            using var d = raster.Encode(SKEncodedImageFormat.Png, 100);
            File.WriteAllBytes(plik, d.ToArray());
            return true;
        }

        public void Dispose()
        {
            migawka?.Dispose();
            wlasna?.Dispose();
            farba.Dispose(); warstwa.Dispose(); pomocnicza.Dispose(); czyszczenie.Dispose();
            sciezka.Dispose();
        }
    }

    /// <summary>
    /// Fabryka płócien na Skii — gospodarz ustawia <see cref="Kontekst"/> (Skia na karcie) i podaje ją grze jako
    /// Plotno.Fabryka. Bez kontekstu płótna rysuje procesor (testy).
    /// </summary>
    public sealed class FabrykaSkia : IFabrykaPlocien
    {
        /// <summary>Kontekst Skii na karcie graficznej; null — rysowanie procesorem.</summary>
        public static GRContext? Kontekst;

        public IPlotno Nowe(int w, int h) => new PlotnoSkia(w, h);

        public IObraz Obraz(byte[]? dane, string nazwa)
        {
            if (dane == null) { Rdzen.Dziennik.Pisz($"brak obrazka: {nazwa}"); return new ObrazSkia(null); }
            using var d = SKData.CreateCopy(dane);
            var img = SKImage.FromEncodedData(d);
            if (img == null) Rdzen.Dziennik.Pisz($"obrazek nieczytelny: {nazwa}");
            return new ObrazSkia(img?.ToRasterImage(true));
        }

        public void RejestrujKroj(string rodzina, int waga, bool kursywa, byte[] dane)
        {
            using var d = SKData.CreateCopy(dane);
            var t = SKTypeface.FromData(d);
            if (t == null) { Rdzen.Dziennik.Pisz($"krój nieczytelny: {rodzina}"); return; }
            Kroje.Rejestruj(rodzina, waga, kursywa, t);
        }

        /// <summary>SKImage dowolnego źródła obrazu tej warstwy (płótno albo obrazek z pliku).</summary>
        public static SKImage? Obraz(IZrodloObrazu z) => z switch
        {
            PlotnoSkia p => p.Migawka(),
            ObrazSkia o => o.Image,
            _ => null,
        };
    }

    /// <summary>ctx.filter: blur, brightness, contrast, grayscale, saturate, opacity — jak funkcje filtrów CSS.</summary>
    static class Filtry
    {
        static readonly Dictionary<string, SKImageFilter?> Pamiec = new Dictionary<string, SKImageFilter?>();

        static SKColorFilter Macierz5(params float[] m) => SKColorFilter.CreateColorMatrix(m);

        public static SKImageFilter? Czytaj(string napis, out bool dobry)
        {
            dobry = true;
            if (Pamiec.TryGetValue(napis, out var f)) return f;
            SKImageFilter? wynik = null;
            int i = 0;
            var t = napis.Trim();
            while (i < t.Length)
            {
                while (i < t.Length && t[i] == ' ') i++;
                if (i >= t.Length) break;
                int nawias = t.IndexOf('(', i), koniec = t.IndexOf(')', i);
                if (nawias < 0 || koniec < nawias) { dobry = false; return null; }
                var nazwa = t.Substring(i, nawias - i).Trim();
                var arg = t.Substring(nawias + 1, koniec - nawias - 1).Trim();
                i = koniec + 1;
                bool proc = arg.EndsWith("%", StringComparison.Ordinal);
                var liczba = arg.Replace("px", "").TrimEnd('%');
                if (!double.TryParse(liczba, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var v)) { dobry = false; return null; }
                if (proc) v /= 100;
                SKColorFilter cf;
                float k = (float)v;
                switch (nazwa)
                {
                    case "blur":
                        // CSS: blur(r) — r to odchylenie standardowe
                        wynik = SKImageFilter.CreateBlur(k, k, wynik);
                        continue;
                    case "brightness":
                        cf = Macierz5(k, 0, 0, 0, 0, 0, k, 0, 0, 0, 0, 0, k, 0, 0, 0, 0, 0, 1, 0);
                        break;
                    case "contrast":
                        {
                            float p = (float)(0.5 - 0.5 * v);
                            cf = Macierz5(k, 0, 0, 0, p, 0, k, 0, 0, p, 0, 0, k, 0, p, 0, 0, 0, 1, 0);
                            break;
                        }
                    case "grayscale":
                        {
                            float a = (float)(1 - Math.Min(1, v));
                            cf = Macierz5(
                                0.2126f + 0.7874f * a, 0.7152f - 0.7152f * a, 0.0722f - 0.0722f * a, 0, 0,
                                0.2126f - 0.2126f * a, 0.7152f + 0.2848f * a, 0.0722f - 0.0722f * a, 0, 0,
                                0.2126f - 0.2126f * a, 0.7152f - 0.7152f * a, 0.0722f + 0.9278f * a, 0, 0,
                                0, 0, 0, 1, 0);
                            break;
                        }
                    case "saturate":
                        cf = Macierz5(
                            0.213f + 0.787f * k, 0.715f - 0.715f * k, 0.072f - 0.072f * k, 0, 0,
                            0.213f - 0.213f * k, 0.715f + 0.285f * k, 0.072f - 0.072f * k, 0, 0,
                            0.213f - 0.213f * k, 0.715f - 0.715f * k, 0.072f + 0.928f * k, 0, 0,
                            0, 0, 0, 1, 0);
                        break;
                    case "opacity":
                        cf = Macierz5(1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, (float)Math.Clamp(v, 0, 1), 0);
                        break;
                    default:
                        dobry = false; return null;
                }
                wynik = SKImageFilter.CreateColorFilter(cf, wynik);
            }
            Pamiec[napis] = wynik;
            return wynik;
        }
    }
}
