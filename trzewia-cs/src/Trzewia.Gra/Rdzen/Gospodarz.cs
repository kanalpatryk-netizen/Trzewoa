using System;
using System.Collections.Generic;
using System.IO;

namespace Trzewia.Rdzen
{
    /// <summary>Pliki gracza (zapis, ustawienia, klawisze, osiągnięcia, atlas): w Trzewia.exe — Dokumenty\My Games\Trzewia.</summary>
    public interface IPlikiGracza
    {
        string? Czytaj(string nazwa);
        /// <summary>Zapis atomowy — po przerwie zostaje stary plik albo nowy, nigdy przerwany w połowie.</summary>
        bool Zapisz(string nazwa, string tresc);
        /// <summary>Folder na dziennik i zrzuty (może być pusty, gdy gospodarz nie ma plików).</summary>
        string Folder { get; }
    }

    /// <summary>Dane gry (grafika, dźwięki, filmy, kroje, nastawy): w Trzewia.exe — folder dane/ obok programu.</summary>
    public interface IDaneGry
    {
        Stream? Otworz(string sciezka);
    }

    /// <summary>
    /// To, co gra dostaje od gospodarza — programu, który ją uruchamia. Na komputerze gospodarzem jest Trzewia.exe
    /// (SDL3, Skia), a po przenosinach do Unity albo Godota — skrypt silnika, który ustawia te same pola
    /// (np. Application.persistentDataPath / user:// na pliki gracza, StreamingAssets / res:// na dane).
    /// Bez gospodarza (testy) pliki gracza idą do pamięci, a danych nie ma.
    /// </summary>
    public static class Gospodarz
    {
        public static IPlikiGracza Pliki = new PlikiWPamieci();
        public static IDaneGry Dane = new BezDanych();

        sealed class PlikiWPamieci : IPlikiGracza
        {
            readonly Dictionary<string, string> pliki = new Dictionary<string, string>();
            public string? Czytaj(string nazwa) => pliki.TryGetValue(nazwa, out var t) ? t : null;
            public bool Zapisz(string nazwa, string tresc) { pliki[nazwa] = tresc; return true; }
            public string Folder => "";
        }

        sealed class BezDanych : IDaneGry
        {
            public Stream? Otworz(string sciezka) => null;
        }
    }

    /// <summary>Dostęp do danych gry; ścieżki z ukośnikiem, względem dane/ (np. „czcionki/trzewia-tekst.ttf”).</summary>
    public static class Zasoby
    {
        public static Stream? Otworz(string sciezka) => Gospodarz.Dane.Otworz(sciezka);

        public static bool Istnieje(string sciezka)
        {
            using var s = Otworz(sciezka);
            return s != null;
        }

        public static byte[]? Czytaj(string sciezka)
        {
            using var s = Otworz(sciezka);
            if (s == null) return null;
            using var m = new MemoryStream();
            s.CopyTo(m);
            return m.ToArray();
        }
    }

    /// <summary>Karta graficzna — opis od gospodarza dla licznika F3 i dziennika.</summary>
    public static class InfoKarty
    {
        /// <summary>Krótka nazwa karty (np. „NVIDIA GeForce RTX 3060”).</summary>
        public static string Nazwa = "brak karty";
        /// <summary>Droga do karty: „ANGLE (Direct3D 11)”, „OpenGL 4.5”…</summary>
        public static string Droga = "procesor";
        /// <summary>Karta programowa (SwiftShader, llvmpipe, Microsoft Basic Render) — rysuje procesor.</summary>
        public static bool Programowa;
        /// <summary>Karta mierzy swój czas (licznik F3 pokazuje „karta graficzna N ms”).</summary>
        public static bool CzasKarty;
    }

    /// <summary>
    /// Przełączniki trybu (w Trzewia.exe — z wiersza poleceń, patrz Program.cs). Gra je tylko czyta.
    /// </summary>
    public static class Tryb
    {
        /// <summary>Tryb deweloperski (w TS: `npm run dev`): okienko dewelopera, przyspieszanie czasu, dziennik na konsoli.</summary>
        public static bool Dev;
        /// <summary>Wpisy dziennika także na konsolę.</summary>
        public static bool NaKonsole;
    }

    /// <summary>
    /// Dziennik programu: karta graficzna, ostrzeżenia, błędy — w folderze gracza (dziennik.txt, poprzedni jako
    /// dziennik-poprzedni.txt), żeby gracz mógł go przysłać, gdy coś nie działa.
    /// </summary>
    public static class Dziennik
    {
        static readonly object Zamek = new object();
        static StreamWriter? plik;
        static readonly System.Diagnostics.Stopwatch Zegar = System.Diagnostics.Stopwatch.StartNew();

        public static void Otworz(string folder, string naglowek)
        {
            if (string.IsNullOrEmpty(folder)) return;
            try
            {
                Directory.CreateDirectory(folder);
                var p = Path.Combine(folder, "dziennik.txt");
                if (File.Exists(p)) File.Copy(p, Path.Combine(folder, "dziennik-poprzedni.txt"), true);
                plik = new StreamWriter(p, false, new System.Text.UTF8Encoding(false)) { AutoFlush = true };
                plik.WriteLine(naglowek);
            }
            catch { plik = null; }
        }

        public static void Pisz(string tekst)
        {
            var linia = $"[{Zegar.Elapsed.TotalSeconds,8:0.000}] {tekst}";
            lock (Zamek)
            {
                try { plik?.WriteLine(linia); } catch { /* dziennik nie może zatrzymać gry */ }
            }
            if (Tryb.Dev || Tryb.NaKonsole) Console.Error.WriteLine(linia);
        }

        public static void Zamknij()
        {
            lock (Zamek) { plik?.Dispose(); plik = null; }
        }
    }
}
