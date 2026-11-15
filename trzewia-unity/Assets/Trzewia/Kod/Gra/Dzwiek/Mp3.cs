// Pliki dźwięku gry (dane/dzwieki/*.mp3, decyzja użytkownika 15.11) — dekodowanie NLayerem (czysty C#, MIT; działa też
// w Unity). Koder dokłada na początku i końcu pliku wypełnienie (LAME: opóźnienie kodera + 529 próbek dekodera);
// nagłówek Info/LAME mówi, ile — odcinamy je co do próbki, więc pętle łączą się bez szwu (sprawdzone z ffmpeg).
using System;
using System.IO;
using NLayer;

namespace Trzewia.Dzwieki
{
    /// <summary>Zdekodowany dźwięk: próbki stereo przeplatane (L, P), 16 bit, 48 kHz.</summary>
    public sealed class Dane
    {
        public readonly short[] probki;
        public readonly int ramek;
        public Dane(short[] probki) { this.probki = probki; ramek = probki.Length / 2; }
        public double sekundy => ramek / (double)Mp3.SR;
    }

    public static class Mp3
    {
        public const int SR = 48000;
        const int OPOZNIENIE_DEKODERA = 529;

        /// <summary>
        /// Ile próbek odciąć z początku i ile jest prawdziwego dźwięku — z nagłówka Info/Xing i LAME pierwszej ramki.
        /// Bez nagłówka: (1105, -1) — tyle odcina zwykły plik z LAME/ffmpeg, długość do końca.
        /// </summary>
        public static (int pomin, int dlugosc) Ramy(byte[] d)
        {
            try
            {
                int p = 0;
                if (d.Length > 10 && d[0] == 'I' && d[1] == 'D' && d[2] == '3')
                {
                    int rozmiar = (d[6] & 0x7f) << 21 | (d[7] & 0x7f) << 14 | (d[8] & 0x7f) << 7 | (d[9] & 0x7f);
                    p = 10 + rozmiar + ((d[5] & 0x10) != 0 ? 10 : 0);
                }
                while (p + 4 < d.Length && !(d[p] == 0xFF && (d[p + 1] & 0xE0) == 0xE0)) p++;
                bool mpeg1 = ((d[p + 1] >> 3) & 3) == 3, mono = ((d[p + 3] >> 6) & 3) == 3;
                int x = p + 4 + (mpeg1 ? (mono ? 17 : 32) : (mono ? 9 : 17));
                bool info = (d[x] == 'X' && d[x + 1] == 'i' && d[x + 2] == 'n' && d[x + 3] == 'g') || (d[x] == 'I' && d[x + 1] == 'n' && d[x + 2] == 'f' && d[x + 3] == 'o');
                if (!info) return (576 + OPOZNIENIE_DEKODERA, -1);
                int be(int o) => d[o] << 24 | d[o + 1] << 16 | d[o + 2] << 8 | d[o + 3];
                int flagi = be(x + 4), q = x + 8, ramek = -1;
                if ((flagi & 1) != 0) { ramek = be(q); q += 4; }
                if ((flagi & 2) != 0) q += 4;
                if ((flagi & 4) != 0) q += 100;
                if ((flagi & 8) != 0) q += 4;
                int opoz = d[q + 21] << 4 | d[q + 22] >> 4, wypelnienie = (d[q + 22] & 0x0F) << 8 | d[q + 23];
                int naRamke = mpeg1 ? 1152 : 576;
                return (opoz + OPOZNIENIE_DEKODERA, ramek > 0 ? ramek * naRamke - opoz - wypelnienie : -1);
            }
            catch (IndexOutOfRangeException) { return (576 + OPOZNIENIE_DEKODERA, -1); }
        }

