// Pliki gry na dysku: dane (grafika, dźwięki, filmy, kroje, nastawy) z folderu `dane/` (w Unity — StreamingAssets/dane)
// i rzeczy gracza (zapis, ustawienia, klawisze, osiągnięcia, atlas, dziennik) w `Dokumenty\My Games\Trzewia\`
// (Linux: ~/.local/share/Trzewia) — ten sam folder co Trzewia.exe, więc zapis przechodzi między wersjami.
// Odpowiednik Komputer/Sciezki.cs z Trzewia.exe, bez zależności od .NET nowszego niż Standard 2.1.
using System;
using System.IO;
using System.Runtime.InteropServices;
using Trzewia.Rdzen;

namespace Trzewia.Most
{
    public sealed class PlikiNaDysku : IPlikiGracza, IDaneGry
    {
        readonly string dane, gracz;

        public PlikiNaDysku(string folderDanych, string folderGracza)
        {
            dane = folderDanych;
            gracz = folderGracza;
        }

        public string Folder => gracz;
        public string FolderDanych => dane;

        /// <summary>
        /// `Dokumenty\My Games\Trzewia` (Windows sam przekierowuje Dokumenty do OneDrive, jeśli tak ustawiono); na Linuksie
        /// $XDG_DATA_HOME/Trzewia, zwykle ~/.local/share/Trzewia. Zmienna TRZEWIA_GRACZ podmienia folder (testy).
        /// </summary>
        public static string FolderGracza()
        {
            var wlasny = Environment.GetEnvironmentVariable("TRZEWIA_GRACZ");
            if (!string.IsNullOrEmpty(wlasny)) return wlasny!;
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                var xdg = Environment.GetEnvironmentVariable("XDG_DATA_HOME");
                if (string.IsNullOrEmpty(xdg)) xdg = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".local", "share");
                return Path.Combine(xdg!, "Trzewia");
            }
            var dokumenty = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            if (string.IsNullOrEmpty(dokumenty)) dokumenty = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            return Path.Combine(dokumenty, "My Games", "Trzewia");
        }

        public string? Czytaj(string nazwa)
        {
            try
            {
                var p = Path.Combine(gracz, nazwa);
                return File.Exists(p) ? File.ReadAllText(p) : null;
            }
            catch (Exception e) { Dziennik.Pisz($"nie czytam {nazwa}: {e.Message}"); return null; }
        }

        /// <summary>Zapis atomowy: najpierw do pliku tymczasowego, potem podmiana — zostaje stary plik albo nowy, nigdy połowa.</summary>
        public bool Zapisz(string nazwa, string tresc)
        {
            try
            {
                Directory.CreateDirectory(gracz);
                var p = Path.Combine(gracz, nazwa);
                var tmp = p + ".tmp";
                using (var f = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None))
                using (var w = new StreamWriter(f, new System.Text.UTF8Encoding(false)))
                {
                    w.Write(tresc);
                    w.Flush();
                    f.Flush(true);
                }
                if (!File.Exists(p)) File.Move(tmp, p);
                else
                {
                    try { File.Replace(tmp, p, null); }
                    catch (Exception) { File.Copy(tmp, p, true); File.Delete(tmp); }
                }
                return true;
            }
            catch (Exception e) { Dziennik.Pisz($"nie zapisuję {nazwa}: {e.Message}"); return false; }
        }

        /// <summary>Plik z folderu danych; ścieżka z ukośnikiem („czcionki/trzewia-tekst.ttf”).</summary>
        public Stream? Otworz(string sciezka)
        {
            var p = Path.Combine(dane, sciezka.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(p) ? File.OpenRead(p) : null;
        }
    }
}
