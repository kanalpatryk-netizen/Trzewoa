// Oprawa, etap 7d: ANIMACJE RYCERZA nowej postaci — garda, podejście, zakładanie zbroi, wszystkie ruchy walki
// (NastawyWalka.RUCHY_RYCERZA, opisy ruchów: „Miecz unosi się za głowę, krok w przód i cięcie z całej siły w dół” …),
// powalenie i wstawanie, „Ścięcie głowy” Cerbera. Klucze w tikach ruchu (120 na sekundę): uderzenie wypada dokładnie
// w tiku trafienia z nastaw — arkusz próbkuje ruch równo (klatka k ≈ tik k·dl/(n−1)), gra pokazuje klatkę round(t/dl·(n−1)).
using System;

namespace Trzewia.Rysunek.Ludzie
{
    public static partial class Animacje
    {
        /// <summary>Garda rycerza: na ugiętych nogach, dalsza (z tarczą) naprzód, miecz w górze przed sobą.</summary>
        static Poza Garda(Stroj s)
        {
            var p = Baza(s);
            p.udoL = 0.34; p.kolanoL = 0.36; p.stopaL = -0.04; p.udoP = -0.3; p.kolanoP = 0.24;
            p.tulow = 0.1; p.glowa = -0.05; p.plaszcz = 0.1;
            Siegnij(ref p, true, 0.15, 0.1); Trzyma(ref p, true, 2.2);
            Siegnij(ref p, false, 0.15, s.Tarcza ? 0.14 : 0.2);
            return p;
        }

        /// <summary>Jeden klucz ruchu: tik, zmiany pozy (opis na gardzie), dłoń z mieczem (względem barku) i kąt miecza, dalsza dłoń.</summary>
        struct KR
        {
            public double t;
            public string opis;
            public double mx, my, kat;
            /// <summary>dalsza dłoń względem dalszego barku; NaN — jak w gardzie; oburącz — na rękojeści za bliższą</summary>
            public double dx, dy;
            public bool oburacz;
            public int krzywa;
        }

        static KR K(double t, string opis, double mx, double my, double kat, int krzywa = 0) =>
            new KR { t = t, opis = opis, mx = mx, my = my, kat = kat, dx = double.NaN, dy = double.NaN, krzywa = krzywa };
        static KR K(double t, string opis, double mx, double my, double kat, double dx, double dy, int krzywa = 0) =>
            new KR { t = t, opis = opis, mx = mx, my = my, kat = kat, dx = dx, dy = dy, krzywa = krzywa };
        static KR KO(double t, string opis, double mx, double my, double kat, int krzywa = 0) =>
            new KR { t = t, opis = opis, mx = mx, my = my, kat = kat, dx = double.NaN, dy = double.NaN, oburacz = true, krzywa = krzywa };

        /// <summary>Poza klucza: garda + opis, dłonie z kinematyki.</summary>
        static Poza PozaKlucza(Stroj s, in Poza garda, in KR k)
        {
            var p = Z(k.opis, garda);
            Siegnij(ref p, true, k.mx, k.my);
            Trzyma(ref p, true, k.kat);
            // oburącz (rycerz z tarczą trzyma tarczę przed sobą i tnie jedną ręką)
            if (k.oburacz && !s.Tarcza) Oburacz(ref p, k.kat, -0.075);
            else if (!double.IsNaN(k.dx)) Siegnij(ref p, false, k.dx, k.dy);
            else { Siegnij(ref p, false, 0.15, s.Tarcza ? 0.14 : 0.2); }
            return p;
        }

        /// <summary>Ruch z kluczy: kąty sąsiednich kluczy rozwinięte (miecz nie kręci się „na skróty” przez pełny obrót).</summary>
        static Poza Ruch(Stroj s, double t, params KR[] kl)
        {
            var g = Garda(s);
            var k = new (double t, Poza p, int k)[kl.Length];
            for (int i = 0; i < kl.Length; i++)
            {
                var p = PozaKlucza(s, g, kl[i]);
                if (i > 0)
                {
                    var o = k[i - 1].p;
                    p.ramieP = Blisko(p.ramieP, o.ramieP); p.lokiecP = Blisko(p.lokiecP, o.lokiecP); p.dlonP = Blisko(p.dlonP, o.dlonP);
                    p.ramieL = Blisko(p.ramieL, o.ramieL); p.lokiecL = Blisko(p.lokiecL, o.lokiecL); p.dlonL = Blisko(p.dlonL, o.dlonL);
                }
                k[i] = (kl[i].t, p, kl[i].krzywa);
            }
            return Klucze(t, k);
        }

        static double Blisko(double a, double wzor)
        {
            while (a - wzor > Math.PI) a -= TAU;
            while (a - wzor < -Math.PI) a += TAU;
            return a;
        }

