// Mikser gry (Trzewia.Gra/Dzwiek/Silnik.cs: 48 kHz, stereo) do bufora silnika — w Unity z OnAudioFilterRead (wątek
// dźwięku silnika). Gdy silnik gra w innej częstotliwości albo w innej liczbie kanałów, tu jest przejście: interpolacja
// liniowa i lewy/prawy na pierwsze dwa kanały (mono — średnia). Odpowiednik Okno/WyjscieDzwieku.cs z Trzewia.exe.
using System;
using Trzewia.Dzwieki;
using Trzewia.Rdzen;

namespace Trzewia.Most
{
    public sealed class WyjscieDzwieku
    {
        const int BLOK = 256;
        readonly int czestotliwosc;
        readonly double krok;
        float[] bufor = new float[BLOK * 2];
        // przejście częstotliwości: dwie ramki źródła i pozycja między nimi
        readonly float[] blok = new float[BLOK * 2];
        int wBloku = BLOK;
        float poprzL, poprzP, biezL, biezP;
        double pozycja;

        public WyjscieDzwieku(int czestotliwoscSilnika)
        {
            czestotliwosc = czestotliwoscSilnika;
            krok = Mp3.SR / (double)Math.Max(1, czestotliwoscSilnika);
            Silnik.Ten.wlaczony = true;
            Dziennik.Pisz($"dźwięk: silnik {czestotliwoscSilnika} Hz, gra {Mp3.SR} Hz{(czestotliwoscSilnika == Mp3.SR ? "" : " (przeliczane)")}");
        }

        /// <summary>Rozgrzewka (pierwsze dekodowanie kompiluje się w locie) — zawołać raz poza wątkiem dźwięku.</summary>
        public static void Rozgrzej()
        {
            try
            {
                using var p = Biblioteka.Petla("gesty/ton-pauzy-petla.mp3");
                var l = new float[512]; var r = new float[512];
                p?.Czytaj(l, r, 512);
            }
            catch (Exception e) { Dziennik.Pisz("dźwięk: rozgrzewka — " + e.Message); }
        }

        /// <summary>Dodaje dźwięk gry do przeplatanego bufora silnika (<paramref name="kanaly"/> kanałów).</summary>
        public void Mieszaj(float[] dane, int kanaly)
        {
            if (kanaly < 1) return;
            int ramek = dane.Length / kanaly;
            if (czestotliwosc == Mp3.SR)
            {
                if (bufor.Length < ramek * 2) bufor = new float[ramek * 2];
                Silnik.Ten.Mieszaj(bufor, ramek);
                for (int i = 0; i < ramek; i++) Dodaj(dane, i * kanaly, kanaly, bufor[i * 2], bufor[i * 2 + 1]);
                return;
            }
            for (int i = 0; i < ramek; i++)
            {
                pozycja += krok;
                while (pozycja >= 1)
                {
                    if (wBloku >= BLOK) { Silnik.Ten.Mieszaj(blok, BLOK); wBloku = 0; }
                    poprzL = biezL; poprzP = biezP;
                    biezL = blok[wBloku * 2]; biezP = blok[wBloku * 2 + 1];
                    wBloku++;
                    pozycja -= 1;
                }
                float u = (float)pozycja;
                Dodaj(dane, i * kanaly, kanaly, poprzL + (biezL - poprzL) * u, poprzP + (biezP - poprzP) * u);
            }
        }

        static void Dodaj(float[] dane, int o, int kanaly, float l, float p)
        {
            if (kanaly == 1) { dane[o] += (l + p) * 0.5f; return; }
            dane[o] += l;
            dane[o + 1] += p;
        }

        public void Zamknij() => Silnik.Ten.wlaczony = false;
    }
}
