// Wygenerowane z alpha-1/src/nastawy/boss.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/boss.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/boss.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyBoss
    {
        /// <summary>Którego bossa przynosi ostatnia fala. Alpha, etap 5: demon, który spał w Wielkim Pomniku (nastawy/pomnik.ts: DEMON).</summary>
        // w TS: 'demon' as IdBossa
        public static string AKTYWNY_BOSS = "demon";

        /// <summary>
        /// Śniący Kamień: wielki strażnik wynurza się ze ściany przedsionka. Powolny, bardzo wytrzymały,
        /// ranić go mogą tylko rycerze. Co jakiś czas uderza w ziemię i zasypuje kawałek drogi wiernych
        /// (robotnicy muszą ją odkopać pod atakiem). Gdy pod rdzeniem modli się dość pobożnych, słabnie
        /// (bierze więcej ran); gdy modlitwa cichnie — zrasta się.
        /// </summary>
        public static Typ_SNIACY_KAMIEN SNIACY_KAMIEN = new Typ_SNIACY_KAMIEN
        {
            nazwa = "Śniący Kamień",
            hp = 500,
            sila = 10,
            ciosCo = 160,
            zasieg = 2.2,
            szybkosc = 0.014,
            rozmiar = 2.6,
            tylkoRycerze = true,
            zasypCo = 2400,
            zasypKafli = 5,
            zasypZasieg = 40,
            modlitwaWiernych = 2,
            modlitwaRany = 1.6,
            zrastanie = 0.03,
            ksiegaZasieg = 9,
            ksiegaCo = 150,
            ksiegaRana = 2,
            ksiegaCofa = 6,
            ksiegaWidzi = 60,
        };

        /// <summary>
        /// BOSS (Remake v1, etap 3) — kogo przynosi ostatnia fala Strażników Snu.
        ///
        /// Żeby zmienić bossa: dopisz nowe nastawy tutaj, jego zachowanie w src/sim/boss.ts
        /// (obiekt z `pojaw`, `tik`, `przyjmij`), wpisz go do rejestru BOSSOWIE i przestaw `AKTYWNY_BOSS`.
        /// Reszta gry (fale, pasek życia, karta, rysunek) pyta tylko o aktywnego bossa.
        /// </summary>
        public static readonly string[] IdBossa = { "sniacyKamien", "demon" };
    }

    /// <summary>
    /// Śniący Kamień: wielki strażnik wynurza się ze ściany przedsionka. Powolny, bardzo wytrzymały,
    /// ranić go mogą tylko rycerze. Co jakiś czas uderza w ziemię i zasypuje kawałek drogi wiernych
    /// (robotnicy muszą ją odkopać pod atakiem). Gdy pod rdzeniem modli się dość pobożnych, słabnie
    /// (bierze więcej ran); gdy modlitwa cichnie — zrasta się.
    /// </summary>
    public sealed partial class Typ_SNIACY_KAMIEN
    {
        public string nazwa;
        public double hp;
        /// <summary>cios i jego rytm (tiki), zasięg ciosu (kafle)</summary>
        public double sila;
        public double ciosCo;
        public double zasieg;
        /// <summary>prędkość (kafle na tik)</summary>
        public double szybkosc;
        /// <summary>wielkość na mapie (× zwykła postać)</summary>
        public double rozmiar;
        /// <summary>rany zadają mu tylko rycerze</summary>
        public bool tylkoRycerze;
        /// <summary>co tyle tików zasypuje kawałek drogi wiernych: tyle kafli, najwyżej tak daleko od rdzenia</summary>
        public double zasypCo;
        public double zasypKafli;
        public double zasypZasieg;
        /// <summary>tylu wiernych modlących się pod rdzeniem osłabia go: rany × `modlitwaRany` (Alpha: obaj pobożni)</summary>
        public double modlitwaWiernych;
        public double modlitwaRany;
        /// <summary>bez tej modlitwy zrasta się o tyle życia na tik</summary>
        public double zrastanie;
        /// <summary>
        /// Ostatnia deska: gdy nie ma już ani rycerza, ani robotników w hełmach, rani go też pobożny —
        /// unosi przed siebie księgę i razi z dystansu `ksiegaZasieg` kafli, co `ksiegaCo` tików za
        /// `ksiegaRana`; gdy boss podejdzie bliżej niż `ksiegaCofa`, pobożny się cofa.
        /// </summary>
        public double ksiegaZasieg;
        public double ksiegaCo;
        public double ksiegaRana;
        public double ksiegaCofa;
        /// <summary>z jak daleka (kafle) pobożni ruszają na Strażników z księgą</summary>
        public double ksiegaWidzi;
    }
}
