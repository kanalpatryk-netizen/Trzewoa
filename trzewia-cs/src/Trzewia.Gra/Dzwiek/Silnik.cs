// Silnik dźwięku gry C# (decyzja użytkownika 15.11: cały dźwięk z plików MP3, nic nie składane w locie). Odpowiada
// mikserowi z alpha-1/src/core/mikser.ts: szyna świata (rezonans skały i muzyka) — przytłumiana w pauzie filtrem
// dolnoprzepustowym i ściszana przy alarmach; szyna gestów (gesty i głosy) — zawsze wyraźna; na końcu ogranicznik.
// Pogłos jaskini, wzmocnienie ×1,6 i ogranicznik każdego dźwięku są już w plikach (nagrane torem gry TS).
// Czysty C#: gospodarz (Trzewia.exe — SDL3, w Unity — OnAudioFilterRead) woła tylko Mieszaj(), z własnego wątku.
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Trzewia.Rdzen;

namespace Trzewia.Dzwieki
{
    /// <summary>Szyna, do której trafia głos: świat (rezonans), muzyka — obie przez tłumik pauzy; gesty — obok.</summary>
    public enum Szyna { Rezonans, Muzyka, Gesty }

    /// <summary>Wartość zmieniana jak AudioParam.setTargetAtTime: dąży do celu ze stałą czasu, od zadanej chwili.</summary>
    public sealed class Param
    {
        public double v, cel;
        double k = 1;                 // współczynnik na próbkę
        readonly List<(double od, double cel, double tau)> plan = new List<(double, double, double)>();
        public Param(double v) { this.v = v; cel = v; }

        /// <summary>Od chwili `od` (s zegara silnika; ≤ teraz — od razu) dąż do `cel` ze stałą `tau` s.</summary>
        public void Ustaw(double cel, double tau, double od = 0)
        {
            plan.RemoveAll(e => e.od >= od);
            plan.Add((od, cel, tau));
            plan.Sort((a, b) => a.od.CompareTo(b.od));
        }

        public void Natychmiast(double wartosc) { plan.Clear(); v = cel = wartosc; k = 1; }

        /// <summary>Krok o jedną próbkę w chwili `t`.</summary>
        public double Krok(double t)
        {
            while (plan.Count > 0 && plan[0].od <= t)
            {
                var e = plan[0]; plan.RemoveAt(0);
                cel = e.cel;
                k = e.tau <= 0 ? 1 : 1 - Math.Exp(-1.0 / (Mp3.SR * e.tau));
            }
            v += (cel - v) * k;
            return v;
        }

        public bool Spokojny => plan.Count == 0 && Math.Abs(cel - v) < 1e-6;
    }

    /// <summary>Głos w mikserze: jednorazowy (dźwięk z pamięci) albo pętla (strumień).</summary>
    public abstract class Glos
    {
        public readonly Param glosnosc;
        public readonly Szyna szyna;
        double pL = 1, pP = 0, pPL = 0, pPP = 1;   // panorama: lewy z lewego/prawego, prawy z lewego/prawego
        internal double stopO = double.PositiveInfinity;
        internal bool koniec;

        protected Glos(Szyna szyna, double glosnosc, double pan)
        {
            this.szyna = szyna;
            this.glosnosc = new Param(glosnosc);
            // StereoPannerNode dla źródła stereo (Web Audio): przy pan ≤ 0 prawy kanał przelewa się do lewego, przy > 0 odwrotnie
            var x = Math.Max(-1, Math.Min(1, pan));
            if (x <= 0) { var a = (x + 1) * Math.PI / 2; pL = 1; pP = Math.Cos(a); pPL = 0; pPP = Math.Sin(a); }
            else { var a = x * Math.PI / 2; pL = Math.Cos(a); pP = 0; pPL = Math.Sin(a); pPP = 1; }
        }

        /// <summary>Zatrzymaj w chwili `t` (s zegara silnika).</summary>
        public void Zatrzymaj(double t) { stopO = t; }

        /// <summary>Następne `n` ramek źródła do l, r (od 0); false — źródło się skończyło. `t0` — chwila pierwszej ramki.</summary>
        internal abstract bool Zrodlo(float[] l, float[] r, int n, double t0, out int od);

        internal void Dodaj(int n, double t0, float[] doL, float[] doR, float[] tl, float[] tr)
        {
            if (koniec) return;
            if (!Zrodlo(tl, tr, n, t0, out var od)) koniec = true;
            for (int i = od; i < n; i++)
            {
                double t = t0 + i / (double)Mp3.SR;
                if (t >= stopO) { koniec = true; break; }
                double g = glosnosc.Krok(t);
                double a = tl[i], b = tr[i];
                doL[i] += (float)((a * pL + b * pP) * g);
                doR[i] += (float)((a * pPL + b * pPP) * g);
            }
        }
    }

