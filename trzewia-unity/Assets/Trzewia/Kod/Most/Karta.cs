// Karta graficzna dla Skii poza oknem silnika: własny kontekst OpenGL ES przez EGL — na Windows ANGLE (Direct3D 11,
// ta sama droga do karty co w Trzewia.exe i w Chrome), na Linuksie systemowy libEGL (Mesa, NVIDIA). Kontekst żyje
// w wątku gry i nie dotyka grafiki silnika (Unity może rysować Direct3D, Vulkanem czy OpenGL — bez znaczenia).
// Gdy karty nie da się otworzyć, gra rysuje procesorem (dużo wolniej) i pisze to w dzienniku.
using System;
using System.Runtime.InteropServices;
using SkiaSharp;
using Trzewia.Rdzen;

namespace Trzewia.Most
{
    public sealed class Karta : IDisposable
    {
        /// <summary>Kontekst Skii na karcie (ten sam dla okna i płócien pomocniczych — FabrykaSkia.Kontekst).</summary>
        public GRContext Kontekst { get; private set; } = null!;
        public string Renderer { get; private set; } = "";
        public string Wersja { get; private set; } = "";
        /// <summary>„ANGLE (Direct3D 11)”, „OpenGL ES 3.2 (EGL)”…</summary>
        public string Droga { get; private set; } = "";

        Egl egl = null!;
        IntPtr dpy, pow, ctx;
        GRGlInterface? interfejs;
        // trzymany, żeby sprzątacz pamięci nie zabrał delegata, który woła Skia
        GRGlGetProcedureAddressDelegate? proc;

        const int EGL_NONE = 0x3038, EGL_RED_SIZE = 0x3024, EGL_GREEN_SIZE = 0x3023, EGL_BLUE_SIZE = 0x3022,
            EGL_ALPHA_SIZE = 0x3021, EGL_STENCIL_SIZE = 0x3026, EGL_SURFACE_TYPE = 0x3033, EGL_PBUFFER_BIT = 0x0001,
            EGL_RENDERABLE_TYPE = 0x3040, EGL_OPENGL_ES2_BIT = 0x0004, EGL_OPENGL_ES3_BIT = 0x0040,
            EGL_WIDTH = 0x3057, EGL_HEIGHT = 0x3056, EGL_CONTEXT_CLIENT_VERSION = 0x3098,
            EGL_PLATFORM_SURFACELESS_MESA = 0x31DD, EGL_EXTENSIONS = 0x3055;
        const uint EGL_OPENGL_ES_API = 0x30A0;
        const uint GL_VENDOR = 0x1F00, GL_RENDERER = 0x1F01, GL_VERSION = 0x1F02;

        [UnmanagedFunctionPointer(CallingConvention.Winapi)]
        delegate IntPtr GlGetString(uint nazwa);
        [UnmanagedFunctionPointer(CallingConvention.Winapi)]
        delegate IntPtr EglGetPlatformDisplay(int platforma, IntPtr natywny, int[]? atrybuty);

        Karta() { }

