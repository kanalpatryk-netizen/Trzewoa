// Demon (boss z Wielkiego Pomnika) — duszki zamiast kukły z render/demon-boss.ts. Na razie zastępczo: arkusze demona
// piecze się osobno (narzedzia/duszki/demon.ts).
using Trzewia.Plotna;
using Trzewia.Symulacja;

namespace Trzewia.Rysunek.Duszki
{
    public static class DuszkiDemona
    {
        /// <summary>Żywy demon na mapie — wołane z RysStraznicy.rysujStraznika, stopami w (0, 0), zwrot już ustawiony.</summary>
        public static void rysujDemonaBossa(IPlotno ctx, Sim sim, Creature c, double h, double czas)
        {
            DuszkiLudu.Zastepczo(ctx, c, h);
        }
    }
}
