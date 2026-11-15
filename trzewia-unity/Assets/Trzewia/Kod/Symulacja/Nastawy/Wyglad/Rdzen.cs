// Wygenerowane z alpha-1/src/nastawy/wyglad/rdzen.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-rdzen.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/rdzen.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladRdzen
    {
        /// <summary>
        /// RDZEŃ NA PŁYCIE — jak wygląda cel gry w samej grze.
        ///
        /// „z” to przybliżenie kamery (ile pikseli ma jeden kafel). Wymiary podane jako
        /// „× z” rosną z przybliżeniem; „min” pilnuje, by rdzeń był widoczny z daleka.
        /// </summary>
        public static Typ_RDZEN_WYGLAD RDZEN_WYGLAD = new Typ_RDZEN_WYGLAD
        {
            tetnoMs = 1600,
            uderzenie1 = 0.08,
            uderzenie2 = 0.26,
            sila2 = 0.7,
            skorupaZasieg = 12,
            blok = "rgba(34,26,24,0.72)",
            blokFaktura = "rgba(150,120,96,0.22)",
            blokObrzeze = "rgba(214,176,128,0.55)",
            ciosDl = 2,
            mur = new double[] { 74, 62, 54 },
            murRozrzut = 0.14,
            fuga = "rgba(16,10,8,0.85)",
            faza = "rgba(232,204,164,0.22)",
            fazaCien = "rgba(10,6,4,0.35)",
            fazaOdZoom = 8,
            scianaKomory = new double[] { 40, 32, 29 },
            fugaKomory = "rgba(8,4,4,0.3)",
            ciosSciany = 3.4,
            rzadSciany = 1.6,
            klin = 1.35,
            klinGlebia = 1.7,
            posadzkaGlebia = 0.9,
            znakCo = 4,
            znakiOdZoom = 7,
            znak = "rgba(226,160,110,0.45)",
            latarnia = new Typ_RDZEN_WYGLAD_latarnia
            {
                min = 44,
                naZoom = 11,
            },
            mocZamkniety = 0.42,
            mocOtwarty = 0.6,
            promieni = 12,
            promienAlfa = 0.12,
            promienTetno = 0.18,
            serce = new Typ_RDZEN_WYGLAD_serce
            {
                min = 13,
                naZoom = 3,
            },
            puchniecie = 0.06,
            serceJasne = "#ffd2a6",
            serceJasneOtwarte = "#fff0c8",
            serceZar = "#e2553c",
            serceZarOtwarte = "#f2a04a",
            serceCiemne = "#7a1618",
            serceBrzeg = "#2a0808",
            wieniec = 1.9,
            wieniecNaZoom = 6.2,
            ogniwoZapalone = "255,208,130",
            ogniwoZgaszone = "rgba(214,190,160,0.28)",
            znakowWienca = 12,
            znakiWiencaOd = 30,
            podpisOdZoom = 4,
            podpisZamkniety = "twój rdzeń — tu cię uwolnią",
            podpisPeka = "skorupa pęka: {proc}%",
            podpisOtwarty = "rdzeń otwarty — wierni schodzą",
        };
    }

    /// <summary>
    /// RDZEŃ NA PŁYCIE — jak wygląda cel gry w samej grze.
    ///
    /// „z” to przybliżenie kamery (ile pikseli ma jeden kafel). Wymiary podane jako
    /// „× z” rosną z przybliżeniem; „min” pilnuje, by rdzeń był widoczny z daleka.
    /// </summary>
    public sealed partial class Typ_RDZEN_WYGLAD
    {
        /// <summary>Tętno: długość jednego cyklu „bum-bum, pauza” (ms).</summary>
        public double tetnoMs;
        /// <summary>Pierwsze i drugie uderzenie: położenie w cyklu (0..1) i siła drugiego.</summary>
        public double uderzenie1;
        public double uderzenie2;
        public double sila2;
        /// <summary>Skorupa: kafle w takim promieniu od rdzenia dostają ciosane bloki.</summary>
        public double skorupaZasieg;
        /// <summary>Kolor bloku, faktura ciosu i jasne obrzeże.</summary>
        public string blok;
        public string blokFaktura;
        public string blokObrzeze;
        /// <summary>
        /// Mur skorupy: ciosy na zakładkę (blok = `ciosDl` kafli, co drugi rząd przesunięty o pół), barwa kamienia [r, g, b]
        /// i jej rozrzut między blokami, fuga, jasna faza u góry ciosu i ciemna u dołu (od jakiego przybliżenia).
        /// </summary>
        public double ciosDl;
        public double[] mur;
        public double murRozrzut;
        public string fuga;
        public string faza;
        public string fazaCien;
        public double fazaOdZoom;
        /// <summary>Wnętrze komory pomnika: ciemna tylna ściana z wielkich ciosów (szerokość ciosu i wysokość rzędu w kaflach), ledwie widocznych.</summary>
        public double[] scianaKomory;
        public string fugaKomory;
        public double ciosSciany;
        public double rzadSciany;
        /// <summary>
        /// Pierścień klińców wokół komory: długość klińca wzdłuż obrysu i jego głębokość (kafle), głębokość płyt posadzki,
        /// co który kliniec ma wyryty znak (jeden fryz zamiast pieczątek na każdej cegle).
        /// </summary>
        public double klin;
        public double klinGlebia;
        public double posadzkaGlebia;
        public double znakCo;
        /// <summary>Wyryte znaki: od jakiego przybliżenia i jakim kolorem.</summary>
        public double znakiOdZoom;
        public string znak;
        /// <summary>Latarnia (szeroka poświata): promień = max(min, z × mnożnik).</summary>
        public Typ_RDZEN_WYGLAD_latarnia latarnia;
        /// <summary>Moc poświaty: zamknięty / otwarty rdzeń.</summary>
        public double mocZamkniety;
        public double mocOtwarty;
        /// <summary>Promienie: ile i jak jasne (podstawa + tętno).</summary>
        public double promieni;
        public double promienAlfa;
        public double promienTetno;
        /// <summary>Serce: promień = max(min, z × mnożnik), puchnie z tętnem o tyle.</summary>
        public Typ_RDZEN_WYGLAD_serce serce;
        public double puchniecie;
        /// <summary>Barwy serca: jasny środek, żar, ciemny brzeg (zamknięty / otwarty).</summary>
        public string serceJasne;
        public string serceJasneOtwarte;
        public string serceZar;
        public string serceZarOtwarte;
        public string serceCiemne;
        public string serceBrzeg;
        /// <summary>Wieniec pęknięć: promień = max(serce × to, z × `wieniecNaZoom`).</summary>
        public double wieniec;
        public double wieniecNaZoom;
        /// <summary>Ogniwo zapalone (pęknięte) i zgaszone.</summary>
        public string ogniwoZapalone;
        public string ogniwoZgaszone;
        /// <summary>Znaki na wieńcu: ile i od jakiego promienia wieńca w ogóle się pojawiają.</summary>
        public double znakowWienca;
        public double znakiWiencaOd;
        /// <summary>Podpis pod rdzeniem — od jakiego przybliżenia.</summary>
        public double podpisOdZoom;
        public string podpisZamkniety;
        /// <summary>{proc} podmieniane na procent skruszonej skorupy.</summary>
        public string podpisPeka;
        public string podpisOtwarty;
    }

    public sealed partial class Typ_RDZEN_WYGLAD_latarnia
    {
        public double min;
        public double naZoom;
    }

    public sealed partial class Typ_RDZEN_WYGLAD_serce
    {
        public double min;
        public double naZoom;
    }
}
