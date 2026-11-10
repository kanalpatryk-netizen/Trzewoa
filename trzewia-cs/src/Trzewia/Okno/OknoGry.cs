using System.Runtime.InteropServices;
using SDL;
using SkiaSharp;
using Trzewia.Aplikacja;
using Trzewia.Komputer;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Skia;
using static SDL.SDL3;

namespace Trzewia.Okno;

/// <summary>
/// Okno gry: SDL3 (okno, mysz, klawiatura, pełny ekran), kontekst OpenGL ES przez ANGLE (Direct3D 11 — ta sama droga
/// do karty co w Chrome i w dawnym .exe z Electronem) albo zwykły OpenGL, i Skia na tym kontekście.
/// Gdy ANGLE nie wstanie, gra sama próbuje OpenGL (i zapisuje to w dzienniku).
/// W wersji Electron: electron/main.js (okno 1280×800, zmaksymalizowane, F11 — pełny ekran).
/// </summary>
public sealed unsafe class OknoGry : IOknoGry, IDisposable
{
    SDL_Window* okno;
    SDL_GLContextState* gl;
    GRGlInterface? interfejs;
    GRBackendRenderTarget? cel;
    SKSurface? powierzchnia;
    int stencil, probki;
    SKColorType typBarwy = SKColorType.Rgba8888;

    /// <summary>Rozmiar obrazu okna w pikselach ekranu.</summary>
    public int PikseleW { get; private set; } = 1;
    public int PikseleH { get; private set; } = 1;
    /// <summary>Rozmiar okna we współrzędnych okna (zdarzenia myszy) — na Windows zwykle równy pikselom.</summary>
    int oknoW = 1, oknoH = 1;
    /// <summary>Skala ekranu (Windows 125% → 1,25) — jak devicePixelRatio w przeglądarce.</summary>
    public double Dpr { get; private set; } = 1;
    readonly SKPaint rozciagniecie = new();
    /// <summary>Okno dostało nową powierzchnię (zmiana rozmiaru) — App musi przeliczyć układ; App zeruje.</summary>
    public bool NowaPowierzchnia { get; set; }
    public bool Zamkniete { get; private set; }
    public bool Uspione => (SDL_GetWindowFlags(okno) & (SDL_WindowFlags.SDL_WINDOW_MINIMIZED | SDL_WindowFlags.SDL_WINDOW_OCCLUDED)) != 0;

    public SKCanvas Canvas => powierzchnia!.Canvas;
    public SKSurface Powierzchnia => powierzchnia!;

    // trzymane, żeby sprzątacz pamięci nie zabrał delegata, który woła Skia
    GRGlGetProcedureAddressDelegate? proc;

    OknoGry() { }

    /// <summary>Otwiera okno. Droga do karty: przełącznik (--angle/--opengl), potem ustawienie „karta”, potem domyślna.</summary>
    public static OknoGry Otworz()
    {
        SDL_SetHint("SDL_APP_NAME", "Trzewia");
        // pierwsze kliknięcie w nieaktywne okno też jest kliknięciem — jak w przeglądarce
        SDL_SetHint("SDL_MOUSE_FOCUS_CLICKTHROUGH", "1");
        var droga = Uruchomienie.Droga ?? SettingsStore.ustawienia.karta;
        var o = new OknoGry();
        var angleJest = OperatingSystem.IsWindows() && File.Exists(Path.Combine(Sciezki.Gra, "av_libglesv2.dll"));
        var proby = droga switch
        {
            "opengl" => new[] { false },
            "angle" => angleJest ? new[] { true, false } : new[] { false },
            _ => angleJest ? new[] { true, false } : new[] { false },
        };
        string? blad = null;
        foreach (var angle in proby)
        {
            blad = o.Sprobuj(angle);
            if (blad == null) return o;
            Dziennik.Pisz($"{(angle ? "ANGLE" : "OpenGL")} nie wstał: {blad}");
        }
        throw new InvalidOperationException("Nie udało się uruchomić grafiki: " + blad);
    }

