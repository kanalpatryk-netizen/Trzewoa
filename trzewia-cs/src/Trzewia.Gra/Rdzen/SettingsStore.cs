// Port: alpha-1/src/core/settings-store.ts
// Plik gracza ustawienia.json (Trzewia.exe: Dokumenty\My Games\Trzewia) — ten sam JSON, który TS trzymał w localStorage
// pod kluczem „trzewia-alpha-1:ustawienia” (te same nazwy pól i wartości).
using System;
using System.Collections.Generic;
using System.Reflection;

namespace Trzewia.Rdzen
{

/// <summary>Ustawienia gracza — jedno miejsce, z którego czyta cała gra.</summary>
public sealed class Settings
{
    public bool trybDeweloperski = false;  // podgląd liczb świata i narzędzia dla twórcy
    public double glosnosc = 0.7;          // 0..1
    public bool muzyka = true;
    public bool rezonans = true;           // dźwięk świata: kucie, modlitwa, kamień
    public bool efekty = true;             // dźwięki gestów: szkic, pauza, ostrzeżenia, atlas
    public string jakosc = "auto";         // 'auto' | 'ostra' | 'szybka'
    public bool kameraZaZyciem = true;
    /// <summary>Karta wydarzenia i ostrzeżenie same wiozą kamerę na miejsce (wyłączone: tylko znacznik i strzałka przy krawędzi).</summary>
    public bool kameraDoWydarzen = false;
    public bool autoZoom = false;
    public bool oddech = true;             // powolne falowanie całego rysunku
    public bool ograniczRuch = false;      // mniej drgań: dla oczu, które tego nie znoszą
    public bool kronika = true;
    public bool spisRas = true;
    public bool skalaGlebokosci = true;
    public double wielkoscSylwetek = 1.15; // 0.7..2.2
    public double kontrast = 1;            // 0.75..1.35 — siła kreskowania
    /// <summary>v4.2 beta: jasność ryciny świata (1..1.8) — świat bywał za ciemny, postacie ginęły w skale.</summary>
    public double jasnosc = 1.25;
    public bool autozapis = true;
    public bool samouczekZrobiony = false;
    /// <summary>Kiedy gra sama zatrzymuje czas: przy kryzysach, przy każdym wydarzeniu albo nigdy.</summary>
    public string autoPauza = "kryzysy";   // 'wyłączona' | 'kryzysy' | 'wszystko'
    /// <summary>Nowa tablica atlasu: otwiera się sama przy pierwszym spotkaniu albo tylko trafia do atlasu.</summary>
    public string tablice = "tylko w atlasie"; // 'pokazuj' | 'tylko w atlasie'
    /// <summary>Mnożnik wielkości całego obrazu ponad automatyczne dopasowanie do ekranu.</summary>
    public double wielkoscUI = 1;
    /// <summary>Gra idzie na pełny ekran (w TS: po pierwszym dotknięciu; tu od startu — patrz PLAN.md, różnice).</summary>
    public bool pelnyEkran = true;
    /// <summary>Remake v1: nowe postacie ludu (cieniowane, z ruchem wtórnym); wyłączone — stary rysunek z ryciny.</summary>
    public bool nowePostacie = true;
    /// <summary>Rysunek świata na płycie: malowany jak fresk z ikony albo kreskowany jak dawna rycina.</summary>
    public string swiat = "rycina";        // 'fresk' | 'rycina'
    /// <summary>
    /// Wydajność (8.11): rozdzielczość obrazu — ułamek pikseli ekranu, w których gra rysuje (1, 0,85, 0,75, 0,6).
    /// Mniej pikseli to mniej pracy karty graficznej; obraz rozciąga się na cały ekran, trochę miękcej.
    /// </summary>
    public double rozdzielczosc = 1;
    /// <summary>Wydajność: najwięcej klatek na sekundę (0 — bez limitu, czyli tyle, ile odświeża monitor).</summary>
    public double limitKlatek = 0;
    /// <summary>Wydajność: licznik klatek i czasu każdej części klatki (F3).</summary>
    public bool licznikWydajnosci = false;
    /// <summary>
    /// Wydajność (TS): rycina świata w osobnym wątku. W C# rycinę liczy karta graficzna (shader), więc tego
    /// przełącznika nie ma w ustawieniach — pole zostaje, żeby plik miał ten sam format co w TS.
    /// </summary>
    public bool rycinaWWatku = true;
    /// <summary>
    /// C# (10.11, zamiast wymuszania karty z Electrona): droga do karty graficznej — 'auto' (Windows: ANGLE na Direct3D 11,
    /// a gdy nie wstanie — OpenGL), 'angle' albo 'opengl'.
    /// </summary>
    public string karta = "auto";

