using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/nastawy/ekran.ts
// Nazwy i liczby jak w TS (klasa = obiekt nastaw, pole = pole obiektu), żeby plik dane/nastawy/ekran.json
// miał te same nazwy co kod gry. Pominięte: TELEFON (tylko wersja Android; decyzja użytkownika 5.11 — tylko komputer).
namespace Trzewia.Nastawy
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
public static class EKRAN
{
    /// <summary>Ekran odniesienia: przy takim rozmiarze (px) skala wynosi 1.</summary>
    public static double wzorzecW = 1366, wzorzecH = 820;
    /// <summary>Na dużym monitorze obraz rośnie najwyżej tyle razy.</summary>
    public static double maxPowiekszenie = 2.4;
    /// <summary>Najmniejszy ekran logiczny w pionie (monitor obrócony pionowo).</summary>
    public static double pionMinW = 360, pionMinH = 600;
    /// <summary>Najmniejszy ekran logiczny w poziomie.</summary>
    public static double poziomMinW = 640, poziomMinH = 330;
    /// <summary>Poniżej tej skali już nie schodzimy — tekst stałby się nieczytelny.</summary>
    public static double minSkala = 0.55;
    /// <summary>Najwyższa gęstość pikseli, w jakiej rysujemy (więcej = ostrzej, ale wolniej).</summary>
    public static double maxDpr = 2;
    /// <summary>Alpha 1 (komputer): margines płyty z lewej i u góry (px) — płyta sięga prawie do krawędzi ekranu.</summary>
    public static double ramaPlyty = 20;
    /// <summary>Alpha 1 (komputer): pas pod płytą na księgę — część wysokości ekranu, obcięta do min–max (px).</summary>
    public static double dolMin = 168, dolMax = 236, dolCzesc = 0.27;
    // Pominięte (tylko telefon): waskiPonizej, pionowyTabletPonizej, pionowyOd.
}

/// <summary>
/// JAKOŚĆ RYCINY „AUTO” — gdy klatek jest za mało, rycina przechodzi na połowę
/// rozdzielczości (jak „szybka” w Ustawieniach). Tylko w dół i raz na grę,
/// żeby obraz nie skakał tam i z powrotem.
/// </summary>
public static class JAKOSC
{
    /// <summary>Średnio mniej klatek na sekundę niż tyle…</summary>
    public static double progKlatek = 40;
    /// <summary>…przez tyle ms z rzędu (liczone od wejścia do gry) — i rycina tanieje.</summary>
    public static double oknoMs = 4000;
    /// <summary>Przerwa między klatkami dłuższa niż to (karta w tle, zamrożenie) zaczyna pomiar od nowa.</summary>
    public static double przerwaMs = 250;
}

/// <summary>EKRAN ŁADOWANIA — napisy i czasy.</summary>
public static class LADOWANIE
{
    public static string tytul = "TRZEWIA";
    /// <summary>Podpis pod paskiem, gdy wszystko gotowe.</summary>
    public static string gotowe = "góra się budzi";
    /// <summary>Ekran ładowania nie znika szybciej niż po tylu ms (żeby nie mignął).</summary>
    public static double minCzasMs = 1100;
    /// <summary>Przejście do menu (ms).</summary>
    public static double wygaszenieMs = 450;
}

/// <summary>
/// INTRO — film `filmy/intro.mp4`, który rusza od razu po otwarciu gry (góra ładuje się pod nim),
/// a po nim menu. Spacja (albo Esc) go pomija.
/// </summary>
public static class INTRO
{
    /// <summary>Podpis na dole, póki film leci.</summary>
    public static string pomin = "pomiń";
    public static string klawisz = "spacja";
    /// <summary>Znaczek pojawia się po tylu ms od startu filmu…</summary>
    public static double znaczekOdMs = 400;
    /// <summary>…i rozjaśnia przez tyle ms.</summary>
    public static double znaczekRozjasnienieMs = 500;
    /// <summary>Zniknięcie filmu na końcu i po pominięciu (ms).</summary>
    public static double wygaszenieMs = 350;
    /// <summary>Film, który przez tyle ms nie ruszył, jest pomijany sam.</summary>
    public static double bezpiecznikMs = 4000;
}

/// <summary>Punkt w pikselach obrazka (np. czubek palca rękawicy).</summary>
public sealed class Punkt
{
    public double x, y;
    public Punkt() { }
    public Punkt(double x, double y) { this.x = x; this.y = y; }
}

/// <summary>
/// KURSOR — stalowa rękawica jako jedyny kursor gry, na każdym ekranie: `obrazy/kursor1.png` zwykle,
/// `obrazy/kursor2.png` (palec wciska), póki przycisk myszy jest wciśnięty. Obrazki gra sama przycina do rękawicy
/// i zmniejsza, więc nowy kursor to po prostu podmieniony plik — najwyżej trzeba poprawić `czubek`.
/// </summary>
public static class KURSOR
{
    /// <summary>Dłuższy bok rękawicy w pikselach ekranu.</summary>
    public static double rozmiar = 40;
    /// <summary>Punkt, który klika (czubek palca) — w pikselach oryginalnego obrazka.</summary>
    public static Punkt czubek = new Punkt(14, 17);
    /// <summary>To samo dla rękawicy przy kliknięciu (kursor2.png).</summary>
    public static Punkt czubekKlik = new Punkt(64, 204);
    /// <summary>Nawet najkrótsze kliknięcie pokazuje wciśniętą rękawicę co najmniej tyle ms.</summary>
    public static double klikMinMs = 120;
}
}