        // nogi i tułów w typowych chwilach (opis na gardzie)
        const string WYPAD = "udoL=.62 kolanoL=.72 stopaL=-.1 udoP=-.5 kolanoP=.1 stopaP=.25 tulow=.36 glowa=.02";
        const string WYPAD_GLEBOKI = "udoL=.8 kolanoL=.98 stopaL=-.15 udoP=-.62 kolanoP=.08 stopaP=.3 tulow=.44 glowa=.04";
        const string TYL = "udoL=.26 kolanoL=.2 udoP=-.22 kolanoP=.32 tulow=-.04 glowa=-.1";
        const string PRZYSIAD = "udoL=1.0 kolanoL=1.45 stopaL=-.2 udoP=-.02 kolanoP=1.2 stopaP=.3 tulow=.42 glowa=-.2";
        const string ZWINIETY = "udoL=1.0 kolanoL=1.6 stopaL=.3 udoP=.55 kolanoP=1.5 stopaP=.4";

        /// <summary>Rycerz: animacje bez wspólnego wzoru (garda, podejście, zakładanie zbroi, ruchy walki, powalenie, ścięcie).</summary>
        static KlatkaPostaci Rycerz(Stroj s, string n, double u)
        {
            var r = new Rekwizyty { wP = Narzedzie.Miecz };
            Poza p;
            switch (n)
            {
                case "garda":
                    {
                        p = Garda(s);
                        var odd = Math.Sin(TAU * u);
                        p.tulow += 0.012 * odd; p.glowa -= 0.01 * odd; p.biodroY = null;
                        var p2 = p; Siegnij(ref p2, true, 0.15, 0.1 - 0.01 * odd); Trzyma(ref p2, true, 2.2 + 0.05 * odd);
                        p = p2;
                        break;
                    }
                case "podejscie":
                    {
                        // krótkie, ostrożne kroki w gardzie (w miejscu — przesuwa go gra)
                        var c = CHOD.Kopia();
                        c.S = 0.34; c.beta = 0.66; c.unies = 0.04; c.biodro = 0.43; c.kolys = 0.01; c.pochyl = 0.04;
                        var g = Garda(s);
                        p = Chod(u, c, g, false);
                        p.tulow = g.tulow + 0.01 * Math.Cos(2 * TAU * u);
                        break;
                    }
                case "walczy-ciecie":
                    p = Ruch(s, u * 96,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(34, TYL, 0.02, -0.2, 3.7),
                        K(48, "udoL=.5 kolanoL=.55 tulow=.2", 0.12, -0.16, 3.0),
                        K(56, WYPAD, 0.28, 0.06, 1.5, 1),
                        K(66, WYPAD, 0.24, 0.18, 0.95),
                        K(96, "", 0.15, 0.1, 2.2));
                    break;
                case "walczy-pchniecie":
                    p = Ruch(s, u * 96,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(36, TYL, -0.04, 0.16, 1.6),
                        K(56, WYPAD_GLEBOKI, 0.32, 0.06, 1.55, 1),
                        K(66, WYPAD_GLEBOKI, 0.31, 0.06, 1.55),
                        K(96, "", 0.15, 0.1, 2.2));
                    break;
                case "zaklada": return Zaklada(s, u);
                case "modli":
                case "powalony-lezy":
                case "powalony-pada":
                case "powalony-wstaje":
                case "sciecieGlowy":
                    return RycerzPowalonyIScinanie(s, n, u);
                default:
                    {
                        var ruch = RuchWalki(s, n, u, ref r);
                        if (ruch is Poza pr) p = pr;
                        else return Stoi(s, 0.25, 0);
                        break;
                    }
            }
            return new KlatkaPostaci(p, r);
        }

