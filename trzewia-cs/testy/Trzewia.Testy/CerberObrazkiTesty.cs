using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Visual;

namespace Trzewia.Testy;

/// <summary>
/// Obrazki Cerbera wczytują się w obu zestawach: oryginał (dane/grafika/krag/cerber) i „rycina” z etapu 5
/// (dane/grafika/krag/cerber-rycina). Błąd z etapu 5: rycina szukała plików .png, a narzędzie zapisało WebP — przy
/// domyślnie włączonej rycinie Cerbera w ogóle nie było widać (naprawione 20.11).
/// </summary>
public class CerberObrazkiTesty
{
    sealed class Dane : IDaneGry
    {
        readonly string folder;
        public Dane(string folder) { this.folder = folder; }
        public Stream? Otworz(string sciezka)
        {
            var p = Path.Combine(folder, sciezka.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(p) ? File.OpenRead(p) : null;
        }
    }

    [Fact]
    public void ObaZestawyObrazkowCerberaSaWDanych()
    {
        Gospodarz.Dane = new Dane(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        bool byloW = VisualConfig.Wlaczone, byloR = VisualConfig.Rycina;
        try
        {
            VisualConfig.Wlaczone = true;
            VisualConfig.Rycina = false;
            Assert.True(RysCerber.Gotowy());
            VisualConfig.Rycina = true;
            Assert.True(RysCerber.Gotowy());
        }
        finally { VisualConfig.Wlaczone = byloW; VisualConfig.Rycina = byloR; }
    }
}
