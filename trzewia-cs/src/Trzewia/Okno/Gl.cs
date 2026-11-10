using System.Runtime.InteropServices;

namespace Trzewia.Okno;

/// <summary>
/// Te kilka funkcji OpenGL, które gra woła sama, poza Skią: nazwa karty i zapytania czasu karty (licznik F3).
/// Wskaźniki bierze z kontekstu (SDL_GL_GetProcAddress) — działa tak samo na ANGLE i na zwykłym OpenGL.
/// Gra nie zmienia stanu GL, który śledzi Skia (zapytania czasu nie są takim stanem).
/// </summary>
public static unsafe class Gl
{
    public const uint VENDOR = 0x1F00, RENDERER = 0x1F01, VERSION = 0x1F02, EXTENSIONS = 0x1F03;
    public const uint NUM_EXTENSIONS = 0x821D;
    public const uint TIME_ELAPSED = 0x88BF, QUERY_RESULT = 0x8866, QUERY_RESULT_AVAILABLE = 0x8867, GPU_DISJOINT = 0x8FBB;
    public const uint RGBA8 = 0x8058;

    public static delegate* unmanaged<uint, byte*> GetString;
    public static delegate* unmanaged<uint, uint, byte*> GetStringi;
    public static delegate* unmanaged<uint, int*, void> GetIntegerv;
    public static delegate* unmanaged<uint> GetError;
    public static delegate* unmanaged<int, uint*, void> GenQueries;
    public static delegate* unmanaged<int, uint*, void> DeleteQueries;
    public static delegate* unmanaged<uint, uint, void> BeginQuery;
    public static delegate* unmanaged<uint, void> EndQuery;
    public static delegate* unmanaged<uint, uint, uint*, void> GetQueryObjectuiv;
    public static delegate* unmanaged<uint, uint, ulong*, void> GetQueryObjectui64v;

    public static void Zaladuj(Func<string, IntPtr> proc, bool es)
    {
        GetString = (delegate* unmanaged<uint, byte*>)proc("glGetString");
        GetStringi = (delegate* unmanaged<uint, uint, byte*>)proc("glGetStringi");
        GetIntegerv = (delegate* unmanaged<uint, int*, void>)proc("glGetIntegerv");
        GetError = (delegate* unmanaged<uint>)proc("glGetError");
        // GLES 3 ma zapytania w rdzeniu, a czas karty dokłada rozszerzenie EXT_disjoint_timer_query (ANGLE na D3D11 je ma)
        GenQueries = (delegate* unmanaged<int, uint*, void>)Pierwsza(proc, "glGenQueries", "glGenQueriesEXT");
        DeleteQueries = (delegate* unmanaged<int, uint*, void>)Pierwsza(proc, "glDeleteQueries", "glDeleteQueriesEXT");
        BeginQuery = (delegate* unmanaged<uint, uint, void>)Pierwsza(proc, "glBeginQuery", "glBeginQueryEXT");
        EndQuery = (delegate* unmanaged<uint, void>)Pierwsza(proc, "glEndQuery", "glEndQueryEXT");
        GetQueryObjectuiv = (delegate* unmanaged<uint, uint, uint*, void>)Pierwsza(proc, "glGetQueryObjectuiv", "glGetQueryObjectuivEXT");
        GetQueryObjectui64v = (delegate* unmanaged<uint, uint, ulong*, void>)(es
            ? Pierwsza(proc, "glGetQueryObjectui64vEXT", "glGetQueryObjectui64v")
            : Pierwsza(proc, "glGetQueryObjectui64v", "glGetQueryObjectui64vEXT"));
    }

    static IntPtr Pierwsza(Func<string, IntPtr> proc, string a, string b)
    {
        var p = proc(a);
        return p != IntPtr.Zero ? p : proc(b);
    }

    public static string Tekst(uint nazwa)
    {
        if (GetString == null) return "";
        var p = GetString(nazwa);
        return p == null ? "" : Marshal.PtrToStringUTF8((IntPtr)p) ?? "";
    }

    /// <summary>Lista rozszerzeń (GL 3+ / GLES 3 — po jednym, starsze — jednym napisem).</summary>
    public static HashSet<string> Rozszerzenia()
    {
        var wynik = new HashSet<string>();
        int n = 0;
        if (GetStringi != null && GetIntegerv != null)
        {
            GetIntegerv(NUM_EXTENSIONS, &n);
            if (GetError != null) GetError();
            for (uint i = 0; i < n; i++)
            {
                var p = GetStringi(EXTENSIONS, i);
                if (p != null) wynik.Add(Marshal.PtrToStringUTF8((IntPtr)p) ?? "");
            }
        }
        if (wynik.Count == 0)
            foreach (var e in Tekst(EXTENSIONS).Split(' ', StringSplitOptions.RemoveEmptyEntries)) wynik.Add(e);
        if (GetError != null) GetError();
        return wynik;
    }
}