        /// <summary>Ruchy walki z nastaw (`u` — postęp 0…1 całego ruchu); null — ruch nieznany.</summary>
        static Poza? RuchWalki(Stroj s, string n, double u, ref Rekwizyty r)
        {
            switch (n)
            {
                case "ciecieZGory":
                    // 102 tiki, trafienie 56: miecz za głowę, krok w przód, cięcie z całej siły w dół
                    return Ruch(s, u * 102,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(30, TYL, 0.02, -0.2, 3.7),
                        K(42, TYL + " tulow=-.07", -0.01, -0.22, 3.92),
                        K(50, "udoL=.55 kolanoL=.55 udoP=-.42 kolanoP=.14 tulow=.15", 0.12, -0.18, 3.0, 1),
                        K(56, WYPAD, 0.28, 0.06, 1.5, 1),
                        K(62, WYPAD + " tulow=.4", 0.27, 0.1, 1.35),
                        K(70, WYPAD + " tulow=.42", 0.24, 0.2, 0.9),
                        K(84, "tulow=.2", 0.17, 0.12, 1.8),
                        K(102, "", 0.15, 0.1, 2.2));
                case "pchniecie":
                    // 78 tików, trafienie 40: ostrze cofnięte do biodra, wypad i pchnięcie sztychem
                    return Ruch(s, u * 78,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(22, TYL + " tulow=0", -0.04, 0.16, 1.6),
                        K(32, TYL + " tulow=-.02", -0.06, 0.17, 1.62),
                        K(40, WYPAD_GLEBOKI, 0.32, 0.06, 1.55, 1),
                        K(48, WYPAD_GLEBOKI, 0.32, 0.07, 1.55),
                        K(62, "tulow=.18", 0.2, 0.1, 1.9),
                        K(78, "", 0.15, 0.1, 2.2));
                case "ciecieBoczne":
                    // 90 tików, trafienie 48: zamach zza pleców, płaskie cięcie na wysokości barku ze skrętem bioder
                    return Ruch(s, u * 90,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(26, TYL + " tulow=-.08", -0.12, 0.0, 4.4),
                        K(36, TYL + " tulow=-.1", -0.13, 0.0, 4.5),
                        K(44, "udoL=.5 kolanoL=.5 tulow=.1", 0.08, -0.04, 3.1, 1),
                        K(48, WYPAD, 0.28, 0.0, 1.75, 1),
                        K(56, WYPAD + " tulow=.3", 0.22, 0.08, 1.05),
                        K(72, "tulow=.18", 0.17, 0.1, 1.9),
                        K(90, "", 0.15, 0.1, 2.2));
                case "ciecieOdwrotne":
                    // 90 tików, trafienie 46: miecz założony na drugie ramię i cięcie z odwrotnej strony
                    return Ruch(s, u * 90,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(24, TYL + " tulow=.02", 0.02, 0.02, 3.9, 0.04, 0.1),
                        K(34, TYL + " tulow=.0", 0.01, 0.01, 4.05, 0.04, 0.1),
                        K(42, "udoL=.5 kolanoL=.5 tulow=.12", 0.18, -0.04, 2.6, 1),
                        K(46, WYPAD, 0.3, 0.04, 1.5, 1),
                        K(54, WYPAD + " tulow=.34", 0.26, 0.14, 0.9),
                        K(70, "tulow=.18", 0.17, 0.1, 1.9),
                        K(90, "", 0.15, 0.1, 2.2));
                case "seriaTrzech":
                    // 168 tików, trafienia 46, 86, 128: z góry, z boku i pchnięcie — krok za krokiem w przód
                    return Ruch(s, u * 168,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(26, TYL, 0.02, -0.2, 3.7),
                        K(40, "udoL=.5 kolanoL=.55 tulow=.15", 0.1, -0.15, 3.1, 1),
                        K(46, WYPAD, 0.28, 0.06, 1.5, 1),
                        K(56, WYPAD, 0.22, 0.14, 1.0),
                        K(70, "udoP=.4 kolanoP=.42 udoL=-.28 kolanoL=.16 tulow=.0", -0.1, 0.0, 4.4),
                        K(80, "udoP=.5 kolanoP=.5 udoL=-.36 kolanoL=.14 tulow=.1", 0.06, -0.04, 3.1, 1),
                        K(86, "udoP=.6 kolanoP=.62 udoL=-.46 kolanoL=.1 tulow=.3", 0.28, 0.0, 1.75, 1),
                        K(96, "udoP=.55 kolanoP=.6 udoL=-.42 kolanoL=.12 tulow=.3", 0.2, 0.1, 1.0),
                        K(112, TYL, -0.04, 0.16, 1.6),
                        K(122, TYL, -0.06, 0.17, 1.62),
                        K(128, WYPAD_GLEBOKI, 0.32, 0.06, 1.55, 1),
                        K(140, WYPAD_GLEBOKI, 0.32, 0.07, 1.55),
                        K(168, "", 0.15, 0.1, 2.2));
                case "ciecieOdDolu":
                    // 96 tików, trafienie 54: przysiad z ostrzem przy ziemi i cięcie w górę, wstając na palce
                    return Ruch(s, u * 96,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(30, PRZYSIAD, 0.12, 0.27, 0.5),
                        K(44, PRZYSIAD + " tulow=.46", 0.1, 0.28, 0.3),
                        K(54, "udoL=.3 kolanoL=.1 stopaL=.2 udoP=-.3 kolanoP=.05 stopaP=.45 tulow=-.06 glowa=-.18", 0.24, -0.12, 2.6, 1),
                        K(62, "udoL=.28 kolanoL=.1 stopaL=.2 udoP=-.28 kolanoP=.05 stopaP=.4 tulow=-.08 glowa=-.2", 0.16, -0.2, 3.0),
                        K(78, "tulow=.06", 0.15, 0.04, 2.5),
                        K(96, "", 0.15, 0.1, 2.2));
                case "piruet":
                    // 132 tiki, trafienie 78: pełny obrót z płaszczem w powietrzu i cięcie z rozpędu
                    return Ruch(s, u * 132,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(24, "tulow=.0 udoL=.2 kolanoL=.3", 0.0, 0.04, 2.6),
                        K(40, "tulow=.05 udoL=.1 kolanoL=.3 udoP=-.1 kolanoP=.3 plaszcz=1 odwrot=1", -0.1, 0.0, 4.3),
                        K(58, "tulow=.08 udoL=-.1 kolanoL=.3 udoP=.15 kolanoP=.3 plaszcz=1 odwrot=1", 0.0, -0.02, 3.6),
                        K(66, "tulow=.05 plaszcz=.9", -0.12, 0.0, 4.4),
                        K(78, WYPAD + " plaszcz=.6", 0.3, 0.02, 1.7, 1),
                        K(90, WYPAD + " plaszcz=.3", 0.22, 0.12, 1.0),
                        K(110, "tulow=.15", 0.17, 0.1, 1.9),
                        K(132, "", 0.15, 0.1, 2.2));
                case "ciosZWyskoku":
                    // 150 tików, trafienie 96 (doskok 40–92): przysiad, skok z mieczem nad głową, cios przy lądowaniu
                    return Ruch(s, u * 150,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(30, PRZYSIAD, 0.02, -0.1, 3.3),
                        K(40, PRZYSIAD + " wzlot=.04 tulow=.3", 0.02, -0.16, 3.5, 1),
                        K(56, ZWINIETY + " wzlot=.28 tulow=-.05 glowa=-.15 plaszcz=-.6", 0.0, -0.22, 3.8, 2),
                        K(80, ZWINIETY + " wzlot=.24 tulow=-.06 glowa=-.12 plaszcz=-.5", 0.03, -0.22, 3.92),
                        K(90, "udoL=.6 kolanoL=.6 udoP=-.1 kolanoP=.4 wzlot=.08 tulow=.15 plaszcz=.3", 0.14, -0.16, 3.0, 1),
                        K(96, WYPAD_GLEBOKI + " tulow=.5 plaszcz=.5", 0.26, 0.14, 1.0, 1),
                        K(108, WYPAD_GLEBOKI + " tulow=.52", 0.24, 0.2, 0.75),
                        K(130, "tulow=.2", 0.17, 0.1, 1.9),
                        K(150, "", 0.15, 0.1, 2.2));
                case "mlynek":
                    return Mlynek(s, u * 180);
                case "finta":
                    // 120 tików, trafienie 86: udaje cięcie z góry, a gdy wróg się zasłoni — nagłe pchnięcie dołem
                    return Ruch(s, u * 120,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(30, TYL, 0.02, -0.2, 3.7),
                        K(44, "udoL=.45 kolanoL=.45 tulow=.12", 0.14, -0.16, 2.9),
                        K(56, "udoL=.45 kolanoL=.45 tulow=.1", 0.16, -0.1, 2.5),
                        K(70, "udoL=.55 kolanoL=.72 udoP=-.2 kolanoP=.45 tulow=.3", 0.02, 0.22, 1.7),
                        K(86, WYPAD_GLEBOKI + " tulow=.48", 0.3, 0.2, 1.6, 1),
                        K(96, WYPAD_GLEBOKI + " tulow=.48", 0.3, 0.2, 1.6),
                        K(120, "", 0.15, 0.1, 2.2));
                case "egzekucja":
                    // 168 tików, trafienie 114: miecz oburącz za głową, długi zamach i cios, po którym klęka
                    return Ruch(s, u * 168,
                        K(0, "", 0.15, 0.1, 2.2),
                        KO(30, TYL + " tulow=-.08 glowa=-.15", -0.02, -0.24, 3.9),
                        KO(60, TYL + " tulow=-.1 glowa=-.14", -0.03, -0.24, 4.0),
                        KO(96, TYL + " tulow=-.11 glowa=-.12", -0.04, -0.24, 4.05),
                        KO(106, "udoL=.55 kolanoL=.6 udoP=-.4 kolanoP=.12 tulow=.12", 0.14, -0.16, 2.9, 1),
                        KO(114, WYPAD_GLEBOKI + " tulow=.46", 0.28, 0.12, 1.2, 1),
                        KO(128, "udoL=1.4 kolanoL=1.45 stopaL=-.3 udoP=.06 kolanoP=1.62 stopaP=.6 tulow=.34 glowa=.25", 0.24, 0.3, 0.4),
                        KO(150, "udoL=1.4 kolanoL=1.45 stopaL=-.3 udoP=.06 kolanoP=1.62 stopaP=.6 tulow=.3 glowa=.2", 0.24, 0.3, 0.35),
                        K(168, "", 0.15, 0.1, 2.2));
                case "uderzenieTarcza":
                    // 84 tiki, trafienie 42: krok i pchnięcie tarczą w twarz wroga
                    return Ruch(s, u * 84,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(26, TYL + " tulow=.0", 0.06, 0.12, 2.4, 0.03, 0.13),
                        K(42, WYPAD + " tulow=.3", 0.06, 0.14, 2.3, 0.31, 0.06, 1),
                        K(52, WYPAD + " tulow=.3", 0.06, 0.14, 2.3, 0.3, 0.07),
                        K(84, "", 0.15, 0.1, 2.2));
                case "szarzaZTarcza":
                    return Szarza(s, u * 132);
                case "taranBarkiem":
                    return Taran(s, u * 108);
                case "kolano":
                    // 72 tiki, trafienie 38: chwyta wroga wolną ręką i wbija mu kolano
                    return Ruch(s, u * 72,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(20, "tulow=.18", 0.12, 0.12, 2.0, 0.32, 0.0),
                        K(30, "tulow=.1", 0.1, 0.12, 2.0, 0.22, 0.04),
                        K(38, "udoP=1.55 kolanoP=1.75 stopaP=.4 udoL=.1 kolanoL=.18 tulow=-.04", 0.08, 0.14, 2.0, 0.2, 0.06, 1),
                        K(46, "udoP=1.45 kolanoP=1.7 stopaP=.4 udoL=.1 kolanoL=.18 tulow=-.02", 0.08, 0.14, 2.0, 0.2, 0.06),
                        K(72, "", 0.15, 0.1, 2.2));
                case "uderzenieHelmem":
                    // 80 tików, trafienie 44: odchyla się i bije czołem hełmu
                    return Ruch(s, u * 80,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(26, TYL + " tulow=-.22 glowa=-.32", 0.08, 0.12, 2.3),
                        K(36, TYL + " tulow=-.24 glowa=-.34", 0.07, 0.12, 2.3),
                        K(44, WYPAD + " tulow=.48 glowa=.4", 0.12, 0.16, 2.0, 1),
                        K(52, WYPAD + " tulow=.44 glowa=.34", 0.12, 0.16, 2.0),
                        K(80, "", 0.15, 0.1, 2.2));
                case "kontraNapiersnika":
                    // 110 tików, trafienie 70: przyjmuje cios na blachę, nie cofa się i od razu tnie
                    return Ruch(s, u * 110,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(16, "udoL=.42 kolanoL=.4 udoP=-.38 kolanoP=.2 tulow=-.12 glowa=-.02", 0.06, -0.05, 2.8, 0.08, 0.2),
                        K(28, "udoL=.42 kolanoL=.45 udoP=-.38 kolanoP=.25 tulow=-.18 glowa=-.1", 0.05, -0.06, 2.9, 0.06, 0.2),
                        K(42, TYL, 0.02, -0.2, 3.7),
                        K(60, "udoL=.5 kolanoL=.55 tulow=.12", 0.12, -0.16, 3.0, 1),
                        K(70, WYPAD, 0.28, 0.06, 1.5, 1),
                        K(80, WYPAD, 0.22, 0.18, 0.95),
                        K(110, "", 0.15, 0.1, 2.2));
                case "blokTarcza":
                    // 46 tików: zasłania się tarczą w porę, cios odbija (sypią się iskry)
                    return Ruch(s, u * 46,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(12, "udoL=.45 kolanoL=.55 udoP=-.35 kolanoP=.35 tulow=.1 glowa=.05", 0.08, 0.12, 2.5, 0.19, 0.0),
                        K(18, "udoL=.45 kolanoL=.55 udoP=-.35 kolanoP=.4 tulow=-.04 glowa=.0", 0.07, 0.12, 2.5, 0.16, 0.0),
                        K(30, "udoL=.45 kolanoL=.5 udoP=-.35 kolanoP=.35 tulow=.06", 0.08, 0.12, 2.4, 0.18, 0.02),
                        K(46, "", 0.15, 0.1, 2.2));
                case "parowanie":
                    // 48 tików: odbija cios ostrzem i od razu jest gotów do kontry
                    return Ruch(s, u * 48,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(10, "tulow=.04", 0.2, -0.06, 2.9),
                        K(18, "tulow=-.02", 0.17, -0.03, 2.55),
                        K(28, "tulow=.12", 0.2, 0.03, 2.15),
                        K(48, "", 0.15, 0.1, 2.2));
                case "unik":
                    // 54 tiki: odskok w tył przed ciosem
                    return Ruch(s, u * 54,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(16, "biodroX=-.08 wzlot=.07 udoL=.5 kolanoL=.8 udoP=.1 kolanoP=.7 tulow=-.12 glowa=-.06", 0.1, 0.06, 2.5),
                        K(28, "biodroX=-.16 udoL=.4 kolanoL=.5 udoP=-.25 kolanoP=.55 tulow=.05", 0.13, 0.08, 2.3),
                        K(40, "biodroX=-.14 tulow=.08", 0.15, 0.1, 2.2),
                        K(54, "", 0.15, 0.1, 2.2));
                case "trafionyLekko":
                    // 30 tików: wzdryga się i walczy dalej
                    return Ruch(s, u * 30,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(6, "tulow=-.08 glowa=-.22", 0.12, 0.08, 2.4, 2),
                        K(30, "", 0.15, 0.1, 2.2));
                case "trafionyMocno":
                    // 66 tików: cios przerywa atak, zatacza się w tył i łapie równowagę
                    return Ruch(s, u * 66,
                        K(0, "", 0.15, 0.1, 2.2),
                        K(8, "tulow=-.26 glowa=-.34 biodroX=-.03 usta=.6", 0.06, -0.06, 2.9, 0.02, -0.04, 2),
                        K(22, "udoL=.0 kolanoL=.15 udoP=-.45 kolanoP=.2 tulow=-.2 glowa=-.2 biodroX=-.08 usta=.3", 0.06, 0.02, 2.6, 0.1, 0.1),
                        K(40, "udoL=.25 kolanoL=.35 udoP=-.35 kolanoP=.3 tulow=.12 glowa=.06 biodroX=-.08", 0.12, 0.1, 2.2),
                        K(66, "", 0.15, 0.1, 2.2));
            }
            return null;
        }

