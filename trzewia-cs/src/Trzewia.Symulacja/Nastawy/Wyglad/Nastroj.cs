// Wygenerowane z alpha-1/src/nastawy/wyglad/nastroj.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-nastroj.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/nastroj.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladNastroj
    {
        /// <summary>
        /// NASTRÓJ INTERFEJSU — drobne, ciche animacje ściany krypty (src/render/nastroj.ts).
        /// Wszystko gaśnie przy „ogranicz ruch” i przy wyłączonym oddechu świata.
        /// </summary>
        public static Typ_NASTROJ NASTROJ = new Typ_NASTROJ
        {
            pylIle = 34,
            pylTempo = new double[] { 0.006, 0.018 },
            pylKrycie = new double[] { 0.05, 0.38 },
            napisOkres = 8000,
            napisowNaraz = 2,
            napisRozmiar = 5.5,
            napisKrycie = 0.26,
            podswietlenieMs = 140,
            poswiataKrazka = 0.26,
            blyskKrazka = 0.6,
            ikonaCien = 0.42,
            ikonaSzarosc = 0.4,
            liczbaZar = 700,
            okoPodaza = 0.38,
        };
    }

    /// <summary>
    /// NASTRÓJ INTERFEJSU — drobne, ciche animacje ściany krypty (src/render/nastroj.ts).
    /// Wszystko gaśnie przy „ogranicz ruch” i przy wyłączonym oddechu świata.
    /// </summary>
    public sealed partial class Typ_NASTROJ
    {
        /// <summary>
        /// ---------------------------------------------------------------- pył w świetle lampki
        /// Ile drobin pyłu unosi się nad ścianą.
        /// </summary>
        public double pylIle;
        /// <summary>Jak szybko się wznoszą (część wysokości ekranu na sekundę, najwolniejsza i najszybsza).</summary>
        public double[] pylTempo;
        /// <summary>Krycie drobiny w ciemności i w samym świetle lampki.</summary>
        public double[] pylKrycie;
        /// <summary>
        /// ---------------------------------------------------------------- pismo na ścianie
        /// Co tyle ms w tynku ściany pojawia się nowy napis nieznanym pismem (ile naraz).
        /// </summary>
        public double napisOkres;
        public double napisowNaraz;
        /// <summary>Wielkość znaku (połowa boku w px) i krycie żaru.</summary>
        public double napisRozmiar;
        public double napisKrycie;
        /// <summary>
        /// ---------------------------------------------------------------- krążki i liczby
        /// Jak szybko krążek rozjaśnia się pod kursorem (ms do ~2/3 drogi).
        /// </summary>
        public double podswietlenieMs;
        /// <summary>Krążek pod kursorem: krycie poświaty i krążącego błysku na obrzeżu.</summary>
        public double poswiataKrazka;
        public double blyskKrazka;
        /// <summary>Wycinek fresku na krążku w spoczynku — przyciemnienie i odbarwienie (0..1).</summary>
        public double ikonaCien;
        public double ikonaSzarosc;
        /// <summary>Zmiana wiary, krwi albo jedzenia: jak długo liczba się żarzy (ms).</summary>
        public double liczbaZar;
        /// <summary>Oko w ramie płyty: jak daleko źrenica podąża za kursorem (część oka).</summary>
        public double okoPodaza;
    }
}
