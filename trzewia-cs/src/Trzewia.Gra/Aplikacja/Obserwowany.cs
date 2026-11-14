// Port: alpha-1/src/app/obserwowany.ts — gra obserwowana (okno w obserwatorium: jedno okno, jeden bot). W TS włącza ją
// `window.__TRZEWIA_BOT` albo `?bot` w adresie, a obserwatorium (obserwatorium.html) steruje oknem wiadomościami
// postMessage. Obserwatorium to strona przeglądarki — w C# go nie ma, więc tu zostaje tylko to, czego używa ekran gry:
// stan BOT (wyłączony, chyba że gospodarz włączy go przy starcie, np. Trzewia.exe --bot), BOT_GRA i ziarno partii.
// wyslijStan nie ma dokąd wysyłać — pusty.
using System;
using Trzewia.Symulacja;

namespace Trzewia.Aplikacja
{
    public sealed class UstawieniaBota
    {
        public bool wlaczony;
        public double partia;
        /// <summary>Numer okna (1–4) — wraca w każdej wiadomości.</summary>
        public double okno = 1;
        public string styl = "rozsadny";
        /// <summary>Mnożnik czasu (1 = zwykły).</summary>
        public double tempo = 1;
        public bool pauza;
        /// <summary>Ziarno następnej partii; brak — losowe.</summary>
        public double? ziarno;
        /// <summary>Po końcu partii od razu następna.</summary>
        public bool autoRestart = true;
        public bool dzwiek;
    }

    public static class Obserwowany
    {
        public static readonly UstawieniaBota BOT = new UstawieniaBota();
        static readonly Random los = new Random();

        /// <summary>Ekran gry podpina tu swoje ręce — obserwatorium woła je wiadomościami.</summary>
        public static Action<double?> nowaGra = _ => { };

        /// <summary>Ziarno kolejnej partii: ustawione albo losowe.</summary>
        public static double ziarnoPartii() => BOT.ziarno ?? Math.Floor(los.NextDouble() * 1e9);

        /// <summary>Wywołać raz, na starcie gry: gra bez przerw i bez zapisów gracza (jak w oknie obserwatorium).</summary>
        public static void przygotujObserwowana()
        {
            if (!BOT.wlaczony) return;
            var u = Rdzen.SettingsStore.ustawienia;
            u.autoPauza = "wyłączona";
            u.tablice = "tylko w atlasie";
            u.trybDeweloperski = false;
            u.samouczekZrobiony = true;
            u.autozapis = false;
            u.pelnyEkran = false;
        }

        /// <summary>Stan okna dla obserwatorium — w C# nie ma obserwatorium, więc nic.</summary>
        public static void wyslijStan(Sim sim, double ziarno, double koniecOd) { }
    }
}