        /// <summary>Młynek (180 tików): ostrze wiruje przed nim kołem, cztery cięcia — trafienia w tikach 42, 74, 106, 138.</summary>
        static Poza Mlynek(Stroj s, double t)
        {
            var g = Garda(s);
            var w = Gl(t / 18) * (1 - Gl((t - 152) / 26));
            // kąt miecza maleje równo: przy każdym trafieniu (co 32 tiki) poziomo przed sobą
            var fi = TAU * (t - 42) / 32;
            var kat = 1.55 - fi;
            var p = Z(WYPAD + " tulow=.24", g);
            p = Poza.Miesz(g, p, w);
            var mx = 0.2 + 0.05 * Math.Cos(fi); var my = 0.02 + 0.05 * Math.Sin(fi);
            Siegnij(ref p, true, Lerp(0.15, mx, w), Lerp(0.1, my, w));
            Trzyma(ref p, true, Lerp(2.2, kat, w));
            Siegnij(ref p, false, 0.15, s.Tarcza ? 0.14 : 0.2);
            p.plaszcz = 0.3 * w;
            return p;
        }

        /// <summary>Szarża z tarczą (132 tiki, trafienie 84, doskok 20–80): rozbieg z tarczą przed sobą i zderzenie.</summary>
        static Poza Szarza(Stroj s, double t)
        {
            var g = Garda(s);
            var bieg = BIEG.Kopia(); bieg.pochyl = 0.34; bieg.wymach = 0;
            Poza p;
            if (t < 20) p = Poza.Miesz(g, Z("udoL=.5 kolanoL=.7 udoP=-.3 kolanoP=.5 tulow=.3", g), Gl(t / 20));
            else if (t < 80)
            {
                // trzy kroki rozbiegu
                var u = (t - 20) / 60 * 1.5;
                p = Chod(Frac(u + 0.25), bieg, g, false);
                p.biodroY = null;
                p.plaszcz = 0.8;
            }
            else if (t < 96) p = Z(WYPAD_GLEBOKI + " tulow=.5 glowa=.15 plaszcz=.5", g);
            else p = Poza.Miesz(Z(WYPAD_GLEBOKI + " tulow=.5 glowa=.15", g), g, Gl((t - 96) / 36));
            var tarcza = t < 20 ? Gl(t / 20) : t < 96 ? 1 : 1 - Gl((t - 96) / 36);
            Siegnij(ref p, false, Lerp(0.15, 0.26, tarcza), Lerp(0.14, 0.08, tarcza));
            Siegnij(ref p, true, Lerp(0.15, 0.02, tarcza), Lerp(0.1, 0.2, tarcza));
            Trzyma(ref p, true, Lerp(2.2, 1.1, tarcza));
            if (t >= 84 && t < 96) { p.tulow += 0.05; }
            return p;
        }

