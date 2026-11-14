// Port: alpha-1/src/cutscene/scenes.ts (scenariusz wprowadzenia; teksty przepisane skryptem) i cutscene.ts (odtwarzacz).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using static Trzewia.Nastawy.NastawyBarwy;
using JS = Trzewia.Js.Js;
using JsMath = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public sealed class Scena
    {
        public string id = "", tytul = "";
        public Action<PlotnoRyciny> rysunek = _ => { };
        public string[] linie = Array.Empty<string>();
    }

    public static class Sceny
    {
        /// <summary>Scenariusz wprowadzenia. Każda scena tłumaczy jedną regułę i pokazuje jej obraz (kolejność jak w TS).</summary>
        public static readonly Dictionary<string, Scena> SCENY = new Dictionary<string, Scena>
        {
            ["kimJestes"] = new Scena
            {
                id = "kimJestes", tytul = "Kim jesteś",
                rysunek = RycinyScen.rysujGore,
                linie = new[]
                {
                    "Nie jesteś bogiem, który rządzi podziemiem. Jesteś podziemiem — górą, która śni.",
                    "Korytarze są twoimi żyłami, jaskinie płucami, a na samym dnie bije rdzeń: twoje serce, zamknięte w kamieniu.",
                    "W tobie mieszka jeden lud — Pobożni. Żywisz się tym, że o tobie myślą: ich modlitwą i ich śmiercią.",
                    "Nie rozkazujesz im. Spuszczasz im jedzenie, szepczesz do głów i czynisz cuda — a oni robią resztę. Jeśli uwierzą dość mocno, uwolnią twój rdzeń.",
                },
            },
            ["cel"] = new Scena
            {
                id = "cel", tytul = "Jak się uwolnić",
                rysunek = RycinyScen.rysujCel,
                linie = new[]
                {
                    "Twój rdzeń jest uwięziony w skorupie. Nie rozkuje jej żaden kilof i żadna twoja moc.",
                    "Pęka tylko od modlitwy. Najpierw jedna nacja musi uwierzyć w ciebie mocno — Znak przy jej gnieździe pomaga.",
                    "Potem trzech jej wiernych musi stanąć przy samym rdzeniu i modlić się, aż kamień pęknie — kafel po kaflu, zwykle pięć razy.",
                    "Gdy skorupa się otworzy, wierni sami zejdą do środka. Kto wierzy i dotknie rdzenia — uwalnia cię. To jest wygrana.",
                },
            },
            ["zagrozenie"] = new Scena
            {
                id = "zagrozenie", tytul = "Jak przegrać",
                rysunek = RycinyScen.rysujSpis,
                linie = new[]
                {
                    "Pod płytą leży wstęga: każda rasa ma w niej swoje pasmo.",
                    "Gdy jedna krew zjada resztę, zwycięzcy przestają się bać i przestają o tobie myśleć. Gdy wszyscy giną — nie ma kto myśleć.",
                    "Wtedy z góry i z dołu zsuwa się powieka. Gdy się zamknie, zasypiasz — i to jest koniec.",
                    "Dlatego karm słabych, osłabiaj silnych i pilnuj, żeby w tobie zawsze ktoś żył. A w tym czasie prowadź jedną nację do rdzenia.",
                },
            },
            ["narzedzia"] = new Scena
            {
                id = "narzedzia", tytul = "Czym działasz",
                rysunek = RycinyScen.rysujOrgany,
                linie = new[]
                {
                    "Masz trzy ryty: Nakarm (wiadro z jedzeniem z góry), Szepnij i Cud. Płacisz Krwią (z każdej śmierci) i Wiarą (z każdej modlitwy).",
                    "Każda góra to Koszmar: krwi jest mało, skorupa jest twarda, drużyna jest mała i nikt nowy nie przyjdzie, a w ciemności coś patrzy. Co chwilę coś się dzieje — czas wtedy staje, a ty wybierasz.",
                    "U dołu płyty zawsze widać, co teraz zrobić, żeby zbliżyć się do wolności. Zaraz pokażę ci wszystko palcem.",
                },
            },
            ["pamiec"] = new Scena
            {
                id = "pamiec", tytul = "Ciemność",
                rysunek = RycinyScen.rysujPamiec,
                linie = new[]
                {
                    "Wiesz o sobie tylko tyle, ile wiedzą ci, którzy w tobie chodzą.",
                    "Tam, gdzie ktoś właśnie jest, rysunek ma pełną kreskę. Tam, gdzie ktoś był — blaknie i pokazuje stan sprzed pokoleń, nie dzisiejszy.",
                    "Tam, gdzie nie ma nikogo, nie ma nawet kreski — sama ciemność.",
                    "Drąż im drogi, a będą chodzić dalej. Im dalej chodzą, tym więcej o sobie widzisz.",
                },
            },
            ["zasoby"] = new Scena
            {
                id = "zasoby", tytul = "Wiara, krew i oddanie",
                rysunek = RycinyScen.rysujOrgany,
                linie = new[]
                {
                    "Nie ma pasków ani liczb. Zasoby są rzeczami, które widzisz w ramie obrazu.",
                    "Wiara zbiera się pod sklepieniem jak dym ofiarny. Bierze się z modlitwy przy ołtarzach i kuźniach, a najwięcej z ofiary, którą składają sami.",
                    "Krew podnosi się w szczelinie u dołu. Płaci ci ją każda śmierć w twoich trzewiach — cudza wojna jest twoim dochodem.",
                    "Złożone dłonie w ramie to oddanie. Napełniają się złotem tym bardziej, im mocniej wierzy w ciebie najwierniejsza nacja. Gdy złoto przekroczy kreskę, jej wierni sami zejdą pod twój rdzeń.",
                },
            },
            ["rasy"] = new Scena
            {
                id = "rasy", tytul = "Pięć sposobów istnienia",
                rysunek = RycinyScen.rysujRasy,
                linie = new[]
                {
                    "Nie ma tu ras lepszych i gorszych. Każda istnieje inaczej i inaczej rośnie.",
                    "Ślepy Lud rodzi dzieci i modli się najgorliwiej. Żużlowcy nie rodzą — wykuwają nowych kowali z rudy i żyją z ciepła kuźni.",
                    "Prządki nie podbijają, tylko biorą w jarzmo i przerabiają cudze dzieci na swoje. Trolem nikt się nie rodzi: trolem się zostaje, gdy kopie się za głęboko.",
                    "Grzybnia nie ma jednostek — rośnie ze zwłok i nie czci cię wcale.",
                },
            },
            ["przyplyw"] = new Scena
            {
                id = "przyplyw", tytul = "Przypływ",
                rysunek = RycinyScen.rysujPrzyplyw,
                linie = new[]
                {
                    "Co kilka tysięcy tików coś wchodzi z zewnątrz i tasuje planszę.",
                    "Woda znajduje szczelinę i zalewa górne korytarze. Zaraza zabiera połowę sił każdemu. Żyła szaleństwa otwiera kryształ w głębi.",
                    "Gdy góra pustoszeje, nowe plemię przychodzi samo, bo pustka przyciąga.",
                    "Przypływu nie da się zatrzymać. Można tylko zdecydować, kto po nim zostanie.",
                },
            },
            ["ksztaltuj"] = new Scena
            {
                id = "ksztaltuj", tytul = "Kształtuj",
                rysunek = RycinyScen.rysujZyly,
                linie = new[]
                {
                    "Pierwszy czasownik rusza samą skałę i kosztuje Krew — a Krew bierze się z każdej śmierci w twoich trzewiach.",
                    "Drążysz korytarz, żeby ktoś dotarł do rudy albo do sąsiada, z którym ma na pieńku.",
                    "Zawalasz strop, żeby kogoś zasypać albo odciąć. Wpuszczasz wodę, żeby utopić tych, którzy nie pływają.",
                    "Otwierasz żar, bo Żużlowcy nie postawią kuźni tam, gdzie nie ma ognia. Magma wpuszczona do wody zastyga w kamień i zamyka przejście na zawsze.",
                },
            },
            ["zasiej"] = new Scena
            {
                id = "zasiej", tytul = "Zasiej",
                rysunek = RycinyScen.rysujZiarno,
                linie = new[]
                {
                    "Nie rozkazujesz im, dokąd mają iść. Kładziesz w skale powód, żeby poszli.",
                    "Grzyb to jedzenie, które rośnie samo — i to on wyznacza, ilu Ślepego Ludu góra udźwignie.",
                    "Ruda karmi kuźnie: Żużlowcy nie rodzą dzieci, tylko wykuwają nowych kowali za trzy sztuki rudy.",
                    "Kości są jedzeniem od ręki i paliwem dla grzybni. Trucizna to kryształ: kto go kopie, wraca z głębi inny.",
                },
            },
            ["szept"] = new Scena
            {
                id = "szept", tytul = "Szepcz",
                rysunek = RycinyScen.rysujSzept,
                linie = new[]
                {
                    "Najtańszy czasownik i jedyny, który dotyka kogoś po imieniu. Płacisz Wiarą.",
                    "Dotykasz jednego stworzenia — otwiera się jego karta: rasa, nacja i jedno zdanie o tym, kim jest.",
                    "„Kop w dół\" wysyła je głębiej, niż powinno; głębia daje kryształ i szaleństwo. Kto oszaleje do końca, wraca trolem.",
                    "„Prorokuj\" robi z niego proroka: odchodzi z sześcioma wiernymi i zakłada własną nację, która od razu ma urazę do dawnej.",
                    "To jest twoje główne narzędzie. Wojny nie zaczyna się armią, tylko jedną myślą w jednej głowie.",
                },
            },
            ["znak"] = new Scena
            {
                id = "znak", tytul = "Znak",
                rysunek = RycinyScen.rysujZnak,
                linie = new[]
                {
                    "Jawny cud. Drogi — czterdzieści pięć Wiary — i widzą go wszyscy w promieniu dwudziestu sześciu kafli.",
                    "„Objawienie\" podnosi oddanie i gasi strach: modlą się gorliwiej, więc więcej Wiary wraca do ciebie.",
                    "„Panika\" robi odwrotnie — rozbija oblężenie, wypędza za silną nację z cudzego terenu, ale oddanie spada.",
                    "Po Znaku zostaje w skale świecący glif. Modlitwa przy nim liczy się podwójnie.",
                },
            },
            ["skaz"] = new Scena
            {
                id = "skaz", tytul = "Skaź",
                rysunek = RycinyScen.rysujKrew,
                linie = new[]
                {
                    "Ostatni czasownik zmienia krew całego gatunku i nie da się tego cofnąć.",
                    "Płacisz Krwią i Otchłanią: dotykasz jednego przedstawiciela, a zmiana idzie przez wszystkie pokolenia po nim.",
                    "Każda skaza ma cenę. Płodność skraca życie i podnosi głód. Żądza krwi daje siłę, ale oni przestają się modlić.",
                    "Ślepota spowalnia, za to każda modlitwa liczy się podwójnie. Kamienna skóra daje twardość kosztem kopania.",
                },
            },
            ["spis"] = new Scena
            {
                id = "spis", tytul = "Spis ras i Sen",
                rysunek = RycinyScen.rysujSpis,
                linie = new[]
                {
                    "Pod płytą leży wstęga warstw — tyle miejsca, ile zajmuje każda rasa.",
                    "Dopóki warstwy są różne, żyjesz. Gdy jedna zaczyna zjadać wstęgę, zwycięzcy przestają się bać i przestają cię potrzebować.",
                    "Wtedy Wiara i Krew wysychają, a z góry i z dołu zaczyna zsuwać się powieka. To twoja jedyna przegrana: zaśnięcie.",
                    "Dlatego cała gra polega na jednym: podtrzymuj konflikt, ale nie pozwól nikomu wyginąć.",
                },
            },
            ["kronika"] = new Scena
            {
                id = "kronika", tytul = "Kronika",
                rysunek = RycinyScen.rysujKronike,
                linie = new[]
                {
                    "Gra przez cały czas pisze. Jedna linijka na dole mówi, co się właśnie stało i jak oni to nazwali.",
                    "Są trzy końce: zaśnięcie, albo ktoś dojdzie do twojego rdzenia i uklęknie — to wolność — albo dojdzie i nie uklęknie.",
                    "W każdym z nich zostaje po tobie kronika — spisana legenda tego, czym byłeś dla tych, którzy w tobie mieszkali.",
                    "To jest twój wynik. Teraz zejdź i zobacz, co z tobą zrobią.",
                },
            },
        };
    }

    /// <summary>
    /// Odtwarzacz cutscenek. Rysunek wchodzi powoli, tekst dopisuje się litera po literze,
    /// a dotknięcie albo domyka bieżącą linijkę, albo przechodzi dalej.
    /// </summary>
    public sealed class Cutscenka
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static string S(double x) => JS.S(x);

        Scena? scena;
        double start;
        int widoczneLinie;
        double znaki;
        Action? koniecCb;
        double zamykanie;
        /// <summary>Kolejka scen: przerywnik to kilka plansz, a nie jedna.</summary>
        List<Scena> kolejka = new List<Scena>();
        int nr;
        int razem = 1;

        /// <summary>Odtwarza kilka scen po kolei; `koniec` woła się po ostatniej albo po pominięciu.</summary>
        public void odtworzListe(IReadOnlyList<Scena> sceny, Action koniec)
        {
            kolejka = sceny.Skip(1).ToList();
            razem = sceny.Count;
            nr = 0;
            pojedyncza(sceny[0], koniec);
        }

        public void odtworz(Scena s, Action koniec)
        {
            kolejka = new List<Scena>(); razem = 1; nr = 0;
            pojedyncza(s, koniec);
        }

        void pojedyncza(Scena s, Action koniec)
        {
            scena = s;
            koniecCb = koniec;
            start = Rdzen.Wydajnosc.Teraz();
            widoczneLinie = 0;
            znaki = 0;
            zamykanie = 0;
        }

        public bool aktywna => scena != null;

        public void krok(double dt)
        {
            if (scena == null) return;
            if (zamykanie > 0)
            {
                zamykanie += dt;
                if (zamykanie > 420)
                {
                    var cb = koniecCb;
                    var nastepna = kolejka.Count > 0 ? kolejka[0] : null;
                    if (nastepna != null) kolejka.RemoveAt(0);
                    if (nastepna != null && cb != null) { nr++; pojedyncza(nastepna, cb); return; }
                    scena = null; koniecCb = null; zamykanie = 0;
                    cb?.Invoke();
                }
                return;
            }
            if (widoczneLinie >= scena.linie.Length) return;
            var linia = scena.linie[widoczneLinie];
            znaki += dt * 0.055;
            if (znaki > linia.Length + 12 && widoczneLinie < scena.linie.Length - 1)
            {
                widoczneLinie++;
                znaki = 0;
            }
        }

        /// <summary>Dotknięcie: najpierw domyka pisanie, potem przewija linijkę, na końcu kończy scenę.</summary>
        public void dalej()
        {
            if (scena == null || zamykanie > 0) return;
            var linia = widoczneLinie < scena.linie.Length ? scena.linie[widoczneLinie] : null;
            if (linia != null && znaki < linia.Length) { znaki = linia.Length + 99; return; }
            if (widoczneLinie < scena.linie.Length - 1) { widoczneLinie++; znaki = 0; return; }
            zamykanie = 1;
        }

        /// <summary>Prostokąt napisu „pomiń” (px logiczne) — ekran sprawdza, czy dotknięcie w niego trafiło.</summary>
        public Obszar? polePomin;

        /// <summary>Czy dotknięcie trafiło w „pomiń”.</summary>
        public bool trafiaPomin(double x, double y) => polePomin is { } p && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

        public void pomin()
        {
            if (scena == null) return;
            kolejka = new List<Scena>();
            zamykanie = 1;
        }

        static readonly string[] RZ = { "I", "II", "III", "IV", "V", "VI", "VII", "VIII" };

        public void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            var s = scena;
            if (s == null) return;
            var wiek = teraz - start;
            var wejscie = Math.Min(1, wiek / 900);
            var wyjscie = zamykanie > 0 ? Math.Max(0, 1 - zamykanie / 420) : 1;
            var alfa = wejscie * wyjscie;

            Ink.tloSadzy(ctx, w, h, teraz);

            // ilustracja
            ctx.save();
            ctx.globalAlpha = alfa;
            // Scena idzie rytmem narracji, nie zegarem: obraz dokłada elementy dokładnie
            // wtedy, kiedy pada o nich zdanie.
            var linia = widoczneLinie < s.linie.Length ? s.linie[widoczneLinie] : "";
            var taktP = Math.Max(0, Math.Min(1, znaki / Math.Max(1, linia.Length)));
            var postep = Math.Min(1, (widoczneLinie + taktP) / s.linie.Length);

            double pasY = h * 0.10, pasH = h * 0.46;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, pasY, w, pasH);
            ctx.clip();
            ctx.translate(0, pasY);

            // powolny najazd kamery — rycina nigdy nie stoi w miejscu
            var zoom = 1 + 0.06 * JsMath.Sin(wiek * 0.00011) + postep * 0.05;
            var przesunX = JsMath.Sin(wiek * 0.00007) * w * 0.012;
            var przesunY = JsMath.Cos(wiek * 0.00009) * pasH * 0.02;
            ctx.translate(w / 2 + przesunX, pasH / 2 + przesunY);
            ctx.scale(zoom, zoom);
            ctx.translate(-w / 2, -pasH / 2);

            s.rysunek(new PlotnoRyciny { ctx = ctx, w = w, h = pasH, t = teraz, p = postep, takt = widoczneLinie, taktP = taktP });

            // kurz w świetle — dwie garście drobin, które żyją własnym ruchem
            ctx.globalCompositeOperation = "lighter";
            for (var i = 0; i < 26; i++)
            {
                var fx = ((i * 137.5) % 100) / 100;
                var fy = ((i * 61.8) % 100) / 100;
                var x = (fx * 1.2 - 0.1 + JsMath.Sin(wiek * 0.00008 + i) * 0.02) * w;
                var y = ((fy + wiek * 0.000018 * (0.4 + (i % 5) / 6.0)) % 1) * pasH;
                var a = 0.05 + 0.08 * Math.Abs(JsMath.Sin(wiek * 0.001 + i));
                ctx.fillStyle = $"rgba(226,214,186,{S(a)})";
                ctx.beginPath();
                ctx.arc(x, pasH - y, 0.7 + (i % 3) * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // rycina ma ramkę jak plansza w atlasie
            double mx = w * 0.12, my = pasY - 6;
            ctx.save();
            ctx.globalAlpha = alfa * 0.5;
            ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
            ctx.lineWidth = 1;
            Ink.kreska(ctx, mx, my, w - mx, my, 0.8, 30);
            Ink.kreska(ctx, mx, my + pasH + 10, w - mx, my + pasH + 10, 0.8, 30);
            ctx.restore();
            ctx.restore();

            // tytuł sceny
            ctx.save();
            ctx.globalAlpha = alfa;
            ctx.textAlign = "center";
            var rozmiarTytulu = Math.Max(17, Math.Min(30, w / 40));
            ctx.font = $"600 {S(rozmiarTytulu)}px {Ink.SERIF_TYTUL}";
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.92);
            var litery = znaki_(s.tytul.ToUpperInvariant());
            var odstepLiter = rozmiarTytulu * 0.12;
            var szer = litery.Sum(l => ctx.measureText(l).width) + odstepLiter * (litery.Count - 1);
            var lx = w / 2 - szer / 2;
            foreach (var l in litery)
            {
                var lw = ctx.measureText(l).width;
                ctx.fillText(l, lx + lw / 2, h * 0.075);
                lx += lw + odstepLiter;
            }
            Ink.naciecie(ctx, w / 2, h * 0.098, Math.Min(420, Math.Max(szer * 1.4, w * 0.3)), 0.35);
            // która to plansza z ilu — rzymskimi, jak tablice w atlasie
            if (razem > 1)
            {
                ctx.font = $"italic {S(Math.Max(12, w / 90))}px {Ink.SERIF}";
                ctx.fillStyle = rgba(BARWA.atramentCichy, 0.7);
                ctx.fillText($"plansza {(nr < RZ.Length ? RZ[nr] : S(nr + 1))} z {(razem - 1 < RZ.Length ? RZ[razem - 1] : S(razem))}", w / 2, h * 0.03);
            }

            // narracja
            var maxW = Math.Min(760, w * 0.76);
            var rozmiar = Math.Max(16, Math.Min(26, w / 42));
            ctx.font = $"{S(rozmiar)}px {Ink.SERIF}";
            var yy = h * 0.64;
            // gdy wszystkie linijki się nie mieszczą (telefon), znikają najstarsze — bieżąca
            // musi być widać cała
            var od = 0;
            double wys(int i) => Ink.linieAkapitu(ctx, s.linie[i], maxW) * rozmiar * 1.45 + rozmiar * 0.5;
            double suma = 0;
            for (var i = Math.Min(widoczneLinie, s.linie.Length - 1); i >= 0; i--)
            {
                suma += wys(i);
                if (yy + suma > h * 0.94) { od = i + 1; break; }
            }
            for (var i = od; i <= widoczneLinie && i < s.linie.Length; i++)
            {
                var pelna = s.linie[i];
                var tekst = i == widoczneLinie ? pelna.Substring(0, (int)Math.Max(0, Math.Min(pelna.Length, Math.Floor(znaki)))) : pelna;
                ctx.fillStyle = rgba(i == widoczneLinie ? BARWA.atramentMocny : BARWA.atrament, i == widoczneLinie ? 0.96 : 0.6);
                var n = Ink.akapit(ctx, tekst, w / 2, yy, maxW, rozmiar * 1.45, "center");
                yy += n * rozmiar * 1.45 + rozmiar * 0.5;
                if (yy > h * 0.94) break;
            }

            ctx.font = $"italic {S(Math.Max(12, w / 82))}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atramentCichy, 0.45 + 0.2 * JsMath.Sin(teraz * 0.003));
            ctx.textAlign = "center";
            ctx.fillText("dotknij, żeby czytać dalej", w / 2, h * 0.975);
            // pominięcie palcem — na telefonie nie ma „P” ani „esc”
            ctx.font = $"italic 17px {Ink.SERIF}";
            ctx.textAlign = "right";
            ctx.fillStyle = rgba(BARWA.zarBlady, 0.85 * alfa);
            var napis = razem > 1 ? "pomiń wstęp ›" : "pomiń ›";
            var tw = ctx.measureText(napis).width;
            ctx.fillText(napis, w - 24, 34);
            polePomin = new Obszar { x = w - 24 - tw - 14, y = 34 - 26, w = tw + 28, h = 44 };
            ctx.restore();
        }

        /// <summary>[...tekst] — znaki po punktach kodowych.</summary>
        static List<string> znaki_(string t)
        {
            var wyn = new List<string>();
            for (int i = 0; i < t.Length; i++)
            {
                if (char.IsHighSurrogate(t[i]) && i + 1 < t.Length) { wyn.Add(t.Substring(i, 2)); i++; }
                else wyn.Add(t[i].ToString());
            }
            return wyn;
        }
    }
}
