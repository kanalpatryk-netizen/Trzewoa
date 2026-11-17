// Port: alpha-1/src/app/screens/settings.ts — ustawienia w stylu menu (tylko komputer).
// Różnice (PLAN.md, część 5): w „Wydajności” dochodzi wybór karty graficznej (auto / ANGLE / OpenGL — działa od
// następnego uruchomienia) zamiast pliku karta.json z Electrona; „Pełny ekran” przełącza okno przez gospodarza
// (Gospodarz.UstawPelnyEkran). Dźwięk: wiersze i zapis ustawień są, ale same dźwięki to na razie zaślepki.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Trzewia.Nastawy;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Nastawy.NastawyWygladUstawienia;
using static Trzewia.Rdzen.SettingsStore;
using static Trzewia.Rysunek.Ozdobnik;
using JS = Trzewia.Js.Js;
using JsMath = Trzewia.Js.JsMath;

namespace Trzewia.Aplikacja
{
    public sealed class EkranUstawien : Ekran
    {
        static Typ_EKRAN_USTAWIEN U => EKRAN_USTAWIEN;
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static string S(double x) => JS.S(x);

        abstract class Wiersz { public string etykieta = ""; }
        sealed class Przelacznik : Wiersz { public Func<bool> czytaj = null!; public Action<bool> zmien = null!; }
        sealed class Suwak : Wiersz { public double min, max, krok; public Func<double> czytaj = null!; public Action<double> zmien = null!; }
        sealed class Wybor : Wiersz { public string[] opcje = null!; public Func<string> czytaj = null!; public Action<string> zmien = null!; }
        sealed class AkcjaW : Wiersz { public Action wykonaj = null!; }

        sealed class Kategoria { public string nazwa = "", ikona = ""; public List<Wiersz> wiersze = null!; }

        static bool wSrodku(Obszar p, double x, double y) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

