// Wyjście dźwięku Trzewia.exe: SDL3 (strumień do domyślnego urządzenia, 48 kHz, stereo, float) karmiony w osobnym
// wątku mikserem gry (Trzewia.Gra/Dzwiek/Silnik.cs) — kilkadziesiąt milisekund do przodu, więc długa klatka
// (np. etap ładowania) nie przerywa dźwięku. Bez urządzenia dźwięku gra po prostu milczy.
using System.Threading;
using SDL;
using Trzewia.Dzwieki;
using Trzewia.Rdzen;
using static SDL.SDL3;

namespace Trzewia.Okno;

public sealed unsafe class WyjscieDzwieku : IDisposable
{
    const int RAMEK = 512;
    /// <summary>Ile dźwięku trzymać w kolejce urządzenia (60 ms).</summary>
    const int KOLEJKA = 2880 * 8;
    SDL_AudioStream* strumien;
    Thread? watek;
    volatile bool dziala;
    /// <summary>Najdłuższy czas miksowania jednego bloku (ms) — do dziennika przy zamknięciu.</summary>
    double najdluzszyMiks;

    public static WyjscieDzwieku? Otworz()
    {
        if (!SDL_InitSubSystem(SDL_InitFlags.SDL_INIT_AUDIO)) { Dziennik.Pisz("dźwięk: SDL_InitSubSystem — " + SDL_GetError()); return null; }
        var spec = new SDL_AudioSpec { format = SDL_AUDIO_F32, channels = 2, freq = Mp3.SR };
        var s = SDL_OpenAudioDeviceStream(SDL_AUDIO_DEVICE_DEFAULT_PLAYBACK, &spec, null, IntPtr.Zero);
        if (s == null) { Dziennik.Pisz("dźwięk: brak urządzenia — " + SDL_GetError()); return null; }
        SDL_ResumeAudioStreamDevice(s);
        var w = new WyjscieDzwieku { strumien = s, dziala = true };
        Silnik.Ten.wlaczony = true;
        w.watek = new Thread(w.Petla) { IsBackground = true, Name = "dźwięk", Priority = ThreadPriority.AboveNormal };
        w.watek.Start();
        Dziennik.Pisz($"dźwięk: {Mp3.SR} Hz, stereo, urządzenie domyślne");
        return w;
    }

    void Petla()
    {
        var bufor = new float[RAMEK * 2];
        // rozgrzewka: pierwsze dekodowanie (kompilacja w locie) trwa kilkadziesiąt ms — niech nie wypadnie w środku dźwięku
        try
        {
            using var p = Biblioteka.Petla("gesty/ton-pauzy-petla.mp3");
            var l = new float[RAMEK]; var r = new float[RAMEK];
            p?.Czytaj(l, r, RAMEK);
            Silnik.Ten.Mieszaj(bufor, RAMEK);
        }
        catch (Exception e) { Dziennik.Pisz("dźwięk: rozgrzewka — " + e.Message); }
        var zegar = System.Diagnostics.Stopwatch.StartNew();
        while (dziala)
        {
            try
            {
                while (dziala && SDL_GetAudioStreamQueued(strumien) < KOLEJKA)
                {
                    var t0 = zegar.Elapsed.TotalMilliseconds;
                    Silnik.Ten.Mieszaj(bufor, RAMEK);
                    najdluzszyMiks = Math.Max(najdluzszyMiks, zegar.Elapsed.TotalMilliseconds - t0);
                    fixed (float* p = bufor) SDL_PutAudioStreamData(strumien, (IntPtr)p, RAMEK * 2 * sizeof(float));
                }
            }
            catch (Exception e) { Dziennik.Pisz("dźwięk: " + e); }
            Thread.Sleep(4);
        }
    }

    public void Dispose()
    {
        dziala = false;
        watek?.Join(500);
        Silnik.Ten.wlaczony = false;
        if (strumien != null) { SDL_DestroyAudioStream(strumien); strumien = null; }
        Dziennik.Pisz($"dźwięk: najdłuższy miks bloku {RAMEK} ramek ({RAMEK * 1000.0 / Mp3.SR:F1} ms dźwięku) — {najdluzszyMiks:F2} ms");
    }
}