    string? Sprobuj(bool angle)
    {
        if (angle)
        {
            // ANGLE w jednym pliku (Avalonia.Angle.Windows.Natives): i EGL, i GLES
            var dll = Path.Combine(Sciezki.Gra, "av_libglesv2.dll");
            SDL_SetHint("SDL_VIDEO_FORCE_EGL", "1");
            SDL_SetHint("SDL_OPENGL_ES_DRIVER", "1");
            SDL_SetHint("SDL_EGL_LIBRARY", dll);
            SDL_SetHint("SDL_OPENGL_LIBRARY", dll);
        }
        else
        {
            SDL_SetHint("SDL_VIDEO_FORCE_EGL", "0");
            SDL_SetHint("SDL_OPENGL_ES_DRIVER", "0");
        }
        if (!SDL_Init(SDL_InitFlags.SDL_INIT_VIDEO)) return "SDL_Init: " + SDL_GetError();
        SDL_GL_ResetAttributes();
        if (angle)
        {
            SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_CONTEXT_PROFILE_MASK, 4 /* ES */);
            SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_CONTEXT_MAJOR_VERSION, 3);
            SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_CONTEXT_MINOR_VERSION, 0);
        }
        SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_RED_SIZE, 8);
        SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_GREEN_SIZE, 8);
        SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_BLUE_SIZE, 8);
        SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_ALPHA_SIZE, 8);
        SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_DEPTH_SIZE, 0);
        SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_STENCIL_SIZE, 8);
        SDL_GL_SetAttribute(SDL_GLAttr.SDL_GL_DOUBLEBUFFER, 1);

        bool ustalony = Uruchomienie.RozmiarW > 0 && Uruchomienie.RozmiarH > 0;
        var flagi = SDL_WindowFlags.SDL_WINDOW_OPENGL | SDL_WindowFlags.SDL_WINDOW_RESIZABLE
                  | SDL_WindowFlags.SDL_WINDOW_HIGH_PIXEL_DENSITY | SDL_WindowFlags.SDL_WINDOW_HIDDEN;
        okno = SDL_CreateWindow("Trzewia", ustalony ? Uruchomienie.RozmiarW : 1280, ustalony ? Uruchomienie.RozmiarH : 800, flagi);
        if (okno == null) { var b = "okno: " + SDL_GetError(); SDL_QuitSubSystem(SDL_InitFlags.SDL_INIT_VIDEO); return b; }
        gl = SDL_GL_CreateContext(okno);
        if (gl == null) { var b = "kontekst GL: " + SDL_GetError(); Zamknij(); return b; }
        SDL_GL_MakeCurrent(okno, gl);
        // obraz zsynchronizowany z odświeżaniem monitora — bez rozrywania obrazu przy przesuwaniu kamery
        if (!SDL_GL_SetSwapInterval(1)) Dziennik.Pisz("bez synchronizacji z monitorem: " + SDL_GetError());

        Func<string, IntPtr> pobierz = n => SDL_GL_GetProcAddress(n);
        Dziennik.Pisz("GL: wskaźniki funkcji");
        Gl.Zaladuj(pobierz, angle);
        Dziennik.Pisz($"GL: {Gl.Tekst(Gl.RENDERER)} | {Gl.Tekst(Gl.VERSION)}");
        // GLX (Linux) zwraca niepusty wskaźnik dla każdej nazwy, także nieistniejącej funkcji EGL — Skia pyta o
        // eglQueryString i woła go, co kończy się upadkiem. Bez EGL nazwy egl* nie istnieją.
        proc = n => !angle && n.StartsWith("egl", StringComparison.Ordinal) ? IntPtr.Zero : SDL_GL_GetProcAddress(n);
        interfejs = GRGlInterface.Create(proc);
        Dziennik.Pisz($"Skia: interfejs GL {(interfejs != null ? "jest" : "brak")}");
        if (interfejs == null) { Zamknij(); return "Skia: brak interfejsu GL"; }
        Grafika.Kontekst = GRContext.CreateGl(interfejs);
        if (Grafika.Kontekst == null) { Zamknij(); return "Skia: brak kontekstu na karcie"; }
        // pamięć Skii na karcie: tekstury płócien pomocniczych i glify (karty zintegrowane dzielą ją z RAM)
        Grafika.Kontekst.SetResourceCacheLimit(384L * 1024 * 1024);
        int v;
        SDL_GL_GetAttribute(SDL_GLAttr.SDL_GL_STENCIL_SIZE, &v); stencil = v;
        SDL_GL_GetAttribute(SDL_GLAttr.SDL_GL_MULTISAMPLESAMPLES, &v); probki = v;
        Grafika.Opisz(angle, angle);
        Dziennik.Pisz($"SDL {SDL_GetVersion()} ({SDL_GetCurrentVideoDriver()}), szablon {stencil} bitów, próbki {probki}");

        if (!ustalony)
        {
            SDL_SetWindowMinimumSize(okno, 640, 400);
            SDL_MaximizeWindow(okno);
        }
        SDL_ShowWindow(okno);
        if (SettingsStore.ustawienia.pelnyEkran && !Uruchomienie.Okno && !ustalony) SDL_SetWindowFullscreen(okno, true);
        Zmierz();
        if (!NowyCel()) { Zamknij(); return "Skia: powierzchnia okna"; }
        return null;
    }

    void Zmierz()
    {
        int pw, ph, ow, oh;
        SDL_GetWindowSizeInPixels(okno, &pw, &ph);
        SDL_GetWindowSize(okno, &ow, &oh);
        PikseleW = Math.Max(1, pw); PikseleH = Math.Max(1, ph);
        oknoW = Math.Max(1, ow); oknoH = Math.Max(1, oh);
        var s = SDL_GetWindowDisplayScale(okno);
        Dpr = s > 0 ? s : 1;
    }

    /// <summary>Powierzchnia Skii na ramce okna (po każdej zmianie rozmiaru od nowa).</summary>
    bool NowyCel()
    {
        powierzchnia?.Dispose();
        cel?.Dispose();
        cel = new GRBackendRenderTarget(PikseleW, PikseleH, probki, stencil, new GRGlFramebufferInfo(0, Gl.RGBA8));
        powierzchnia = SKSurface.Create(Grafika.Kontekst, cel, GRSurfaceOrigin.BottomLeft, typBarwy);
        NowaPowierzchnia = true;
        return powierzchnia != null;
    }

    /// <summary>Płótno gry wprost na ramce okna albo na własnej, mniejszej powierzchni (IOknoGry).</summary>
    public void Podepnij(IPlotno ctx, int pw, int ph, bool wprost)
    {
        var p = (PlotnoSkia)ctx;
        if (wprost) p.UstawCel(Canvas, pw, ph);
        else p.UstawRozmiar(pw, ph);
    }

    /// <summary>Płótno mniejsze niż okno: rozciągnięte gładko na całe okno (jak obraz płótna w przeglądarce).</summary>
    public void Rozciagnij(IPlotno ctx)
    {
        var img = ((PlotnoSkia)ctx).Migawka();
        if (img == null) return;
        var cel = Canvas;
        cel.ResetMatrix();
        cel.DrawImage(img, SKRect.Create(0, 0, img.Width, img.Height), SKRect.Create(0, 0, PikseleW, PikseleH),
            new SKSamplingOptions(SKFilterMode.Linear), rozciagniecie);
    }

    /// <summary>Koniec klatki: Skia wysyła rysunek do karty, potem obraz idzie na ekran (czeka na monitor).</summary>
    public void Pokaz()
    {
        var t0 = Wydajnosc.Teraz();
        Grafika.Kontekst!.Flush();
        Grafika.Kontekst.Submit(false);
        var t1 = Wydajnosc.Teraz();
        Grafika.KoniecKlatki(Wydajnosc.licznik);
        SDL_GL_SwapWindow(okno);
        var t2 = Wydajnosc.Teraz();
        Wydajnosc.licznik.Wyslanie(t1 - t0, t2 - t1);
    }

    /// <summary>Współrzędne okna → piksele CSS (jak clientX w przeglądarce).</summary>
    double NaCss(float v, bool poziom) => v * (poziom ? PikseleW / (double)oknoW : PikseleH / (double)oknoH) / Dpr;

    static int Przycisk(byte sdl) => sdl switch { 1 => 0, 2 => 1, 3 => 2, 4 => 3, 5 => 4, _ => -1 };

    /// <summary>Maska przycisków SDL (lewy 1, środkowy 2, prawy 4) → maska przeglądarki (lewy 1, prawy 2, środkowy 4).</summary>
    static int Przyciski(uint s) => (int)((s & 1) | ((s & 4) != 0 ? 2u : 0) | ((s & 2) != 0 ? 4u : 0) | (s & 24));

    static int PrzyciskiTeraz() => Przyciski((uint)SDL_GetMouseState(null, null));

    /// <summary>Zdarzenia z kolejki SDL do App. F11 przełącza pełny ekran (jak w electron/main.js — gra go nie widzi).</summary>
    public void Zdarzenia(App app)
    {
        SDL_Event e;
        while (SDL_PollEvent(&e))
        {
            switch ((SDL_EventType)e.type)
            {
                case SDL_EventType.SDL_EVENT_QUIT:
                case SDL_EventType.SDL_EVENT_WINDOW_CLOSE_REQUESTED:
                    Zamkniete = true; break;
                case SDL_EventType.SDL_EVENT_WINDOW_RESIZED:
                case SDL_EventType.SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED:
                case SDL_EventType.SDL_EVENT_WINDOW_DISPLAY_SCALE_CHANGED:
                    {
                        int pw = PikseleW, ph = PikseleH;
                        Zmierz();
                        if (pw != PikseleW || ph != PikseleH || powierzchnia == null) NowyCel();
                        else NowaPowierzchnia = true;
                        break;
                    }
                case SDL_EventType.SDL_EVENT_MOUSE_MOTION:
                    {
                        var m = e.motion;
                        var mod = SDL_GetModState();
                        app.NaWskaznik(Faza.ruch, NaCss(m.x, true), NaCss(m.y, false), -1, Przyciski((uint)m.state),
                            (mod & SDL_Keymod.SDL_KMOD_SHIFT) != 0, (mod & SDL_Keymod.SDL_KMOD_CTRL) != 0, (mod & SDL_Keymod.SDL_KMOD_ALT) != 0);
                        break;
                    }
                case SDL_EventType.SDL_EVENT_MOUSE_BUTTON_DOWN:
                case SDL_EventType.SDL_EVENT_MOUSE_BUTTON_UP:
                    {
                        var b = e.button;
                        var mod = SDL_GetModState();
                        app.NaWskaznik(b.down ? Faza.dol : Faza.gora, NaCss(b.x, true), NaCss(b.y, false), Przycisk(b.button), PrzyciskiTeraz(),
                            (mod & SDL_Keymod.SDL_KMOD_SHIFT) != 0, (mod & SDL_Keymod.SDL_KMOD_CTRL) != 0, (mod & SDL_Keymod.SDL_KMOD_ALT) != 0);
                        break;
                    }
                case SDL_EventType.SDL_EVENT_MOUSE_WHEEL:
                    {
                        var k = e.wheel;
                        float odwr = k.direction == SDL_MouseWheelDirection.SDL_MOUSEWHEEL_FLIPPED ? -1 : 1;
                        var mod = SDL_GetModState();
                        // SDL: y > 0 — kółko od siebie; przeglądarka: deltaY < 0. Ząbek = 100 (Chrome na Windows)
                        app.NaKolko(NaCss(k.mouse_x, true), NaCss(k.mouse_y, false), k.x * odwr * 100, -k.y * odwr * 100,
                            (mod & SDL_Keymod.SDL_KMOD_SHIFT) != 0, (mod & SDL_Keymod.SDL_KMOD_CTRL) != 0);
                        break;
                    }
                case SDL_EventType.SDL_EVENT_KEY_DOWN:
                case SDL_EventType.SDL_EVENT_KEY_UP:
                    {
                        var k = e.key;
                        var nazwa = Klawisze.Nazwa((uint)k.key, (uint)k.scancode, k.mod);
                        if (k.down && nazwa == "F11" && !k.repeat) { PrzelaczPelnyEkran(); break; }
                        var z = new Klawisz
                        {
                            key = nazwa, code = Klawisze.Kod((uint)k.scancode),
                            shiftKey = (k.mod & SDL_Keymod.SDL_KMOD_SHIFT) != 0, ctrlKey = (k.mod & SDL_Keymod.SDL_KMOD_CTRL) != 0,
                            altKey = (k.mod & SDL_Keymod.SDL_KMOD_ALT) != 0, metaKey = (k.mod & SDL_Keymod.SDL_KMOD_GUI) != 0,
                            repeat = k.repeat,
                        };
                        if (k.down) app.NaKlawisz(z); else app.NaKlawiszPuszczony(z);
                        break;
                    }
            }
        }
    }

    public bool PelnyEkran => (SDL_GetWindowFlags(okno) & SDL_WindowFlags.SDL_WINDOW_FULLSCREEN) != 0;

    public void PrzelaczPelnyEkran() => SDL_SetWindowFullscreen(okno, !PelnyEkran);

    /// <summary>Czeka na zdarzenie (okno zminimalizowane — gra nie rysuje i nie zjada procesora).</summary>
    public void Czekaj(int ms)
    {
        SDL_Event e;
        if (SDL_WaitEventTimeout(&e, ms)) SDL_PushEvent(&e);
    }

    public static void Komunikat(string tytul, string tresc) =>
        SDL_ShowSimpleMessageBox(SDL_MessageBoxFlags.SDL_MESSAGEBOX_ERROR, tytul, tresc, null);

    void Zamknij()
    {
        powierzchnia?.Dispose(); powierzchnia = null;
        cel?.Dispose(); cel = null;
        Grafika.Kontekst?.AbandonContext(false);
        Grafika.Kontekst?.Dispose(); Grafika.Kontekst = null;
        interfejs?.Dispose(); interfejs = null;
        if (gl != null) { SDL_GL_DestroyContext(gl); gl = null; }
        if (okno != null) { SDL_DestroyWindow(okno); okno = null; }
        SDL_QuitSubSystem(SDL_InitFlags.SDL_INIT_VIDEO);
    }

    public void Dispose()
    {
        powierzchnia?.Dispose(); powierzchnia = null;
        cel?.Dispose(); cel = null;
        Grafika.Kontekst?.Dispose(); Grafika.Kontekst = null;
        interfejs?.Dispose();
        if (gl != null) SDL_GL_DestroyContext(gl);
        if (okno != null) SDL_DestroyWindow(okno);
        SDL_Quit();
    }
}
