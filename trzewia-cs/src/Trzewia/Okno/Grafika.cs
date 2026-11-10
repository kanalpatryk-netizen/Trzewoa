using SkiaSharp;
using Trzewia.Rdzen;
using Trzewia.Skia;

namespace Trzewia.Okno;

/// <summary>
/// Karta graficzna i Skia na niej: kontekst GRContext (wspólny dla okna i wszystkich płócien pomocniczych), opis
/// karty dla licznika F3 i dziennika oraz zapytania czasu karty. W TS odpowiednik to core/karta.ts (nazwa z WebGL,
/// stan płótna z Electrona) — tu wiemy wprost, bo sami zakładamy kontekst.
/// </summary>
public static unsafe class Grafika
{
    /// <summary>Kontekst Skii na karcie (ten sam, którego używa warstwa Trzewia.Skia).</summary>
    public static GRContext? Kontekst { get => FabrykaSkia.Kontekst; set => FabrykaSkia.Kontekst = value; }

    /// <summary>Nazwa karty, jak ją podaje sterownik (np. „ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 …, D3D11)”).</summary>
    public static string Renderer = "", Dostawca = "", Wersja = "";
    /// <summary>Krótka nazwa karty do licznika (z napisu ANGLE wyciągnięta sama karta).</summary>
    public static string Nazwa = "brak karty";
    /// <summary>Droga do karty: „ANGLE (Direct3D 11)”, „OpenGL 4.5”…</summary>
    public static string Droga = "procesor";
    /// <summary>Karta programowa (SwiftShader, llvmpipe, Microsoft Basic Render) — rysuje procesor.</summary>
    public static bool Programowa;
    public static bool Angle;
    /// <summary>Karta mierzy swój czas (zapytania czasu GL) — licznik F3 pokaże „karta: N ms”.</summary>
    public static bool CzasKartyDziala;

    const int ZAPYTAN = 6;
    static readonly uint[] zapytania = new uint[ZAPYTAN];
    static readonly bool[] wToku = new bool[ZAPYTAN];
    static int biezace = -1, nastepne;
    static bool disjoint;

    public static void Opisz(bool es, bool angle)
    {
        Renderer = Gl.Tekst(Gl.RENDERER);
        Dostawca = Gl.Tekst(Gl.VENDOR);
        Wersja = Gl.Tekst(Gl.VERSION);
        Angle = angle;
        Programowa = System.Text.RegularExpressions.Regex.IsMatch(Renderer,
            "swiftshader|llvmpipe|softpipe|software|basic render", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        Nazwa = KrotkaNazwa(Renderer);
        Droga = angle
            ? "ANGLE (" + (Renderer.Contains("D3D11", StringComparison.OrdinalIgnoreCase) || Renderer.Contains("Direct3D11", StringComparison.OrdinalIgnoreCase) ? "Direct3D 11"
                : Renderer.Contains("D3D9", StringComparison.OrdinalIgnoreCase) ? "Direct3D 9"
                : Renderer.Contains("Vulkan", StringComparison.OrdinalIgnoreCase) ? "Vulkan" : "?") + ")"
            : (es ? "OpenGL ES " : "OpenGL ") + PierwszeSlowo(Wersja.Replace("OpenGL ES ", ""));
        var rozsz = Gl.Rozszerzenia();
        disjoint = rozsz.Contains("GL_EXT_disjoint_timer_query");
        CzasKartyDziala = Gl.GenQueries != null && Gl.BeginQuery != null && Gl.GetQueryObjectui64v != null
            && (disjoint || rozsz.Contains("GL_ARB_timer_query") || (!es && WersjaGl() >= 3.3));
        if (CzasKartyDziala)
        {
            fixed (uint* q = zapytania) Gl.GenQueries(ZAPYTAN, q);
            if (Gl.GetError != null && Gl.GetError() != 0) CzasKartyDziala = false;
        }
        InfoKarty.Nazwa = Nazwa; InfoKarty.Droga = Droga; InfoKarty.Programowa = Programowa; InfoKarty.CzasKarty = CzasKartyDziala;
        Dziennik.Pisz($"karta: {Renderer} | {Dostawca} | {Wersja} | droga: {Droga} | czas karty: {(CzasKartyDziala ? "tak" : "nie")}");
    }

    static double WersjaGl()
    {
        var s = PierwszeSlowo(Wersja);
        return double.TryParse(s.Length >= 3 ? s[..3] : s, System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0;
    }

    static string PierwszeSlowo(string s) { var i = s.IndexOf(' '); return i < 0 ? s : s[..i]; }

    /// <summary>„ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)” → „NVIDIA GeForce RTX 3060”.</summary>
    public static string KrotkaNazwa(string r)
    {
        if (!r.StartsWith("ANGLE (", StringComparison.Ordinal)) return r;
        var srodek = r[7..^(r.EndsWith(')') ? 1 : 0)];
        var czesci = srodek.Split(", ");
        var n = czesci.Length >= 2 ? czesci[1] : srodek;
        var i = n.IndexOf(" (0x", StringComparison.Ordinal);
        if (i > 0) n = n[..i];
        i = n.IndexOf(" Direct3D", StringComparison.Ordinal);
        if (i > 0) n = n[..i];
        return n;
    }

    /// <summary>Początek klatki: zapytanie czasu karty obejmie całą pracę klatki (Skia wysyła ją przy flush).</summary>
    public static void PoczatekKlatki()
    {
        biezace = -1;
        if (!CzasKartyDziala) return;
        // wolne zapytanie po kolei; gdy wszystkie czekają na wynik, ta klatka nie jest mierzona
        if (wToku[nastepne]) return;
        Gl.BeginQuery(Gl.TIME_ELAPSED, zapytania[nastepne]);
        biezace = nastepne;
        nastepne = (nastepne + 1) % ZAPYTAN;
    }

    /// <summary>Po wysłaniu klatki: koniec zapytania i odbiór gotowych wyników (z poprzednich klatek).</summary>
    public static void KoniecKlatki(Wydajnosc licznik)
    {
        if (!CzasKartyDziala) return;
        if (biezace >= 0) { Gl.EndQuery(Gl.TIME_ELAPSED); wToku[biezace] = true; }
        int rozlaczone = 0;
        if (disjoint && Gl.GetIntegerv != null) Gl.GetIntegerv(Gl.GPU_DISJOINT, &rozlaczone);
        for (int i = 0; i < ZAPYTAN; i++)
        {
            if (!wToku[i]) continue;
            uint gotowe = 0;
            Gl.GetQueryObjectuiv(zapytania[i], Gl.QUERY_RESULT_AVAILABLE, &gotowe);
            if (gotowe == 0) continue;
            ulong ns = 0;
            Gl.GetQueryObjectui64v(zapytania[i], Gl.QUERY_RESULT, &ns);
            wToku[i] = false;
            if (rozlaczone == 0) licznik.Karta(ns / 1e6);
        }
    }
}