    public Settings Kopia() => (Settings)MemberwiseClone();
}

/// <summary>Skala ekranu: ile pikseli CSS przypada na jeden piksel logiczny gry.</summary>
public sealed class SkalaEkranu { public double skala = 1; }

/// <summary>Stan trybu „auto”: czy strażnik klatek kazał już rysować taniej (patrz nastawy JAKOSC).</summary>
public sealed class JakoscAuto { public bool taniej = false; }

/// <summary>Ustawienia — wczytanie, zapis i to, co z nich wynika. Kod gry pisze <c>using static Trzewia.Rdzen.SettingsStore;</c>.</summary>
public static class SettingsStore
{
    public static readonly Settings DOMYSLNE = new Settings();

    /// <summary>
    /// Skala ekranu: ile pikseli CSS przypada na jeden piksel logiczny gry. Na dużym
    /// monitorze cały obraz rośnie razem z ekranem, zamiast zostawać drobnym ziarnkiem.
    /// </summary>
    public static readonly SkalaEkranu ekran = new SkalaEkranu();

    const string PLIK = "ustawienia.json";


    /// <summary>Stan trybu „auto”: czy strażnik klatek kazał już rysować taniej (patrz nastawy JAKOSC).</summary>
    public static readonly JakoscAuto jakoscAuto = new JakoscAuto();

    /// <summary>
    /// Alpha 0.2 (5.11): ustawienia wyjęte z ekranu ustawień (zostało najwyżej 5 na kategorię).
    /// Mają zawsze wartość domyślną — także u gracza, który kiedyś je zmienił.
    /// </summary>
    static void Stale(Settings u)
    {
        var d = DOMYSLNE;
        u.jakosc = d.jakosc; u.swiat = d.swiat; u.kontrast = d.kontrast; u.wielkoscSylwetek = d.wielkoscSylwetek;
        u.oddech = d.oddech; u.nowePostacie = d.nowePostacie; u.spisRas = d.spisRas; u.skalaGlebokosci = d.skalaGlebokosci;
        u.autoZoom = d.autoZoom; u.tablice = d.tablice; u.kronika = d.kronika;
    }

    static Settings Wczytaj()
    {
        try
        {
            var raw = Gospodarz.Pliki.Czytaj(PLIK);
            var u = DOMYSLNE.Kopia();
            if (raw == null) return u;
            // brakujące pola zostają domyślne — jak { ...DOMYSLNE, ...JSON.parse(raw) } w TS
            if (Json.Czytaj(raw) is Dictionary<string, object?> d)
                foreach (var f in Pola)
                {
                    if (!d.TryGetValue(f.Name, out var v)) continue;
                    if (f.FieldType == typeof(bool) && v is bool b) f.SetValue(u, b);
                    else if (f.FieldType == typeof(double) && v is double x) f.SetValue(u, x);
                    else if (f.FieldType == typeof(string) && v is string t) f.SetValue(u, t);
                }
            Stale(u);
            return u;
        }
        catch (Exception e)
        {
            Dziennik.Pisz($"ustawienia nieczytelne, biorę domyślne: {e.Message}");
            return DOMYSLNE.Kopia();
        }
    }

    static readonly FieldInfo[] Pola = typeof(Settings).GetFields(BindingFlags.Public | BindingFlags.Instance);

    public static readonly Settings ustawienia = Wczytaj();

    public static void zapiszUstawienia()
    {
        var d = new Dictionary<string, object?>();
        foreach (var f in Pola) d[f.Name] = f.GetValue(ustawienia);
        Gospodarz.Pliki.Zapisz(PLIK, Json.Pisz(d, 2));
    }

    /// <summary>Jak ustaw(klucz, wartość) w TS: <c>ustaw(ref ustawienia.licznikWydajnosci, true)</c>.</summary>
    public static void ustaw<T>(ref T pole, T wartosc)
    {
        pole = wartosc;
        zapiszUstawienia();
    }

    /// <summary>
    /// Skala renderu ryciny: „ostra" rysuje w pełnej rozdzielczości, „szybka" w połowie. „Auto" zaczyna
    /// w pełnej — w połowie cienka kreska rozpadała się na deszcz pikseli — i schodzi do połowy dopiero,
    /// gdy strażnik klatek (Rysunek/StrazKlatek.cs) zobaczy, że komputer nie nadąża.
    /// </summary>
    public static double skalaRenderu(double _szerokosc)
    {
        if (ustawienia.jakosc == "ostra") return 1;
        if (ustawienia.jakosc == "szybka" || jakoscAuto.taniej) return 2;
        return 1;
    }
}
}