        /// <summary>Cały plik do pamięci (dźwięki jednorazowe).</summary>
        public static Dane Dekoduj(byte[] mp3)
        {
            var (pomin, dlugosc) = Ramy(mp3);
            using var f = new MpegFile(new MemoryStream(mp3, false));
            int kan = f.Channels;
            var bufor = new float[4096 * kan];
            var wynik = new short[Math.Max(0, dlugosc > 0 ? dlugosc * 2 : 1 << 16)];
            int ile = 0, przeskok = pomin;
            int n;
            while ((n = f.ReadSamples(bufor, 0, bufor.Length)) > 0)
            {
                int ramek = n / kan;
                for (int i = 0; i < ramek; i++)
                {
                    if (przeskok > 0) { przeskok--; continue; }
                    if (dlugosc > 0 && ile >= dlugosc) break;
                    float l = bufor[i * kan], r = kan > 1 ? bufor[i * kan + 1] : l;
                    if (ile * 2 + 1 >= wynik.Length) Array.Resize(ref wynik, wynik.Length * 2 + 2);
                    wynik[ile * 2] = Krotka(l); wynik[ile * 2 + 1] = Krotka(r);
                    ile++;
                }
                if (dlugosc > 0 && ile >= dlugosc) break;
            }
            if (wynik.Length != ile * 2) Array.Resize(ref wynik, ile * 2);
            return new Dane(wynik);
        }

        static short Krotka(float x) => (short)Math.Max(-32768, Math.Min(32767, (int)Math.Round(x * 32767f)));
    }

    /// <summary>
    /// Pętla czytana na bieżąco z pliku MP3 (pętle są długie — w pamięci zajęłyby ponad 200 MB): po końcu prawdziwego
    /// dźwięku dekoder rusza od nowa i znów odcina wypełnienie, więc koniec przechodzi w początek co do próbki.
    /// </summary>
    public sealed class StrumienPetli : IDisposable
    {
        readonly byte[] mp3;
        readonly int pomin, dlugosc;
        MpegFile? plik;
        int kan, zostalo, pozycja;
        // jedna ramka MP3 stereo naraz — koszt dekodowania rozkłada się równo na bloki miksu
        float[] bufor = new float[1152 * 2];
        int wBuforze, odczytane;

        public StrumienPetli(byte[] mp3)
        {
            this.mp3 = mp3;
            (pomin, dlugosc) = Mp3.Ramy(mp3);
            Otworz();
        }

        /// <summary>Ile ramek ma pętla (−1 — nie wiadomo, do końca pliku).</summary>
        public int Dlugosc => dlugosc;
        /// <summary>Gdzie w pętli jest odtwarzanie (ramki od początku prawdziwego dźwięku).</summary>
        public int Pozycja => pozycja;

        void Otworz()
        {
            plik?.Dispose();
            plik = new MpegFile(new MemoryStream(mp3, false));
            kan = plik.Channels;
            zostalo = dlugosc;
            pozycja = 0;
            wBuforze = odczytane = 0;
            int przeskok = pomin;
            while (przeskok > 0)
            {
                if (!Dolej()) break;
                int ramek = (wBuforze - odczytane) / kan, ile = Math.Min(ramek, przeskok);
                odczytane += ile * kan; przeskok -= ile;
            }
        }

        bool Dolej()
        {
            if (odczytane < wBuforze) return true;
            wBuforze = plik!.ReadSamples(bufor, 0, bufor.Length);
            odczytane = 0;
            return wBuforze > 0;
        }

        /// <summary>Następne `ramek` ramek stereo do `l` i `r` (od indeksu 0).</summary>
        public void Czytaj(float[] l, float[] r, int ramek)
        {
            int i = 0, prob = 0;
            while (i < ramek)
            {
                if ((dlugosc > 0 && zostalo <= 0) || !Dolej())
                {
                    if (++prob > 2) { for (; i < ramek; i++) { l[i] = 0; r[i] = 0; } return; }
                    Otworz();
                    continue;
                }
                prob = 0;
                int dostepne = (wBuforze - odczytane) / kan;
                int ile = Math.Min(ramek - i, dostepne);
                if (dlugosc > 0) ile = Math.Min(ile, zostalo);
                for (int k = 0; k < ile; k++, i++)
                {
                    l[i] = bufor[odczytane]; r[i] = kan > 1 ? bufor[odczytane + 1] : bufor[odczytane];
                    odczytane += kan;
                }
                zostalo -= ile; pozycja += ile;
            }
        }

        public void Dispose() { plik?.Dispose(); plik = null; }
    }
}
