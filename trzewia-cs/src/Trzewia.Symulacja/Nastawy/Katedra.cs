// Wygenerowane z alpha-1/src/nastawy/katedra.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/katedra.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/katedra.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyKatedra
    {
        /// <summary>
        /// KATEDRA NA POWIERZCHNI (Alpha 0.2, wizja użytkownika z 23.10): „na samej górze jest jakaś katedra i z jej górnej
        /// szyby pada światło do nas”. Nad szybem ze światłem stoi katedra — w przekroju, jak cała góra pod nią: na zachodzie
        /// wieża z iglicą, dalej nawa, na wschodzie skrzyżowanie z rozetą na tylnej ścianie i sygnaturką na dachu. Z rozety
        /// pada promień: przez otwór w posadzce (balustrada, dwa kandelabry), szybem do sali i na ołtarz.
        /// Rysunek: src/render/katedra.ts (kamień, szkło), src/render/promien.ts (promień). Tylko rysunek — symulacja go nie zna.
        ///
        /// Odległości w kaflach: `u` w poziomie od środka szybu ze światłem (ujemne — na zachód), `v` w górę od ziemi.
        /// </summary>
        public static Typ_KATEDRA KATEDRA = new Typ_KATEDRA
        {
            wlaczona = true,
            posadzka = 0.4,
            wieza = new Typ_KATEDRA_wieza
            {
                od = -26,
                @do = -20,
                wys = 14,
                iglica = 5.6,
            },
            nawa = new Typ_KATEDRA_nawa
            {
                od = -20,
                @do = -4,
                przeslo = 4,
                filar = 0.7,
                arkada = new double[] { 4.2, 6.3 },
                tryforium = new double[] { 6.6, 7.4 },
                okna = new double[] { 7.7, 10.3 },
                sklepienie = 11,
            },
            dach = new Typ_KATEDRA_dach
            {
                okap = 11.3,
                kalenica = 13.2,
            },
            skrzyzowanie = new Typ_KATEDRA_skrzyzowanie
            {
                od = -4,
                @do = 4,
                luk = new double[] { 6.8, 10.8 },
                sciana = 0.9,
                przypora = 0.6,
            },
            rozeta = new Typ_KATEDRA_rozeta
            {
                v = 8.2,
                r = 2.25,
            },
            sygnaturka = new Typ_KATEDRA_sygnaturka
            {
                latarnia = 1.4,
                iglica = 3.4,
            },
            balustrada = new Typ_KATEDRA_balustrada
            {
                bok = 0.75,
                wys = 0.95,
            },
            kandelabry = new Typ_KATEDRA_kandelabry
            {
                u = 3,
                wys = 2.3,
            },
        };

        /// <summary>
        /// PROMIEŃ Z ROZETY (src/render/promien.ts) — miękkie światło zamiast płaskiej smugi: brzegi rozmyte coraz mocniej
        /// z odległością od otworu, przez który przeszło (rozeta, potem szyb), w środku smugi od maswerku rozety (z barwą
        /// witraży tuż pod nią), przez całą długość pył i pasma mgły, które powoli spływają w dół; na posadzce sali — plama.
        /// </summary>
        public static Typ_PROMIEN PROMIEN = new Typ_PROMIEN
        {
            rozdzielczosc = 6,
            jasnosc = new double[] { 0.34, 0.3, 0.27, 0.17 },
            szerokosc = new Typ_PROMIEN_szerokosc
            {
                rozeta = 1.95,
                posadzka = 1.8,
                sala = 2.6,
            },
            rozmycie = new double[] { 0.3, 0.55, 0.12, 1.15 },
            smugi = new Typ_PROMIEN_smugi
            {
                ile = 7,
                kontrastGora = 0.6,
                kontrastDol = 0.12,
                migot = 0.16,
            },
            mgla = new Typ_PROMIEN_mgla
            {
                sila = 0.34,
                splyw = 0.35,
            },
            pyl = new Typ_PROMIEN_pyl
            {
                ile = 64,
                opad = 0.28,
            },
        };
    }

    /// <summary>
    /// KATEDRA NA POWIERZCHNI (Alpha 0.2, wizja użytkownika z 23.10): „na samej górze jest jakaś katedra i z jej górnej
    /// szyby pada światło do nas”. Nad szybem ze światłem stoi katedra — w przekroju, jak cała góra pod nią: na zachodzie
    /// wieża z iglicą, dalej nawa, na wschodzie skrzyżowanie z rozetą na tylnej ścianie i sygnaturką na dachu. Z rozety
    /// pada promień: przez otwór w posadzce (balustrada, dwa kandelabry), szybem do sali i na ołtarz.
    /// Rysunek: src/render/katedra.ts (kamień, szkło), src/render/promien.ts (promień). Tylko rysunek — symulacja go nie zna.
    ///
    /// Odległości w kaflach: `u` w poziomie od środka szybu ze światłem (ujemne — na zachód), `v` w górę od ziemi.
    /// </summary>
    public sealed partial class Typ_KATEDRA
    {
        /// <summary>Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy).</summary>
        public bool wlaczona;
        /// <summary>Posadzka na cokole: tyle nad ziemią.</summary>
        public double posadzka;
        /// <summary>Wieża zachodnia (od–do), wysokość korpusu i iglicy nad nim.</summary>
        public Typ_KATEDRA_wieza wieza;
        /// <summary>
        /// Nawa: od wieży do skrzyżowania, przęsła co `przeslo`. Wysokości: arkada (głowice, wierzchołek łuku), tryforium,
        /// okna górne (parapet, wierzchołek), sklepienie (wierzchołek), dach (okap, kalenica).
        /// </summary>
        public Typ_KATEDRA_nawa nawa;
        public Typ_KATEDRA_dach dach;
        /// <summary>Skrzyżowanie: środek nad szybem; łuk na tylnej ścianie (nasada, wierzchołek), wschodnia ściana i przypora.</summary>
        public Typ_KATEDRA_skrzyzowanie skrzyzowanie;
        /// <summary>Rozeta na tylnej ścianie skrzyżowania — „górna szyba”: środek (v) i promień obramienia.</summary>
        public Typ_KATEDRA_rozeta rozeta;
        /// <summary>Sygnaturka na kalenicy nad skrzyżowaniem: latarnia i iglica (wysokości nad kalenicą).</summary>
        public Typ_KATEDRA_sygnaturka sygnaturka;
        /// <summary>Balustrada wokół otworu w posadzce (szerokość boku poza otworem, wysokość) i kandelabry po obu stronach.</summary>
        public Typ_KATEDRA_balustrada balustrada;
        public Typ_KATEDRA_kandelabry kandelabry;
    }

    public sealed partial class Typ_KATEDRA_wieza
    {
        public double od;
        public double @do;
        public double wys;
        public double iglica;
    }

    public sealed partial class Typ_KATEDRA_nawa
    {
        public double od;
        public double @do;
        public double przeslo;
        public double filar;
        public double[] arkada;
        public double[] tryforium;
        public double[] okna;
        public double sklepienie;
    }

    public sealed partial class Typ_KATEDRA_dach
    {
        public double okap;
        public double kalenica;
    }

    public sealed partial class Typ_KATEDRA_skrzyzowanie
    {
        public double od;
        public double @do;
        public double[] luk;
        public double sciana;
        public double przypora;
    }

    public sealed partial class Typ_KATEDRA_rozeta
    {
        public double v;
        public double r;
    }

    public sealed partial class Typ_KATEDRA_sygnaturka
    {
        public double latarnia;
        public double iglica;
    }

    public sealed partial class Typ_KATEDRA_balustrada
    {
        public double bok;
        public double wys;
    }

    public sealed partial class Typ_KATEDRA_kandelabry
    {
        public double u;
        public double wys;
    }

    /// <summary>
    /// PROMIEŃ Z ROZETY (src/render/promien.ts) — miękkie światło zamiast płaskiej smugi: brzegi rozmyte coraz mocniej
    /// z odległością od otworu, przez który przeszło (rozeta, potem szyb), w środku smugi od maswerku rozety (z barwą
    /// witraży tuż pod nią), przez całą długość pył i pasma mgły, które powoli spływają w dół; na posadzce sali — plama.
    /// </summary>
    public sealed partial class Typ_PROMIEN
    {
        /// <summary>Bufor promienia: pikseli na kafel (mniej — miękciej i taniej; i tak jest rozmyty).</summary>
        public double rozdzielczosc;
        /// <summary>Jasność (0..1, światło dodawane do obrazu): pod rozetą, na posadzce katedry, u wylotu szybu, nad ołtarzem.</summary>
        public double[] jasnosc;
        /// <summary>Pół szerokości promienia w katedrze (pod rozetą, przy posadzce) i w sali (u wylotu szybu — ten ma szyb, przy posadzce).</summary>
        public Typ_PROMIEN_szerokosc szerokosc;
        /// <summary>Rozmycie brzegu (kafle): pod rozetą, przy posadzce katedry, u wylotu szybu, przy posadzce sali.</summary>
        public double[] rozmycie;
        /// <summary>Smugi od maswerku: ile, jak wyraźne pod rozetą i nad ołtarzem, jak mocno migoczą.</summary>
        public Typ_PROMIEN_smugi smugi;
        /// <summary>Mgła w promieniu: siła (0..1), jak szybko spływa (kafle na sekundę).</summary>
        public Typ_PROMIEN_mgla mgla;
        /// <summary>Pył: ile drobin w całym promieniu i jak szybko opadają (kafle na sekundę).</summary>
        public Typ_PROMIEN_pyl pyl;
    }

    public sealed partial class Typ_PROMIEN_szerokosc
    {
        public double rozeta;
        public double posadzka;
        public double sala;
    }

    public sealed partial class Typ_PROMIEN_smugi
    {
        public double ile;
        public double kontrastGora;
        public double kontrastDol;
        public double migot;
    }

    public sealed partial class Typ_PROMIEN_mgla
    {
        public double sila;
        public double splyw;
    }

    public sealed partial class Typ_PROMIEN_pyl
    {
        public double ile;
        public double opad;
    }
}
