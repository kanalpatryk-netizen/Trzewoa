using System;

namespace Trzewia.Plotna
{
    /// <summary>Źródło obrazu dla drawImage i createPattern: obrazek z pliku albo inne płótno.</summary>
    public interface IZrodloObrazu
    {
        int width { get; }
        int height { get; }
    }

    /// <summary>Obrazek z dane/grafika (w TS: HTMLImageElement). complete — wczytany i gotowy do rysowania.</summary>
    public interface IObraz : IZrodloObrazu
    {
        bool complete { get; }
    }

    /// <summary>Przekształcenie jak DOMMatrix z getTransform(): x' = a·x + c·y + e, y' = b·x + d·y + f.</summary>
    public readonly struct DOMMatrix
    {
        public readonly double a, b, c, d, e, f;
        public DOMMatrix(double a, double b, double c, double d, double e, double f) { this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f; }
        public static readonly DOMMatrix Jednostkowa = new DOMMatrix(1, 0, 0, 1, 0, 0);
        public DOMMatrix inverse()
        {
            var det = a * d - b * c;
            if (det == 0) return new DOMMatrix(double.NaN, double.NaN, double.NaN, double.NaN, double.NaN, double.NaN);
            return new DOMMatrix(d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det);
        }
        /// <summary>this × m (najpierw m, potem this) — jak DOMMatrix.multiply.</summary>
        public DOMMatrix multiply(DOMMatrix m) => new DOMMatrix(
            a * m.a + c * m.b, b * m.a + d * m.b, a * m.c + c * m.d, b * m.c + d * m.d,
            a * m.e + c * m.f + e, b * m.e + d * m.f + f);
        public (double x, double y) transformPoint(double x, double y) => (a * x + c * y + e, b * x + d * y + f);
    }

    /// <summary>Wynik measureText — gra używa tylko szerokości.</summary>
    public readonly struct TextMetrics
    {
        public readonly double width;
        public TextMetrics(double width) { this.width = width; }
    }

    /// <summary>
    /// Płótno 2D: te same polecenia i ten sam stan co CanvasRenderingContext2D w przeglądarce. Cały rysunek gry
    /// (przeniesiony z alpha-1/src/render) rysuje tylko przez ten interfejs, więc nie wie, czy pod spodem jest Skia
    /// na karcie (Trzewia.Skia), czy — po przenosinach — rysowanie 2D silnika. Nazwy poleceń zostały jak w Canvas 2D
    /// (wyjątek od zwyczajów C#), żeby pliki z TS przenosiły się linijka w linijkę.
    ///
    /// Jeden obiekt to płótno i jego kontekst naraz: <c>Plotno.Nowe(w, h)</c> zamiast document.createElement('canvas')
    /// i getContext('2d'); <c>getContext("2d")</c> i <c>canvas</c> zwracają to samo płótno.
    ///
    /// Zachowania przeglądarki, które każda warstwa rysunku musi odtworzyć (opisane przy PlotnoSkia):
    /// bieżąca ścieżka w przestrzeni użytkownika (zmiana przekształcenia ją przelicza); tryby „bez granic” (source-in,
    /// source-out, destination-in, destination-atop, copy) czyszczą płótno poza kształtem; cień i filtr w pikselach
    /// płótna (niezależnie od przekształcenia), sigma cienia = shadowBlur / 2; tekst — linie bazowe jak w Chrome.
    /// </summary>
    public interface IPlotno : IZrodloObrazu, IDisposable
    {
        new int width { get; set; }
        new int height { get; set; }
        IPlotno getContext(string rodzaj = "2d");
        IPlotno canvas { get; }

