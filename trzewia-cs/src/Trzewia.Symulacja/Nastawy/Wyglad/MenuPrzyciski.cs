// Pisane ręcznie (nie z TS): przyciski menu z rysunku — decyzja użytkownika 15.11 (odręczne grafiki zamiast napisów
// i ozdobników rysowanych kodem). Plik obok wygenerowanego Menu.cs; liczbę można nadpisać w dane/nastawy/wyglad-menu.json.
namespace Trzewia.Nastawy
{
    public sealed partial class Typ_MENU
    {
        /// <summary>
        /// Przyciski menu z rysunku (dane/grafika/menu/przyciski/*.png): wysokość ozdobnika po bokach × rozmiar liter spisu.
        /// 1,1 — litery na rysunku wychodzą tej samej wielkości co dawny napis pismem.
        /// </summary>
        public double przyciskOzdobnik = 1.1;
    }
}