        /// <summary>Ikonka kategorii — kreska jak ozdobniki menu; (cx, cy) środek, s — połowa boku.</summary>
        static void rysujIkone(IPlotno ctx, string ikona, double cx, double cy, double s, string barwa)
        {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(s, s);
            ctx.strokeStyle = barwa; ctx.fillStyle = barwa;
            ctx.lineWidth = 0.1; ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.beginPath();
            if (ikona == "dzwiek")
            {
                // głośnik i dwie fale
                ctx.moveTo(-0.85, -0.28); ctx.lineTo(-0.45, -0.28); ctx.lineTo(0, -0.72); ctx.lineTo(0, 0.72);
                ctx.lineTo(-0.45, 0.28); ctx.lineTo(-0.85, 0.28); ctx.closePath();
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0.02, 0, 0.42, -0.75, 0.75); ctx.stroke();
                ctx.beginPath(); ctx.arc(0.02, 0, 0.75, -0.8, 0.8); ctx.stroke();
            }
            else if (ikona == "obraz")
            {
                // oko
                ctx.moveTo(-0.95, 0); ctx.quadraticCurveTo(0, -0.95, 0.95, 0); ctx.quadraticCurveTo(0, 0.95, -0.95, 0);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 0.32, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, Math.PI * 2); ctx.fill();
            }
            else if (ikona == "rozgrywka")
            {
                // klepsydra
                ctx.moveTo(-0.6, -0.88); ctx.lineTo(0.6, -0.88); ctx.moveTo(-0.6, 0.88); ctx.lineTo(0.6, 0.88);
                ctx.moveTo(-0.45, -0.88); ctx.bezierCurveTo(-0.45, -0.3, -0.08, -0.15, -0.08, 0); ctx.bezierCurveTo(-0.08, 0.15, -0.45, 0.3, -0.45, 0.88);
                ctx.moveTo(0.45, -0.88); ctx.bezierCurveTo(0.45, -0.3, 0.08, -0.15, 0.08, 0); ctx.bezierCurveTo(0.08, 0.15, 0.45, 0.3, 0.45, 0.88);
                ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-0.3, 0.82); ctx.quadraticCurveTo(0, 0.4, 0.3, 0.82); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-0.22, -0.55); ctx.lineTo(0.22, -0.55); ctx.lineTo(0, -0.3); ctx.closePath(); ctx.fill();
            }
            else if (ikona == "wydajnosc")
            {
                // wskaźnik: łuk z podziałką i wskazówka wychylona w prawo
                ctx.arc(0, 0.22, 0.82, Math.PI * 0.85, Math.PI * 2.15);
                ctx.stroke();
                for (var k = 0; k <= 4; k++)
                {
                    var a = Math.PI * (0.97 + 0.265 * k);
                    ctx.beginPath();
                    ctx.moveTo(JsMath.Cos(a) * 0.6, 0.22 + JsMath.Sin(a) * 0.6); ctx.lineTo(JsMath.Cos(a) * 0.78, 0.22 + JsMath.Sin(a) * 0.78);
                    ctx.stroke();
                }
                var w = Math.PI * 1.74;
                ctx.beginPath(); ctx.moveTo(0, 0.22); ctx.lineTo(JsMath.Cos(w) * 0.62, 0.22 + JsMath.Sin(w) * 0.62); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0.22, 0.13, 0, Math.PI * 2); ctx.fill();
            }
            else
            {
                // koło zębate
                const int zeby = 8;
                for (var k = 0; k < zeby * 2; k++)
                {
                    double a0 = ((double)k / (zeby * 2)) * Math.PI * 2, a1 = ((double)(k + 1) / (zeby * 2)) * Math.PI * 2;
                    var r = k % 2 == 0 ? 0.88 : 0.66;
                    if (k == 0) ctx.moveTo(JsMath.Cos(a0) * r, JsMath.Sin(a0) * r); else ctx.lineTo(JsMath.Cos(a0) * r, JsMath.Sin(a0) * r);
                    ctx.lineTo(JsMath.Cos(a1) * r, JsMath.Sin(a1) * r);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 0.27, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }

        public override string nazwa => "ustawienia";
        List<Kategoria> kategorie = new List<Kategoria>();
        int kat;
        int wybrany;
        int najechanaIkona = -1;
        /// <summary>Wysunięcie nazwy każdej ikonki (0..1) — dąży do 1 pod myszą.</summary>
        double[] wysuw = Array.Empty<double>();
        double nazwaKlawiszemOd = -1e9;
        double ostatniaKlatka;
        double wejscieOd;
        (int i, double od) blysk = (-1, -1e9);
        (int i, double od) gotoweOd = (-1, -1e9);
        List<Obszar> trafIkon = new List<Obszar>();
        List<Obszar> trafWierszy = new List<Obszar>();
        Obszar?[] trafSuwakow = new Obszar?[8];
        Obszar? wstecz;
        int? ciagnie;
        readonly IKontekst app;

        public EkranUstawien(IKontekst app) { this.app = app; zbuduj(); }

        public override void wejdz(object? dane)
        {
            zbuduj();
            wybrany = 0;
            ciagnie = null;
            wejscieOd = Wydajnosc.Teraz();
        }

        void odswiezDzwiek()
        {
            app.muzyka.glosnosc(ustawienia.glosnosc);
            app.dzwiek.odswiezGlosnosc();
            app.gesty.odswiezGlosnosc();
        }

        static readonly string[] KARTY = { "auto", "ANGLE", "OpenGL" };

        void zbuduj()
        {
            kategorie = new List<Kategoria>
            {
                new Kategoria
                {
                    nazwa = "Dźwięk", ikona = "dzwiek", wiersze = new List<Wiersz>
                    {
                        new Suwak { etykieta = "Głośność", min = 0, max = 1, krok = 0.1, czytaj = () => ustawienia.glosnosc, zmien = v => { ustaw(ref ustawienia.glosnosc, v); odswiezDzwiek(); } },
                        new Przelacznik { etykieta = "Muzyka", czytaj = () => ustawienia.muzyka, zmien = v => { ustaw(ref ustawienia.muzyka, v); if (v) app.muzyka.start(); else app.muzyka.stop(); } },
                        // jeden przełącznik na dźwięki świata (kucie, modlitwa) i gestów (szkic, pauza, ostrzeżenia)
                        new Przelacznik
                        {
                            etykieta = "Odgłosy", czytaj = () => ustawienia.rezonans || ustawienia.efekty, zmien = v =>
                            {
                                ustaw(ref ustawienia.rezonans, v); ustaw(ref ustawienia.efekty, v);
                                if (v) { app.dzwiek.start(); app.gesty.start(); }
                                odswiezDzwiek();
                            },
                        },
                    },
                },
                new Kategoria
                {
                    nazwa = "Obraz", ikona = "obraz", wiersze = new List<Wiersz>
                    {
                        new Przelacznik { etykieta = "Pełny ekran", czytaj = () => ustawienia.pelnyEkran, zmien = v => { ustaw(ref ustawienia.pelnyEkran, v); Gospodarz.UstawPelnyEkran?.Invoke(v); } },
                        new Suwak { etykieta = "Wielkość obrazu", min = 0.8, max = 1.6, krok = 0.1, czytaj = () => ustawienia.wielkoscUI, zmien = v => ustaw(ref ustawienia.wielkoscUI, Math.Floor(v * 10 + 0.5) / 10) },
                        new Suwak { etykieta = "Jasność", min = 1, max = 1.8, krok = 0.05, czytaj = () => ustawienia.jasnosc, zmien = v => ustaw(ref ustawienia.jasnosc, v) },
                        new Przelacznik { etykieta = "Ogranicz ruch", czytaj = () => ustawienia.ograniczRuch, zmien = v => ustaw(ref ustawienia.ograniczRuch, v) },
                        // oprawa walki z bossem (dostępność): błyski zdarzeń słabsze
                        new Przelacznik { etykieta = "Mniej błysków", czytaj = () => ustawienia.mniejBlyskow, zmien = v => ustaw(ref ustawienia.mniejBlyskow, v) },
                    },
                },
                new Kategoria
                {
                    nazwa = "Rozgrywka", ikona = "rozgrywka", wiersze = new List<Wiersz>
                    {
                        new Wybor { etykieta = "Auto-pauza", opcje = new[] { "kryzysy", "wszystko", "wyłączona" }, czytaj = () => ustawienia.autoPauza, zmien = v => ustaw(ref ustawienia.autoPauza, v) },
                        new Przelacznik { etykieta = "Kamera za ludem", czytaj = () => ustawienia.kameraZaZyciem, zmien = v => ustaw(ref ustawienia.kameraZaZyciem, v) },
                        new Przelacznik { etykieta = "Kamera do wydarzeń", czytaj = () => ustawienia.kameraDoWydarzen, zmien = v => ustaw(ref ustawienia.kameraDoWydarzen, v) },
                        new Przelacznik { etykieta = "Autozapis", czytaj = () => ustawienia.autozapis, zmien = v => ustaw(ref ustawienia.autozapis, v) },
                    },
                },
                new Kategoria
                {
                    // 8.11: wydajność — gdy komputer nie nadąża: mniej pikseli, mniej klatek, licznik (F3)
                    nazwa = "Wydajność", ikona = "wydajnosc", wiersze = new List<Wiersz>
                    {
                        new Wybor { etykieta = "Rozdzielczość obrazu", opcje = new[] { "100%", "85%", "75%", "60%" }, czytaj = () => $"{S(Math.Floor((ustawienia.rozdzielczosc != 0 ? ustawienia.rozdzielczosc : 1) * 100 + 0.5))}%", zmien = v => ustaw(ref ustawienia.rozdzielczosc, int.Parse(v.TrimEnd('%')) / 100.0) },
                        new Wybor { etykieta = "Limit klatek", opcje = new[] { "bez limitu", "120", "60", "30" }, czytaj = () => ustawienia.limitKlatek != 0 ? S(ustawienia.limitKlatek) : "bez limitu", zmien = v => ustaw(ref ustawienia.limitKlatek, v == "bez limitu" ? 0 : double.Parse(v)) },
                        new Przelacznik { etykieta = "Rycina w osobnym wątku", czytaj = () => ustawienia.rycinaWWatku, zmien = v => ustaw(ref ustawienia.rycinaWWatku, v) },
                        new Przelacznik { etykieta = "Licznik wydajności (F3)", czytaj = () => ustawienia.licznikWydajnosci, zmien = v => ustaw(ref ustawienia.licznikWydajnosci, v) },
                        // C#: droga do karty graficznej (PLAN.md, różnica 2 i 11) — działa od następnego uruchomienia
                        new Wybor { etykieta = "Karta graficzna", opcje = KARTY, czytaj = () => KARTY.FirstOrDefault(k => k.ToLowerInvariant() == ustawienia.karta) ?? "auto", zmien = v => ustaw(ref ustawienia.karta, v.ToLowerInvariant()) },
                    },
                },
                new Kategoria
                {
                    nazwa = "Inne", ikona = "inne", wiersze = new List<Wiersz>
                    {
                        new AkcjaW { etykieta = "Samouczek od nowa", wykonaj = () => ustaw(ref ustawienia.samouczekZrobiony, false) },
                        new AkcjaW
                        {
                            etykieta = "Przywróć domyślne", wykonaj = () =>
                            {
                                var zrobiony = ustawienia.samouczekZrobiony;
                                przepiszDomyslne();
                                ustawienia.samouczekZrobiony = zrobiony;
                                zapiszUstawienia();
                                Keybinds.przywrocDomyslne();
                                if (ustawienia.muzyka) app.muzyka.start();
                                odswiezDzwiek();
                            },
                        },
                        new Przelacznik { etykieta = "Tryb deweloperski", czytaj = () => ustawienia.trybDeweloperski, zmien = v => ustaw(ref ustawienia.trybDeweloperski, v) },
                    },
                },
            };
            var nowe = new double[kategorie.Count];
            for (int i = 0; i < nowe.Length; i++) nowe[i] = i < wysuw.Length ? wysuw[i] : 0;
            wysuw = nowe;
        }

        /// <summary>Object.assign(ustawienia, DOMYSLNE): wszystkie pola z domyślnych.</summary>
        static void przepiszDomyslne()
        {
            foreach (var f in typeof(Settings).GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance))
                f.SetValue(ustawienia, f.GetValue(DOMYSLNE));
        }

        List<Wiersz> wiersze => kategorie[kat].wiersze;

        public override void krok(double dt, double teraz) { /* bez własnego czasu */ }

        public override void rysuj(IPlotno ctx, double sz, double h, double teraz)
        {
            var dt = Math.Min(100, teraz - (ostatniaKlatka != 0 ? ostatniaKlatka : teraz));
            ostatniaKlatka = teraz;
            var wejscie = wygladz((teraz - wejscieOd) / U.wejscieMs);
            ctx.save();
            ctx.fillStyle = U.tlo;
            ctx.fillRect(0, 0, sz, h);
            ctx.globalAlpha = wejscie;
            ctx.textBaseline = "alphabetic";

            var r = Math.Max(U.rozmiarMin, Math.Min(U.rozmiarMax, h * U.rozmiar));
            var m = Math.Max(14, h * 0.04);

            // ---- tytuł z ozdobnikami, jak pozycja menu
            var rt = Math.Max(U.tytulMin, Math.Min(Math.Min(U.tytulMax, h * U.tytulRozmiar), sz / 9));
            var yt = Math.Max(m + rt * 0.9, h * U.tytulY);
            ctx.font = $"600 {S(rt)}px {Ink.SERIF_TYTUL}";
            ctx.textAlign = "center";
            ctx.fillStyle = U.tytulBarwa;
            ctx.fillText(U.tytul, sz / 2, yt);
            var tw = ctx.measureText(U.tytul).width;
            ozdobnik(ctx, sz / 2 - tw / 2 - rt * 0.3, yt - rt * 0.3, rt * 0.95, -1, U.ozdobnik, 1);
            ozdobnik(ctx, sz / 2 + tw / 2 + rt * 0.3, yt - rt * 0.3, rt * 0.95, 1, U.ozdobnik, 1);

            // ---- powrót do menu
            ctx.font = $"italic {S(Math.Max(15, r * 0.75))}px {Ink.SERIF}";
            ctx.textAlign = "left";
            var wsW = ctx.measureText(U.wstecz).width;
            ctx.fillStyle = rgba(U.napis, 0.75);
            ctx.fillText(U.wstecz, m, m + r * 0.9);
            wstecz = new Obszar { x = m - 10, y = m - 8, w = wsW + 20, h = r * 1.6 + 8 };

            // ---- lista
            var cw = Math.Min(r * U.szerokosc, sz * U.szerokoscMaxCzesc);
            var x0 = sz / 2 - cw / 2;
            var ikS = r * U.ikonaRozmiar;
            var n = kategorie.Count;
            var yNaglowka = Math.Max(h * U.gora, yt + rt * 1.2);
            // nagłówek kategorii
            var k = kategorie[kat];
            ctx.font = $"{S(r * 1.15)}px {Ink.SERIF_TYTUL}";
            ctx.textAlign = "center";
            ctx.fillStyle = rgba(U.tytulBarwa, 0.9);
            ctx.fillText(k.nazwa, sz / 2, yNaglowka);
            ctx.strokeStyle = rgba(U.ozdobnik, 0.6); ctx.lineWidth = 1;
            var kw = ctx.measureText(k.nazwa).width;
            ctx.beginPath();
            ctx.moveTo(x0, yNaglowka - r * 0.35); ctx.lineTo(sz / 2 - kw / 2 - r * 0.8, yNaglowka - r * 0.35);
            ctx.moveTo(sz / 2 + kw / 2 + r * 0.8, yNaglowka - r * 0.35); ctx.lineTo(x0 + cw, yNaglowka - r * 0.35);
            ctx.stroke();

            var krokW = r * U.odstep;
            var y0 = yNaglowka + r * 2.4;
            trafWierszy = new List<Obszar>();
            trafSuwakow = new Obszar?[wiersze.Count];
            for (var i = 0; i < wiersze.Count; i++)
            {
                var y = y0 + i * krokW;
                rysujWiersz(ctx, wiersze[i], i, x0, y, cw, r, teraz);
                trafWierszy.Add(new Obszar { x = x0 - r * 1.5, y = y - krokW * 0.6, w = cw + r * 3, h = krokW });
            }

            // ikonki w kolumnie po lewej, na wysokości listy; nazwa wysuwa się w lewo
            trafIkon = new List<Obszar>();
            {
                var krok = ikS * U.ikonaOdstep;
                var xi = x0 - r * U.ikonaOdListy - ikS / 2;
                var srodek = yNaglowka + (y0 + (wiersze.Count - 1) * krokW - yNaglowka) / 2;
                var yStart = Math.Max(yNaglowka - r * 0.4, srodek - ((n - 1) * krok) / 2);
                for (var i = 0; i < n; i++)
                {
                    var cy = yStart + i * krok;
                    trafIkon.Add(new Obszar { x = xi - krok / 2, y = cy - krok / 2, w = krok, h = krok });
                }
            }
            for (var i = 0; i < n; i++)
            {
                var t = trafIkon[i];
                double cx = t.x + t.w / 2, cy = t.y + t.h / 2;
                bool wybrana = i == kat, najechana = i == najechanaIkona;
                var cel = najechana || (wybrana && teraz - nazwaKlawiszemOd < U.nazwaPoKlawiszuMs) ? 1 : 0;
                wysuw[i] += (cel - wysuw[i]) * Math.Min(1, dt / U.wysuwMs * 2.2);
                if (Math.Abs(cel - wysuw[i]) < 0.01) wysuw[i] = cel;
                var barwa = wybrana ? U.ikonaWybrana : najechana ? U.ikonaNajechana : U.ikona;
                if (wybrana)
                {
                    ctx.save();
                    ctx.shadowColor = $"rgba({U.poswiata},0.6)"; ctx.shadowBlur = r * 0.6;
                    rysujIkone(ctx, kategorie[i].ikona, cx, cy, ikS / 2, barwa);
                    ctx.restore();
                    // kreska obok wybranej
                    ctx.strokeStyle = rgba(U.ozdobnikWybrany, 0.8); ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(cx + ikS * 0.78, cy - ikS * 0.35); ctx.lineTo(cx + ikS * 0.78, cy + ikS * 0.35);
                    ctx.stroke();
                }
                else rysujIkone(ctx, kategorie[i].ikona, cx, cy, ikS / 2, barwa);
                // wysuwana nazwa kategorii
                var a = wygladz(wysuw[i]);
                if (a > 0.01)
                {
                    ctx.save();
                    ctx.globalAlpha *= a * 0.85;
                    ctx.font = $"italic {S(r * 0.8)}px {Ink.SERIF}";
                    ctx.fillStyle = U.napisWybrany;
                    ctx.textAlign = "right";
                    ctx.fillText(kategorie[i].nazwa, cx - ikS * 0.7 - r * (0.1 + 0.6 * a), cy + r * 0.28);
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        void rysujWiersz(IPlotno ctx, Wiersz wiersz, int i, double x0, double y, double cw, double r, double teraz)
        {
            var wybr = i == wybrany;
            var swiezy = blysk.i == i ? Math.Max(0, 1 - (teraz - blysk.od) / U.blyskMs) : 0;
            ctx.save();
            ctx.font = $"{S(r)}px {Ink.SERIF}";
            ctx.textAlign = "left";
            if (wybr) { ctx.shadowColor = $"rgba({U.poswiata},0.75)"; ctx.shadowBlur = r * 0.6; }
            ctx.fillStyle = wybr ? U.napisWybrany : U.napis;
            ctx.fillText(wiersz.etykieta, x0, y);
            ctx.restore();
            if (wybr) ozdobnik(ctx, x0 - r * U.ozdobnikOdstep, y - r * 0.3, r * U.ozdobnikSzer, -1, U.ozdobnikWybrany, 1);

            var px = x0 + cw;
            ctx.save();
            ctx.font = $"{S(r * 0.92)}px {Ink.SERIF}";
            ctx.textAlign = "right";
            Styl jasna(double a) => rgba(U.wartosc, Math.Min(1, a + 0.3 * swiezy));
            Obszar? suwak = null;
            if (wiersz is Przelacznik pr)
            {
                var on = pr.czytaj();
                var tw = ctx.measureText(U.tak).width;
                ctx.fillStyle = on ? jasna(1) : (Styl)U.wartoscCicha;
                ctx.fillText(U.tak, px, y);
                ctx.fillStyle = U.wartoscCicha;
                ctx.fillText("·", px - tw - r * 0.35, y);
                ctx.fillStyle = on ? (Styl)U.wartoscCicha : jasna(1);
                ctx.fillText(U.nie, px - tw - r * 0.8, y);
            }
            else if (wiersz is Suwak su)
            {
                var v = su.czytaj();
                var t = (v - su.min) / (su.max - su.min);
                ctx.fillStyle = jasna(1);
                ctx.fillText($"{S(Math.Floor(v * 100 + 0.5))}%", px, y);
                // linijka krótsza, gdy długa etykieta (np. „Wielkość obrazu”) zostawia mniej miejsca
                ctx.font = $"{S(r)}px {Ink.SERIF}";
                var wolne = cw - ctx.measureText(su.etykieta).width - r * (U.suwakLiczba + 1.2);
                ctx.font = $"{S(r * 0.92)}px {Ink.SERIF}";
                double dl = Math.Max(r * 2, Math.Min(r * U.suwakDl, wolne)), sx = px - r * U.suwakLiczba - dl, ly = y - r * 0.3;
                ctx.strokeStyle = U.wartoscCicha; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + dl, ly); ctx.stroke();
                ctx.strokeStyle = rgba(U.wartosc, 0.85); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + dl * t, ly); ctx.stroke();
                double mx = sx + dl * t, rr = r * 0.24 * (1 + 0.3 * swiezy);
                ctx.fillStyle = U.napisWybrany;
                ctx.beginPath(); ctx.moveTo(mx, ly - rr); ctx.lineTo(mx + rr * 0.75, ly); ctx.lineTo(mx, ly + rr); ctx.lineTo(mx - rr * 0.75, ly); ctx.closePath(); ctx.fill();
                suwak = new Obszar { x = sx - r * 0.4, y = ly - r * 0.7, w = dl + r * 0.8, h = r * 1.4 };
            }
            else if (wiersz is Wybor wy)
            {
                var val = wy.czytaj();
                ctx.fillStyle = U.wartoscCicha;
                ctx.fillText("›", px, y);
                ctx.fillStyle = jasna(1);
                ctx.fillText(val, px - r * 0.9, y);
                var vw = ctx.measureText(val).width;
                ctx.fillStyle = U.wartoscCicha;
                ctx.fillText("‹", px - r * 1.8 - vw, y);
            }
            else
            {
                var gotowe = gotoweOd.i == i && teraz - gotoweOd.od < U.gotoweMs;
                ctx.font = $"italic {S(r * 0.85)}px {Ink.SERIF}";
                ctx.fillStyle = gotowe ? rgba(U.wartosc, Math.Min(1, (U.gotoweMs - (teraz - gotoweOd.od)) / 400)) : (Styl)U.wartoscCicha;
                ctx.fillText(gotowe ? U.gotowe : "›", px, y);
            }
            ctx.restore();
            trafSuwakow[i] = suwak;
        }

        /// <summary>+(x).toFixed(3)</summary>
        static double do3(double x) => Math.Round(x, 3, MidpointRounding.AwayFromZero);

        void zmien(int i, int kierunek)
        {
            if (i < 0 || i >= wiersze.Count) return;
            var wiersz = wiersze[i];
            blysk = (i, Wydajnosc.Teraz());
            app.gesty.klik();
            if (wiersz is Przelacznik pr) pr.zmien(!pr.czytaj());
            else if (wiersz is Suwak su) su.zmien(Math.Min(su.max, Math.Max(su.min, do3(su.czytaj() + kierunek * su.krok))));
            else if (wiersz is Wybor wy)
            {
                var idx = Array.IndexOf(wy.opcje, wy.czytaj());
                // (TS: indexOf → -1 przy wartości spoza listy; ((-1 + n + k) % n) — to samo tutaj)
                wy.zmien(wy.opcje[((idx + wy.opcje.Length + kierunek) % wy.opcje.Length + wy.opcje.Length) % wy.opcje.Length]);
            }
            else if (wiersz is AkcjaW ak) { ak.wykonaj(); gotoweOd = (i, Wydajnosc.Teraz()); }
        }

        /// <summary>Suwak: wartość z położenia myszy na linijce (zaokrąglona do kroku).</summary>
        void ustawSuwak(int i, double x)
        {
            if (i < 0 || i >= wiersze.Count || i >= trafSuwakow.Length) return;
            if (!(wiersze[i] is Suwak su) || !(trafSuwakow[i] is { } t)) return;
            var r = t.h / 1.4;
            var u = Math.Max(0, Math.Min(1, (x - (t.x + r * 0.4)) / (t.w - r * 0.8)));
            var v = do3(su.min + Math.Floor((u * (su.max - su.min)) / su.krok + 0.5) * su.krok);
            if (v != su.czytaj()) { su.zmien(v); blysk = (i, Wydajnosc.Teraz()); }
        }

        void zmienKategorie(int i, bool klawiszem = false)
        {
            var n = kategorie.Count;
            var nowa = ((i % n) + n) % n;
            if (nowa != kat) app.gesty.klik();
            kat = nowa;
            wybrany = 0;
            if (klawiszem) nazwaKlawiszemOd = Wydajnosc.Teraz();
        }

        public override void dotyk(Wskaznik e, Faza faza)
        {
            double x = e.clientX, y = e.clientY;
            if (faza == Faza.gora) { ciagnie = null; return; }
            if (faza == Faza.ruch)
            {
                if (ciagnie != null) { ustawSuwak(ciagnie.Value, x); return; }
                najechanaIkona = trafIkon.FindIndex(t => wSrodku(t, x, y));
                var wi0 = trafWierszy.FindIndex(t => wSrodku(t, x, y));
                if (wi0 >= 0) wybrany = wi0;
                return;
            }
            // dol
            if (wstecz is { } ws && wSrodku(ws, x, y)) { app.gesty.klik(); app.idz("menu"); return; }
            var ik = trafIkon.FindIndex(t => wSrodku(t, x, y));
            if (ik >= 0) { najechanaIkona = ik; zmienKategorie(ik); return; }
            var sui = Array.FindIndex(trafSuwakow, t => t is { } tt && wSrodku(tt, x, y));
            if (sui >= 0) { wybrany = sui; ciagnie = sui; app.gesty.klik(); ustawSuwak(sui, x); return; }
            var wi = trafWierszy.FindIndex(t => wSrodku(t, x, y));
            if (wi >= 0)
            {
                wybrany = wi;
                // suwak poza linijką: lewa połowa wiersza zmniejsza, prawa zwiększa
                var t = trafWierszy[wi];
                zmien(wi, wiersze[wi] is Suwak && x < t.x + t.w / 2 ? -1 : 1);
            }
        }

        static readonly Regex CYFRA = new Regex("^[1-9]$");

        public override void klawisz(Akcja? akcja, Klawisz e)
        {
            if (e.key == "Escape" || akcja == Akcja.menu) { app.idz("menu"); return; }
            if (e.key == "Tab") { e.preventDefault(); zmienKategorie(kat + (e.shiftKey ? -1 : 1), true); return; }
            if (e.key == "PageDown") { zmienKategorie(kat + 1, true); return; }
            if (e.key == "PageUp") { zmienKategorie(kat - 1, true); return; }
            if (CYFRA.IsMatch(e.key) && int.Parse(e.key) <= kategorie.Count) { zmienKategorie(int.Parse(e.key) - 1, true); return; }
            var n = wiersze.Count;
            if (e.key == "ArrowDown") { wybrany = (wybrany + 1) % n; return; }
            if (e.key == "ArrowUp") { wybrany = (wybrany - 1 + n) % n; return; }
            // strzałki zmieniają wartość; akcji (np. „Przywróć domyślne”) nie uruchamiają
            var akcjaWiersza = wybrany < n && wiersze[wybrany] is AkcjaW;
            if (e.key == "ArrowRight" && !akcjaWiersza) { zmien(wybrany, 1); return; }
            if (e.key == "ArrowLeft" && !akcjaWiersza) { zmien(wybrany, -1); return; }
            if (e.key == "Enter" || e.key == " ") { zmien(wybrany, 1); return; }
        }
    }
}