        /// <summary>Otwiera kartę w bieżącym wątku (kontekst zostaje w nim aktywny). null — bez karty, powód w <paramref name="blad"/>.</summary>
        public static Karta? Otworz(out string blad)
        {
            var k = new Karta();
            try
            {
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) k.egl = new EglWindows();
                else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux)) k.egl = new EglLinux();
                else { blad = "na tym systemie nie ma EGL"; return null; }
                var b = k.Sprobuj();
                if (b == null) { blad = ""; return k; }
                k.Dispose();
                blad = b;
                return null;
            }
            catch (Exception e)
            {
                // brak biblioteki (DllNotFoundException) albo funkcji — gra pójdzie procesorem
                try { k.Dispose(); } catch { }
                blad = e.GetType().Name + ": " + e.Message;
                return null;
            }
        }

        string? Sprobuj()
        {
            // 1) zwykły ekran (Windows: ANGLE na Direct3D 11; Linux: X11/Wayland) z buforem 1×1 poza ekranem
            dpy = egl.GetDisplay(IntPtr.Zero);
            string? b = dpy == IntPtr.Zero ? "eglGetDisplay" : Kontekst3(true);
            if (b == null) return null;
            Dziennik.Pisz("EGL (zwykły ekran): " + b);
            // 2) Linux bez okien (Mesa): kontekst bez powierzchni
            if (egl is EglLinux)
            {
                var f = egl.GetProcAddress("eglGetPlatformDisplayEXT");
                if (f == IntPtr.Zero) return b;
                var gpd = Marshal.GetDelegateForFunctionPointer<EglGetPlatformDisplay>(f);
                dpy = gpd(EGL_PLATFORM_SURFACELESS_MESA, IntPtr.Zero, new[] { EGL_NONE });
                if (dpy == IntPtr.Zero) return b + "; bez okien: brak ekranu";
                var b2 = Kontekst3(false);
                return b2 == null ? null : b + "; bez okien: " + b2;
            }
            return b;
        }

        /// <summary>Kontekst OpenGL ES 3 (albo 2) na ekranie <see cref="dpy"/> i Skia na nim.</summary>
        string? Kontekst3(bool zBuforem)
        {
            if (!egl.Initialize(dpy, out var ma, out var mi)) return $"eglInitialize (błąd 0x{egl.GetError():X})";
            if (!egl.BindAPI(EGL_OPENGL_ES_API)) return "eglBindAPI";
            foreach (var wersja in new[] { 3, 2 })
            {
                var atr = new[]
                {
                    EGL_RED_SIZE, 8, EGL_GREEN_SIZE, 8, EGL_BLUE_SIZE, 8, EGL_ALPHA_SIZE, 8, EGL_STENCIL_SIZE, 8,
                    EGL_RENDERABLE_TYPE, wersja == 3 ? EGL_OPENGL_ES3_BIT : EGL_OPENGL_ES2_BIT,
                    EGL_SURFACE_TYPE, zBuforem ? EGL_PBUFFER_BIT : 0,
                    EGL_NONE,
                };
                var konf = new IntPtr[1];
                if (!egl.ChooseConfig(dpy, atr, konf, 1, out var ile) || ile < 1) continue;
                pow = IntPtr.Zero;
                if (zBuforem)
                {
                    pow = egl.CreatePbufferSurface(dpy, konf[0], new[] { EGL_WIDTH, 1, EGL_HEIGHT, 1, EGL_NONE });
                    if (pow == IntPtr.Zero) continue;
                }
                ctx = egl.CreateContext(dpy, konf[0], IntPtr.Zero, new[] { EGL_CONTEXT_CLIENT_VERSION, wersja, EGL_NONE });
                if (ctx == IntPtr.Zero)
                {
                    if (pow != IntPtr.Zero) { egl.DestroySurface(dpy, pow); pow = IntPtr.Zero; }
                    continue;
                }
                if (!egl.MakeCurrent(dpy, pow, pow, ctx)) { Zwolnij(); continue; }
                var b = Skia();
                if (b == null)
                {
                    Dziennik.Pisz($"EGL {ma}.{mi}, OpenGL ES {wersja}{(zBuforem ? "" : ", bez okien")}");
                    return null;
                }
                Zwolnij();
                return b;
            }
            return $"brak konfiguracji OpenGL ES (błąd 0x{egl.GetError():X})";
        }

        string? Skia()
        {
            var gs = egl.GetProcAddress("glGetString");
            if (gs == IntPtr.Zero) return "brak glGetString";
            var getString = Marshal.GetDelegateForFunctionPointer<GlGetString>(gs);
            string Tekst(uint n) { var p = getString(n); return p == IntPtr.Zero ? "" : Marshal.PtrToStringAnsi(p) ?? ""; }
            Renderer = Tekst(GL_RENDERER);
            Wersja = Tekst(GL_VERSION);
            var dostawca = Tekst(GL_VENDOR);
            proc = nazwa => egl.GetProcAddress(nazwa);
            interfejs = GRGlInterface.Create(proc);
            if (interfejs == null) return "Skia: brak interfejsu GL";
            var k = GRContext.CreateGl(interfejs);
            if (k == null) return "Skia: brak kontekstu na karcie";
            Kontekst = k;
            // pamięć Skii na karcie: tekstury płócien pomocniczych i glify (jak w Trzewia.exe)
            Kontekst.SetResourceCacheLimit(384L * 1024 * 1024);
            bool angle = Renderer.StartsWith("ANGLE", StringComparison.Ordinal);
            Droga = angle
                ? "ANGLE (" + (Renderer.IndexOf("D3D11", StringComparison.OrdinalIgnoreCase) >= 0 || Renderer.IndexOf("Direct3D11", StringComparison.OrdinalIgnoreCase) >= 0 ? "Direct3D 11"
                    : Renderer.IndexOf("Vulkan", StringComparison.OrdinalIgnoreCase) >= 0 ? "Vulkan" : "?") + ")"
                : "OpenGL ES " + PierwszeSlowo(Wersja.Replace("OpenGL ES ", "")) + " (EGL)";
            InfoKarty.Nazwa = KrotkaNazwa(Renderer);
            InfoKarty.Droga = Droga;
            InfoKarty.Programowa = System.Text.RegularExpressions.Regex.IsMatch(Renderer,
                "swiftshader|llvmpipe|softpipe|software|basic render", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            InfoKarty.CzasKarty = false;
            Dziennik.Pisz($"karta: {Renderer} | {dostawca} | {Wersja} | droga: {Droga}");
            return null;
        }

        static string PierwszeSlowo(string s) { var i = s.IndexOf(' '); return i < 0 ? s : s.Substring(0, i); }

        /// <summary>„ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)” → „NVIDIA GeForce RTX 3060”.</summary>
        public static string KrotkaNazwa(string r)
        {
            if (!r.StartsWith("ANGLE (", StringComparison.Ordinal)) return r;
            var srodek = r.Substring(7, r.Length - 7 - (r.EndsWith(")") ? 1 : 0));
            var czesci = srodek.Split(new[] { ", " }, StringSplitOptions.None);
            var n = czesci.Length >= 2 ? czesci[1] : srodek;
            var i = n.IndexOf(" (0x", StringComparison.Ordinal);
            if (i > 0) n = n.Substring(0, i);
            i = n.IndexOf(" Direct3D", StringComparison.Ordinal);
            if (i > 0) n = n.Substring(0, i);
            return n;
        }

        void Zwolnij()
        {
            if (dpy == IntPtr.Zero) return;
            egl.MakeCurrent(dpy, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
            if (ctx != IntPtr.Zero) { egl.DestroyContext(dpy, ctx); ctx = IntPtr.Zero; }
            if (pow != IntPtr.Zero) { egl.DestroySurface(dpy, pow); pow = IntPtr.Zero; }
        }

        public void Dispose()
        {
            if (Kontekst != null)
            {
                Kontekst.AbandonContext(false);
                Kontekst.Dispose();
                Kontekst = null!;
            }
            interfejs?.Dispose(); interfejs = null;
            if (egl != null) Zwolnij();
        }

        // ───────────────────────────── EGL ─────────────────────────────
        // Biblioteki przez DllImport — Unity szuka ich wśród wtyczek (Assets/Plugins), więc ANGLE z projektu znajdzie się
        // tak samo w edytorze i w zbudowanej grze. Na Linuksie — systemowy libEGL.so.1.

        abstract class Egl
        {
            public abstract IntPtr GetDisplay(IntPtr id);
            public abstract bool Initialize(IntPtr dpy, out int ma, out int mi);
            public abstract bool BindAPI(uint api);
            public abstract bool ChooseConfig(IntPtr dpy, int[] atr, IntPtr[] konf, int rozmiar, out int ile);
            public abstract IntPtr CreatePbufferSurface(IntPtr dpy, IntPtr konf, int[] atr);
            public abstract IntPtr CreateContext(IntPtr dpy, IntPtr konf, IntPtr wspolny, int[] atr);
            public abstract bool MakeCurrent(IntPtr dpy, IntPtr rys, IntPtr czyt, IntPtr ctx);
            public abstract IntPtr GetProcAddress(string nazwa);
            public abstract int GetError();
            public abstract bool DestroySurface(IntPtr dpy, IntPtr pow);
            public abstract bool DestroyContext(IntPtr dpy, IntPtr ctx);
        }

        sealed class EglWindows : Egl
        {
            const string B = "av_libglesv2";
            [DllImport(B)] static extern IntPtr eglGetDisplay(IntPtr id);
            [DllImport(B)] static extern uint eglInitialize(IntPtr dpy, out int ma, out int mi);
            [DllImport(B)] static extern uint eglBindAPI(uint api);
            [DllImport(B)] static extern uint eglChooseConfig(IntPtr dpy, int[] atr, [Out] IntPtr[] konf, int rozmiar, out int ile);
            [DllImport(B)] static extern IntPtr eglCreatePbufferSurface(IntPtr dpy, IntPtr konf, int[] atr);
            [DllImport(B)] static extern IntPtr eglCreateContext(IntPtr dpy, IntPtr konf, IntPtr wspolny, int[] atr);
            [DllImport(B)] static extern uint eglMakeCurrent(IntPtr dpy, IntPtr rys, IntPtr czyt, IntPtr ctx);
            [DllImport(B, CharSet = CharSet.Ansi)] static extern IntPtr eglGetProcAddress(string nazwa);
            [DllImport(B)] static extern int eglGetError();
            [DllImport(B)] static extern uint eglDestroySurface(IntPtr dpy, IntPtr pow);
            [DllImport(B)] static extern uint eglDestroyContext(IntPtr dpy, IntPtr ctx);
            public override IntPtr GetDisplay(IntPtr id) => eglGetDisplay(id);
            public override bool Initialize(IntPtr dpy, out int ma, out int mi) => eglInitialize(dpy, out ma, out mi) != 0;
            public override bool BindAPI(uint api) => eglBindAPI(api) != 0;
            public override bool ChooseConfig(IntPtr dpy, int[] atr, IntPtr[] konf, int rozmiar, out int ile) => eglChooseConfig(dpy, atr, konf, rozmiar, out ile) != 0;
            public override IntPtr CreatePbufferSurface(IntPtr dpy, IntPtr konf, int[] atr) => eglCreatePbufferSurface(dpy, konf, atr);
            public override IntPtr CreateContext(IntPtr dpy, IntPtr konf, IntPtr wspolny, int[] atr) => eglCreateContext(dpy, konf, wspolny, atr);
            public override bool MakeCurrent(IntPtr dpy, IntPtr rys, IntPtr czyt, IntPtr ctx) => eglMakeCurrent(dpy, rys, czyt, ctx) != 0;
            public override IntPtr GetProcAddress(string nazwa) => eglGetProcAddress(nazwa);
            public override int GetError() => eglGetError();
            public override bool DestroySurface(IntPtr dpy, IntPtr pow) => eglDestroySurface(dpy, pow) != 0;
            public override bool DestroyContext(IntPtr dpy, IntPtr ctx) => eglDestroyContext(dpy, ctx) != 0;
        }

        sealed class EglLinux : Egl
        {
            const string B = "libEGL.so.1";
            [DllImport(B)] static extern IntPtr eglGetDisplay(IntPtr id);
            [DllImport(B)] static extern uint eglInitialize(IntPtr dpy, out int ma, out int mi);
            [DllImport(B)] static extern uint eglBindAPI(uint api);
            [DllImport(B)] static extern uint eglChooseConfig(IntPtr dpy, int[] atr, [Out] IntPtr[] konf, int rozmiar, out int ile);
            [DllImport(B)] static extern IntPtr eglCreatePbufferSurface(IntPtr dpy, IntPtr konf, int[] atr);
            [DllImport(B)] static extern IntPtr eglCreateContext(IntPtr dpy, IntPtr konf, IntPtr wspolny, int[] atr);
            [DllImport(B)] static extern uint eglMakeCurrent(IntPtr dpy, IntPtr rys, IntPtr czyt, IntPtr ctx);
            [DllImport(B, CharSet = CharSet.Ansi)] static extern IntPtr eglGetProcAddress(string nazwa);
            [DllImport(B)] static extern int eglGetError();
            [DllImport(B)] static extern uint eglDestroySurface(IntPtr dpy, IntPtr pow);
            [DllImport(B)] static extern uint eglDestroyContext(IntPtr dpy, IntPtr ctx);
            public override IntPtr GetDisplay(IntPtr id) => eglGetDisplay(id);
            public override bool Initialize(IntPtr dpy, out int ma, out int mi) => eglInitialize(dpy, out ma, out mi) != 0;
            public override bool BindAPI(uint api) => eglBindAPI(api) != 0;
            public override bool ChooseConfig(IntPtr dpy, int[] atr, IntPtr[] konf, int rozmiar, out int ile) => eglChooseConfig(dpy, atr, konf, rozmiar, out ile) != 0;
            public override IntPtr CreatePbufferSurface(IntPtr dpy, IntPtr konf, int[] atr) => eglCreatePbufferSurface(dpy, konf, atr);
            public override IntPtr CreateContext(IntPtr dpy, IntPtr konf, IntPtr wspolny, int[] atr) => eglCreateContext(dpy, konf, wspolny, atr);
            public override bool MakeCurrent(IntPtr dpy, IntPtr rys, IntPtr czyt, IntPtr ctx) => eglMakeCurrent(dpy, rys, czyt, ctx) != 0;
            public override IntPtr GetProcAddress(string nazwa) => eglGetProcAddress(nazwa);
            public override int GetError() => eglGetError();
            public override bool DestroySurface(IntPtr dpy, IntPtr pow) => eglDestroySurface(dpy, pow) != 0;
            public override bool DestroyContext(IntPtr dpy, IntPtr ctx) => eglDestroyContext(dpy, ctx) != 0;
        }
    }
}