        /// <summary>Taran barkiem (108 tików, trafienie 62, doskok 30–60): głowa w dół, bark naprzód i całym ciałem w wroga.</summary>
        static Poza Taran(Stroj s, double t)
        {
            var g = Garda(s);
            var nisko = Z("udoL=.5 kolanoL=.75 udoP=-.3 kolanoP=.5 tulow=.55 glowa=.5", g);
            Poza p;
            if (t < 30) p = Poza.Miesz(g, nisko, Gl(t / 24));
            else if (t < 62)
            {
                var bieg = BIEG.Kopia(); bieg.pochyl = 0.5; bieg.wymach = 0; bieg.glowa = 0.6;
                p = Chod(Frac((t - 30) / 32 + 0.25), bieg, nisko, false);
                p.biodroY = null;
            }
            else if (t < 74) p = Z(WYPAD_GLEBOKI + " tulow=.62 glowa=.55", g);
            else p = Poza.Miesz(Z(WYPAD_GLEBOKI + " tulow=.62 glowa=.55", g), g, Gl((t - 74) / 34));
            var bark = t < 74 ? Gl(t / 24) : 1 - Gl((t - 74) / 34);
            // bliższy bark naprzód: ręka z mieczem przyciśnięta do boku
            Siegnij(ref p, true, Lerp(0.15, 0.04, bark), Lerp(0.1, 0.16, bark));
            Trzyma(ref p, true, Lerp(2.2, 1.2, bark));
            Siegnij(ref p, false, Lerp(0.15, 0.08, bark), Lerp(0.14, 0.18, bark));
            return p;
        }