    /// <summary>Dźwięk jednorazowy: zaczyna się w chwili `start` (albo gdy plik się zdekoduje — najwyżej 0,3 s później).</summary>
    public sealed class Jednorazowy : Glos
    {
        readonly Task<Dane?> dane;
        double start;
        int pozycja;
        public Jednorazowy(Task<Dane?> dane, Szyna szyna, double start, double glosnosc, double pan) : base(szyna, glosnosc, pan)
        {
            this.dane = dane; this.start = start;
        }

        internal override bool Zrodlo(float[] l, float[] r, int n, double t0, out int od)
        {
            od = n;
            if (!dane.IsCompleted)
            {
                if (t0 - start > 0.3) return false;          // za późno — nie gra wcale
                if (start < t0 + n / (double)Mp3.SR) start = t0 + n / (double)Mp3.SR;
                return true;
            }
            var d = dane.Result;
            if (d == null) return false;
            od = Math.Max(0, (int)Math.Ceiling((start - t0) * Mp3.SR));
            if (od >= n) return true;
            var p = d.probki;
            int i = od;
            for (; i < n && pozycja < d.ramek; i++, pozycja++)
            {
                l[i] = p[pozycja * 2] / 32768f; r[i] = p[pozycja * 2 + 1] / 32768f;
            }
            for (int k = i; k < n; k++) { l[k] = 0; r[k] = 0; }
            return pozycja < d.ramek;
        }
    }

    /// <summary>Pętla ze strumienia — gra od chwili `start`, aż ją wyciszyć (Wycisz) — wtedy zwalnia się sama.</summary>
    public sealed class Petla : Glos
    {
        readonly StrumienPetli strumien;
        readonly double start;
        bool wyciszana;
        /// <summary>Gdzie jest w pętli (s od początku) — oddech skały i bieżący akord liczą się z tego.</summary>
        public double Pozycja => strumien.Pozycja / (double)Mp3.SR;
        public double Dlugosc => strumien.Dlugosc / (double)Mp3.SR;
        public Petla(StrumienPetli strumien, Szyna szyna, double glosnosc, double start) : base(szyna, glosnosc, 0)
        {
            this.strumien = strumien; this.start = start;
        }

        /// <summary>Do zera ze stałą `tau` od chwili `od`; potem pętla się zwalnia. (Woła się pod zamkiem silnika.)</summary>
        public void Wycisz(double tau, double od = 0) { glosnosc.Ustaw(0, tau, od); wyciszana = true; }

        internal override bool Zrodlo(float[] l, float[] r, int n, double t0, out int od)
        {
            od = Math.Max(0, Math.Min(n, (int)Math.Ceiling((start - t0) * Mp3.SR)));
            if (od < n) strumien.Czytaj(l, r, n - od);
            // przesunięcie: strumień pisze od 0, a głos zaczyna się od `od`
            if (od > 0 && od < n) { Array.Copy(l, 0, l, od, n - od); Array.Copy(r, 0, r, od, n - od); }
            return !(wyciszana && glosnosc.Spokojny && glosnosc.v <= 1e-5);
        }
    }

    /// <summary>Pliki dźwięku: jednorazowe dekodowane w tle i trzymane w pamięci (do limitu), pętle — strumieniem.</summary>
    public static class Biblioteka
    {
        const long LIMIT = 160L * 1024 * 1024;
        static readonly object zamek = new object();
        static readonly Dictionary<string, (Task<Dane?> dane, long uzyte)> pamiec = new Dictionary<string, (Task<Dane?>, long)>();
        static long licznik;

        static byte[]? Plik(string plik) => Zasoby.Czytaj("dzwieki/" + plik);

        /// <summary>Dźwięk jednorazowy (np. "gesty/klik.mp3") — od razu z pamięci albo dekodowany w tle.</summary>
        public static Task<Dane?> Wez(string plik)
        {
            lock (zamek)
            {
                if (pamiec.TryGetValue(plik, out var e)) { pamiec[plik] = (e.dane, ++licznik); return e.dane; }
                var t = Task.Run(() =>
                {
                    try { var b = Plik(plik); return b == null ? null : Mp3.Dekoduj(b); }
                    catch (Exception ex) { Dziennik.Pisz($"dźwięk {plik}: {ex.Message}"); return null; }
                });
                pamiec[plik] = (t, ++licznik);
                Sprzataj();
                return t;
            }
        }

