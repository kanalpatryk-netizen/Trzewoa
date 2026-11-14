// Port: alpha-1/src/main.ts — start gry: ekran ładowania z etapami (skala, kroje, góry, ekrany, rozgrzewka rysunków),
// potem menu (albo od razu gra obserwowana). Gospodarz (Trzewia.exe, a w silniku jego skrypt) woła Start.Zbuduj po
// utworzeniu App i rusza od ekranu „ladowanie”. Bez części tylko dla przeglądarki: okna obserwatorium i podglądu
// dewelopera w konsoli (window.__trzewia, shot) — patrz PLAN.md, część 5.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;

namespace Trzewia.Aplikacja
{
    public static class Start
    {
        /// <summary>
        /// Rejestruje ekran ładowania; ekrany gry powstają dopiero w jego etapach — samo ich zbudowanie generuje góry.
        /// </summary>
        /// <param name="cel">Narzędzie dewelopera (--ekran): po ładowaniu ten ekran zamiast menu („gra” — nowa partia).</param>
        public static void Zbuduj(App app, string? cel = null)
        {
            // okno obserwatorium: bot gra od razu, nic nie trafia do plików gracza
            Obserwowany.przygotujObserwowana();
            // intro rusza od razu, góra ładuje się pod nim, a po filmie — menu; okno obserwatorium filmu nie puszcza
            // (narzędzie dewelopera --ekran też nie — od razu do celu)
            Func<bool>? zaslona = null;
            if (!Obserwowany.BOT.wlaczony && cel == null)
            {
                app.intro = new Intro();
                app.intro.puscIntro();
                zaslona = app.intro.introTrwa;
            }
            EkranGry gra = null!;
            EkranSamouczka samouczek = null!;
            EkranMenu menu = null!;
            EkranBestiariusza bestiariusz = null!;
            EkranUstawien ustawieniaEkran = null!;

            // Płótno poza ekranem w tej samej skali co prawdziwe — rysując na nim raz każdy ekran,
            // wypełniamy wszystkie pamięci podręczne (rycina płyty, przekrój góry, miniatury tablic, glify),
            // zanim gracz cokolwiek zobaczy.
            IPlotno naBrudno()
            {
                var c = Plotno.Nowe(Math.Max(1, app.ctx.width), Math.Max(1, app.ctx.height));
                c.setTransform(app.ctx.getTransform());
                return c;
            }
            void rysujRaz(Action<IPlotno> rysuj) { using var c = naBrudno(); rysuj(c); }

            var etapy = new List<Etap>
            {
                new Etap { nazwa = "Mierzę ekran i dopasowuję skalę", zrob = () => app.przelicz() },
                new Etap { nazwa = "Wczytuję kroje pisma", zrob = () => Fonts.zaladujKroje() },
                new Etap { nazwa = "Kształtuję górę", zrob = () => { gra = new EkranGry(app); app.zarejestruj(gra); } },
                new Etap { nazwa = "Przygotowuję nową górę na przebudzenie", zrob = () => gra.przygotuj() },
                new Etap { nazwa = "Układam górę samouczka", zrob = () => { samouczek = new EkranSamouczka(app); app.zarejestruj(samouczek); samouczek.przygotuj(); } },
                new Etap
                {
                    nazwa = "Składam menu, atlas i ustawienia",
                    zrob = () =>
                    {
                        menu = new EkranMenu(app); app.zarejestruj(menu);
                        bestiariusz = new EkranBestiariusza(app); app.zarejestruj(bestiariusz);
                        ustawieniaEkran = new EkranUstawien(app); app.zarejestruj(ustawieniaEkran);
                        app.zarejestruj(new EkranKroniki(app));
                        app.zarejestruj(new EkranOsiagniec(app));
                    },
                },
                new Etap { nazwa = "Ryję płytę", zrob = () => { gra.rozmiar(app.w, app.h); rysujRaz(c => gra.rysuj(c, app.w, app.h, Wydajnosc.Teraz())); } },
                new Etap { nazwa = "Rysuję przekrój góry", zrob = () => rysujRaz(c => menu.rysuj(c, app.w, app.h, Wydajnosc.Teraz())) },
                new Etap { nazwa = "Kreślę tablice atlasu", zrob = () => { bestiariusz.wejdz(null); rysujRaz(c => bestiariusz.rysuj(c, app.w, app.h, Wydajnosc.Teraz())); } },
                new Etap
                {
                    nazwa = "Przygotowuję plansze wstępu",
                    zrob = () => rysujRaz(c =>
                    {
                        foreach (var s in Sceny.SCENY.Values)
                        {
                            c.save();
                            s.rysunek(new PlotnoRyciny { ctx = c, w = app.w, h = app.h * 0.5, t = 4000, p = 1, takt = 99, taktP = 1 });
                            c.restore();
                        }
                    }),
                },
                new Etap { nazwa = "Sprawdzam zapis i ustawienia", zrob = () => { Zapisy.hasSave(); rysujRaz(c => ustawieniaEkran.rysuj(c, app.w, app.h, Wydajnosc.Teraz())); } },
            };

            var bot = Obserwowany.BOT.wlaczony;
            app.zarejestruj(new EkranLadowania(app, etapy, () =>
            {
                if (cel != null && !bot) app.idz(cel, cel == "gra" ? "nowa" : null);
                else app.idz(bot ? "gra" : "menu", bot ? "bot" : null);
            }, bot ? null : zaslona));
        }
    }
}
