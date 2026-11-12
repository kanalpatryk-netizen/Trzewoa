// Wygenerowane z alpha-1/src/nastawy/walka.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/walka.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/walka.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWalka
    {
        public static Typ_RUCHY_RYCERZA RUCHY_RYCERZA = new Typ_RUCHY_RYCERZA
        {
            ciecieZGory = new RuchRycerza
            {
                nazwa = "Cięcie z góry",
                rodzaj = "atak",
                dl = 102,
                traf = new double[][] { new double[] { 56, 2 } },
                waga = 1,
                opis = "Miecz unosi się za głowę, krok w przód i cięcie z całej siły w dół.",
            },
            pchniecie = new RuchRycerza
            {
                nazwa = "Pchnięcie",
                rodzaj = "atak",
                dl = 78,
                traf = new double[][] { new double[] { 40, 1.6 } },
                waga = 1,
                opis = "Ostrze cofnięte do biodra, wypad i pchnięcie sztychem — sięga dalej niż cięcie.",
                zasieg = 0.35,
            },
            ciecieBoczne = new RuchRycerza
            {
                nazwa = "Cięcie z boku",
                rodzaj = "atak",
                dl = 90,
                traf = new double[][] { new double[] { 48, 1.8 } },
                waga = 1,
                opis = "Zamach zza pleców i płaskie cięcie na wysokości barku, ze skrętem bioder.",
            },
            ciecieOdwrotne = new RuchRycerza
            {
                nazwa = "Cięcie odwrotne",
                rodzaj = "atak",
                dl = 90,
                traf = new double[][] { new double[] { 46, 1.8 } },
                waga = 0.8,
                opis = "Miecz założony na drugie ramię i cięcie z odwrotnej strony — często zaraz po cięciu z boku.",
            },
            seriaTrzech = new RuchRycerza
            {
                nazwa = "Seria trzech cięć",
                rodzaj = "atak",
                dl = 168,
                traf = new double[][] { new double[] { 46, 1 }, new double[] { 86, 1 }, new double[] { 128, 1.1 } },
                waga = 0.8,
                opis = "Z góry, z boku i pchnięcie — trzy ciosy jeden za drugim, krok za krokiem w przód.",
            },
            ciecieOdDolu = new RuchRycerza
            {
                nazwa = "Cięcie od dołu",
                rodzaj = "atak",
                dl = 96,
                traf = new double[][] { new double[] { 54, 1.9 } },
                waga = 0.9,
                opis = "Przysiad z ostrzem przy ziemi i cięcie w górę, wstając na palce.",
            },
            piruet = new RuchRycerza
            {
                nazwa = "Cięcie z obrotu",
                rodzaj = "atak",
                dl = 132,
                traf = new double[][] { new double[] { 78, 3 } },
                waga = 0.9,
                opis = "Weteran: pełny obrót z płaszczem w powietrzu i cięcie z rozpędu.",
                weteran = true,
                chwieje = true,
            },
            ciosZWyskoku = new RuchRycerza
            {
                nazwa = "Cios z wyskoku",
                rodzaj = "atak",
                dl = 150,
                traf = new double[][] { new double[] { 96, 3.4 } },
                waga = 0.8,
                opis = "Weteran: przysiad, skok z mieczem nad głową i cios przy lądowaniu — z dwóch kafli.",
                zDaleka = 2.6,
                weteran = true,
                ogluszenie = 40,
                doskok = new double[] { 0.9, 40, 92 },
                chwieje = true,
            },
            mlynek = new RuchRycerza
            {
                nazwa = "Młynek",
                rodzaj = "atak",
                dl = 180,
                traf = new double[][]
                {
                    new double[] { 42, 0.95 },
                    new double[] { 74, 0.95 },
                    new double[] { 106, 0.95 },
                    new double[] { 138, 0.95 },
                },
                waga = 0.8,
                opis = "Weteran: ostrze wiruje przed nim kołem — cztery cięcia, jedno za drugim.",
                weteran = true,
            },
            finta = new RuchRycerza
            {
                nazwa = "Finta i pchnięcie",
                rodzaj = "atak",
                dl = 120,
                traf = new double[][] { new double[] { 86, 2.8 } },
                waga = 0.8,
                opis = "Weteran: udaje cięcie z góry, a gdy wróg się zasłoni — nagłe pchnięcie dołem. Demon nie zdąży zasłonić się ręką.",
                zasieg = 0.35,
                weteran = true,
                nieDoZablokowania = true,
                chwieje = true,
            },
            egzekucja = new RuchRycerza
            {
                nazwa = "Cios dobijający",
                rodzaj = "atak",
                dl = 168,
                traf = new double[][] { new double[] { 114, 4.6 } },
                waga = 3,
                opis = "Weteran, na osłabionego wroga: miecz oburącz za głową, długi zamach i cios, po którym klęka.",
                weteran = true,
                wrogPonizej = 0.35,
                chwieje = true,
            },
            uderzenieTarcza = new RuchRycerza
            {
                nazwa = "Uderzenie tarczą",
                rodzaj = "atak",
                dl = 84,
                traf = new double[][] { new double[] { 42, 1.4 } },
                waga = 0.9,
                opis = "Z tarczą: krok i pchnięcie tarczą w twarz wroga — ogłusza go i opóźnia jego cios.",
                zbroja = new string[] { "tarcza" },
                ogluszenie = 60,
                odrzut = 0.5,
            },
            szarzaZTarcza = new RuchRycerza
            {
                nazwa = "Szarża z tarczą",
                rodzaj = "atak",
                dl = 132,
                traf = new double[][] { new double[] { 84, 2.6 } },
                waga = 0.7,
                opis = "Z tarczą i w nakolannikach: rozbieg z tarczą przed sobą i zderzenie — zaczyna z prawie czterech kafli.",
                zDaleka = 3.8,
                zbroja = new string[] { "tarcza", "nakolanniki" },
                ogluszenie = 50,
                odrzut = 1,
                doskok = new double[] { 1.7, 20, 80 },
            },
            taranBarkiem = new RuchRycerza
            {
                nazwa = "Taran barkiem",
                rodzaj = "atak",
                dl = 108,
                traf = new double[][] { new double[] { 62, 2.2 } },
                waga = 0.8,
                opis = "W naramiennikach: głowa w dół, bark naprzód i całym ciałem w wroga.",
                zbroja = new string[] { "naramienniki" },
                odrzut = 0.8,
                doskok = new double[] { 0.6, 30, 60 },
            },
            kolano = new RuchRycerza
            {
                nazwa = "Cios kolanem",
                rodzaj = "atak",
                dl = 72,
                traf = new double[][] { new double[] { 38, 1.4 } },
                waga = 0.8,
                opis = "W nakolannikach: chwyta wroga wolną ręką i wbija mu kolano — szybki, krótki cios.",
                zbroja = new string[] { "nakolanniki" },
                ogluszenie = 25,
            },
            uderzenieHelmem = new RuchRycerza
            {
                nazwa = "Uderzenie hełmem",
                rodzaj = "atak",
                dl = 80,
                traf = new double[][] { new double[] { 44, 1.5 } },
                waga = 0.7,
                opis = "W hełmie: odchyla się i bije czołem hełmu — wróg się zatacza.",
                zbroja = new string[] { "helm" },
                ogluszenie = 45,
            },
            kontraNapiersnika = new RuchRycerza
            {
                nazwa = "Kontra na napierśniku",
                rodzaj = "atak",
                dl = 110,
                traf = new double[][] { new double[] { 70, 2.4 } },
                waga = 0,
                opis = "W napierśniku: przyjmuje cios na blachę (rana o połowę mniejsza), nie cofa się i od razu tnie.",
                zbroja = new string[] { "napiersnik" },
            },
            blokTarcza = new RuchRycerza
            {
                nazwa = "Blok tarczą",
                rodzaj = "obrona",
                dl = 46,
                opis = "Z tarczą: zasłania się w porę — cios zostawia ułamek rany, sypią się iskry.",
                zbroja = new string[] { "tarcza" },
            },
            parowanie = new RuchRycerza
            {
                nazwa = "Parowanie",
                rodzaj = "obrona",
                dl = 48,
                opis = "Weteran: odbija cios ostrzem (bez rany) i od razu jest gotów do kontry.",
                weteran = true,
            },
            unik = new RuchRycerza
            {
                nazwa = "Unik",
                rodzaj = "obrona",
                dl = 54,
                opis = "W nakolannikach: odskok w tył przed ciosem — bez rany.",
                zbroja = new string[] { "nakolanniki" },
            },
            trafionyLekko = new RuchRycerza
            {
                nazwa = "Lekkie trafienie",
                rodzaj = "reakcja",
                dl = 30,
                opis = "Mała rana: wzdryga się i walczy dalej (cios, który zaczął, idzie do końca).",
            },
            trafionyMocno = new RuchRycerza
            {
                nazwa = "Mocne trafienie",
                rodzaj = "reakcja",
                dl = 66,
                opis = "Duża rana: cios przerywa mu atak, zatacza się w tył i łapie równowagę.",
            },
            powalony = new RuchRycerza
            {
                nazwa = "Powalony",
                rodzaj = "reakcja",
                dl = 148,
                opis = "Najcięższe ciosy demona zwalają go z nóg: pada na plecy, leży i wstaje, podpierając się mieczem.",
            },
            garda = new RuchRycerza
            {
                nazwa = "Garda",
                rodzaj = "postawa",
                dl = 0,
                opis = "Między ciosami: na ugiętych nogach, tarcza przed sobą, miecz w górze — oczy na wroga.",
            },
            podejscie = new RuchRycerza
            {
                nazwa = "Podejście w gardzie",
                rodzaj = "postawa",
                dl = 0,
                opis = "Do wroga: krótkie, ostrożne kroki, nie opuszczając gardy.",
            },
        };

        /// <summary>Obrona i reakcje rycerza.</summary>
        public static Typ_OBRONA_RYCERZA OBRONA_RYCERZA = new Typ_OBRONA_RYCERZA
        {
            przerwa = 18,
            mnoznik = 1.12,
            blok = new Typ_OBRONA_RYCERZA_blok
            {
                szansa = 0.38,
                weteran = 0.12,
                rany = 0.3,
            },
            parowanie = new Typ_OBRONA_RYCERZA_parowanie
            {
                szansa = 0.22,
            },
            unik = new Typ_OBRONA_RYCERZA_unik
            {
                szansa = 0.18,
                krok = 0.55,
            },
            kontra = new Typ_OBRONA_RYCERZA_kontra
            {
                szansa = 0.3,
                rany = 0.55,
            },
            mocneOd = 0.12,
            powalenieOd = 0.3,
            powalajacyOd = 0.05,
            lezy = 84,
            odrzutPowalenia = 0.7,
            zatacza = 40,
            odrzutMocny = 0.3,
            kombo = new Typ_OBRONA_RYCERZA_kombo
            {
                ciecieBoczne = "ciecieOdwrotne",
                kolano = "ciecieZGory",
                uderzenieTarcza = "pchniecie",
                uderzenieHelmem = "ciecieOdDolu",
                parowanie = "pchniecie",
            },
            komboWaga = 3.5,
        };

        public static Typ_RUCHY_BOSSA RUCHY_BOSSA = new Typ_RUCHY_BOSSA
        {
            zGory = new RuchBossa
            {
                nazwa = "Cios z góry",
                rodzaj = "atak",
                dl = 150,
                traf = new double[][] { new double[] { 70, 1.35 } },
                zasieg = 2.4,
                powala = 0.5,
                waga = 1,
                opis = "Ręka nad głowę, odchylenie i cios pięścią w dół — powala rycerza, jeśli się nie obroni.",
            },
            zamach = new RuchBossa
            {
                nazwa = "Zamach pazurami",
                rodzaj = "atak",
                dl = 130,
                traf = new double[][] { new double[] { 64, 1.1 } },
                zasieg = 2.7,
                waga = 1,
                opis = "Ręka przez pierś i łukiem przed siebie — pazury ciągną smugę ognia i trafiają każdego w zasięgu.",
                luk = true,
            },
            podciecie = new RuchBossa
            {
                nazwa = "Podcięcie od dołu",
                rodzaj = "atak",
                dl = 140,
                traf = new double[][] { new double[] { 70, 1.2 } },
                zasieg = 2.3,
                powala = 0.45,
                waga = 0.9,
                opis = "Przysiad, ręka przy ziemi i cios w górę — wyrzuca rycerza z nóg.",
                odrzut = 0.8,
            },
            podwojnyZamach = new RuchBossa
            {
                nazwa = "Podwójny zamach",
                rodzaj = "atak",
                dl = 190,
                traf = new double[][] { new double[] { 70, 0.75 }, new double[] { 118, 0.75 } },
                zasieg = 2.6,
                waga = 0.8,
                opis = "Najpierw jedna ręka, zaraz druga — dwa zamachy pazurami z obrotem tułowia.",
            },
            zgniecenie = new RuchBossa
            {
                nazwa = "Zgniecenie oburącz",
                rodzaj = "atak",
                dl = 170,
                traf = new double[][] { new double[] { 92, 1.5 } },
                zasieg = 2.3,
                waga = 0.7,
                opis = "Obie ręce rozłożone szeroko i klaśnięcie na rycerzu — fala uderzeniowa, rycerz ogłuszony.",
                ogluszenie = 60,
            },
            przygniecenie = new RuchBossa
            {
                nazwa = "Przygniecenie dłonią",
                rodzaj = "atak",
                dl = 230,
                traf = new double[][] { new double[] { 80, 1 }, new double[] { 150, 0.45 } },
                zasieg = 2.4,
                waga = 0.35,
                opis = "Otwarta dłoń spada na rycerza i przygniata go do ziemi — dociska jeszcze raz, potem puszcza.",
                przygniata = 110,
            },
            odepchniecie = new RuchBossa
            {
                nazwa = "Odepchnięcie",
                rodzaj = "atak",
                dl = 100,
                traf = new double[][] { new double[] { 50, 0.8 } },
                zasieg = 1.7,
                waga = 0.6,
                opis = "Gdy rycerz podejdzie za blisko: grzbietem dłoni na odlew — odrzuca go daleko.",
                odrzut = 1.6,
            },
            tupniecie = new RuchBossa
            {
                nazwa = "Tupnięcie",
                rodzaj = "obszar",
                dl = 140,
                traf = new double[][] { new double[] { 76, 0.75 } },
                waga = 0.8,
                opis = "Kolano w górę i stopa w posadzkę — fala ziemi rani i chwieje każdego wokół.",
                promien = 3.2,
                ogluszenie = 40,
            },
            tchnienie = new RuchBossa
            {
                nazwa = "Ogniste tchnienie",
                rodzaj = "obszar",
                dl = 220,
                zasieg = 5.2,
                waga = 0.9,
                opis = "Gdy słabnie: wciąga powietrze, odchyla głowę i zieje ogniem przed siebie — pali każdego w płomieniach.",
                oddech = new double[] { 84, 174, 10 },
                podmuch = 0.13,
                zycieDo = 0.65,
            },
            wybuchAureoli = new RuchBossa
            {
                nazwa = "Wybuch aureoli",
                rodzaj = "obszar",
                dl = 200,
                traf = new double[][] { new double[] { 118, 0.95 } },
                waga = 0.7,
                opis = "Od połowy życia: skulony zbiera ogień w aureoli — i rozrzuca ręce, a krąg ognia zwala z nóg tych blisko.",
                promien = 4.6,
                powalaDo = 2.6,
                odrzut = 1.2,
                zycieDo = 0.5,
            },
            biczLancucha = new RuchBossa
            {
                nazwa = "Bicz z łańcucha",
                rodzaj = "dystans",
                dl = 160,
                traf = new double[][] { new double[] { 86, 1 } },
                zasieg = 5.6,
                waga = 1.1,
                opis = "Zerwany łańcuch z kajdanów jak bicz — sięga rycerza z pięciu kafli.",
                od = 2.2,
            },
            szarza = new RuchBossa
            {
                nazwa = "Szarża",
                rodzaj = "dystans",
                dl = 170,
                traf = new double[][] { new double[] { 0, 1.3 } },
                zasieg = 7,
                powala = 0.8,
                waga = 0.8,
                opis = "Pochyla głowę i rusza na rycerza z kilku kafli — przy zderzeniu go powala i odrzuca.",
                od = 3,
                odrzut = 1.6,
                przemieszcza = new double[] { 48, 104, 5 },
            },
            uderzenieWZiemie = new RuchBossa
            {
                nazwa = "Uderzenie w ziemię",
                rodzaj = "zdolnosc",
                dl = 220,
                traf = new double[][] { new double[] { 110, 0 } },
                opis = "Co jakiś czas: ręce w górę z rykiem i obie pięści w ziemię — zasypuje kawałek drogi wiernych.",
                promien = 3,
                ogluszenie = 30,
            },
            ryk = new RuchBossa
            {
                nazwa = "Ryk",
                rodzaj = "zdolnosc",
                dl = 130,
                opis = "Po zabiciu kogoś, po klęknięciu i w ciszy: głowa w tył, szczęka otwarta, ręce szeroko.",
            },
            rozkazRzut = new RuchBossa
            {
                nazwa = "Rozkaz: rzut",
                rodzaj = "zdolnosc",
                dl = 0,
                opis = "Wskazuje rycerza, zaciska dłoń, unosi i ciska — dłoń z otchłani robi to samo.",
            },
            rozkazTarcza = new RuchBossa
            {
                nazwa = "Rozkaz: tarcza",
                rodzaj = "zdolnosc",
                dl = 0,
                opis = "Krzyżuje ręce — dłoń z otchłani wyrasta przed nim jak mur; za nią się śmieje.",
            },
            rozkazZawal = new RuchBossa
            {
                nazwa = "Rozkaz: zawał",
                rodzaj = "zdolnosc",
                dl = 0,
                opis = "Ręce do stropu, drze go pazurami i ściąga w dół — szpony dłoni rwą skałę.",
            },
            blok = new RuchBossa
            {
                nazwa = "Blok przedramieniem",
                rodzaj = "obrona",
                dl = 0,
                opis = "Gdy rycerz bierze zamach, czasem zasłania się przedramieniem — cios zostawia połowę rany (fintę przepuszcza).",
            },
            zachwianie = new RuchBossa
            {
                nazwa = "Zachwianie",
                rodzaj = "reakcja",
                dl = 96,
                opis = "Po ciężkim ciosie zatacza się i nie bije; przy połowie i ćwierci życia pada na kolano, a potem ryczy.",
            },
        };

        /// <summary>Demon: przerwy, reakcje i progi.</summary>
        public static Typ_WALKA_BOSSA WALKA_BOSSA = new Typ_WALKA_BOSSA
        {
            przerwa = 50,
            blok = new Typ_WALKA_BOSSA_blok
            {
                szansa = 0.22,
                ranny = 0.35,
                rany = 0.45,
            },
            chwiejeOd = 0.12,
            chwiejeCiosOd = 0.05,
            odporny = 360,
            kleka = new double[] { 0.5, 0.25 },
            dlKleku = 176,
            rykCisza = 1800,
        };

        /// <summary>Typ IdRuchuRycerza z TS — dozwolone napisy.</summary>
        public static readonly string[] IdRuchuRycerza = { "ciecieZGory", "pchniecie", "ciecieBoczne", "ciecieOdwrotne", "seriaTrzech", "ciecieOdDolu", "piruet", "ciosZWyskoku", "mlynek", "finta", "egzekucja", "uderzenieTarcza", "szarzaZTarcza", "taranBarkiem", "kolano", "uderzenieHelmem", "kontraNapiersnika", "blokTarcza", "parowanie", "unik", "trafionyLekko", "trafionyMocno", "powalony", "garda", "podejscie" };

        /// <summary>Typ IdRuchuBossa z TS — dozwolone napisy.</summary>
        public static readonly string[] IdRuchuBossa = { "zGory", "zamach", "podciecie", "podwojnyZamach", "zgniecenie", "przygniecenie", "odepchniecie", "tupniecie", "tchnienie", "wybuchAureoli", "biczLancucha", "szarza", "uderzenieWZiemie", "ryk", "rozkazRzut", "rozkazTarcza", "rozkazZawal", "blok", "zachwianie" };
    }

    public sealed partial class RuchRycerza
    {
        public string nazwa;
        public string rodzaj;
        /// <summary>długość (tiki)</summary>
        public double dl;
        /// <summary>trafienia: [tik od początku ruchu, mnożnik siły]</summary>
        public double[][] traf;
        /// <summary>waga w losowaniu ataku (0 — sam się nie wybiera: kontra)</summary>
        public double? waga;
        public string opis;
        /// <summary>dodatkowy zasięg ciosu (kafle) i z jakiej odległości można zacząć (szarża, wyskok)</summary>
        public double? zasieg;
        public double? zDaleka;
        /// <summary>wymaga: weterana i/lub tych części zbroi (wszystkich)</summary>
        public bool? weteran;
        public string[] zbroja;
        /// <summary>po trafieniu: ogłuszenie celu (tiki, opóźnia jego cios) i odrzut (kafle — tylko Strażnicy, demon za ciężki)</summary>
        public double? ogluszenie;
        public double? odrzut;
        /// <summary>doskok w stronę celu: [kafle, od tiku, do tiku]</summary>
        public double[] doskok;
        /// <summary>demon nie zasłoni się przed nim przedramieniem</summary>
        public bool? nieDoZablokowania;
        /// <summary>tylko na wroga, któremu zostało mniej życia niż ten ułamek</summary>
        public double? wrogPonizej;
        /// <summary>demon się chwieje (zachwianie) po takim trafieniu</summary>
        public bool? chwieje;
    }

    public sealed partial class Typ_RUCHY_RYCERZA
    {
        public RuchRycerza ciecieZGory;
        public RuchRycerza pchniecie;
        public RuchRycerza ciecieBoczne;
        public RuchRycerza ciecieOdwrotne;
        public RuchRycerza seriaTrzech;
        public RuchRycerza ciecieOdDolu;
        public RuchRycerza piruet;
        public RuchRycerza ciosZWyskoku;
        public RuchRycerza mlynek;
        public RuchRycerza finta;
        public RuchRycerza egzekucja;
        public RuchRycerza uderzenieTarcza;
        public RuchRycerza szarzaZTarcza;
        public RuchRycerza taranBarkiem;
        public RuchRycerza kolano;
        public RuchRycerza uderzenieHelmem;
        public RuchRycerza kontraNapiersnika;
        public RuchRycerza blokTarcza;
        public RuchRycerza parowanie;
        public RuchRycerza unik;
        public RuchRycerza trafionyLekko;
        public RuchRycerza trafionyMocno;
        public RuchRycerza powalony;
        public RuchRycerza garda;
        public RuchRycerza podejscie;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "ciecieZGory", "pchniecie", "ciecieBoczne", "ciecieOdwrotne", "seriaTrzech", "ciecieOdDolu", "piruet", "ciosZWyskoku", "mlynek", "finta", "egzekucja", "uderzenieTarcza", "szarzaZTarcza", "taranBarkiem", "kolano", "uderzenieHelmem", "kontraNapiersnika", "blokTarcza", "parowanie", "unik", "trafionyLekko", "trafionyMocno", "powalony", "garda", "podejscie" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public RuchRycerza this[string klucz] => klucz switch
        {
            "ciecieZGory" => ciecieZGory,
            "pchniecie" => pchniecie,
            "ciecieBoczne" => ciecieBoczne,
            "ciecieOdwrotne" => ciecieOdwrotne,
            "seriaTrzech" => seriaTrzech,
            "ciecieOdDolu" => ciecieOdDolu,
            "piruet" => piruet,
            "ciosZWyskoku" => ciosZWyskoku,
            "mlynek" => mlynek,
            "finta" => finta,
            "egzekucja" => egzekucja,
            "uderzenieTarcza" => uderzenieTarcza,
            "szarzaZTarcza" => szarzaZTarcza,
            "taranBarkiem" => taranBarkiem,
            "kolano" => kolano,
            "uderzenieHelmem" => uderzenieHelmem,
            "kontraNapiersnika" => kontraNapiersnika,
            "blokTarcza" => blokTarcza,
            "parowanie" => parowanie,
            "unik" => unik,
            "trafionyLekko" => trafionyLekko,
            "trafionyMocno" => trafionyMocno,
            "powalony" => powalony,
            "garda" => garda,
            "podejscie" => podejscie,
            _ => default!,
        };
    }

    /// <summary>Obrona i reakcje rycerza.</summary>
    public sealed partial class Typ_OBRONA_RYCERZA
    {
        /// <summary>przerwa w gardzie między ciosami (tiki); mnożnik siły ruchów (nadrabia czas obron i reakcji)</summary>
        public double przerwa;
        public double mnoznik;
        /// <summary>blok tarczą: szansa (weteran — więcej) i ile zostaje z rany</summary>
        public Typ_OBRONA_RYCERZA_blok blok;
        /// <summary>parowanie (weteran): szansa — rany nie ma, następny cios od razu</summary>
        public Typ_OBRONA_RYCERZA_parowanie parowanie;
        /// <summary>unik (nakolanniki): szansa, odskok (kafle)</summary>
        public Typ_OBRONA_RYCERZA_unik unik;
        /// <summary>kontra (napierśnik): szansa, ile zostaje z rany</summary>
        public Typ_OBRONA_RYCERZA_kontra kontra;
        /// <summary>reakcja na ranę (ułamek największego życia): mocne trafienie od, powalenie od (albo cios „powalający” od)</summary>
        public double mocneOd;
        public double powalenieOd;
        public double powalajacyOd;
        /// <summary>powalony: tyle tików leży (ogłuszony), odrzut (kafle)</summary>
        public double lezy;
        public double odrzutPowalenia;
        /// <summary>mocne trafienie: tyle tików stoi i łapie równowagę, odrzut</summary>
        public double zatacza;
        public double odrzutMocny;
        /// <summary>kombinacje: po tym ruchu tamten waży tyle razy więcej</summary>
        public Typ_OBRONA_RYCERZA_kombo kombo;
        public double komboWaga;
    }

    public sealed partial class Typ_OBRONA_RYCERZA_blok
    {
        public double szansa;
        public double weteran;
        public double rany;
    }

    public sealed partial class Typ_OBRONA_RYCERZA_parowanie
    {
        public double szansa;
    }

    public sealed partial class Typ_OBRONA_RYCERZA_unik
    {
        public double szansa;
        public double krok;
    }

    public sealed partial class Typ_OBRONA_RYCERZA_kontra
    {
        public double szansa;
        public double rany;
    }

    public sealed partial class Typ_OBRONA_RYCERZA_kombo
    {
        public string ciecieBoczne;
        public string kolano;
        public string uderzenieTarcza;
        public string uderzenieHelmem;
        public string parowanie;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "ciecieBoczne", "kolano", "uderzenieTarcza", "uderzenieHelmem", "parowanie" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public string this[string klucz] => klucz switch
        {
            "ciecieBoczne" => ciecieBoczne,
            "kolano" => kolano,
            "uderzenieTarcza" => uderzenieTarcza,
            "uderzenieHelmem" => uderzenieHelmem,
            "parowanie" => parowanie,
            _ => default!,
        };
    }

    public sealed partial class RuchBossa
    {
        public string nazwa;
        public string rodzaj;
        /// <summary>długość (tiki); 0 — zależy od chwili (rozkaz trwa, póki dłoń wstaje; blok — do ciosu rycerza)</summary>
        public double dl;
        /// <summary>trafienia: [tik, mnożnik siły demona]</summary>
        public double[][] traf;
        /// <summary>zasięg (kafle) i najmniejsza odległość celu (ataki z dystansu)</summary>
        public double? zasieg;
        /// <summary>szansa, że powali rycerza (gdy go nie obroni), odrzut (kafle), ogłuszenie (tiki)</summary>
        public double? powala;
        /// <summary>waga w losowaniu; dostępny dopiero, gdy demonowi zostało mniej życia niż ten ułamek</summary>
        public double? waga;
        public string opis;
        public double? od;
        /// <summary>obszar: promień wokół demona (kafle); powala bliżej niż `powalaDo`</summary>
        public double? promien;
        public double? powalaDo;
        /// <summary>zamach przed sobą — trafia wszystkich w łuku, nie tylko cel</summary>
        public bool? luk;
        public double? odrzut;
        public double? ogluszenie;
        /// <summary>przygniata dłonią: rycerz leży pod nią tyle tików</summary>
        public double? przygniata;
        /// <summary>tchnienie: [od tiku, do tiku, co ile tików], mnożnik siły na jeden podmuch</summary>
        public double[] oddech;
        public double? podmuch;
        /// <summary>przemieszczenie: [od tiku, do tiku, najwyżej kafli] (szarża — do zderzenia)</summary>
        public double[] przemieszcza;
        public double? zycieDo;
    }

    public sealed partial class Typ_RUCHY_BOSSA
    {
        public RuchBossa zGory;
        public RuchBossa zamach;
        public RuchBossa podciecie;
        public RuchBossa podwojnyZamach;
        public RuchBossa zgniecenie;
        public RuchBossa przygniecenie;
        public RuchBossa odepchniecie;
        public RuchBossa tupniecie;
        public RuchBossa tchnienie;
        public RuchBossa wybuchAureoli;
        public RuchBossa biczLancucha;
        public RuchBossa szarza;
        public RuchBossa uderzenieWZiemie;
        public RuchBossa ryk;
        public RuchBossa rozkazRzut;
        public RuchBossa rozkazTarcza;
        public RuchBossa rozkazZawal;
        public RuchBossa blok;
        public RuchBossa zachwianie;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "zGory", "zamach", "podciecie", "podwojnyZamach", "zgniecenie", "przygniecenie", "odepchniecie", "tupniecie", "tchnienie", "wybuchAureoli", "biczLancucha", "szarza", "uderzenieWZiemie", "ryk", "rozkazRzut", "rozkazTarcza", "rozkazZawal", "blok", "zachwianie" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public RuchBossa this[string klucz] => klucz switch
        {
            "zGory" => zGory,
            "zamach" => zamach,
            "podciecie" => podciecie,
            "podwojnyZamach" => podwojnyZamach,
            "zgniecenie" => zgniecenie,
            "przygniecenie" => przygniecenie,
            "odepchniecie" => odepchniecie,
            "tupniecie" => tupniecie,
            "tchnienie" => tchnienie,
            "wybuchAureoli" => wybuchAureoli,
            "biczLancucha" => biczLancucha,
            "szarza" => szarza,
            "uderzenieWZiemie" => uderzenieWZiemie,
            "ryk" => ryk,
            "rozkazRzut" => rozkazRzut,
            "rozkazTarcza" => rozkazTarcza,
            "rozkazZawal" => rozkazZawal,
            "blok" => blok,
            "zachwianie" => zachwianie,
            _ => default!,
        };
    }

    /// <summary>Demon: przerwy, reakcje i progi.</summary>
    public sealed partial class Typ_WALKA_BOSSA
    {
        /// <summary>przerwa między ruchami (tiki)</summary>
        public double przerwa;
        /// <summary>blok przedramieniem: szansa, gdy rycerz zaczyna cios (poniżej 30% życia — większa), ile zostaje z rany</summary>
        public Typ_WALKA_BOSSA_blok blok;
        /// <summary>
        /// zachwianie: od takiej rany (ułamek życia demona) albo po ciosie, który chwieje (od `chwiejeCiosOd`); potem przez
        /// `odporny` tików się nie chwieje; klęknięcie przy progach życia
        /// </summary>
        public double chwiejeOd;
        public double chwiejeCiosOd;
        public double odporny;
        public double[] kleka;
        public double dlKleku;
        /// <summary>ryk w ciszy: co tyle tików, gdy nikogo nie widzi</summary>
        public double rykCisza;
    }

    public sealed partial class Typ_WALKA_BOSSA_blok
    {
        public double szansa;
        public double ranny;
        public double rany;
    }
}