        /// <summary>Najdawniej używane wypadają, gdy razem zajmują ponad LIMIT.</summary>
        static void Sprzataj()
        {
            long razem = 0;
            foreach (var e in pamiec.Values) if (e.dane.IsCompleted && e.dane.Result != null) razem += e.dane.Result.probki.Length * 2L;
            if (razem <= LIMIT) return;
            var lista = new List<KeyValuePair<string, (Task<Dane?> dane, long uzyte)>>(pamiec);
            lista.Sort((a, b) => a.Value.uzyte.CompareTo(b.Value.uzyte));
            foreach (var e in lista)
            {
                if (razem <= LIMIT * 3 / 4) break;
                if (!e.Value.dane.IsCompleted || e.Value.dane.Result == null) continue;
                razem -= e.Value.dane.Result.probki.Length * 2L;
                pamiec.Remove(e.Key);
            }
        }

        /// <summary>Pętla do odtwarzania strumieniem (null — brak pliku).</summary>
        public static StrumienPetli? Petla(string plik)
        {
            try { var b = Plik(plik); return b == null ? null : new StrumienPetli(b); }
            catch (Exception ex) { Dziennik.Pisz($"pętla {plik}: {ex.Message}"); return null; }
        }

        /// <summary>Wczytaj z góry (w tle) — żeby pierwszy klik nie czekał na dekoder.</summary>
        public static void Przygotuj(IEnumerable<string> pliki) { foreach (var p in pliki) Wez(p); }
    }

    /// <summary>Mikser gry (core/mikser.ts) — jeden na całą grę.</summary>
    public sealed class Silnik
    {
        public static readonly Silnik Ten = new Silnik();

        readonly object zamek = new object();
        readonly List<Glos> glosy = new List<Glos>();
        readonly List<Glos> nowe = new List<Glos>();
        long probka;
        bool wstrzymany;

        /// <summary>Głośności szyn (głośność gracza, przełączniki muzyki i odgłosów — ustawia je logika gry).</summary>
        public readonly Param rezonans = new Param(0), muzyka = new Param(0), gesty = new Param(0);
        /// <summary>Pauza (mikser.zawies): tłumik świata (Hz) i jego przyciszenie.</summary>
        readonly Param tlumikHz = new Param(16000), zawieszenie = new Param(1);
        /// <summary>Ostrzeżenie przygasza świat na chwilę (mikser.przycisz).</summary>
        readonly Param przyciszenie = new Param(1);
        double zawies;

        /// <summary>Zegar dźwięku (s) — jak AudioContext.currentTime.</summary>
        public double czas => System.Threading.Interlocked.Read(ref probka) / (double)Mp3.SR;
        public bool wlaczony;

        public Jednorazowy Zagraj(string plik, Szyna szyna, double kiedy = 0, double glosnosc = 1, double pan = 0)
        {
            var g = new Jednorazowy(Biblioteka.Wez(plik), szyna, Math.Max(kiedy, czas), glosnosc, pan);
            lock (zamek) nowe.Add(g);
            return g;
        }

        /// <summary>Nowa pętla: od chwili `kiedy` (0 — od razu), cicha, a potem dąży do `cel` ze stałą `tau`.</summary>
        public Petla? Petla(string plik, Szyna szyna, double cel, double tau, double kiedy = 0)
        {
            var s = Biblioteka.Petla(plik);
            if (s == null) return null;
            lock (zamek)
            {
                var od = Math.Max(kiedy, czas);
                var p = new Petla(s, szyna, 0, od);
                p.glosnosc.Ustaw(cel, tau, od);
                nowe.Add(p);
                return p;
            }
        }

        /// <summary>Zmiana parametru z wątku gry — pod zamkiem miksera.</summary>
        public void Zmien(Action a) { lock (zamek) a(); }

        /// <summary>0 — świat płynie; 1 — pauza: góra jak zza skały; pomiędzy — otwarta karta albo atlas.</summary>
        public void Zawies(double ile)
        {
            lock (zamek)
            {
                if (ile == zawies) return;
                zawies = ile;
                var hz = 16000 * Math.Pow(Nastawy.NastawyDzwiek.MIKSER.pauzaFiltr / 16000, Math.Max(0, Math.Min(1, ile)));
                tlumikHz.Ustaw(hz, ile > 0 ? 0.3 : 0.18);
                zawieszenie.Ustaw(1 - ile * Nastawy.NastawyDzwiek.MIKSER.pauzaCiszej, 0.4);
            }
        }

        /// <summary>Ostrzeżenie przygasza świat i muzykę na `sekundy` (do `doPoziomu`), potem wraca.</summary>
        public void Przycisz(double sekundy, double doPoziomu)
        {
            lock (zamek)
            {
                var t = czas;
                przyciszenie.Ustaw(doPoziomu, 0.06, t);
                przyciszenie.Ustaw(1, 0.9, t + sekundy);
            }
        }