        /// <summary>Zakłada następną część zbroi z wieszaka (postęp 0…1): sięga, zdejmuje oburącz, dopasowuje na sobie.</summary>
        static KlatkaPostaci Zaklada(Stroj s, double k)
        {
            var p = Baza(s);
            p.udoL = 0.06; p.kolanoL = 0.06; p.udoP = -0.04; p.kolanoP = 0.03;
            p.ramieP = 0.05; p.lokiecP = 0.07; p.ramieL = -0.06; p.lokiecL = 0.06;
            p.tulow = 0.04;
            var gora = p; gora.tulow = 0.07; gora.glowa = 0.12;
            var unies = Gl((k - 0.22) / 0.18) * 0.06;
            Siegnij(ref gora, true, 0.31, 0.07 - unies); Siegnij(ref gora, false, 0.28, 0.09 - unies);
            gora.dlonP = 1.4; gora.dlonL = 1.4;
            var cel = p; cel.tulow = 0.08; cel.glowa = 0.25;
            // która część teraz: następna po tych, które nosi
            double tx, ty;
            switch (s.zbroja)
            {
                case 0: tx = 0.06; ty = -0.2; cel.glowa = 0.02; break;                  // hełm na głowę
                case 1: tx = 0.03; ty = 0.01; break;                                    // naramienniki
                case 3:                                                                 // nakolanniki — klęka
                    tx = 0.15; ty = 0.5;
                    cel.udoL = 1.3; cel.kolanoL = 1.5; cel.stopaL = 0; cel.udoP = 0.14; cel.kolanoP = 1.66; cel.stopaP = -0.9 + 1.5;
                    cel.tulow = 0.42; cel.glowa = 0.35;
                    break;
                case 4: tx = 0.17; ty = 0.12; break;                                    // tarcza na ramię
                default: tx = 0.13; ty = 0.12; break;                                   // napierśnik
            }
            var szarp = k > 0.6 && k < 0.9 ? 0.025 * Math.Sin(k * 60) : 0;
            Siegnij(ref cel, true, tx + szarp, ty); Siegnij(ref cel, false, tx - 0.02, ty + 0.02 - szarp);
            cel.dlonP = 1.2; cel.dlonL = 1.2;
            p = Poza.Miesz(Poza.Miesz(p, gora, Gl(k / 0.22)), cel, Gl((k - 0.4) / 0.2));
            // po dopasowaniu wraca do spoczynku
            p = Poza.Miesz(p, Baza(s), Gl((k - 0.9) / 0.1) * 0.6);
            return new KlatkaPostaci(p, new Rekwizyty { pochwa = true });
        }

