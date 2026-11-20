// Oprawa walki, etap 5 (docs/plan-oprawy-cerber.md): „jedna paleta” dla stylu rycina.
//
// Plan proponował nowe barwy (tusz #0F0B0A, kamień #3A2C26, pergamin #E9DDC2…). Zamiast nich — bo gra JUŻ ma dokładnie
// taką jedną paletę: Trzewia.Nastawy.NastawyBarwy.BARWA i .FRESK (wygenerowane z alpha-1/src/nastawy/barwy.ts, „barwy
// całej gry… żeby nic nie świeciło kolorem, którego nie ma w świecie”). Druga, osobna paleta obok tamtej łamałaby
// właśnie tę zasadę. Tu więc tylko nazwy ról z planu, każda wskazująca na istniejącą barwę:
//   tusz      → BARWA.sadza      (prawie czarna sadza — kontur rylcem)
//   cien      → BARWA.sadzaJasna (jaśniejsza sadza — półcień pod kreską)
//   kamien    → FRESK.sciana     (ciemny, wilgotny tynk/kamień — już użyty jako tło interfejsu)
//   pergamin  → BARWA.papier     (papier tablic atlasu)
//   kosc      → BARWA.atrament   (jaśniejszy atrament — w tej roli czyta się jak kość/pergamin w cieniu)
//   krew      → BARWA.krew
//   krewJasna → BARWA.krewJasna
//   ogien     → BARWA.zar
//   zar       → BARWA.zarBlady
//   zloto     → FRESK.zloto
//
// Ta sama lista w tools/ink-pipeline/paleta.json (co do hex) — tam, gdzie C# nie sięga (offline, Python). Zmiana barwy
// w NastawyBarwy zmienia się tu automatycznie; w paleta.json trzeba ją przepisać ręcznie (komentarz w pliku).
using static Trzewia.Nastawy.NastawyBarwy;

namespace Trzewia.Visual
{
    /// <summary>Paleta stylu rycina (etap 5) — aliasy do BARWA/FRESK pod nazwami ról z planu, do użytku w rysunku i w opisie narzędzia.</summary>
    public static class Palette
    {
        public static string Tusz => BARWA.sadza;
        public static string Cien => BARWA.sadzaJasna;
        public static string Kamien => FRESK.sciana;
        public static string Pergamin => BARWA.papier;
        public static string Kosc => BARWA.atrament;
        public static string Krew => BARWA.krew;
        public static string KrewJasna => BARWA.krewJasna;
        public static string Ogien => BARWA.zar;
        public static string Zar => BARWA.zarBlady;
        public static string Zloto => FRESK.zloto;
    }
}