        // stan
        void save();
        void restore();
        Styl fillStyle { get; set; }
        Styl strokeStyle { get; set; }
        double globalAlpha { get; set; }
        string globalCompositeOperation { get; set; }
        double lineWidth { get; set; }
        string lineCap { get; set; }
        string lineJoin { get; set; }
        double miterLimit { get; set; }
        void setLineDash(params double[] odcinki);
        double[] getLineDash();
        double lineDashOffset { get; set; }
        double shadowBlur { get; set; }
        double shadowOffsetX { get; set; }
        double shadowOffsetY { get; set; }
        Styl shadowColor { get; set; }
        string font { get; set; }
        string textAlign { get; set; }
        string textBaseline { get; set; }
        string filter { get; set; }
        bool imageSmoothingEnabled { get; set; }
        string imageSmoothingQuality { get; set; }

        // przekształcenia
        void translate(double x, double y);
        void scale(double x, double y);
        void rotate(double kat);
        void transform(double a, double b, double c, double d, double e, double f);
        void setTransform(double a, double b, double c, double d, double e, double f);
        void setTransform(DOMMatrix m);
        void resetTransform();
        DOMMatrix getTransform();

        // ścieżka
        void beginPath();
        void moveTo(double x, double y);
        void lineTo(double x, double y);
        void quadraticCurveTo(double cx, double cy, double x, double y);
        void bezierCurveTo(double c1x, double c1y, double c2x, double c2y, double x, double y);
        void closePath();
        void rect(double x, double y, double w, double h);
        void roundRect(double x, double y, double w, double h, params double[] r);
        void arc(double x, double y, double r, double start, double koniec, bool przeciwnie = false);
        void arcTo(double x1, double y1, double x2, double y2, double r);
        void ellipse(double x, double y, double rx, double ry, double obrot, double start, double koniec, bool przeciwnie = false);

        // rysowanie
        void fill(string regula = "nonzero");
        void fill(Path2D p, string regula = "nonzero");
        void stroke();
        void stroke(Path2D p);
        void clip(string regula = "nonzero");
        void clip(Path2D p, string regula = "nonzero");
        void fillRect(double x, double y, double w, double h);
        void strokeRect(double x, double y, double w, double h);
        void clearRect(double x, double y, double w, double h);
        TextMetrics measureText(string tekst);
        void fillText(string tekst, double x, double y, double? maxWidth = null);
        void strokeText(string tekst, double x, double y, double? maxWidth = null);
        void drawImage(IZrodloObrazu obraz, double dx, double dy);
        void drawImage(IZrodloObrazu obraz, double dx, double dy, double dw, double dh);
        void drawImage(IZrodloObrazu obraz, double sx, double sy, double sw, double sh, double dx, double dy, double dw, double dh);
        CanvasGradient createLinearGradient(double x0, double y0, double x1, double y1);
        CanvasGradient createRadialGradient(double x0, double y0, double r0, double x1, double y1, double r1);
        CanvasPattern? createPattern(IZrodloObrazu obraz, string powtorzenie);

        /// <summary>Zapis obrazu płótna do PNG (zrzuty; w TS — canvas.toDataURL).</summary>
        bool ZapiszPng(string plik);
    }

    /// <summary>Warstwa rysunku (Skia albo silnik): nowe płótna, obrazki z pliku i kroje pisma.</summary>
    public interface IFabrykaPlocien
    {
        IPlotno Nowe(int w, int h);
        IObraz Obraz(byte[]? dane, string nazwa);
        void RejestrujKroj(string rodzina, int waga, bool kursywa, byte[] dane);
    }

    /// <summary>
    /// Dostęp gry do warstwy rysunku. Gospodarz (Trzewia.exe, a po przenosinach — skrypt w silniku) ustawia
    /// <see cref="Fabryka"/> przy starcie.
    /// </summary>
    public static class Plotno
    {
        public static IFabrykaPlocien Fabryka = null!;

        /// <summary>Nowe przezroczyste płótno w × h (w TS: document.createElement('canvas') z width i height).</summary>
        public static IPlotno Nowe(int w, int h) => Fabryka.Nowe(w, h);

        /// <summary>Obrazek z dane/ (np. „grafika/kursor1.png”); pusty (complete = false), gdy go nie ma.</summary>
        public static IObraz Wczytaj(string sciezka) => Fabryka.Obraz(Rdzen.Zasoby.Czytaj(sciezka), sciezka);
    }
}