        /// <summary>Modlitwa rycerza (klęczy z mieczem), powalenie (pada na plecy, leży, wstaje wsparty na mieczu) i ścięcie głowy.</summary>
        static KlatkaPostaci RycerzPowalonyIScinanie(Stroj s, string n, double u)
        {
            var r = new Rekwizyty { wP = Narzedzie.Miecz };
            var lezy = Z("obrot=-1.57 tulow=.0 glowa=-.15 udoL=.35 kolanoL=.6 udoP=.15 kolanoP=.35 ramieP=.5 lokiecP=.4 dlonP=.5 ramieL=-.2 lokiecL=.5 plaszcz=-.4");
            switch (n)
            {
                case "modli": return Modli(s, u, 0);
                case "powalony-pada":
                    {
                        // 22 tiki: cios zwala go z nóg — pada na plecy
                        var g = Garda(s);
                        var t = u * 22;
                        var p = Klucze(t,
                            (0, g, 0),
                            (6, Z("tulow=-.3 glowa=-.3 obrot=-.25 usta=.6 udoL=.4 kolanoL=.2 udoP=-.1 kolanoP=.2", g), 2),
                            (14, Z("tulow=-.2 glowa=-.25 obrot=-.95 udoL=.7 kolanoL=.6 udoP=.4 kolanoP=.5 usta=.5 plaszcz=-.6", g), 1),
                            (22, lezy, 1));
                        return new KlatkaPostaci(p, r);
                    }
                case "powalony-lezy":
                    {
                        // leży na plecach, ciężko oddycha, unosi głowę
                        var p = lezy;
                        var odd = Math.Sin(TAU * u);
                        p.tulow += 0.02 * odd; p.glowa += -0.08 - 0.06 * odd; p.kolanoL += 0.05 * odd;
                        return new KlatkaPostaci(p, r);
                    }
                case "powalony-wstaje":
                    {
                        // przewraca się na bok, siada, klęka wsparty na mieczu wbitym w ziemię, wstaje i wraca do gardy
                        var g = Garda(s);
                        // siedzi na ziemi: dalsze kolano w górze, bliższa noga wyciągnięta, podpiera się za plecami
                        var siedzi = Z("obrot=0 tulow=-.3 glowa=.15 udoL=2.3 kolanoL=2.15 stopaL=0 udoP=1.57 kolanoP=.05 stopaP=-.2", g);
                        Siegnij(ref siedzi, false, -0.12, 0.3);
                        var kleczy = Z("udoL=1.35 kolanoL=1.45 stopaL=-.3 udoP=.08 kolanoP=1.62 stopaP=.6 tulow=.32 glowa=.12", g);
                        var podpiera = Z("udoL=.75 kolanoL=.95 udoP=-.2 kolanoP=.6 tulow=.38 glowa=.05", g);
                        // miecz wbity sztychem w ziemię przed nim (bliższa dłoń na głowicy)
                        Siegnij(ref kleczy, true, 0.2, 0.24); Trzyma(ref kleczy, true, 0.05);
                        Siegnij(ref podpiera, true, 0.22, 0.26); Trzyma(ref podpiera, true, 0.12);
                        Siegnij(ref siedzi, true, -0.05, 0.25); Trzyma(ref siedzi, true, 1.2);
                        // przekręca się na kolano, dalsza dłoń wsparta o ziemię (biodra cały czas nisko)
                        var obrot = Z("obrot=0 tulow=.55 glowa=.1 udoL=1.25 kolanoL=2.1 stopaL=.2 udoP=.35 kolanoP=1.95 stopaP=.6", g);
                        Siegnij(ref obrot, false, 0.14, 0.33);
                        Siegnij(ref obrot, true, 0.18, 0.3); Trzyma(ref obrot, true, 0.3);
                        var p = Klucze(u,
                            (0, lezy, 0),
                            (0.22, siedzi, 0),
                            (0.34, obrot, 0),
                            (0.45, kleczy, 0),
                            (0.68, podpiera, 0),
                            (0.86, Z("tulow=.18 glowa=.0", g), 0),
                            (1.0, g, 0));
                        p.biodroY = null;
                        return new KlatkaPostaci(p, r);
                    }
                default:
                    {
                        // „Ścięcie głowy” (156 tików, trafienie 100, doskok 40–96): przysiad, wyskok z mieczem oburącz za
                        // plecami i cięcie w poprzek karku — ląduje w przysiadzie i wraca do gardy
                        var t = u * 156;
                        var p = Ruch(s, t,
                            K(0, "", 0.15, 0.1, 2.2),
                            KO(30, PRZYSIAD + " tulow=.48", -0.06, 0.2, -0.9 + TAU),
                            KO(40, PRZYSIAD + " wzlot=.05 tulow=.36", -0.07, 0.14, -0.7 + TAU, 1),
                            KO(60, ZWINIETY + " wzlot=.32 tulow=.08 glowa=-.15 plaszcz=-.7", -0.08, -0.12, 4.3, 2),
                            KO(86, ZWINIETY + " wzlot=.36 tulow=.05 glowa=-.12 plaszcz=-.6", -0.04, -0.18, 4.0),
                            KO(96, "udoL=.8 kolanoL=1.1 udoP=.3 kolanoP=1.1 wzlot=.26 tulow=.15 plaszcz=-.2", 0.14, -0.1, 2.6, 1),
                            KO(100, "udoL=.7 kolanoL=.9 udoP=.15 kolanoP=.9 wzlot=.2 tulow=.3 plaszcz=.2", 0.3, 0.0, 1.6, 1),
                            KO(110, "udoL=.6 kolanoL=.8 udoP=.0 kolanoP=.8 wzlot=.06 tulow=.4 plaszcz=.5", 0.2, 0.16, 0.6),
                            KO(120, PRZYSIAD + " tulow=.5 plaszcz=.4", 0.18, 0.22, 0.45),
                            K(140, "tulow=.2", 0.17, 0.12, 1.8),
                            K(156, "", 0.15, 0.1, 2.2));
                        return new KlatkaPostaci(p, r);
                    }
            }
        }
    }
}
