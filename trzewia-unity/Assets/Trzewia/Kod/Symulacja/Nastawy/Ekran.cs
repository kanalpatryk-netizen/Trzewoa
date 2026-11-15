// Wygenerowane z alpha-1/src/nastawy/ekran.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/ekran.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/ekran.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyEkran
    {
        /// <summary>
        /// EKRAN — jak gra dopasowuje się do rozmiaru okna.
        ///
        /// Gra rysuje w „pikselach logicznych”. Na dużym monitorze cały obraz rośnie,
        /// a na małym ekranie interfejs ZASKAKUJE w mniejszą skalę: logiczny ekran nigdy
        /// nie jest mniejszy niż minimum poniżej, więc każdy układ ma dość miejsca
        /// i nic na siebie nie nachodzi. Skalę da się jeszcze zmniejszyć w Ustawieniach
        /// („Wielkość obrazu”); powiększenie ponad dopasowanie działa tylko tam, gdzie jest miejsce.
        /// </summary>
        public static Typ_EKRAN EKRAN = new Typ_EKRAN
        {
            wzorzecW = 1366,
            wzorzecH = 820,
            maxPowiekszenie = 2.4,
            pionMinW = 360,
            pionMinH = 600,
            poziomMinW = 640,
            poziomMinH = 330,
            minSkala = 0.55,
            maxDpr = 2,
            waskiPonizej = 700,
            pionowyTabletPonizej = 1000,
            pionowyOd = 1.15,
            ramaPlyty = 20,
            dolMin = 168,
            dolMax = 236,
            dolCzesc = 0.27,
        };

        /// <summary>
        /// JAKOŚĆ RYCINY „AUTO” — gdy klatek jest za mało, rycina przechodzi na połowę
        /// rozdzielczości (jak „szybka” w Ustawieniach). Tylko w dół i raz na grę,
        /// żeby obraz nie skakał tam i z powrotem.
        /// </summary>
        public static Typ_JAKOSC JAKOSC = new Typ_JAKOSC
        {
            progKlatek = 40,
            oknoMs = 4000,
            przerwaMs = 250,
        };

        /// <summary>EKRAN ŁADOWANIA — napisy i czasy.</summary>
        public static Typ_LADOWANIE LADOWANIE = new Typ_LADOWANIE
        {
            tytul = "TRZEWIA",
            gotowe = "góra się budzi",
            minCzasMs = 1100,
            wygaszenieMs = 450,
        };

        /// <summary>
        /// INTRO — film `filmy/intro.mp4`, który rusza od razu po otwarciu gry (góra ładuje się pod nim),
        /// a po nim menu. Spacja (albo Esc) go pomija; okno obserwatorium go nie puszcza.
        /// </summary>
        public static Typ_INTRO INTRO = new Typ_INTRO
        {
            pomin = "pomiń",
            klawisz = "spacja",
            znaczekOdMs = 400,
            znaczekRozjasnienieMs = 500,
            wygaszenieMs = 350,
            bezpiecznikMs = 4000,
        };

        /// <summary>
        /// KURSOR — stalowa rękawica jako jedyny kursor gry, na każdym ekranie: `obrazy/kursor1.png` zwykle,
        /// `obrazy/kursor2.png` (palec wciska), póki przycisk myszy jest wciśnięty. Rękawicę rysuje sama gra
        /// pod myszką (systemowa strzałka się chowa) — kursor przeglądarki większy niż 32 px Chrome i Firefox
        /// zamieniają przy krawędzi okna na zwykłą strzałkę. Obrazki gra sama przycina do rękawicy i zmniejsza,
        /// więc nowy kursor to po prostu podmieniony plik — najwyżej trzeba poprawić `czubek`.
        /// </summary>
        public static Typ_KURSOR KURSOR = new Typ_KURSOR
        {
            rozmiar = 40,
            czubek = new Typ_KURSOR_czubek
            {
                x = 14,
                y = 17,
            },
            czubekKlik = new Typ_KURSOR_czubekKlik
            {
                x = 64,
                y = 204,
            },
            klikMinMs = 120,
        };
    }

    /// <summary>
    /// EKRAN — jak gra dopasowuje się do rozmiaru okna.
    ///
    /// Gra rysuje w „pikselach logicznych”. Na dużym monitorze cały obraz rośnie,
    /// a na małym ekranie interfejs ZASKAKUJE w mniejszą skalę: logiczny ekran nigdy
    /// nie jest mniejszy niż minimum poniżej, więc każdy układ ma dość miejsca
    /// i nic na siebie nie nachodzi. Skalę da się jeszcze zmniejszyć w Ustawieniach
    /// („Wielkość obrazu”); powiększenie ponad dopasowanie działa tylko tam, gdzie jest miejsce.
    /// </summary>
    public sealed partial class Typ_EKRAN
    {
        /// <summary>Ekran odniesienia: przy takim rozmiarze (px) skala wynosi 1.</summary>
        public double wzorzecW;
        public double wzorzecH;
        /// <summary>Na dużym monitorze obraz rośnie najwyżej tyle razy.</summary>
        public double maxPowiekszenie;
        /// <summary>
        /// Najmniejszy ekran logiczny w pionie (telefon trzymany pionowo). WERSJA ANDROID:
        /// telefon rysuje 1:1 — na komputerze minimum 400×720 zmniejszało wszystko na małych telefonach.
        /// </summary>
        public double pionMinW;
        public double pionMinH;
        /// <summary>
        /// Najmniejszy ekran logiczny w poziomie. WERSJA ANDROID: telefon trzymany poziomo ma
        /// własny, zwarty układ (TELEFON.poziom), więc nie ściskamy go do 1000×560 (było 64% rozmiaru).
        /// </summary>
        public double poziomMinW;
        public double poziomMinH;
        /// <summary>Poniżej tej skali już nie schodzimy — tekst stałby się nieczytelny.</summary>
        public double minSkala;
        /// <summary>Najwyższa gęstość pikseli, w jakiej rysujemy (więcej = ostrzej, ale wolniej).</summary>
        public double maxDpr;
        /// <summary>Gra dostaje układ „wąski” (ryty i przyciski jak na telefonie) poniżej tej szerokości…</summary>
        public double waskiPonizej;
        /// <summary>…a także ekran w pionie (wyższy niż szerszy × pionowyOd) węższy niż to — tablet.</summary>
        public double pionowyTabletPonizej;
        public double pionowyOd;
        /// <summary>Alpha 1 (komputer): margines płyty z lewej i u góry (px) — płyta sięga prawie do krawędzi ekranu.</summary>
        public double ramaPlyty;
        /// <summary>Alpha 1 (komputer): pas pod płytą na księgę — część wysokości ekranu, obcięta do min–max (px).</summary>
        public double dolMin;
        public double dolMax;
        public double dolCzesc;
    }

    /// <summary>
    /// JAKOŚĆ RYCINY „AUTO” — gdy klatek jest za mało, rycina przechodzi na połowę
    /// rozdzielczości (jak „szybka” w Ustawieniach). Tylko w dół i raz na grę,
    /// żeby obraz nie skakał tam i z powrotem.
    /// </summary>
    public sealed partial class Typ_JAKOSC
    {
        /// <summary>Średnio mniej klatek na sekundę niż tyle…</summary>
        public double progKlatek;
        /// <summary>…przez tyle ms z rzędu (liczone od wejścia do gry) — i rycina tanieje.</summary>
        public double oknoMs;
        /// <summary>Przerwa między klatkami dłuższa niż to (karta w tle, zamrożenie) zaczyna pomiar od nowa.</summary>
        public double przerwaMs;
    }

    /// <summary>EKRAN ŁADOWANIA — napisy i czasy.</summary>
    public sealed partial class Typ_LADOWANIE
    {
        public string tytul;
        /// <summary>Podpis pod paskiem, gdy wszystko gotowe.</summary>
        public string gotowe;
        /// <summary>Ekran ładowania nie znika szybciej niż po tylu ms (żeby nie mignął).</summary>
        public double minCzasMs;
        /// <summary>Przejście do menu (ms).</summary>
        public double wygaszenieMs;
    }

    /// <summary>
    /// INTRO — film `filmy/intro.mp4`, który rusza od razu po otwarciu gry (góra ładuje się pod nim),
    /// a po nim menu. Spacja (albo Esc) go pomija; okno obserwatorium go nie puszcza.
    /// </summary>
    public sealed partial class Typ_INTRO
    {
        /// <summary>Podpis na dole, póki film leci.</summary>
        public string pomin;
        public string klawisz;
        /// <summary>Znaczek pojawia się po tylu ms od startu filmu…</summary>
        public double znaczekOdMs;
        /// <summary>…i rozjaśnia przez tyle ms.</summary>
        public double znaczekRozjasnienieMs;
        /// <summary>Zniknięcie filmu na końcu i po pominięciu (ms).</summary>
        public double wygaszenieMs;
        /// <summary>Film, który przez tyle ms nie ruszył (zła taśma, przeglądarka bez kodeka), jest pomijany sam.</summary>
        public double bezpiecznikMs;
    }

    /// <summary>
    /// KURSOR — stalowa rękawica jako jedyny kursor gry, na każdym ekranie: `obrazy/kursor1.png` zwykle,
    /// `obrazy/kursor2.png` (palec wciska), póki przycisk myszy jest wciśnięty. Rękawicę rysuje sama gra
    /// pod myszką (systemowa strzałka się chowa) — kursor przeglądarki większy niż 32 px Chrome i Firefox
    /// zamieniają przy krawędzi okna na zwykłą strzałkę. Obrazki gra sama przycina do rękawicy i zmniejsza,
    /// więc nowy kursor to po prostu podmieniony plik — najwyżej trzeba poprawić `czubek`.
    /// </summary>
    public sealed partial class Typ_KURSOR
    {
        /// <summary>Dłuższy bok rękawicy w pikselach ekranu.</summary>
        public double rozmiar;
        /// <summary>Punkt, który klika (czubek palca) — w pikselach oryginalnego obrazka.</summary>
        public Typ_KURSOR_czubek czubek;
        /// <summary>To samo dla rękawicy przy kliknięciu (kursor2.png).</summary>
        public Typ_KURSOR_czubekKlik czubekKlik;
        /// <summary>Nawet najkrótsze kliknięcie pokazuje wciśniętą rękawicę co najmniej tyle ms.</summary>
        public double klikMinMs;
    }

    public sealed partial class Typ_KURSOR_czubek
    {
        public double x;
        public double y;
    }

    public sealed partial class Typ_KURSOR_czubekKlik
    {
        public double x;
        public double y;
    }
}
