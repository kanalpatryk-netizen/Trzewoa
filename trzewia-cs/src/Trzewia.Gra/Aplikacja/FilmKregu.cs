// Port (w toku): krag-3-beta/src/app/film-kregu.ts — film na początek partii Kręgu Trzeciego.
using Trzewia.Plotna;
using Trzewia.Symulacja;

namespace Trzewia.Aplikacja
{
    public static class FilmKregu
    {
        public const double DLUGOSC_FILMU = 75;
        public static void rysujFilm(IPlotno ctx, Sim sim, double w, double h, double t, double teraz) { ctx.fillStyle = "rgb(0,0,0)"; ctx.fillRect(0, 0, w, h); }
    }
}