        /// <summary>Okno zminimalizowane — dźwięk staje (mikser.usnij), potem rusza (wznow).</summary>
        public void Wstrzymaj(bool w) { lock (zamek) wstrzymany = w; }

        // bufory miksu
        float[] sL = new float[0], sR = new float[0], gL = new float[0], gR = new float[0], tL = new float[0], tR = new float[0], bL = new float[0], bR = new float[0];
        // tłumik (dolnoprzepustowy, Web Audio: Q w dB) — stan
        double x1L, x2L, y1L, y2L, x1R, x2R, y1R, y2R;
        double ogranicznik = 1;

        /// <summary>Miksuje `ramek` ramek stereo (przeplatane L, P) do `wyj`. Woła gospodarz ze swojego wątku.</summary>
        public void Mieszaj(float[] wyj, int ramek)
        {
            lock (zamek)
            {
                if (wstrzymany || !wlaczony) { Array.Clear(wyj, 0, ramek * 2); if (!wstrzymany && wlaczony) probka += ramek; return; }
                if (sL.Length < ramek)
                {
                    sL = new float[ramek]; sR = new float[ramek]; gL = new float[ramek]; gR = new float[ramek];
                    tL = new float[ramek]; tR = new float[ramek]; bL = new float[ramek]; bR = new float[ramek];
                }
                Array.Clear(sL, 0, ramek); Array.Clear(sR, 0, ramek); Array.Clear(gL, 0, ramek); Array.Clear(gR, 0, ramek);
                glosy.AddRange(nowe); nowe.Clear();
                double t0 = probka / (double)Mp3.SR;
                // głosy świata i muzyki mnożą się przez głośność swojej szyny — tu przez osobne bufory
                for (int k = 0; k < 2; k++)
                {
                    var szyna = k == 0 ? Szyna.Rezonans : Szyna.Muzyka;
                    Array.Clear(bL, 0, ramek); Array.Clear(bR, 0, ramek);
                    foreach (var g in glosy) if (g.szyna == szyna) g.Dodaj(ramek, t0, bL, bR, tL, tR);
                    var p = szyna == Szyna.Rezonans ? rezonans : muzyka;
                    for (int i = 0; i < ramek; i++) { var v = p.Krok(t0 + i / (double)Mp3.SR); sL[i] += (float)(bL[i] * v); sR[i] += (float)(bR[i] * v); }
                }
                foreach (var g in glosy) if (g.szyna == Szyna.Gesty) g.Dodaj(ramek, t0, gL, gR, tL, tR);
                glosy.RemoveAll(g => g.koniec);
                double hz = tlumikHz.v, q = Math.Pow(10, 0.6 / 20);
                double b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
                for (int i = 0; i < ramek; i++)
                {
                    double t = t0 + i / (double)Mp3.SR;
                    // współczynniki tłumika co 64 próbki (zmienia się powoli)
                    if ((i & 63) == 0)
                    {
                        hz = tlumikHz.v;
                        double w0 = 2 * Math.PI * Math.Min(hz, Mp3.SR * 0.45) / Mp3.SR, alfa = Math.Sin(w0) / (2 * q), c = Math.Cos(w0), a0 = 1 + alfa;
                        b0 = (1 - c) / 2 / a0; b1 = (1 - c) / a0; b2 = b0; a1 = -2 * c / a0; a2 = (1 - alfa) / a0;
                    }
                    tlumikHz.Krok(t);
                    double sw = zawieszenie.Krok(t) * przyciszenie.Krok(t);
                    double xl = sL[i], xr = sR[i];
                    double yl = b0 * xl + b1 * x1L + b2 * x2L - a1 * y1L - a2 * y2L; x2L = x1L; x1L = xl; y2L = y1L; y1L = yl;
                    double yr = b0 * xr + b1 * x1R + b2 * x2R - a1 * y1R - a2 * y2R; x2R = x1R; x1R = xr; y2R = y1R; y1R = yr;
                    double gest = gesty.Krok(t);
                    double l = yl * sw + gL[i] * gest, r = yr * sw + gR[i] * gest;
                    // ogranicznik szczytów: każdy plik ma już swój — ten pilnuje tylko sumy (atak natychmiast, puszczanie 0,25 s)
                    double szczyt = Math.Max(Math.Abs(l), Math.Abs(r));
                    double cel = szczyt > 0.95 ? 0.95 / szczyt : 1;
                    if (cel < ogranicznik) ogranicznik = cel;
                    else ogranicznik += (cel - ogranicznik) * (1 - Math.Exp(-1.0 / (Mp3.SR * 0.25)));
                    wyj[i * 2] = (float)(l * ogranicznik); wyj[i * 2 + 1] = (float)(r * ogranicznik);
                }
                probka += ramek;
            }
        }
    }
}
