// Wygenerowane z alpha-1/src/nastawy/wyglad/fresk-swiata.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-fresk-swiata.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/fresk-swiata.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladFreskSwiata
    {
        /// <summary>
        /// FRESK ŚWIATA — góra na płycie malowana jak góry na ikonach i freskach z krypt.
        ///
        /// Skała to półki („schodki”) pigmentu: najjaśniejsza przy jaskini, ciemniejsza w głębi masy,
        /// z jasnym świetlikiem na krawędzi podłogi i konturem sinopią. Jaskinie są czarne jak grota
        /// z ikony Bożego Narodzenia. Pamięć góry to wyblakły fresk z ubytkami tynku, a nieznane —
        /// ciemna ściana z ledwie widocznym szkicem sinopii. Na wszystko kładzie się faktura tynku.
        /// Dawne kreskowanie ryciny: ustawienia → „Rysunek świata: rycina”.
        ///
        /// Barwy [r, g, b] 0..255. Pigment skały zmienia się z głębokością: `gora` przy powierzchni,
        /// `srodek` w połowie, `dno` przy rdzeniu — materiały mieszają się z nim według `wlasny`.
        /// Kamień, nie piaskowiec: zielona ziemia i łupek jak góry na ikonach (i góra z „Kuszenia”),
        /// ciepły ugier byłby kanionem na pustyni.
        /// </summary>
        public static Typ_FRESK_SWIATA FRESK_SWIATA = new Typ_FRESK_SWIATA
        {
            gora = new double[] { 88, 94, 80 },
            srodek = new double[] { 76, 68, 66 },
            dno = new double[] { 92, 46, 40 },
            materialy = new Dictionary<int, Typ_FRESK_SWIATA_materialy_wpis> { [1] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 40, 52, 70 },
                wlasny = 1,
            }, [2] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 102, 84, 62 },
                wlasny = 0.5,
            }, [3] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 80, 82, 74 },
                wlasny = 0,
            }, [4] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 146, 58, 40 },
                wlasny = 0.7,
            }, [5] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 58, 82, 108 },
                wlasny = 0.8,
            }, [6] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 44, 46, 52 },
                wlasny = 0.8,
            }, [9] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 210, 170, 96 },
                wlasny = 0.8,
            }, [10] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 190, 80, 36 },
                wlasny = 0.8,
            }, [15] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 112, 96, 76 },
                wlasny = 0.35,
            }, [16] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 52, 52, 60 },
                wlasny = 0.6,
            }, [17] = new Typ_FRESK_SWIATA_materialy_wpis
            {
                barwa = new double[] { 214, 168, 70 },
                wlasny = 0.85,
            } },
            swietlik = new double[] { 212, 210, 190 },
            polkiOdJaskini = 2.2,
            polkiPion = 0.24,
            polkaCien = 0.38,
            jasnoscGlebi = 0.5,
            jasnoscKrawedzi = 0.85,
            polkaKreska = 1.1,
            polkaKreskaSila = 0.55,
            polkaSwietlikSila = 0.42,
            falowanie = 0.55,
            pedzel = 0.14,
            swietlikGrubosc = 0.16,
            swietlikSila = 0.65,
            kontur = new double[] { 62, 24, 16 },
            grota = new double[] { 17, 11, 9 },
            woda = new double[] { 36, 58, 74 },
            fala = new double[] { 104, 138, 150 },
            tynk = new double[] { 96, 92, 84 },
            ubytki = 0.55,
            nieznane = new double[] { 18, 12, 10 },
            szkic = new double[] { 96, 38, 26 },
            szkicSila = 0.34,
            tynkKrycie = 0.45,
            tynkKafli = 7,
        };
    }

    /// <summary>
    /// FRESK ŚWIATA — góra na płycie malowana jak góry na ikonach i freskach z krypt.
    ///
    /// Skała to półki („schodki”) pigmentu: najjaśniejsza przy jaskini, ciemniejsza w głębi masy,
    /// z jasnym świetlikiem na krawędzi podłogi i konturem sinopią. Jaskinie są czarne jak grota
    /// z ikony Bożego Narodzenia. Pamięć góry to wyblakły fresk z ubytkami tynku, a nieznane —
    /// ciemna ściana z ledwie widocznym szkicem sinopii. Na wszystko kładzie się faktura tynku.
    /// Dawne kreskowanie ryciny: ustawienia → „Rysunek świata: rycina”.
    ///
    /// Barwy [r, g, b] 0..255. Pigment skały zmienia się z głębokością: `gora` przy powierzchni,
    /// `srodek` w połowie, `dno` przy rdzeniu — materiały mieszają się z nim według `wlasny`.
    /// Kamień, nie piaskowiec: zielona ziemia i łupek jak góry na ikonach (i góra z „Kuszenia”),
    /// ciepły ugier byłby kanionem na pustyni.
    /// </summary>
    public sealed partial class Typ_FRESK_SWIATA
    {
        /// <summary>
        /// ---------------------------------------------------------------- pigment skały
        /// Zielona ziemia i łupek przy powierzchni, szara umbra w połowie, czerwień ziemi przy rdzeniu.
        /// </summary>
        public double[] gora;
        public double[] srodek;
        public double[] dno;
        /// <summary>Własna barwa materiału i to, jak mocno bierze górę nad pigmentem głębokości (0..1).</summary>
        public Dictionary<int, Typ_FRESK_SWIATA_materialy_wpis> materialy;
        /// <summary>Świetlik — biel z odrobiną zieleni, którą ikonopisarz zaznacza krawędź półki.</summary>
        public double[] swietlik;
        /// <summary>
        /// ---------------------------------------------------------------- bryła
        ///
        /// Półki skalne jak na ikonie: pasy, które obiegają jaskinie i schodzą w dół stokiem.
        /// Pole półek = bliskość jaskini × `odJaskini` + głębokość (kafle) × `pion` + falowanie.
        /// Każda półka jest jasna u góry i ciemnieje w dół; między półkami ciemna kreska sinopii,
        /// a na górnej krawędzi jasny świetlik.
        /// </summary>
        public double polkiOdJaskini;
        public double polkiPion;
        /// <summary>Jak bardzo półka ciemnieje od górnej krawędzi do dolnej (0..1).</summary>
        public double polkaCien;
        /// <summary>Jasność masy: w głębi skały i tuż przy jaskini (mnożnik pigmentu).</summary>
        public double jasnoscGlebi;
        public double jasnoscKrawedzi;
        /// <summary>Kreska między półkami i świetlik na ich górnej krawędzi: grubość (px przy przybliżeniu 10) i siła.</summary>
        public double polkaKreska;
        public double polkaKreskaSila;
        public double polkaSwietlikSila;
        /// <summary>Jak bardzo brzeg półki faluje — kamień, nie wykres.</summary>
        public double falowanie;
        /// <summary>Smugi pędzla wzdłuż półek (0 = brak).</summary>
        public double pedzel;
        /// <summary>Świetlik na podłodze: grubość (część kafla) i siła.</summary>
        public double swietlikGrubosc;
        public double swietlikSila;
        /// <summary>Kontur ściany sinopią.</summary>
        public double[] kontur;
        /// <summary>
        /// ---------------------------------------------------------------- jaskinia, woda
        /// Grota: prawie czarna, ciepła; głębiej odrobinę rdzawa.
        /// </summary>
        public double[] grota;
        /// <summary>Woda w lapisie i jasne fale malowane pędzlem.</summary>
        public double[] woda;
        public double[] fala;
        /// <summary>
        /// ---------------------------------------------------------------- pamięć i nieznane
        /// Pamięć: wyblakły pigment schodzi ku barwie tynku; ubytki odsłaniają goły tynk.
        /// </summary>
        public double[] tynk;
        /// <summary>Część ubytków przy całkiem zapomnianym miejscu (0..1).</summary>
        public double ubytki;
        /// <summary>Nieznane: ciemna ściana i szkic sinopii (krycie kreski 0..1).</summary>
        public double[] nieznane;
        public double[] szkic;
        public double szkicSila;
        /// <summary>Faktura tynku na całym świecie (mnożenie) — krycie i wielkość kafla faktury w kaflach świata.</summary>
        public double tynkKrycie;
        public double tynkKafli;
    }

    public sealed partial class Typ_FRESK_SWIATA_materialy_wpis
    {
        public double[] barwa;
        public double wlasny;
    }
}
