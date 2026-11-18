// Oprawa walki, etap 2 (docs/plan-oprawy-cerber.md): bez systemowych glifów w napisach. Kroje gry (dane/czcionki,
// przycięte do liter polskich i kilku znaków) nie mają strzałek, trójkątów, krzyża ani znaków odtwarzacza — takie znaki
// płótno brało z kroju systemu i wyglądały jak ikonki z innej aplikacji. Z włączoną czytelnością płótno (PlotnoSkia:
// fillText, strokeText, measureText) przepuszcza każdy napis przez Popraw: znak spoza krojów → zamiennik z krojów gry
// (» « · –) albo słowo (strzałki klawiszy). Pomiar i rysunek idą przez tę samą zamianę, więc układ się zgadza.
// Bez alokacji, gdy napis nie ma czego zamieniać; zamienione napisy w pamięci (napisy gry powtarzają się co klatkę).
using System.Collections.Generic;
using System.Text;

namespace Trzewia.Visual
{
    public static class Glify
    {
        /// <summary>Znak spoza krojów gry → napis z krojów gry (pusty — znak tylko zdobił słowo obok).</summary>
        static readonly Dictionary<char, string> ZAMIENNIKI = new Dictionary<char, string>
        {
            ['→'] = "»", ['←'] = "«", ['▸'] = "»", ['›'] = "»", ['‹'] = "«", ['▶'] = "»",
            ['↑'] = "w górę", ['↓'] = "w dół",
            ['▴'] = "", ['▾'] = "",
            ['✠'] = "·", ['•'] = "·", ['−'] = "–", ['±'] = "+/–",
            ['≡'] = "menu", ['⏸'] = "||", ['⏩'] = "»»",
            ['¼'] = "1/4", ['½'] = "1/2", ['µ'] = "u",
        };

        static readonly Dictionary<string, string> pamiec = new Dictionary<string, string>();
        const int MAKS_PAMIECI = 4096;

        /// <summary>Czy zamieniać (czytelność włączona — flaga i F9).</summary>
        public static bool Wlaczone => Czytelnosc.Aktywna;

        /// <summary>Napis do rysunku i pomiaru: bez znaków spoza krojów gry (gdy czytelność włączona).</summary>
        public static string Popraw(string tekst)
        {
            if (!Wlaczone || string.IsNullOrEmpty(tekst)) return tekst;
            var jest = false;
            foreach (var ch in tekst) if (ch > '~' && ZAMIENNIKI.ContainsKey(ch)) { jest = true; break; }
            if (!jest) return tekst;
            if (pamiec.TryGetValue(tekst, out var gotowy)) return gotowy;
            var sb = new StringBuilder(tekst.Length + 8);
            foreach (var ch in tekst)
            {
                if (ch > '~' && ZAMIENNIKI.TryGetValue(ch, out var z)) sb.Append(z);
                else sb.Append(ch);
            }
            // usunięty znak przy słowie zostawiał podwójną albo końcową spację
            var wynik = sb.ToString();
            while (wynik.Contains("  ") && !tekst.Contains("  ")) wynik = wynik.Replace("  ", " ");
            if (!tekst.EndsWith(" ")) wynik = wynik.TrimEnd();
            if (pamiec.Count >= MAKS_PAMIECI) pamiec.Clear();
            pamiec[tekst] = wynik;
            return wynik;
        }
    }
}
